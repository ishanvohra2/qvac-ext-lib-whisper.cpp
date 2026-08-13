# NVIDIA comparison handoff

Use the QVAC branch
[`tmp-parakeet-engine-comparison-v2`](https://github.com/ishanvohra2/qvac-ext-lib-whisper.cpp/tree/tmp-parakeet-engine-comparison-v2).
The benchmark must invoke the two C++ CLIs directly. Do not build or run
`packages/asr-ggml`, an addon, an SDK, or a language binding.

## Scope and backend limitation

Run these as separate measurements:

1. **Vulkan versus Vulkan:** the valid matched engine comparison.
2. **QVAC OpenCL versus mudler Vulkan:** an optional backend-mismatch diagnostic.

Mudler does not currently expose an OpenCL build option. Its NVIDIA backends are
Vulkan and CUDA. Consequently, the second measurement is not an engine-only
comparison and must always be labelled `OpenCL vs Vulkan`; do not combine it
with or rank it beside the matched Vulkan result.

The QVAC OpenCL backend is available in its ggml fork, but NVIDIA desktop
OpenCL is not part of this harness's existing validated matrix. Treat failure
to initialize or unsupported operations as a result to report, not as a reason
to allow CPU fallback.

## Record the environment

Before building, save the following with the results:

```bash
nvidia-smi
uname -a
cmake --version
node --version
git rev-parse HEAD
git -C ../mudler-parakeet.cpp rev-parse HEAD
```

Record the GPU model, NVIDIA driver, CUDA version reported by `nvidia-smi`,
Vulkan loader/driver version, OpenCL platform/device, CPU model, RAM, OS, and
compiler. Use the same machine, power mode, thread count, FLEURS manifest, and
native q8_0 model pair for every run.

## Prerequisites

Install through the host package manager:

- a C++17 compiler, CMake, and Node.js;
- NVIDIA's current proprietary driver;
- Vulkan headers, loader, and tools;
- OpenCL headers, ICD loader, and NVIDIA OpenCL ICD;
- Python 3.11 or 3.12 if model conversion is required;
- `curl` and `tar` for the FLEURS data fetcher.

Confirm that the GPU is visible before building:

```bash
nvidia-smi
vulkaninfo --summary
clinfo
```

## Checkout layout

The commands below assume sibling repositories:

```text
work/
  qvac-ext-lib-whisper.cpp/
  mudler-parakeet.cpp/
```

Checkout the QVAC comparison branch and initialize mudler's ggml submodule.
Review both checkouts before building.

```bash
git -C qvac-ext-lib-whisper.cpp switch tmp-parakeet-engine-comparison-v2
git -C mudler-parakeet.cpp submodule update --init --recursive
```

Run subsequent QVAC commands from `qvac-ext-lib-whisper.cpp`.

## Build the Vulkan CLIs

QVAC:

```bash
cmake -S engines/parakeet -B engines/parakeet/build-vulkan \
  -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_TESTS=OFF \
  -DPARAKEET_BUILD_EXAMPLES=OFF \
  -DGGML_VULKAN=ON \
  -DGGML_OPENCL=OFF
cmake --build engines/parakeet/build-vulkan --target parakeet-cli -j
```

Mudler:

```bash
cmake -S ../mudler-parakeet.cpp -B ../mudler-parakeet.cpp/build-vulkan \
  -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_GGML_VULKAN=ON
cmake --build ../mudler-parakeet.cpp/build-vulkan --target parakeet-cli -j
```

Expected executables:

```text
engines/parakeet/build-vulkan/parakeet
../mudler-parakeet.cpp/build-vulkan/examples/cli/parakeet-cli
```

If CMake places either executable elsewhere, pass its exact path through the
environment variables shown below.

## Build the QVAC OpenCL CLI

Use a separate build tree and disable Vulkan so runtime selection cannot choose
it instead of OpenCL:

```bash
cmake -S engines/parakeet -B engines/parakeet/build-opencl \
  -DCMAKE_BUILD_TYPE=Release \
  -DPARAKEET_BUILD_TESTS=OFF \
  -DPARAKEET_BUILD_EXAMPLES=OFF \
  -DGGML_OPENCL=ON \
  -DGGML_OPENCL_EMBED_KERNELS=ON \
  -DGGML_VULKAN=OFF
cmake --build engines/parakeet/build-opencl --target parakeet-cli -j
```

Expected executable:

```text
engines/parakeet/build-opencl/parakeet
```

## Stage the native model pair

The two engines use incompatible GGUF schemas. Stage both files under:

```text
engines/parakeet/benchmarks/comparison/models/qvac/parakeet-tdt-0.6b-v3.q8_0.gguf
engines/parakeet/benchmarks/comparison/models/mudler/tdt-0.6b-v3-q8_0.gguf
```

Prefer copying the exact model pair used by the Darwin run and record SHA-256
checksums. If the QVAC model must be regenerated, use
`engines/parakeet/scripts/convert-nemo-to-gguf.py` and install
`sentencepiece` in addition to its other Python dependencies. The converter
must print `tokenizer pieces=8192`. A GGUF produced after a
`could not emit tokenizer pieces` warning is invalid for this comparison and
will yield empty transcripts.

Smoke-test one WAV before starting the corpus. The QVAC JSON and terminal output
must contain a non-empty transcript.

## Fetch the same FLEURS corpus

From the comparison directory:

```bash
cd engines/parakeet/benchmarks/comparison
node fetch-fleurs.js 12
```

This creates 300 utterances: 12 from each of the same 25 languages used by the
Darwin reports. Keep `out/fleurs/manifest.json` unchanged between backend runs.

## Run the matched Vulkan comparison

Validate discovery first:

```bash
PARAKEET_QVAC_CLI=../../build-vulkan/parakeet \
PARAKEET_MUDLER_CLI=../../../../../mudler-parakeet.cpp/build-vulkan/examples/cli/parakeet-cli \
PARAKEET_QVAC_BACKEND=Vulkan \
PARAKEET_MUDLER_BACKEND=Vulkan \
PARAKEET_MUDLER_DEVICE=Vulkan0 \
node run-comparison.js --dry-run --fleurs-only
```

Then force a fresh QVAC run:

```bash
PARAKEET_QVAC_CLI=../../build-vulkan/parakeet \
PARAKEET_MUDLER_CLI=../../../../../mudler-parakeet.cpp/build-vulkan/examples/cli/parakeet-cli \
PARAKEET_QVAC_BACKEND=Vulkan \
PARAKEET_MUDLER_BACKEND=Vulkan \
PARAKEET_MUDLER_DEVICE=Vulkan0 \
PARAKEET_FLEURS_FORCE_QVAC=1 \
node run-comparison.js --fleurs-only
```

The harness rejects a QVAC runtime backend other than Vulkan and rejects
mudler's logged CPU fallback. Do not set
`PARAKEET_ALLOW_BACKEND_MISMATCH` for this run.

Expected deliverables:

```text
out/fleurs-comparison-data-linux-x64-vulkan.json
out/fleurs-report-linux-x64-vulkan.md
```

The architecture component may differ from `x64`; use the generated filename.

## Run the optional OpenCL diagnostic

This intentionally compares QVAC OpenCL with mudler Vulkan. The mismatch flag
is required so the generated metadata records that it is not a matched backend
comparison:

```bash
PARAKEET_QVAC_CLI=../../build-opencl/parakeet \
PARAKEET_MUDLER_CLI=../../../../../mudler-parakeet.cpp/build-vulkan/examples/cli/parakeet-cli \
PARAKEET_QVAC_BACKEND=OpenCL \
PARAKEET_MUDLER_BACKEND=Vulkan \
PARAKEET_MUDLER_DEVICE=Vulkan0 \
PARAKEET_ALLOW_BACKEND_MISMATCH=1 \
PARAKEET_FLEURS_FORCE_QVAC=1 \
node run-comparison.js --dry-run --fleurs-only
```

If discovery succeeds, run the same command without `--dry-run`. The harness
must observe an OpenCL runtime label from QVAC; a CPU or Vulkan label is a
failed OpenCL run.

Expected diagnostic deliverables:

```text
out/fleurs-comparison-data-linux-x64-opencl.json
out/fleurs-report-linux-x64-opencl.md
```

Verify that the JSON contains:

```text
meta.backendMatch: false
meta.qvacBackend: OpenCL
meta.mudlerBackend: Vulkan
```

Always describe these files as `QVAC OpenCL vs mudler Vulkan`, never simply as
an OpenCL engine comparison.

## Validation and handoff

Run the report tests:

```bash
node fleurs-results.test.js
```

For each completed run, verify:

- 300 utterances and 25 languages are present;
- neither engine produced empty transcripts across the corpus;
- corpus WER is plausible and close between native model conversions;
- no log contains `falling back to CPU`;
- QVAC per-utterance backend labels match the requested backend;
- Vulkan JSON has `meta.backendMatch: true`;
- OpenCL diagnostic JSON has `meta.backendMatch: false`;
- model load and WAV read remain excluded from both reported timings.

Return the generated JSON and Markdown files, the environment record, both
repository commit hashes, model SHA-256 checksums, and complete command logs.
Do not commit model files, FLEURS audio, or per-utterance cache directories.
