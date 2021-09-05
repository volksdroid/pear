
To have a device on a normal Internet connection be able to create a web app based WebRTC connection to an embedded device,
a public Internet web server with a valid TLS certificate is needed, with a way to proxy web traffic and any other signalling to the embedded device.
There are a variety of ways to do this.  ngrok works well, and is easy, although typing in the resulting URL would be tedius without a URL shortener.

Given full control of a web server, using an ssh tunnel with a reverse proxy works well.  Used with custom subdomains, a user for logging in with, this can work well.

# DNS
Create A records for subdomains, such as 'f', pointing to the reverse proxy webserver.

# TLS certificates
Use Letsencrypt or similar to obtain a certificate that works for the new subdomains, like:
certbot certonly -a webroot --webroot-path=/w/ \
 f.ip.st

Then install those certificates.  This is the script I use for my systems:

cpykeys
```
#!/bin/bash

STARTWD=`pwd`

last=`/bin/ls -rt /etc/letsencrypt/live|tail -1`

cd /etc/letsencrypt/archive/${last}
# echo copying from: /etc/letsencrypt/archive/${last}

# /usr/jdk/bin/keytool -printcert -file fullchain.pem
for x in *.pem;do
    if [ "$x" != "`echo $x|sed -e 's/1//'`" ]; then
        mv $x `echo $x|sed -e 's/1//'`
    fi
done
rm -f /etc/dovecot/dovecot.pem /etc/dovecot/private/dovecot.pem*
cp fullchain.pem /etc/dovecot/dovecot.pem
cp privkey.pem /etc/dovecot/private/dovecot.pem
cat privkey.pem cert.pem fullchain.pem  >/etc/haproxy/server.pem
scp /etc/haproxy/server.pem root@w5.lig.net:/etc/haproxy/server.pem
cat privkey.pem fullchain.pem >${STARTWD}/server.pem
cp fullchain.pem ${STARTWD}/
cat privkey.pem fullchain.pem >/etc/nginx/server.pem
scp /etc/nginx/server.pem root@w5.lig.net:/etc/nginx/server.pem
cp cert.pem   /etc/nginx/cert.pem
scp cert.pem root@w5.lig.net:/etc/nginx/cert.pem
rm -f   /etc/ssl/lig.net.pem  /etc/ssl/private/lig.net.privkey.pem
cp cert.pem                  /etc/ssl/lig.net.pem
scp cert.pem root@w5.lig.net:/etc/ssl/lig.net.pem
cp privkey.pem                  /etc/ssl/private/lig.net.privkey.pem
scp privkey.pem root@w5.lig.net:/etc/ssl/private/lig.net.privkey.pem

(cd ..;ls)|egrep -v ${last}|while read x;do rm ../$x/*; rm /etc/letsencrypt/live/$x/*;
                                            find *|cpio -pdumv ../$x/;
                                            find *|cpio -pdumv /etc/letsencrypt/live/$x/;done
service dovecot restart
service postfix restart
service nginx restart
service haproxy restart

sudo ssh root@w5.lig.net "service dovecot restart; service postfix restart; service nginx restart; service haproxy restart"
```

#SSH
Typical configuration: sshd_config
```
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_dsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
UsePrivilegeSeparation yes
KeyRegenerationInterval 3600
ServerKeyBits 1024
SyslogFacility AUTH
LogLevel INFO
LoginGraceTime 120
PermitRootLogin prohibit-password
StrictModes yes
PubkeyAuthentication yes
IgnoreRhosts yes
HostbasedAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
X11Forwarding yes
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
UsePAM yes
```


# Reverse proxy: haproxy
Reverse proxy for HTTP, HTTPS, TCP, WS, etc. can be done with a number of methods (Nginx, Caddy).  I use haproxy with this config (not minimized yet):

