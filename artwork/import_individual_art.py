#!/usr/bin/env python3
"""Import individually exported Canva paintings into the unreleased v1.1 art tree.

No contact-sheet cropping, automatic visual approval or production-catalogue edits.
Requires Pillow: python -m pip install pillow

Examples:
  python artwork/import_individual_art.py --source "D:/Exports/Gathering-Crafting"
  python artwork/import_individual_art.py --source "D:/Exports/Gathering-Crafting" --apply

Use names like recipe__iron-nails.png, material__dragon-scale.jpg,
or the exact icons/original/recipes/<id>.webp path.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    print("ERROR: Pillow is required: python -m pip install pillow", file=sys.stderr)
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "artwork" / "production-manifest.json"
EXTS = (".webp", ".png", ".jpg", ".jpeg")
CHECKS = ("singleStandaloneImage", "noCrop", "fullSubjectVisible",
          "visuallyDistinct", "correctItem", "approved")


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=".art-stage-", dir=path.parent, delete=False) as stream:
        stage = Path(stream.name)
        stream.write(data)
    try:
        os.replace(stage, path)
    finally:
        stage.unlink(missing_ok=True)


def locate(source, category, slug, target):
    bases = [
        source / Path(target).with_suffix(""),
        source / category / slug,
        source / f"{category}__{slug}",
        source / f"{category}-{slug}",
    ]
    matches = [b.with_suffix(ext) for b in bases for ext in EXTS if b.with_suffix(ext).is_file()]
    if len(matches) > 1:
        raise ValueError("Multiple sources for " + category + ":" + slug +
                         " — keep only one exported image")
    return matches[0] if matches else None


def make_webp(original):
    with Image.open(original) as opened:
        opened.load()
        width, height = opened.size
        if width != height or width < 1024:
            raise ValueError(f"{original.name}: square >=1024px required, got {width}x{height}")
        if opened.n_frames != 1:
            raise ValueError(f"{original.name}: animation not accepted")
        image = ImageOps.exif_transpose(opened).convert("RGB")
        if image.width != image.height:
            raise ValueError(f"{original.name}: rotated/non-square image")
        # Preserve original full-frame composition; no grid crops or new objects.
        out = io.BytesIO()
        image.save(out, format="WEBP", quality=95, method=6)
        return out.getvalue(), image.size


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True, type=Path)
    p.add_argument("--apply", action="store_true", help="Write files and update manifest")
    a = p.parse_args()
    source = a.source.resolve()
    if not source.is_dir():
        p.error("Source must be a directory with individual exported images")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if len(manifest["items"]) != 224:
        raise ValueError("Expected exactly 224 manifest entries")
    prepared = []
    seen = {}
    for item in manifest["items"]:
        category, slug = item["id"].split(":",1)
        target = item["target"]
        expected = f"icons/original/{category}s/{slug}.webp"
        if target != expected:
            raise ValueError("Unexpected target for " + item["id"])
        src = locate(source, category, slug, expected)
        if src is None:
            continue
        if item["status"] == "approved":
            raise ValueError("Refusing to overwrite approved art: " + item["id"])
        data, size = make_webp(src)
        digest = hashlib.sha256(data).hexdigest()
        if digest in seen:
            raise ValueError("Duplicate image bytes: "+seen[digest]+" and "+item["id"])
        seen[digest] = item["id"]
        prepared.append((item, src, data, digest, size))
    if not prepared:
        print("No individually named export files found; nothing changed.")
        return
    print(f"Preflight: {len(prepared)}/224 matched individual paintings, all >=1024px and square.")
    if not a.apply:
        print("Dry-run mode: no files, manifest or release changed.")
        return
    original_manifest = MANIFEST.read_bytes()
    output_paths = [ROOT / item["target"] for item,_,_,_,_ in prepared]
    for dest in output_paths:
        if not dest.resolve().is_relative_to(ROOT.resolve()):
            raise ValueError("Unsafe destination: "+str(dest))
    originals = {dest:(dest.read_bytes() if dest.exists() else None) for dest in output_paths}
    backup_base = ROOT / "artwork-backups"
    backup_base.mkdir(exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix="canva-import-", dir=backup_base))
    for dest,previous in originals.items():
        if previous is not None:
            atomic_write(backup / dest.relative_to(ROOT), previous)
    written = []
    try:
        for item,src,data,digest,size in prepared:
            dest = ROOT / item["target"]
            atomic_write(dest,data)
            written.append(dest)
            item["status"] = "generated"  # NOT approved without human QA
            item["sourceImage"] = src.name
            item["generatedImage"] = item["target"]
            item["sha256"] = digest
            item["review"] = {key:False for key in CHECKS}
            item["generationRequest"] = {
                "provider":"Canva export or individually painted source",
                "state":"binary-imported-awaiting-visual-approval",
                "source":src.name
            }
        # The manifest finished value counts approvals, not imported candidates.
        manifest["finished"] = sum(x["status"] == "approved" for x in manifest["items"])
        atomic_write(MANIFEST, (json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode("utf-8"))
    except BaseException:
        for dest in written:
            previous=originals[dest]
            if previous is None:
                dest.unlink(missing_ok=True)
            else:
                atomic_write(dest,previous)
        atomic_write(MANIFEST,original_manifest)
        raise
    print(f"Imported {len(written)} real individual WebP files into the v1.1 working tree.")
    print("All new entries have status 'generated', NOT 'approved'.")
    print("No changes to module.json, published ZIP or either production catalogue.")
    print("Backups stored in: " + str(backup))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("ERROR: " + str(exc),file=sys.stderr)
        sys.exit(1)
