# QVAC Parakeet and mudler/parakeet.cpp

Facts in this document were checked against the local trees on August 11, 2026:

- mudler `parakeet.cpp`: `1bfbebfaaf493866f49597cd3b7901959d395c60`,
  tagged `v0.5.0`;
- QVAC Parakeet engine: `engines/parakeet`, latest engine change
  `e9255b29815d6b73f0c0de95e98570e57de31831`.

This is an architecture comparison, not a benchmark result. Fresh measurements
belong in the gitignored `out/` directory. The QVAC addon/product layer is
outside the benchmark architecture.

## Common ground

Both projects are C++17 ggml inference implementations of NVIDIA FastConformer
ASR checkpoints. Both can run CTC, TDT, and EOU-family models and support CPU,
Metal, and Vulkan execution. The same checkpoint can be compared at the same
quantization level, but each implementation requires its own GGUF conversion:
their tensor names and metadata schemas are not interchangeable.

The direct benchmark boundary is:

```text
canonical 16 kHz mono WAV
  -> QVAC engines/parakeet/build*/parakeet
  -> mudler build*/parakeet-cli
```

No JavaScript binding, Bare runtime, addon, model registry client, or product
package is in either measured path.

## Architectural shape

| Axis | QVAC `engines/parakeet` | mudler `parakeet.cpp` v0.5.0 |
|---|---|---|
| Primary abstraction | Stateful `parakeet::Engine` with pimpl and session APIs | `pk::Model`, free-function helpers, and a flat C ABI |
| Organization | Model-family implementations for CTC, TDT, EOU, and Sortformer around shared encoder/front-end code | Neural-network components assembled through graph builders and decoder selection |
| GGML | QVAC speech fork, with shared speech-library naming and deployment-oriented backend loading | Vendored upstream ggml submodule |
| CLI benchmark | `--bench` JSON with load, WAV read, mel, encoder, decoder, and inference samples | `bench` JSON with load-once and per-file `transcribe_pcm` timing |
| Product intent | Installable QVAC speech engine, mobile/desktop deployment, streaming and diarization | Standalone CLI/shared library/server and LocalAI integration |
| GPU breadth | Metal, Vulkan, OpenCL; optional Core ML encoder on Apple | Metal, Vulkan, CUDA, HIP |

## QVAC changes present in the August 2026 tree

- **Engine repository layout.** Parakeet moved into
  `engines/parakeet` as part of the speech-engine layout. It is no longer
  developed under a monorepo addon package directory.
- **Installable namespace.** CMake package artifacts use the
  `qvac-parakeet` namespace and expose `qvac::parakeet`; public C++ symbols use
  the `parakeet` namespace.
- **Core ML sidecar.** `PARAKEET_COREML` enables an Apple-only compiled
  `.mlmodelc` encoder sidecar. The FastConformer encoder can use the Neural
  Engine while the rest of the pipeline remains in the native engine, with
  fallback to ggml when the sidecar is unavailable.
- **Long-form transcription.** The engine has windowed long-form execution in
  `long_form.h`, including tests for normal and Windows behavior. This is part
  of the CLI/engine path, not an addon workaround.
- **IndicConformer language masking.** The latest engine commit adds
  multilingual CTC token-range masking. IndicConformer GGUF metadata advertises
  language token ranges and callers select a language with `--language` or
  `EngineOptions::language`.
- **Streaming and diarization.** QVAC retains cache-aware EOU streaming,
  Sortformer offline/streaming diarization, AOSC speaker continuity, attributed
  transcription, and energy-VAD signals.
- **Product consumption.** The monorepo `asr-ggml` product package consumes the
  engine output. That consumer relationship is relevant to product packaging,
  but `asr-ggml` is deliberately outside this benchmark's build, setup, and
  measured execution path.

The current QVAC CLI emits the runtime-selected backend in benchmark JSON. The
harness checks that value against the declared QVAC backend for GPU runs.

## Mudler changes present in v0.5.0

- **C ABI v6.** The flat ABI now includes
  `parakeet_capi_transcribe_pcm_logits`, exposing the CTC log-probability matrix
  plus dimensions and a corresponding free function. Earlier ABI additions
  preserved streaming events and EOU/EOB distinctions.
- **TDT N-best.** Offline TDT decoding has opt-in beam search and ranked N-best
  JSON, while greedy decoding remains the normal benchmark path.
- **Timestamps and confidence.** Model, CLI, batch, and C-API paths expose
  token/word timing and confidence data.
- **Server surface.** The repository builds `parakeet-server`, an
  OpenAI-compatible transcription server, and publishes server/container
  artifacts alongside the CLI.
- **Raspberry Pi 5 and arm64.** The tree contains Pi 5 cross-compilation and
  measured CPU results. Release work also adds Linux arm64 Vulkan bundles;
  this is broader than the older CPU-only arm64 release matrix.
- **GPU and release breadth.** Mudler retains CUDA, HIP, Metal, and Vulkan
  options, with CUDA 12/13-oriented release/container variants in addition to
  CPU packages.
- **Model/decode breadth.** Mudler supports CTC, RNNT, TDT, hybrid TDT-CTC,
  realtime EOU, and prompt-conditioned Nemotron streaming models, plus batched
  transcription and decode microbenchmarks.

Mudler's `bench` command performs one fixed untimed warmup after loading the
model, loads each WAV outside its processing timer, and times
`Model::transcribe_pcm`. The comparison harness therefore fixes QVAC to one
warmup too.

## Backend fairness

CPU rows force mudler's `PARAKEET_DEVICE=cpu` and pass
`--n-gpu-layers 0` to QVAC. GPU rows default to Metal on macOS and Vulkan
elsewhere. Mudler receives an explicit device selector (`MTL0` or `Vulkan0`);
QVAC receives `--n-gpu-layers 1` and reports the backend it actually selected.

The harness blocks different declared GPU backend labels by default. An
intentional override must set `PARAKEET_ALLOW_BACKEND_MISMATCH=1`, and generated
rows are labelled as a backend mismatch. Such a result measures both engine and
backend differences and is not an apples-to-apples engine result.

## Scope exclusions

The comparison does not measure Sortformer, Core ML versus ggml, server
overhead, C-API/FFI overhead, streaming latency, batching, or addon/product
integration. Those surfaces differ substantially and need dedicated
methodologies. This harness measures only matched offline engine inference.