```
global
        log /dev/log    local0
        log /dev/log    local1 notice
        chroot /var/lib/haproxy
        stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
        stats timeout 30s
        user haproxy
        group haproxy
        daemon

        # Default SSL material locations
        ca-base /etc/ssl/certs
        crt-base /etc/ssl/private

        # Default ciphers to use on SSL-enabled listening sockets.
        # For more information, see ciphers(1SSL). This list is from:
        #  https://hynek.me/articles/hardening-your-web-servers-ssl-ciphers/
        # An alternative list with additional directives can be obtained from
        #  https://mozilla.github.io/server-side-tls/ssl-config-generator/?server=haproxy
        # ssl-default-bind-ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS
        ssl-default-bind-options no-sslv3
        maxconn 4096
        tune.ssl.default-dh-param 2048
        ssl-default-bind-ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA\
384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256
        ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11 no-tls-tickets
        ssl-default-server-ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-S\
HA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256
        ssl-default-server-options no-sslv3 no-tlsv10 no-tlsv11 no-tls-tickets

defaults
        log     global
        mode    http
        option  httplog
        option  dontlognull
        timeout connect 5000
        timeout client  50000
        timeout server  50000
        errorfile 400 /etc/haproxy/errors/400.http
        errorfile 403 /etc/haproxy/errors/403.http
        errorfile 408 /etc/haproxy/errors/408.http
        errorfile 500 /etc/haproxy/errors/500.http
        errorfile 502 /etc/haproxy/errors/502.http
        errorfile 503 /etc/haproxy/errors/503.http
        errorfile 504 /etc/haproxy/errors/504.http
        # option http-server-close
        option http-keep-alive
        option redispatch
        option contstats
        retries 3
        backlog 10000
        timeout client 25s
        timeout connect 5s
        timeout server 25s
# timeout tunnel available in ALOHA 5.5 or HAProxy 1.5-dev10 and higher
        timeout tunnel 3600s
        timeout http-keep-alive 1s
        timeout http-request 15s
        timeout queue 30s
        timeout tarpit 60s
        default-server inter 3s rise 2 fall 3
        # option forwardfor

frontend http-frontend
        mode http
        option http-keep-alive
        # option http-server-close
        bind *:80 name http
        acl host_ws hdr_beg(Host) -i ws.
        acl hdr_connection_upgrade hdr(Connection) -i Upgrade
        acl hdr_upgrade_websocket  hdr(Upgrade)    -i websocket
        acl is_websocket path_beg -i /ws
        acl is_websocket path_beg -i /socket.io
        acl is_vh hdr_beg(Host) -i mud.net
        acl is_fh hdr_beg(Host) -i f.
        acl is_vh hdr_beg(Host) -i v.
        acl is_ah hdr_beg(Host) -i a.
        use_backend bk_fh if is_fh
        use_backend bk_vh if is_vh
        use_backend bk_ah if is_ah
        redirect scheme https if !{ ssl_fc } !hdr_upgrade_websocket
        use_backend bk_ws if host_ws
        use_backend bk_ws if hdr_connection_upgrade hdr_upgrade_websocket is_websocket

frontend ft_web
        # bind 0.0.0.0:80 name http
        bind *:443 name https ssl crt /etc/haproxy/server.pem # alpn h2,http/1.1
        maxconn 60000
        mode http
        option httplog
        # log global
        acl http  ssl_fc,not
        acl https ssl_fc
        http-request set-header X-Forwarded-Protocol http if http
        http-request set-header X-Forwarded-Protocol https if https
        http-request set-header X-Forwarded-Proto http if http
        http-request set-header X-Forwarded-Proto https if https

        ## routing based on Host header
        acl host_ws hdr_beg(Host) -i ws.
        use_backend bk_ws if host_ws

        acl is_v hdr_beg(Host) -i mud.net
        acl is_v hdr_beg(Host) -i v.
        acl is_f hdr_beg(Host) -i f.
        acl is_a hdr_beg(Host) -i a.
        use_backend bk_v if is_v
        use_backend bk_f if is_f
        use_backend bk_a if is_a

        acl is_vl path_beg -i /vl
        use_backend bk_vl if is_vl

        ## routing based on websocket protocol header
        acl hdr_connection_upgrade hdr(Connection)      -i Upgrade
        acl hdr_upgrade_websocket       hdr(Upgrade)     -i websocket
        acl is_websocket path_beg -i /ws
        acl is_websocket path_beg -i /socket.io
        # acl is_example hdr_end(host) -i example.com

        use_backend bk_ws if hdr_connection_upgrade hdr_upgrade_websocket is_websocket
        default_backend bk_web

backend bk_web
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        balance roundrobin
        option forwardfor
        cookie SERVERID insert indirect nocache
        option log-health-checks
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        option httpchk HEAD  http://lig.net:81
        http-check expect status 404
        server websrv1 lig.net:81 maxconn 30000 weight 10 cookie websrv1 check
        # option http-keep-alive
        # option http-server-close
        # log global

backend bk_f
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        option forwardfor
        cookie SERVERID insert indirect nocache
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        # option httpchk HEAD http://localhost:9001
        http-check expect status 200
        server websrvf localhost:9001 maxconn 30000 weight 10 cookie websrvf check

backend bk_v
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        option forwardfor
        cookie SERVERID insert indirect nocache
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        # option httpchk HEAD http://localhost:9002
        http-check expect status 200
        server websrvv localhost:9002 maxconn 30000 weight 10 cookie websrvv check

backend bk_a
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        option forwardfor
        cookie SERVERID insert indirect nocache
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        # option httpchk HEAD http://localhost:9003
        http-check expect status 200
        server websrva localhost:9003 maxconn 30000 weight 10 cookie websrva check

backend bk_fh
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        option forwardfor
        cookie SERVERID insert indirect nocache
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        # option httpchk HEAD http://localhost:9081
        http-check expect status 200
        server websrvfh localhost:9081 maxconn 30000 weight 10 cookie websrvfh check

backend bk_vh
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        option forwardfor
        cookie SERVERID insert indirect nocache
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        # option httpchk HEAD http://localhost:9082
        http-check expect status 200
        server websrvvh localhost:9082 maxconn 30000 weight 10 cookie websrvvh check

backend bk_ah
        mode http
        log "${LOCAL_SYSLOG}:514" local0 notice
        option forwardfor
        cookie SERVERID insert indirect nocache
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s
        # option httpchk HEAD http://localhost:9083
        http-check expect status 200
        server websrvah localhost:9083 maxconn 30000 weight 10 cookie websrvah check

backend bk_ws
        mode http
        log global
        log "${LOCAL_SYSLOG}:514" local0 notice
        # timeout server 120s
        balance source
        option forwardfor
        # based on cookie set in header
        # haproxy will add the cookies for us
        cookie SERVERID insert indirect nocache
        option log-health-checks
        option redispatch
        timeout connect 1s
        timeout queue 5s
        timeout server 3600s

## websocket protocol validation
        # acl hdr_websocket_key hdr_cnt(Sec-WebSocket-Key) eq 1
        # acl hdr_websocket_version     hdr_cnt(Sec-WebSocket-Version)  eq 1
        # http-request deny if ! hdr_connection_upgrade ! hdr_upgrade_websocket ! hdr_websocket_key ! hdr_websocket_version

        option http-keep-alive
        # option http-server-close
        option forceclose
        no option httpclose

## ensure our application protocol name is valid
## (don't forget to update the list each time you publish new applications)
        # acl ws_valid_protocol hdr(Sec-WebSocket-Protocol) echo-protocol
        # http-request deny if ! ws_valid_protocol
## websocket health checking
        option httpchk GET http://lig.net:81
        http-check expect status 200
        server crossbar localhost:8082 maxconn 30000 weight 10 cookie crossbar check

```

