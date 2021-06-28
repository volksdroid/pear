#!/bin/bash
# set -e

git submodule update --init --recursive
./build-third-party.sh
(cd examples/gstreamer
 (cat index_html.h.template;sed -e 's/$/ \\n\\/' -e 's/"/\\"/g' <index.html
  echo '";'; echo \#endif // GSTREAMER_INDEX_HTML_H_) >index_html.h
 )
if [ ! -d cmake ]; then mkdir cmake; fi
(cd cmake
cmake -DCMAKE_BUILD_TYPE=Debug ..
cd examples
cmake -DENABLE_EXAMPLES=on -DCMAKE_BUILD_TYPE=Debug ..
make)
cp cmake/examples/gstreamer/gstreamer .

echo Modify this comnand line as needed for source, resolution.  Connect w/ web browser.  Right now, experiencing several second delay on connection, which needs debugging.
env PIPE_LINE='v4l2src ! videorate ! video/x-raw,width=1280,height=1024,framerate=30/1 ! videoconvert ! queue ! x264enc bitrate=6000 speed-preset=ultrafast tune=zerolatency key-int-max=15 ! video/x-h264,profile=constrained-baseline ! queue ! h264parse ! queue ! rtph264pay config-interval=-1 pt=102 seqnum-offset=0 timestamp-offset=0 mtu=1400 ! appsink name=pear-sink' ./gstreamer
