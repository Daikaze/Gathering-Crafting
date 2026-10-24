# Foundry V14 preview art update — v1.1.0 (staging)

This branch prepares an update of **Gathering & Crafting** using the user's **224 selected 256×256 WebP temporary icons** (84 explicitly approved, plus 66 thematic potions and 74 board matches). These are NOT 224 new 1024px hand-painted originals. Do not merge with the separate original-art PR #3.

## Installing the images into this checkout

Download the file `gathering-crafting-v11-all-224-preview-icons.zip` from the ChatGPT conversation. Extract it, then copy its `icons/` directory into the root `icons/` directory in this checkout, overwriting the existing icon paths from the catalog. No catalog path changes should be needed: the manifest paths are the existing catalog paths.

After copying, run:

```bash
node scripts/verify-preview-icons.cjs
```

Only after 224 icons pass the integrity test, use the normal Foundry module packaging procedure to assemble an installable update. Do not mark the original-art production manifest as 224 approved originals. Do not merge and publish v1.1.0 while the icon binaries are absent.

**Reason for staging:** The GitHub connector cannot read local files from this ChatGPT session or upload a local ZIP automatically. All 224 image bytes are available in the downloadable ChatGPT package, but they are not yet in the GitHub branch. This README and validator are the staging update, not a complete release.

Preserve compatibility with Foundry VTT 14 and dnd5e 5.3.3; do not change character rules, recipe catalog or other functionality. Keep the existing v1.0.0 update manifest/download links until the new tested ZIP is genuinely committed.
