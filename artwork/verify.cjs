#!/usr/bin/env node
// Original-art integrity audit. Read only: never changes module art/catalogue.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, "production-manifest.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/catalog.json"), "utf8"));
const expected = [
  ...catalog.recipes.filter(x => x.category === "metallurgy").map(x => ["recipe", x]),
  ...catalog.recipes.filter(x => x.category === "alchemy").map(x => ["recipe", x]),
  ...catalog.materials.map(x => ["material", x])
];
const expectedReview = [
  "singleStandaloneImage", "noCrop", "fullSubjectVisible",
  "visuallyDistinct", "correctItem", "approved"
];
const statuses = new Set(["not-generated", "generated", "needs-revision", "approved"]);
const report = {
  artworkTotal: 224,
  recipes: 122,
  materials: 102,
  savedOriginalWebp: 0,
  approved: 0,
  missing: [],
  pending: [],
  externalCandidates: 0,
  unverifiedRequests: 0,
  releaseReady: false
};
function imageDimensions(bytes) {
  assert.ok(bytes.length >= 30, "WebP too short");
  assert.equal(bytes.toString("ascii",0,4), "RIFF", "Not RIFF");
  assert.equal(bytes.toString("ascii",8,12), "WEBP", "Not WebP");
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, "Invalid RIFF length");
  const kind = bytes.toString("ascii", 12, 16);
  let width, height;
  if (kind === "VP8 ") {
    assert.ok(bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a,
      "Invalid VP8 frame header");
    width = bytes.readUInt16LE(26) & 0x3fff;
    height = bytes.readUInt16LE(28) & 0x3fff;
  } else if (kind === "VP8L") {
    assert.equal(bytes[20], 0x2f, "Invalid VP8L signature");
    width = 1 + (bytes[21] | ((bytes[22] & 0x3f) << 8));
    height = 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 15) << 10));
  } else if (kind === "VP8X") {
    width = 1 + bytes.readUIntLE(24,3);
    height = 1 + bytes.readUIntLE(27,3);
  } else {
    throw Error("Unsupported WebP chunk " + JSON.stringify(kind));
  }
  assert.ok(width >= 1024 && height >= 1024, "Original WebP below 1024px");
  assert.equal(width,height,"Original WebP must be square");
  return width;
}
assert.equal(expected.length,224,"Unexpected catalogue size");
assert.equal(plan.items.length,224,"Manifest must have 224 items");
const paths = new Set(), digests = new Map();
for (let i=0;i<expected.length;i++) {
  const [type,entry] = expected[i];
  const item = plan.items[i];
  assert.equal(item.number,i+1,"Misnumbered manifest item");
  assert.equal(item.id,type+":"+entry.id,"Wrong item ID/order");
  assert.equal(item.name,entry.name,"Wrong display name");
  assert.equal(item.target,"icons/original/"+type+"s/"+entry.id+".webp","Wrong filename");
  assert.ok(statuses.has(item.status),"Unexpected status: "+item.id);
  assert.ok(!paths.has(item.target),"Repeated target path: "+item.target);
  paths.add(item.target);
  assert.ok(item.prompt.includes("ONE original") && item.prompt.includes("No characters"),
    "Missing standalone-image prompt: "+item.id);
  if (item.localArtworkCandidate) report.externalCandidates++;
  if (item.generationRequest && item.generationRequest.state !== "file-ready-outside-github") {
    report.unverifiedRequests++;
  }
  const full = path.resolve(root,item.target);
  assert.ok(full.startsWith(root+path.sep),"Unsafe output path");
  if (!fs.existsSync(full)) {
    report.missing.push(item.id);
    report.pending.push(item.id);
    assert.notEqual(item.status,"approved","Marked approved but binary missing: "+item.id);
    continue;
  }
  const bytes = fs.readFileSync(full);
  assert.ok(bytes.length>10000,"Suspiciously small WebP: "+item.id);
  imageDimensions(bytes);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.ok(!digests.has(sha),"Byte-identical image "+item.id+" and "+digests.get(sha));
  digests.set(sha,item.id);
  if (item.localArtworkCandidate && item.localArtworkCandidate.sha256) {
    assert.equal(sha,item.localArtworkCandidate.sha256,"Source hash mismatch: "+item.id);
  }
  report.savedOriginalWebp++;
  if (item.status === "approved") {
    assert.ok(item.review && expectedReview.every(k => item.review[k] === true),
      "Missing individual QA approval: "+item.id);
    report.approved++;
  } else {
    report.pending.push(item.id);
  }
}
assert.equal(plan.planned,224);
assert.equal(plan.finished,report.approved,"Manifest finished count must match actual approval count");
report.releaseReady = report.approved===224 && report.savedOriginalWebp===224;
const message = "Standalone original artworks: " + report.approved +
  "/224 approved, " + report.savedOriginalWebp + "/224 WebPs in repo, " +
  report.missing.length + " missing, " + report.externalCandidates +
  " external candidate(s).";
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report,null,2));
} else {
  console.log(message);
}
if (process.argv.includes("--complete")) {
  assert.ok(report.releaseReady,
    "RELEASE BLOCKED. Missing/unapproved original paintings. Do not publish v1.1.");
}
