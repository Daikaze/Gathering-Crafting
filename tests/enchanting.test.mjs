import test from 'node:test';
import assert from 'node:assert/strict';
import {ENCHANTMENTS,ELEMENTS,DAY_SECONDS,enchantById,targetKind,canApplyEnchant,afterGoldPayment,completionAt,displayEnchantEffect,itemTags,capacity,usedSlots,professionOf,learningGate,hasTrainingTools,arcanaBonus,RANKS,explainCompatibility,lessonCost} from '../scripts/enchanting.mjs';

test('exact weapon and armor enchantment catalog',()=>{
 assert.equal(ENCHANTMENTS.length,85);
 assert.equal(ENCHANTMENTS.filter(e=>e.kind==='weapon').length,41);
 assert.equal(ENCHANTMENTS.filter(e=>e.kind==='armor').length,44);
 assert.equal(new Set(ENCHANTMENTS.map(e=>e.id)).size,85);
 assert.equal(ENCHANTMENTS.find(e=>e.id==='weapon-spell-channel').cost,125);
 assert.deepEqual([enchantById('weapon-arcane-infusion').cost,enchantById('weapon-arcane-infusion').days],[250,5]);
 assert.deepEqual([enchantById('weapon-greater-arcane-infusion').cost,enchantById('weapon-greater-arcane-infusion').days],[1000,10]);
 assert.equal(enchantById('armor-magewoven-interior').cost,120);
 assert.deepEqual([enchantById('armor-phoenix-binding').cost,enchantById('armor-phoenix-binding').days],[1500,14]);
 assert.equal(enchantById('armor-soul-binding').days,7);
 assert.deepEqual(ELEMENTS,['Fire','Cold','Lightning','Acid','Thunder']);
 for(const e of ENCHANTMENTS){assert.ok(e.name);assert.ok(e.description);assert.ok(e.cost>0);assert.ok(e.days>0);assert.ok(e.rank>=1&&e.rank<=5);assert.ok(e.allowed.length);}
});
test('weapon vs armor eligibility, no repeated or conflicting enhancements',()=>{
 const weapon={type:'weapon',getFlag:()=>null};
 const armor={type:'equipment',system:{type:{value:'heavy'}},getFlag:()=>null};
 const shield={type:'equipment',system:{type:{value:'shield'}},getFlag:()=>null};
 const ring={type:'equipment',system:{type:{value:'trinket'}},getFlag:()=>null};
 assert.equal(targetKind(weapon),'weapon');assert.equal(targetKind(armor),'armor');assert.equal(targetKind(shield),'armor');
 assert.equal(targetKind(ring),null);
 assert.ok(canApplyEnchant(weapon,enchantById('weapon-spell-channel'),[]));
 assert.equal(canApplyEnchant(armor,enchantById('armor-storm-ward'),[]),false); // common rarity cannot carry high-rank ward
 assert.equal(canApplyEnchant(weapon,enchantById('armor-storm-ward'),[]),false);
 assert.equal(canApplyEnchant(armor,enchantById('weapon-spell-channel'),[]),false);
 assert.equal(canApplyEnchant(weapon,enchantById('weapon-arcane-infusion'),[{id:'weapon-greater-arcane-infusion'}]),false);
 assert.equal(canApplyEnchant(weapon,enchantById('weapon-elemental-binding'),[{id:'weapon-greater-elemental-binding'}]),false);
 assert.equal(canApplyEnchant(weapon,enchantById('weapon-spell-channel'),[{id:'weapon-spell-channel'}]),false);
 const pending={type:'weapon',getFlag:(_,key)=>key==='enchantmentPending'?{id:'weapon-spell-channel'}:null};
 assert.equal(canApplyEnchant(pending,enchantById('weapon-spell-channel'),[]),false);
});
test('exact GP payment and world-day completion',()=>{
 assert.equal(afterGoldPayment({pp:150,gp:3,ep:0,sp:0,cp:0},1000).pp,50);
 assert.equal(afterGoldPayment({gp:350},350).gp,0);
 assert.equal(afterGoldPayment({gp:124,sp:9},125),null);
 assert.equal(afterGoldPayment({gp:1000},1500),null);
 assert.equal(afterGoldPayment({pp:50,gp:50},550).gp,0);
 assert.throws(()=>afterGoldPayment({gp:-1},1));
 assert.throws(()=>afterGoldPayment({gp:1.2},1));
 assert.equal(completionAt(100,2),100+DAY_SECONDS*2);
 assert.equal(completionAt(100,14),100+DAY_SECONDS*14);
});
test('element binding requires explicit valid damage type',()=>{
 assert.equal(displayEnchantEffect(enchantById('weapon-elemental-binding'),'Fire'),'Adds 1d4 Fire damage on weapon hits.');
 assert.equal(displayEnchantEffect(enchantById('weapon-greater-elemental-binding'),'Cold'),'Adds 1d6 Cold damage on weapon hits.');
 assert.throws(()=>displayEnchantEffect(enchantById('weapon-elemental-binding'),'Radiant'));
});

