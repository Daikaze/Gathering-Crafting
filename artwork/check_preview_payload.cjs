#!/usr/bin/env node
// Protect the 224 user-selected temporary WebP icons from accidental overwrite
// by the older illustrated-assets ZIP bundles during v1.1 packaging.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "..");
// Always read the immutable review list from the checked-out repository, including
// when validating the extracted distributable ZIP in a temporary directory.
const file = path.join(__dirname, "reviews/preview-224-sha256.txt");
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(x => x && !x.startsWith("#"));
assert.equal(lines.length, 224, "Expected exactly 224 approved-for-preview image hashes");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/catalog.json"), "utf8"));
const full = [...catalog.recipes, ...catalog.materials];
assert.equal(full.length, 224);
const urls = new Set(full.map(x => {
  assert.ok(x.img.startsWith("modules/gathering-crafting/icons/"));
  return x.img.slice("modules/gathering-crafting/".length);
}));
assert.equal(urls.size, 224);
const seen = new Set(), digests = new Set();
for (const line of lines) {
  const hit = line.match(/^([0-9a-f]{64})  (icons\/[a-zA-Z0-9_.\/-]+\.webp)$/);
  assert.ok(hit, "Malformed hash line");
  const [, expected, rel] = hit;
  assert.ok(urls.has(rel), "Unexpected art asset: " + rel);
  assert.ok(!seen.has(rel), "Duplicate art path");
  seen.add(rel);
  const p = path.resolve(root, rel);
  assert.ok(p.startsWith(root + path.sep), "Escaped module root");
  assert.ok(fs.existsSync(p), "Missing preview WebP: " + rel);
  const buf = fs.readFileSync(p);
  assert.equal(buf.toString("ascii", 0, 4), "RIFF");
  assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  const actual = crypto.createHash("sha256").update(buf).digest("hex");
  assert.equal(actual, expected, "Altered/old image replaced preview: " + rel);
  assert.ok(!digests.has(actual), "Image binary reused for more than one item");
  digests.add(actual);
}
assert.equal(seen.size, urls.size);
console.log("PASS: 224 preview WebPs match actual catalogue paths and all saved SHA-256 hashes");
