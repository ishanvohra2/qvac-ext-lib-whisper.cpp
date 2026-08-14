#!/usr/bin/env bash

set -euo pipefail

: "${IOS_DEVICE_ID:?Set IOS_DEVICE_ID to the connected iPhone UDID or name}"

SCRIPT_DIR="${BASH_SOURCE[0]%/*}"
COMPARISON_DIR="${SCRIPT_DIR}/.."

export PARAKEET_QVAC_CLI="${SCRIPT_DIR}/ios-qvac.py"
export PARAKEET_MUDLER_CLI="${SCRIPT_DIR}/ios-mudler.py"
export PARAKEET_QVAC_MODELS_DIR="${PARAKEET_QVAC_MODELS_DIR:-${IOS_QVAC_MODEL_ROOT:-${COMPARISON_DIR}/models/qvac}}"
export PARAKEET_MUDLER_MODELS_DIR="${PARAKEET_MUDLER_MODELS_DIR:-${IOS_MUDLER_MODEL_ROOT:-${COMPARISON_DIR}/models/mudler}}"
export PARAKEET_FLEURS_MANIFEST="${PARAKEET_FLEURS_MANIFEST:-${IOS_FLEURS_ROOT:-${COMPARISON_DIR}/out/fleurs}/manifest.json}"
export PARAKEET_COMPARE_OUT_DIR="${COMPARISON_DIR}/out-ios"
export PARAKEET_COMPARE_MODELS=tdt
export PARAKEET_QVAC_BACKEND=Metal
export PARAKEET_MUDLER_BACKEND=Metal
export PARAKEET_MUDLER_DEVICE=MTL0

node "${COMPARISON_DIR}/run-comparison.js" --dry-run --fleurs-only

export PARAKEET_FLEURS_GPU=false
node "${COMPARISON_DIR}/run-comparison.js" --fleurs-only

export PARAKEET_FLEURS_GPU=true
node "${COMPARISON_DIR}/run-comparison.js" --fleurs-only