# Web server config: nginx.conf
```
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    ## Accept as many connections as possible.
    multi_accept on;
}

http {
        # Basic Settings
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
    client_body_timeout             60;
    client_header_timeout           60;
    keepalive_timeout            10 10;
    send_timeout                    60;
    reset_timedout_connection on;
    client_max_body_size 10m;
        types_hash_max_size 2048;
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # Dropping SSLv3, ref: POODLE
        ssl_prefer_server_ciphers on;

        ##
        # Logging Settings
        ##

        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log;

        ##
        # Gzip Settings
        ##

    gzip              on;
    gzip_buffers      16 8k;
    gzip_comp_level   1;
    gzip_http_version 1.1;
    gzip_min_length   10;
    gzip_types        text/plain text/css application/x-javascript text/xml application/xml application/xml+rss text/javascript image/x-icon application/vnd.ms-fontobject font/opentype application/x-font-ttf;
    gzip_vary         on;
    gzip_proxied      any; # Compression for all requests.
    gzip_disable "msie6";
    gzip_static on;
    server_tokens off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header X-Frame-Options sameorigin;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

sites-enabled/default
```
server {
    listen 0.0.0.0:444 ssl http2 default_server;
    listen 0.0.0.0:81 default_server;
    absolute_redirect off;
    port_in_redirect off;
    server_name ~^(www\.)?(?<domain>.+)$;
    set $root /w/$2/html/;
    ssl_certificate     /etc/nginx/cert.pem;
    ssl_certificate_key /etc/nginx/server.pem;
    ssl_ciphers AESGCM:MEDIUM:!aNULL:!MD5;
    index index.php index.html index.htm index.nginx-debian.html index.cgi;
    access_log /w/$domain/log/access.log;
    location /.well-known { root /w/; }
    location / {
        root /w/$2/html;
        try_files html/$uri html/$uri/  =404;
        index index.php index.cgi index.html index.htm index.nginx-debian.html;
     if ($request_method = 'OPTIONS') {
         add_header 'Access-Control-Allow-Origin' '*';
         add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
         add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Accept-Ranges,Content-Range,Content-Encoding,Content-Length';
         add_header 'Access-Control-Max-Age' 1728000;
         add_header 'Content-Type' 'text/plain charset=UTF-8';
         add_header 'Content-Length' 0;
         return 204;
         }
         if ($request_method = 'POST') {
             add_header 'Access-Control-Allow-Origin' '*';
             add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
             add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Accept-Ranges,Content-Range,Content-Encoding,Content-Length';
             add_header 'Access-Control-Expose-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Accept-Ranges,Content-Range,Content-Encoding,Content-Length';
         }
         if ($request_method = 'GET') {
           add_header 'Access-Control-Allow-Origin' '*';
           add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
           add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Accept-Ranges,Content-Range,Content-Encoding,Content-Length';
           add_header 'Access-Control-Expose-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Accept-Ranges,Content-Range,Content-Encoding,Content-Length';
         }
    }
    location /private {
        root /w/$2/html/;
        try_files $uri $uri/ =404;
        index index.php index.html index.htm;
        auth_basic "Restricted Content";
        auth_basic_user_file /w/$2/.htpasswd;
    }
  location ~ \.php$ {
        root $root;
        include snippets/fastcgi-php.conf;
        include fastcgi_params;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        if ($uri !~ "^/images/") {
          fastcgi_pass unix:/run/php/php7.0-fpm.sock;
        }
  }
  location ~ /\.ht {
        deny all;
  }
}
```
