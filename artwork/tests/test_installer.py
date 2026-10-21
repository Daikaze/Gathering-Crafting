"""Regression tests for safe v1.1 artwork ZIP installations.

Uses deterministic RIFF/VP8X test fixtures (not actual art). Original artwork
itself is separately checked by the WebP verifier and visual review.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

HERE = Path(__file__).resolve().parents[1]
INSTALLER = HERE / "install_original_art.py"


def fake_webp(side):
    # Minimal WebP RIFF/VP8X header fixture for the installer's format gates.
    b = bytearray(11000)
    b[:4] = b"RIFF"
    b[4:8] = (len(b) - 8).to_bytes(4, "little")
    b[8:12] = b"WEBP"
    b[12:16] = b"VP8X"
    b[16:20] = (len(b) - 20).to_bytes(4, "little")
    b[24:27] = (side - 1).to_bytes(3, "little")
    b[27:30] = (side - 1).to_bytes(3, "little")
    return bytes(b)


class InstallerTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory(prefix="gc-art-test-")
        self.addCleanup(self.dir.cleanup)
        self.path = Path(self.dir.name)
        self.module = self.path / "module"
        (self.module / "icons/illustrated").mkdir(parents=True)
        (self.module / "module.json").write_text(json.dumps({
            "id": "gathering-crafting", "version": "1.0.0"
        }), encoding="utf-8")
        self.old = b"ORIGINAL ICON WHICH MUST NEVER BE LOST"
        self.illustrated = self.module / "icons/illustrated/craft-test-recipe.webp"
        self.illustrated.write_bytes(self.old)
        self.original_data = fake_webp(1254)
        self.preview_data = fake_webp(512)
        self.bundle = self.path / "source.zip"
        self.write_bundle()

    def write_bundle(self, corrupt=False):
        entries = [
            ("icons/original/recipes/test-recipe.webp", self.original_data),
            ("icons/illustrated/craft-test-recipe.webp", self.preview_data)
        ]
        manifest = {
            "type": "gathering-crafting-partial-original-art",
            "items": [{
                "id": "test-recipe",
                "sha256_original": hashlib.sha256(self.original_data).hexdigest(),
                "sha256_preview": hashlib.sha256(self.preview_data).hexdigest()
            }]
        }
        with zipfile.ZipFile(self.bundle, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("art-overlay-manifest.json", json.dumps(manifest))
            for name, data in entries:
                z.writestr(name, b"damaged" if corrupt and "original" in name else data)

    def run_installer(self, *extra):
        return subprocess.run([
            sys.executable, str(INSTALLER), "--module", str(self.module),
            "--source", str(self.bundle), *extra
        ], encoding="utf-8", capture_output=True)

    def test_dry_run_keeps_existing_icon(self):
        r = self.run_installer("--dry-run")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.illustrated.read_bytes(), self.old)
        self.assertFalse((self.module / "icons/original/recipes/test-recipe.webp").exists())

    def test_two_fast_installs_never_overwrite_original_backup(self):
        self.assertEqual(self.run_installer().returncode, 0)
        self.assertEqual(self.run_installer().returncode, 0)
        snapshots = list((self.module / "artwork-backups").glob(
            "*/icons/illustrated/craft-test-recipe.webp"))
        self.assertEqual(len(snapshots), 2)
        self.assertIn(self.old, [p.read_bytes() for p in snapshots])
        self.assertEqual(self.illustrated.read_bytes(), self.preview_data)

    def test_checksum_tamper_is_rejected_before_writes(self):
        self.write_bundle(corrupt=True)
        r = self.run_installer()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.illustrated.read_bytes(), self.old)

    def test_different_module_is_rejected(self):
        (self.module / "module.json").write_text('{"id":"unrelated-module"}',
                                                 encoding="utf-8")
        r = self.run_installer()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.illustrated.read_bytes(), self.old)


if __name__ == "__main__":
    unittest.main()
