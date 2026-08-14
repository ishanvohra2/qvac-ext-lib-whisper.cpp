cmake_minimum_required(VERSION 3.25)
project(MudlerParakeetBench LANGUAGES C CXX OBJC OBJCXX)

set(MUDLER_SOURCE_DIR "" CACHE PATH "Path to a mudler/parakeet.cpp v0.5.0 checkout")
set(MUDLER_V050_COMMIT "1bfbebfaaf493866f49597cd3b7901959d395c60")
set(MUDLER_V050_GGML_COMMIT "e705c5fed490514458bdd2eaddc43bd098fcce9b")

if(NOT CMAKE_SYSTEM_NAME STREQUAL "iOS")
    message(FATAL_ERROR "MudlerParakeetBench must be cross-compiled for iOS")
endif()
if(NOT IOS_DEVELOPMENT_TEAM)
    message(FATAL_ERROR "IOS_DEVELOPMENT_TEAM is required for device signing")
endif()
if(NOT MUDLER_SOURCE_DIR OR NOT EXISTS "${MUDLER_SOURCE_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "MUDLER_SOURCE_DIR must point to a mudler/parakeet.cpp v0.5.0 checkout")
endif()
if(NOT EXISTS "${MUDLER_SOURCE_DIR}/third_party/ggml/CMakeLists.txt")
    message(FATAL_ERROR "MUDLER_SOURCE_DIR must include the initialized v0.5.0 ggml submodule")
endif()

find_package(Git REQUIRED)
execute_process(
    COMMAND "${GIT_EXECUTABLE}" -C "${MUDLER_SOURCE_DIR}" rev-parse HEAD
    RESULT_VARIABLE MUDLER_GIT_STATUS
    OUTPUT_VARIABLE MUDLER_GIT_COMMIT
    OUTPUT_STRIP_TRAILING_WHITESPACE)
execute_process(
    COMMAND "${GIT_EXECUTABLE}" -C "${MUDLER_SOURCE_DIR}/third_party/ggml" rev-parse HEAD
    RESULT_VARIABLE MUDLER_GGML_GIT_STATUS
    OUTPUT_VARIABLE MUDLER_GGML_GIT_COMMIT
    OUTPUT_STRIP_TRAILING_WHITESPACE)
if(NOT MUDLER_GIT_STATUS EQUAL 0 OR NOT MUDLER_GIT_COMMIT STREQUAL MUDLER_V050_COMMIT)
    message(FATAL_ERROR
        "MUDLER_SOURCE_DIR must be exactly mudler/parakeet.cpp v0.5.0 "
        "(${MUDLER_V050_COMMIT}); found '${MUDLER_GIT_COMMIT}'")
endif()
if(NOT MUDLER_GGML_GIT_STATUS EQUAL 0 OR
   NOT MUDLER_GGML_GIT_COMMIT STREQUAL MUDLER_V050_GGML_COMMIT)
    message(FATAL_ERROR
        "mudler v0.5.0 requires ggml ${MUDLER_V050_GGML_COMMIT}; "
        "found '${MUDLER_GGML_GIT_COMMIT}'")
endif()
execute_process(
    COMMAND "${GIT_EXECUTABLE}" -C "${MUDLER_SOURCE_DIR}"
            diff --quiet HEAD -- . ":(exclude)third_party/ggml"
    RESULT_VARIABLE MUDLER_SOURCE_DIFF_STATUS)
if(NOT MUDLER_SOURCE_DIFF_STATUS EQUAL 0)
    message(FATAL_ERROR
        "MUDLER_SOURCE_DIR has tracked changes outside the expected ggml patches")
endif()

function(apply_mudler_ggml_patch patch)
    execute_process(
        COMMAND "${GIT_EXECUTABLE}" -C "${MUDLER_SOURCE_DIR}/third_party/ggml"
                apply --check --reverse "${patch}"
        RESULT_VARIABLE PATCH_ALREADY_APPLIED
        OUTPUT_QUIET
        ERROR_QUIET)
    if(PATCH_ALREADY_APPLIED EQUAL 0)
        return()
    endif()
    execute_process(
        COMMAND "${GIT_EXECUTABLE}" -C "${MUDLER_SOURCE_DIR}/third_party/ggml"
                apply --check "${patch}"
        RESULT_VARIABLE PATCH_CHECK_STATUS)
    if(NOT PATCH_CHECK_STATUS EQUAL 0)
        message(FATAL_ERROR "mudler ggml patch cannot be applied safely: ${patch}")
    endif()
    execute_process(
        COMMAND "${GIT_EXECUTABLE}" -C "${MUDLER_SOURCE_DIR}/third_party/ggml"
                apply "${patch}"
        RESULT_VARIABLE PATCH_APPLY_STATUS)
    if(NOT PATCH_APPLY_STATUS EQUAL 0)
        message(FATAL_ERROR "failed to apply mudler ggml patch: ${patch}")
    endif()
endfunction()

file(GLOB MUDLER_GGML_PATCHES
    "${MUDLER_SOURCE_DIR}/third_party/ggml-patches/*.patch")
list(SORT MUDLER_GGML_PATCHES)
list(LENGTH MUDLER_GGML_PATCHES MUDLER_GGML_PATCH_COUNT)
if(NOT MUDLER_GGML_PATCH_COUNT EQUAL 4)
    message(FATAL_ERROR
        "mudler v0.5.0 requires exactly four bundled ggml patches; "
        "found ${MUDLER_GGML_PATCH_COUNT}")
endif()
foreach(MUDLER_GGML_PATCH IN LISTS MUDLER_GGML_PATCHES)
    apply_mudler_ggml_patch("${MUDLER_GGML_PATCH}")
endforeach()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(GGML_ACCELERATE OFF CACHE BOOL "" FORCE)
set(GGML_BACKEND_DL OFF CACHE BOOL "" FORCE)
set(GGML_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GGML_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GGML_METAL ON CACHE BOOL "" FORCE)
set(GGML_METAL_EMBED_LIBRARY ON CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_STATIC ON CACHE BOOL "" FORCE)
set(PARAKEET_BUILD_CLI OFF CACHE BOOL "" FORCE)
set(PARAKEET_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(PARAKEET_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(PARAKEET_GGML_METAL ON CACHE BOOL "" FORCE)
set(PARAKEET_SHARED OFF CACHE BOOL "" FORCE)

set(IOS_COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../common")
add_subdirectory("${MUDLER_SOURCE_DIR}" mudler)
target_include_directories(parakeet PRIVATE "${MUDLER_SOURCE_DIR}/third_party")

add_library(mudler-cli-entry OBJECT
    "${MUDLER_SOURCE_DIR}/examples/cli/main.cpp")
target_compile_definitions(mudler-cli-entry PRIVATE
    main=mudler_parakeet_cli_main)
target_include_directories(mudler-cli-entry PRIVATE
    "${MUDLER_SOURCE_DIR}/src")
target_link_libraries(mudler-cli-entry PRIVATE parakeet)

set(IOS_PRODUCT_NAME MudlerParakeetBench)
set(IOS_BUNDLE_IDENTIFIER com.ishanvohra.parakeetbench.mudler)
configure_file(
    "${IOS_COMMON_DIR}/Info.plist.in"
    "${CMAKE_CURRENT_BINARY_DIR}/Info.plist"
    @ONLY)

add_executable(MudlerParakeetBench MACOSX_BUNDLE
    "${IOS_COMMON_DIR}/BenchApp.mm"
    MudlerAdapter.cpp
    $<TARGET_OBJECTS:mudler-cli-entry>)
target_include_directories(MudlerParakeetBench PRIVATE "${IOS_COMMON_DIR}")
target_link_libraries(MudlerParakeetBench PRIVATE
    parakeet
    "-framework Foundation"
    "-framework UIKit")
set_target_properties(MudlerParakeetBench PROPERTIES
    MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_BINARY_DIR}/Info.plist"
    XCODE_GENERATE_SCHEME TRUE
    XCODE_ATTRIBUTE_CODE_SIGN_STYLE Automatic
    XCODE_ATTRIBUTE_DEVELOPMENT_TEAM "${IOS_DEVELOPMENT_TEAM}"
    XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "16.4"
    XCODE_ATTRIBUTE_ONLY_ACTIVE_ARCH YES
    XCODE_ATTRIBUTE_PRODUCT_BUNDLE_IDENTIFIER "${IOS_BUNDLE_IDENTIFIER}"
    XCODE_ATTRIBUTE_SUPPORTED_PLATFORMS iphoneos
    XCODE_ATTRIBUTE_TARGETED_DEVICE_FAMILY "1")
