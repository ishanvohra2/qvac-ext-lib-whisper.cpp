# Parakeet engine comparison: NVIDIA RTX 3080

Verification of the NVIDIA hand-off in
[`tmp-parakeet-engine-comparison-v2`](https://github.com/ishanvohra2/qvac-ext-lib-whisper.cpp/tree/tmp-parakeet-engine-comparison-v2)
(`engines/parakeet/benchmarks/comparison/instructions.md`), run on an RTX 3080.
The measured path contains only the two engine CLIs — no addon, Bare, SDK, or
`packages/asr-ggml`.

## 1. Verdict

**The setup reproduces.** Both Vulkan CLIs build clean and the matched
Vulkan-vs-Vulkan comparison ran end to end over 300 FLEURS utterances. One
documented command needed a fix (a script is committed non-executable). Three
substantive issues are worth the team's attention:

1. **Accuracy: the two engines are equivalent.** 10.79% vs 10.76% corpus WER,
   confirmed across three independent measurements.
2. **Speed on GPU is *not resolvable* with this harness.** QVAC measures 1.26×
   faster, but the harness's own warmup asymmetry is worth up to 1.35× and points
   the same way. The gap is inside the error bar — do not quote a GPU winner.
3. **On CPU, mudler is 1.79× faster than QVAC.** Here the same bias measures only
   ~1.04×, so this gap is well outside the error bar — and since the bias still
   favours QVAC, 1.79× is a mild understatement. A controlled ablation ruled out
   the obvious explanation (mudler's ggml CPU patch is inert here), so the cause
   is still open.

The optional OpenCL diagnostic **cannot be produced on NVIDIA hardware at all** —
QVAC's OpenCL backend refuses non-Adreno GPUs by design.

---

## 2. Run matrix

| # | Run | Status |
|---|---|---|
| 1 | **Vulkan vs Vulkan** — matched, the valid engine comparison | Completed |
| 2 | **QVAC OpenCL vs mudler Vulkan** — optional diagnostic | **Impossible on NVIDIA** (§4) |
| 3 | **CPU vs CPU** — baseline added beyond `instructions.md` | Completed |
| 4 | **mudler ggml CPU-patch ablation** — controlled A/B, added | Completed |

FLEURS, 300 utterances, 25 languages, 3220.5 s (53.7 min) of audio, `q8_0`,
4 threads, 1 warmup + 1 timed run per utterance. The manifest was frozen and
reused byte-for-byte across all runs.

---

## 3. Results

| Backend | Engine | Corpus WER | Mean RTF | Median RTF |
|---|---|---:|---:|---:|
| **Vulkan** | QVAC | 10.79% | 0.00424 | 0.00419 |
| **Vulkan** | mudler | 10.76% | 0.00619 | 0.00527 |
| **CPU** | QVAC | 10.77% | 0.07404 | 0.07396 |
| **CPU** | mudler | 10.65% | 0.04166 | 0.04138 |

GPU speedup over each engine's own CPU baseline (median RTF): **QVAC 17.7×**,
**mudler 7.9×**. QVAC's larger multiplier reflects its weaker CPU baseline, not a
stronger GPU path.

### Accuracy — a genuine tie

0.03 pp apart on Vulkan, 0.12 pp on CPU. Across 25 languages QVAC wins 8, mudler
wins 9, and 8 are exact ties. Each engine's WER is also stable across backends
(QVAC 10.77% CPU / 10.79% Vulkan; mudler 10.65% / 10.76%), and both land within
0.07 pp of the committed macOS/Metal figures:

| Backend | QVAC WER | mudler WER |
|---|---:|---:|
| Metal (`darwin-arm64`, committed) | 10.76% | 10.69% |
| Vulkan (`linux-x64`, this run) | 10.79% | 10.76% |

That cross-platform agreement also independently validates the QVAC GGUF I had to
convert locally for this run (see F3).

### Speed on GPU — inside the error bar, do not quote a winner

The raw table suggests QVAC is faster, but two effects have to be removed first.

**(a) Two transient outliers inflate mudler's mean.** `nl_1` (RTF 0.136) and
`cs_11` (0.113) sit ~20–26× above mudler's own median, at mid-run indices 49 and
35. They are not warmup — index 0 is clean and dropping it moves the median by
0.00001. Removing those two of 300 collapses the mean ratio from 1.46× to 1.27×,
matching the median ratio of 1.26×. **The 1.46× mean should never be quoted.**
Their cause was not investigated and is not claimed.

**(b) The harness's warmup asymmetry favours QVAC by up to 1.35×.** Both engines
get "one warmup", but not the same kind:

- **QVAC** runs one process per utterance; the warmup and the timed pass both run
  `run_once()` over the **same clip** (`src/main.cpp:1062-1086`). The timed number
  is a *repeat* of identical audio.
- **mudler** runs one process for all 300; it warms up once on `paths[0]`
  (`examples/cli/main.cpp:800-804`) and then meets each of its 300 clips **cold**.

Both correctly exclude one-time model load and device init. But QVAC additionally
excludes per-clip first-encounter cost, which lands inside every one of mudler's
timed samples. Measured directly on 8 clips, QVAC's cold first pass is
**1.21–1.60× slower (mean 1.35×)** than its warmed pass
(`artifacts/warmup-asymmetry-probe.txt`).

That 1.35× is an *upper bound* on the correction — a fresh-process cold run also
pays device weight upload, which mudler's warmup does absorb — so the true factor
lies somewhere between 1.00× and 1.35×.

> **The measured 1.26× GPU gap sits inside a 1.00–1.35× methodological band. This
> harness cannot determine which engine is faster on GPU.** What it does show is
> that they are close.

**Consistency is a real QVAC win, though:** per-utterance max/median is 1.55× for
QVAC against 25.79× for mudler (stdev 0.00076 vs 0.00983). Some of that follows
from the per-process design rather than the engine itself.

### Speed on CPU — mudler wins, and this one is robust

mudler is **1.79× faster** than QVAC on CPU (median RTF 0.0414 vs 0.0740).

Crucially, this result is **not** compromised by the warmup asymmetry, and the
same probe re-run on CPU shows why: there the cold-vs-warm ratio is only
**1.04× (range 0.98–1.08×)**, against 1.35× on GPU — on CPU there is no device
weight upload or pipeline compilation to hide, so first-encounter cost is
negligible beside ~800 ms of compute.

So the bias is ~1.04× and the gap is 1.79×: mudler's CPU win is comfortably
outside the error bar, and because the bias still points QVAC's way, 1.79× is a
mild **under**statement. This is the mirror image of the GPU number, where a
1.35× bias swamps a 1.26× gap.

Both CPU builds are configured identically (OpenMP 4.5, `-march=native`, no BLAS
on either side), so configuration is not the explanation.

**The leading candidate was tested and ruled out.** mudler patches its own ggml at
configure time, and one patch rewrites the **CPU** `mul_mat`/`llamafile_sgemm`
broadcast path — its header claims 4–5× on windowed-attention shapes, which looked
like an excellent match for the FastConformer encoder. A controlled ablation says
otherwise (`artifacts/mudler-cpu-patch-ablation.txt`):

| mudler ggml | QVAC (control) median RTF | mudler median RTF |
|---|---:|---:|
| with its 4 patches | 0.07396 | 0.04138 |
| patches reverted | 0.07396 | 0.04129 |

QVAC was served from the harness cache so it is a fixed control — and it came back
bit-identical, confirming the A/B was clean. mudler moved by 0.2%, within noise and
marginally in the *wrong* direction.

Because a null result is indistinguishable from an experiment that never ran, the
intervention was proven to have fired before the numbers were trusted: the
patched build's `ggml_compute_forward_mul_mat` symbol is **+1,618 bytes (+29%)**
and `.text` is +1,664 bytes versus the ablated build. (Both `.so` files happen to
have identical byte size due to section padding, so a file-size check alone would
have been misleading.)

**So the CPU patch does not explain the gap.** What remains, and was **not**
tested: the ggml version difference (QVAC 0.10.2 vs mudler 0.13.0), and QVAC's own
engine-level CPU path. That is now the open question worth someone's time.

Per-language tables: `artifacts/fleurs-report-linux-x64-{vulkan,cpu}.md`.

---

## 4. Platform constraints

`instructions.md` asks for a `QVAC OpenCL vs mudler Vulkan` diagnostic and says to
treat a failure to initialize as a result to report. That is what happened.

The OpenCL CLI **builds** exactly as documented. At runtime the backend refuses the
RTX 3080, the model falls to CPU, and the harness correctly aborted rather than
record a CPU run as an OpenCL result:

```
error: QVAC reported ggml-cpu, expected OpenCL
```

No `fleurs-*-opencl.{json,md}` files exist. That is the correct outcome, not a
harness bug — the guard did its job.

**This is by design, confirmed three independent ways** (source, device ground
truth, and two empirical probes — `artifacts/opencl-evidence.txt`):

1. **Default build:** `Unsupported GPU: NVIDIA GeForce RTX 3080` →
   `drop unsupported device` → bench JSON reports `"backend": "ggml-cpu"`.
2. **With the `GGML_OPENCL_ALLOW_UNKNOWN_GPU=1` opt-in** it clears that gate and
   stops at the next one: the device *"has neither `cl_intel_required_subgroup_size`
   nor `cl_qcom_reqd_sub_group_size` and is not a 64-wide `cl_khr_subgroups`
   device; matmul-vec kernels cannot define N_DST/N_SIMDGROUP/N_SIMDWIDTH and
   clBuildProgram would abort."* Still `ggml-cpu`.
3. **A third gate would reject it anyway:** `GGML_OPENCL_USE_ADRENO_KERNELS`
   defaults ON and device init hard-fails for any non-Adreno family.
   `instructions.md` never turns it off.

Device ground truth confirms the mechanism rather than inferring it: the RTX 3080
advertises **zero** `cl_*subgroup*` extensions of any kind (warp 32, no AMD
attribute extension). The ggml source states the intent outright — *"AMD/NVIDIA
desktop drivers expose neither and now fall back cleanly to CPU instead of
crashing."*

**QVAC's OpenCL backend targets Adreno. No configuration will make this diagnostic
yield a number on desktop NVIDIA.** On NVIDIA the meaningful QVAC GPU backends are
Vulkan and CUDA.

---

## 5. Methodology and deviations

One deviation, changing no functionality or logic:

| Deviation | Reason |
|---|---|
| Ran `bash scripts/setup-ggml.sh` instead of the documented `./scripts/setup-ggml.sh` | The script is committed **non-executable**, so the documented form fails with `permission denied` (F1). |

Two agreed scope choices: a **CPU baseline** was added (not in `instructions.md`);
**no CUDA run** was performed. No source file of either engine was modified, and
both trees built clean under cmake 4.3.2 / g++ 15.2.1 with no patches.

---

## 6. Findings

| ID | Finding | Severity |
|---|---|---|
| F1 | `setup-ggml.sh` committed non-executable | Low |
| F2 | OpenCL diagnostic is unachievable on NVIDIA | Docs |
| F3 | No published QVAC GGUF, so the model pair can't be matched exactly | Medium |
| F4 | mudler patches its ggml CPU path at configure time | Context |
| F5 | Neither "GPU" run is purely GPU | Context |
| F6 | The engines vendor different ggml versions | Context |
| F7 | The harness never observes mudler's runtime backend | Medium |
| F8 | Warmup asymmetry systematically favours QVAC | **High** |

**F1** — `git ls-files -s` shows mode `100644` for `scripts/setup-ggml.sh` and
`download-all-models.sh`, while `test-package-consumption.sh` beside them is
`100755`. Fix: `git update-index --chmod=+x` on both.

**F2** — see §4. `instructions.md` presents the OpenCL run as optional-but-attemptable
and asks the reader to record the OpenCL device, implying it can work. Fix: state
the Adreno-only constraint in the scope section, or drop it from the NVIDIA hand-off.

**F3** — `instructions.md` says to "prefer copying the exact model pair used by the
Darwin run and record SHA-256 checksums". mudler publishes its GGUF, but there is
**no published QVAC-schema GGUF**; the QVAC side must be regenerated locally from
the 2.4 GiB `.nemo` via a Python toolchain. A different host can therefore produce
a byte-different file, so the recorded SHA-256 is not a cross-host reproducibility
check. Here the conversion is validated indirectly: it printed the required
`tokenizer pieces=8192` gate and its WER matched Darwin within 0.03 pp. Fix:
publish the QVAC q8_0 GGUF, or record its expected checksum.

**F4** — mudler runs `scripts/apply_ggml_patches.sh` during `cmake` configure,
applying 4 patches to its ggml submodule. `0001-ggml-cpu-fold-broadcast-iterations-in-llamafile_sgem.patch`
changes the **CPU** `mul_mat` path; the other three are Metal/CUDA-only, so the
Vulkan comparison is unaffected. **Ablation shows this patch is inert for this
workload** (§3, 0.2% — within noise), so it does not compromise the CPU baseline
either. Worth knowing it exists, but it changes nothing here.

**F5** — both engines drive `ggml_backend_sched` (QVAC `src/parakeet_ctc.cpp:954`,
mudler `src/backend.cpp:251`, *"schedule across {GPU, CPU}"*), so unsupported ops
silently fall back to CPU on both sides. Symmetric and unbiased, but the "Vulkan"
label overstates GPU residency for both.

**F6** — QVAC `tetherto/qvac-ext-ggml@speech 576c9735` (ggml 0.10.2); mudler
`ggml-org/ggml e705c5fe` (ggml 0.13.0). Inherent to the design, but it means the
comparison measures engine + ggml, not engine alone.

**F7** — QVAC's backend label is genuinely runtime-observed: the CLI writes
`ggml_backend_name(active)` into the bench JSON and the harness validates it per
utterance (all 300 read `ggml-vulkan0`). mudler's is **declared, not observed** —
`run-comparison.js:482` simply echoes the configured value, and the harness
swallows mudler's stdout, so no runtime evidence is captured. The only mudler-side
guard is a grep for `falling back to CPU`, which fires solely on a device-name
miss. Fix: capture and assert mudler's `pk::Backend using device: <dev>` line.
*(For this run, mudler's Vulkan use is corroborated: the identical command printed
`Vulkan0` in the smoke test, and its CPU run is 7.9× slower.)*

**F8** — see §3(b). The highest-impact finding: on GPU the harness's timing
methodology carries a bias (up to 1.35×) *larger* than the difference it is being
used to measure (1.26×), and the bias favours QVAC. Measured on CPU the same bias
is only ~1.04×, so the CPU comparison is unaffected — this invalidates the GPU
speed conclusion specifically, not the harness as a whole, and not any WER result.
Fix options: give QVAC its warmup on a *different* clip, or run mudler's manifest
twice and read the second pass, so both engines report steady-state.

---

## 7. Follow-up

1. **Fix F8 before quoting any GPU speed number.** As it stands the harness can
   establish accuracy parity but not a GPU speed winner.
2. **Add a matched CUDA vs CUDA run.** CUDA is what anyone would ship on NVIDIA;
   mudler exposes `PARAKEET_GGML_CUDA`, and QVAC's tier policy selects any
   non-OpenCL GPU device from the ggml registry, which includes CUDA when built
   with `GGML_CUDA=ON`. Whether CUDA beats Vulkan here was **not measured**.
3. **Investigate QVAC's CPU path.** mudler's ggml patch has been ruled out by
   ablation (§3), so the 1.79× CPU gap traces to either the ggml version
   difference (0.10.2 vs 0.13.0) or QVAC's own engine-level CPU code. Bumping
   QVAC's ggml and re-measuring is the cheapest next probe.
4. Fix the script modes (F1), publish the QVAC GGUF (F3), assert mudler's runtime
   backend (F7), and correct the OpenCL scope wording (F2).

---

## 8. Verification

Every item from `instructions.md` §"Validation and handoff", for the matched
Vulkan run:

| Check | Result |
|---|---|
| 300 utterances and 25 languages present | Pass — 300 / 25 |
| Neither engine produced empty transcripts | Pass — 0 empty, both engines, both runs |
| Corpus WER plausible and close between conversions | Pass — 0.03 pp apart |
| No log contains `falling back to CPU` | Pass — grep control-validated † |
| QVAC per-utterance backend labels match the request | Pass — all 300 report `ggml-vulkan0` |
| Vulkan JSON has `meta.backendMatch: true` | Pass |
| OpenCL diagnostic JSON has `meta.backendMatch: false` | N/A — run could not produce output (§4) |
| Model load and WAV read excluded from timings | Pass — `load_ms` 231.2 and `wav_read_ms` 0.46 are separate fields; `inference_ms` equals mel+encoder+decoder exactly |
| `node fleurs-results.test.js` | Pass — *FLEURS aggregation and report tests passed* |

† The negative was control-validated rather than assumed: the same grep finds a
known-present string in the real logs, and finds the exact guard phrase in a
synthetic file, yet finds nothing in the run logs.

---

## 9. Environment

| Item | Value |
|---|---|
| Host | `pratik-pc`, Arch Linux, kernel 7.0.3-arch1-1, x86_64 |
| CPU / RAM | AMD Ryzen 9 7950X3D (16C/32T) / 61 GiB |
| GPU | NVIDIA GeForce RTX 3080 10 GiB, driver 595.71.05 |
| Vulkan | loader 1.4.341, device API 1.4.329, `NV_coopmat2`, int-dot, fp16+bf16 |
| OpenCL | NVIDIA CUDA platform, OpenCL 3.0, warp 32, **no subgroup extensions** |
| CUDA | 13.2 (present, unused) |
| Toolchain | cmake 4.3.2, g++ 15.2.1, node v25.9.0, python 3.14.4 |
| GPU at run start | 39 °C idle, 15 MiB used, no compute clients |

| Component | Commit / checksum |
|---|---|
| QVAC repo | `693f2caffb765adbd92e9c93503973e6b2ca1272` (`tmp-parakeet-engine-comparison-v2`) |
| QVAC ggml | `tetherto/qvac-ext-ggml@speech` `576c9735326a50ef1f2d54263ba4dac0d384d73d` |
| mudler repo | `1bfbebfaaf493866f49597cd3b7901959d395c60` (`v0.5.0` — exactly the commit `architecture.md` pins) |
| mudler ggml | `ggml-org/ggml` `e705c5fed490514458bdd2eaddc43bd098fcce9b` + 4 local patches |
| QVAC GGUF (converted here) | `7c1af03eb436e7a2f6a2449f90a5de103d748d125eb9ac90e218ebf1c0707ed6` |
| mudler GGUF (downloaded) | `4d69a4a6683f4f2d952bad794c1357ca6eb628027695b4699c5a9ad4cd07d757` |
| Source `.nemo` | `3cbdc85877e668ca7b82d0d56770eb1fac76691f55d6b97545e8d61ca588d10d` |

---

## 10. Artifacts

```
artifacts/
  environment.txt                              full environment capture
  versions.txt                                 commits, patches, model SHA-256s
  opencl-evidence.txt                          device ground truth + both OpenCL probes
  opencl-diagnostic-run.log                    the harness refusing the OpenCL run
  warmup-asymmetry-probe.txt                   F8 cold-vs-warm measurement (GPU + CPU)
  mudler-cpu-patch-ablation.txt                controlled A/B ruling out the CPU patch
  fleurs-report-linux-x64-vulkan.md            per-language Vulkan tables
  fleurs-comparison-data-linux-x64-vulkan.json per-utterance Vulkan data
  fleurs-report-linux-x64-cpu.md               per-language CPU tables (patched mudler)
  fleurs-comparison-data-linux-x64-cpu.json    per-utterance CPU data (patched mudler)
FINDINGS.md                                    working ledger: each finding's test and verdict
```
