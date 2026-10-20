# Changelog

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
