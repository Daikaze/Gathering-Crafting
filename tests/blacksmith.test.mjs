import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../scripts/catalog.js';
import {makeCraftData,outputKind,nativeTemplates} from '../scripts/items.js';
import {targetKind,itemTags,canApplyEnchant,enchantById} from '../scripts/enchanting.mjs';

const smith=CATALOG.recipes.filter(r=>r.category==='metallurgy');
const byId=id=>smith.find(r=>r.id===id);
const created=id=>makeCraftData(byId(id));

test('all 56 Blacksmith recipes have meaningful English descriptions and coherent item data',()=>{
 assert.equal(CATALOG.catalogVersion,11);
 assert.equal(smith.length,56);
 assert.equal(new Set(smith.map(r=>r.id)).size,56);
 for(const r of smith){
  assert.ok(['Smelting','Forging'].includes(r.subcategory),r.name);
  assert.ok(r.description.length>=75,r.name+' description too short');
  assert.ok(/[.!]$/.test(r.description),r.name+' punctuation');
  const d=created(r.id);
  assert.ok(d.system.description.value.includes(r.description.replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('"','&quot;')),r.name);
  assert.equal(d.flags['gathering-crafting'].recipeId,r.id);
 }
});
test('Steel Chain Shirt medium armor: base 13 AC and max Dex +2',()=>{
 const i=created('steel-chain-shirt');
 assert.equal(i.type,'equipment');
 assert.equal(i.system.type.value,'medium');
 assert.equal(i.system.equipped,false);
 assert.deepEqual(i.system.rarities,['uncommon']);
 assert.equal(i.system.weight.value,20);
 assert.equal(i.system.armor.type,'medium');
 assert.equal(i.system.armor.value,13);
 assert.equal(i.system.armor.dex,2);
 assert.equal(targetKind(i),'armor');
 assert.ok(itemTags(i).includes('medium'));
 assert.ok(canApplyEnchant({...i,getFlag:()=>null},enchantById('armor-stonehide'),[]));
});
test('8 wearable items are Equipment, not Loot; no invented AC',()=>{
 const expected={
  'copper-bracers':'bracers','steel-gauntlets':'gloves',
  'steel-greaves':'boots','steel-helm':'helm',
  'silver-circlet':'helm','platinum-circlet':'helm',
  'moonsteel-diadem':'helm','dragonsilver-charm':'amulet'
 };
 assert.equal(Object.keys(nativeTemplates.wearables).length,Object.keys(expected).length);
 for(const [id,tag] of Object.entries(expected)){
  const i=created(id);
  assert.equal(i.type,'equipment',id);
  assert.equal(i.system.equipped,false,id);
  assert.ok(itemTags(i).includes(tag),id);
  assert.equal(targetKind(i),'armor',id);
  assert.equal(i.system.armor,undefined,id+' must not have innate AC');
  assert.ok(i.system.description.value.includes(byId(id).description));
 }
 const bracers=created('copper-bracers');
 assert.ok(canApplyEnchant({...bracers,getFlag:()=>null},enchantById('armor-arcane-mesh'),[]));
 const charm=created('dragonsilver-charm');
 assert.equal(charm.system.rarity,'veryRare');
 assert.ok(canApplyEnchant({...charm,getFlag:()=>null},enchantById('armor-guardian-pendant'),[]));
});
test('unassembled metal parts stay crafting components (loot)',()=>{
 const parts=['bronze-shield-boss','blacksteel-armor-plates','mithral-chain','silvered-arrowheads','steel-arrowheads','starmetal-spearhead','lantern-frame','runesteel-chisel'];
 for(const id of parts){
  assert.equal(outputKind(byId(id)),'loot',id);
  assert.equal(created(id).system.equipped,undefined,id);
 }
});
test('prior native weapon and shield behavior is preserved',()=>{
 assert.equal(Object.keys(nativeTemplates.weapons).length,7);
 assert.equal(Object.keys(nativeTemplates.shields).length,3);
 for(const id of Object.keys(nativeTemplates.weapons))assert.equal(created(id).type,'weapon');
 for(const id of Object.keys(nativeTemplates.shields))assert.equal(created(id).type,'equipment');
 assert.equal(created('steel-shield').system.armor.value,2);
 assert.equal(created('dusksteel-buckler').system.armor.value,1);
});
