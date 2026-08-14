#!/usr/bin/env python3

import tempfile
import unittest
from pathlib import Path, PurePosixPath
from unittest.mock import patch

from ios_common import (
    BENCH_ROOT,
    container_path,
    map_host_path,
    option_value,
    rewrite_manifest_lines,
    rewrite_options,
    run_transfer,
    validate_device_relative,
)


class IosCommonTest(unittest.TestCase):
    def test_map_host_path_preserves_relative_components(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            mapped = map_host_path(
                root / "en" / "clip.wav",
                ((root, BENCH_ROOT / "fleurs"),))
        self.assertEqual(mapped, PurePosixPath("BenchRoot/fleurs/en/clip.wav"))

    def test_map_host_path_rejects_unstaged_path(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(ValueError, "outside the staged roots"):
                map_host_path(
                    root.parent / "outside.wav",
                    ((root, BENCH_ROOT / "fleurs"),))

    def test_validate_device_relative_rejects_parent_escape(self) -> None:
        with self.assertRaisesRegex(ValueError, "unsafe device-relative path"):
            validate_device_relative(PurePosixPath("BenchRoot/../escape"))

    def test_container_path_uses_documents_domain_root(self) -> None:
        self.assertEqual(
            container_path(PurePosixPath("BenchRoot/out/result.json")),
            "Documents/BenchRoot/out/result.json")

    def test_staging_root_stays_below_documents(self) -> None:
        self.assertEqual(container_path(BENCH_ROOT), "Documents/BenchRoot")

    @patch("ios_common.time.sleep")
    @patch("ios_common.run_devicectl", side_effect=[1, 1, 0])
    def test_transfer_retries_transient_failures(
        self,
        run_devicectl,
        sleep,
    ) -> None:
        self.assertEqual(run_transfer(["device", "copy"]), 0)
        self.assertEqual(run_devicectl.call_count, 3)
        self.assertEqual(sleep.call_count, 2)

    @patch("ios_common.time.sleep")
    @patch("ios_common.run_devicectl", return_value=1)
    def test_transfer_stops_after_bounded_attempts(
        self,
        run_devicectl,
        sleep,
    ) -> None:
        self.assertEqual(run_transfer(["device", "copy"]), 1)
        self.assertEqual(run_devicectl.call_count, 3)
        self.assertEqual(sleep.call_count, 2)

    def test_rewrite_options_replaces_only_values(self) -> None:
        arguments = [
            "--model", "/host/model.gguf",
            "--wav", "/host/clip.wav",
            "--threads", "4",
        ]
        rewritten = rewrite_options(arguments, {
            "--model": lambda value: f"BenchRoot/models/{Path(value).name}",
            "--wav": lambda value: f"BenchRoot/fleurs/{Path(value).name}",
        })
        self.assertEqual(rewritten, [
            "--model", "BenchRoot/models/model.gguf",
            "--wav", "BenchRoot/fleurs/clip.wav",
            "--threads", "4",
        ])

    def test_option_value_rejects_missing_value(self) -> None:
        with self.assertRaisesRegex(ValueError, "requires a value"):
            option_value(["--json"], "--json")

    def test_rewrite_manifest_lines_preserves_comments_and_reference(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            lines = [
                "# comment",
                "",
                "fr/clip.wav\tbonjour",
            ]
            rewritten = rewrite_manifest_lines(
                lines,
                root,
                ((root, BENCH_ROOT / "fleurs"),))
        self.assertEqual(rewritten, [
            "# comment",
            "",
            "BenchRoot/fleurs/fr/clip.wav\tbonjour",
        ])


if __name__ == "__main__":
    unittest.main()
