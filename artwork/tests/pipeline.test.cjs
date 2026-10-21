"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const cp=require("node:child_process");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"../..");
const plan=JSON.parse(fs.readFileSync(path.join(root,"artwork/production-manifest.json"),"utf8"));
const catalog=JSON.parse(fs.readFileSync(path.join(root,"data/catalog.json"),"utf8"));
const verifier=path.join(root,"artwork/verify.cjs");
const migration=path.join(root,"artwork/sync-catalog-art.cjs");
const dataFile=path.join(root,"data/catalog.json");
const jsFile=path.join(root,"scripts/catalog.js");
function run(script,...args){
 return cp.spawnSync(process.execPath,[script,...args],{cwd:root,encoding:"utf8"});
}
const digest=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("all 224 catalogue entries have distinct, correctly typed original targets",()=>{
 const expected=[
   ...catalog.recipes.filter(x=>x.category==="metallurgy").map(x=>["recipe",x]),
   ...catalog.recipes.filter(x=>x.category==="alchemy").map(x=>["recipe",x]),
   ...catalog.materials.map(x=>["material",x])
 ];
 assert.equal(expected.length,224);
 assert.equal(plan.items.length,224);
 assert.equal(new Set(plan.items.map(i=>i.target)).size,224);
 for(let j=0;j<expected.length;j++){
   const [type,entry]=expected[j],item=plan.items[j];
   assert.equal(item.id,type+":"+entry.id);
   assert.equal(item.name,entry.name);
   assert.equal(item.target,"icons/original/"+type+"s/"+entry.id+".webp");
 }
});
test("read-only integrity audit gives a machine-readable report",()=>{
 const result=run(verifier,"--json");
 assert.equal(result.status,0,result.stderr || result.stdout);
 const status=JSON.parse(result.stdout);
 assert.equal(status.artworkTotal,224);
 assert.equal(status.recipes,122);
 assert.equal(status.materials,102);
 assert.equal(status.approved,plan.items.filter(x=>x.status==="approved").length);
 assert.equal(status.releaseReady,status.approved===224&&status.savedOriginalWebp===224);
});
test("catalogue migration dry run makes no file changes",()=>{
 const before=[digest(dataFile),digest(jsFile)];
 const r=run(migration,"--dry-run");
 assert.equal(r.status,0,r.stderr || r.stdout);
 assert.deepEqual([digest(dataFile),digest(jsFile)],before);
});
test("catalogue migration refuses unsafe partial application",()=>{
 const before=[digest(dataFile),digest(jsFile)];
 const r=run(migration,"--apply");
 assert.notEqual(r.status,0,"--apply without full release gate unexpectedly succeeded");
 assert.match(r.stderr+r.stdout,/requires --complete/i);
 assert.deepEqual([digest(dataFile),digest(jsFile)],before);
});
test("release cannot pass until all images are physically present and approved",()=>{
 const approved=plan.items.filter(x=>x.status==="approved").length;
 const complete=approved===224;
 const r=run(verifier,"--complete");
 if(complete){
   assert.equal(r.status,0,r.stderr||r.stdout);
 }else{
   assert.notEqual(r.status,0,"Incomplete art was allowed as release-ready");
   assert.match(r.stderr+r.stdout,/RELEASE BLOCKED/i);
 }
});
