# Gathering & Crafting v1.3.7 — The Averis Workshop

**Foundry VTT V14 (14.367+) · D&D 5e 6.0.6 · English-only UI.**

## v1.3.7 — D&D 5e 6.0.6 compatibility

- Updated the Foundry module manifest and UI version to target **D&D 5e 6.0.6**.
- New crafting results use D&D 5e 6.x native physical Item fields: structured weight (system.weight.value), rarity sets (system.rarities), and valid itemUses consumption on potion Activities. Potion uses consume one dose and can remove an empty stack when activated through the native sheet.
- Enchanting recognizes D&D 6.x rarity sets and retains its existing weapon, armor, shield, and wearable restrictions, slot limits, prices, world-day delays, tool requirements and GM-only DCs.
- Preserves recipe data, all art, existing world Items, Actor progression, custom inventories, and stored enchantments. No forced world-item rewrite or catalogue migration is introduced by this version; D&D's own migrations handle older item schemas.
- Regression tests cover native item field formats, potion use, existing Blacksmith armor and Enchanting rarity limits. **In-world verification is still required**, particularly for advanced item Active Effects and third-party modules.

## Prior release notes (v1.3.6)

## v1.3.6 — Complete Blacksmith item descriptions and real wearable Items

All **56 Blacksmith recipes** now have full, English, player-facing descriptions explaining what each result actually does. Recipe descriptions appear in the Blacksmithing tab, newly produced Item sheets and new compendium items.

