# Pear - WebRTC Toolkit for IoT/Embedded Device

# ./gob # checks out and builds examples, copying gstreamer to root of project.

# Modify this command line as desired for source, resolution, etc.
# env PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=1024,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=6000 speed-preset=ultrafast tune=zerolatency key-int-max=15 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer

# Connect web browser.  For / (index.html), there is a simple video view in the browser.  For /m.html, slr.html, stb.html, a WebXR view can be activated.  Requires 1 click to allow video to play because of browser security requirements.


![pear-ci](https://github.com/sepfy/pear/actions/workflows/pear-ci.yml/badge.svg)

Pear is a WebRTC SDK written in C. The SDK aims to integrate IoT/Embedded device with WebRTC applications.

<b>Notice: This project is a work in progress. Currently, only support streaming H264 video or OPUS audio to browser.</b>

### Dependencies (incomplete)

* [libsrtp](https://github.com/cisco/libsrtp)
* [libnice](https://github.com/libnice/libnice)
* [librtp](https://github.com/ireader/media-server)


### Getting Started
These steps are completed by ./goinit:

```
# sudo apt -y install libglib2.0-dev libssl-dev git cmake ninja-build
# sudo pip3 install meson
# git clone --recursive https://github.com/sepfy/pear
# ./build-third-party.sh
# mkdir cmake
# cd cmake
# cmake ..
# make
```

Then run ./gob to build 'gstreamer' which is used by the go / goquest and gozed / gozed102 scripts.

# Ssh tunnel to reverse TLS web proxy
WebXR will only work with an HTTPS URL / page / server.  The unmodified / no app Oculus Quest needs to be able to navigate to a secure web page to download the web app from an embedded web server on the target
device / robot / board, then make a WebRTC connection to the same process through HTTPS signaling (WebRTC term for exchanging connection information).

The netf (from the FD robot), netmudnet (from the TX1) scripts ssh to a corresponding user on a cloud server with arguments that listen on a particular
unique port which is proxied to the locally running gstreamer app listening on http://localhost:8080.

While these ssh connections have ServerAlive keepalive,
a machine suspending or changing network config can strand an ssh client with open tunnels.  The netfdclean and netmudclean scripts use ssh to login to the same user@domain,
killing any ssh clients for that user.  This should reset to prevent tunnel conflicts.

The server configuration to support this is documented in ServerConfig.md

### Examples
- [Local file](https://github.com/sepfy/pear/tree/main/examples/local_file): Stream h264 file to browser and exchange SDP by copy and paste.
- [GStreamer](https://github.com/sepfy/pear/tree/main/examples/gstreamer): Stream v4l2 source to browser with GStreamer and exhange SDP by libevent HTTP server.
