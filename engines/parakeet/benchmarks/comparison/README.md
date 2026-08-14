# Parakeet direct engine comparison

This harness compares the QVAC Parakeet C++ CLI in this repository with the
external [`mudler/parakeet.cpp`](https://github.com/mudler/parakeet.cpp) CLI.
The measured path contains only the two engine executables. It does not use an
addon, Bare, a Node binding, `packages/asr-ggml`, or the obsolete
`packages/transcription-parakeet` package.

The comparison fixes the following inputs:

- the same NVIDIA source checkpoint family;
- each engine's native GGUF schema, because the schemas are incompatible;
- `q8_0` quantization;
- the same canonical 16 kHz mono WAV;
- the same thread count, one warmup, and the same timed run count;
- matching GPU backends by default: Metal versus Metal on macOS and Vulkan
  versus Vulkan elsewhere.

The QVAC CLI reports `inference_ms` (mel, encoder, and decoder), excluding model
load and WAV read. Mudler's `bench` loads the model once, reads each WAV before
starting `proc_ms`, and then times `transcribe_pcm`. The harness therefore
compares engine-only inference where each CLI supports it.

Generated data and reports are written to the gitignored `out/` directory.
Reviewed, committed results are normalized under
[`reports/`](reports/README.md) by target and backend.
Historical reports from June 18, 2026 remain on the obsolete monorepo ref
`origin/tmp-parakeet-comparison` under
`packages/transcription-parakeet/benchmarks/comparison/baseline/`; they are not
current baselines for this engine repository.

## Layout

```text
engines/parakeet/benchmarks/comparison/
  run-comparison.js
  fetch-fleurs.js
  fleurs-results.js
  fleurs-results.test.js
  architecture.md
  ios/                    # signed physical-device app carriers and host wrappers
  reports/                # committed platform reports and supplied raw data
    <target>/
      verification-report.md
      fleurs-<backend>.md
      fleurs-<backend>.json
  models/                 # gitignored
    qvac/                  # QVAC-schema q8_0 GGUFs
    mudler/                # mudler-schema q8_0 GGUFs
  out/                    # gitignored generated results and optional FLEURS data
```

The legacy `qvac-bench.js` addon driver is intentionally not present.
Physical iOS CPU/Metal runs use the separate signed app carriers documented in
[`ios/README.md`](ios/README.md). The physical iPhone 16 results are under
[`reports/ios-iphone16/`](reports/ios-iphone16/).

All platform verification reports use the same ten-section schema and the
`reports/<target>/verification-report.md` naming convention. Raw FLEURS files
are committed beside the verification report only when they were supplied with
the handoff; missing NVIDIA and Android artifacts are not reconstructed.

## Build the QVAC engine CLI

Run from the repository root. The engine's `scripts/setup-ggml.sh` fetches the
pinned ggml source; review and run that setup step separately if the checkout
does not already contain `engines/parakeet/ggml`.

```bash
cmake -S engines/parakeet -B engines/parakeet/build -DCMAKE_BUILD_TYPE=Release
cmake --build engines/parakeet/build --target parakeet-cli -j
```

For the GPU pass, enable the backend that will also be used by mudler:

```bash
# Apple Silicon / Metal
cmake -S engines/parakeet -B engines/parakeet/build-metal \
  -DCMAKE_BUILD_TYPE=Release -DGGML_METAL=ON \
  -DGGML_METAL_EMBED_LIBRARY=ON
cmake --build engines/parakeet/build-metal --target parakeet-cli -j

# Linux or Windows / Vulkan
cmake -S engines/parakeet -B engines/parakeet/build-vulkan \
  -DCMAKE_BUILD_TYPE=Release -DGGML_VULKAN=ON
cmake --build engines/parakeet/build-vulkan --target parakeet-cli -j
```

The harness probes these current CMake output shapes:

- `build/parakeet`, `build/bin/parakeet`, and `build/Release/parakeet`;
- equivalent paths under `build-metal`, `build-vulkan`, and `build-vk`;
- `build/src/parakeet`.

Set `PARAKEET_QVAC_CLI` when using another build tree.

## Build mudler/parakeet.cpp

By default the harness derives a `mudler-parakeet.cpp` checkout next to this
repository's directory. Override that location with `PARAKEET_MUDLER_DIR`, or
set the executable directly with `PARAKEET_MUDLER_CLI`.

After obtaining and reviewing the external source separately:

```bash
# Metal
cmake -S ../mudler-parakeet.cpp -B ../mudler-parakeet.cpp/build \
  -DPARAKEET_GGML_METAL=ON
cmake --build ../mudler-parakeet.cpp/build --target parakeet-cli -j

# Vulkan
cmake -S ../mudler-parakeet.cpp -B ../mudler-parakeet.cpp/build \
  -DPARAKEET_GGML_VULKAN=ON
cmake --build ../mudler-parakeet.cpp/build --target parakeet-cli -j
```

The normal mudler output is
`build/examples/cli/parakeet-cli`; common `bin`, root-build, and Visual Studio
Release output paths are also probed.

## Stage native q8_0 models

Create `models/qvac` and `models/mudler` beneath this comparison directory.
These directories are gitignored. No addon registry tooling is required.

Both sides must originate from the same checkpoints:

| Model | Source checkpoint | QVAC filename | Mudler filename |
|---|---|---|---|
| TDT | `nvidia/parakeet-tdt-0.6b-v3` | `parakeet-tdt-0.6b-v3.q8_0.gguf` | `tdt-0.6b-v3-q8_0.gguf` |
| CTC | `nvidia/parakeet-ctc-0.6b` | `parakeet-ctc-0.6b.q8_0.gguf` | `ctc-0.6b-q8_0.gguf` |
| EOU | `nvidia/parakeet_realtime_eou_120m-v1` | `parakeet-eou-120m-v1.q8_0.gguf` | `realtime_eou_120m-v1-q8_0.gguf` |

For QVAC, use the engine-local converter:

```bash
python engines/parakeet/scripts/convert-nemo-to-gguf.py \
  --ckpt path/to/parakeet-ctc-0.6b.nemo \
  --out engines/parakeet/benchmarks/comparison/models/qvac/parakeet-ctc-0.6b.q8_0.gguf \
  --quant q8_0
```

For mudler, use that repository's converter with `--dtype q8_0`, or download
the corresponding q8_0 files from `mudler/parakeet-cpp-gguf` and stage them
under `models/mudler` with the names above. Model downloads are data downloads;
this harness never fetches and executes remote code.

Alternative model directories may be selected with
`PARAKEET_QVAC_MODELS_DIR` and `PARAKEET_MUDLER_MODELS_DIR`.

## Validate discovery

These commands perform no model inference:

```bash
node engines/parakeet/benchmarks/comparison/run-comparison.js --help
node engines/parakeet/benchmarks/comparison/run-comparison.js --dry-run
node engines/parakeet/benchmarks/comparison/run-comparison.js --dry-run --fleurs-only
```

Dry-run prints every resolved binary, model, sample, and backend label, then
reports whether the configuration is ready.

## Run

```bash
node engines/parakeet/benchmarks/comparison/run-comparison.js
```

The default matrix runs CPU and GPU for TDT, CTC, and EOU with four threads,
one warmup, and five timed repetitions. Mudler's current `bench` command has
exactly one built-in warmup, so the harness intentionally fixes QVAC to one as
well.

Outputs:

- `out/comparison-data-<platform>-<arch>.json`: raw samples, transcripts,
  runtime QVAC backend labels, WER, and metadata;
- `out/report-<platform>-<arch>.md`: concise comparison table.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PARAKEET_QVAC_CLI` | probed under `engines/parakeet/build*` | QVAC engine executable |
| `PARAKEET_QVAC_MODELS_DIR` | `comparison/models/qvac` | QVAC-native GGUF directory |
| `PARAKEET_QVAC_BACKEND` | Metal on macOS, Vulkan elsewhere | Expected QVAC GPU backend |
| `PARAKEET_MUDLER_DIR` | derived sibling `mudler-parakeet.cpp` | External source/build root |
| `PARAKEET_MUDLER_CLI` | probed under the mudler build | Mudler executable |
| `PARAKEET_MUDLER_MODELS_DIR` | `comparison/models/mudler` | Mudler-native GGUF directory |
| `PARAKEET_MUDLER_BACKEND` | same platform default as QVAC | Expected mudler GPU backend |
| `PARAKEET_MUDLER_DEVICE` | `MTL0` or `Vulkan0` | Exact device name passed as `PARAKEET_DEVICE` |
| `PARAKEET_COMPARE_MODELS` | `tdt,ctc,eou` | Model subset |
| `PARAKEET_COMPARE_RUNS` | `5` | Timed runs per clip |
| `PARAKEET_COMPARE_THREADS` | `4` | Threads passed to both CLIs |
| `PARAKEET_COMPARE_GPU` | unset | `true` GPU only, `false` CPU only, unset both |
| `PARAKEET_COMPARE_OUT_DIR` | `comparison/out` | Generated output directory |
| `PARAKEET_FLEURS_GPU` | `true` | Set to `false` for a CPU-only FLEURS run |
| `PARAKEET_FLEURS_MANIFEST` | `out/fleurs/manifest.json` | Override the FLEURS manifest |
| `PARAKEET_FLEURS_ONLY` | unset | Set to `1` as an alias for `--fleurs-only` |
| `PARAKEET_FLEURS_FORCE_QVAC` | unset | Set to `1` to ignore cached QVAC utterance results |
| `PARAKEET_ALLOW_BACKEND_MISMATCH` | unset | Set to `1` to allow and label a mismatch |

Backward aliases `QVAC_PARAKEET_CLI`, `MUDLER_PARAKEET_DIR`, and
`MUDLER_PARAKEET_CLI` are accepted for migration from the obsolete harness.
New automation should use the `PARAKEET_*` names.

GPU results are blocked when the declared backend labels differ unless
`PARAKEET_ALLOW_BACKEND_MISMATCH=1` is set. An allowed mismatch is explicitly
marked in the report and must not be interpreted as a pure engine comparison.

## Run FLEURS

`fetch-fleurs.js` downloads dataset files and creates canonical 16 kHz mono
PCM16 WAVs plus references under `out/fleurs`. It does not execute downloaded
content. The default all-language download is approximately 4-5 GB.

From `engines/parakeet/benchmarks/comparison`, fetch 12 utterances for each of
the 25 supported languages (300 utterances total), then run the TDT-only engine
comparison:

```bash
node fetch-fleurs.js 12
node run-comparison.js --fleurs-only
```

FLEURS mode uses the matched GPU backend by default: Metal on macOS and Vulkan
elsewhere. Run both engines on CPU instead with:

```bash
PARAKEET_FLEURS_GPU=false node run-comparison.js --fleurs-only
```

Before inference, validate only the FLEURS manifest, its WAVs, both CLIs, and
the two native TDT q8_0 models:

```bash
node run-comparison.js --dry-run --fleurs-only
```

FLEURS output names include platform and backend:

- `out/fleurs-comparison-data-<platform>-<arch>-<backend>.json`;
- `out/fleurs-report-<platform>-<arch>-<backend>.md`.

The JSON contains every reference, transcript, processing time, RTF, and
per-utterance WER. Both files include all-language corpus WER, per-language
corpus WER, and mean/median per-utterance RTF for each engine. Corpus WER is
computed as total word edits divided by total reference words, rather than as
the average of utterance WERs.

QVAC's CLI accepts one WAV per process, so every utterance gets one untimed
warmup followed by one timed engine-only inference. This avoids recording each
fresh process's backend initialization in the timed sample. Mudler loads TDT
once, performs its built-in untimed warmup, and processes the same manifest
once. Both reported timings exclude model loading and WAV reading. Valid QVAC
per-utterance JSON is reused after an interrupted run when the model, WAV,
threads, GPU setting, and backend still match. Set
`PARAKEET_FLEURS_FORCE_QVAC=1` when a fresh QVAC run is required.

To fetch a smaller development subset:

```bash
FLEURS_LANGS=fr,es,hr \
  node fetch-fleurs.js 12
```
