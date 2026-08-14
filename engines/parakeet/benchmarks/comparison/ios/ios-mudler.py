#!/usr/bin/env python3

import json
import os
import sys
import tempfile
from pathlib import Path, PurePosixPath

from ios_common import (
    BENCH_ROOT,
    MUDLER_BUNDLE_ID,
    copy_from_app,
    copy_to_app,
    launch_app,
    map_host_path,
    mudler_path_mappings,
    option_value,
    rewrite_manifest_lines,
    rewrite_options,
)


def output_device_path(host_output: Path) -> PurePosixPath:
    return BENCH_ROOT / "out" / host_output.name


def manifest_device_path(host_output: Path) -> PurePosixPath:
    return BENCH_ROOT / "manifests" / f"{host_output.stem}.txt"


def selected_device() -> str:
    requested = os.environ.get("PARAKEET_DEVICE", "CPU")
    if requested.lower() == "cpu":
        return "CPU"
    if requested.lower() == "mtl0":
        return "MTL0"
    raise ValueError("PARAKEET_DEVICE must be CPU or MTL0 for the iOS carrier")


def write_device_manifest(host_manifest: Path) -> Path:
    lines = host_manifest.read_text(encoding="utf-8").splitlines()
    rewritten = rewrite_manifest_lines(
        lines,
        host_manifest.parent,
        mudler_path_mappings())
    descriptor, temporary_name = tempfile.mkstemp(
        prefix="parakeet-ios-manifest-",
        suffix=".txt")
    os.close(descriptor)
    temporary_path = Path(temporary_name)
    temporary_path.write_text(
        "\n".join(rewritten) + "\n",
        encoding="utf-8")
    return temporary_path


def manifest_host_paths(host_manifest: Path) -> list[Path]:
    paths = []
    for line in host_manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        path = Path(line.partition("\t")[0].strip())
        if not path.is_absolute():
            path = host_manifest.parent / path
        paths.append(path.resolve())
    return paths


def normalize_output(host_output: Path, host_manifest: Path) -> None:
    mappings = mudler_path_mappings()
    host_paths = manifest_host_paths(host_manifest)
    host_by_device = {
        str(map_host_path(path, mappings)): str(path)
        for path in host_paths
    }
    data = json.loads(host_output.read_text(encoding="utf-8"))
    for item in data.get("files", []):
        device_path = item.get("path")
        if device_path in host_by_device:
            item["path"] = host_by_device[device_path]
    host_output.write_text(
        json.dumps(data, indent=2) + "\n",
        encoding="utf-8")


def rewrite_mudler_arguments(
    arguments: list[str],
    host_output: Path,
) -> list[str]:
    mappings = mudler_path_mappings()
    return rewrite_options(arguments, {
        "--model": lambda value: str(map_host_path(value, mappings)),
        "--manifest": lambda value: str(manifest_device_path(host_output)),
        "--json": lambda value: str(output_device_path(host_output)),
    })


def run(arguments: list[str]) -> int:
    if not arguments or arguments[0] != "bench":
        raise ValueError("the iOS mudler carrier supports only the bench command")

    host_manifest = Path(option_value(arguments, "--manifest")).expanduser().resolve()
    host_output = Path(option_value(arguments, "--json")).expanduser().resolve()
    temporary_manifest = write_device_manifest(host_manifest)
    try:
        status = copy_to_app(
            MUDLER_BUNDLE_ID,
            temporary_manifest,
            manifest_device_path(host_output))
        if status != 0:
            return status
        rewritten = rewrite_mudler_arguments(arguments, host_output)
        status = launch_app(
            MUDLER_BUNDLE_ID,
            rewritten,
            {"PARAKEET_DEVICE": selected_device()})
        if status != 0:
            return status
        status = copy_from_app(
            MUDLER_BUNDLE_ID,
            output_device_path(host_output),
            host_output)
        if status != 0:
            return status
        normalize_output(host_output, host_manifest)
        return 0
    finally:
        temporary_manifest.unlink(missing_ok=True)


def main() -> int:
    try:
        return run(sys.argv[1:])
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