- **Steel Chain Shirt** now produces native dnd5e **Equipment**: Medium Armor, **AC 13 + Dexterity (maximum +2)**.
- **Copper Bracers, Steel Gauntlets, Steel Greaves, Steel Helm, Silver Circlet, Platinum Circlet, Moonsteel Diadem and Dragonsilver Charm** now produce equipable native Equipment Items, compatible with the appropriate Enchanting equipment types.
- These eight pieces of wearable gear have **no invented AC bonus or spell effect**. Only compatible applied enchantments can provide further properties.
- Already functioning weapons (7 types) and shields (3 types) retain their attack/defense stats. Unassembled parts (Blacksteel Plates, Mithral Chain, Starmetal Spearhead, arrowheads, etc.) remain crafting goods, not finished wearable equipment.
- Finished weapons and wearable equipment use crafting quality tiers for their rarity/Enchantment slot ceiling: Tier I Common, Tier II Uncommon, Tier III Rare, Tier IV Very Rare. This does not itself make a weapon magical.
- Built-in catalogue schema is **v11**. On GM startup the module upgrades old default Blacksmith recipe descriptions; it preserves GM-custom descriptions, custom recipes and current recipe images. It backs up the prior database as \`backupBlacksmith110\`.
- Already-crafted Items with an unmodified original description receive the replacement text, retaining additional notes and enchantments. **Existing Loot Item documents are not forcibly converted to Equipment**, because changing an embedded Item type in place may damage existing world data. Newly crafted items use the correct native types. Similarly, compendium synchronization does not overwrite GM-edited or previously created compendium Items: new entries are correct but older copies may need manual replacement.

Five new native Blacksmith regression checks run in GitHub Actions alongside existing crafting, Enchanting and artwork tests.

## One simple workflow

1. **Gather**: select an ore deposit or herb patch, then press Gather (Careful or Risky).
2. **Alchemy / Blacksmithing**: open the separate profession tab, see how many required ingredients you own, then press Craft. Use **Craftable only** to hide unavailable recipes; **Craft ×N** crafts in batches up to 10.
3. **Inventory**: inspect real D&D5e materials, crafted goods and monster drops; use **+ / −** to add or remove item quantities, **Use** crafted potions instantly, or open an item's **Item Sheet**.

For players there are five straightforward tabs: **Gather / Alchemy / Blacksmithing / Enchanting / Inventory**. The GM's full catalogue editor is available from the discreet gear icon in the header.

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

This release passes automated asset/inventory regression checks, but is **not** an assertion that every advanced Active Effect has been validated in a live dnd5e 5.3.3 server. The mock tests exercise the inventory and data path; a live-world test is still recommended.

## v1.3.5 — Physical tools only; proficiency gives Advantage

- **A physical tool item is the only skill/tool prerequisite** for Gathering, Alchemy, Blacksmithing, and Enchanting. Characters without tool proficiency can work normally; the matching **tool proficiency grants Advantage (2d20kh)** rather than unlocking access. D&D5e proficiency bonuses in existing roll calculations are preserved where applicable.
- **Foundry V14 inventory detection fixed:** item names, normal and curly apostrophes, +1 variants, `system.type.baseItem`, custom `system.identifier`, quantity, and `gathering-crafting.toolKey` flags are recognized for stock and custom items. A listed proficiency alone does not count as owning a tool.
- **Enchanting no longer requires enchanter rank training or separately learning formula recipes.** Enchantment tiers still determine item rarity eligibility, equipment category restrictions, and available slots; existing learned ranks/formulas are retained as saved data but no longer block making enchantments.
- Enchanting requires physical **Jeweler's Tools** or **Enchanter's Tools**. New Enchanting jobs make an Arcana check at completion: normal roll without matching tool proficiency; Advantage when proficient. On failure, the job is delayed one world day and can be retried without losing the Item. Existing unfinished jobs from prior versions retain their former completion rules.
- The actual target **DC remains GM-only** (public chat shows roll totals and outcomes; GMs get private DC checks). No automatic gold deduction; displayed gp remains market/service value.
- Updated interface shows detected tool and whether the character has Advantage, instead of the old mandatory study and rank training controls.

## v1.3.4 — Crafting button beside Affinity

- On a D&D5e character sheet that has an **Affinity** navigation tab, the small **Crafting** launcher now appears **immediately after Affinity** in the same tab bar. Hover text retains the full **Gathering & Crafting** name.
- Removed the extra full-width header-row launcher on such sheets and prevented duplicate buttons after rerendering.
- The Crafting button opens the same workshop window, without activating or replacing the Affinity tab.
- On NPC sheets and other unsupported sheet layouts that do not have Affinity, the previous header launcher remains available. If a third-party module inserts Affinity later, the button relocates automatically.
- Actor Directory access and the Enchantment Powers quick-use controls stay in place. Existing item records, recipes, enchantments, character data and world settings are unchanged.

## v1.3.3 — Enchantments restricted to exact equipment categories

Each enchantment now states **Compatible with:** and lists the allowed equipment categories on its card. The same restriction is verified again when beginning the enchantment, so a Shield-only formula cannot be applied to a Robe or Sword.

- **Weapon types:** Swords, Daggers, Axes, Hammers, Maces, Spears, Polearms, Bows, Crossbows, Staves, and broader melee/ranged/physical traits where appropriate.
- **Armor:** Light, Medium, Heavy Armor and Shields are classified separately.
- **Robes and accessories:** Robes, Boots, Cloaks, Gloves, Helmets, Rings, Amulets and Belts are recognized as individual wearable types when stored as dnd5e Equipment Items.
- Added 14 specialized wearable enchantments, bringing the catalogue to **107 enchantments**: 49 weapon and 58 armor, robe, shield and wearable formulas.
- The Enchanting Item selector shows the selected Item's equipment category. Every card explains allowed types, and the Enchant action is disabled when the selected Item is incompatible. Item flags are preserved, and existing pending enchantments and learned formulas are retained.
- All previous GM-only DC rules, free personal enchanting, market-value GP labels, proficiency tiers and slot requirements remain unchanged. The complete category list is in [ENCHANTING_CATALOG.md](ENCHANTING_CATALOG.md).

## v1.3.2 — Fixed elemental enchantments, stable scrolling, rank ordering

- Removed the **Elemental damage type** dropdown in Enchanting. Instead, choose one of five dedicated cards for **Elemental Binding** (Fire, Cold, Lightning, Acid, Thunder), or the five matching **Greater Elemental Binding** cards. Each card states its exact damage type, price, duration and slot requirement.
- The workshop now lists **93 enchantments** (49 weapon, 44 armor/shield), **sorted by required Enchanting rank** from Novice to Master, with names alphabetized within each rank.
- Search results, item selectors, enchantment filters and other dropdown changes now **preserve the scrolling position inside the workshop** rather than jumping to the top. Switching main tabs still starts at the top intentionally.
- Learned generic Elemental Binding formulas from earlier versions remain valid across their corresponding fixed-element variants. In-progress and completed legacy enchantments retain their original chosen damage type. No Item flags, prices, slots or required ranks are reset.
- Keeps the v1.3.1 GM-only DC rules and reference-only market prices. See [the full current Enchanting catalogue](ENCHANTING_CATALOG.md).

## v1.3.1 — Private DCs, shorter Enchanting, market-value prices

- **All target DCs are GM-only** in Gathering, Alchemy, Blacksmithing and Enchanting. Public chat shows the result without revealing the target; exact DC comparisons are whispered to GMs. DCs embedded in potion/recipe flavor descriptions are also masked in the player-facing workshop.
- **Shortened Enchantment crafting times** by approximately 30% (minimum one day). Examples: Arcane Infusion **5 → 4 days**, Greater Arcane Infusion **10 → 7**, Phoenix Binding **14 → 10**. Proficiency training and individual formula study times are shortened too.
- **GP represents market/service value only** (e.g., "Market value: 250 gp"). No gold is deducted from the enchanter when training, learning or applying any enchantment. An empty coin purse does not block crafting. No customer transaction is automatically created.
- The original 85 Enchantment **market prices stay the same**. Equipment restrictions, learned-formula requirements, enchant slots, passive effects and item-power charges remain intact.
- Already-started jobs keep their saved completion timestamps; past payments are not automatically refunded. **See [the current Enchanting reference](ENCHANTING_CATALOG.md).**

**The older release notes below describe their historical behavior; the v1.3.1 rules above take precedence.**

## v1.3.0 — Enchanting profession, 85 enchantments and item restrictions

Enchanting now contains **85 learnable formulas: 41 weapon and 44 armor/shield enchantments**. The original 25 enchantments retain their price and completion days; the other 60 are homebrew expansions. Read the [full Enchanting catalogue](ENCHANTING_CATALOG.md) for every price, time, proficiency level and compatible equipment type.

### Learning Enchanting
- New characters begin **Untrained**, and must carry a physical **Jeweler's Tools** or **Enchanter's Tools** item.
- Learn Enchanting proficiency through **Novice (3 days / 50 gp / DC 10), Apprentice (5 / 150 gp / DC 12), Adept (7 / 400 gp / DC 14), Expert (10 / 900 gp / DC 16), and Master (14 / 2000 gp / DC 18)**.
- Training is a world-time job. On completion, roll Arcana (INT + Arcana proficiency and existing Enchanting rank). Failure adds one world day to retry; payment is made only once.
- Enchantments are not automatically known at each rank: **research each formula separately**. Studying also costs gp, world days, and requires an Arcana check.
- The UI shows rank, study progress, known enchantments, compatible equipment, and reasons actions are locked.

### Item limits and character-sheet powers
- Weapon requirements distinguish melee/ranged, blade, bow, crossbow, staff, polearm, bludgeoning, and piercing weapons; armor requirements distinguish light, medium, heavy and shields.
- Common items: **1 slot / max Rank 2**; Uncommon **2 / Rank 3**; Rare **3 / Rank 4**; Very Rare **4 / Rank 5**; Legendary **5 / Rank 5**. Some elite enchantments cost **2 slots**. The GM can override capacity from 0 to 6 on a particular Item.
- Prevents duplicate, incompatible, conflicting, or simultaneous enchantments. Already-started jobs from v1.2 can still finish.
- Character sheets gain optional **Enchantment Powers** quick-use controls for equipped items with once-per-Long-Rest powers. These buttons track remaining uses and recover when the system reports a Long Rest; they do not automatically choose targets or resolve spells.
- +1/+2 magical weapon enhancements use native dnd5e fields. Elemental weapon bonus dice are added to the item's base damage formula. Simple passive skill bonuses, saving throw bonuses and item-granted damage resistances are written as native item Active Effects where the Foundry system supports them. Advanced conditional spells, targets and other reactions still require GM adjudication.
- All existing Gathering, Alchemy, Blacksmithing, Inventory and source artwork assets remain unchanged.

## v1.2.0 — Enchanting

A new **Enchanting** tab provides 11 weapon and 14 armor enchantments, with the exact GP costs and in-world day durations supplied by the campaign GM. "Magewoven Interior" is the corrected name for the supplied "agewoven Interior" entry.

- Choose one nonstacked weapon or armor/shield already in the active character's inventory. Select elemental damage type for Elemental Binding (Fire, Cold, Lightning, Acid or Thunder).
- Click **Begin Enchantment**, confirm, and pay the listed amount from D&D5e character currency. The module records a pending job on that specific Item. It does not consume ingredients or advance world time.
- When sufficient **Foundry world time** has passed (24 hours per campaign day), click **Complete Enchantment**. Applied enchantments persist as Item flags and description notes; duplicate or conflicting enchantments cannot stack. One enchantment job per item at a time.
- **Arcane Infusion** and **Greater Arcane Infusion** write native dnd5e magical weapon bonus values (+1/+2). Other enchanted abilities (including elemental damage, extra spells, once-per-rest powers, resistances, conditions, and stealth/Arcana modifiers) are described on the Item for GM adjudication, **not falsely presented as automated**. These effects can be automated in a subsequent iteration.
- Original player inventory, existing item descriptions, crafting recipes and gathering nodes are preserved. No artwork assets need to change.

**Note:** Gold is charged when beginning a job. There is currently no cancel/refund button, and one active enchantment per item. Enchanting does not support stacked Items or item categories other than weapons and equipment classified as armor/shields. Character currency is normalized across denominations to make correct change; review the new coin balances when testing.

## v1.1.2 — artwork packaging repair

The v1.1.1 packaging workflow unintentionally extracted **older** artwork ZIP bundles over the 224 reviewed WebPs when building the installable archive. This explains mismatched pictures in installed worlds, even where the corresponding GitHub source WebP (for example, Supreme Healing Potion) is correct. v1.1.2 removes the unsafe extraction, verifies all 224 recorded SHA-256 icon hashes before packaging **and in the extracted installable ZIP**, and cache-busts built-in artwork displayed in the module interface. No recipes, gathering nodes, inventories or GM-selected custom image paths are changed. After installing, fully refresh the Foundry browser tab to evict any older cached images. Existing character-sheet item icons may also require a hard refresh.

## v1.1.1 — gathering and crafting rules

- Unlimited gathering is supported.
- Gathering and crafting require the appropriate physical tool in character inventory and relevant tool proficiency, according to the module's tool rules.
- Crafting rolls take character level, proficiency bonus and tool bonuses into account. A failed roll is not treated as an automatic success.
- This update retains the 224 curated item icons from v1.1.0 and Foundry V14 / dnd5e 5.3.3 compatibility.

## v1.1.0 update — reviewed item artwork

The original recipes, harvesting and inventory systems are unchanged. The update replaces **224 locally bundled item images** at their existing catalogue paths, including 11 special handpainted-path locations. Every item gets a unique image file and the integrity-checking workflow verifies SHA-256 hashes so older artwork bundles cannot overwrite the new selections.

**Artwork disclaimer:** These are uniformly prepared temporary 256×256 D&D icons; a portion were selected from larger contact sheets, and 140 were curated thematically. They are not 224 unique 1024×1024 original paintings. The update is suitable for regular inventory display; inspect the art before treating it as high-resolution originals.

## Install / update

**Manifest URL** for Setup → Add-on Modules → Install Module:

`https://raw.githubusercontent.com/Daikaze/Gathering-Crafting/main/module.json`

