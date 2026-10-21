"""Regression tests for manual Foundry v1.1 preview update construction."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

from PIL import Image

BUILDER = Path(__file__).resolve().parents[1] / "build_preview_update.py"
SPEC = importlib.util.spec_from_file_location("gc_preview_builder", BUILDER)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)
ROOT = BUILDER.parents[1]


class PreviewBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.module = self.base / "gathering-crafting"
        (self.module / "data").mkdir(parents=True)
        (self.module / "scripts").mkdir()
        (self.module / "styles").mkdir()
        self.module_json = {
            "id": "gathering-crafting", "version": "1.0.0",
            "compatibility": {"minimum": "14", "verified": "14", "maximum": "14"},
            "description": "Test module", "download": "https://example.invalid/old.zip"
        }
        (self.module / "module.json").write_text(json.dumps(self.module_json))
        (self.module / "scripts/main.js").write_text("console.log('test');")
        (self.module / "styles/module.css").write_text("body {}")
        source = json.loads((ROOT / "data/catalog.json").read_text())
        self.expected = [("recipe:" + e["id"], e["img"]) for e in source["recipes"]] + [
            ("material:" + e["id"], e["img"]) for e in source["materials"]
        ]
        self.assertEqual(len(self.expected), 224)
        (self.module / "data/catalog.json").write_text(json.dumps(source))
        self.overlay = self.base / "overlay.zip"
        items = []
        with zipfile.ZipFile(self.overlay, "w", zipfile.ZIP_DEFLATED) as z:
            for i, (key, url) in enumerate(self.expected):
                rel = url.removeprefix("modules/gathering-crafting/")
                path = self.base / f"{i}.webp"
                Image.new("RGB", (256, 256), (i, (i * 7) % 256, (i * 11) % 256)).save(path, "WEBP")
                data = path.read_bytes()
                z.writestr(rel, data)
                items.append({"id": key, "path": rel,
                              "sha256": hashlib.sha256(data).hexdigest()})
            z.writestr("preview-manifest.json", json.dumps({
                "type": mod.MANIFEST_TYPE, "items": items
            }))
        self.output = self.base / "preview-module.zip"

    def test_build_preserves_catalog_and_module_source(self):
        before = (self.module / "module.json").read_bytes()
        mod.build(self.module, self.overlay, self.output)
        self.assertEqual((self.module / "module.json").read_bytes(), before)
        with zipfile.ZipFile(self.output) as z:
            self.assertIsNone(z.testzip())
            meta = json.loads(z.read("gathering-crafting/module.json"))
            self.assertEqual(meta["version"], mod.VERSION)
            self.assertNotIn("download", meta)
            self.assertEqual(len([n for n in z.namelist() if n.startswith(
                "gathering-crafting/icons/") and n.endswith(".webp")]), 224)
            for key, url in self.expected:
                self.assertIn("gathering-crafting/" + url.removeprefix(
                    "modules/gathering-crafting/"), z.namelist())

    def test_invalid_checksum_blocks_release(self):
        with zipfile.ZipFile(self.overlay) as z:
            archive = {n: z.read(n) for n in z.namelist()}
        rel = self.expected[0][1].removeprefix("modules/gathering-crafting/")
        archive[rel] += b"invalid"
        with zipfile.ZipFile(self.overlay, "w") as z:
            for name, content in archive.items():
                z.writestr(name, content)
        with self.assertRaises(ValueError):
            mod.build(self.module, self.overlay, self.output)
        self.assertFalse(self.output.exists())

    def test_wrong_module_rejected(self):
        (self.module / "module.json").write_text('{"id":"another-module","compatibility":{"verified":"14"}}')
        with self.assertRaises(ValueError):
            mod.build(self.module, self.overlay, self.output)
        self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
