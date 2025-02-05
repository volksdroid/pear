#!/bin/bash
# set -e


# echo Modify this comnand line as needed for source, resolution.  Connect w/ web browser.

#    GST_DEBUG=*:1 \

#    LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libasan.so.4 \

# 1280, 720, 960x540
# qp-min=18
# GST_DEBUG="GST_TRACER:7" GST_TRACERS="interlatency" \
    # Maybe causes lockup:    # b-adapt=true rc-lookahead=1


env PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=720,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=3000 speed-preset=ultrafast tune=zerolatency key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1500 ! appsink name=pear-sink' ./gstreamer

exit 0

# Best low latency, still locks up
env \
    GST_DEBUG=*:3 \
    PIPE_LINE='v4l2src num-buffers=4000 ! videorate ! video/x-raw,width=1280,height=720,framerate=30/1 ! queue ! videoconvert ! queue ! x264enc bitrate=3000 b-adapt=true rc-lookahead=6 speed-preset=ultrafast tune=zerolatency key-int-max=20 pass=quant ! queue ! video/x-h264,profile=constrained-baseline ! queue !h264parse ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1500 ! queue ! appsink name=pear-sink' \
    ./gstreamer

exit 0

# 250ms latency, 20fps, but locks up
env \
    GST_DEBUG=*:3 \
    PIPE_LINE='v4l2src num-buffers=2000 ! videorate ! video/x-raw,width=960,height=540,framerate=20/1 ! queue ! videoconvert ! queue ! x264enc bitrate=3000 b-adapt=true rc-lookahead=1 speed-preset=ultrafast tune=zerolatency key-int-max=60 pass=qual ! queue ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1500 ! queue ! appsink name=pear-sink' \
    ./gstreamer


# x-h264 source
env \
    GST_DEBUG=*:3 \
    PIPE_LINE='v4l2src num-buffers=1000 ! video/x-h264,width=1280,height=720,framerate=15/1 ! h264parse ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1500 ! queue ! appsink name=pear-sink' \
    ./gstreamer

exit 0

# Last x264enc, with extra parameters
env \
    GST_DEBUG=*:3 \
    PIPE_LINE='v4l2src num-buffers=1000 ! videorate ! video/x-raw,width=960,height=540,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=4000 b-adapt=true rc-lookahead=5 speed-preset=ultrafast tune=zerolatency key-int-max=30 pass=qual ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1500 ! appsink name=pear-sink' \
    ./gstreamer

exit 0

env \
    GST_DEBUG=*:3 \
    PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=720,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=9000 speed-preset=ultrafast tune=zerolatency key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1500 ! appsink name=pear-sink' \
    ./gstreamer

exit 0
env \
    GST_DEBUG=*:6 \
    PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=1024,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=9000 key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer

exit 0

env PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=9000 speed-preset=ultrafast tune=zerolatency key-int-max=30 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer
