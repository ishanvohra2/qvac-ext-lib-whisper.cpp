#!/usr/bin/env python3

import argparse
import hashlib
import json
import shutil
import sys
import tempfile
from pathlib import Path, PurePosixPath

from ios_common import (
    BENCH_ROOT,
    COMPARISON_DIR,
    DEFAULT_FLEURS_ROOT,
    MUDLER_BUNDLE_ID,
    QVAC_BUNDLE_ID,
    copy_to_app,
    map_host_path,
)

QVAC_MODEL_NAME = "parakeet-tdt-0.6b-v3.q8_0.gguf"
MUDLER_MODEL_NAME = "tdt-0.6b-v3-q8_0.gguf"
QVAC_MODEL_SHA256 = "7c1af03eb436e7a2f6a2449f90a5de103d748d125eb9ac90e218ebf1c0707ed6"
MUDLER_MODEL_SHA256 = "4d69a4a6683f4f2d952bad794c1357ca6eb628027695b4699c5a9ad4cd07d757"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Stage direct-engine models and FLEURS WAVs in both iOS app sandboxes")
    parser.add_argument(
        "--qvac-model",
        type=Path,
        default=COMPARISON_DIR / "models" / "qvac" / QVAC_MODEL_NAME)
    parser.add_argument(
        "--mudler-model",
        type=Path,
        default=COMPARISON_DIR / "models" / "mudler" / MUDLER_MODEL_NAME)
    parser.add_argument(
        "--fleurs-manifest",
        type=Path,
        default=DEFAULT_FLEURS_ROOT / "manifest.json")
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_model(path: Path, expected: str) -> None:
    actual = sha256(path)
    if actual != expected:
        raise ValueError(
            f"SHA-256 mismatch for {path}: expected {expected}, found {actual}")


def load_wav_paths(manifest: Path) -> list[Path]:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("FLEURS manifest must be a non-empty JSON array")
    return [
        (Path(item["wav"]) if Path(item["wav"]).is_absolute()
         else manifest.parent / item["wav"]).resolve()
        for item in data
    ]


def copy_to_tree(
    source: Path,
    tree: Path,
    device_path: PurePosixPath,
) -> None:
    destination = tree.joinpath(*device_path.parts)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def stage_wavs(
    wav_paths: list[Path],
    fleurs_root: Path,
    qvac_tree: Path,
    mudler_tree: Path,
) -> None:
    mappings = ((fleurs_root, BENCH_ROOT / "fleurs"),)
    for wav_path in wav_paths:
        device_path = map_host_path(wav_path, mappings)
        copy_to_tree(wav_path, qvac_tree, device_path)
        copy_to_tree(wav_path, mudler_tree, device_path)


def stage_directories(tree: Path) -> None:
    for directory in ("out", "manifests"):
        marker = tree / "BenchRoot" / directory / ".staged"
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text("staged\n", encoding="utf-8")


def stage_models(
    qvac_model: Path,
    mudler_model: Path,
    qvac_tree: Path,
    mudler_tree: Path,
) -> None:
    copy_to_tree(qvac_model, qvac_tree, BENCH_ROOT / "models" / qvac_model.name)
    copy_to_tree(mudler_model, mudler_tree, BENCH_ROOT / "models" / mudler_model.name)


def push_tree(bundle_id: str, tree: Path) -> None:
    status = copy_to_app(bundle_id, tree / "BenchRoot", BENCH_ROOT)
    if status != 0:
        raise RuntimeError(f"devicectl staging failed for {bundle_id} with status {status}")


def stage(args: argparse.Namespace) -> None:
    qvac_model = args.qvac_model.expanduser().resolve()
    mudler_model = args.mudler_model.expanduser().resolve()
    manifest = args.fleurs_manifest.expanduser().resolve()
    verify_model(qvac_model, QVAC_MODEL_SHA256)
    verify_model(mudler_model, MUDLER_MODEL_SHA256)

    with tempfile.TemporaryDirectory(prefix="parakeet-ios-stage-") as temporary:
        root = Path(temporary)
        qvac_tree = root / "qvac"
        mudler_tree = root / "mudler"
        stage_directories(qvac_tree)
        stage_directories(mudler_tree)
        stage_models(qvac_model, mudler_model, qvac_tree, mudler_tree)
        stage_wavs(
            load_wav_paths(manifest),
            manifest.parent,
            qvac_tree,
            mudler_tree)
        copy_to_tree(manifest, qvac_tree, BENCH_ROOT / "fleurs" / "manifest.json")
        copy_to_tree(manifest, mudler_tree, BENCH_ROOT / "fleurs" / "manifest.json")
        push_tree(QVAC_BUNDLE_ID, qvac_tree)
        push_tree(MUDLER_BUNDLE_ID, mudler_tree)


def main() -> int:
    try:
        stage(parse_arguments())
        return 0
    except (KeyError, OSError, RuntimeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
