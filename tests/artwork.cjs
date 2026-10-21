/**
 * Artwork audit for packaged Foundry V14 module.
 * Run AFTER unpacking icons/illustrated-assets/*.zip into the repository root.
 * No external dependencies or installed Foundry instance required.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const moduleInfo = JSON.parse(fs.readFileSync(path.join(root, 'module.json'), 'utf8'));
assert.equal(moduleInfo.id, 'gathering-crafting');
assert.equal(moduleInfo.compatibility.minimum, '14');
assert.equal(catalog.materials.length, 102);
assert.equal(catalog.recipes.length, 122);
assert.equal(catalog.nodes.length, 71);
assert.equal(catalog.recipes.filter(r => r.category === 'metallurgy').length, 56);
assert.equal(catalog.recipes.filter(r => r.category === 'alchemy').length, 66);

const catalogSource = fs.readFileSync(path.join(root, 'scripts/catalog.js'), 'utf8');
const exportedJSON = catalogSource.slice(catalogSource.indexOf('export const CATALOG'))
  .replace(/^export\s+const\s+CATALOG\s*=\s*/, '').replace(/;\s*$/, '');
assert.deepEqual(JSON.parse(exportedJSON), catalog, 'data/catalog.json and scripts/catalog.js must agree');

const entries = [...catalog.materials, ...catalog.recipes];
const seenPaths = new Set();
const seenHashes = new Map();
const categories = { illustrated: 0, handpainted: 0 };
const prefix = 'modules/gathering-crafting/';
for (const entry of entries) {
  assert.ok(entry.id && entry.name, 'Every entry needs an ID and name');
  assert.ok(entry.img.startsWith(prefix + 'icons/'), `Nonlocal item art: ${entry.id}`);
  assert.ok(/\.webp$/.test(entry.img), `Expected WebP file: ${entry.id}`);
  const relative = entry.img.slice(prefix.length);
  assert.ok(relative === 'icons/handpainted/iron-ore.webp' ||
    relative.endsWith('/' + entry.id + '.webp') ||
    relative.endsWith('/craft-' + entry.id + '.webp'), `Art name mismatch: ${entry.id}`);
  assert.ok(!seenPaths.has(relative), `Two items share one image: ${relative}`);
  seenPaths.add(relative);
  const abs = path.resolve(root, relative);
  assert.ok(abs.startsWith(root + path.sep), 'Artwork path escaped root');
  assert.ok(fs.existsSync(abs), `Missing bundled image: ${relative}`);
  const bytes = fs.readFileSync(abs);
  assert.ok(bytes.length > 1000, `Image too small or empty: ${relative}`);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `Invalid WebP RIFF: ${relative}`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `Invalid WebP header: ${relative}`);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.ok(!seenHashes.has(sha), `Duplicate image bytes: ${relative} and ${seenHashes.get(sha)}`);
  seenHashes.set(sha, relative);
  const kind = relative.includes('/handpainted/') ? 'handpainted' : 'illustrated';
  categories[kind] += 1;
}
assert.equal(entries.length, 224);
assert.equal(seenPaths.size, 224);
assert.equal(categories.handpainted, 11);
assert.equal(categories.illustrated, 213);
console.log(`PASS: ${entries.length} valid, distinct, locally bundled WebP files (${categories.handpainted} handpainted-path entries; ${categories.illustrated} illustrated-path entries).\nAll Blacksmithing and Alchemy item image paths resolve; catalogue data matches game data.`);
