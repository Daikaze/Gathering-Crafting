# Changelog

## 1.0.0 — Artwork-integrity and installable release

- Published the complete 224-item bundled illustration set across 56 Blacksmithing recipes, 66 Alchemy recipes and 102 materials; all asset paths verified against archive contents.
- Added independent WebP file validation, item-path/name audits, duplicate-byte detection and catalogue-data consistency tests.
- Added pull-request checks and an installable ZIP content audit to the GitHub Actions packaging workflow.
- Kept all existing recipes, in-world Compendiums, character inventory transactions, v0.8.2 artwork and safe catalogue migration logic; no data reset is required.
- Art disclosure: 11 individually generated paintings; the remaining 213 are per-item illustrated variants, **not** newly commissioned individual illustrations. Complete individual art coverage and in-Foundry live-world acceptance testing remain outstanding.

## 0.8.2 — Hand-painted Alchemy Batch 01

- Integrated ten individually generated, name-matched hand-painted Alchemy images, including ingredients, one Monster Drop and seven potions.
- Added migration to catalog version 10 with backup082, safe in-world actor/Compendium image refresh, and preservation of GM art overrides.
- Added image format, uniqueness, exact-path and migration regression tests.
- Other items retain their existing fallback art; this is not the finished Alchemy set.

## 0.8.1 — First Original Painted Item

- Added an independently generated, hand-painted D&D-style **Iron Ore** illustration as a standalone bundled WebP (not a crop from an art sheet).
- Updated the Iron Ore catalog image and migration without replacing other artwork or GM custom images.
- This release is only Phase A Batch 01; the remaining items are not yet independently illustrated.

## 0.8.0 — Self-contained Illustrated Items

- Removed Compendium artwork auto-detection, source selectors, rescan UI, and associated script.
- Added 224 bundled 256×256 WebP item illustrations for alchemy, blacksmithing, flowers, ores, and monster drops. Each has its own file; paintings are variants adapted from a smaller custom-generated source set, not 224 independent drawings.
- Added safe v0.8 migration and image refresh for actor Items and owned world compendiums, without overwriting GM-uploaded custom paths.
- Retained existing recipes, inventory management, Show more scroll fix, and four player tabs.

## 0.7.0 — Installed Compendium Artwork Integration

- Auto-detect **Legacy Content** Item Compendiums for **Blacksmithing** and **Potion Crafting & Ingredients** Item Compendiums for **Alchemy**.
- Match image assets by exact item names and carefully chosen D&D5e base-item aliases. Unmatched items keep bundled art.
- Expose detected packs, matched item counts, manual source selection, and Rescan Artwork in **GM Studio**.
- Update module-generated actor items and world Compendiums when the artwork source changes while leaving GM-uploaded images alone.
- Artwork stays on the installed external Compendium; never redistributes another creator's artwork.
- Added regression tests for pack detection, source matching, automatic fallback and manual GM art preservation.

## 0.6.0 — Full Fantasy Art Pass & UX Fixes

- Replaced the bundled item imagery with a stronger **fantasy item art** pass for every bundled material and crafted item.
- Fixed the **Show more** button so expanding lists no longer jumps the window back to the top.
- Added a safe **v0.6.0 migration** and artwork refresh for existing bundled entries while preserving GM custom art.
- Kept the split **Alchemy** and **Blacksmithing** tabs and refreshed the footer copy.

## 0.5.1 — D&D Style Art Pass

- Reworked every bundled item image into a more ornate **D&D-style fantasy inventory look** with parchment, brass framing and stronger loot-icon readability.
- Updated all bundled material and recipe image paths to the new `icons/v6` art set.
- Added a safe **v0.5.1 migration** and backup step that refreshes bundled artwork while preserving player inventories and GM edits.

## 0.5.0 — Easier Player UI & Full Art Pass

- Split the player-facing crafting workflow into separate **Alchemy** and **Blacksmithing** tabs for faster, cleaner navigation.
- Added a fresh **custom artwork pass for every bundled material and recipe**, now using dedicated module-owned images in `icons/v5`.
- Updated the Inventory presentation so the ready items are labeled as **Alchemy Items** and **Blacksmithing Items**.
- Added a safe **v0.5.0 migration** with a backup and image refresh for bundled entries while preserving player inventories and GM edits.

## 0.4.0 — Campaign Expansion

- Expanded the data set to **102 materials**, **122 recipes** and **71 nodes**, including a full **Monster Drop** progression layer for long campaigns.
- Added a fourth world compendium: **Gathering & Crafting | Monster Drops**. Existing world packs remain additive and are never overwritten.
- Added **inventory quantity controls** directly inside the module UI: players/GMs can add or remove materials and crafted items with **+ / −** without opening the character sheet.
- Added a large batch of **custom module-owned images** for the new content; every material and recipe now has its own bundled image reference.
- Added many new **ores, flowers, mushrooms, monster drops and utility brews**, including transformation and exploration items such as **Genderflux Elixir**, **Growth Draught**, **Shrink Sip** and **Featherfall Philter**.
- Added new metallurgy outputs and native D&D5e support for **Steel Spear** and **Dusksteel Buckler**.
- Refreshed the smoke/regression tests to cover the expanded catalog, compendium sync and inventory adjustment workflow.

## 0.3.0 — Player-first Workshop

- Simplified player navigation: **Gather, Craft, Inventory**; moved **GM Studio** to a compact gear button.
- Recipe Book groups Metallurgy and Alchemy with a one-click **Craftable only** filter and available-first sorting.
- Added **Craft ×N** (up to 10) in reliable mode, respecting real available ingredient counts and rollback safety.
- Added 24 painted fantasy artwork thumbnails over the existing 114 per-item SVG icon collection; each material and recipe has its own image.
- Introduced native D&D5e weapon and shield output Items; healing consumables get a healing activity, and temporary-HP tonics update the actor directly from Inventory.
- Switched to three new world compendiums to avoid modifying legacy v0.2 pack content: Ores & Metals, Alchemy Ingredients, Ready-to-use Items.
- On upgrade, backs up v0.2 settings and preserves GM-customized databases; changes only built-in art references where safe.
- Added item-factory structural validations and refreshed smoke tests.

## 0.2.0 — Metallurgy + Alchemy

- Added 54 real inventory resources, 42 nodes, 72 craft recipes and two legacy world compendiums, all English.
- Added safe item transactions, bulk content, chapter filters, map-node binding and GM editor.
