# Preview update: 224 icons + optional tool proficiency (21 October 2026)

A **single ZIP installer** has been built and locally tested from the chat assets for Gathering & Crafting on Foundry V14 / dnd5e 5.3.3.

## Code committed to this branch

- `scripts/tool-rules.js`: checks actor's built-in dnd5e proficiency in **smith**, **alchemist**, and **herb** tools. No tool proficiency is mandatory. Untrained checks use `2d20kl1 + @bonus` (disadvantage); proficient checks use `1d20 + @bonus`.
- `scripts/main.js`: applies that policy to gathering and Inspired crafting (preserving Reliable crafting's existing no-roll success), adds player-facing status text.
- `artwork/tests/tool-proficiency.test.cjs`: exercises missing data, untrained/trained, expertise, half-proficiency, and correct dnd5e tool abbreviations. GitHub Actions passed.

## Artwork corrected in the local ZIP

| Canonical item | Visual correction | Final preview SHA-256 |
|---|---|---|
| `material:tin-ingot` | leather → grey metal bar | `aef07743c5bcacf0d09f2acfe788b0c615c7a2132da29c7e96623151be16ec77` |
| `material:starmetal-ingot` | leather → magical ingot | `707e49a584d6dafc775e4d51dbad4b8533f3d092a901f79a5c792ae6020917ba` |
| `recipe:golden-seal` | round silver seal → golden seal | `096cb671ee60a6a5fd5716c7731b91a00e313f6fae6ceb9d8398543ec697c51d` |
| `recipe:silvered-arrowheads` | ivory fangs → silver point | `cc3194b6db5de423f8e7d85c43d2d555e7db60cda8612a7afac804308f28e41f` |
| `material:amber-resin` | liquid ampoule → amber crystal | `c88d07bd9784b2e741315184197acd69ea0cc0a38dc0b8adbda0d9f7c3da3c79` |

The **10 unusual `icons/handpainted/...` paths** (7 potions + 3 materials) were crosschecked against `data/catalog.json` and the already-created 224-file ZIP. They **already match**; no path rewrites were necessary. See `artwork/reviews/icon-corrections-2026-10-21.json`.

## Local ZIP QA

- Exactly 224 ID-distinct assets with distinct SHA-256, WebP format and 256×256 dimensions.
- Single ZIP installer preflights all assets, target module ID, script patch anchors and hashes before changes.
- In a Foundry-directory simulation, dry-run produced no writes, apply installed all 224, a second apply was idempotent, and two consecutive backups remained distinct.
- Partial/corrupt assets stop preflight; existing `module.json` and world settings are not rewritten.

**Release constraint:** the downloadable 224-icon preview ZIP (3.3 MB, created in the chat workspace) has **not** been committed as binary files to GitHub. GitHub contains only the rules, tests and audit map. Do not merge the draft PR, bump the published version, or claim that a public Foundry module update contains these images until the complete asset bytes are actually uploaded. The original 1024×1024 artwork requirements are also not met.
