#!/usr/bin/env python3
"""Safe installer for original Gathering & Crafting recipe artwork.
Usage: python artwork/install_original_art.py --module . --source path/to/overlay.zip
Only replaces recipe illustrations in a known overlay ZIP; makes backups first.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import zipfile

VALID_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

def dimensions(data):
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Not WebP")
    if int.from_bytes(data[4:8], "little") + 8 != len(data):
        raise ValueError("Malformed RIFF length")
    kind = data[12:16]
    if kind == b"VP8 ":
        width = int.from_bytes(data[26:28], "little") & 0x3fff
        height = int.from_bytes(data[28:30], "little") & 0x3fff
    elif kind == b"VP8L":
        a, b, c, d = data[21:25]
        width = 1 + (a | ((b & 63) << 8))
        height = 1 + ((b >> 6) | (c << 2) | ((d & 15) << 10))
    elif kind == b"VP8X":
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
    else:
        raise ValueError("Unknown WebP compression")
    if width != height or width < 256:
        raise ValueError(f"Expected square WebP >=256; got {width}x{height}")
    return width

def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=".gc-art-", dir=path.parent, delete=False) as f:
        tmp = Path(f.name)
        f.write(data)
    try:
        os.replace(str(tmp), str(path))
    finally:
        if tmp.exists():
            tmp.unlink()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--module", required=True, type=Path)
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    root = args.module.resolve()
    try:
        info = json.loads((root / "module.json").read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        ap.error("Module root must contain module.json")
    if info.get("id") != "gathering-crafting":
        ap.error("Not the Gathering & Crafting module")
    files, shas = {}, set()
    with zipfile.ZipFile(args.source) as z:
        plan = json.loads(z.read("art-overlay-manifest.json"))
        if plan.get("type") != "gathering-crafting-partial-original-art":
            raise ValueError("Unrecognized overlay ZIP")
        for item in plan["items"]:
            identifier = item["id"]
            if not VALID_ID.fullmatch(identifier):
                raise ValueError("Invalid item identifier")
            orig = f"icons/original/recipes/{identifier}.webp"
            preview = f"icons/illustrated/craft-{identifier}.webp"
            for name, digest_key in ((orig, "sha256_original"), (preview, "sha256_preview")):
                if name in files:
                    raise ValueError(f"Duplicate file: {name}")
                raw = z.read(name)
                dim = dimensions(raw)
                if name == orig and dim < 1024:
                    raise ValueError("Source artwork must be at least 1024x1024")
                digest = hashlib.sha256(raw).hexdigest()
                if digest != item[digest_key]:
                    raise ValueError(f"Hash mismatch: {name}")
                files[name] = raw
            if item["sha256_original"] in shas:
                raise ValueError("Duplicated original artwork")
            shas.add(item["sha256_original"])
    print(f"Validated {len(shas)} unique original art files and {len(files)} WebPs.")
    if args.dry_run:
        print("Dry run: no files changed")
        return
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = root / "artwork-backups" / f"original-art-install-{timestamp}"
    existing = {}
    for rel in files:
        target = (root / rel).resolve()
        if not target.is_relative_to(root):
            raise ValueError(f"Unsafe path: {rel}")
        existing[rel] = target.read_bytes() if target.is_file() else None
    for rel, data in existing.items():
        if data is not None:
            atomic_write(backup / rel, data)
    applied = []
    try:
        for rel, data in files.items():
            atomic_write(root / rel, data)
            applied.append(rel)
    except BaseException:
        for rel in reversed(applied):
            old = existing[rel]
            if old is None:
                (root / rel).unlink(missing_ok=True)
            else:
                atomic_write(root / rel, old)
        raise
    atomic_write(backup / "install-report.json", json.dumps({
        "ids": [x["id"] for x in plan["items"]],
        "backups": str(backup),
        "affected_files": len(files)
    }, indent=2).encode("utf-8"))
    print(f"Installed {len(shas)} unique recipe artworks. Backups: {backup}")
    print("Existing recipe references work without modifying Foundry catalogues.")
    print("Restart Foundry and refresh your browser cache (Ctrl+F5).")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
