# Independent D&D artwork production (not yet released)

This workstream addresses the reported problem with incorrectly cropped artwork
and repeated images in Gathering & Crafting v1.0.0.

## Non-negotiable art acceptance criteria

- **224 original standalone paintings** for **224 individual catalog entries**:
  56 Blacksmithing recipes, 66 Alchemy recipes, and 102 raw/refined/creature materials.
- Every image is generated as a **new individual composition**. Never draw a grid
  or contact sheet and cut it into tiles. Never use a recolored base image or
  copy an image between two separate entries, even where their names match.
- Square 1024 × 1024 high-fantasy painterly D&D inventory illustration,
  12–15% free space around the subject, full item visible without clipping.
  No letters, logos, legibility-limiting dark overlays or adjacent objects.
- The subject must accurately depict the item (e.g. Blacksteel Plates are
  armor plates; Mithral Chain is chain, not a generic sword).
- Review each artwork by eye for object accuracy, center/framing, original
  composition and similarity to other catalog art. Hashes alone cannot detect
  near-duplicate images; name-matched filenames alone do not prove originality.

`artwork/production-manifest.json` is the 224-entry checklist and contains a
**different item-specific brief and target WebP filename for every item**.
Entries remain `not-generated` until the original image is successfully
created, saved to this repository under `icons/original/`, inspected and
marked approved by a human.

Run `node artwork/verify.cjs` to validate the workstream at any point.
Run `node artwork/verify.cjs --complete` to enforce final release readiness.
Do not update `data/catalog.json`, `scripts/catalog.js`, version or download
URL from this branch until the --complete audit passes AND the Foundry V14
catalogue/art migration has been reviewed.

**Current status:** planning and individualized generation briefs only;
v1.0.0 remains the previously published release. Generating a generic artwork
sheet is NOT considered progress against the 224 unique artworks.