Or extract the latest ZIP into `Data/modules/` (the ZIP already contains the `gathering-crafting/` directory). Enable in a dnd5e 5.3.3 world and press **Alt+G**. The existing world database is backed up, then only the bundled icon references and schema version are upgraded. All GM-authored recipes, edits, inventory and old compendium items are preserved.

## GM setup

Open the gear in the header → GM Studio. Define new materials, monster drops and harvesting nodes, change drop chance or available nodes, and bind a selected scene token to a harvesting node. To restrict harvesting to actual map sources, turn on Scene-only gathering. By default the quick-access free-gather mode remains enabled for new worlds. World compendiums can be re-synced with the dedicated button; sync **adds missing Items and refreshes bundled artwork only**. It does not overwrite GM-provided images.

`data/materials.csv` and `data/recipes.csv` are portable reference catalogs for offline review. `data/catalog.json` holds the same structured settings, resources and recipes. Check `CHANGELOG.md` for upgrade notes.


## v1.1.0 release validation

- All 224 catalogue entries have a distinct, locally bundled WebP file. **No image is missing** from the archive; both professions and the materials catalog load without an external item-art module.
- All 224 items now have unique, user-curated 256×256 WebP images with distinct file hashes. The set combines 84 GM-approved temporary icons and 140 thematic selections. Some were cropped and upscaled from generated image sheets; **these are not 224 independently painted 1024px originals**. The separate high-resolution art production milestone remains open.
- GitHub Actions tests the catalogue, recipes, inventory rollback, scroll retention, native D&D5e item data, compendium upgrades and all artwork paths. It also audits the installable ZIP for 224 WebP files.
- A Foundry V14 live-world validation is still recommended before replacing a production campaign install. Back up your World folder before upgrading.

