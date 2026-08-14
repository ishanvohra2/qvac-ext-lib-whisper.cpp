# iOS direct-engine comparison

This directory runs the existing comparison harness against two independently
signed iOS app carriers. QVAC and mudler are separate app processes because
both engines define ggml C symbols and cannot be safely linked into one image.
The measured path links each engine's C++ implementation directly.

The report target label for an iPhone 16 is `ios-iphone16`. This harness does
not include or claim benchmark results.

## Carriers

| Engine | Product | Bundle identifier |
|---|---|---|
| QVAC | `QvacParakeetBench` | `com.ishanvohra.parakeetbench.qvac` |
| mudler | `MudlerParakeetBench` | `com.ishanvohra.parakeetbench.mudler` |

Both products are arm64 `iphoneos` Release apps with a 16.4 deployment target,
static engine and ggml libraries, statically linked Metal, and an embedded
Metal library. The shared Objective-C++ application entry changes to the app's
Documents directory, invokes the selected CLI adapter on a background queue,
flushes stdout and stderr, and exits with the CLI status.

## Prerequisites

- macOS with Xcode 26 and its command-line tools selected;
- an iPhone 16 running iOS 26.6, connected, trusted, Developer Mode enabled,
  and visible to `devicectl`;
- an Apple development signing team allowed to sign both bundle identifiers;
- CMake 3.25 or newer, Python 3, and Node.js;
- this repository on branch `tmp-parakeet-engine-comparison-v2`;
- a separately obtained and reviewed `mudler/parakeet.cpp` checkout at tag
  `v0.5.0`, commit `1bfbebfaaf493866f49597cd3b7901959d395c60`, with its
  `third_party/ggml` submodule at
  `e705c5fed490514458bdd2eaddc43bd098fcce9b`.

`build-ios.sh` never clones or downloads source. CMake rejects a mudler checkout
whose `HEAD` or ggml submodule is not at the exact v0.5.0 revision. It applies
the tag's four bundled ggml patches idempotently with `git apply`, matching
mudler's standalone configure behavior without invoking its shell helper.

Confirm the exact iPhone before installing:

```bash
xcrun devicectl list devices
xcodebuild -project build/qvac/QvacParakeetBench.xcodeproj \
  -scheme QvacParakeetBench -showdestinations
```

`devicectl` and Xcode expose different identifiers for the same phone. Set
`IOS_DEVICE_ID` to the CoreDevice identifier and `IOS_XCODE_DEVICE_ID` to the
physical iOS destination identifier.

## Expected layout

From `engines/parakeet/benchmarks/comparison`:

```text
models/
  qvac/
    parakeet-tdt-0.6b-v3.q8_0.gguf
  mudler/
    tdt-0.6b-v3-q8_0.gguf
out/
  fleurs/
    manifest.json
    ... WAV paths referenced by manifest.json ...
ios/
  build-ios.sh
  stage-ios.py
  run-ios.sh
```

The two q8_0 files come from the same NVIDIA
`nvidia/parakeet-tdt-0.6b-v3` checkpoint but use incompatible engine-specific
GGUF schemas.

| File | SHA-256 |
|---|---|
| `parakeet-tdt-0.6b-v3.q8_0.gguf` | `7c1af03eb436e7a2f6a2449f90a5de103d748d125eb9ac90e218ebf1c0707ed6` |
| `tdt-0.6b-v3-q8_0.gguf` | `4d69a4a6683f4f2d952bad794c1357ca6eb628027695b4699c5a9ad4cd07d757` |

`stage-ios.py` verifies both checksums before transferring any data.

## Build and install on iPhone 16

Run these exact commands from the iOS harness directory:

```bash
cd engines/parakeet/benchmarks/comparison/ios
export IOS_DEVICE_ID="088F8A19-6A6F-5036-98DE-70A887270DCF"
export IOS_XCODE_DEVICE_ID="00008140-000E653C3C87001C"
export IOS_DEVELOPMENT_TEAM="Q3R48Z879S"
export MUDLER_SOURCE_DIR="/absolute/path/to/parakeet.cpp"
./build-ios.sh
```

