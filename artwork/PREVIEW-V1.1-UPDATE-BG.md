# Gathering & Crafting v1.1.0-preview.1 — manual icon update

Prepared on 2026-10-21 for **Foundry VTT 14 / dnd5e 5.3.3**, based on the published v1.0.0. **This is an update/overlay for an existing installed module, not a self-contained reinstallable public release.** Published main v1.0.0 remains unchanged.

## Prepared package

The complete archive `gathering-crafting-v1.1.0-preview-update.zip` was delivered in the ChatGPT conversation. Its precise SHA-256 is:

`65d3f29c0592fd579d006cf9ecd1cfb235323338ca4a4f33f5d47976d7c8c8a2`

The archive itself is **not hosted on GitHub**, because this connector cannot transfer local binary WebP files; do not invent a public download link or change module.json's published download URL.

- 224 distinct 256×256 WebP files, 224 unique SHA-256 hashes, exact 224 catalogue ID mappings
- 122 Blacksmithing + Alchemy recipe entries and 102 materials
- 84 selected temporary icons accepted for the current pass
- 66 themed Alchemy previews (identity based on visual theme, not original source verification)
- 74 other atlas previews
- Corrected **11 handpainted catalogue paths** (10 path adjustments versus earlier overlay, plus spider-silk already correct) so the images display where the existing module actually points.

## Installation

Close Foundry, back up the full Foundry Data folder, extract the ZIP to a separate directory and run in PowerShell:

```powershell
py apply-update.py --module "D:\Foundry\FoundryVTT\Data\modules\gathering-crafting"
py apply-update.py --module "D:\Foundry\FoundryVTT\Data\modules\gathering-crafting" --apply
```

The first run is a dry-run; only the second applies changes. It checks image hashes, WebP 256px dimensions, all 224 IDs, current image paths in installed `data/catalog.json` and module identity/version. Before writing, it makes a unique `artwork-backups/v1.1-preview-*` directory with the previous `module.json` and **all replaced existing icons, including the 11 original high-res handpainted icons**. It atomically copies images and changes only local module.json version/description to `1.1.0-preview.1`. Gameplay scripts and catalog data are not changed.

Restore a backup with `--rollback "path/to/artwork-backups/v1.1-preview-..."`.

## QA performed on assembled package

- 224/224 image checksums, unique paths/IDs and 256×256 WebPs, ZIP CRC passed
- Dry-run of simulated installed v1.0.0 passed without any writes
- Installation of all 224 passed, changing version to v1.1.0-preview.1
- 11 handpainted asset paths match actual catalogue, correct backups exist
- Two quick consecutive installs generated separate backups
- Rollback restored old files and original module.json exactly
- Corrupt input rejected before modifying any installed file
- Runtime scripts, stylesheet and catalogue were unchanged

**Actual graphical Foundry VTT V14 runtime testing is still required.** These tests validate the install/update process on a representative installed-module structure, not in-game rendering.

## Release limitations

Atlas crops at 256×256 are not newly hand-painted 1024×1024 originals, despite matching the complete 224-entry catalogue. Earlier strict 224-original-art acceptance checks **must stay in place** for a final version. Keep this PR in draft and do **not** merge or publish a stable 1.1.0 or point auto-updates at an absent ZIP.

To later ship via automatic GitHub Foundry updates, first import and commit the binary assets and build a full module ZIP with the JS/CSS/catalogue, then change version and download URL together.