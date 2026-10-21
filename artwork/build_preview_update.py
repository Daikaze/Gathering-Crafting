#!/usr/bin/env python3
"""Build a safe manual-install Gathering & Crafting v1.1 preview from a module checkout and the complete 224-icon ZIP.

Examples:
 python artwork/build_preview_update.py --module . --icons ./gathering-crafting-v11-all-224-preview-icons.zip
 python artwork/build_preview_update.py --module "D:/Foundry/FoundryVTT/Data/modules/gathering-crafting" --icons "./gathering-crafting-v11-all-224-preview-icons.zip"

This does not change source files or publish an automatic GitHub release.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import zipfile
from PIL import Image

VERSION = "1.1.0-preview.1"
MANIFEST_TYPE = "gathering-crafting-v11-complete-224-temporary-preview"
SKIP_TOP = {".git", ".github", "dist", "staging", "artwork", "artwork-backups", "tests", "__pycache__"}

def validation_info(module_dir, overlay_path):
    cfg = json.loads((module_dir / "module.json").read_text(encoding="utf-8-sig"))
    if cfg.get("id") != "gathering-crafting":
        raise ValueError("Wrong module ID; not Gathering & Crafting")
    if str(cfg.get("compatibility", {}).get("verified")) != "14":
        raise ValueError("Module is not verified for Foundry V14")
    catalog = json.loads((module_dir / "data/catalog.json").read_text(encoding="utf-8-sig"))
    ordered = [("recipe:" + item["id"], item["img"]) for item in catalog["recipes"]] + [
        ("material:" + item["id"], item["img"]) for item in catalog["materials"]
    ]
    if len(ordered) != 224 or len({x[0] for x in ordered}) != 224:
        raise ValueError("Expected 224 distinct catalogue items")
    prefix = "modules/gathering-crafting/"
    if any(not url.startswith(prefix) for _, url in ordered):
        raise ValueError("Catalogue references an image outside this module")
    expected = {key: url[len(prefix):] for key, url in ordered}
    with zipfile.ZipFile(overlay_path, "r") as z:
        if z.testzip():
            raise ValueError("ZIP contains a corrupted member")
        plan = json.loads(z.read("preview-manifest.json"))
        if plan.get("type") != MANIFEST_TYPE or len(plan.get("items", [])) != 224:
            raise ValueError("Incorrect or incomplete preview manifest")
        source_paths, image_hashes, ids, images = set(), set(), set(), {}
        for item in plan["items"]:
            key, rel, digest = item["id"], item["path"], item["sha256"]
            if key not in expected or rel != expected[key]:
                raise ValueError("Icon path does not match actual Foundry catalogue: " + key + " / " + rel)
            pp = Path(rel)
            if (pp.is_absolute() or ".." in pp.parts or not rel.startswith("icons/")
                    or pp.suffix.lower() != ".webp" or rel in source_paths or key in ids):
                raise ValueError("Unsafe or duplicate image target: " + rel)
            data = z.read(rel)
            sha = hashlib.sha256(data).hexdigest()
            if sha != digest or sha in image_hashes:
                raise ValueError("Invalid checksum or reused icon: " + key)
            with Image.open(io.BytesIO(data)) as im:
                im.verify()
            with Image.open(io.BytesIO(data)) as im:
                if im.format != "WEBP" or im.size != (256, 256):
                    raise ValueError("Expected one 256x256 WebP: " + key)
            ids.add(key); source_paths.add(rel); image_hashes.add(sha); images[rel] = data
        if ids != set(expected):
            raise ValueError("Missing catalogue IDs")
    return cfg, catalog, plan, images

def build(module_dir, overlay_zip, output):
    cfg, catalog, plan, images = validation_info(module_dir, overlay_zip)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="gc-v11-preview-") as tmp:
        stage = Path(tmp) / "gathering-crafting"
        def ignore(folder, filenames):
            if Path(folder).resolve() == module_dir.resolve():
                return [name for name in filenames if name in SKIP_TOP]
            if Path(folder).name == "icons":
                return [name for name in filenames if name == "illustrated-assets"]
            return [name for name in filenames if name in ("__pycache__", ".git")]
        shutil.copytree(module_dir, stage, ignore=ignore)
        for rel, data in images.items():
            dest = stage / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        new_cfg = dict(cfg)
        new_cfg["version"] = VERSION
        new_cfg["description"] = (cfg.get("description", "") +
            " 1.1 PREVIEW: 224 user-selected temporary WebP icons; manual installation only."
        ).strip()
        new_cfg.pop("download", None)
        new_cfg.pop("manifest", None)
        (stage / "module.json").write_text(json.dumps(new_cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        (stage / "artwork-preview-manifest.json").write_text(json.dumps({
            "status": "224 visual preview icons; not 224 standalone original 1024px paintings",
            "approvedTempIcons": 84,
            "otherThematicTempIcons": 140,
            "source": overlay_zip.name,
            "items": plan["items"]
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        for item in catalog["recipes"] + catalog["materials"]:
            src = item["img"].removeprefix("modules/gathering-crafting/")
            if not (stage / src).is_file():
                raise ValueError("Packaged module missing: " + src)
        tmp_zip = output.parent / ("." + output.name + ".tmp")
        try:
            with zipfile.ZipFile(tmp_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
                for file in sorted(stage.rglob("*")):
                    if file.is_file():
                        z.write(file, "gathering-crafting/" + file.relative_to(stage).as_posix())
            with zipfile.ZipFile(tmp_zip) as z:
                if z.testzip():
                    raise ValueError("Produced ZIP failed integrity test")
                installed = json.loads(z.read("gathering-crafting/module.json"))
                if installed["version"] != VERSION or installed["id"] != "gathering-crafting":
                    raise ValueError("Bad packaged module metadata")
            tmp_zip.replace(output)
        finally:
            tmp_zip.unlink(missing_ok=True)
    print(f"Built {output}: {len(images)} unique 256x256 preview icons; {VERSION}")
    print("MANUAL preview update; not a published GitHub release or original-art milestone.")

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--module", required=True, type=Path)
    ap.add_argument("--icons", required=True, type=Path)
    ap.add_argument("--output", type=Path, default=Path("gathering-crafting-v1.1.0-preview.1.zip"))
    a = ap.parse_args()
    build(a.module.resolve(), a.icons.resolve(), a.output.resolve())

if __name__ == "__main__":
    main()
