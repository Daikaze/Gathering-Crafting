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


## Safe partial artwork integration (working preview, not a new release)

The first 20 real, standalone 1254x1254 Blacksmithing paintings have been
visually reviewed from their original individual files in a separate
downloadable 20-art overlay ZIP. They have **not yet been uploaded to GitHub**.
Do not mark these 20 entries as approved in production-manifest.json until
the actual binary WebP files have been imported, audited, and committed.

For an installed Foundry V14 Gathering & Crafting v1.0.0, the overlay includes
20 high-resolution files at icons/original/recipes/<id>.webp and separately
optimized 512x512 image previews that use the existing catalogue paths
icons/illustrated/craft-<id>.webp. The preview technique works without any
script or catalogue migration and preserves all other item art.

Download the separate overlay ZIP supplied in the ChatGPT conversation, unzip
it anywhere, and run, from that extracted directory:

    py install_original_art.py --module "D:\Foundry\FoundryVTT\Data\modules\gathering-crafting" --source "gathering-crafting-20-art-overlay.zip" --dry-run

Then repeat without --dry-run to install. Use your actual Foundry Data path.
The script validates each image checksum, refuses malformed images, backs up
every replaced icon in artwork-backups/, atomically installs the originals,
and rolls back writes if an error occurs. It does NOT rename the module or
publish the release. The Python importer source is also kept in this branch
at artwork/install_original_art.py.

This preview is only 20/224 artwork files and does not satisfy the --complete
gate. It must NOT trigger a full v1.1 release. Remaining Canva requests must
be retrieved as image files, reviewed for correct composition and originality,
and checked in separately. Canva job submissions without image exports are
not finished artwork.


## Approval-gated full-catalogue migration

When 224 separate, non-duplicated original WebP files really exist in
`icons/original/` and each manifest item has passed its individual visual QA
and is explicitly marked `approved`, migrate the catalogue with:

    node artwork/verify.cjs --complete
    node artwork/sync-catalog-art.cjs --dry-run --complete
    node artwork/sync-catalog-art.cjs --apply --complete

The migration updates both `data/catalog.json` and `scripts/catalog.js`
with matching `modules/gathering-crafting/icons/original/...` URLs.
It refuses missing/corrupt art, exact duplicate bytes, unapproved images,
and mismatched catalogue data. It DOES NOT publish a release, alter module
versions, or rewrite the production download URL.
