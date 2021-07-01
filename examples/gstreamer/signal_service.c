#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <signal.h>
#include <fcntl.h>
#include <unistd.h>
#include <dirent.h>

#include <event2/event.h>
#include <event2/http.h>
#include <event2/buffer.h>
#include <event2/util.h>
#include <event2/keyvalq_struct.h>
#include <glib.h>
#include <cjson/cJSON.h>

#include "index_html.h"
#include "utils.h"
#include "signal_service.h"

static void api_request_cb(struct evhttp_request *req, void *arg) {

  signal_service_t *signal_service = (signal_service_t*)arg;

  struct evbuffer *evb = NULL;
  struct evbuffer *buf = NULL;
  cJSON *json = NULL;
  cJSON *params = NULL;
  char *payload = NULL;
  char *anwser = NULL;
  size_t len;

  if(evhttp_request_get_command(req) != EVHTTP_REQ_POST) {
    evhttp_send_error(req, HTTP_BADMETHOD, 0);
    return;
  }

  buf = evhttp_request_get_input_buffer(req);

  len = evbuffer_get_length(buf);
  payload = (char*)malloc(len);
  if(payload == NULL) {
    evhttp_send_error(req, HTTP_INTERNAL, 0);
    return;
  }

  evbuffer_remove(buf, payload, len);

  json = cJSON_Parse(payload);
  params = cJSON_GetObjectItemCaseSensitive(json, "params");
  if(cJSON_IsString(params) && (params->valuestring != NULL)) {
    if(signal_service->on_offer_get != NULL) {
      anwser = signal_service->on_offer_get(params->valuestring, signal_service->data);
    }
  }

  if(payload != NULL)
    free(payload);

  cJSON_Delete(json);

  evb = evbuffer_new();
  evbuffer_add_printf(evb, "{\"jsonrpc\": \"2.0\", \"result\": \"%s\"}", anwser);

  evhttp_send_reply(req, HTTP_OK, "OK", evb);

  if(evb)
    evbuffer_free(evb);
}

static int loadAndSend(struct evhttp_request *req, void *arg, const char *prefixes[], const char *path, const char *extra) {
  struct evbuffer *evb = NULL;
  int fd = -1;
  struct stat st;
  int result = -1;
  char *t = NULL;
  const char *tt;
  t = malloc(strlen(path)+strlen(extra ? extra : "")+strlen(prefixes && prefixes[0] ? prefixes[0] : "")+400);
  if (result) do {
      // fprintf(stderr, "Trying: %s\n", path);
    if (!stat(tt=path, &st) && S_ISREG(st.st_mode)) { result = 0; break; }
    if (extra) {
      sprintf(t, "%s/%s", path, extra);
      // fprintf(stderr, "Trying: %s\n", t);
      if (!stat(tt=t, &st) && S_ISREG(st.st_mode)) { result = 0; break; }
    }
  } while (0);
  if (result) for (int i = 0; prefixes && prefixes[i]; i++) {
      // fprintf(stdout, "prefix: %s\n", prefixes[i]);
    if (strlen(prefixes[i])) {
      sprintf(t, "%s/%s", prefixes[i], path);
      // fprintf(stderr, "Trying: %s\n", t);
      if (!stat(tt=t, &st) && S_ISREG(st.st_mode)) { result = 0; break; }
      if (extra) {
	sprintf(t, "%s/%s/%s", prefixes[i], path, extra);
	// fprintf(stderr, "Trying: %s\n", t);
	if (!stat(tt=t, &st) && S_ISREG(st.st_mode)) { result = 0; break; }
      }
    }
  }
  if (result) {
    if (t) free(t);
    return result;
  }
  // fprintf(stderr, "Returning: %s\n", tt);
    evb = evbuffer_new();
    fd = open(tt, O_RDONLY);
    if (fd < 0) {
      fprintf(stderr, "File open failed: %d\n", errno);
    } else {
      int cnt = 0;
      do {
	cnt += evbuffer_read(evb, fd, st.st_size - cnt);
      } while (cnt < st.st_size);
      close(fd);
      if (cnt < 0) {
	fprintf(stderr, "Couldn't read %ld byes from %s: %d\n", st.st_size, path, cnt);
      } else {
	if (cnt < st.st_size) {
	  fprintf(stderr, "Read size mismatch: read %d byes from %s: instead of %ld\n", cnt, path, st.st_size);
	}
	char *mime = "text/html";
	if (!strcmp(&tt[strlen(tt)-3], ".js")) mime = "text/javascript";
	if (!strcmp(&tt[strlen(tt)-4], ".css")) mime = "text/css";
	if (!strcmp(&tt[strlen(tt)-5], ".json")) mime = "applicatin/json";
	if (!strcmp(&tt[strlen(tt)-4], ".jpg")) mime = "image/jpeg";
	if (!strcmp(&tt[strlen(tt)-5], ".jpeg")) mime = "image/jpeg";
	if (!strcmp(&tt[strlen(tt)-4], ".pngg")) mime = "image/png";
	if (!strcmp(&tt[strlen(tt)-4], ".mp4")) mime = "video/mp4";
	evhttp_add_header(evhttp_request_get_output_headers(req), "Content-Type", mime);
	evhttp_send_reply(req, HTTP_OK, "OK", evb);
	result = 0;
	fprintf(stdout, "Sending %d bytes for %s\n", cnt, tt);
      }
    }
  if (evb)
    evbuffer_free(evb);
  if (t) free(t);
  return result;
}