## v0.6.0 highlights

- Full fantasy item art pass for every bundled material and recipe.
- Fixed the Show more jump-to-top issue in long lists.


## Bundled item artwork (v0.8.0)

- Includes 224 bundled 256x256 WebP illustrations for all 102 materials and 122 recipes; no external artwork compendiums are scanned.
- Images are rendered from locally stored assets, so the module works without Legacy Content or Potion Crafting & Ingredients.
- Images are fantasy-painted *variants from a smaller source artwork set*, rather than 224 independently hand-painted commissions. The 5e-inspired visual direction is original, not copied from official Wizards of the Coast artwork.
- The migration preserves GM-authored image paths outside installed module/system asset directories, while resetting older mod/system image paths to bundled art.

## Original hand-painted item art — Phase A / Batch 01 (v0.8.1)

- **Iron Ore** now uses its own independently generated fantasy painting, bundled under `icons/handpainted/iron-ore.webp`.
- All other items retain the previous illustrative art for now; no claim is made that the 224 existing cropped/variant images are individually painted.
- New art loads without any external Compendium packs. The migration preserves GM-set custom images and original item data.

## Individually painted Alchemy art — Batch 01 (v0.8.2)

- Ten **separate, named, 640×640 painted WebP items** have been integrated: Kingsfoil, Glowshroom, Spider Silk, Wyvern Poison, Dragonfire Tonic, Healing Potion, Growth Draught, Featherfall Philter, Genderflux Elixir, and Voidward Philter.
- Artwork is included **locally in the module** under `icons/handpainted/alchemy/`; it does **not** fetch images from external Compendiums.
- Other Alchemy items retain their existing fallback illustrations until they receive separately painted replacements. Do not treat this as the complete Alchemy art set.
- On world update, only module-owned / previous imported images are changed. GM-picked image paths are preserved.
