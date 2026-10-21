/** Enchanting UI and item operations for Gathering & Crafting / Foundry V14.
 * Other than the native magic-item +1/+2 bonus, special effects are documented
 * as item notes. Never grant actor-wide damage bonuses for weapon-specific effects.
 */
import {ENCHANTMENTS, ELEMENTS, DAY_SECONDS, enchantById, targetKind, canApplyEnchant, afterGoldPayment, completionAt, displayEnchantEffect} from './enchanting.mjs';
const ENCHANT_NS='gathering-crafting';
const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=(name)=>'<i class="fa-solid fa-'+name+'" aria-hidden="true"></i>';
const qty=i=>Number(i?.system?.quantity??1);
const itemList=actor=>(actor?.items||[]).filter(i=>targetKind(i)&&qty(i)===1);
const getItem=(app,actor)=>itemList(actor).find(i=>i.id===app.enchantItemId)||itemList(actor)[0]||null;
const getFlags=(item,key)=>item?.getFlag?.(ENCHANT_NS,key);
const timeNow=()=>Number(game.time?.worldTime);
const moneyText=currency=>{
  const c=currency||{};
  const copper=Number(c.pp||0)*1000+Number(c.gp||0)*100+Number(c.ep||0)*50+Number(c.sp||0)*10+Number(c.cp||0);
  return (copper/100).toFixed(2).replace(/\.00$/,'');
};
export function enchantingHtml(app,actor,helpers){
  const {heading,renderCards,searchBar,artworkFor}=helpers;
  const all=itemList(actor);
  const item=getItem(app,actor);
  const complete=getFlags(item,'enchantments')||[];
  const job=getFlags(item,'enchantmentPending');
  const now=timeNow(),currency=actor?.system?.currency||{};
  let output=heading('fa-wand-magic-sparkles','Enchanting','11 weapon and 14 armor enchantments. Choose an item, pay gold, and complete the work after the required in-world days.');
  output+='<div class="gc-enchant-summary"><label class="gc-field"><span>Item to enchant</span><select name="enchantItem">';
  output+=all.length?all.map(i=>'<option value="'+escapeHtml(i.id)+'" '+(i===item?'selected':'')+'>'+escapeHtml(i.name)+' ('+(targetKind(i)==='weapon'?'Weapon':'Armor')+')</option>').join(''):'<option value="">No eligible items</option>';
  output+='</select></label><div class="gc-enchant-funds">'+ico('coins')+' <strong>'+escapeHtml(moneyText(currency))+' gp</strong><small>Available funds</small></div></div>';
  if(!item)return output+'<div class="gc-empty">Add a weapon or armor item to the selected character. Stacked items must be separated first.</div>';
  output+='<div class="gc-enchant-selected"><img src="'+escapeHtml(artworkFor(item))+'" alt=""><div><strong>'+escapeHtml(item.name)+'</strong><small>'+(targetKind(item)==='weapon'?'Weapon':'Armor / shield')+' · '+complete.length+' enchantments completed</small></div><button type="button" class="gc-secondary" data-action="sheetItem" data-id="'+escapeHtml(item.id)+'">'+ico('up-right-from-square')+' Item Sheet</button></div>';
  if(complete.length)output+='<div class="gc-enchant-applied">'+complete.map(c=>'<span>'+ico('check-circle')+' '+escapeHtml(enchantById(c.id)?.name||c.id)+(c.element?' · '+escapeHtml(c.element):'')+'</span>').join('')+'</div>';
  if(job){
    const remaining=Math.max(0,Math.ceil((Number(job.finishAt)-now)/DAY_SECONDS));
    output+='<div class="gc-enchant-job"><strong>'+ico('hourglass-half')+' '+escapeHtml(enchantById(job.id)?.name||job.id)+' in progress</strong><span>'+remaining+' day(s) remaining · '+Number(job.cost)+' gp paid</span><small>Requires elapsed Foundry world time. Only one active enchantment per item.</small><button type="button" class="gc-primary" data-action="finishEnchant" data-id="'+escapeHtml(item.id)+'" '+(now<Number(job.finishAt)||app.busy?'disabled':'')+'>'+ico('check')+' Complete Enchantment</button></div>';
  }
  output+='<div class="gc-toolbar gc-compact-toolbar"><div class="gc-enchant-hint">'+ico('circle-info')+' '+(targetKind(item)==='weapon'?'Weapon':'Armor')+' enchantments</div>'+searchBar()+'</div>';
  output+='<div class="gc-enchant-element"><label>Elemental damage type <select name="enchantElement">'+ELEMENTS.map(e=>'<option value="'+e+'" '+(app.enchantElement===e?'selected':'')+'>'+e+'</option>').join('')+'</select></label></div>';
  const show=ENCHANTMENTS.filter(e=>e.kind===targetKind(item)&&(!app.search||[e.name,e.description].some(t=>t.toLowerCase().includes(app.search.toLowerCase()))));
  output+=renderCards(show,e=>{
    const allowed=canApplyEnchant(item,e,complete);
    const affordable=afterGoldPayment(currency,e.cost)!==null;
    const duplicate=complete.some(c=>c.id===e.id);
    const reason=job?'In progress':duplicate?'Already applied':!allowed?'Conflicting enchantment':!affordable?'Not enough gold':'Begin Enchantment';
    const disabled=!allowed||!affordable||app.busy;
    const effect=displayEnchantEffect(e,e.elementDice?app.enchantElement:undefined);
    return '<article class="gc-tile gc-enchant-card"><div class="gc-tile-body"><div class="gc-enchant-title">'+ico(e.kind==='weapon'?'khanda':'shield-halved')+' <strong>'+escapeHtml(e.name)+'</strong></div><div class="gc-enchant-meta"><span>'+ico('coins')+' '+e.cost+' gp</span><span>'+ico('clock')+' '+e.days+' days</span></div><p>'+escapeHtml(effect)+'</p><button type="button" class="gc-primary" data-action="startEnchant" data-id="'+escapeHtml(e.id)+'" '+(disabled?'disabled':'')+'>'+ico(disabled?'lock':'wand-magic-sparkles')+' '+reason+'</button></div></article>';
  });
  output+='<p class="gc-help gc-enchant-disclaimer">Arcane Infusion bonuses are written to native D&D5e magical item fields. Other powers are recorded in the Item description for GM adjudication; conditional resistances, spell uses and extra damage are not silently automated. This tab does not advance world time.</p>';
  return output;
}
export async function beginEnchantment(app,id,helpers) {
  const {actor,announce,notify}=helpers;
  const item=getItem(app,actor),enchant=enchantById(id);
  if(!item||!enchant||qty(item)!==1)throw new Error('Select a single weapon or armor item.');
  if(!canApplyEnchant(item,enchant,getFlags(item,'enchantments')||[]))throw new Error('Enchantment already present, pending, or incompatible.');
  const element=enchant.elementDice?app.enchantElement:null;
  const effect=displayEnchantEffect(enchant,element);
  const original=foundry.utils.deepClone(actor.system?.currency||{});
  const next=afterGoldPayment(original,enchant.cost);
  if(!next)throw new Error('Not enough gold.');
  const now=timeNow();
  if(!Number.isFinite(now))throw new Error('Foundry world time is unavailable.');
  const approved=await foundry.applications.api.DialogV2.confirm({window:{title:'Start Enchantment'},content:'<p>Enchant <b>'+escapeHtml(item.name)+'</b> with <b>'+escapeHtml(enchant.name)+'</b>?</p><p>Cost: <b>'+enchant.cost+' gp</b> · Duration: <b>'+enchant.days+' world days</b>.</p><p>'+escapeHtml(effect)+'</p><p>Gold will be charged now.</p>'});
  if(!approved)return;
  if(!canApplyEnchant(item,enchant,getFlags(item,'enchantments')||[]))throw new Error('Item enchantment state changed. Try again.');
  const renewed=afterGoldPayment(actor.system?.currency,enchant.cost);
  if(!renewed)throw new Error('Available gold changed while confirming.');
  const pending={id:enchant.id,element,startedAt:now,finishAt:completionAt(now,enchant.days),days:enchant.days,cost:enchant.cost};
  await actor.update({'system.currency':renewed});
  try {await item.update({['flags.'+ENCHANT_NS+'.enchantmentPending']:pending});}
  catch(error){
    try{await actor.update({'system.currency':original});}
    catch(refundError){console.error(ENCHANT_NS+' | Gold refund failed',refundError);notify('Refund failed. Ask the GM to restore the gold.',true);}
    throw error;
  }
  await announce(actor,'<p><b>'+escapeHtml(actor.name)+'</b> began <b>'+escapeHtml(enchant.name)+'</b> on <b>'+escapeHtml(item.name)+'</b>.</p><p>'+enchant.cost+' gp paid. '+enchant.days+' world day(s) required.</p>');
  notify(enchant.name+' started on '+item.name+'.');
}
export async function finishEnchantment(app,itemId,helpers) {
  const {actor,announce,notify}=helpers;
  const item=actor.items.get?.(itemId)||actor.items.find(i=>i.id===itemId);
  if(!item||!targetKind(item))throw new Error('Enchanted item is unavailable.');
  const job=getFlags(item,'enchantmentPending'),enchant=enchantById(job?.id),now=timeNow();
  if(!job||!enchant||targetKind(item)!==enchant.kind)throw new Error('No valid enchantment in progress.');
  if(!Number.isFinite(now)||now<Number(job.finishAt))throw new Error('Required world days have not passed.');
  const completed=foundry.utils.deepClone(getFlags(item,'enchantments')||[]);
  if(completed.some(e=>e.id===enchant.id))throw new Error('Enchantment was already applied.');
  const effect=displayEnchantEffect(enchant,job.element);
  const block='<section class="gc-item-enchantment" data-gc-enchant="'+escapeHtml(enchant.id)+'"><p><strong>'+escapeHtml(enchant.name)+' (Gathering & Crafting):</strong> '+escapeHtml(effect)+'</p></section>';
  const updates={['flags.'+ENCHANT_NS+'.enchantments']:[...completed,{id:enchant.id,element:job.element||null,completedAt:now}],['flags.'+ENCHANT_NS+'.enchantmentPending']:null,'system.description.value':String(item.system?.description?.value||'')+'\n'+block};
  if(enchant.magicalBonus){
    const old=Number(enchant.kind==='weapon'?item.system?.magicalBonus:item.system?.armor?.magicalBonus)||0;
    updates[enchant.kind==='weapon'?'system.magicalBonus':'system.armor.magicalBonus']=Math.max(old,enchant.magicalBonus);
    const existing=item.system?.properties;
    const list=existing instanceof Set?[...existing]:Array.isArray(existing)?existing.slice():Object.entries(existing||{}).filter(([,v])=>v).map(([k])=>k);
    updates['system.properties']=[...new Set([...list,'mgc'])];
  }
  await item.update(updates);
  await announce(actor,'<p><b>'+escapeHtml(actor.name)+'</b> completed <b>'+escapeHtml(enchant.name)+'</b> on <b>'+escapeHtml(item.name)+'</b>.</p><p>'+escapeHtml(effect)+'</p>');
  notify(enchant.name+' completed on '+item.name+'.');
}
