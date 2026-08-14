#!/usr/bin/env python3

import json
import os
import subprocess
import time
from pathlib import Path, PurePosixPath
from typing import Callable, Iterable, Mapping, Sequence

IOS_DEVICE_ID_ENV = "IOS_DEVICE_ID"
QVAC_BUNDLE_ID = "com.ishanvohra.parakeetbench.qvac"
MUDLER_BUNDLE_ID = "com.ishanvohra.parakeetbench.mudler"
BENCH_ROOT = PurePosixPath("BenchRoot")
CONTAINER_DOCUMENTS = PurePosixPath("Documents")
TRANSFER_ATTEMPTS = 3
TRANSFER_RETRY_DELAY_SECONDS = 1

IOS_DIR = Path(__file__).resolve().parent
COMPARISON_DIR = IOS_DIR.parent
PARAKEET_DIR = COMPARISON_DIR.parent.parent
DEFAULT_FLEURS_ROOT = COMPARISON_DIR / "out" / "fleurs"
DEFAULT_QVAC_MODEL_ROOT = COMPARISON_DIR / "models" / "qvac"
DEFAULT_MUDLER_MODEL_ROOT = COMPARISON_DIR / "models" / "mudler"
DEFAULT_SAMPLE_ROOT = PARAKEET_DIR / "test" / "samples"

PathMapping = tuple[Path, PurePosixPath]


def required_environment(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ValueError(f"{name} is required")
    return value


def environment_path(name: str, default: Path) -> Path:
    return Path(os.environ.get(name, str(default))).expanduser().resolve()


def qvac_path_mappings() -> tuple[PathMapping, ...]:
    return (
        (environment_path("IOS_QVAC_MODEL_ROOT", DEFAULT_QVAC_MODEL_ROOT),
         BENCH_ROOT / "models"),
        (environment_path("IOS_FLEURS_ROOT", DEFAULT_FLEURS_ROOT),
         BENCH_ROOT / "fleurs"),
        (environment_path("IOS_SAMPLE_ROOT", DEFAULT_SAMPLE_ROOT),
         BENCH_ROOT / "samples"),
    )


def mudler_path_mappings() -> tuple[PathMapping, ...]:
    return (
        (environment_path("IOS_MUDLER_MODEL_ROOT", DEFAULT_MUDLER_MODEL_ROOT),
         BENCH_ROOT / "models"),
        (environment_path("IOS_FLEURS_ROOT", DEFAULT_FLEURS_ROOT),
         BENCH_ROOT / "fleurs"),
        (environment_path("IOS_SAMPLE_ROOT", DEFAULT_SAMPLE_ROOT),
         BENCH_ROOT / "samples"),
    )


def validate_device_relative(path: PurePosixPath) -> PurePosixPath:
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"unsafe device-relative path: {path}")
    return path


def map_host_path(
    host_path: str | Path,
    mappings: Iterable[PathMapping],
) -> PurePosixPath:
    resolved = Path(host_path).expanduser().resolve()
    for host_root, device_root in mappings:
        try:
            relative = resolved.relative_to(host_root.resolve())
        except ValueError:
            continue
        return validate_device_relative(device_root / PurePosixPath(relative.as_posix()))
    roots = ", ".join(str(root) for root, _ in mappings)
    raise ValueError(f"{resolved} is outside the staged roots: {roots}")


def option_value(arguments: Sequence[str], option: str) -> str:
    for index, argument in enumerate(arguments):
        if argument == option:
            if index + 1 >= len(arguments):
                raise ValueError(f"{option} requires a value")
            return arguments[index + 1]
    raise ValueError(f"missing required option {option}")


def rewrite_option(
    arguments: Sequence[str],
    option: str,
    transform: Callable[[str], str],
) -> list[str]:
    rewritten = list(arguments)
    found = False
    for index, argument in enumerate(rewritten):
        if argument != option:
            continue
        if index + 1 >= len(rewritten):
            raise ValueError(f"{option} requires a value")
        rewritten[index + 1] = transform(rewritten[index + 1])
        found = True
    if not found:
        raise ValueError(f"missing required option {option}")
    return rewritten


def rewrite_options(
    arguments: Sequence[str],
    transforms: Mapping[str, Callable[[str], str]],
) -> list[str]:
    rewritten = list(arguments)
    for option, transform in transforms.items():
        rewritten = rewrite_option(rewritten, option, transform)
    return rewritten


def rewrite_manifest_lines(
    lines: Sequence[str],
    manifest_directory: Path,
    mappings: Iterable[PathMapping],
) -> list[str]:
    rewritten = []
    for line in lines:
        content = line.rstrip("\r\n")
        if not content.strip() or content.lstrip().startswith("#"):
            rewritten.append(content)
            continue
        path_field, separator, suffix = content.partition("\t")
        host_path = Path(path_field.strip())
        if not host_path.is_absolute():
            host_path = manifest_directory / host_path
        device_path = map_host_path(host_path, mappings)
        rewritten.append(f"{device_path}{separator}{suffix}")
    return rewritten


def container_path(device_relative: PurePosixPath) -> str:
    validated = validate_device_relative(device_relative)
    return str(CONTAINER_DOCUMENTS / validated)


def run_devicectl(arguments: Sequence[str]) -> int:
    command = ["xcrun", "devicectl", *arguments]
    return subprocess.run(command, check=False).returncode


def run_transfer(arguments: Sequence[str]) -> int:
    status = 1
    for attempt in range(TRANSFER_ATTEMPTS):
        status = run_devicectl(arguments)
        if status == 0:
            return 0
        if attempt + 1 < TRANSFER_ATTEMPTS:
            time.sleep(TRANSFER_RETRY_DELAY_SECONDS)
    return status


def copy_to_app(
    bundle_id: str,
    host_source: Path,
    device_destination: PurePosixPath,
) -> int:
    return run_transfer([
        "device", "copy", "to",
        "--device", required_environment(IOS_DEVICE_ID_ENV),
        "--source", str(host_source),
        "--destination", container_path(device_destination),
        "--domain-type", "appDataContainer",
        "--domain-identifier", bundle_id,
    ])


def copy_from_app(
    bundle_id: str,
    device_source: PurePosixPath,
    host_destination: Path,
) -> int:
    host_destination.parent.mkdir(parents=True, exist_ok=True)
    return run_transfer([
        "device", "copy", "from",
        "--device", required_environment(IOS_DEVICE_ID_ENV),
        "--source", container_path(device_source),
        "--destination", str(host_destination),
        "--domain-type", "appDataContainer",
        "--domain-identifier", bundle_id,
    ])


def launch_app(
    bundle_id: str,
    arguments: Sequence[str],
    environment: Mapping[str, str] | None = None,
) -> int:
    command = [
        "device", "process", "launch",
        "--device", required_environment(IOS_DEVICE_ID_ENV),
        "--console",
        "--terminate-existing",
    ]
    if environment:
        command.extend([
            "--environment-variables",
            json.dumps(dict(environment), sort_keys=True, separators=(",", ":")),
        ])
    command.extend([bundle_id, *arguments])
    return run_devicectl(command)