const char *paths[] = {
  "examples/gstreamer",
  NULL
};

static void path_request_cb(struct evhttp_request *req, void *arg) {
  if (evhttp_request_get_command(req) != EVHTTP_REQ_GET) {
    evhttp_send_error(req, HTTP_BADMETHOD, 0);
    return;
  }
  const char *path = evhttp_request_get_uri(req);
  if (*path == '/') path++;
  if (!loadAndSend(req, arg, paths, path, NULL)) return;
  if (!loadAndSend(req, arg, paths, path, "/index.html")) return;
  fprintf(stderr, "Couldn't find: %s\n", path);
  evhttp_send_reply(req, HTTP_NOTFOUND, "Not found", NULL);
}

static void index_request_cb(struct evhttp_request *req, void *arg) {

  struct evbuffer *evb = NULL;
  int fd = -1;
  struct stat st;

  if(evhttp_request_get_command(req) != EVHTTP_REQ_GET) {
    evhttp_send_error(req, HTTP_BADMETHOD, 0);
    return;
  }

  evhttp_add_header(evhttp_request_get_output_headers(req), "Content-Type", "text/html");
  evb = evbuffer_new();
  evbuffer_add(evb, index_html, sizeof(index_html));
  evhttp_send_reply(req, HTTP_OK, "OK", evb);

  if(evb)
    evbuffer_free(evb);
}

int signal_service_create(signal_service_t *signal_service, options_t options) {

  signal_service->options = options;

  signal_service->base = event_base_new();
  if(!signal_service->base) {
    LOG_ERROR("Couldn't create an event_signal_service->base: exiting");
    return 1;
  }

  signal_service->http = evhttp_new(signal_service->base);
  if(!signal_service->http) {
    LOG_ERROR("Couldn't create evhttp. Exiting.");
    return 1;
  }

  evhttp_set_cb(signal_service->http, "/api", api_request_cb, signal_service);
  evhttp_set_cb(signal_service->http, "/", index_request_cb, signal_service);
  evhttp_set_gencb(signal_service->http, path_request_cb, signal_service);

  signal_service->handle = evhttp_bind_socket_with_handle(signal_service->http,
   signal_service->options.host, signal_service->options.port);
  if(!signal_service->handle) {
    LOG_ERROR("couldn't bind to %s:%d. Exiting.\n", signal_service->options.host,
     signal_service->options.port);
    return 1;
  }

  return 0;
}

void signal_service_dispatch(signal_service_t *signal_service) {

  printf("Listening %s:%d\n", signal_service->options.host, signal_service->options.port); 
  event_base_dispatch(signal_service->base);
}

void signal_service_on_offer_get(signal_service_t *signal_service,
 char* (*on_offer_get)(char *offer, void *data), void *data) {

  signal_service->data = data;
  signal_service->on_offer_get = on_offer_get;
}
