#!/usr/bin/env python3
"""Safely stage the approved 224-icon temporary visual update into a checkout.

Usage:
  python tools/apply-preview-224.py --overlay /path/to/approved-overlay.zip
  python tools/apply-preview-224.py --overlay /path/to/approved-overlay.zip --apply

The overlay must contain 224 separate WebP files, at exactly the catalogue img
paths and SHA256 values in artwork/preview-224-manifest.json. Does not mark
the 1024px original-art manifest as completed. No game rules are modified.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import zipfile


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=".gc-preview-stage-", dir=path.parent, delete=False) as stream:
        temp = Path(stream.name)
        stream.write(data)
    try:
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def validate_catalogue(root, items):
    data = json.loads((root / "data/catalog.json").read_text(encoding="utf-8"))
    expected = {
        **{"recipe:" + x["id"]: x for x in data["recipes"]},
        **{"material:" + x["id"]: x for x in data["materials"]},
    }
    if len(items) != 224 or len(expected) != 224:
        raise ValueError("Expected 224 unique recipe/material IDs")
    seen_paths, seen_hashes = set(), set()
    for item in items:
        ident = item["id"]
        if ident not in expected:
            raise ValueError("Unknown item " + ident)
        rel = item["path"]
        if not isinstance(rel, str) or not rel.startswith("icons/") or rel.startswith("/") or "\\" in rel:
            raise ValueError("Unsafe icon path " + repr(rel))
        parts = Path(rel).parts
        if ".." in parts or Path(rel).suffix != ".webp":
            raise ValueError("Unsafe icon path " + rel)
        if expected[ident]["img"] != "modules/gathering-crafting/" + rel:
            raise ValueError("Catalog img mismatch for " + ident)
        if ident != ("recipe:" if ident.startswith("recipe:") else "material:") + expected[ident]["id"]:
            raise ValueError("Catalog ID mismatch " + ident)
        if rel in seen_paths:
            raise ValueError("Repeated image destination " + rel)
        seen_paths.add(rel)
        digest = item.get("sha256")
        if not isinstance(digest, str) or len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
            raise ValueError("Invalid SHA256 for " + ident)
        if digest in seen_hashes:
            raise ValueError("Repeated artwork image hash for " + ident)
        seen_hashes.add(digest)
    if seen_paths != set("icons/" + x["img"].split("/icons/", 1)[1] for x in expected.values()):
        raise ValueError("Catalogue coverage mismatch")


def dimensions(data):
    if len(data) < 30 or data[0:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Not a WebP image")
    if int.from_bytes(data[4:8], "little") + 8 != len(data):
        raise ValueError("WebP RIFF byte length incorrect")
    kind = data[12:16]
    if kind == b"VP8 ":
        if data[23:26] != b"\x9d\x01\x2a":
            raise ValueError("Bad VP8 header")
        return (int.from_bytes(data[26:28],"little") & 0x3fff,
                int.from_bytes(data[28:30],"little") & 0x3fff)
    if kind == b"VP8L":
        if data[20] != 0x2f:
            raise ValueError("Bad lossless WebP signature")
        return (1 + (data[21] | ((data[22] & 0x3f) << 8)),
                1 + ((data[22] >> 6) | (data[23] << 2) | ((data[24] & 15) << 10)))
    if kind == b"VP8X":
        return (1 + int.from_bytes(data[24:27],"little"),
                1 + int.from_bytes(data[27:30],"little"))
    raise ValueError("Unknown WebP container format")


def inspect(root, archive, manifest):
    items = manifest["items"]
    validate_catalogue(root, items)
    prepared = {}
    with zipfile.ZipFile(archive) as bundle:
        entries = [x for x in bundle.infolist() if not x.is_dir()]
        seen = set()
        for item in entries:
            if item.filename in seen or item.filename.startswith("/") or ".." in Path(item.filename).parts or "\\" in item.filename:
                raise ValueError("Archive duplicate or unsafe path " + repr(item.filename))
            if (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Symlinks are not allowed in overlay")
            seen.add(item.filename)
        for entry in items:
            rel = entry["path"]
            if rel not in seen:
                raise ValueError("Image absent from archive: " + rel)
            data = bundle.read(rel)
            if hashlib.sha256(data).hexdigest() != entry["sha256"]:
                raise ValueError("Original icon hash mismatch for " + entry["id"])
            if dimensions(data) != (256, 256):
                raise ValueError("Icon not exactly 256×256 for " + entry["id"])
            prepared[rel] = data
    if len(prepared) != 224:
        raise ValueError("Not all 224 icons prepared")
    return prepared


def apply_files(root, files):
    originals = {}
    for rel in files:
        dest = (root / rel).resolve()
        if not dest.is_relative_to(root.resolve()):
            raise ValueError("Path escaped module " + rel)
        originals[rel] = dest.read_bytes() if dest.is_file() else None

    backup_parent = root / "artwork-backups"
    backup_parent.mkdir(parents=True, exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix="approved-preview-224-", dir=backup_parent))
    for rel, original in originals.items():
        if original is not None:
            atomic_write(backup / rel, original)

    completed = []
    try:
        for rel, data in files.items():
            atomic_write(root / rel, data)
            completed.append(rel)
        audit = {
            "installed": len(completed),
            "iconPixels": 256,
            "releaseNote": "Approved as temporary preview, not independent 1024px art",
            "files": completed,
            "previouslyAbsent": [rel for rel, old in originals.items() if old is None],
        }
        atomic_write(backup / "install-audit.json", (json.dumps(audit, indent=2) + "\n").encode())
    except BaseException:
        for rel in reversed(completed):
            if originals[rel] is None:
                (root / rel).unlink(missing_ok=True)
            else:
                atomic_write(root / rel, originals[rel])
        raise
    return backup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--overlay", type=Path, required=True)
    parser.add_argument("--module", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = args.module.resolve()
    if not (root / "module.json").is_file():
        parser.error("Expected Foundry module.json in module path")
    if json.loads((root / "module.json").read_text(encoding="utf-8"))["id"] != "gathering-crafting":
        parser.error("Wrong module")
    manifest_path = Path(__file__).resolve().parents[1] / "artwork/preview-224-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    prepared = inspect(root, args.overlay, manifest)
    print("Verified all 224 unique preview icons, full catalogue ID coverage, hashes, and 256px WebP dimensions.")
    if args.apply:
        backup = apply_files(root, prepared)
        print("Wrote 224 icons safely. Backup:", backup)
        print("No module.json, game rules or original-art QA approvals changed.")
    else:
        print("DRY RUN: no files changed. Use --apply after reviewing this validation.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
        print("ERROR:", exc, file=sys.stderr)
        raise SystemExit(1)
