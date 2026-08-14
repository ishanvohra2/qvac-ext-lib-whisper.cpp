# Parakeet engine comparison: iPhone 16

Direct comparison of the QVAC Parakeet C++ engine and
`mudler/parakeet.cpp` on a physical iPhone 16. Two signed carrier apps embed
the engines independently; no addon, Bare runtime, SDK, or language binding is
in the measured path.

## 1. Verdict

1. Accuracy is equivalent on CPU and Metal.
2. The raw CPU aggregate favours mudler, but QVAC RTF rises substantially
   through the language-ordered run, so accumulated heat prevents a CPU winner
   from being established.
3. QVAC is 1.19x faster by raw mean Metal RTF. The known warmup asymmetry and
   sequential engine order make that result provisional.
4. Both backends completed the same 300-utterance, 25-language FLEURS corpus
   with matching runtime backends.

## 2. Run matrix

| Run | Backend match | Status | Raw data |
|---|---|---|---|
| CPU vs CPU | Yes | Completed, 300 utterances | [`fleurs-cpu.json`](fleurs-cpu.json) |
| Metal vs Metal | Yes | Completed, 300 utterances | [`fleurs-metal.json`](fleurs-metal.json) |

Both runs used TDT 0.6B v3, engine-specific q8_0 GGUFs, four threads, one
warmup, and one timed inference per utterance.

## 3. Results

| Backend | Engine | Corpus WER | Mean RTF | Median RTF |
|---|---|---:|---:|---:|
| CPU | QVAC | 10.74% | 0.2046 | 0.2282 |
| CPU | mudler | 10.69% | 0.1862 | 0.1852 |
| Metal | QVAC | 10.76% | 0.0335 | 0.0330 |
| Metal | mudler | 10.71% | 0.0395 | 0.0394 |

Accuracy differs by 0.05 percentage points on both backends and is not
practically significant. The raw Metal mean ratio favours QVAC by 1.19x.

## 4. Platform constraints

- Metal is the only matched iOS GPU backend tested.
- iOS requires signed carrier apps; direct CLI execution is unavailable.
- Model loading, app launch, `devicectl`, file transfer, and WAV loading are
  outside the reported engine timings.
- The run does not measure Core ML, streaming, batching, diarization, addon
  overhead, or application energy use.

## 5. Methodology and deviations

QVAC launches once per utterance and warms that exact clip before timing it.
Mudler launches once for the corpus, warms only its first item, and times every
later item on first encounter. This systematically favours QVAC, especially on
Metal.

The manifest is language-ordered. QVAC CPU mean RTF rises from roughly 0.13 in
early languages to roughly 0.24 in later languages, consistent with thermal or
power-state drift. Mudler runs after all QVAC utterances, so engine order is
also confounded with device temperature. CPU and Metal were separated by a
cooldown, but neither run alternated engines per utterance.

## 6. Findings

| ID | Finding | Severity |
|---|---|---|
| I1 | CPU and Metal accuracy are equivalent between engines | Result |
| I2 | Raw Metal RTF favours QVAC by 1.19x | Result |
| I3 | Per-clip versus corpus warmup prevents a definitive GPU winner | High |
| I4 | CPU timing shows substantial within-run thermal drift | High |
| I5 | Signed app carriers execute both engines directly on physical iOS | Result |

## 7. Follow-up

1. Add alternating or counterbalanced engine order.
2. Give both engines equivalent per-clip warmup and process lifetime.
3. Record thermal state, battery state, and power source during each sample.
4. Rerun CPU and Metal after those controls before making speed claims.

## 8. Verification

- Both JSON files contain 300 utterances across 25 languages.
- CPU metadata declares CPU for both engines.
- Metal metadata declares matching Metal backends.
- QVAC runtime labels are `ggml-cpu` and `ggml-mtl0` as requested.
- Both restored GGUF files match the checksums used by the earlier platform
  comparisons.
- On-device smoke transcripts were non-empty and matched between engines.

## 9. Environment

| Item | Value |
|---|---|
| Device | iPhone 16 (`iPhone17,3`, Apple A18) |
| OS | iOS 26.6 |
| Host tooling | Xcode 26.0.1, `devicectl` |
| Quantization | q8_0 |
| Threads | 4 |
| Corpus | FLEURS, 300 utterances, 25 languages |
| QVAC SHA-256 | `7c1af03eb436e7a2f6a2449f90a5de103d748d125eb9ac90e218ebf1c0707ed6` |
| mudler SHA-256 | `4d69a4a6683f4f2d952bad794c1357ca6eb628027695b4699c5a9ad4cd07d757` |

## 10. Artifacts

```text
reports/ios-iphone16/
  verification-report.md
  fleurs-cpu.md
  fleurs-cpu.json
  fleurs-metal.md
  fleurs-metal.json
```

The JSON files contain per-utterance references, transcripts, timings, WER,
RTF, backend metadata, and physical-device identification.
