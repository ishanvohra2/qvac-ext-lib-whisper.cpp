# Parakeet engine comparison: Android Adreno 740

Verification of the Parakeet direct engine comparison
([`tmp-parakeet-engine-comparison-v2`](https://github.com/ishanvohra2/qvac-ext-lib-whisper.cpp/tree/tmp-parakeet-engine-comparison-v2),
`engines/parakeet/benchmarks/comparison`) on a **vivo I2212 — Snapdragon 8 Gen 2
(SM8550), Adreno 740, Android 16**. The measured path contains only the two
engine CLIs — no addon, Bare, SDK, or `packages/asr-ggml`.

Companion to the reports under `reports/nvidia-rtx3080`,
`reports/mac-arm64`, and `reports/amd-strix`.

## 1. Verdict

**The setup does not reproduce on Android as written — because it was never
written for Android.** The committed `instructions.md` is an *NVIDIA* hand-off,
and the harness can only spawn local processes. Both gaps are bridgeable, and a
**valid matched CPU-vs-CPU comparison over the full 300-utterance corpus was
produced**, plus a GPU datapoint. Five things deserve the team's attention:

1. **A standalone Android build ships backend libraries its own loader cannot
   find** — and fails *silently*. Root-caused to one line of CMake (A2). This is
   the most important finding of the round.
2. **Vulkan cannot run either engine on this Adreno 740.** Both crash during
   compute-pipeline creation. Reproduced across two ggml versions, two shader
   compilers and three runtime toggles (A3) — so the matched Vulkan-vs-Vulkan run
   that `instructions.md` treats as *the* comparison is **impossible here**, and
   so is the `QVAC OpenCL vs mudler Vulkan` diagnostic.
3. **On CPU, QVAC is ~2.6x faster than mudler** — the exact inverse of the NVIDIA
   result, where mudler was 1.79x faster. Accuracy remains a tie.
4. **QVAC's own OpenCL path is 2.23x slower than its own CPU path** on this
   device, yet the tier policy prefers OpenCL on Adreno 700+ — so the default GPU
   selection makes Parakeet slower than CPU here.
5. **Accuracy is a tie and is stable across every platform measured**: every
   engine/platform/backend combination lands within 0.17 pp of the others.

---

## 2. Run matrix

| # | Run | Status |
|---|---|---|
| 1 | **CPU vs CPU** — matched, ISA-matched builds | Completed, 300 utterances |
| 2 | **QVAC OpenCL vs mudler CPU** — labelled mismatch diagnostic | Completed, 300 utterances |
| 3 | **Vulkan vs Vulkan** — the matched run `instructions.md` specifies | **Impossible on Adreno 740** (§4) |
| 4 | **QVAC OpenCL vs mudler Vulkan** — the documented diagnostic | **Impossible** (mudler's only Android GPU backend is Vulkan) |

FLEURS, 300 utterances, 25 languages, 3220.5 s of audio, `q8_0`, 4 threads,
1 warmup + 1 timed run per utterance — the same corpus size and totals as the
NVIDIA and Metal rounds. The manifest was frozen and reused byte-for-byte.

---

## 3. Results

| Run | Engine / backend | Corpus WER | Mean RTF | Median RTF |
|---|---|---:|---:|---:|
| **1. matched CPU** | QVAC CPU | 10.72% | 0.1094 | 0.1066 |
| **1. matched CPU** | mudler CPU | 10.82% | 0.2827 | 0.2790 |
| **2. mismatch diagnostic** | QVAC **OpenCL** | 10.79% | 0.2416 | 0.2372 |
| **2. mismatch diagnostic** | mudler CPU | 10.82% | 0.2882 | 0.2605 |

Run 2 is labelled `OpenCL vs CPU (override mismatch)` by the harness
(`meta.backendMatch: false`, `qvacBackend: OpenCL`, `mudlerBackend: CPU`) and
must never be ranked beside run 1. It exists because no matched GPU comparison is
possible on this device (§4) — mudler has no OpenCL build option and its Vulkan
path crashes.

**QVAC's fastest configuration on this device is CPU, not GPU.** Its OpenCL path
is **2.23x slower** than its own CPU path (median RTF 0.2372 vs 0.1066), while
producing effectively the same accuracy (10.79% vs 10.72%). That is worth the
team's attention because the tier policy in `parakeet_ctc.cpp` deliberately
*prefers* OpenCL on Adreno 700+, so the default GPU selection makes Parakeet
slower here than simply staying on CPU.

**Measurement precision.** mudler's CPU configuration was measured twice, once in
each run: median RTF 0.2790 and 0.2605, a **7.1% run-to-run spread**. Treat that
as the noise floor for every speed statement below. WER was identical to the
digit across both runs (10.82%), as expected for greedy decoding.

### Accuracy — a tie, and stable across every platform tested

0.10 pp apart on CPU, with 0 empty transcripts from either engine across all 600
transcriptions. Across the 25 languages **QVAC is better in 6, mudler is better
in 6, and 13 are exact ties** — there is no systematic accuracy advantage either
way. The largest single-language gaps are Lithuanian (16.99% vs 18.93%) and
Hungarian (13.36% vs 14.98%), both favouring QVAC, against Slovak (3.57% vs
2.38%) favouring mudler.

The same models land within 0.17 pp on every platform measured to date:

| Platform / backend | QVAC WER | mudler WER |
|---|---:|---:|
| macOS Metal (`darwin-arm64`, committed) | 10.76% | 10.69% |
| Linux Vulkan (RTX 3080, previous round) | 10.79% | 10.76% |
| Linux CPU (RTX 3080, previous round) | 10.77% | 10.65% |
| **Android CPU (Adreno 740, this round)** | **10.72%** | **10.82%** |
| **Android OpenCL (QVAC only, this round)** | **10.79%** | n/a |

Two things follow. That cross-platform agreement independently validates the
locally converted QVAC GGUF — which came out **byte-identical** to the one
produced on Arch/x86_64 in the NVIDIA round (A9). And QVAC's OpenCL backend
agreeing with its own CPU backend to 0.07 pp is a useful numerical-correctness
check on the Adreno OpenCL kernels: they are slow here (§3), but they are right.

### Speed on CPU — QVAC wins, inverting the NVIDIA result

QVAC is **~2.6x faster** on CPU: 2.62x by ratio of median RTFs (0.2790 /
0.1066), 2.56x by median of the 300 per-utterance ratios. Per language the ratio
spans 2.15x-3.63x — QVAC is faster in **every one of the 25 languages**. The gap
is far larger than any measurement artefact identified, and it survives two
asymmetries that both point the *other* way (see below).

The one real confound is thermal, and it was measured rather than assumed. QVAC's
RTF is flat across the run while mudler's degrades:

| Run position | QVAC median RTF | mudler median RTF | ratio |
|---|---:|---:|---:|
| utterances 0-59 | 0.1054 | 0.2645 | 2.42x |
| utterances 60-119 | 0.1064 | 0.2731 | 2.50x |
| utterances 120-179 | 0.1074 | 0.2805 | 2.48x |
| utterances 180-239 | 0.1069 | 0.2880 | 2.63x |
| utterances 240-299 | 0.1067 | 0.2905 | 2.71x |

QVAC drifts +1.2% end-to-end; mudler drifts **+9.8%**. The cause is structural,
not engine quality: the harness gives QVAC one process per utterance, so model
load and adb round-trips leave cooling gaps, while mudler runs a single process
at full duty cycle. Measured peaks: `cpuss-0` **62.6 C** during QVAC's phase
against **73.3 C** (and `cpuss-2` 75.3 C) during mudler's (A12).

> **So the honest CPU number is 2.4x-2.7x, best estimated at 2.42x** from the
> coolest block where both engines are least throttled. Using mudler's faster of
> its two measured runs (0.2605) gives 2.44x. The direction is not in doubt; the
> exact multiple is thermally sensitive.

**The NVIDIA F8 warmup asymmetry was re-measured here and does not threaten this
result.** QVAC's timed pass repeats the clip it just warmed on, while mudler
meets each clip once, so QVAC's number could be optimistic. Measured directly
across 8 clips, QVAC's cold-vs-warm ratio is **1.06x on CPU** (range 0.98-1.17x)
and **1.10x on OpenCL** (range 1.06-1.14x) — well below the NVIDIA round's 1.35x,
and an order of magnitude smaller than the 2.6x gap being measured. Applying the
full correction still leaves QVAC ~2.3x faster
(`artifacts/warmup-asymmetry-probe.txt`).

Two further asymmetries both favour **mudler**, making the QVAC win conservative:

- **tinyBLAS**: `GGML_LLAMAFILE` is ON for mudler and OFF for QVAC (A13).
- **ISA parity was given to mudler deliberately.** Its default Android build
  produces a bare `armv8-a` CPU backend — every ARM ISA probe fails
  (`HAVE_DOTPROD`, `HAVE_MATMUL_INT8`, `HAVE_FP16_VECTOR_ARITHMETIC`) — while
  QVAC builds seven variants and runtime-selects `armv8.6+dotprod+fp16+i8mm`.
  Benchmarking that default would have blamed the engine for a build
  handicap, so mudler was rebuilt with
  `-DGGML_CPU_ARM_ARCH=armv8.6-a+dotprod+fp16+i8mm` (worth 1.19x: RTF 0.3074 →
  0.2586 on a fixed clip). **All CPU numbers above use the ISA-matched build**
  (A5).

This inverts the NVIDIA finding, where mudler was 1.79x *faster* on CPU. With ISA
and repack matched and tinyBLAS favouring mudler, the remaining explanation is
engine-level ARM CPU code and/or the ggml version gap (QVAC 0.10.2 vs mudler
0.13.0) — the same open question the NVIDIA report left, now pointing the other
way on ARM.

---

## 4. Platform constraints

`instructions.md` treats Vulkan-vs-Vulkan as the valid matched comparison, and on
Android it is the only backend the two engines share. **Neither engine survives
pipeline creation on the Adreno 740.**

```
QVAC   : Compute pipeline creation failed for mul_mat_vec_q8_0_f32_f32
mudler : Compute pipeline creation failed for quantize_q8_1_x4
both   : vk::Device::createComputePipeline: ErrorUnknown  ->  Segmentation fault
```

This was **not** accepted at face value. It reproduces across:

- **two independent ggml versions** — QVAC 0.10.2 (`qvac-ext-ggml@speech`) and
  mudler 0.13.0 (`ggml-org/ggml`), which are separate checkouts with different
  shader sources;
- **two independent shader compilers** — Homebrew `shaderc` 2026.2 and the
  **NDK's own `glslc`**. A full QVAC Vulkan tree was rebuilt with the NDK
  compiler purely as a control; the failure and the failing pipeline were
  identical. So this is not a toolchain artefact;
- **three documented runtime toggles** — `GGML_VK_DISABLE_INTEGER_DOT_PRODUCT=1`,
  `GGML_VK_DISABLE_MMVQ=1`, `GGML_VK_DISABLE_F16=1`. Note the failing pipeline
  `mul_mat_vec_q8_0_f32_f32` is already the non-MMVQ variant.

The common factor is the Adreno 740 Vulkan driver. This is consistent with the
stack's own design: `ggml-backend-reg.cpp:737` carries the comment *"so GPU work
can route to OpenCL on Adreno (Vulkan crashes in vkCmdBindPipeline there)"*, and
the parakeet tier policy deliberately prefers OpenCL on Adreno 700+.

**Consequence.** Because mudler exposes no OpenCL build option, there is **no
matched GPU comparison available on this device at all**, and the documented
`QVAC OpenCL vs mudler Vulkan` diagnostic is equally unavailable. Reported as a
result, per `instructions.md`'s own instruction to treat failure to initialize as
a result rather than route around it. The substitute run — QVAC on its supported
OpenCL path against mudler's best available (CPU) — is in §3/§5 and is labelled
as a backend mismatch throughout.

---

## 5. Methodology and deviations

Every deviation, with its reason. **No source file of either engine was
modified.** `run-comparison.js` and every other harness file remain
byte-identical.

| Deviation | Reason |
|---|---|
| Two **adb wrapper scripts** stand in as `PARAKEET_QVAC_CLI` / `PARAKEET_MUDLER_CLI` | The harness only spawns local processes (`spawnSync`); the binaries must run on the phone. The wrappers map host paths to their staged device copies, run the binary over `adb shell`, and pull results back. Verified sound: `adb shell` propagates exit codes, so the harness's failure and per-utterance backend guards still fire (A11). |
| `bash scripts/setup-ggml.sh` instead of `./scripts/setup-ggml.sh` | The script is still committed non-executable (A1) — same as the NVIDIA round. |
| `-DGGML_LIB_OUTPUT_PREFIX=qvac-speech-` on the QVAC build | Without it the emitted libraries cannot be found by their own loader and **no backend loads at all** (A2). This is a workaround for a defect, not a tuning choice. |
| `PARAKEET_COMPARE_OUT_DIR=out-android` | The harness names outputs by **host** platform, so an Android run from a Mac writes `darwin-arm64` files and overwrites the committed Darwin baseline — which it did, before I restored it (A4). |
| Five extra cmake flags on the mudler build | Its CMake has zero Android support: `GGML_NATIVE=OFF`, Vulkan C++ headers (the NDK ships only C headers), `SPIRV-Headers_DIR` + `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH`, a SPIRV include path, `PARAKEET_BUILD_SERVER=OFF`. No source edits (A6). |
| `-DGGML_CPU_ARM_ARCH=armv8.6-a+dotprod+fp16+i8mm` on mudler | Fairness. Its default Android build loses every ARM ISA extension while QVAC runtime-selects an i8mm variant (A5). The default build is retained as the A/B control. |
| `GGML_OPENCL_CACHE_DIR` set for the OpenCL run | QVAC spawns one process per utterance, so each would recompile OpenCL kernels: 29 s vs 7 s wall per utterance. Set as a plain environment variable — **no CLI arguments injected**. Verified not to affect the measurement: RTF 0.177 uncached vs 0.176/0.178/0.180 cached, because kernel compilation happens at backend init, outside `inference_ms` (A8). |

Scope choices agreed in advance: the run matrix was reduced to what the hardware
permits (§4), and no CUDA/Metal runs apply here.

---

## 6. Findings

Full ledger with tests and verdicts in `FINDINGS.md`.

| ID | Finding | Severity |
|---|---|---|
| A2 | Standalone Android build emits backend libs the loader cannot find — silently | **High** |
| A3 | Vulkan crashes both engines on Adreno 740 | **High** |
| A10 | QVAC's OpenCL path is 2.23x slower than its own CPU path, yet is preferred by the tier policy | **High** |
| A12 | Harness process model creates a thermal asymmetry favouring QVAC | **High** |
| A5 | mudler's Android CPU build silently loses all ARM ISA extensions | Medium |
| A4 | Harness labels output by host platform; overwrites committed baselines | Medium |
| A11 | Harness has no remote-device path at all | Medium |
| A1 | `setup-ggml.sh` committed non-executable (NVIDIA F1 reproduces) | Low |
| A6 | mudler needs five undocumented flags to cross-compile (but does build) | Docs |
| A7 | OpenCL only loads when the Vulkan plugin is deployed beside it | Docs |
| A8 | OpenCL kernel cache is worth 4x wall-clock, 0 effect on RTF | Docs |
| A9 | QVAC GGUF conversion is byte-reproducible across hosts (corrects NVIDIA F3) | Docs |
| A13 | tinyBLAS enabled for mudler, disabled for QVAC | Context |

**A2 in brief**, because it is the one to act on: `ggml/CMakeLists.txt:338`
attaches `GGML_BACKEND_DL_PROJECT_PREFIX` to target **`ggml-base`**, but
`ggml/src/CMakeLists.txt:231` compiles `ggml-backend-reg.cpp` — the only consumer
of that define — into target **`ggml`**. So `engines/parakeet`'s
`GGML_LIB_OUTPUT_PREFIX=speech-` renames the libraries but not the searcher,
which keeps looking for its hardcoded `libqvac-speech-ggml-*`. Confirmed three
ways: the CMake source, the literal `libqvac-speech-ggml-` found inside the
shipped `libspeech-ggml.so`, and the runtime failure. It escapes CI because the
Android lane is a **CPU-only static compile smoke that never runs on a device**,
and the loader is **silent under `NDEBUG`**. Fix: attach the define to `ggml`
(or both targets).

---

## 7. Follow-up

1. **Fix A2.** One CMake line. Until then, no one can build `engines/parakeet`
   standalone for Android from the in-tree defaults and get a working backend.
2. **Revisit the Adreno tier policy for Parakeet.** On this device OpenCL is
   2.23x *slower* than CPU (A10), yet `init_gpu_backend` prefers it on any
   Adreno 700+. Either the policy needs a per-model or measured override, or
   Parakeet on Adreno should stay on CPU. Worth confirming on Adreno 8xx before
   generalising — but on an 8 Gen 2 the current default costs performance.
3. **Decide what the Android hand-off should say.** There is no Android
   `instructions.md`; §4 and §5 of this report are effectively its first draft.
   It must state that Vulkan is not viable on Adreno and that OpenCL requires the
   Vulkan plugin deployed alongside it (A7).
4. **Give the harness a target label and a device transport.** `PARAKEET_TARGET_LABEL`
   would fix the filename collision (A4); the two wrapper scripts here are a
   working reference for the transport (A11).
5. **Neutralise the thermal asymmetry before quoting any Android speed number**
   (A12) — e.g. a fixed inter-utterance delay for both engines, or interleaving
   the engines instead of running 300 of each back to back.
6. **Investigate the CPU inversion.** QVAC is 2.6x faster on ARM; mudler was
   1.79x faster on x86. ISA, repack and thread count are matched and tinyBLAS
   favours mudler, so the cause is engine-level ARM code or the ggml version gap.
7. Publish the QVAC q8_0 GGUF or its checksum — now known to be byte-reproducible
   across hosts (A9), so a published checksum would be a real check.
8. Fix the script modes (A1).

---

## 8. Verification

Every item from `instructions.md` "Validation and handoff", for the matched CPU
run:

| Check | Result |
|---|---|
| 300 utterances and 25 languages present | Pass — 300 / 25, 3220.5 s |
| Neither engine produced empty transcripts | Pass — 0 empty of 600 transcriptions |
| Corpus WER plausible and close between conversions | Pass — 0.10 pp apart |
| No log contains `falling back to CPU` | Pass — grep control-validated † |
| QVAC per-utterance backend labels match the request | Pass — all 300 report `ggml-cpu` (CPU run) / `ggml-opencl` (GPU run) |
| JSON has correct `meta.backendMatch` | Pass — `true` for CPU vs CPU, `false` for the labelled OpenCL-vs-CPU diagnostic |
| Model load and WAV read excluded from timings | Pass — `load_ms` and `wav_read_ms` are separate fields |
| `node fleurs-results.test.js` | Pass — *FLEURS aggregation and report tests passed* |

† The negative was control-validated rather than assumed: the same grep finds a
known-present string in the real logs, and finds the exact guard phrase in a
synthetic file, yet finds nothing in either run log.

---

## 9. Environment

| Item | Value |
|---|---|
| Device | vivo I2212, Android 16 (SDK 36), build `BP2A.250605.031.A3` |
| SoC / GPU | Qualcomm SM8550 (kalama) — **Adreno 740** |
| CPU / RAM | 8 cores / 15.6 GiB |
| GPU stack | `vulkan.adreno.so` (Vulkan 1.3.275 loader), `/vendor/lib64/libOpenCL.so`, OpenCL 3.0 QUALCOMM build `0676.76.1` |
| Build host | macOS 26.6.1, Apple M5, 16 GiB |
| Toolchain | NDK 29.0.14206865, cmake 4.3.2, node v20.20.2, python 3.14.6, glslc (shaderc) 2026.2 |
| Target | `arm64-v8a`, `android-29`, `c++_shared` |

| Component | Commit / checksum |
|---|---|
| QVAC repo | `7135213767538ea49062707d88241edaf4c99094` (`tmp-parakeet-engine-comparison-v2`) |
| QVAC ggml | `tetherto/qvac-ext-ggml@speech` `576c9735326a50ef1f2d54263ba4dac0d384d73d` |
| mudler repo | `1bfbebfaaf493866f49597cd3b7901959d395c60` (`v0.5.0`) |
| mudler ggml | `ggml-org/ggml` `e705c5fed490514458bdd2eaddc43bd098fcce9b` + 4 in-tree patches |
| QVAC GGUF (converted here) | `7c1af03eb436e7a2f6a2449f90a5de103d748d125eb9ac90e218ebf1c0707ed6` |
| mudler GGUF (downloaded) | `4d69a4a6683f4f2d952bad794c1357ca6eb628027695b4699c5a9ad4cd07d757` |
| Source `.nemo` | `3cbdc85877e668ca7b82d0d56770eb1fac76691f55d6b97545e8d61ca588d10d` |

All three model checksums are **identical to the NVIDIA round**.

---

## 10. Artifacts

```
artifacts/
  environment.txt                  host + device environment capture
  versions.txt                     commits, patches, model SHA-256s, CPU variants
  run-cpu-vs-cpu.log               matched CPU run, with thermals before/after
  run-opencl-vs-cpu.log            OpenCL diagnostic run
  thermal-trace.log                sysfs thermal trace, QVAC phase
  thermal-trace-mudler.log         sysfs thermal trace, mudler phase
  thermal-trace-opencl.log         sysfs thermal trace, OpenCL run
  vulkan-failure.log               both engines failing pipeline creation, all controls
  warmup-asymmetry-probe.txt       cold-vs-warm ratio per clip, CPU and OpenCL
  fleurs-report-android-cpu.md     per-language CPU tables
  fleurs-comparison-data-android-cpu.json
  fleurs-report-android-opencl.md  per-language OpenCL-vs-CPU tables
  fleurs-comparison-data-android-opencl.json
tools/
  adb-qvac.py, adb-mudler.py, adb_common.py   the device transport (the §5 deviation)
  run-android.sh                              run driver with thermal capture
  warmup-probe.sh, capture-vulkan-failure.sh  the two probes
FINDINGS.md                        ledger: each finding's test, result and verdict
```

The generated result files are renamed `android-*` here; the harness itself wrote
them as `darwin-arm64-*`, and their internal `meta.platform` still reads
`darwin-arm64` — that is the **host**, not the device under test (A4).

---

## Appendix A. System information

```
Device     vivo I2212, Android 16 (SDK 36), build BP2A.250605.031.A3, arm64-v8a
SoC        Qualcomm SM8550 "kalama" (Snapdragon 8 Gen 2) | 8 cores | 15.6 GiB
GPU        Adreno 740 | uma:1 fp16:1 bf16:0 warp:64 shared-mem:32768 int-dot:1
Vulkan     /vendor/lib64/hw/vulkan.adreno.so, device API 1.3.275 - CRASHES (see 3)
OpenCL     OpenCL 3.0 QUALCOMM build 0676.76.1, compiler E031.41.03.64 - the working GPU path
Host       macOS 26.6.1, Apple M5, 16 GiB; adb 1.0.41
Toolchain  NDK 29.0.14206865, cmake 4.3.2, node v20.20.2, python 3.14.6, glslc 2026.2
Target     -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-29 -DANDROID_STL=c++_shared
Captured   2026-08-13; device on AC, 100%, cpuss-0 idle ~42 C before each run
```

Cross-compiling from macOS needs three things the NDK does not provide: Vulkan
**C++** headers (`vulkan/vulkan.hpp` — the NDK ships only the C headers),
SPIRV-Headers on the include path, and an OpenCL header set plus an arm64
`libOpenCL.so` to link against (the device's own `/vendor/lib64/libOpenCL.so`
works). Both engines otherwise build from source with **no compiler or source
patches** — only the cmake flags listed in §5. The device libraries to deploy
alongside each binary are `libc++_shared.so` and `libomp.so` from the NDK; both
engines' ggml links OpenMP.
