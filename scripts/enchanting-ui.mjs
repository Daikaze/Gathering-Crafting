/** Enchanting workshop v1.3 — profession training, restricted items, learnable recipes.
 * Training and enchantment jobs use Foundry world time, no hidden GM changes.
 * Powers have a visible Use button; special combat effects remain GM-adjudicated.
 */
import {ENCHANTMENTS,ELEMENTS,DAY_SECONDS,RANKS,enchantById,targetKind,itemTags,capacity,usedSlots,explainCompatibility,professionOf,learningGate,hasTrainingTools,arcanaBonus,afterGoldPayment,completionAt,displayEnchantEffect,lessonCost,lessonDays} from './enchanting.mjs';
const ENCHANT_NS='gathering-crafting';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=name=>'<i class="fa-solid fa-'+name+'" aria-hidden="true"></i>';
const qty=item=>Number(item?.system?.quantity??1);
const itemList=actor=>(actor?.items||[]).filter(i=>targetKind(i)&&qty(i)===1);
const getItem=(app,actor)=>itemList(actor).find(i=>i.id===app.enchantItemId)||itemList(actor)[0]||null;
const getFlags=(item,key)=>item?.getFlag?.(ENCHANT_NS,key);
const now=()=>Number(game.time?.worldTime);
const safeClone=obj=>foundry.utils.deepClone(obj);
const totalGp=c=>(Number(c?.pp||0)*10+Number(c?.gp||0)+Number(c?.ep||0)*.5+Number(c?.sp||0)*.1+Number(c?.cp||0)*.01);
const paid=c=>totalGp(c).toFixed(2).replace(/\.00$/,'');
const toolWarning=actor=>hasTrainingTools(actor)?'':"Requires Jeweler's Tools or Enchanter's Tools in inventory.";
const jobLine=(job)=>{
 const remaining=Math.max(0,Math.ceil((Number(job.finishAt)-now())/DAY_SECONDS));
 return remaining+' world day(s) remaining';
};
export function enchantingHtml(app,actor,helpers){
 const {heading,renderCards,searchBar,artworkFor}=helpers;
 const prof=professionOf(actor),items=itemList(actor),selected=getItem(app,actor);
 const complete=getFlags(selected,'enchantments')||[],pending=getFlags(selected,'enchantmentPending');
 const currency=actor?.system?.currency||{},toolOK=hasTrainingTools(actor);
 const rank=RANKS[prof.rank];
 let output=heading('fa-wand-magic-sparkles','Enchanting',ENCHANTMENTS.length+' learnable enchantments. Train proficiency, study individual formulas and enchant compatible gear.');
 output+='<div class="gc-enchant-progression"><div class="gc-enchant-rank"><strong>'+ico('graduation-cap')+' Enchanting Proficiency: '+escapeHtml(rank.name)+'</strong><span>Rank '+prof.rank+'/5 · '+prof.known.length+'/'+ENCHANTMENTS.length+' formulas learned</span><small>Training bonus: Arcana '+(arcanaBonus(actor)>=0?'+':'')+arcanaBonus(actor)+'</small></div>';
 const next=RANKS[prof.rank+1];
 if(prof.training){
  const tr=prof.training;
  const label=tr.kind==='rank'?'Train '+RANKS[tr.target].name:'Study '+(enchantById(tr.id)?.name||tr.id);
  output+='<div class="gc-enchant-training"><strong>'+escapeHtml(label)+'</strong><span>'+jobLine(tr)+' · DC '+tr.dc+' Arcana</span><button type="button" class="gc-primary" data-action="finishLesson" '+(now()<tr.finishAt||app.busy?'disabled':'')+'>'+ico('book')+' Finish Lesson</button></div>';
 }else if(next){
  output+='<div class="gc-enchant-training"><strong>Train '+escapeHtml(next.name)+'</strong><span>'+next.days+' world days · '+next.cost+' gp · DC '+next.dc+' Arcana</span><button type="button" class="gc-primary" data-action="trainRank" '+(!toolOK||afterGoldPayment(currency,next.cost)===null?'disabled':'')+'>'+ico('graduation-cap')+' Begin Training</button></div>';
 }else output+='<div class="gc-enchant-training"><strong>Master Enchanter</strong><span>Maximum proficiency reached.</span></div>';
 output+='</div>';
 if(!toolOK)output+='<p class="gc-missing-tool">'+ico('lock')+' '+escapeHtml(toolWarning(actor))+'</p>';
 output+='<p class="gc-help">Train each rank, then learn each formula separately. Each completed study requires an Arcana check. Failed checks delay completion by one world day. Tools are required to train, learn and enchant; Arcana proficiency improves your check.</p>';
 output+='<div class="gc-enchant-summary"><label class="gc-field"><span>Item to enchant</span><select name="enchantItem">';
 output+=items.length?items.map(i=>'<option value="'+escapeHtml(i.id)+'" '+(i===selected?'selected':'')+'>'+escapeHtml(i.name)+' ('+itemTags(i).join(', ')+')</option>').join(''):'<option value="">No eligible equipment</option>';
 output+='</select></label><div class="gc-enchant-funds">'+ico('coins')+' <strong>'+paid(currency)+' gp</strong><small>Available funds</small></div></div>';
 if(!selected)return output+'<div class="gc-empty">Add a single weapon, armor, or shield to the character. Stacked equipment is not eligible.</div>';
 const spent=usedSlots(complete);
 output+='<div class="gc-enchant-selected"><img src="'+escapeHtml(artworkFor(selected))+'" alt=""><div><strong>'+escapeHtml(selected.name)+'</strong><small>'+escapeHtml(itemTags(selected).join(', '))+' · '+spent+'/'+capacity(selected)+' enchantment slots used · '+escapeHtml(selected.system?.rarity||'Common')+' rarity</small></div><button type="button" class="gc-secondary" data-action="sheetItem" data-id="'+escapeHtml(selected.id)+'">'+ico('up-right-from-square')+' Item Sheet</button></div>';
 if(complete.length){
  output+='<div class="gc-enchant-applied">'+complete.map(e=>{
   const def=enchantById(e.id),power=def?.power,spent=getFlags(selected,'enchantmentUses')?.[e.id]||0;
   return '<div class="gc-enchant-applied-entry"><span>'+ico('check-circle')+' '+escapeHtml(def?.name||e.id)+(e.element?' · '+escapeHtml(e.element):'')+'</span>'+
     (power?'<button type="button" class="gc-secondary" data-action="useEnchant" data-id="'+escapeHtml(selected.id)+'" data-enchant="'+escapeHtml(e.id)+'" '+(spent>=power.uses?'disabled':'')+'>Use '+(power.uses-spent)+'/'+power.uses+'</button>':'')+'</div>';
  }).join('')+'</div>';
 }
 if(pending)output+='<div class="gc-enchant-job"><strong>'+ico('hourglass-half')+' '+escapeHtml(enchantById(pending.id)?.name||pending.id)+' in progress</strong><span>'+jobLine(pending)+' · '+Number(pending.cost)+' gp paid</span><small>Only one active enchantment per item. World time is never advanced automatically.</small><button class="gc-primary" data-action="finishEnchant" data-id="'+escapeHtml(selected.id)+'" '+(now()<Number(pending.finishAt)||app.busy?'disabled':'')+'>Complete Enchantment</button></div>';
 output+='<div class="gc-toolbar gc-compact-toolbar"><div class="gc-enchant-hint">'+ico('circle-info')+' Choose compatible enchantments</div>'+searchBar()+'</div>';
 output+='<div class="gc-enchant-element"><label>Elemental damage <select name="enchantElement">'+ELEMENTS.map(e=>'<option '+(app.enchantElement===e?'selected':'')+' value="'+e+'">'+e+'</option>').join('')+'</select></label><label>Show <select name="enchantFilter">'+[['all','All'],['learned','Learned'],['available','Ready to enchant'],['study','Can study']].map(([k,v])=>'<option value="'+k+'" '+((app.enchantFilter||'all')===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div>';
 let list=ENCHANTMENTS.filter(e=>e.kind===targetKind(selected)&&(!app.search||[e.name,e.description,...e.allowed].join(' ').toLowerCase().includes(app.search.toLowerCase())));
 list=list.filter(e=>{
  const learned=prof.known.includes(e.id);
  if(app.enchantFilter==='learned')return learned;
  if(app.enchantFilter==='available')return learned&&!learningGate(actor,e)&&!explainCompatibility(selected,e,complete)&&toolOK;
  if(app.enchantFilter==='study')return !learned&&prof.rank>=e.rank;
  return true;
 });
 output+=renderCards(list,e=>{
  const compatible=explainCompatibility(selected,e,complete);
  const learned=prof.known.includes(e.id),studyGate=prof.rank<e.rank?'Requires '+RANKS[e.rank].name:prof.training?'Training in progress':!toolOK?'Missing tools':'';
  const enchantGate=learningGate(actor,e)||compatible||(!toolOK?'Missing tools':'');
  const affordable=afterGoldPayment(currency,e.cost)!==null,canStudy=!learned&&!studyGate&&afterGoldPayment(currency,lessonCost(e))!==null;
  const canEnchant=!enchantGate&&affordable&&!prof.training&&!app.busy;
  const studyText=learned?'Learned':studyGate||((afterGoldPayment(currency,lessonCost(e))===null)?'Insufficient gold':'Study '+lessonCost(e)+' gp / '+lessonDays(e)+'d');
  return '<article class="gc-tile gc-enchant-card"><div class="gc-tile-body"><div class="gc-enchant-title">'+ico(e.kind==='weapon'?'khanda':'shield-halved')+' <strong>'+escapeHtml(e.name)+'</strong></div>'+
    '<div class="gc-enchant-meta"><span>Rank '+e.rank+' · '+escapeHtml(RANKS[e.rank].name)+'</span><span>'+e.slots+' slot(s)</span></div>'+
    '<div class="gc-enchant-meta"><span>'+ico('coins')+' '+e.cost+' gp</span><span>'+ico('clock')+' '+e.days+' days</span></div>'+
    '<p>'+escapeHtml(displayEnchantEffect(e,e.elementDice?app.enchantElement:undefined))+'</p>'+
    '<small class="gc-enchant-compat">'+ico('filter')+' '+escapeHtml(e.allowed.join(' / '))+(compatible?' · '+escapeHtml(compatible):'')+'</small>'+
    '<div class="gc-enchant-actions"><button type="button" class="gc-secondary" data-action="learnEnchant" data-id="'+escapeHtml(e.id)+'" '+(!canStudy||app.busy?'disabled':'')+'>'+escapeHtml(studyText)+'</button>'+
    '<button type="button" class="gc-primary" data-action="startEnchant" data-id="'+escapeHtml(e.id)+'" '+(!canEnchant?'disabled':'')+'>'+escapeHtml(enchantGate||(!affordable?'Not enough gold':'Enchant'))+'</button></div></div></article>';
 });
 output+='<p class="gc-help gc-enchant-disclaimer">Passive bonuses may use native Active Effects on equipped Items. Elemental damage and +1/+2 bonuses update weapon data. Once-per-Long-Rest powers have Use buttons and recharge after an in-system Long Rest; spell resolution, targets and unusual combat effects still require GM adjudication. The module never auto-picks a target.</p>';
 return output;
}
async function charge(actor,cost){
 const original=safeClone(actor.system.currency||{});
 const next=afterGoldPayment(original,cost);
 if(!next)throw new Error('Not enough gold.');
 await actor.update({'system.currency':next});
 return async()=>actor.update({'system.currency':original});
}
async function confirmLesson(title,desc){return foundry.applications.api.DialogV2.confirm({window:{title},content:'<p>'+escapeHtml(desc)+'</p><p>Gold is charged when training begins. Progress uses in-world days; cancelled studies are not refunded automatically.</p>'});}
export async function beginLesson(actor,kind,id,notify){
 if(!hasTrainingTools(actor))throw new Error(toolWarning(actor));
 const state=professionOf(actor);
 if(state.training)throw new Error('Finish the current lesson first.');
 let duration,cost,dc,target,enchant;
 if(kind==='rank'){
  if(state.rank>=5)throw new Error('Maximum proficiency reached.');
  target=state.rank+1;({days:duration,cost,dc}=RANKS[target]);
 }else{
  enchant=enchantById(id);
  if(!enchant)throw new Error('Unknown enchantment.');
  if(state.rank<enchant.rank)throw new Error('Insufficient Enchanting proficiency.');
  if(state.known.includes(enchant.id))throw new Error('Already learned.');
  duration=lessonDays(enchant);cost=lessonCost(enchant);dc=10+enchant.rank*2;
 }
 const stamp=now();
 if(!Number.isFinite(stamp))throw new Error('Foundry world time is unavailable.');
 const label=kind==='rank'?RANKS[target].name:enchant.name;
 if(!await confirmLesson('Begin Enchanting Lesson',label+' · '+cost+' gp · '+duration+' world days · Arcana DC '+dc))return;
 const latest=professionOf(actor);if(latest.training||latest.rank!==state.rank)throw new Error('Training changed while confirming.');
 const refund=await charge(actor,cost);
 try{await actor.update({['flags.'+ENCHANT_NS+'.enchanter']:{...latest,training:{kind,id:enchant?.id||null,target,startedAt:stamp,finishAt:completionAt(stamp,duration),dc,cost,attempts:0}}});}
 catch(err){try{await refund();}catch(e){console.error('Enchant training payment rollback failed',e);}throw err;}
 notify('Lesson started: '+label+'.');
}
export async function finishLesson(actor,notify,announce){
 if(!hasTrainingTools(actor))throw new Error(toolWarning(actor));
 const state=professionOf(actor),lesson=state.training;
 if(!lesson)throw new Error('No Enchanting lesson in progress.');
 if(now()<lesson.finishAt)throw new Error('Required world days have not passed.');
 const check=await new Roll('1d20 + @bonus',{bonus:arcanaBonus(actor)+state.rank}).evaluate();
 if(check.total<lesson.dc){
  const delayed={...lesson,finishAt:Math.max(lesson.finishAt,now())+DAY_SECONDS,attempts:(lesson.attempts||0)+1};
  await actor.update({['flags.'+ENCHANT_NS+'.enchanter']:{...state,training:delayed}});
  notify('Arcana '+check.total+' vs DC '+lesson.dc+'. Study failed; retry after one world day.');
  await announce(actor,'<p>Enchanting lesson: Arcana '+check.total+' vs DC '+lesson.dc+'. Retry after one world day.</p>');
  return false;
 }
 const updated={...state,training:null};
 if(lesson.kind==='rank')updated.rank=Math.max(state.rank,lesson.target);
 else if(!updated.known.includes(lesson.id))updated.known=[...state.known,lesson.id];
 await actor.update({['flags.'+ENCHANT_NS+'.enchanter']:updated});
 const label=lesson.kind==='rank'?RANKS[updated.rank].name:enchantById(lesson.id)?.name;
 notify('Enchanter training complete: '+label+'.');
 await announce(actor,'<p>Completed Enchanting study: <strong>'+escapeHtml(label)+'</strong>. Arcana roll '+check.total+' vs DC '+lesson.dc+'.</p>');
 return true;
}
export async function beginEnchantment(app,id,helpers){
 const {actor,announce,notify}=helpers,item=getItem(app,actor),enchant=enchantById(id);
 if(!item||!enchant||qty(item)!==1)throw new Error('Select a single weapon or armor item.');
 if(!hasTrainingTools(actor))throw new Error(toolWarning(actor));
 const training=professionOf(actor);
 if(training.training)throw new Error('Complete current Enchanting training first.');
 const learning=learningGate(actor,enchant);
 if(learning)throw new Error(learning);
 const conflict=explainCompatibility(item,enchant,getFlags(item,'enchantments')||[]);
 if(conflict)throw new Error(conflict);
 const element=enchant.elementDice?app.enchantElement:null;
 const effect=displayEnchantEffect(enchant,element),stamp=now();
 if(!Number.isFinite(stamp))throw new Error('Foundry world time unavailable.');
 if(afterGoldPayment(actor.system.currency,enchant.cost)===null)throw new Error('Not enough gold.');
 const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Start Enchantment'},content:'<p>'+escapeHtml(item.name)+' — '+escapeHtml(enchant.name)+'</p><p>'+enchant.cost+' gp · '+enchant.days+' world days · '+enchant.slots+' slot(s).</p><p>'+escapeHtml(effect)+'</p>'});
 if(!yes)return;
 if(learningGate(actor,enchant)||explainCompatibility(item,enchant,getFlags(item,'enchantments')||[]))throw new Error('Requirements changed during confirmation.');
 const refund=await charge(actor,enchant.cost);
 const job={id:enchant.id,element,startedAt:stamp,finishAt:completionAt(stamp,enchant.days),days:enchant.days,cost:enchant.cost};
 try{await item.update({['flags.'+ENCHANT_NS+'.enchantmentPending']:job});}
 catch(err){try{await refund();}catch(e){console.error('Enchant gold rollback failed',e);}throw err;}
 await announce(actor,'<p>Started '+escapeHtml(enchant.name)+' on '+escapeHtml(item.name)+'. Paid '+enchant.cost+' gp; requires '+enchant.days+' world days.</p>');
 notify(enchant.name+' started.');
}
const effectChanges=enchant=>{
 if(enchant.passive?.skill)return [{key:'system.skills.'+enchant.passive.skill+'.roll.bonus',mode:2,value:String(enchant.passive.bonus),priority:20}];
 if(enchant.passive?.concentration)return [{key:'system.attributes.concentration.roll.bonus',mode:2,value:String(enchant.passive.concentration),priority:20}];
 if(enchant.passive?.save)return [{key:'system.abilities.'+enchant.passive.save+'.save.roll.bonus',mode:2,value:String(enchant.passive.bonus),priority:20}];
 return [];
};
export async function finishEnchantment(app,itemId,helpers){
 const {actor,announce,notify}=helpers,item=actor.items.get?.(itemId)||actor.items.find(i=>i.id===itemId);
 const job=getFlags(item,'enchantmentPending'),enchant=enchantById(job?.id),stamp=now();
 if(!job||!enchant||targetKind(item)!==enchant.kind)throw new Error('No valid enchantment job.');
 if(!Number.isFinite(stamp)||stamp<Number(job.finishAt))throw new Error('Required world days have not passed.');
 const completed=safeClone(getFlags(item,'enchantments')||[]);
 // A pre-existing v1.2 job is allowed to finish, but slot/compatibility rules still apply.
 const why=explainCompatibility({type:item.type,name:item.name,system:item.system,getFlag:(ns,k)=>k==='enchantmentPending'?null:item.getFlag(ns,k)},enchant,completed);
 if(why)throw new Error('Cannot finish enchantment: '+why);
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
