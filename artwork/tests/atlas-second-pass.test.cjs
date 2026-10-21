"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const r=JSON.parse(fs.readFileSync(path.join(root,"artwork/reviews/atlas-unused-125-second-pass.json"),"utf8"));
const mapping=JSON.parse(fs.readFileSync(path.join(root,"artwork/reviews/board-to-catalog-224.json"),"utf8"));
const catalogue=JSON.parse(fs.readFileSync(path.join(root,"data/catalog.json"),"utf8"));
const expected=[
 ...catalogue.recipes.map(x=>"recipe:"+x.id),
 ...catalogue.materials.map(x=>"material:"+x.id)
];
test("reviewed all previously unallocated 125 atlas cells without reading external 20 artworks",()=>{
 assert.equal(r.scope.includes("external 20")||r.scope.includes("external 20 individual"),true);
 assert.equal(r.newProposals,23);
 assert.equal(r.items.length,23);
 assert.equal(r.unassignedCells.length,102);
 assert.equal(r.earlierApprovedOriginals||r.approvedOriginals,0);
 assert.equal(r.priorMissingVisualCandidates,107);
 assert.equal(r.remainingMissingVisualCandidates,84);
});
test("each new proposal maps to exactly one official ID and to one unique atlas cell",()=>{
 assert.deepEqual(new Set(mapping.entries.map(x=>x.officialId)),new Set(expected));
 assert.equal(mapping.entries.length,224);
 const used=mapping.entries.filter(x=>x.boardCode).map(x=>x.boardCode);
 assert.equal(new Set(used).size,used.length);
 assert.equal(used.length,140);
 assert.equal(mapping.unallocatedBoardCodes.length,102);
 assert.equal(new Set([...used,...mapping.unallocatedBoardCodes]).size,242);
 for(const x of r.items){
  const e=mapping.entries.find(y=>y.officialId===x.id);
  assert.ok(e,"Missing official item: "+x.id);
  assert.equal(e.boardCode,x.code);
  assert.equal(e.confidence,x.confidence);
  assert.equal(e.method,"second_pass_visual_candidate_from_unused");
  assert.notEqual(e.reviewStatus,"APPROVED");
 }
});
test("no item is accidentally upgraded to approved by atlas review",()=>{
 assert.equal(mapping.stats.atlasOnlySecondPass.verifiedOriginalsConsidered,0);
 assert.equal(mapping.stats.atlasOnlySecondPass.approved,0);
 assert.equal(mapping.stats.confidence.none,84);
 assert.equal(mapping.stats.confidence.unverified,66);
 assert.equal(mapping.stats.confidence.probable,17);
 assert.equal(mapping.stats.confidence.possible,49);
 assert.equal(mapping.stats.confidence.strong,8);
});
