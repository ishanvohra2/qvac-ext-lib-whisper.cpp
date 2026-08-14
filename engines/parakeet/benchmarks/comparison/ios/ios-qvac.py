#!/usr/bin/env python3

import json
import sys
from pathlib import Path, PurePosixPath

from ios_common import (
    BENCH_ROOT,
    QVAC_BUNDLE_ID,
    copy_from_app,
    launch_app,
    map_host_path,
    option_value,
    qvac_path_mappings,
    rewrite_options,
)


def output_device_path(host_output: Path) -> PurePosixPath:
    return BENCH_ROOT / "out" / host_output.name


def rewrite_qvac_arguments(
    arguments: list[str],
    host_output: Path,
) -> list[str]:
    mappings = qvac_path_mappings()
    device_output = output_device_path(host_output)
    return rewrite_options(arguments, {
        "--model": lambda value: str(map_host_path(value, mappings)),
        "--wav": lambda value: str(map_host_path(value, mappings)),
        "--bench-json": lambda value: str(device_output),
    })


def normalize_output(
    host_output: Path,
    host_model: Path,
    host_wav: Path,
) -> None:
    data = json.loads(host_output.read_text(encoding="utf-8"))
    data["model"] = str(host_model)
    data["wav"] = str(host_wav)
    host_output.write_text(
        json.dumps(data, indent=2) + "\n",
        encoding="utf-8")


def run(arguments: list[str]) -> int:
    host_output = Path(option_value(arguments, "--bench-json")).expanduser().resolve()
    host_model = Path(option_value(arguments, "--model")).expanduser().resolve()
    host_wav = Path(option_value(arguments, "--wav")).expanduser().resolve()
    rewritten = rewrite_qvac_arguments(arguments, host_output)
    status = launch_app(QVAC_BUNDLE_ID, rewritten)
    if status != 0:
        return status
    status = copy_from_app(
        QVAC_BUNDLE_ID,
        output_device_path(host_output),
        host_output)
    if status != 0:
        return status
    normalize_output(host_output, host_model, host_wav)
    return 0


def main() -> int:
    try:
        return run(sys.argv[1:])
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
