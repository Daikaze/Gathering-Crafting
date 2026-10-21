# Gathering & Crafting — v1.1 Preview Update (224 temporary icons)

**Status: PREPARED, NOT PUBLISHED.** This is a manual-install preview for Foundry VTT V14 / dnd5e 5.3.3. It preserves published v1.0.0. It is not the original planned release containing 224 separately painted 1024px images.

## Exact state
- A 224-icon WebP overlay ZIP was built and visually reviewed in the ChatGPT conversation. It contains **84 GM-approved temporary icons** plus **140 curated temporary images** from the previous atlas sheets.
- **All 224 images are 256x256** (some were upscaled from smaller cells), and every entry has its own SHA-256 checksum and unique catalogue ID.
- **11 nonstandard image paths** in the real catalogue have been handled, including seven handpainted alchemy recipe paths, iron ore, kingsfoil, glowshroom and spider silk.
- The ZIP is **not committed in this GitHub repository**, because the GitHub connection accepts text updates but does not receive binary bytes directly from the ChatGPT conversation's generated ZIP. Committing this document is **not** the same as shipping the icon binaries.
- Existing `artwork/verify.cjs --complete` must **continue failing** for original 1024px assets until all original artwork acceptance conditions are met.

## Build a full Foundry preview update from the overlay

Download `gathering-crafting-v11-all-224-preview-icons.zip` from the conversation and keep it as a separate file. Then on a checkout of the module repository or your existing Foundry Data/modules/gathering-crafting folder:

```powershell
py -m pip install Pillow
py artwork/build_preview_update.py --module . --icons "./gathering-crafting-v11-all-224-preview-icons.zip" --output "./gathering-crafting-v1.1.0-preview.1.zip"
```

If building from an installed module folder, invoke the builder via its absolute path instead of the relative `artwork/build_preview_update.py` path, and supply `--module "D:\Foundry\FoundryVTT\Data\modules\gathering-crafting"`.

The builder verifies **all 224** exact canonical IDs, the real `catalog.json` image paths, the ZIP members, SHA-256, 256x256 WebP format, and unique images. Then it constructs a **full installable module ZIP** with `gathering-crafting/` at its root. It does not change source files. The generated module is version `1.1.0-preview.1` and deliberately has no automatic update/download URL: this is a preview, not a published stable release.

For **icon-only installation**, the conversation overlay already includes `install-preview.py`; run it with `--module <folder>` to dry-run and `--apply` to install with backups. It leaves the module version at 1.0.0.

## GitHub Actions staging

The manually dispatched `Build Foundry v1.1 Preview` workflow can produce an Actions artifact **after** the icon ZIP has been committed at `artwork/input/gathering-crafting-v11-all-224-preview-icons.zip`. It does not publish to `main` or change the stable update feed. Do not create a GitHub release from this preview with 224 original-art claims.

## Testing

```powershell
py -m unittest discover -s artwork/tests -p "test_*.py" -v
node artwork/verify.cjs
```

The dedicated `test_preview_update.py` test verifies packaging, checksum rejection and preservation of the original module file.

**Release readiness: Not ready for final v1.1.** Only temporary 256px icon coverage is complete; standalone original-art gate and real Foundry UI verification remain outstanding.
