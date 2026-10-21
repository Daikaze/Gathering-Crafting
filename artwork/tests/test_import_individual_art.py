"""Tests for safe ingestion of individually exported fantasy item artwork."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

FILE=Path(__file__).resolve().parents[1]/"import_individual_art.py"
spec=importlib.util.spec_from_file_location("gc_art_import",FILE)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
REAL=Path(__file__).resolve().parents[1]/"production-manifest.json"


class ImportCanvaTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)/"module"
        self.root.mkdir()
        self.manifest=self.root/"artwork"/"production-manifest.json"
        self.manifest.parent.mkdir()
        self.manifest.write_bytes(REAL.read_bytes())
        self.input=self.root/"exports"
        self.input.mkdir()
        self.target=self.root/"icons/original/recipes/brass-ingot.webp"
        self.manifestBefore=self.manifest.read_bytes()

    def call(self,apply=False):
        args=["import_individual_art.py","--source",str(self.input)]
        if apply: args.append("--apply")
        with patch.object(mod,"ROOT",self.root), patch.object(mod,"MANIFEST",self.manifest):
            with patch.object(sys,"argv",args), contextlib.redirect_stdout(io.StringIO()):
                mod.main()

    def create_image(self,name,shape=(1024,1024),color=(20,100,180)):
        p=self.input/name
        p.parent.mkdir(parents=True,exist_ok=True)
        Image.new("RGB",shape,color).save(p)
        return p

    def test_dry_run_makes_no_changes(self):
        self.create_image("recipe__brass-ingot.png")
        self.call()
        self.assertEqual(self.manifest.read_bytes(),self.manifestBefore)
        self.assertFalse(self.target.exists())

    def test_import_never_marks_unreviewed_art_approved(self):
        self.create_image("recipe__brass-ingot.png")
        self.call(apply=True)
        self.assertTrue(self.target.is_file())
        item=json.loads(self.manifest.read_text())["items"][0]
        self.assertEqual(item["status"],"generated")
        self.assertEqual(item["generatedImage"],"icons/original/recipes/brass-ingot.webp")
        self.assertEqual(item["review"]["approved"],False)

    def test_non_square_art_is_rejected_without_writes(self):
        self.create_image("recipe__brass-ingot.png",(1280,720))
        with self.assertRaisesRegex(ValueError,"square"):
            self.call(apply=True)
        self.assertFalse(self.target.exists())
        self.assertEqual(self.manifest.read_bytes(),self.manifestBefore)

    def test_duplicate_export_paths_are_rejected(self):
        self.create_image("recipe__brass-ingot.png")
        self.create_image("recipe__brass-ingot.jpg")
        with self.assertRaisesRegex(ValueError,"Multiple sources"):
            self.call(apply=True)
        self.assertFalse(self.target.exists())


if __name__=="__main__":
    unittest.main()
