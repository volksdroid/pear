cmake_minimum_required(VERSION 3.1)
project(pear)

set (CMAKE_C_FLAGS_DEBUG "-fsanitize=address -fno-omit-frame-pointer")
set (CMAKE_CPP_FLAGS_DEBUG "-fsanitize=address -fno-omit-frame-pointer")

add_subdirectory(src)
add_subdirectory(examples)
