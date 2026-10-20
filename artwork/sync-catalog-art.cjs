#!/usr/bin/env node
// Safe catalogue migration for reviewed standalone item artwork (Foundry V14).
// node artwork/sync-catalog-art.cjs --dry-run
// node artwork/sync-catalog-art.cjs --apply --complete
// Never modifies Foundry's published module.json or dist automatically.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const complete = process.argv.includes('--complete');
const apply = process.argv.includes('--apply');
if (process.argv.includes('--help')) {
  console.log('Usage: node artwork/sync-catalog-art.cjs [--dry-run] [--apply] [--complete]');
  process.exit(0);
}
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'production-manifest.json'), 'utf8'));
const dataFile = path.join(root, 'data/catalog.json');
const jsFile = path.join(root, 'scripts/catalog.js');
const rawData = fs.readFileSync(dataFile, 'utf8');
const rawJs = fs.readFileSync(jsFile, 'utf8');
const marker = 'export const CATALOG = ';
const position = rawJs.indexOf(marker);
if (position < 0 || !rawJs.slice(position).trimEnd().endsWith(';')) {
  throw new Error('Unexpected catalogue JS layout, refusing to modify');
}
const prefix = rawJs.slice(0, position + marker.length);
const builtinJson = rawJs.slice(position + marker.length).trim().replace(/;\s*$/, '');
const catalog = JSON.parse(rawData);
const builtin = JSON.parse(builtinJson);
const clone = x => JSON.parse(JSON.stringify(x));
const sameCatalog = (a,b) => JSON.stringify(a) === JSON.stringify(b);
if (!sameCatalog(catalog,builtin)) {
  throw new Error('data/catalog.json and scripts/catalog.js differ; stop and reconcile by hand.');
}
const out = clone(catalog);
const digestMap = new Map();
let approved = 0, rewired = 0;
const blocked = [];
if (plan.items.length !== 224) throw new Error('Expected 224 manifest entries');
for (const item of plan.items) {
  const [type,id] = item.id.split(':');
  if (!['recipe','material'].includes(type) || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error('Invalid item id: ' + item.id);
  }
  const list = type === 'recipe' ? out.recipes : out.materials;
  const entry = list.find(v => v.id === id);
  if (!entry || item.target !== 'icons/original/' + type + 's/' + id + '.webp') {
    throw new Error('Manifest and catalogue mismatch: ' + item.id);
  }
  const full = path.resolve(root, item.target);
  if (!full.startsWith(root + path.sep)) throw new Error('Unsafe image path');
  if (item.status !== 'approved') {
    blocked.push(item.id + ':not-approved');
    continue;
  }
  if (!item.review || !Object.values(item.review).length ||
      !Object.values(item.review).every(Boolean)) {
    throw new Error('Approved without all visual-review gates: ' + item.id);
  }
  if (!fs.existsSync(full)) throw new Error('Approved but file missing: ' + item.id);
  const data = fs.readFileSync(full);
  if (data.length < 10000 || data.toString('ascii',0,4) !== 'RIFF' ||
      data.toString('ascii',8,12) !== 'WEBP') {
    throw new Error('Invalid WebP: ' + item.id);
  }
  const sha = crypto.createHash('sha256').update(data).digest('hex');
  if (digestMap.has(sha)) throw new Error('Exact duplicate art: ' + item.id + ' / ' + digestMap.get(sha));
  digestMap.set(sha,item.id);
  entry.img = 'modules/gathering-crafting/' + item.target;
  approved++;
  rewired++;
}
if (complete && approved !== 224) throw new Error('Release blocked: only ' + approved + ' of 224 approved');
console.log('Original artwork: ' + approved + '/224 approved and verified');
console.log('Catalogue entries ready for migration: ' + rewired);
console.log('Still awaiting approval: ' + blocked.length);
if (!apply) {
  console.log('DRY RUN: catalogues untouched. Add --apply to write.');
  process.exit(0);
}
const newData = JSON.stringify(out,null, rawData.startsWith('{\n') ? 2 : 0) + '\n';
const newJs = prefix + JSON.stringify(out) + ';\n';
const saveAtomic = (filename, data) => {
  const staging = filename + '.gc-art-stage-' + process.pid;
  fs.writeFileSync(staging, data);
  fs.renameSync(staging, filename);
};
if (complete && rewired !== 224) throw new Error('Complete-art gate failed');
const dataBefore = rawData, jsBefore = rawJs;
try {
  saveAtomic(dataFile,newData);
  saveAtomic(jsFile,newJs);
} catch (err) {
  // No changes to system data are left half-applied on failure.
  fs.writeFileSync(dataFile,dataBefore);
  fs.writeFileSync(jsFile,jsBefore);
  throw err;
}
console.log('Both built-in catalogues updated. module.json and dist remain unchanged.');
