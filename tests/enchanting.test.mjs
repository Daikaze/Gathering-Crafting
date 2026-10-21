import test from 'node:test';
import assert from 'node:assert/strict';
import {ENCHANTMENTS,ELEMENTS,DAY_SECONDS,enchantById,targetKind,canApplyEnchant,afterGoldPayment,completionAt,displayEnchantEffect} from '../scripts/enchanting.mjs';

test('exact weapon and armor enchantment catalog',()=>{
 assert.equal(ENCHANTMENTS.length,25);
 assert.equal(ENCHANTMENTS.filter(e=>e.kind==='weapon').length,11);
 assert.equal(ENCHANTMENTS.filter(e=>e.kind==='armor').length,14);
 assert.equal(new Set(ENCHANTMENTS.map(e=>e.id)).size,25);
 assert.equal(ENCHANTMENTS.find(e=>e.id==='weapon-spell-channel').cost,125);
 assert.deepEqual([enchantById('weapon-arcane-infusion').cost,enchantById('weapon-arcane-infusion').days],[250,5]);
 assert.deepEqual([enchantById('weapon-greater-arcane-infusion').cost,enchantById('weapon-greater-arcane-infusion').days],[1000,10]);
 assert.equal(enchantById('armor-magewoven-interior').cost,120);
 assert.deepEqual([enchantById('armor-phoenix-binding').cost,enchantById('armor-phoenix-binding').days],[1500,14]);
 assert.equal(enchantById('armor-soul-binding').days,7);
 assert.deepEqual(ELEMENTS,['Fire','Cold','Lightning','Acid','Thunder']);
 for(const e of ENCHANTMENTS){assert.ok(e.name);assert.ok(e.description);assert.ok(e.cost>0);assert.ok(e.days>0);}
});
test('weapon vs armor eligibility, no repeated or conflicting enhancements',()=>{
 const weapon={type:'weapon',getFlag:()=>null};
 const armor={type:'equipment',system:{type:{value:'heavy'}},getFlag:()=>null};
 const shield={type:'equipment',system:{type:{value:'shield'}},getFlag:()=>null};
 const ring={type:'equipment',system:{type:{value:'trinket'}},getFlag:()=>null};
 assert.equal(targetKind(weapon),'weapon');assert.equal(targetKind(armor),'armor');assert.equal(targetKind(shield),'armor');
 assert.equal(targetKind(ring),null);
 assert.ok(canApplyEnchant(weapon,enchantById('weapon-spell-channel'),[]));
 assert.ok(canApplyEnchant(armor,enchantById('armor-storm-ward'),[]));
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
