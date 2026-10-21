import test from 'node:test';
import assert from 'node:assert/strict';
import {ENCHANTMENTS,ELEMENTS,DAY_SECONDS,reducedDays,lessonDays,enchantById,targetKind,canApplyEnchant,afterGoldPayment,completionAt,displayEnchantEffect,itemTags,capacity,usedSlots,professionOf,learningGate,hasTrainingTools,arcanaBonus,RANKS,explainCompatibility,lessonCost,sortEnchantments,knowsEnchant,itemClassification,enchantTargetLabels,EQUIPMENT_LABELS} from '../scripts/enchanting.mjs';
import {effectChanges} from '../scripts/enchanting-ui.mjs';

test('exact weapon and armor enchantment catalog',()=>{
 assert.equal(ENCHANTMENTS.length,107);
 assert.equal(ENCHANTMENTS.filter(e=>e.kind==='weapon').length,49);
 assert.equal(ENCHANTMENTS.filter(e=>e.kind==='armor').length,58);
 assert.equal(new Set(ENCHANTMENTS.map(e=>e.id)).size,107);
 assert.equal(ENCHANTMENTS.find(e=>e.id==='weapon-spell-channel').cost,125);
 assert.deepEqual([enchantById('weapon-arcane-infusion').cost,enchantById('weapon-arcane-infusion').days],[250,4]);
 assert.deepEqual([enchantById('weapon-greater-arcane-infusion').cost,enchantById('weapon-greater-arcane-infusion').days],[1000,7]);
 assert.equal(enchantById('armor-magewoven-interior').cost,120);
 assert.deepEqual([enchantById('armor-phoenix-binding').cost,enchantById('armor-phoenix-binding').days],[1500,10]);
 assert.equal(enchantById('armor-soul-binding').days,5);
 assert.deepEqual(ELEMENTS,['Fire','Cold','Lightning','Acid','Thunder']);
 for(const e of ENCHANTMENTS){assert.ok(e.name);assert.ok(e.description);assert.ok(e.cost>0);assert.ok(e.days>0);assert.ok(e.rank>=1&&e.rank<=5);assert.ok(e.allowed.length);}
});
test('weapon vs armor eligibility, no repeated or conflicting enhancements',()=>{
 const weapon={type:'weapon',name:'Longsword',system:{type:{value:'martialM',baseItem:'longsword'}},getFlag:()=>null};
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

test('equipped item passive Active Effects use supported D&D5e change paths',()=>{
 const ward=effectChanges(enchantById('armor-flame-ward'));
 assert.deepEqual(ward,[{key:'system.traits.dr.value',mode:2,value:'fire',priority:20}]);
 const stealth=effectChanges(enchantById('armor-shadow-binding'));
 assert.deepEqual(stealth,[{key:'system.skills.ste.roll.bonus',mode:2,value:'2',priority:20}]);
 const concentration=effectChanges(enchantById('armor-magewoven-interior'));
 assert.equal(concentration[0].key,'system.attributes.concentration.roll.bonus');
 const plain=effectChanges(enchantById('weapon-soul-binding'));
 assert.equal(plain.length,0);
});

test('shorter crafting and research schedules leave market values unchanged',()=>{
  assert.equal(reducedDays(5),4);
  assert.equal(reducedDays(10),7);
  assert.equal(reducedDays(14),10);
  assert.equal(reducedDays(16),12);
  assert.equal(RANKS[1].days,2);
  assert.equal(RANKS[5].days,10);
  assert.equal(lessonDays(enchantById('weapon-arcane-infusion')),2);
  assert.equal(enchantById('weapon-arcane-infusion').cost,250);
  assert.equal(enchantById('weapon-greater-arcane-infusion').cost,1000);
});

test('fixed elemental formulas replace global picker and sort by rank',()=>{
 const fixed=ENCHANTMENTS.filter(e=>!!e.fixedElement);
 assert.equal(fixed.length,10);
 assert.equal(fixed.filter(e=>e.elementDice==='1d4').length,5);
 assert.equal(fixed.filter(e=>e.elementDice==='1d6').length,5);
 assert.equal(ENCHANTMENTS.some(e=>e.id==='weapon-elemental-binding'),false);
 assert.equal(ENCHANTMENTS.some(e=>e.id==='weapon-greater-elemental-binding'),false);
 assert.equal(new Set(fixed.map(e=>e.id)).size,10);
 for(const e of fixed){
  assert.ok(['Fire','Cold','Lightning','Acid','Thunder'].includes(e.fixedElement));
  assert.ok(e.name.includes(e.fixedElement));
  assert.equal(displayEnchantEffect(e),'Adds '+e.elementDice+' '+e.fixedElement+' damage on weapon hits.');
  assert.equal(displayEnchantEffect(e,'Fire'),'Adds '+e.elementDice+' '+e.fixedElement+' damage on weapon hits.');
 }
 const sorted=sortEnchantments(ENCHANTMENTS);
 assert.ok(sorted.every((e,i)=>i===0||sorted[i-1].rank<=e.rank));
 assert.deepEqual(sortEnchantments([enchantById('weapon-astral-sever'),enchantById('weapon-spell-channel')]).map(x=>x.rank),[1,5]);
});
test('legacy learned formulas and existing item enchantments survive upgrade',()=>{
 const legacy=enchantById('weapon-elemental-binding');
 const legacyGreater=enchantById('weapon-greater-elemental-binding');
 assert.ok(legacy);assert.ok(legacyGreater);
 assert.equal(displayEnchantEffect(legacy,'Cold'),'Adds 1d4 Cold damage on weapon hits.');
 assert.equal(displayEnchantEffect(legacyGreater,'Thunder'),'Adds 1d6 Thunder damage on weapon hits.');
 const veteran={getFlag:()=>({rank:5,known:['weapon-elemental-binding','weapon-greater-elemental-binding']})};
 for(const e of ENCHANTMENTS.filter(x=>x.fixedElement))assert.equal(learningGate(veteran,e),'');
 assert.equal(knowsEnchant(['weapon-elemental-binding'],enchantById('weapon-elemental-binding-acid')),true);
 assert.equal(knowsEnchant([],enchantById('weapon-elemental-binding-acid')),false);
 assert.equal(usedSlots([{id:'weapon-elemental-binding',element:'Cold'}]),1);
 const longsword={type:'weapon',name:'Longsword',system:{type:{value:'martialM',baseItem:'longsword'},rarity:'very rare'},getFlag:()=>null};
 assert.equal(canApplyEnchant(longsword,enchantById('weapon-elemental-binding-fire'),[{id:'weapon-elemental-binding',element:'Cold'}]),false);
});

test('each enchantment declares exact, named valid equipment types',()=>{
 const all=new Set(Object.keys(EQUIPMENT_LABELS));
 for(const enchant of ENCHANTMENTS){
  assert.ok(enchant.allowed.length>0);
  assert.ok(enchant.allowed.every(tag=>all.has(tag)),enchant.id+' has an unknown target');
  assert.ok(enchantTargetLabels(enchant).every(label=>label.length>1));
  assert.ok(!enchant.allowed.includes('armor')&&!enchant.allowed.includes('weapon'));
 }
 assert.equal(enchantTargetLabels(enchantById('armor-guardians-crest')).join(', '),'Shields');
 assert.equal(enchantTargetLabels(enchantById('armor-mystic-stitching')).join(', '),'Robes');
 assert.equal(enchantTargetLabels(enchantById('armor-fleetfoot-rune')).join(', '),'Boots');
 assert.equal(enchantTargetLabels(enchantById('armor-echo-ring')).join(', '),'Rings');
 assert.ok(enchantTargetLabels(enchantById('weapon-hawkflight')).includes('Bows'));
});
test('classifies weapons, armor, robes, and wearable slots without admitting loot',()=>{
 const equipment=(name,value='wondrous')=>({name,type:'equipment',system:{type:{value}}});
 const weapon=(name,code='martialM')=>({name,type:'weapon',system:{type:{value:code,baseItem:name.toLowerCase()}}});
 assert.ok(itemTags(weapon('Longsword')).includes('sword'));
 assert.ok(itemTags(weapon('Dagger')).includes('dagger'));
 assert.ok(itemTags(weapon('Greataxe')).includes('axe'));
 assert.ok(itemTags(weapon('Warhammer')).includes('hammer'));
 assert.ok(itemTags(weapon('Shortbow','martialR')).includes('bow'));
 assert.ok(itemTags(weapon('Heavy Crossbow','martialR')).includes('crossbow'));
 assert.ok(itemTags(weapon('Quarterstaff')).includes('staff'));
 assert.ok(itemTags(weapon('Spear')).includes('polearm'));
 for(const [name,tag] of [
  ['Robe of Stars','robe'],['Enchanter Robe','robe'],['Boots of Elvenkind','boots'],
  ['Cloak of Protection','cloak'],['Gloves of Dexterity','gloves'],
  ['Helm of Brilliance','helm'],['Ring of Spell Storing','ring'],
  ['Amulet of Health','amulet'],["Belt of Giant Strength",'belt']
 ])assert.ok(itemTags(equipment(name)).includes(tag),'Missing '+tag);
 assert.ok(itemTags(equipment('Mage Robe','clothing')).includes('robe'));
 assert.equal(targetKind(equipment('Robe of Stars')),'armor');
 assert.ok(itemClassification(equipment('Mage Robe','clothing')).includes('Robes'));
 assert.equal(targetKind({type:'loot',name:'Robe of Stars',system:{type:{value:'clothing'}}}),null);
 assert.equal(targetKind(equipment('Gemstone')),null);
 assert.ok(itemTags(equipment('Studded Leather','light')).includes('light'));
 assert.ok(itemTags(equipment('Breastplate','medium')).includes('medium'));
 assert.ok(itemTags(equipment('Plate Armor','heavy')).includes('heavy'));
 assert.ok(itemTags(equipment('Shield','shield')).includes('shield'));
});
test('enchantment restrictions never allow robe enchantments on shields or heavy armor',()=>{
 const gear=(name,value='wondrous',rarity='legendary')=>({name,type:'equipment',
  system:{type:{value},rarity},getFlag:()=>null});
 const robe=gear('Arcane Robe','clothing'),shield=gear('Steel Shield','shield'),
  plate=gear('Plate Armor','heavy'),boots=gear('Wanderer Boots'),
  gloves=gear('Arcane Gloves');
 assert.ok(canApplyEnchant(robe,enchantById('armor-mystic-stitching'),[]));
 assert.ok(canApplyEnchant(robe,enchantById('armor-arcane-mesh'),[]));
 assert.equal(canApplyEnchant(shield,enchantById('armor-mystic-stitching'),[]),false);
 assert.equal(canApplyEnchant(plate,enchantById('armor-mystic-stitching'),[]),false);
 assert.equal(canApplyEnchant(robe,enchantById('armor-guardians-crest'),[]),false);
 assert.ok(canApplyEnchant(shield,enchantById('armor-guardians-crest'),[]));
 assert.equal(canApplyEnchant(boots,enchantById('armor-mystic-stitching'),[]),false);
 assert.ok(canApplyEnchant(boots,enchantById('armor-fleetfoot-rune'),[]));
 assert.equal(canApplyEnchant(gloves,enchantById('armor-fleetfoot-rune'),[]),false);
 assert.ok(canApplyEnchant(gloves,enchantById('armor-runic-grip'),[]));
 assert.equal(canApplyEnchant(gear('Circlet of Insight'),enchantById('armor-echo-ring'),[]),false);
 const sword={type:'weapon',name:'Longsword',system:{type:{value:'martialM',baseItem:'longsword'},rarity:'legendary'},getFlag:()=>null};
 const bow={...sword,name:'Longbow',system:{type:{value:'martialR',baseItem:'longbow'},rarity:'legendary'}};
 assert.equal(canApplyEnchant(bow,enchantById('weapon-keen-edge'),[]),false);
 assert.ok(canApplyEnchant(sword,enchantById('weapon-keen-edge'),[]));
 assert.equal(canApplyEnchant(sword,enchantById('weapon-storm-arrow'),[]),false);
 assert.ok(canApplyEnchant(bow,enchantById('weapon-storm-arrow'),[]));
});
