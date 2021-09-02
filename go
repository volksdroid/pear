#!/bin/bash
# set -e


# echo Modify this comnand line as needed for source, resolution.  Connect w/ web browser.

#    GST_DEBUG=*:1 \

env \
    GST_DEBUG=*:2 \
    PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=640,height=360,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=6000 speed-preset=ultrafast tune=zerolatency key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=124 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' \
    ./gstreamer

exit 0
env \
    GST_DEBUG=*:6 \
    PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=1024,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=9000 key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer

exit 0

env PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=9000 speed-preset=ultrafast tune=zerolatency key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer
