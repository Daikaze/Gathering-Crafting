"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const all=JSON.parse(fs.readFileSync(path.join(root,"artwork/reviews/board-to-catalog-224.json"),"utf8"));
const potions=JSON.parse(fs.readFileSync(path.join(root,"artwork/reviews/alchemy-66-themed-proposals.json"),"utf8"));
const catalog=JSON.parse(fs.readFileSync(path.join(root,"data/catalog.json"),"utf8"));
const manifest=JSON.parse(fs.readFileSync(path.join(root,"artwork/production-manifest.json"),"utf8"));
test("66 manually themed alchemy previews use unique atlas cells and exact official IDs",()=>{
 const recipes=catalog.recipes.filter(x=>x.category==="alchemy");
 assert.equal(recipes.length,66);
 assert.equal(potions.items.length,66);
 assert.equal(new Set(potions.items.map(x=>x.boardCode)).size,66);
 assert.equal(new Set(potions.items.map(x=>x.officialId)).size,66);
 const valid=Array.from({length:22},(_,i)=>i+1).flatMap(n=>["A1","A2","A6"].map(r=>r+"-"+n));
 assert.deepEqual(new Set(potions.items.map(x=>x.boardCode)),new Set(valid));
 for(let i=0;i<66;i++){
  const item=potions.items[i],match=all.entries.find(x=>x.officialId===item.officialId);
  assert.equal(item.officialId,"recipe:"+recipes[i].id);
  assert.equal(item.name,recipes[i].name);
  assert.ok(match,"Missing official mapping: "+item.officialId);
  assert.equal(match.boardCode,item.boardCode);
  assert.equal(match.method,"manually_curated_thematic_proposal");
  assert.equal(match.confidence,"unverified");
  assert.equal(item.visualStatus,"not_proven");
 }
});
test("atlas preview must not be marked as genuine release-ready original art",()=>{
 assert.equal(potions.confirmedOriginalIdentities,0);
 assert.equal(all.stats.provenAlchemyRecipeIdentity,0);
 assert.equal(all.stats.approvedAsReleaseArt,0);
 for(const item of potions.items){
  const tracked=manifest.items.find(x=>x.id===item.officialId);
  assert.ok(tracked);
  assert.notEqual(tracked.status,"approved",
     "Atlas cell cannot count as independently approved original: "+item.officialId);
 }
});
