# Gathering & Crafting v0.3.0 — Averis Workshop

**Foundry VTT V14 · D&D 5e 5.3.3**. All labels and recipes are English.

A lightweight player-first module inspired by the *workflow* of Gatherer and Mastercrafted, with independent code and styling.

## Players: three tabs
1. **Gather** ore, metal sources, herbs and potion ingredients; choose Careful or Risky.
2. **Craft** from 72 custom metallurgy/alchemy recipes. Filter to **Craftable only**, or craft up to ten at once.
3. **Inventory** shows real 5e material items and potions. Use healing potions to restore HP; view native crafted weapons/shields on their Item Sheets.

An unobtrusive gear button in the header opens **GM Studio**. GM can create new recipes/materials/nodes, bind nodes to scene tokens and change gathering rules without cluttering the player experience.

## Catalog
- 54 ingredients: ores, metals, herbs and potion reagents.
- 72 custom recipes: 12 smelting, 24 forging, 36 alchemy.
- 42 nodes for harvesting.
- **114 individual, custom SVG item artworks** included; all recipes and resources have images.

On first GM startup the module creates three WORLD Item Compendiums: **Ores & Metals**, **Alchemy Ingredients**, **Ready-to-use Items**. The two old v0.2 compendium packs are preserved; nothing already customized is overwritten. Materials are genuine D&D5e loot Items with stable ID flags, transferable to PCs, NPCs and inventory-bearing loot/chest actors. Native daggers, swords and shields have mechanics; healing potions include a Heal activity.

**Potion limitations:** Non-healing tonics still have their effect text on real consumable Items and can be consumed using the module's Inventory Use button, but their ongoing advantage, resistance and condition effects still require GM adjudication or linking a prepared system Item. No hidden Active Effects are applied automatically. Native items should be tried in a backup Foundry world before campaign use.

## Installation
Foundry Setup → Add-on Modules → Install Module → Manifest URL:

`https://raw.githubusercontent.com/Daikaze/Gathering-Crafting/main/module.json`

Or unzip the release into `Data/modules/gathering-crafting`. Enable, then press **Alt+G**. Existing v0.2 world settings are backed up as `backup020`. Source catalogs and editable inventories are preserved.

The data tables are in `data/materials.csv` and `data/recipes.csv`. See `CHANGELOG.md` for the upgrade notes.
