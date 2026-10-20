# Gathering & Crafting v0.8.0 — The Averis Workshop

**Foundry VTT V14 · D&D5e 5.3.3 · English-only UI.** A player-first crafting and gathering module for a fantasy campaign. It uses its own interface and mechanics; it is not a copy of Gatherer or Mastercrafted.

## One simple workflow

1. **Gather**: select an ore deposit or herb patch, then press Gather (Careful or Risky).
2. **Alchemy / Blacksmithing**: open the separate profession tab, see how many required ingredients you own, then press Craft. Use **Craftable only** to hide unavailable recipes; **Craft ×N** crafts in batches up to 10.
3. **Inventory**: inspect real D&D5e materials, crafted goods and monster drops; use **+ / −** to add or remove item quantities, **Use** crafted potions instantly, or open an item's **Item Sheet**.

For players there are four straightforward tabs: **Gather / Alchemy / Blacksmithing / Inventory**. The GM's full catalogue editor is available from the discreet gear icon in the header.

## Content

- **102 ingredients and drops**: 24 ores & minerals, 20 refined metals, 40 alchemical reagents and 18 monster drops.
- **122 unique recipes**: 56 metallurgy outputs + 66 alchemy brews, bombs and utility concoctions.
- **71 harvest node definitions**, including monster-harvest nodes for carcasses, nests, haunts and lairs.
- **224 bundled 256×256 WebP fantasy item illustrations** (102 materials and 122 crafted results). They are painted-style variations derived from original generated fantasy artwork sheets, not 224 distinct commissioned paintings or official 5e images.
- **4 World Item Compendiums**, created automatically when a GM opens the world:
  - `Gathering & Crafting | Ores & Metals`
  - `Gathering & Crafting | Alchemy Ingredients`
  - `Gathering & Crafting | Monster Drops`
  - `Gathering & Crafting | Ready-to-use Items`

**Important upgrade rule:** v0.2 compendiums remain in the world and are not modified. The four newer world packs preserve custom GM artwork while refreshing module-owned artwork and adding missing entries. A generated material is a real `loot` Item with a resource flag. It can be given directly to PCs, NPCs, placed in inventory-bearing loot actors/chests, and gathered again. Dragging an ordinary Item to an empty map does *not* create a ground-loot actor automatically in Foundry.

## Item mechanics (what works now)

- **Daggers, swords and named special blades** are native dnd5e `weapon` Items with a base damage die and an Attack activity.
- **Steel Shield**, **Adamantine Shield** and **Dusksteel Buckler** are native dnd5e `equipment` Items with a shield armor value.
- **Healing potions** are native consumables with a Heal activity, and can also be used from the module Inventory to roll healing and apply HP. The inventory action consumes exactly one dose.
- **Temporary HP tonics** can be Used in module Inventory, roll their dice and apply temporary HP without reducing a larger existing pool.
- **Dozens of utility consumables** are real dnd5e consumables that can be used/consumed immediately from Inventory. Their item description and chat card spell out their effect; non-healing conditions, transformations, resistances, speed, advantage and durations are **GM adjudicated rather than silently automated** in this release. This includes special brews such as **Genderflux Elixir**, **Growth Draught**, **Shrink Sip**, **Featherfall Philter** and many monster-drop recipes. For reliable full automation, the GM can link a prepared dnd5e World Item to any recipe.
- **Ingots, armor components, jewelry and crafting hardware** are real `loot` Items, not fake weapons or incomplete armor pieces with misleading combat bonuses.

This is a **tested prototype**, not an assertion that every advanced Active Effect has been validated in a live dnd5e 5.3.3 server. The mock tests exercise the inventory and data path; a live-world test is still recommended.

## Install / update

**Manifest URL** for Setup → Add-on Modules → Install Module:

`https://raw.githubusercontent.com/Daikaze/Gathering-Crafting/main/module.json`

Or extract the latest ZIP into `Data/modules/gathering-crafting`. Enable in a dnd5e 5.3.3 world and press **Alt+G**. The existing world database is backed up, then only the bundled icon references and schema version are upgraded. All GM-authored recipes, edits, inventory and old compendium items are preserved.

## GM setup

Open the gear in the header → GM Studio. Define new materials, monster drops and harvesting nodes, change drop chance or available nodes, and bind a selected scene token to a harvesting node. To restrict harvesting to actual map sources, turn on Scene-only gathering. By default the quick-access free-gather mode remains enabled for new worlds. World compendiums can be re-synced with the dedicated button; sync **adds missing Items and refreshes bundled artwork only**. It does not overwrite GM-provided images.

`data/materials.csv` and `data/recipes.csv` are portable reference catalogs for offline review. `data/catalog.json` holds the same structured settings, resources and recipes. Check `CHANGELOG.md` for upgrade notes.


## v0.6.0 highlights

- Full fantasy item art pass for every bundled material and recipe.
- Fixed the Show more jump-to-top issue in long lists.


## Bundled item artwork (v0.8.0)

- Includes 224 bundled 256x256 WebP illustrations for all 102 materials and 122 recipes; no external artwork compendiums are scanned.
- Images are rendered from locally stored assets, so the module works without Legacy Content or Potion Crafting & Ingredients.
- Images are fantasy-painted *variants from a smaller source artwork set*, rather than 224 independently hand-painted commissions. The 5e-inspired visual direction is original, not copied from official Wizards of the Coast artwork.
- The migration preserves GM-authored image paths outside installed module/system asset directories, while resetting older mod/system image paths to bundled art.
