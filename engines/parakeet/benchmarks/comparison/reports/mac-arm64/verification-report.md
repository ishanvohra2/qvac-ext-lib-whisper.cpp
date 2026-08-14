# Parakeet engine comparison: Mac arm64

Direct comparison of the QVAC Parakeet C++ CLI and
`mudler/parakeet.cpp` on an Apple M2. The measured path contains no addon,
Bare runtime, SDK, language binding, or `packages/asr-ggml`.

## 1. Verdict

1. Accuracy is equivalent on both CPU and Metal.
2. QVAC is 4.56x faster by median CPU RTF in this run.
3. QVAC is 1.17x faster by raw median Metal RTF, but the known warmup
   asymmetry is large enough that this run does not establish a GPU winner.
4. CPU and Metal both completed the same 300-utterance, 25-language FLEURS
   corpus with no backend mismatch.

## 2. Run matrix

| Run | Backend match | Status | Raw data |
|---|---|---|---|
| CPU vs CPU | Yes | Completed, 300 utterances | [`fleurs-cpu.json`](fleurs-cpu.json) |
| Metal vs Metal | Yes | Completed, 300 utterances | [`fleurs-metal.json`](fleurs-metal.json) |

Both runs used TDT 0.6B v3, native engine-specific q8_0 GGUFs, four threads,
one warmup, and one timed inference per utterance.

## 3. Results

| Backend | Engine | Corpus WER | Mean RTF | Median RTF |
|---|---|---:|---:|---:|
| CPU | QVAC | 10.82% | 0.0623 | 0.0522 |
| CPU | mudler | 10.67% | 0.2474 | 0.2381 |
| Metal | QVAC | 10.76% | 0.0350 | 0.0339 |
| Metal | mudler | 10.69% | 0.0400 | 0.0398 |

Accuracy differs by 0.15 percentage points on CPU and 0.07 percentage points
on Metal. Those differences are not practically significant.

The raw CPU ratio favours QVAC by 4.56x at median RTF. The raw Metal ratio
favours QVAC by 1.17x. Only the CPU gap is large relative to the warmup effect
observed in later verification rounds; no Mac-specific cold-versus-warm probe
was captured.

## 4. Platform constraints

- Metal is the only matched Apple GPU backend tested.
- Core ML was outside scope.
- The report does not measure streaming, batching, diarization, addon overhead,
  or model loading.

## 5. Methodology and deviations

QVAC starts one process per utterance and warms the exact clip before timing it.
Mudler starts one process for the corpus, warms the first clip once, and then
times each manifest entry on first encounter. This systematically favours QVAC
on GPU. The effect was identified after this run and was not measured on the
Apple M2, so the Metal speed ratio is provisional.

Both reported RTFs exclude model loading and WAV reading. Corpus WER is total
word edits divided by total reference words.

## 6. Findings

| ID | Finding | Severity |
|---|---|---|
| M1 | CPU and Metal accuracy are equivalent between engines | Result |
| M2 | QVAC has a large CPU advantage in this Apple M2 run | Result |
| M3 | Metal speed difference is smaller than the unresolved warmup bias | High |
| M4 | Detailed environment and warmup-probe artifacts were not captured | Docs |

## 7. Follow-up

1. Neutralise the per-clip warmup asymmetry and rerun Metal before quoting a
   winner.
2. Capture the complete OS, compiler, power, thermal, and model-checksum
   environment on the next Mac run.
3. Investigate why the CPU ordering differs from Linux x86 but agrees with the
   Android ARM result.

## 8. Verification

- 300 utterances and 25 languages are present in each JSON file.
- CPU metadata declares CPU for both engines.
- Metal metadata declares matching Metal backends.
- QVAC runtime backend labels are `ggml-cpu` or `ggml-mtl0` as requested.
- Per-language tables are available in the sibling Markdown reports.

## 9. Environment

| Item | Value |
|---|---|
| Host architecture | `darwin-arm64` |
| Processor | Apple M2 |
| Quantization | q8_0 |
| Threads | 4 |
| Corpus | FLEURS, 300 utterances, 25 languages |
| Detailed capture | Not available |

## 10. Artifacts

```text
reports/mac-arm64/
  verification-report.md
  fleurs-cpu.md
  fleurs-cpu.json
  fleurs-metal.md
  fleurs-metal.json
```

The JSON files contain per-utterance references, transcripts, timings, RTF,
WER, and runtime QVAC backend labels.
