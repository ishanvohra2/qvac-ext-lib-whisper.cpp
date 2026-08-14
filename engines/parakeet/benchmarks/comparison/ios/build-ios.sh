#!/usr/bin/env bash

set -euo pipefail

: "${IOS_DEVELOPMENT_TEAM:?Set IOS_DEVELOPMENT_TEAM to the Apple signing team ID}"
: "${IOS_DEVICE_ID:?Set IOS_DEVICE_ID to the connected iPhone UDID or name}"
: "${IOS_XCODE_DEVICE_ID:?Set IOS_XCODE_DEVICE_ID to the iPhone Xcode destination UDID}"
: "${MUDLER_SOURCE_DIR:?Set MUDLER_SOURCE_DIR to mudler/parakeet.cpp v0.5.0}"

SCRIPT_DIR="${BASH_SOURCE[0]%/*}"
BUILD_ROOT="${SCRIPT_DIR}/build"
QVAC_BUILD="${BUILD_ROOT}/qvac"
MUDLER_BUILD="${BUILD_ROOT}/mudler"

cmake \
    -S "${SCRIPT_DIR}/qvac" \
    -B "${QVAC_BUILD}" \
    -G Xcode \
    -DCMAKE_SYSTEM_NAME=iOS \
    -DCMAKE_OSX_SYSROOT=iphoneos \
    -DCMAKE_OSX_ARCHITECTURES=arm64 \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=16.4 \
    -DIOS_DEVELOPMENT_TEAM="${IOS_DEVELOPMENT_TEAM}"

cmake \
    -S "${SCRIPT_DIR}/mudler" \
    -B "${MUDLER_BUILD}" \
    -G Xcode \
    -DCMAKE_SYSTEM_NAME=iOS \
    -DCMAKE_OSX_SYSROOT=iphoneos \
    -DCMAKE_OSX_ARCHITECTURES=arm64 \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=16.4 \
    -DIOS_DEVELOPMENT_TEAM="${IOS_DEVELOPMENT_TEAM}" \
    -DMUDLER_SOURCE_DIR="${MUDLER_SOURCE_DIR}"

xcodebuild \
    -project "${QVAC_BUILD}/QvacParakeetBench.xcodeproj" \
    -scheme QvacParakeetBench \
    -configuration Release \
    -destination "id=${IOS_XCODE_DEVICE_ID}" \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    build

xcodebuild \
    -project "${MUDLER_BUILD}/MudlerParakeetBench.xcodeproj" \
    -scheme MudlerParakeetBench \
    -configuration Release \
    -destination "id=${IOS_XCODE_DEVICE_ID}" \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    build

xcrun devicectl device install app \
    --device "${IOS_DEVICE_ID}" \
    "${QVAC_BUILD}/Release-iphoneos/QvacParakeetBench.app"

xcrun devicectl device install app \
    --device "${IOS_DEVICE_ID}" \
    "${MUDLER_BUILD}/Release-iphoneos/MudlerParakeetBench.app"
