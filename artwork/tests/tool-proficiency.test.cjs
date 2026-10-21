"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const rulesPath = path.resolve(__dirname,"../../scripts/tool-rules.js");
const source = fs.readFileSync(rulesPath,"utf8")
  .replaceAll("export const ","const ").replaceAll("export function ","function ");
const ctx = vm.createContext({});
vm.runInContext(source+"\nthis.rules={toolName,craftingTool,gatheringTool,hasToolProficiency,toolRollFormula};",ctx);
const r=ctx.rules;
const actor=(smith,alchemist,herb=0)=>({system:{tools:{smith:{value:smith},alchemist:{value:alchemist},herb:{value:herb}}}});
test("dnd5e tool abbreviations and relevant resource groups",()=>{
 assert.equal(r.craftingTool({category:"metallurgy"}),"smith");
 assert.equal(r.craftingTool({category:"alchemy"}),"alchemist");
 assert.equal(r.gatheringTool({group:"Ore & Mineral"}),"smith");
 assert.equal(r.gatheringTool({group:"Alchemical Ingredient"}),"herb");
 assert.equal(r.gatheringTool({group:"Monster Drop"}),"alchemist");
});
test("untrained actor can roll, but rolls 2d20 keep lowest",()=>{
 const a=actor(0,0,0);
 assert.equal(r.toolRollFormula(a,"smith"),"2d20kl1 + @bonus");
 assert.equal(r.toolRollFormula(a,"alchemist"),"2d20kl1 + @bonus");
 assert.equal(r.toolRollFormula(a,"herb"),"2d20kl1 + @bonus");
});
test("trained actor rolls normally; expertise and half-proficiency count",()=>{
 const a=actor(2,1,0.5);
 for(const id of ["smith","alchemist","herb"])
  assert.equal(r.toolRollFormula(a,id),"1d20 + @bonus");
});
test("missing tool field doesn't block a check and gives disadvantage",()=>{
 assert.equal(r.toolRollFormula({system:{}}, "smith"),"2d20kl1 + @bonus");
 assert.equal(r.toolRollFormula({}, "alchemist"),"2d20kl1 + @bonus");
});
test("universal proficiency and legacy traits count",()=>{
 assert.equal(r.toolRollFormula({system:{rolls:{ability:{tool:{proficiency:1}}}}},"smith"),"1d20 + @bonus");
 assert.equal(r.toolRollFormula({system:{traits:{toolProf:{value:["alchemist"]}}}},"alchemist"),"1d20 + @bonus");
});
test("main.js uses disadvantage helper on gather and inspired craft",()=>{
 const main=fs.readFileSync(path.resolve(__dirname,"../../scripts/main.js"),"utf8");
 assert.match(main,/roll=await new Roll\(toolRollFormula\(actor,neededTool\)/);
 assert.equal((main.match(/new Roll\(toolRollFormula\(actor,neededTool\)/g)||[]).length,2);
 assert.match(main,/const batch=maxBatch>1&&!inspired/);
});
