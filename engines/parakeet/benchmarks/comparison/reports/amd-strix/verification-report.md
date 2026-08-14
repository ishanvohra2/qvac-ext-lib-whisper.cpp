# Parakeet engine comparison: AMD Strix

Direct comparison of the QVAC Parakeet C++ CLI and
`mudler/parakeet.cpp` on an AMD Ryzen AI Max+ 395 with Radeon 8060S Graphics.
The measured path contains no addon, Bare runtime, SDK, language binding, or
`packages/asr-ggml`.

## 1. Verdict

1. Accuracy is equivalent on both CPU and Vulkan.
2. Mudler is 1.76x faster by median CPU RTF.
3. QVAC is 1.72x faster by raw median Vulkan RTF.
4. The Vulkan result is provisional because the known warmup asymmetry favours
   QVAC and was not measured on this device.

## 2. Run matrix

| Run | Backend match | Status | Raw data |
|---|---|---|---|
| CPU vs CPU | Yes | Completed, 300 utterances | [`fleurs-cpu.json`](fleurs-cpu.json) |
| Vulkan vs Vulkan | Yes | Completed, 300 utterances | [`fleurs-vulkan.json`](fleurs-vulkan.json) |

Both runs used TDT 0.6B v3, byte-matched native engine-specific q8_0 GGUFs,
four threads, one warmup, and one timed inference per utterance.

## 3. Results

| Backend | Engine | Corpus WER | Mean RTF | Median RTF |
|---|---|---:|---:|---:|
| CPU | QVAC | 10.77% | 0.0624 | 0.0624 |
| CPU | mudler | 10.65% | 0.0356 | 0.0354 |
| Vulkan | QVAC | 10.77% | 0.0058 | 0.0056 |
| Vulkan | mudler | 10.64% | 0.0101 | 0.0097 |

Accuracy differs by 0.12 percentage points on CPU and 0.13 percentage points
on Vulkan. These are practical ties and each engine is stable across backends.

Mudler's median CPU RTF is 1.76x lower. QVAC's raw median Vulkan RTF is 1.72x
lower. Relative to each engine's CPU baseline, Vulkan improves QVAC by 11.0x
and mudler by 3.64x.

## 4. Platform constraints

- The matched GPU comparison uses Mesa RADV Vulkan.
- The Vulkan loader also exposes llvmpipe, but the physical Radeon device is
  `Vulkan0`; all 300 QVAC GPU entries report `ggml-vulkan0`.
- OpenCL was not attempted because QVAC's OpenCL path targets Adreno devices.
- HIP/ROCm was outside scope.

## 5. Methodology and deviations

QVAC starts one process per utterance and warms the exact clip before timing it.
Mudler starts one process for the corpus, warms the first clip once, and then
times each manifest entry on first encounter. This systematically favours QVAC
on GPU. The cold-versus-warm factor was not measured on the Strix device, so the
1.72x Vulkan ratio must remain provisional.

Both reported RTFs exclude model loading and WAV reading. Corpus WER is total
word edits divided by total reference words. No source or harness deviations
were required.

## 6. Findings

| ID | Finding | Severity |
|---|---|---|
| S1 | CPU and Vulkan accuracy are equivalent between engines | Result |
| S2 | Mudler is 1.76x faster on the matched x86 CPU run | Result |
| S3 | QVAC is 1.72x faster in the raw Vulkan result | Provisional |
| S4 | Warmup asymmetry prevents a definitive Vulkan winner | High |
| S5 | QVAC selected the physical RADV device, not llvmpipe | Verified |

## 7. Follow-up

1. Neutralise the per-clip warmup asymmetry and rerun Vulkan.
2. Capture cold-versus-warm probes on RADV before quoting a GPU winner.
3. Investigate why the x86 CPU result agrees with NVIDIA but reverses the Mac
   and Android ARM ordering.

## 8. Verification

- 300 utterances and 25 languages are present in each JSON file.
- No empty transcripts were found.
- All 300 QVAC Vulkan entries report `ggml-vulkan0`.
- CPU and Vulkan metadata both declare matching backends.
- `node fleurs-results.test.js` passed on the run host.
- QVAC and mudler model SHA-256 values matched the NVIDIA reference pair.

## 9. Environment

| Item | Value |
|---|---|
| Host | `qvac-dev-strix-0`, Ubuntu, Linux 6.17.0-41-generic |
| CPU | AMD Ryzen AI Max+ 395, 16 cores / 32 threads |
| RAM | 121 GiB |
| GPU | Radeon 8060S Graphics, integrated |
| Vulkan | RADV GFX1151, Mesa 25.2.8, Vulkan 1.4.318 |
| Toolchain | CMake 3.31.6, Node.js 20.19.4 |
| Quantization / threads | q8_0 / 4 |
| QVAC commit | `7135213767538ea49062707d88241edaf4c99094` |
| Mudler commit | `1bfbebfaaf493866f49597cd3b7901959d395c60` |
| QVAC GGUF SHA-256 | `7c1af03eb436e7a2f6a2449f90a5de103d748d125eb9ac90e218ebf1c0707ed6` |
| Mudler GGUF SHA-256 | `4d69a4a6683f4f2d952bad794c1357ca6eb628027695b4699c5a9ad4cd07d757` |

## 10. Artifacts

```text
reports/amd-strix/
  verification-report.md
  fleurs-cpu.md
  fleurs-cpu.json
  fleurs-vulkan.md
  fleurs-vulkan.json
```

The JSON files contain per-utterance references, transcripts, timings, RTF,
WER, and runtime QVAC backend labels.
