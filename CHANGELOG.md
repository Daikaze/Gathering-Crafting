# Changelog

## 1.3.6 — Blacksmith descriptions and native Equipment Items

- Expanded all 56 Blacksmith output descriptions (English, gameplay-grounded) consistently in the built-in catalogue, JSON and CSV.
- Made Steel Chain Shirt native medium armor with base 13 AC and Dex max +2; made eight other wearable metal goods native equipable D&D5e Equipment instead of Loot.
- Integrated crafted bracers, headwear and charms with equipment-specific Enchanting categories, without giving them unearned defenses or magical powers.
- Added quality rarity to finished weapons/armor/accessories so their enchanting slot ceilings follow recipe tier.
- Added a backup-backed, GM-safe v11 catalogue migration: update only the previous bundled description strings and corresponding unmodified crafted Item description paragraphs; preserve GM descriptions, images, custom recipes and existing enchantments. Legacy Loot types remain untouched for safety.
- Added five Blacksmith unit tests and expanded the complete Foundry mock regression, with enforcement in the publish workflow.

## 1.3.5 — Inventory tools required; proficiency optional with Advantage

- Removed mandatory tool-proficiency gates from Gathering, Alchemy, Blacksmithing and Enchanting.
- Matching tool proficiency confers Advantage on checks; an actual physical tool item remains required.
- Fixed dnd5e tool detection for names, curly apostrophes, +1 variants, baseItem, identifier and custom toolKey flags.
- Removed compulsory Enchanting rank training and individual formula research; retained tiers for item rarity and slot restrictions.
- New Enchanting jobs make a completion Arcana check, using Advantage when proficient; a failed check extends work by one world day. Older pending jobs retain their completion rules.
- Updated tool display and expanded regression tests. GM-only DCs and reference-only market prices are unchanged.

## 1.3.4 — Character-sheet Crafting launcher after Affinity

- Moved the character-sheet Gathering & Crafting action from the full-width sheet header into the primary navigation row directly after **Affinity**, displaying the shorter label **Crafting**.
- Prevented duplicated launchers and unrelated sheet-tab activation; added compatibility with anchor/button navigation markup and delayed third-party Affinity tabs.
- Kept the legacy header launcher on sheet layouts without an Affinity tab, plus all Actor Directory access and Enchantment Powers.
- Added Foundry V14 smoke regressions for button placement, click handling, rerender idempotence and fallback behavior.

## 1.3.3 — Explicit equipment restrictions and robe support

- Added clear **Compatible with:** labels to every enchantment and enforced the whitelist server-side before beginning work.
- Classified dnd5e weapon families, Light/Medium/Heavy Armor, Shields, Robes and worn Boots, Cloaks, Gloves, Helmets, Rings, Amulets and Belts.
- Added 14 specialized wearable formulas for robes, boots, cloaks, gloves and accessories: **107 total**, 49 weapon and 58 armor/gear.
- Blocked invalid enchantments, such as putting a robe-only enchantment on a shield or a bow-only enchantment on a sword.
- Preserved existing enchantment jobs, saved elemental choices, learned formulas, GM-only DC visibility, gold as market value and rank/item slot gates.
- Added pure-rules and full workshop regression tests for equipment classification and incompatible actions.

## 1.3.2 — Elemental cards, stable scroll and rank ordering

- Removed the general Elemental damage selector and replaced the two generic selectable formulas with ten separate type-specific options: Fire, Cold, Lightning, Acid and Thunder for standard and Greater Elemental Binding.
- Increased available Enchanting cards from 85 to **93** (49 weapon, 44 armor/shield), sorted by proficiency rank ascending and alphabetically within a rank.
- Saved the inner scroll position before all ApplicationV2 rerenders, including search and dropdown changes; avoid search-field focus scrolling the page to the top.
- Preserved existing learned generic elemental formulas and Item enchantment flags; legacy jobs finish with their original damage type.
- No changes to market values, DC visibility, training requirements or non-Enchanting recipes.

## 1.3.1 — GM-only DCs and Enchanting market values

