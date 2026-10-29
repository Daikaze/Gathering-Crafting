"""Integrity tests for the 224-preview staging script (no real artwork changes)."""
import importlib.util
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "tools" / "apply-preview-224.py"
spec = importlib.util.spec_from_file_location("preview224_import", MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def fake_vp8x(w, h):
    payload = bytes(4) + (w - 1).to_bytes(3, "little") + (h - 1).to_bytes(3, "little")
    data = b"WEBP" + b"VP8X" + struct.pack("<I", len(payload)) + payload
    return b"RIFF" + struct.pack("<I", len(data)) + data


class TestPreview224(unittest.TestCase):
    def test_manifest_exact_catalog_paths_and_distinct_hashes(self):
        obj = json.loads((ROOT / "artwork/preview-224-manifest.json").read_text("utf-8"))
        self.assertEqual(obj["release"], "v1.1-preview")
        self.assertEqual(len(obj["items"]), 224)
        self.assertEqual(sum(i["source"] == "approved84" for i in obj["items"]), 84)
        self.assertEqual(sum(i["source"] == "alchemy66" for i in obj["items"]), 66)
        self.assertEqual(sum(i["source"] == "atlas74" for i in obj["items"]), 74)
        mod.validate_catalogue(ROOT, obj["items"])
        self.assertFalse(obj["requirements"]["originalArtRequirementsSatisfied"])

    def test_reject_duplicate_destination(self):
        obj = json.loads((ROOT / "artwork/preview-224-manifest.json").read_text("utf-8"))
        copy = [dict(x) for x in obj["items"]]
        copy[1]["path"] = copy[0]["path"]
        with self.assertRaisesRegex(ValueError, "(Repeated image destination|Catalog img mismatch)"):
            mod.validate_catalogue(ROOT, copy)

    def test_vp8x_dimensions_and_bad_length(self):
        good = fake_vp8x(256, 256)
        # Header itself is 30 bytes, accepted WebP extended frame.
        self.assertEqual(mod.dimensions(good), (256, 256))
        with self.assertRaisesRegex(ValueError, "RIFF"):
            mod.dimensions(good + b"bad")

    def test_dry_run_does_not_mutate_module(self):
        self.assertTrue((ROOT / "module.json").is_file())
        self.assertTrue((ROOT / "data/catalog.json").is_file())


if __name__ == "__main__":
    unittest.main()
