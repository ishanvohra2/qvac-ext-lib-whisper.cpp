#!/usr/bin/env python3

import json
from pathlib import Path

IOS_DIR = Path(__file__).resolve().parent
COMPARISON_DIR = IOS_DIR.parent
SOURCE_DIR = COMPARISON_DIR / "out-ios"
TARGET_DIR = COMPARISON_DIR / "reports" / "ios-iphone16"
PLATFORM = "ios-iphone16"
DEVICE_MODEL = "iPhone17,3"
OS_VERSION = "iOS 26.6"


def normalize_json(source: Path, destination: Path) -> None:
    data = json.loads(source.read_text(encoding="utf-8"))
    data["meta"]["platform"] = PLATFORM
    data["meta"]["hostname"] = "Ishan's iPhone"
    data["meta"]["deviceModel"] = DEVICE_MODEL
    data["meta"]["osVersion"] = OS_VERSION
    destination.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")


def normalize_markdown(source: Path, destination: Path) -> None:
    content = source.read_text(encoding="utf-8")
    normalized = content.replace(
        "Platform: `darwin-arm64`;",
        f"Platform: `{PLATFORM}`; device: `{DEVICE_MODEL}`; OS: `{OS_VERSION}`;")
    destination.write_text(normalized, encoding="utf-8")


def normalize_backend(backend: str) -> None:
    source_slug = backend.lower()
    normalize_json(
        SOURCE_DIR / f"fleurs-comparison-data-darwin-arm64-{source_slug}.json",
        TARGET_DIR / f"fleurs-{source_slug}.json")
    normalize_markdown(
        SOURCE_DIR / f"fleurs-report-darwin-arm64-{source_slug}.md",
        TARGET_DIR / f"fleurs-{source_slug}.md")


def main() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    normalize_backend("CPU")
    normalize_backend("Metal")


if __name__ == "__main__":
    main()
