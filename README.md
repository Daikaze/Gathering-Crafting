# Gathering & Crafting — v0.1.0 (prototype)

Independent Foundry VTT module built for **Foundry V14** and **D&D 5e 5.3.3**.

## Install from GitHub (recommended)

1. In **Foundry Setup > Add-on Modules > Install Module**, paste this Manifest URL:

   `https://raw.githubusercontent.com/Daikaze/Gathering-Crafting/main/module.json`

2. Click **Install**, then enable the module under **Manage Modules** inside your D&D 5e world.
3. For future versions, check for module updates using Foundry's normal Add-on Modules updater.

Repository: https://github.com/Daikaze/Gathering-Crafting

## Install (manual ZIP)

1. Extract ZIP so your Foundry data folder contains `Data/modules/gathering-crafting/module.json`.
2. Restart Foundry if the module is not listed. Enable **Gathering & Crafting** under **Manage Modules** in your D&D 5e world.
3. Open the **Actors** tab and look for the Gathering & Crafting launcher; alternatively press **Alt+G** (configurable under Keybindings), or use `game.modules.get("gathering-crafting").api.open()` in the browser console.
4. Select a character in the module window. Players require **Owner** permission over the selected character.

## Player workflow

- **Gathering**: choose a gathering node, then **Careful** (DC -2, standard drop) or **Bold** (DC +3, double drop on success). Roll one d20 check, spend one attempt whether successful or not; successes add physical loot items to the actor inventory. The bonus drop probability is rolled on a successful gathering action.
- **Crafting**: choose a recipe, check your owned resources. **Standard** crafting always succeeds and produces 1x defined output, **Inspired** crafting spends one extra unit of the first ingredient and checks a d20 skill roll vs recipe DC. A success doubles quantity, failure still produces the normal amount.
- **Materials**: shows counts taken from the *real owned items* in the D&D actor inventory.

## GM Studio

- Add, modify, delete materials, gathering nodes and crafting recipes.
- Link a recipe to an existing **World Item** to produce fully functional D&D 5e Item copies (weapons, potions, equipment, etc.). If no Item is linked, the crafted output is a **loot** placeholder with no mechanical effect.
- Control the maximum attempts per character, and manually reset attempts on the selected character.
- A starter database of eight resources, five nodes and six recipes is included (per World).
- Library is stored in a Foundry **world** setting; attempt counters are stored in actor **flags**. Do not delete these if you want to keep data.

## Current limitations (planned to improve after testing)

- **Gathering nodes are global**, not placed on the map or tied to a scene/region yet. Do not present this prototype as map-gated gathering.
- Attempts do not reset automatically on long rest; the GM resets them for now. Limit is per selected actor, and a reset button is available.
- Only Items from the **World Items Directory** are selectable as functional recipe output sources (not compendium links in this iteration).
- Starter recipes with no linked Item create regular `loot` with descriptive text, not immediately usable healing potions/weapons.
- No user-submitted icon uploads or specialized artwork yet. Font Awesome icons represent resources, nodes and recipes.
- Concurrency: actions are locked within a window, but very rapid attempts made simultaneously from different connected user clients are not protected by a server-side transaction. For this test version, do not operate on the same character inventory concurrently from multiple clients.
- Browser/Foundry-runtime checks still require a live test world; this ZIP is a first in-game testing build.

## Developer-facing API

```js
game.modules.get("gathering-crafting").api.open(actor?)
game.modules.get("gathering-crafting").api.getDatabase()
```

The module does not modify existing actor/item sheets or replace any native D&D 5e features.
