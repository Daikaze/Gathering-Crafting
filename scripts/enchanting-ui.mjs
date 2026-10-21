/** Enchanting workshop v1.3 — profession training, restricted items, learnable recipes.
 * Training and enchantment jobs use Foundry world time, no hidden GM changes.
 * Powers have a visible Use button; special combat effects remain GM-adjudicated.
 */
import {rollFormula} from './tool-rules.mjs';
import {ENCHANTMENTS,sortEnchantments,knowsEnchant,DAY_SECONDS,RANKS,enchantById,targetKind,itemClassification,enchantTargetLabels,capacity,usedSlots,explainCompatibility,professionOf,learningGate,hasTrainingTools,enchantingTool,arcanaBonus,completionAt,displayEnchantEffect,lessonDays} from './enchanting.mjs';
const ENCHANT_NS='gathering-crafting';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=name=>'<i class="fa-solid fa-'+name+'" aria-hidden="true"></i>';
const qty=item=>Number(item?.system?.quantity??1);
const itemList=actor=>(actor?.items||[]).filter(i=>targetKind(i)&&qty(i)===1);
const getItem=(app,actor)=>itemList(actor).find(i=>i.id===app.enchantItemId)||itemList(actor)[0]||null;
const getFlags=(item,key)=>item?.getFlag?.(ENCHANT_NS,key);
const now=()=>Number(game.time?.worldTime);
const safeClone=obj=>foundry.utils.deepClone(obj);
const toolWarning=actor=>hasTrainingTools(actor)?'':"Requires a Jeweler's Tools or Enchanter's Tools item in your inventory.";
const jobLine=(job)=>{
 const remaining=Math.max(0,Math.ceil((Number(job.finishAt)-now())/DAY_SECONDS));
 return remaining+' world day(s) remaining';
};
export function enchantingHtml(app,actor,helpers){
 const {heading,renderCards,searchBar,artworkFor}=helpers;
 const items=itemList(actor),selected=getItem(app,actor);
 const complete=getFlags(selected,'enchantments')||[],pending=getFlags(selected,'enchantmentPending');
 const availableTool=enchantingTool(actor),toolOK=!!availableTool;
 let output=heading('fa-wand-magic-sparkles','Enchanting',ENCHANTMENTS.length+' enchantments, restricted by equipment type, item rarity and available enchantment slots.');
 output+='<div class="gc-enchant-progression"><div class="gc-enchant-rank"><strong>'+ico('hammer')+' Enchanting Tools</strong><span>'+
   (toolOK?escapeHtml(availableTool.item.name):'No enchanting tools detected')+'</span>'+
   '<small>'+(availableTool?.advantage?'Advantage on Enchanting checks (tool proficiency).':'Normal Enchanting checks (no tool proficiency required).')+'</small></div>'+
   '<div class="gc-enchant-training"><strong>Requirements</strong><span>Carry Jeweler’s Tools or Enchanter’s Tools, then choose compatible equipment.</span>'+
   '<small>Recipe tiers are difficulty labels — no rank training or formula research is required.</small></div></div>';
 if(!toolOK)output+='<p class="gc-missing-tool">'+ico('lock')+' '+escapeHtml(toolWarning(actor))+'</p>';
 output+='<div class="gc-enchant-summary"><label class="gc-field"><span>Item to enchant</span><select name="enchantItem">';
 output+=items.length?items.map(i=>'<option value="'+escapeHtml(i.id)+'" '+(i===selected?'selected':'')+'>'+escapeHtml(i.name)+' ('+escapeHtml(itemClassification(i))+')</option>').join(''):'<option value="">No eligible equipment</option>';
 output+='</select></label><div class="gc-enchant-funds">'+ico('coins')+' <strong>Market values</strong><small>Prices are for customers, not deducted from the crafter.</small></div></div>';
 if(!selected)return output+'<div class="gc-empty">Add a single weapon, armor, or shield to the character. Stacked equipment is not eligible.</div>';
 const spent=usedSlots(complete);
 output+='<div class="gc-enchant-selected"><img src="'+escapeHtml(artworkFor(selected))+'" alt=""><div><strong>'+escapeHtml(selected.name)+'</strong><small>'+escapeHtml(itemClassification(selected))+' · '+spent+'/'+capacity(selected)+' enchantment slots used · '+escapeHtml(selected.system?.rarity||'Common')+' rarity</small></div><button type="button" class="gc-secondary" data-action="sheetItem" data-id="'+escapeHtml(selected.id)+'">'+ico('up-right-from-square')+' Item Sheet</button></div>';
 if(game.user?.isGM)output+='<div class="gc-enchant-gm-slots"><label>GM item capacity (0–6) <input type="number" name="enchantSlots" min="0" max="6" step="1" value="'+capacity(selected)+'"></label><button class="gc-secondary" data-action="saveEnchantSlots" data-id="'+escapeHtml(selected.id)+'">Set item slots</button></div>';
 if(complete.length){
  output+='<div class="gc-enchant-applied">'+complete.map(e=>{
   const def=enchantById(e.id),power=def?.power,spent=getFlags(selected,'enchantmentUses')?.[e.id]||0;
   return '<div class="gc-enchant-applied-entry"><span>'+ico('check-circle')+' '+escapeHtml(def?.name||e.id)+(e.element?' · '+escapeHtml(e.element):'')+'</span>'+
     (power?'<button type="button" class="gc-secondary" data-action="useEnchant" data-id="'+escapeHtml(selected.id)+'" data-enchant="'+escapeHtml(e.id)+'" '+(spent>=power.uses?'disabled':'')+'>Use '+(power.uses-spent)+'/'+power.uses+'</button>':'')+'</div>';
  }).join('')+'</div>';
 }
 if(pending)output+='<div class="gc-enchant-job"><strong>'+ico('hourglass-half')+' '+escapeHtml(enchantById(pending.id)?.name||pending.id)+' in progress</strong><span>'+jobLine(pending)+' · Market value '+Number(pending.cost??enchantById(pending.id)?.cost??0)+' gp</span><small>Only one active enchantment per item. World time is never advanced automatically.</small><button class="gc-primary" data-action="finishEnchant" data-id="'+escapeHtml(selected.id)+'" '+(now()<Number(pending.finishAt)||app.busy?'disabled':'')+'>Complete Enchantment</button></div>';
 output+='<div class="gc-toolbar gc-compact-toolbar"><div class="gc-enchant-hint">'+ico('circle-info')+' Choose compatible enchantments</div>'+searchBar()+'</div>';
 output+='<div class="gc-enchant-element"><label>Show <select name="enchantFilter">'+[['all','All'],['available','Ready to enchant'],['compatible','Compatible items'],['locked','Unavailable']].map(([k,v])=>'<option value="'+k+'" '+((app.enchantFilter||'all')===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div>';
 let list=sortEnchantments(ENCHANTMENTS.filter(e=>e.kind===targetKind(selected)&&(!app.search||[e.name,e.description,...e.allowed].join(' ').toLowerCase().includes(app.search.toLowerCase()))));
 list=list.filter(e=>{
  const reason=explainCompatibility(selected,e,complete);
  if(app.enchantFilter==='available')return !reason&&toolOK;
  if(app.enchantFilter==='compatible')return !reason;
  if(app.enchantFilter==='locked')return !!reason||!toolOK;
  return true;
 });
 output+=renderCards(list,e=>{
  const compatible=explainCompatibility(selected,e,complete);
  const enchantGate=compatible||(!toolOK?'Missing enchanting tools':'');
  const canEnchant=!enchantGate&&!app.busy;
  return '<article class="gc-tile gc-enchant-card"><div class="gc-tile-body"><div class="gc-enchant-title">'+ico(e.kind==='weapon'?'khanda':'shield-halved')+' <strong>'+escapeHtml(e.name)+'</strong></div>'+
    '<div class="gc-enchant-meta"><span>Tier '+e.rank+' · '+escapeHtml(RANKS[e.rank].name)+'</span><span>'+e.slots+' slot(s)</span></div>'+
    '<div class="gc-enchant-meta"><span>'+ico('coins')+' Market value: '+e.cost+' gp</span><span>'+ico('clock')+' Crafting: '+e.days+' day(s)</span></div>'+
    '<p>'+escapeHtml(displayEnchantEffect(e))+'</p>'+
    '<div class="gc-enchant-targets"><strong>'+ico('filter')+' Compatible with:</strong> <span>'+escapeHtml(enchantTargetLabels(e).join(' · '))+'</span></div>'+
    (compatible&&compatible.startsWith('Only for:')?'<small class="gc-enchant-incompatible">'+ico('lock')+' Incompatible with '+escapeHtml(itemClassification(selected))+'</small>':compatible?'<small class="gc-enchant-compat">'+escapeHtml(compatible)+'</small>':'<small class="gc-enchant-compatible">'+ico('check-circle')+' Compatible with selected item</small>')+
    '<div class="gc-enchant-actions">'+
    '<button type="button" class="gc-primary" data-action="startEnchant" data-id="'+escapeHtml(e.id)+'" '+(!canEnchant?'disabled':'')+'>'+escapeHtml(enchantGate||'Enchant')+'</button></div></div></article>';
 });
 output+='<p class="gc-help gc-enchant-disclaimer">Passive bonuses may use native Active Effects on equipped Items. Elemental damage and +1/+2 bonuses update weapon data. Once-per-Long-Rest powers have Use buttons and recharge after an in-system Long Rest; spell resolution, targets and unusual combat effects still require GM adjudication. Market values are reference prices; crafting and training do not deduct gold. The module never auto-picks a target.</p>';
 return output;
}
async function confirmLesson(title,desc){
 return foundry.applications.api.DialogV2.confirm({window:{title},content:'<p>'+escapeHtml(desc)+'</p><p>Training uses in-world time and Arcana checks. No gold is deducted from the crafter.</p>'});
}
export async function beginLesson(actor,kind,id,notify){
 if(!hasTrainingTools(actor))throw new Error(toolWarning(actor));
 const state=professionOf(actor);
 if(state.training)throw new Error('Finish the current lesson first.');
 let duration,dc,target,enchant;
 if(kind==='rank'){
  if(state.rank>=5)throw new Error('Maximum proficiency reached.');
  target=state.rank+1;({days:duration,dc}=RANKS[target]);
 }else{
  enchant=enchantById(id);
  if(!enchant)throw new Error('Unknown enchantment.');
  if(state.rank<enchant.rank)throw new Error('Insufficient Enchanting proficiency.');
  if(knowsEnchant(state.known,enchant))throw new Error('Already learned.');
  duration=lessonDays(enchant);dc=10+enchant.rank*2;
 }
 const stamp=now();
 if(!Number.isFinite(stamp))throw new Error('Foundry world time is unavailable.');
 const label=kind==='rank'?RANKS[target].name:enchant.name;
 if(!await confirmLesson('Begin Enchanting Lesson',label+' · '+duration+' world day(s) · Arcana check'+(game.user?.isGM?' (DC '+dc+')':'')))return;
 const latest=professionOf(actor);if(latest.training||latest.rank!==state.rank)throw new Error('Training changed while confirming.');
 await actor.update({['flags.'+ENCHANT_NS+'.enchanter']:{...latest,training:{kind,id:enchant?.id||null,target,startedAt:stamp,finishAt:completionAt(stamp,duration),dc,cost:0,attempts:0}}});
 notify('Lesson started: '+label+'.');
}
export async function finishLesson(actor,notify,announce,announceGM){
 if(!hasTrainingTools(actor))throw new Error(toolWarning(actor));
 const state=professionOf(actor),lesson=state.training;
 if(!lesson)throw new Error('No Enchanting lesson in progress.');
 if(now()<lesson.finishAt)throw new Error('Required world days have not passed.');
 const check=await new Roll('1d20 + @bonus',{bonus:arcanaBonus(actor)+state.rank}).evaluate();
 if(check.total<lesson.dc){
  const delayed={...lesson,finishAt:Math.max(lesson.finishAt,now())+DAY_SECONDS,attempts:(lesson.attempts||0)+1};
  await actor.update({['flags.'+ENCHANT_NS+'.enchanter']:{...state,training:delayed}});
  notify('Enchanting check failed. Retry after one world day.');
  await announce(actor,'<p>Enchanting lesson: Arcana roll '+check.total+'. Study failed; retry after one world day.</p>');
  if(announceGM)await announceGM(actor,'<p>Enchanting study: Arcana '+check.total+' vs DC '+lesson.dc+' (failed).</p>');
  return false;
 }
 const updated={...state,training:null};
 if(lesson.kind==='rank')updated.rank=Math.max(state.rank,lesson.target);
 else if(!updated.known.includes(lesson.id))updated.known=[...state.known,lesson.id];
 await actor.update({['flags.'+ENCHANT_NS+'.enchanter']:updated});
 const label=lesson.kind==='rank'?RANKS[updated.rank].name:enchantById(lesson.id)?.name;
 notify('Enchanter training complete: '+label+'.');
 await announce(actor,'<p>Completed Enchanting study: <strong>'+escapeHtml(label)+'</strong>. Arcana roll '+check.total+'.</p>');
 if(announceGM)await announceGM(actor,'<p>Enchanting study: Arcana '+check.total+' vs DC '+lesson.dc+' (success).</p>');
 return true;
}
export async function beginEnchantment(app,id,helpers){
 const {actor,announce,notify}=helpers,item=getItem(app,actor),enchant=enchantById(id);
 if(!item||!enchant||qty(item)!==1)throw new Error('Select a single weapon or armor item.');
 if(!hasTrainingTools(actor))throw new Error(toolWarning(actor));
 const conflict=explainCompatibility(item,enchant,getFlags(item,'enchantments')||[]);
 if(conflict)throw new Error(conflict);
 const element=enchant.fixedElement||null;
 const effect=displayEnchantEffect(enchant,element),stamp=now();
 if(!Number.isFinite(stamp))throw new Error('Foundry world time unavailable.');
  const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Start Enchantment'},content:'<p>'+escapeHtml(item.name)+' — '+escapeHtml(enchant.name)+'</p><p>Market value: '+enchant.cost+' gp · Crafting: '+enchant.days+' world day(s) · '+enchant.slots+' slot(s).</p><p>No gold is deducted from the crafter.</p><p>'+escapeHtml(effect)+'</p>'});
 if(!yes)return;
 if(!hasTrainingTools(actor)||explainCompatibility(item,enchant,getFlags(item,'enchantments')||[]))throw new Error('Requirements changed during confirmation.');
 const job={id:enchant.id,element,startedAt:stamp,finishAt:completionAt(stamp,enchant.days),days:enchant.days,cost:enchant.cost,slots:enchant.slots,rulesVersion:'1.3.5'};
 await item.update({['flags.'+ENCHANT_NS+'.enchantmentPending']:job});
 await announce(actor,'<p>Started '+escapeHtml(enchant.name)+' on '+escapeHtml(item.name)+'. Market value '+enchant.cost+' gp; requires '+enchant.days+' world days. No payment charged.</p>');
 notify(enchant.name+' started.');
}
export const effectChanges=enchant=>{
 const changes=[];
 if(enchant.passive?.skill)changes.push({key:'system.skills.'+enchant.passive.skill+'.roll.bonus',mode:2,value:String(enchant.passive.bonus),priority:20});
 if(enchant.passive?.concentration)changes.push({key:'system.attributes.concentration.roll.bonus',mode:2,value:String(enchant.passive.concentration),priority:20});
 if(enchant.passive?.save)changes.push({key:'system.abilities.'+enchant.passive.save+'.save.roll.bonus',mode:2,value:String(enchant.passive.bonus),priority:20});
 if(enchant.resistance)changes.push({key:'system.traits.dr.value',mode:2,value:enchant.resistance,priority:20});
 return changes;
};
export async function finishEnchantment(app,itemId,helpers){
 const {actor,announce,announceGM,notify}=helpers,item=actor.items.get?.(itemId)||actor.items.find(i=>i.id===itemId);
 const job=getFlags(item,'enchantmentPending'),enchant=enchantById(job?.id),stamp=now();
 if(!job||!enchant||targetKind(item)!==enchant.kind)throw new Error('No valid enchantment job.');
 if(!Number.isFinite(stamp)||stamp<Number(job.finishAt))throw new Error('Required world days have not passed.');
 const tool=enchantingTool(actor);
 if(!tool)throw new Error(toolWarning(actor));
 // Jobs created before v1.3.5 keep their original guaranteed-completion rules.
 // New enchanting jobs use an Arcana check and proficiency gives Advantage.
 if(job.rulesVersion==='1.3.5'){
   const dc=10+enchant.rank*2;
   const bonus=arcanaBonus(actor);
   const check=await new Roll(rollFormula(tool.advantage),{bonus}).evaluate();
   if(check.total<dc){
     await item.update({['flags.'+ENCHANT_NS+'.enchantmentPending']:{
       ...job,finishAt:Math.max(Number(job.finishAt),stamp)+DAY_SECONDS,
       attempts:Number(job.attempts||0)+1
     }});
     await announce(actor,'<p>Enchanting check failed on '+escapeHtml(item.name)+
       '. Arcana roll '+check.total+(tool.advantage?' (Advantage)':'')+
       '. Work continues for one additional world day.</p>');
     if(announceGM)await announceGM(actor,'<p>Enchanting '+escapeHtml(enchant.name)+
       ': '+check.total+' vs DC '+dc+' (failed). '+(tool.advantage?'Advantage':'Normal roll')+'.</p>');
     notify('Enchanting check failed. Retry after one world day.');
     return false;
   }
   if(announceGM)await announceGM(actor,'<p>Enchanting '+escapeHtml(enchant.name)+
     ': '+check.total+' vs DC '+dc+' (success). '+(tool.advantage?'Advantage':'Normal roll')+'.</p>');
 }
 const completed=safeClone(getFlags(item,'enchantments')||[]);
 // A pre-existing v1.2 job is allowed to finish, but slot/compatibility rules still apply.
 const why=explainCompatibility({type:item.type,name:item.name,system:item.system,getFlag:(ns,k)=>k==='enchantmentPending'?null:item.getFlag(ns,k)},enchant,completed);
 // In-flight v1.2.0 enchantments must remain finishable after the new rules ship.
 if(why&&job.slots!=null)throw new Error('Cannot finish enchantment: '+why);
 if(completed.some(e=>e.id===enchant.id))throw new Error('Already applied.');
 const effect=displayEnchantEffect(enchant,job.element);
 const block='<section class="gc-item-enchantment" data-gc-enchant="'+escapeHtml(enchant.id)+'"><p><strong>'+escapeHtml(enchant.name)+' (Gathering & Crafting):</strong> '+escapeHtml(effect)+'</p></section>';
 const updates={['flags.'+ENCHANT_NS+'.enchantments']:[...completed,{id:enchant.id,element:job.element||null,completedAt:stamp}],['flags.'+ENCHANT_NS+'.enchantmentPending']:null,
 'system.description.value':String(item.system?.description?.value||'')+'\n'+block};
 if(enchant.magicalBonus){
  const bonus=Math.max(Number(item.system?.magicalBonus||0),enchant.magicalBonus);
  updates['system.magicalBonus']=bonus;
  const prop=item.system?.properties,list=prop instanceof Set?[...prop]:Array.isArray(prop)?prop.slice():Object.entries(prop||{}).filter(([,v])=>v).map(([k])=>k);
  updates['system.properties']=[...new Set([...list,'mgc'])];
 }
 if(enchant.elementDice&&item.system?.damage?.base){
  const current=String(item.system.damage.base.bonus||''),term=enchant.elementDice+'['+job.element.toLowerCase()+']';
  updates['system.damage.base.bonus']=current?current+' + '+term:term;
 }
 // Item ActiveEffect transfers passive modifiers with equip state (native D&D5e system behavior).
 const changes=effectChanges(enchant);
 let created=[];
 if(changes.length&&typeof item.createEmbeddedDocuments==='function'){
  created=await item.createEmbeddedDocuments('ActiveEffect',[{
   name:'Enchantment: '+enchant.name,icon:item.img,transfer:true,disabled:false,changes,
   flags:{[ENCHANT_NS]:{enchantmentId:enchant.id}}
  }]);
 }
 try{await item.update(updates);}
 catch(error){
  if(created?.length)try{await item.deleteEmbeddedDocuments('ActiveEffect',created.map(x=>x.id));}catch(rollback){console.error('Active effect rollback failed',rollback);}
  throw error;
 }
 await announce(actor,'<p>Completed '+escapeHtml(enchant.name)+' on '+escapeHtml(item.name)+'.</p><p>'+escapeHtml(effect)+'</p>');
 notify(enchant.name+' completed.');
}
export async function useEnchantment(actor,itemId,enchantId,notify,announce){
 const item=actor.items.get?.(itemId)||actor.items.find(i=>i.id===itemId),def=enchantById(enchantId);
 if(!item||!def?.power)throw new Error('Not an active enchantment.');
 if(!(getFlags(item,'enchantments')||[]).some(v=>v.id===enchantId))throw new Error('Power is not on this item.');
 if(item.system?.equipped!==true)throw new Error('Equip the enchanted item first.');
 const spent=safeClone(getFlags(item,'enchantmentUses')||{});
 if(Number(spent[enchantId]||0)>=def.power.uses)throw new Error('No uses remaining before Long Rest.');
 spent[enchantId]=Number(spent[enchantId]||0)+1;
 await item.update({['flags.'+ENCHANT_NS+'.enchantmentUses']:spent});
 const label=def.power.spell||def.power.name||def.name;
 await announce(actor,'<p><strong>'+escapeHtml(actor.name)+'</strong> activates <strong>'+escapeHtml(label)+'</strong> from <em>'+escapeHtml(item.name)+'</em>.</p><p>'+escapeHtml(def.description)+'</p><p>Uses remaining: '+(def.power.uses-spent[enchantId])+'/'+def.power.uses+' (Long Rest).</p>');
 notify(label+' used.');
}
export async function recoverEnchantmentUses(actor,result,config){
 if(!actor?.isOwner&&!game.user?.isGM)return;
 // dnd5e restCompleted can report longRest via config or result, depending on system revision.
 const long= config?.type==='long'||config?.longRest===true||result?.longRest===true||result?.type==='long';
 if(!long)return;
 for(const item of actor.items||[]){
  const charges=getFlags(item,'enchantmentUses');
  if(charges&&Object.values(charges).some(n=>Number(n)>0))await item.update({['flags.'+ENCHANT_NS+'.enchantmentUses']:{}});
 }
}