The build configures two independent Xcode trees under `ios/build/`, builds
Release for physical `iphoneos` arm64, signs with `IOS_DEVELOPMENT_TEAM`, and
installs both apps using `xcrun devicectl device install app`.

## Stage models and FLEURS

```bash
export IOS_DEVICE_ID="YOUR-IPHONE-16-UDID"
./stage-ios.py
```

Staging creates the following private layout in each app data container:

```text
Documents/BenchRoot/
  models/
  fleurs/
  manifests/
  out/
```

The QVAC app receives the QVAC GGUF and selected FLEURS WAVs. The mudler app
receives its own GGUF and the same WAV bytes. No model is shared between app
containers, which prevents accidental schema or symbol mixing.

Alternative host paths can be supplied explicitly:

```bash
./stage-ios.py \
  --qvac-model /absolute/path/to/parakeet-tdt-0.6b-v3.q8_0.gguf \
  --mudler-model /absolute/path/to/tdt-0.6b-v3-q8_0.gguf \
  --fleurs-manifest /absolute/path/to/fleurs/manifest.json
```

When using alternative roots, export their absolute directories for the
wrappers before running:

```bash
export IOS_QVAC_MODEL_ROOT="/absolute/path/to"
export IOS_MUDLER_MODEL_ROOT="/absolute/path/to"
export IOS_FLEURS_ROOT="/absolute/path/to/fleurs"
```

## Run CPU and Metal

Keep the iPhone unlocked, foreground launch enabled, connected to power, and at
a stable temperature. Then run:

```bash
export IOS_DEVICE_ID="YOUR-IPHONE-16-UDID"
./run-ios.sh
```

The script points the unchanged `run-comparison.js` argv contract at the two
Python wrappers, runs FLEURS discovery, then runs CPU and Metal passes. Outputs
are written under `comparison/out-ios`.

The wrappers:

- safely map host models and WAVs to sandbox-relative `BenchRoot` paths;
- rewrite mudler manifest entries to the staged device WAV paths;
- launch with `--console` and `--terminate-existing`;
- set mudler `PARAKEET_DEVICE` to `CPU` or `MTL0` through the supported launch
  environment dictionary;
- stream app stdout and stderr to the host process;
- propagate launch failures and CLI exit statuses;
- copy generated JSON back to the host path expected by the Node harness.

## Fairness caveats

- Each engine uses its native q8_0 GGUF schema; the files are not byte-equal.
- Both engines receive the same WAV bytes, four threads, source checkpoint
  family, and CPU-versus-Metal selection.
- QVAC launches once per utterance and warms that utterance before timing.
  Mudler launches once for the corpus, warms only the first manifest item, and
  then times each item. This known asymmetry can bias Metal comparisons toward
  QVAC and must be disclosed in any interpreted report.
- App launch, model loading, `devicectl`, sandbox copies, and WAV loading remain
  outside the engine timing fields.
- Run CPU and Metal at stable temperature and record iPhone model, iOS build,
  Xcode build, battery/power state, and thermal observations.

## Normalize reviewed output

After reviewing a completed run, normalize supplied artifacts under the target
label without changing generated data:

```bash
mkdir -p ../reports/ios-iphone16
cp ../out-ios/fleurs-comparison-data-darwin-arm64-cpu.json \
  ../reports/ios-iphone16/fleurs-cpu.json
cp ../out-ios/fleurs-report-darwin-arm64-cpu.md \
  ../reports/ios-iphone16/fleurs-cpu.md
cp ../out-ios/fleurs-comparison-data-darwin-arm64-metal.json \
  ../reports/ios-iphone16/fleurs-metal.json
cp ../out-ios/fleurs-report-darwin-arm64-metal.md \
  ../reports/ios-iphone16/fleurs-metal.md
```

Add `reports/ios-iphone16/verification-report.md` only after the raw files,
runtime backend labels, device environment, checksums, and fairness caveats
have been reviewed. Do not infer or publish results from discovery output.

## Host unit tests

```bash
python3 -m unittest -v test_ios_common.py
```
