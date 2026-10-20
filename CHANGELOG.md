# Changelog

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
