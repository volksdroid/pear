cmake_minimum_required(VERSION 3.1)
project(gstreamer)

find_package(PkgConfig)
pkg_check_modules(GST REQUIRED gstreamer-1.0>=1.4 gstreamer-base-1.0>=1.4)

set (CMAKE_C_FLAGS_DEBUG "-fsanitize=address -fno-omit-frame-pointer")
set (CMAKE_CPP_FLAGS_DEBUG "-fsanitize=address -fno-omit-frame-pointer")
set (LDFLAGS_DEBUG " -fsanitize=address ")

file(GLOB SRCS "*.c")

include_directories(${GST_INCLUDE_DIRS})

add_executable(gstreamer ${SRCS})

target_link_libraries(gstreamer pear glib-2.0 ssl crypto nice srtp2 rtp pthread event cjson  ${GST_LIBRARIES} ${GST_LINK_LIBRARIES} gtk-3 gobject-2.0)
