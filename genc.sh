#!/bin/sh
# Preview and save webcam video on NVIDIA Jetson TK1
# Grab audio and video (in h264 format) from Logitech c920 @ 1920x1080
# Preview @ 1280x720 on screen
# Store video to file named gEncode1080p.mp4
# Logitech c920 is video1 on this machine
VELEM="v4l2src device=/dev/video0 do-timestamp=true"
# Video capability from the camera - get h264 1920x1080
VCAPS="video/x-h264, width=1920, height=1080, framerate=30/1"

# Video Source
VSOURCE="$VELEM ! $VCAPS"
# Decode the video - parse the h264 from the camera and then decode it
# Hardware accelerated by using omxh264dec
VIDEO_DEC="h264parse ! omxh264dec"
# SIZE OF THE PREVIEW WINDOW ON THE DISPLAY ; 1280x720 here
PREVIEW_SCALE="video/x-raw, width=1280, height=720"
# VIDEO_SINK is the preview window
VIDEO_SINK="videoconvert ! videoscale ! $PREVIEW_SCALE ! xvimagesink sync=false"
# FILE_SINK="filesink location=gEncode1080p.mp4"

# ============ AUDIO ===========================
# Use $ pactl list
# to get the device ;
# alsasrc had issues, so pulsesrc was used instead
# AELEM="pulsesrc device=alsa_input.usb-046d_HD_Pro_Webcam_C920_A116B66F-02-C920.iec958-stereo  do-timestamp=true"
AELEM="pulsesrc device=alsa_input.usb-Magic_Control_Technology_Corp._j5create_360_Meeting_Webcam_V1.00.28-02.analog-stereo  do-timestamp=true"
AUDIO_CAPS="audio/x-raw"
AUDIO_ENC="audioconvert ! voaacenc"
ASOURCE="$AELEM ! $AUDIO_CAPS"

#show the gst-launch command line; can be useful for debugging
echo gst-launch-1.0 -vvv -e \
     mp4mux name=filemux ! $FILE_SINK\
     $VSOURCE ! tee name=tsplit \
     ! queue ! $VIDEO_DEC ! $VIDEO_SINK tsplit.\
     ! queue ! h264parse ! filemux.video_0 \
     $ASOURCE ! queue ! $AUDIO_ENC ! filemux.audio_0

gst-launch-1.0 -vvv -e \
     mp4mux name=filemux ! $FILE_SINK\
     $VSOURCE ! tee name=tsplit \
     ! queue ! $VIDEO_DEC ! $VIDEO_SINK tsplit.\
     ! queue ! h264parse ! filemux.video_0 \
     $ASOURCE ! queue ! $AUDIO_ENC ! filemux.audio_0

exit 0
# mp4mux filemux is the multiplexer for the file that's being written
# Video and Audio source go into the filemux
# Video also goes into the VIDEO_SINK, which is a window on the display
gst-launch-1.0 -vvv -e \
	       mp4mux name=filemux ! $FILE_SINK\
	       $VSOURCE ! tee name=tsplit \
	       ! queue ! $VIDEO_DEC ! $VIDEO_SINK tsplit.\
	       ! queue ! h264parse ! filemux.video_0 \
	       $ASOURCE ! queue ! $AUDIO_ENC ! filemux.audio_0
