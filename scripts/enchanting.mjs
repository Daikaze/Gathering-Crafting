/** Gathering & Crafting — stable Enchanting catalogue and pure economy/time rules.
 * Prices are GP; durations are world-calendar days (24 hours per day).
 * Enchant identifiers are scoped to item type to avoid weapon/armor collisions.
 */
export const ELEMENTS = Object.freeze(['Fire','Cold','Lightning','Acid','Thunder']);
const weapon = (id,name,cost,days,description,extra={})=>({id:'weapon-'+id,name,kind:'weapon',cost,days,description,...extra});
const armor = (id,name,cost,days,description)=>({id:'armor-'+id,name,kind:'armor',cost,days,description});
export const ENCHANTMENTS = Object.freeze([
  weapon('spell-channel','Spell Channel',125,2,'The weapon can be used as a spellcasting focus.'),
  weapon('arcane-infusion','Arcane Infusion',250,5,'The weapon becomes magical and gains a +1 bonus to attack and damage rolls.',{magicalBonus:1,exclusive:'arcane-infusion'}),
  weapon('greater-arcane-infusion','Greater Arcane Infusion',1000,10,'The weapon becomes magical and gains a +2 bonus to attack and damage rolls.',{magicalBonus:2,exclusive:'arcane-infusion'}),
  weapon('elemental-binding','Elemental Binding',300,4,'Adds 1d4 damage of the selected type (Fire, Cold, Lightning, Acid or Thunder).',{elementDice:'1d4',exclusive:'elemental-binding'}),
  weapon('greater-elemental-binding','Greater Elemental Binding',800,10,'Adds 1d6 damage of the selected elemental type.',{elementDice:'1d6',exclusive:'elemental-binding'}),
  weapon('soul-binding','Soul Binding',500,4,'The weapon returns to its owner after 1 minute.'),
  weapon('blessed-weapon','Blessed Weapon',350,2,'The item counts as a holy weapon.'),
  weapon('shadow-binding','Shadow Binding',350,3,'Grants +2 to Stealth while the weapon is equipped.'),
  weapon('arcane-reservoir','Arcane Reservoir',500,2,'Stores one spell of up to 3rd level.'),
  weapon('hunters-marking',"Hunter's Marking",600,4,"Cast Hunter's Mark once per Long Rest."),
  weapon('fey-blessing','Fey Blessing',750,5,'Cast Misty Step once per Long Rest.'),
  armor('magewoven-interior','Magewoven Interior',120,5,'Gain +1 on Constitution saving throws to maintain concentration.'),
  armor('arcane-mesh','Arcane Mesh',150,6,'Gain +2 on Arcana checks.'),
  armor('shadow-binding','Shadow Binding',350,5,'Gain +2 on Stealth checks while the armor is equipped.'),
  armor('stone-binding','Stone Binding',750,10,'Gain advantage against being knocked Prone and against forced movement.'),
  armor('wind-binding','Wind Binding',750,10,'Bonus Action: gain +10 ft movement for 1 minute, once per Long Rest.'),
  armor('frost-ward','Frost Ward',750,10,'Gain resistance to Cold damage.'),
  armor('flame-ward','Flame Ward',750,10,'Gain resistance to Fire damage.'),
  armor('storm-ward','Storm Ward',750,10,'Gain resistance to Lightning damage.'),
  armor('fey-blessing','Fey Blessing',750,10,'Cast Misty Step once per Long Rest.'),
  armor('phoenix-binding','Phoenix Binding',1500,14,'Once per Long Rest, remain at 1 HP instead of dropping to 0 HP.'),
  armor('celestial-blessing','Celestial Blessing',1000,10,'Cast Cure Wounds at 2nd level once per Long Rest.'),
  armor('arcane-reservoir','Arcane Reservoir',500,7,'Stores one spell of up to 3rd level.'),
  armor('guardian-aura','Guardian Aura',1200,12,'Allies within 5 ft gain +1 against Fear effects.'),
  armor('soul-binding','Soul Binding',500,7,'The armor is magically bound to its owner and cannot be used by another person.')
]);
export const enchantById=id=>ENCHANTMENTS.find(e=>e.id===id)||null;
export const DAY_SECONDS = 86400;
export function targetKind(item) {
  if (!item) return null;
  if (item.type==='weapon') return 'weapon';
  if (item.type!=='equipment') return null;
  const values=[item.system?.type?.value,item.system?.type,item.system?.armor?.type,item.system?.armor?.value?.type];
  return values.some(v=>['light','medium','heavy','shield','natural'].includes(String(v).toLowerCase()))?'armor':null;
}
export function canApplyEnchant(item, enchant, completed=[]) {
  if (!enchant||targetKind(item)!==enchant.kind) return false;
  if (item.getFlag?.('gathering-crafting','enchantmentPending')) return false;
  const known=completed.map(e=>enchantById(e.id)).filter(Boolean);
  return !known.some(e=>e.id===enchant.id||(enchant.exclusive&&e.exclusive===enchant.exclusive));
}
export function costInCopper(currency) {
  const rate={pp:1000,gp:100,ep:50,sp:10,cp:1};
  return Object.entries(rate).reduce((sum,[denom,unit])=>{
    const qty=Number(currency?.[denom]??0);
    if(!Number.isSafeInteger(qty)||qty<0)throw new Error('Invalid character currency.');
    return sum+qty*unit;
  },0);
}
export function afterGoldPayment(currency,gp) {
  if(!Number.isSafeInteger(gp)||gp<0)throw new Error('Invalid enchantment cost.');
  let remaining=costInCopper(currency)-gp*100;
  if(remaining<0)return null;
  const next={};for(const [key,cp] of [['pp',1000],['gp',100],['ep',50],['sp',10],['cp',1]]){
    next[key]=Math.floor(remaining/cp);remaining%=cp;
  }
  return next;
}
export function completionAt(start,days) {
  if(!Number.isFinite(start)||!Number.isSafeInteger(days)||days<1)throw new Error('Invalid enchantment time.');
  return start+days*DAY_SECONDS;
}
export function displayEnchantEffect(enchant, element) {
  if (!enchant) return '';
  if (!enchant.elementDice) return enchant.description;
  if(!ELEMENTS.includes(element))throw new Error('Choose a valid elemental damage type.');
  return 'Adds '+enchant.elementDice+' '+element+' damage on weapon hits.';
}
