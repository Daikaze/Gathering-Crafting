# Recovering original item art from Canva (Gathering & Crafting v1.1)

The user and assistant submitted numerous individual image-generation requests for all 224 catalog items. **Do not assume every submitted job produced an exportable original painting.** The connected Canva root image inventory on October 21, 2026 contained **11 1264×1264 image assets**, recorded in `artwork/canva-recovery-registry.json`. A separate verified preview ZIP includes 20 original standalone Blacksmithing WebPs.

## Important limitation

The available Canva connection can read asset IDs, sizes, smart tags and thumbnail previews but cannot export the **full-resolution source bytes** of an arbitrary image asset. A thumbnail URL is unsuitable for a release image; it may be low resolution, signed and expire. Do not commit thumbnails, guess target IDs from automatic smart tags or point Foundry at temporary Canva URLs.

## Correct import process

1. Open the 11 asset IDs listed in `canva-recovery-registry.json` in Canva and download their **original 1264×1264 images**, preserving separate original compositions.
2. Visually match each exported painting to exactly one item in `artwork/production-manifest.json`. Use a filename like `recipe__iron-nails.png` or `material__chimera-horn.jpg`; multiple identically named recipe/material entries must stay distinct.
3. On a checkout of the v1.1 artwork branch, run:

   ```bash
   python -m pip install pillow
   python artwork/import_individual_art.py --source "/path/to/exported/originals"
   python artwork/import_individual_art.py --source "/path/to/exported/originals" --apply
   node artwork/verify.cjs
   ```

4. The importer checks complete, square, >=1024px individual files; converts full canvas to WebP without cropping or making collages; rejects duplicate source mappings; saves backups before any overwrite; and marks them `generated` **not `approved`**. Individual human visual review is required.
5. Commit the resulting image binary files and updated production manifest together in the working GitHub branch. The rest of the unfinished artwork must be newly created only if its original cannot be recovered.

**Do not merge, migrate the catalogue, update module.json or release v1.1 until 224 originals are all present and approved.**

## Check after import

```bash
node --test artwork/tests/*.test.cjs
python -m unittest discover -s artwork/tests -p 'test_*.py' -v
node artwork/verify.cjs --complete
node artwork/sync-catalog-art.cjs --dry-run --complete
```
