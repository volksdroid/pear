#ifndef GSTREAMER_INDEX_HTML_H_
#define GSTREAMER_INDEX_HTML_H_
 
#include <stdio.h>
#include <stdlib.h>

const char index_html[] = "\
<!DOCTYPE html> \n\
<html> \n\
  <head> \n\
    <title>GStreamer</title> \n\
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, shrink-to-fit=no\"> \n\
  </head> \n\
  <body style=\"width:100%\"> \n\
    <video controls autoplay muted playsinline webkit-playsinline \n\
	   style='height:100vh; display:block; margin: 0 auto;' \n\
	   id='video'></video> \n\
    <script> \n\
      function jsonRpc(payload, cb) { \n\
        var xhttp = new XMLHttpRequest(); \n\
        xhttp.onreadystatechange = function(data) { \n\
	  console.log(`RPS response`, data); \n\
          if (this.readyState == 4 && this.status == 200) { \n\
            cb(this.responseText); \n\
          } \n\
        }; \n\
        xhttp.open('POST', '/api'); \n\
        xhttp.setRequestHeader('Content-Type', 'application/json'); \n\
        xhttp.send(JSON.stringify(payload)); \n\
      } \n\
      let pc = new RTCPeerConnection({ \n\
        rtcpMuxPolicy: 'require', bundlePolicy: 'max-bundle', \n\
        iceServers: [{urls: 'stun:w5.lig.net:3478'}, {urls: 'stun:f.ip.st:3478'}, {urls: 'turn:w5.lig.net:3478', username: 'forged', credential: 'droids'}, {urls: 'turn:f.ip.st:3478', username: 'forged', credential: 'droids'}] \n\
      // iceServers: [{urls: 'stun:lig.net:3478'}] \n\
      // iceServers: [{urls: 'stun:w5.lig.net:3478'}] \n\
      }); \n\
      let log = msg => { \n\
        console.log(msg); \n\
      }; \n\
 \n\
      pc.ontrack = function (event) { \n\
        console.log(`ontrack: Playing`); \n\
        var el = document.getElementById('video'); \n\
        el.srcObject = event.streams[0]; \n\
        el.id = event.streams[0].id; \n\
        el.autoplay = true; \n\
        el.controls = true; \n\
        el.muted = true; \n\
        el.addEventListener(\"click\", function() { el.play(); }); \n\
      }; \n\
 \n\
      pc.oniceconnectionstatechange = e => log(pc.iceConnectionState); \n\
      function jsonRpcHandle(result) { \n\
        let sdp = JSON.parse(result).result; \n\
        if (sdp === '') { \n\
          return alert('Session Description must not be empty'); \n\
        } \n\
        try { \n\
          let sdps = JSON.parse(atob(sdp)); \n\
          console.log(`SDP:`, sdps); \n\
          pc.setRemoteDescription(new RTCSessionDescription(sdps)); \n\
        } catch (e) { \n\
          alert(e); \n\
        } \n\
      } \n\
      pc.onicecandidate = event => { \n\
        if (event.candidate === null) { \n\
          var lines = pc.localDescription.sdp.split('\n'); \n\
          for(let i = 0; i < lines.length; i++) { \n\
            // remove candidate which libnice cannot parse. \n\
            if (lines[i].search('candidate') != -1 && lines[i].search('local') != -1) { \n\
              lines.splice(i, 1); \n\
              i--; \n\
            } \n\
          } \n\
          let sdp = lines.join('\n'); \n\
          var payload = {\"jsonrpc\": \"2.0\", \"method\": \"call\", \"params\": btoa(sdp)}; \n\
          jsonRpc(payload, jsonRpcHandle); \n\
        } \n\
      }; \n\
      pc.addTransceiver('video', {'direction': 'sendrecv'}) \n\
      let options = { \n\
        offerToReceiveVideo: true, \n\
        offerToReceiveAudio: true, \n\
      }; \n\
	pc.createOffer().then(d => { \n\
	  console.log(d); \n\
	  pc.setLocalDescription(d); \n\
	}).catch(log); \n\
      window.startSession = () => { \n\
        // let sd = document.getElementById('remoteSessionDescription').value; \n\
      } \n\
    </script> \n\
  </body> \n\
</html> \n\
     \n\
";
#endif // GSTREAMER_INDEX_HTML_H_
