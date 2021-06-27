# Shortcut (sdw)
# Be sure to have run this once:
# sudo apt -y install libglib2.0-dev libssl-dev git cmake ninja-build
# sudo pip3 install meson

# ./go # checks out and builds examples, copying gstreamer to root of project.
# # Modify this command line as desired for source, resolution, etc.
# env PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=1024,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=6000 speed-preset=ultrafast tune=zerolatency key-int-max=15 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer

# # Connect web browser.  Currently, there is a delay of several seconds to connect - shouldn't be required, debugging soon.


# Pear - WebRTC Toolkit for IoT/Embedded Device

![pear-ci](https://github.com/sepfy/pear/actions/workflows/pear-ci.yml/badge.svg)

Pear is a WebRTC SDK written in C. The SDK aims to integrate IoT/Embedded device with WebRTC applications.

<b>Notice: This project is a work in progress. Currently, only support streaming H264 video or OPUS audio to browser.</b>

### Dependencies

* [libsrtp](https://github.com/cisco/libsrtp)
* [libnice](https://github.com/libnice/libnice)
* [librtp](https://github.com/ireader/media-server)


### Getting Started

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

### Examples
- [Local file](https://github.com/sepfy/pear/tree/main/examples/local_file): Stream h264 file to browser and exchange SDP by copy and paste.
- [GStreamer](https://github.com/sepfy/pear/tree/main/examples/gstreamer): Stream v4l2 source to browser with GStreamer and exhange SDP by libevent HTTP server.
