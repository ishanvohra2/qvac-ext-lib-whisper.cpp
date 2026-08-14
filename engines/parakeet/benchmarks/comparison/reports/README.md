# Parakeet platform reports

This directory contains direct QVAC-versus-mudler engine comparisons. Every
platform uses the same directory and document convention:

```text
reports/<target>/
  verification-report.md
  fleurs-<backend>.md
  fleurs-<backend>.json
```

`verification-report.md` is the interpreted platform report. Its top-level
sections are always:

1. Verdict
2. Run matrix
3. Results
4. Platform constraints
5. Methodology and deviations
6. Findings
7. Follow-up
8. Verification
9. Environment
10. Artifacts

`fleurs-<backend>.md` is the generated 25-language table.
`fleurs-<backend>.json` contains the per-utterance references, transcripts,
timings, WER, RTF, and backend metadata.

## Available targets

| Target | Verification | Committed raw data |
|---|---|---|
| Mac arm64 / Apple M2 | [`mac-arm64/verification-report.md`](mac-arm64/verification-report.md) | CPU and Metal |
| NVIDIA RTX 3080 | [`nvidia-rtx3080/verification-report.md`](nvidia-rtx3080/verification-report.md) | Not supplied |
| AMD Strix / Radeon 8060S | [`amd-strix/verification-report.md`](amd-strix/verification-report.md) | CPU and Vulkan |
| Android / Adreno 740 | [`android-adreno740/verification-report.md`](android-adreno740/verification-report.md) | Not supplied |

The NVIDIA and Android reports reference logs, probes, and raw FLEURS data that
were not included in the handoff. Their reports preserve that limitation rather
than synthesizing missing files.

## Interpretation rule

Accuracy results are directly comparable because all rounds use the same
300-utterance FLEURS corpus and matching q8_0 source checkpoints.

Small GPU timing differences are not conclusive with the current harness.
QVAC warms every clip immediately before timing it, while mudler warms only the
first corpus clip. Platform verification reports identify whether the observed
gap exceeds a locally measured cold-versus-warm effect. Raw generated reports
contain measurements, not a claim that one engine is definitively faster.
