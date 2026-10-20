# Gathering & Crafting v0.3.0 — The Averis Workshop

**Foundry VTT V14 · D&D5e 5.3.3 · English-only UI.** A player-first crafting and gathering module for a fantasy campaign. It uses its own interface and mechanics; it is not a copy of Gatherer or Mastercrafted.

## One simple workflow

1. **Gather**: select an ore deposit or herb patch, then press Gather (Careful or Risky).
2. **Craft**: choose Metallurgy or Alchemy, see how many required ingredients you own, then press Craft. Use **Craftable only** to hide unavailable recipes; **Craft ×N** crafts in batches up to 10.
3. **Inventory**: inspect real D&D5e materials; **Use** crafted potions here or open a forged weapon/shield's **Item Sheet**. No separate imaginary inventory.

For players there are just **Gather / Craft / Inventory** tabs. The GM's full catalogue editor is available from the discreet gear icon in the header.

## Content

- **54 ingredients**: 14 ores & minerals, 12 refined metals, 28 alchemical reagents.
- **72 unique recipes**: 12 smelting + 24 forging + 36 alchemy formulas.
- **42 harvest node definitions**, many rare nodes disabled by default until the GM opens their area.
- **114 per-item vector images**, with **24 additional hand-painted custom images** for representative ores, flowers, potions and forged items.
- **3 new World Item Compendiums**, created automatically when a GM opens the world:
  - `Gathering & Crafting | Ores & Metals`
  - `Gathering & Crafting | Alchemy Ingredients`
  - `Gathering & Crafting | Ready-to-use Items`

**Important upgrade rule:** v0.2 compendiums remain in the world and are not modified. These v0.3 packs are separate to preserve any manual edits made to older Items. A generated material is a real `loot` Item with a resource flag. It can be given directly to PCs, NPCs, placed in inventory-bearing loot actors/chests, and gathered again. Dragging an ordinary Item to an empty map does *not* create a ground-loot actor automatically in Foundry.

## Item mechanics (what works now)

- **Daggers, swords and named special blades** are native dnd5e `weapon` Items with a base damage die and an Attack activity.
- **Steel Shield** and **Adamantine Shield** are native dnd5e `equipment` Items with a shield armor value.
- **Healing potions** are native consumables with a Heal activity, and can also be used from the module Inventory to roll healing and apply HP. The inventory action consumes exactly one dose.
- **Temporary HP tonics** can be Used in module Inventory, roll their dice and apply temporary HP without reducing a larger existing pool.
- **Other 29 consumables** are real dnd5e consumables that can be used/consumed immediately from Inventory. Their item description and chat card spell out their effect; non-healing conditions, resistances, speed, advantage and durations are **GM adjudicated rather than silently automated** in this release. For reliable full automation, the GM can link a prepared dnd5e World Item to any recipe.
- **Ingots, armor components, jewelry and crafting hardware** are real `loot` Items, not fake weapons or incomplete armor pieces with misleading combat bonuses.

This is a **tested prototype**, not an assertion that every advanced Active Effect has been validated in a live dnd5e 5.3.3 server. The mock tests exercise the inventory and data path; a live-world test is still recommended.

## Install / update

**Manifest URL** for Setup → Add-on Modules → Install Module:

`https://raw.githubusercontent.com/Daikaze/Gathering-Crafting/main/module.json`

Or extract the latest ZIP into `Data/modules/gathering-crafting`. Enable in a dnd5e 5.3.3 world and press **Alt+G**. The existing world database is backed up to `gathering-crafting.backup020`, then only the bundled icon references and schema version are upgraded. All GM-authored recipes, edits, inventory and old compendium items are preserved.

## GM setup

Open the gear in the header → GM Studio. Define new materials and harvesting nodes, change drop chance or available nodes, and bind a selected scene token to a harvesting node. To restrict harvesting to actual map sources, turn on Scene-only gathering. By default the quick-access free-gather mode remains enabled for new worlds. World compendiums can be re-synced with the dedicated button; sync **adds missing Items only**.

`data/materials.csv` and `data/recipes.csv` are portable reference catalogs for offline review. `data/catalog.json` holds the same structured settings, resources and recipes. Check `CHANGELOG.md` for upgrade notes.
