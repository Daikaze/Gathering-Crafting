import test from "node:test";
import assert from "node:assert/strict";
import {TOOL_SPECS,requiredForNode,requiredForRecipe,itemForTool,proficiencyLevel,toolGate,craftCheck,actorLevel,proficiencyBonus} from "../scripts/tool-rules.mjs";

const makeActor=(items=[],tools={},level=5)=>({
 system:{details:{level},attributes:{prof:3},abilities:{str:{mod:3},int:{mod:2},wis:{mod:1},dex:{mod:1}},tools},
 items:items.map((name,i)=>({id:"i"+i,name,type:"tool",system:{quantity:1}}))
});
const prof={mason:{value:1},herb:{value:1},leatherworker:{value:1},smith:{value:1},alchemist:{value:1}};
test("mining requires pickaxe but missing Mason proficiency means disadvantage",()=>{
 assert.equal(requiredForNode({group:"metallurgy"},{group:"Ore & Mineral"}),"pickaxe");
 assert.equal(toolGate(makeActor(["Pickaxe"],prof),"pickaxe").ok,true);
 assert.match(toolGate(makeActor([],prof),"pickaxe").error,/Pickaxe/);
 assert.equal(toolGate(makeActor(["Pickaxe"],{}),"pickaxe").ok,true);
 assert.equal(toolGate(makeActor(["Pickaxe"],{}),"pickaxe").disadvantage,true);
 assert.equal(itemForTool(makeActor(["Iron Pickaxe Head"],prof),"pickaxe"),null,"A spare axe head is not a pickaxe");
 assert.ok(itemForTool(makeActor(["Miner's Pick"],prof),"pickaxe"));
});
test("herb gathering requires kit, half proficiency avoids disadvantage",()=>{
 assert.equal(requiredForNode({group:"alchemy"},{group:"Alchemical Ingredient"}),"herbalism");
 assert.equal(toolGate(makeActor(["Herbalism Kit"],prof),"herbalism").ok,true);
 assert.equal(toolGate(makeActor(["Herbalism Kit"],{herb:{value:0.5}}),"herbalism").ok,true);
 assert.equal(toolGate(makeActor(["Herbalism Kit"],{herb:{value:0.5}}),"herbalism").disadvantage,false);
});
test("monster drops require a skinning knife, not proficiency",()=>{
 assert.equal(requiredForNode({group:"monster"},{group:"Monster Drop"}),"skinning");
 assert.equal(toolGate(makeActor(["Skinning Knife"],prof),"skinning").ok,true);
 assert.equal(toolGate(makeActor(["Skinning Knife"],{smith:{value:1}}),"skinning").ok,true);
 assert.equal(toolGate(makeActor(["Skinning Knife"],{smith:{value:1}}),"skinning").disadvantage,true);
});
test("recipes require their corresponding artisan tool, not any tool",()=>{
 assert.equal(requiredForRecipe({category:"alchemy"}),"alchemist");
 assert.equal(requiredForRecipe({category:"metallurgy"}),"smith");
 assert.equal(toolGate(makeActor(["Pickaxe"],prof),"smith").ok,false);
 assert.equal(toolGate(makeActor(["Smith's Tools"],prof),"smith").ok,true);
 assert.equal(toolGate(makeActor(["Alchemist's Supplies"],prof),"alchemist").ok,true);
});
test("custom GM tool and proficiency overrides stay respected",()=>{
 assert.equal(requiredForNode({requiredTool:"woodcarver",group:"metallurgy"}),"woodcarver");
 assert.equal(requiredForRecipe({category:"alchemy",requiredTool:"smith"}),"smith");
 assert.equal(toolGate(makeActor(["Smith's Tools"],{jeweler:{value:1}}),"smith","jeweler").ok,true);
 assert.equal(toolGate(makeActor(["Smith's Tools"],{smith:{value:1}}),"smith","jeweler").ok,true);
 assert.equal(toolGate(makeActor(["Smith's Tools"],{smith:{value:1}}),"smith","jeweler").disadvantage,true);
});
test("checks scale with ability + proficiency bonus + level bonus + tool bonus",()=>{
 const actor=makeActor(["Smith's Tools"],prof,5);
 actor.items[0].system.bonus=2;
 const stats=craftCheck(actor,{category:"metallurgy"},"smith","smith",actor.items[0]);
 assert.equal(stats.modifier,3);
 assert.equal(stats.pb,3);
 assert.equal(stats.multiplier,1);
 assert.equal(stats.levelBonus,1);
 assert.equal(stats.itemBonus,2);
 assert.equal(stats.total,9);
});
test("expertise doubles PB, never skill proficiency on top",()=>{
 const actor=makeActor(["Smith's Tools"],{smith:{value:2}},9);
 actor.system.attributes.prof=4;
 const check=craftCheck(actor,{},"smith","smith",actor.items[0]);
 assert.equal(check.total,3+4*2+2);
});
test("higher levels improve the bonus separately from normal PB progression",()=>{
 const a=makeActor(["Smith's Tools"],prof,1);
 a.system.attributes.prof=2;
 const b=makeActor(["Smith's Tools"],prof,13);
 b.system.attributes.prof=5;
 assert.equal(craftCheck(a,{},"smith","smith",a.items[0]).total,5);
 assert.equal(craftCheck(b,{},"smith","smith",b.items[0]).total,11);
});
test("class levels substitute when details.level is missing",()=>{
 const actor=makeActor([],{},1);
 delete actor.system.details.level;
 actor.items=[{type:"class",system:{levels:5}},{type:"class",system:{levels:2}}];
 assert.equal(actorLevel(actor),7);
});
test("no tool item when quantity is zero and custom flagged tools supported",()=>{
 const actor=makeActor(["Pickaxe"],prof);
 actor.items[0].system.quantity=0;
 assert.equal(itemForTool(actor,"pickaxe"),null);
 actor.items[0].name="A special iron mining implement";
 actor.items[0].system.quantity=1;
 actor.items[0].flags={"gathering-crafting":{toolKey:"pickaxe"}};
 assert.equal(itemForTool(actor,"pickaxe"),actor.items[0]);
});
test("proficiency is read from actor.system.tools (D&D5e 5.3.3)",()=>{
 assert.equal(proficiencyLevel(makeActor([],{alchemist:{value:1}}),"alchemist"),1);
 assert.equal(proficiencyLevel(makeActor([],{mason:{value:0}}),"mason"),0);
 assert.equal(proficiencyLevel(makeActor([],{smith:{value:2}}),"smith"),2);
});
test("unsupported required key is rejected rather than silently bypassed",()=>{
 assert.equal(TOOL_SPECS.pickaxe.label,"Pickaxe");
 assert.equal(toolGate(makeActor(["Pickaxe"],prof),"alien-tool").ok,false);
});

test("all crafting roll modes keep physical tools required but untrained tools permitted",()=>{
 const toolUser=makeActor(["Smith's Tools"],{},5);
 const gate=toolGate(toolUser,"smith");
 assert.equal(gate.ok,true);
 assert.equal(gate.disadvantage,true);
 const attempt=craftCheck(toolUser,{category:"metallurgy"},"smith","smith",gate.tool);
 assert.equal(attempt.multiplier,0,"Untrained does not gain PB from tool");
 assert.equal(attempt.total,3+1,"Character modifier and level bonus remain");
 const trained=toolGate(makeActor(["Smith's Tools"],{smith:{value:2}}),"smith");
 assert.equal(trained.disadvantage,false);
 assert.equal(trained.ok,true);
});
test("without actual tool, training alone still fails",()=>{
 const gate=toolGate(makeActor([],{alchemist:{value:2}}),"alchemist");
 assert.equal(gate.ok,false);
 assert.match(gate.error,/inventory/);
});