- Hide all Gathering, Alchemy, Blacksmithing and Enchanting check DC values from non-GM interfaces and public messages; send exact roll-vs-DC details via GM-only whispers.
- Mask potion/recipe description saving throw DCs from non-GM workshop displays.
- Reduce Enchantment world-time durations by about 30%, and shorten proficiency training and formula study times.
- Keep all 85 Enchantment price values **as market/service prices only**; remove automatic character coin deductions and gold availability gates for Enchanting, rank training and formula research.
- Keep existing pending world-time deadlines, jobs, enchant restrictions, slots, character-sheet powers and all non-Enchanting functionality.
- Add regression tests for zero-gold enchanters, market-value UI, shortened jobs and GM-only check displays/chat reports.

## 1.3.0 — 85 enchantments and learnable Enchanting proficiency

- Expanded Enchanting from 25 to **85**: 41 weapon and 44 armor/shield formulas.
- Added learnable five-rank Enchanter proficiency, Jeweler's Tools / Enchanter's Tools requirements, paid in-world lessons, Arcana check gates, delayed retry on failure and individual formula research.
- Added weapon-type, armor-type, item-rarity and enchantment-slot restrictions, duplicate/conflict checks and GM-only per-Item capacity override.
- Added item power Use buttons in Enchanting and directly on character sheets; uses reset via the dnd5e Long Rest hook.
- Preserved native +1/+2 bonuses, added elemental base-damage formulas, passive bonus Active Effects and resistance Active Effects where Item effects are supported. Complex spell resolution, targets and conditional combat effects remain GM-adjudicated.
- Preserved existing v1.2 pending enchantment jobs, world records and crafting recipes. Added regression tests for ranks, learning, eligibility and Long Rest power recovery.

## 1.2.0 — Enchanting profession tab

- Added 25 English-only weapon and armor enchantments (11 weapon / 14 armor) with GM-supplied gold costs, crafting days, and effects.
- Added owned weapon/armor selector and selectable elemental damage type.
- On confirmation, deduct gold; store the pending job directly on the Item, persist across sessions, and unlock completion after elapsed Foundry world time.
- Complete enchantment to add Item flags and descriptive effects; Arcane Infusion +1/+2 uses native dnd5e magical bonus field. Non-native effects remain GM-adjudicated rather than unreliable automatic effects.
- Prevent repeating/conflicting enchantments and simultaneous jobs on the same item. No cancellation/refund tool yet.
- Added pure catalogue/economy/time unit tests, Foundry V14 smoke coverage and responsive UI styles. Existing crafting, artwork and inventory remain unchanged.

## 1.1.2 — Repair mismatched artwork in distributable ZIP

- Stopped extracting older illustrated-assets archives over the 224 reviewed item icons during CI packaging (the v1.1.1 regression).
- Audit every approved WebP with SHA-256 before packaging, then extract the final ZIP and audit all 224 WebP bytes again before publication.
- Cache-bust module-owned artwork image URLs in Gathering / Alchemy / Blacksmithing / Inventory views without changing GM-selected custom art paths or existing world records.
- Keep Foundry V14/dnd5e 5.3.3 compatibility and all existing gathering, crafting and inventory rules.

## 1.1.1 — Unlimited gathering and tool-gated crafting

- Enabled unlimited gathering.
- Required appropriate physical tools in inventory and matching tool proficiency for gathering/crafting, with rule-based overrides.
- Added crafting rolls factoring in character level, proficiency bonus and tool bonuses, including actual crafting failure handling.
- Expanded Foundry V14 mocks and CI checks for tool requirements, proficiency handling and crafting formulas.
- Preserved the 224 curated temporary WebP icons, existing content and Foundry V14 / dnd5e 5.3.3 compatibility.

## 1.1.0 — 224 reviewed temporary D&D item icons

- Updated all **224 item icon binaries** to unique, user-selected and size-normalized 256×256 WebP images: 84 from the approved replacement package, 66 thematic alchemy choices, and 74 Blacksmithing/material images from the review sheets.
- Retained exact existing catalogue paths (including eleven handpainted-path entries). Recipes, DCs, crafting items, gathering nodes, inventories and GM overrides were not rewritten.
- Added fixed SHA-256 audit for all 224 assets. Prevented older illustrated artwork ZIPs from overwriting current images when producing the Foundry module release archive.
- Maintained Foundry V14 and dnd5e 5.3.3 compatibility; original v1.0.0 distribution remains available for rollback.
- **Source disclosure:** 256px images are not all new individually hand-painted 1024px originals. Some were cropped from generated fantasy icon sheets and visually selected for their items. The 224-original high-resolution milestone is still outstanding.


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