test('item compatibility by actual weapon class, armor type and rarity slot capacity',()=>{
 const sword={type:'weapon',name:'Longsword',system:{type:{value:'martialM',baseItem:'longsword'},rarity:'uncommon'},getFlag:()=>null};
 const bow={type:'weapon',name:'Longbow',system:{type:{value:'martialR',baseItem:'longbow'},rarity:'rare'},getFlag:()=>null};
 const shield={type:'equipment',name:'Shield',system:{type:{value:'shield'},rarity:'rare'},getFlag:()=>null};
 const plate={type:'equipment',name:'Plate Armor',system:{type:{value:'heavy'},rarity:'veryRare'},getFlag:()=>null};
 assert.ok(itemTags(sword).includes('blade'));assert.ok(itemTags(bow).includes('bow'));
 assert.ok(itemTags(shield).includes('shield'));assert.ok(itemTags(plate).includes('heavy'));
 assert.equal(canApplyEnchant(bow,enchantById('weapon-keen-edge'),[]),false);
 assert.equal(canApplyEnchant(sword,enchantById('weapon-keen-edge'),[]),true);
 assert.equal(canApplyEnchant(shield,enchantById('armor-iron-sentinel'),[]),false);
 assert.equal(canApplyEnchant(plate,enchantById('armor-iron-sentinel'),[]),true);
 assert.equal(canApplyEnchant(bow,enchantById('weapon-rapid-reload'),[]),false);
 assert.equal(capacity(sword),2);assert.equal(capacity(plate),4);
 assert.equal(usedSlots([{id:'weapon-greater-arcane-infusion'}]),2);
 assert.equal(canApplyEnchant(sword,enchantById('weapon-keen-edge'),[{id:'weapon-soul-binding'},{id:'weapon-spell-channel'}]),false);
 assert.ok(explainCompatibility(sword,enchantById('weapon-greater-arcane-infusion'),[]).includes('rarer'));
});
test('learnable five-rank enchanting progression and physical tools gating',()=>{
 assert.equal(RANKS.length,6);
 assert.equal(RANKS[0].name,'Untrained');assert.equal(RANKS[5].name,'Master');
 const actor={system:{abilities:{int:{mod:3}},skills:{arc:{value:1}},attributes:{prof:3}},items:[{name:"Jeweler's Tools",system:{quantity:1}}],getFlag:()=>({rank:2,known:['weapon-spell-channel']})};
 assert.equal(hasTrainingTools(actor),true);assert.equal(arcanaBonus(actor),6);
 assert.equal(learningGate(actor,enchantById('weapon-spell-channel')),'');
 assert.equal(learningGate(actor,enchantById('weapon-keen-edge')),'Learn this enchantment first');
 assert.equal(learningGate(actor,enchantById('weapon-astral-sever')),'Requires Master');
 assert.equal(professionOf(actor).rank,2);
 assert.ok(lessonCost(enchantById('weapon-keen-edge'))>0);
 assert.equal(hasTrainingTools({...actor,items:[]}),false);
});
