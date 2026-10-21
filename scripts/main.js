/** Gathering & Crafting v1.0.0 — Foundry V14 / dnd5e 5.3.3. */
import { CATALOG } from './catalog.js';
import { makeMaterialData, makeCraftData, outputKind } from './items.js';
import { TOOL_SPECS, PROF_OPTIONS, requiredForNode, requiredForRecipe, toolGate, proficiencyLevel, toolItemBonus, craftCheck, proficiencyBonus, rollFormula } from './tool-rules.mjs';
import {enchantingHtml, beginEnchantment, finishEnchantment, beginLesson, finishLesson, useEnchantment, recoverEnchantmentUses} from './enchanting-ui.mjs';
import {enchantById} from './enchanting.mjs';
const ID='gathering-crafting';
const VERSION='1.3.5';
const clone=value=>foundry.utils.deepClone(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,f=0,min=0,max=9999)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Math.trunc(Number(v)))):f;
const icon=v=>`<i class="fa-solid ${/^fa-[a-z0-9-]+$/.test(String(v))?v:'fa-cube'}" aria-hidden="true"></i>`;
const hue=v=>/^#[0-9a-fA-F]{6}$/.test(String(v))?v:'#a7b9cb';
const notify=(message,error=false)=>ui.notifications[error?'error':'info'](message);
const visibleDescription=value=>{
  const text=String(value??'');
  if(game.user?.isGM)return text;
  // Protect save DCs embedded in catalogue flavor texts, not only in numeric rule fields.
  return text.replace(/\bDC\s*\d+\s*(Dex|Con|Wis|Str|Int|Cha)\s*save\b/gi,'a $1 save')
    .replace(/\bDC\s*[+\-]?\d+\b/gi,'DC set by GM');
};
const database=()=>game.settings.get(ID,'database');
// Cache-bust module-owned icons after the v1.1.1 archive could ship stale WebPs.
// Never modify custom GM URLs or persist query strings into existing world data.
const artworkFor=item=>{
  const src=item?.img||'icons/svg/item-bag.svg';
  const clean=src.split('?')[0];
  return clean.startsWith('modules/gathering-crafting/icons/') && clean.endsWith('.webp')
    ? clean+'?gc-art=v1.3.5' : src;
};
const material=(db,id)=>db.materials.find(m=>m.id===id);
const skillLabels={ath:'Athletics',sur:'Survival',prc:'Perception',inv:'Investigation',nat:'Nature',slt:'Sleight of Hand'};
const skills=Object.entries(skillLabels);
const materialGroups=[['all','All Materials','fa-layer-group'],['metallurgy','Ores & Metals','fa-gem'],['alchemy','Alchemy Ingredients','fa-leaf'],['monster','Monster Drops','fa-skull']];
const validDb=db=>!!(db&&Array.isArray(db.materials)&&Array.isArray(db.nodes)&&Array.isArray(db.recipes));
const resourceItem=(item,id)=>item.getFlag?.(ID,'resourceId')===id||(CATALOG.materials.some(m=>m.id===id&&m.group==='Refined Metal')&&item.getFlag?.(ID,'recipeId')===id);
const itemStacks=(actor,id)=>actor.items.filter(i=>resourceItem(i,id));
const quantity=item=>Number.isSafeInteger(Number(item.system?.quantity))?Math.max(0,Number(item.system.quantity)):1;
const count=(actor,id)=>actor?itemStacks(actor,id).reduce((n,i)=>n+quantity(i),0):0;
const skillBonus=(actor,id)=>{
  const sk=actor.system?.skills?.[id]||{};
  if(sk.total!=null&&Number.isFinite(Number(sk.total)))return Number(sk.total);
  const key=sk.ability||(id==='ath'?'str':id==='slt'?'dex':id==='nat'||id==='inv'?'int':'wis');
  const mod=Number(sk.mod??actor.system?.abilities?.[key]?.mod??0);
  return Math.trunc(mod+Number(actor.system?.attributes?.prof??2)*Number(sk.value??0));
};
async function grantMaterial(actor,mat,qty){
  const existing=itemStacks(actor,mat.id)[0];
  if(existing)await existing.update({'system.quantity':quantity(existing)+qty});
  else await actor.createEmbeddedDocuments('Item',[makeMaterialData(mat,qty)]);
}

async function adjustMaterialQuantity(actor,matId,delta,db=database()){
  const mat=material(db,matId); if(!mat)throw new Error('Material not found.');
  delta=num(delta,0,-999,999); if(!delta)return;
  if(delta>0)return grantMaterial(actor,mat,delta);
  const required=Math.abs(delta); if(count(actor,matId)<required)throw new Error(`Not enough ${mat.name}.`);
  await consume(actor,[{id:matId,qty:required}]);
}
async function adjustCraftedQuantity(actor,recipeId,delta,db=database()){
  const recipe=db.recipes.find(r=>r.id===recipeId); if(!recipe)throw new Error('Item recipe not found.');
  delta=num(delta,0,-999,999); if(!delta)return;
  if(delta>0)return grantProduct(actor,recipe,delta);
  let left=Math.abs(delta);
  const stacks=actor.items.filter(i=>i.getFlag?.(ID,'recipeId')===recipeId);
  const total=stacks.reduce((n,i)=>n+quantity(i),0);
  if(total<left)throw new Error(`Not enough ${recipe.name}.`);
  const updates=[], removals=[];
  for(const item of stacks){
    if(left<=0)break;
    const q=quantity(item), used=Math.min(left,q); left-=used;
    if(q-used>0)updates.push({_id:item.id,'system.quantity':q-used}); else removals.push(item.id);
  }
  if(updates.length)await actor.updateEmbeddedDocuments('Item',updates);
  if(removals.length)await actor.deleteEmbeddedDocuments('Item',removals);
}
async function consume(actor,ingredients){
  const merged=new Map();
  for(const ing of ingredients)merged.set(ing.id,(merged.get(ing.id)||0)+num(ing.qty,0));
  for(const [id,required] of merged)if(count(actor,id)<required)throw new Error(`Not enough ${id}.`);
  const originals=[...merged.keys()].flatMap(id=>itemStacks(actor,id)).map(i=>({id:i.id,quantity:quantity(i),data:i.toObject()}));
  const updates=[],removals=[];
  for(const [id,required] of merged){let left=required;for(const stack of itemStacks(actor,id)){
    if(left<=0)break;
    const used=Math.min(left,quantity(stack));left-=used;
    if(quantity(stack)-used>0)updates.push({_id:stack.id,'system.quantity':quantity(stack)-used});else removals.push(stack.id);
  }}
  try{if(updates.length)await actor.updateEmbeddedDocuments('Item',updates);if(removals.length)await actor.deleteEmbeddedDocuments('Item',removals);}
  catch(error){
    try{for(const old of originals){const now=actor.items.get?.(old.id)||actor.items.find(i=>i.id===old.id);
      if(now)await now.update({'system.quantity':old.quantity});
      else{const data=clone(old.data);delete data._id;await actor.createEmbeddedDocuments('Item',[data]);}
    }}catch(rollbackError){console.error(`${ID} | Inventory rollback incomplete`,rollbackError);notify('Inventory rollback failed: ask your GM to restore materials.',true);}
    throw error;
  }
}
async function refund(actor,ingredients,db){for(const entry of ingredients){const mat=material(db,entry.id);if(mat)await grantMaterial(actor,mat,num(entry.qty));}}
async function grantProduct(actor,recipe,qty){
  let data=makeCraftData(recipe,qty);
  if(recipe.outputItemUuid){
    const source=await fromUuid(recipe.outputItemUuid);
    if(!source||source.documentName!=='Item')throw new Error('The linked output Item no longer exists. Ask your GM to relink it.');
    data=source.toObject();delete data._id;data.system||={};data.system.quantity=qty;
    data.flags||={};data.flags[ID]={...(data.flags[ID]||{}),recipeId:recipe.id,effect:recipe.effect||'',...(database().materials.some(m=>m.id===recipe.id)?{resourceId:recipe.id}:{})};
  }
  const existing=['loot','consumable'].includes(data.type)?actor.items.find(i=>(i.getFlag(ID,'recipeId')===recipe.id||(data.flags[ID].resourceId&&i.getFlag(ID,'resourceId')===data.flags[ID].resourceId))&&i.name===data.name&&i.type===data.type):null;
  if(existing)await existing.update({'system.quantity':quantity(existing)+qty});
  else await actor.createEmbeddedDocuments('Item',[data]);
}
function ownedActors(){return(game.actors?.contents||[]).filter(a=>['character','npc'].includes(a.type)&&(game.user.isGM||a.isOwner))
 .sort((a,b)=>Number(b.type==='character')-Number(a.type==='character')||a.name.localeCompare(b.name));}
function currentActor(id){const list=ownedActors();if(id)return list.find(a=>a.id===id)||null;
  const controlled=canvas?.tokens?.controlled?.[0]?.actor;
  return list.find(a=>a.id===controlled?.id)||list.find(a=>a.id===game.user.character?.id)||list[0]||null;
}
function requirements(actor,recipe,db,bonus=false){return recipe.ingredients.map((ing,i)=>({id:ing.id,qty:num(ing.qty,1)+(bonus&&i===0?1:0),mat:material(db,ing.id),have:count(actor,ing.id)}));}
async function announce(actor,html){try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<section class="gc-chat"><h3>Gathering & Crafting</h3>${html}</section>`});}catch(e){console.warn(`${ID} | Chat notice failed`,e);}}
async function announceGM(actor,html){
  // Never send DCs in public chat. Only the GM recipients receive the check details.
  const recipients=(game.users?.filter?.(user=>user.isGM)||[]).map(user=>user.id).filter(Boolean);
  if(!recipients.length)return;
  try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),
    whisper:recipients,content:`<section class="gc-chat"><h3>GM Check Details</h3>${html}</section>`});}
  catch(e){console.warn(`${ID} | GM whisper failed`,e);}
}
const nodeTokens=(id)=>canvas?.tokens?.placeables?.filter(t=>t.document?.getFlag?.(ID,'nodeId')===id&&t.visible!==false)||[];
function nearestNodeToken(actor,id){const token=canvas?.tokens?.placeables?.find(t=>t.actor?.id===actor.id);
  if(!token)return null;
  return nodeTokens(id).map(t=>({token:t,feet:Math.hypot(t.center.x-token.center.x,t.center.y-token.center.y)/(canvas?.grid?.size||100)*Number(canvas?.scene?.grid?.distance||5)}))
    .sort((a,b)=>a.feet-b.feet)[0]||null;
}
function mergeCatalog(old){
  const db=clone(CATALOG);
  if(!validDb(old))return db;
  db.settings={...db.settings,...(old.settings||{})};
  const builtInMaterials=new Set(['iron-ore','copper-ore','oak-wood','herbs','crystal','leather','monster-bone','wild-flower']);
  const builtInNodes=new Set(['old-mine','copper-vein','green-grove','old-oaks','bone-field']);
  const builtInRecipes=new Set(['iron-ingot','copper-ring','healing-salve','oak-handle','leather-wrap','arcane-focus']);
  // Keep custom additions that fit the two professions; archive old defaults in backup settings.
  const owned=new Set(db.materials.map(m=>m.id));
  const needed=new Set();
  for(const x of old.recipes)if(!builtInRecipes.has(x.id)&&['smithing','alchemy','metallurgy'].includes(x.category))for(const i of x.ingredients||[])needed.add(i.id);
  for(const m of old.materials)if(!owned.has(m.id)&&!builtInMaterials.has(m.id)&&needed.has(m.id)){db.materials.push(m);owned.add(m.id);}
  const recipeIds=new Set(db.recipes.map(r=>r.id));
  for(const r of old.recipes)if(!recipeIds.has(r.id)&&!builtInRecipes.has(r.id)&&['smithing','metallurgy','alchemy'].includes(r.category)&&(r.ingredients||[]).every(i=>owned.has(i.id))){
    db.recipes.push({...r,category:r.category==='smithing'?'metallurgy':r.category,subcategory:r.subcategory||'Custom',tier:r.tier||1});recipeIds.add(r.id);
  }
  const nodeIds=new Set(db.nodes.map(n=>n.id));
  for(const n of old.nodes)if(!nodeIds.has(n.id)&&!builtInNodes.has(n.id)&&owned.has(n.materialId))db.nodes.push(n);
  // v0.3+ world catalogues may contain GM edits to built-in entries. Keep those edits
  // rather than replacing the entire entry with a pristine bundled template.
  if(num(old.catalogVersion,0)>=3){
    for(const key of ['materials','recipes','nodes']){
      const originals=new Map((old[key]||[]).map(entry=>[entry.id,entry]));
      for(let i=0;i<db[key].length;i++){
        const existing=originals.get(db[key][i].id);
        if(existing)db[key][i]={...db[key][i],...clone(existing)};
      }
    }
  }
  return db;
}
const bundledArtwork=img=>/^modules\/gathering-crafting\/icons\/(?:painted|v2|v4|v5|v6|v7|illustrated|handpainted)\//.test(String(img||''));
const replaceableArtwork=img=>bundledArtwork(img)||/^modules\/(?!gathering-crafting\/)/.test(String(img||''))||/^systems\/dnd5e\//.test(String(img||''));
async function refreshOwnedArtwork(){
  const db=database();
  const knownMaterials=new Map(db.materials.map(m=>[m.id,artworkFor(m)]));
  const knownProducts=new Map(db.recipes.map(r=>[r.id,artworkFor(r)]));
  for(const actor of game.actors?.contents||[]){
    const updates=[];
    for(const item of actor.items||[]){
      const id=item.getFlag?.(ID,'recipeId');
      const materialId=item.getFlag?.(ID,'resourceId');
      // Prefer the crafted output image when an ingot has both flags.
      const desired=(id&&knownProducts.get(id))||(materialId&&knownMaterials.get(materialId));
      if(desired&&item.img!==desired&&replaceableArtwork(item.img))updates.push({_id:item.id,img:desired});
    }
    for(let i=0;i<updates.length;i+=25)await actor.updateEmbeddedDocuments('Item',updates.slice(i,i+25));
  }
}
let syncing=false;
async function ensurePack(name,label){
  let pack=game.packs.get(`world.${name}`);
  if(!pack)pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name,label,type:'Item',system:'dnd5e',package:'world'});
  return pack;
}
async function syncCompendiums(){
  if(!game.user.isGM)throw new Error('Only a GM can create the compendiums.');
  if(syncing)return;
  syncing=true;
  try{
    const db=database();
    const sources=[
      ['gc-ores-metals','Gathering & Crafting | Ores & Metals',db.materials.filter(m=>['Ore & Mineral','Refined Metal'].includes(m.group)).map(m=>makeMaterialData(m)),'resourceId'],
      ['gc-ingredients','Gathering & Crafting | Alchemy Ingredients',db.materials.filter(m=>m.group==='Alchemical Ingredient').map(m=>makeMaterialData(m)),'resourceId'],
      ['gc-monster-drops','Gathering & Crafting | Monster Drops',db.materials.filter(m=>m.group==='Monster Drop').map(m=>makeMaterialData(m)),'resourceId'],
      ['gc-ready-items','Gathering & Crafting | Ready-to-use Items',db.recipes.map(r=>makeCraftData(r)),'recipeId']];
    let added=0, refreshed=0;
    for(const [name,label,all,key] of sources){
      const pack=await ensurePack(name,label);
      const previouslyLocked=!!pack.locked;
      if(previouslyLocked)await pack.configure({locked:false});
      try{
        // Do not overwrite GM modifications. Missing entries only, identified by permanent catalog flags.
        const existing=await pack.getDocuments();
        const ids=new Set(existing.map(it=>it.getFlag(ID,key)).filter(Boolean));
        const imageById=new Map(all.map(it=>[it.flags[ID][key],it.img]));
        // Refresh old module-owned art only. Never replace a custom GM image path.
        for(const item of existing){
          const desired=imageById.get(item.getFlag(ID,key));
          if(desired&&item.img!==desired&&replaceableArtwork(item.img)){
            await item.update({img:desired});refreshed++;
          }
        }
        const missing=all.filter(it=>!ids.has(it.flags[ID][key]));
        for(let i=0;i<missing.length;i+=25){await Item.implementation.createDocuments(missing.slice(i,i+25),{pack:pack.collection});added+=Math.min(25,missing.length-i);}
      }finally{if(previouslyLocked)await pack.configure({locked:true});}
    }
    await game.settings.set(ID,'compendiumBootstrapped030',true);
    notify(added||refreshed?`Compendiums ready: ${added} new Items, ${refreshed} old images refreshed.`:'Compendiums are already up to date.');
  }finally{syncing=false;}
}
class GatheringCrafting extends foundry.applications.api.ApplicationV2{
  static DEFAULT_OPTIONS={id:'gc-main-window',classes:['gathering-crafting'],window:{title:'Gathering & Crafting',icon:'fa-solid fa-hammer',resizable:true},position:{width:970,height:740}};
  constructor(opts={}){super(opts);this.actorId=currentActor()?.id||null;this.tab='gather';this.gatherMode='careful';this.craftMode='steady';this.category='all';this.group='all';this.search='';this.page=1;this.showZero=false;this.readyOnly=false;this.editor={kind:'material',id:null};this.busy=false;this.searchTimer=null;this.pendingScrollTop=null;this.enchantItemId=null;this.enchantFilter='all';}
  get actor(){return currentActor(this.actorId);}
  async _renderHTML(){const root=document.createElement('div');root.className='gc-root';root.innerHTML=this.template();return root;}
  _replaceHTML(result,content){content.replaceChildren(result);}
  async _onRender(context,options){await super._onRender(context,options);const root=this.element.querySelector('.gc-root');if(!root)return;
    root.addEventListener('click',e=>this.click(e));root.addEventListener('change',e=>this.change(e));root.addEventListener('input',e=>this.input(e));root.addEventListener('submit',e=>this.submit(e));
    // .gc-content is the scroll container; .window-content is intentionally overflow:hidden.
    const scrollHost=this.element?.querySelector('.gc-content');
    if(scrollHost&&Number.isFinite(this.pendingScrollTop))scrollHost.scrollTop=this.pendingScrollTop;
    this.pendingScrollTop=null;}
  rememberScroll(){const scrollHost=this.element?.querySelector('.gc-content');this.pendingScrollTop=scrollHost?.scrollTop??null;}
  refresh({resetScroll=false}={}){
    // ApplicationV2 replaces the entire inner HTML on render. Save the
    // scroll location BEFORE replacing it, including for select/change events.
    if(resetScroll)this.pendingScrollTop=0;
    else this.rememberScroll();
    return this.render({force:true});
  }
  heading(ic,title,description){return `<header class="gc-section-head"><div><h2>${icon(ic)} ${esc(title)}</h2><p>${esc(description)}</p></div></header>`;}
  tabButton(id,ic,title){return `<button type="button" class="gc-nav ${this.tab===id?'is-active':''}" data-action="tab" data-id="${id}">${icon(ic)} <span>${title}</span></button>`;}
  filterBar(choices,selected,action){return `<div class="gc-category">${choices.map(([id,label,ic])=>`<button type="button" class="${selected===id?'is-on':''}" data-action="${action}" data-id="${id}">${icon(ic)} ${esc(label)}</button>`).join('')}</div>`;}
  searchBar(){return `<label class="gc-search">${icon('fa-magnifying-glass')}<input type="search" data-search="1" placeholder="Search..." value="${esc(this.search)}"></label>`;}
  renderCards(all,renderer){const pageSize=9;const visible=all.slice(0,this.page*pageSize);
    return `<div class="gc-grid">${visible.map(renderer).join('')||'<div class="gc-empty">Nothing matches the current filters.</div>'}</div>`+
     (visible.length<all.length?`<button class="gc-secondary gc-more" type="button" data-action="more">${icon('fa-chevron-down')} Show more (${all.length-visible.length} remaining)</button>`:'');
  }
  template(){const db=database();if(!validDb(db))return '<div class="gc-empty">The crafting catalogue could not be loaded.</div>';
    const actor=this.actor,gm=game.user.isGM;
    const choices=ownedActors().map(a=>`<option value="${esc(a.id)}" ${actor?.id===a.id?'selected':''}>${esc(a.name)} (${a.type==='character'?'PC':'NPC'})</option>`).join('');
    return `<div class="gc-top"><div class="gc-brand"><span class="gc-brand-logo">${icon('fa-hammer')}</span><div><span class="gc-subtitle">THE AVERIS WORKSHOP · v${VERSION}</span><div class="gc-brand-title">Gathering <span>&</span> Crafting</div></div></div>
      <div class="gc-top-right">${gm?`<button class="gc-gm-shortcut" type="button" data-action="tab" data-id="gm" aria-label="GM Workshop" title="GM Workshop">${icon('fa-gear')}</button>`:''}<label class="gc-selectwrap">${icon('fa-user')}<select name="actor" aria-label="Character">${choices}</select></label><div class="gc-energy" title="No daily gathering limit">${icon('fa-infinity')} <b>Unlimited</b><small>gather attempts</small></div></div></div>
      <nav class="gc-tabs">${this.tabButton('gather','fa-mountain','Gather')}${this.tabButton('alchemy','fa-flask','Alchemy')}${this.tabButton('blacksmithing','fa-hammer','Blacksmithing')}${this.tabButton('enchanting','fa-wand-magic-sparkles','Enchanting')}${this.tabButton('backpack','fa-box-open','Inventory')}</nav>
      <div class="gc-content">${!actor&&this.tab!=='gm'?'<div class="gc-empty">Select a character with Owner permission to get started.</div>':this.tab==='gather'?this.gatherTab(db,actor):this.tab==='alchemy'?this.craftTab(db,actor,'alchemy'):this.tab==='blacksmithing'||this.tab==='craft'?this.craftTab(db,actor,'metallurgy'):this.tab==='enchanting'?this.enchantTab(actor):this.tab==='backpack'?this.inventoryTab(db,actor):gm?this.gmTab(db):''}</div>
      <footer class="gc-footer"><span>${icon('fa-box')} Every resource and crafted product is a real D&D 5e Item with bundled fantasy artwork.</span><span>v${VERSION} · Foundry V14 · dnd5e 5.3.3</span></footer>`;
  }
  gatherTab(db,actor){const sceneOnly=!!db.settings.sceneOnly;
    const found=db.nodes.filter(n=>n.active&&(!sceneOnly||nodeTokens(n.id).length)&& (this.group==='all'||(n.group||'metallurgy')===this.group) &&(!this.search||`${n.name} ${n.description}`.toLowerCase().includes(this.search.toLowerCase())));
    return this.heading('fa-mountain','Gather Resources','Choose a resource node or monster harvest. One click to gather, with an optional risk for more.')+
      `<div class="gc-toolbar"><div class="gc-mode"><button type="button" data-action="gmode" data-mode="careful" class="${this.gatherMode==='careful'?'is-on':''}">${icon('fa-shield-heart')} Careful <small>${game.user.isGM?'DC −2':'Easier check'} · standard yield</small></button>
      <button type="button" data-action="gmode" data-mode="bold" class="${this.gatherMode==='bold'?'is-on':''}">${icon('fa-bolt')} Risky <small>${game.user.isGM?'DC +3':'Harder check'} · double yield</small></button></div>${this.searchBar()}</div>`+
      this.filterBar(materialGroups,this.group,'group')+
      `<div class="gc-notice">${icon('fa-circle-info')} ${sceneOnly?'Scene gathering: only visible bound map tokens can be harvested (within 15 ft).':'Free gathering: available nodes can be used anywhere. GM can switch to Scene-only in GM Studio.'} Unlimited gathering attempts. A physical tool is required; tool proficiency grants Advantage.</div>`+
      this.renderCards(found,n=>this.nodeCard(db,n,actor));
  }
  nodeCard(db,n,actor){const mat=material(db,n.materialId),rare=material(db,n.bonusId),toolKey=requiredForNode(n,mat),spec=TOOL_SPECS[toolKey],gate=toolGate(actor,toolKey,n.toolProficiency),dc=num(n.dc,12)+(this.gatherMode==='bold'?3:-2);
    return `<article class="gc-tile gc-node"><div class="gc-tile-banner"><span class="gc-hero-icon"><img class="gc-art-img" src="${esc(artworkFor(mat))}" alt=""></span><span class="gc-dc">Tier ${mat?.tier||1} · ${esc(skillLabels[n.skill]||n.skill)}${game.user.isGM?' · DC '+dc:''}</span></div><div class="gc-tile-body"><h3>${esc(n.name)}</h3><p>${esc(visibleDescription(n.description))}</p><div class="gc-loot"><span class="gc-mat-icon" style="--gc-mat:${hue(mat?.color)}"><img src="${esc(artworkFor(mat))}" alt=""></span><div><b>${esc(mat?.name||'Missing item')}</b><small>Yield: ${num(n.minYield,1)}–${num(n.maxYield,2)}${this.gatherMode==='bold'?' ×2':''}</small><small>${esc(spec.label)} · ${gate.advantage?'Advantage (proficient)':'Normal roll'}</small>${!gate.ok?`<small class="gc-missing-tool">${icon('fa-lock')} ${esc(gate.error)}</small>`:''}</div>${rare?`<span class="gc-rare">${icon('fa-gem')} ${num(n.bonusChance,0,0,100)}%</span>`:''}</div><button class="gc-primary" type="button" data-action="gather" data-id="${esc(n.id)}" ${!gate.ok||!mat||this.busy?'disabled':''}>${icon('fa-hand-sparkles')} Gather</button></div></article>`;
  }
  craftTab(db,actor,craftCategory='alchemy'){
    const isAlchemy=craftCategory==='alchemy';
    const all=db.recipes.filter(r=>r.category===craftCategory&&(!this.search||`${r.name} ${r.description} ${r.subcategory}`.toLowerCase().includes(this.search.toLowerCase())));
    const ready=r=>r.ingredients?.length&&toolGate(actor,requiredForRecipe(r),r.toolProficiency).ok&&requirements(actor,r,db,this.craftMode==='inspired').every(i=>i.mat&&i.have>=i.qty);
    const found=all.filter(r=>!this.readyOnly||ready(r)).sort((a,b)=>Number(!!ready(b))-Number(!!ready(a))||a.tier-b.tier||a.name.localeCompare(b.name));
    const possible=all.filter(ready).length;
    const title=isAlchemy?'Alchemy':'Blacksmithing';
    const headIcon=isAlchemy?'fa-flask':'fa-hammer';
    const desc=isAlchemy?`${possible} brews ready · ${all.length} formulas available. Potions, tonics and utility brews in one clean list.`:`${possible} crafts ready · ${all.length} blueprints available. Ingots, gear and metalwork in one clean list.`;
    const emptyText=isAlchemy?'Gather herbs, flowers or monster reagents to start brewing.':'Gather ore, metals or monster materials to start forging.';
    return this.heading(headIcon,title,desc)+
    `<div class="gc-toolbar gc-compact-toolbar"><div class="gc-mode"><button class="${this.craftMode==='steady'?'is-on':''}" data-action="cmode" data-mode="steady">${icon('fa-check')} Standard <small>${game.user.isGM?'DC as listed':'Skill check'} · roll to succeed</small></button><button class="${this.craftMode==='inspired'?'is-on':''}" data-action="cmode" data-mode="inspired">${icon('fa-star')} Inspired <small>+1 ingredient · ${game.user.isGM?'DC +3':'Harder check'} · double output</small></button></div>${this.searchBar()}</div>`+
    `<div class="gc-browser-row"><div class="gc-profession-label">${icon(headIcon)} <strong>${title}</strong><span>${isAlchemy?'Only alchemy recipes are shown here.':'Only blacksmithing recipes are shown here.'}</span></div><button class="gc-ready-toggle ${this.readyOnly?'is-on':''}" type="button" data-action="readyOnly">${icon('fa-check-circle')} Craftable only (${possible})</button></div>`+
    (this.readyOnly&&!found.length?`<div class="gc-empty gc-easy-empty">${icon('fa-box-open')}<strong>No ${isAlchemy?'alchemy':'blacksmithing'} recipes ready yet</strong><span>${emptyText}</span><button type="button" class="gc-secondary" data-action="readyOnly">Show all recipes</button></div>`:this.renderCards(found,r=>this.recipeCard(db,r,actor)));
  }
  enchantTab(actor){return enchantingHtml(this,actor,{heading:this.heading.bind(this),renderCards:this.renderCards.bind(this),searchBar:this.searchBar.bind(this),artworkFor});}
  recipeCard(db,r,actor){const req=requirements(actor,r,db,this.craftMode==='inspired'),toolKey=requiredForRecipe(r),spec=TOOL_SPECS[toolKey],gate=toolGate(actor,toolKey,r.toolProficiency),can=gate.ok&&req.length&&req.every(i=>i.mat&&i.have>=i.qty);
    const kind=outputKind(r),kindText={weapon:'Weapon',equipment:'Armor',consumable:'Potion',loot:r.subcategory==='Smelting'?'Metal':'Crafting Good'}[kind]||'Item';
    const max=can?Math.max(1,Math.min(10,...req.map(i=>Math.floor(i.have/i.qty)))):0;const check=gate.ok?craftCheck(actor,r,toolKey,r.toolProficiency,gate.tool):null;const dc=num(r.dc,12)+(this.craftMode==='inspired'?3:0);
    return `<article class="gc-tile gc-recipe ${can?'gc-ready':''}"><div class="gc-tile-banner gc-craft-art"><span class="gc-hero-icon"><img class="gc-art-img" src="${esc(artworkFor(r))}" alt=""></span><span class="gc-dc">${esc(kindText)} · Tier ${num(r.tier,1)}</span>${can?'<span class="gc-ready-tag">Ready</span>':''}</div><div class="gc-tile-body"><h3>${esc(r.name)}</h3><p>${esc(visibleDescription(r.description))}</p><div class="gc-ingredients">${req.map(i=>`<div class="gc-ingredient ${i.have>=i.qty?'gc-have':'gc-miss'}"><span class="gc-mat-icon" style="--gc-mat:${hue(i.mat?.color)}"><img src="${esc(artworkFor(i.mat))}" alt=""></span><span>${esc(i.mat?.name||'Missing material')}</span><b>${i.have}/${i.qty}</b></div>`).join('')}</div><p class="gc-tool-requirement">${icon('fa-screwdriver-wrench')} ${esc(spec.label)} · ${gate.advantage?'Advantage (proficient)':'Normal roll'}${game.user.isGM?' · DC '+dc:''}${check?` · d20 ${check.total>=0?'+':''}${check.total}`:''}</p>${!gate.ok?`<p class="gc-missing-tool">${icon('fa-lock')} ${esc(gate.error)}</p>`:'' }<div class="gc-craft-actions"><button class="gc-primary" type="button" data-action="craft" data-id="${esc(r.id)}" ${!can||this.busy?'disabled':''}>${icon(can?'fa-hammer':'fa-lock')} ${can?'Craft':gate.ok?'Missing materials':'Needs tool + proficiency'}</button>${max>1&&this.craftMode==='steady'?`<button type="button" class="gc-secondary gc-craft-max" title="Craft ${max} at once" data-action="craftMax" data-id="${esc(r.id)}">×${max}</button>`:''}</div></div></article>`;
  }
  inventoryTab(db,actor){const mats=db.materials.filter(m=>this.group==='all'||(this.group==='metallurgy'?['Ore & Mineral','Refined Metal'].includes(m.group):this.group==='alchemy'?m.group==='Alchemical Ingredient':m.group==='Monster Drop')).filter(m=>this.showZero||count(actor,m.id)>0).filter(m=>!this.search||`${m.name} ${m.description}`.toLowerCase().includes(this.search.toLowerCase()));
    const owned=db.materials.reduce((n,m)=>n+count(actor,m.id),0);
    const potions=actor.items.filter(i=>!!i.getFlag(ID,'recipeId')&&db.recipes.some(r=>r.id===i.getFlag(ID,'recipeId')&&r.category==='alchemy'));
    const equipped=actor.items.filter(i=>!!i.getFlag(ID,'recipeId')&&db.recipes.some(r=>r.id===i.getFlag(ID,'recipeId')&&r.category!=='alchemy'));
    return this.heading('fa-box-open','Character Inventory','Inventory is split for easy play: browse alchemy ingredients, blacksmithing materials and ready items without opening the character sheet.')+
      `<div class="gc-stats"><div>${icon('fa-boxes-stacked')}<b>${owned}</b><small>Units</small></div><div>${icon('fa-gem')}<b>${db.materials.filter(m=>count(actor,m.id)>0).length}</b><small>Materials owned</small></div><div>${icon('fa-flask')}<b>${potions.reduce((n,i)=>n+quantity(i),0)}</b><small>Potions owned</small></div></div>`+
      this.filterBar(materialGroups,this.group,'group')+`<button type="button" class="gc-secondary gc-toggle" data-action="toggleZero">${icon(this.showZero?'fa-eye-slash':'fa-eye')} ${this.showZero?'Owned only':'Show all materials'}</button>`+this.searchBar()+
      `<div class="gc-material-grid">${mats.map(m=>`<div class="gc-material ${count(actor,m.id)?'':'is-zero'}"><span class="gc-inv-icon" style="--gc-mat:${hue(m.color)}"><img src="${esc(artworkFor(m))}" alt=""></span><div class="gc-inv-name"><b>${esc(m.name)}</b><small>${esc(m.group)} · Tier ${num(m.tier,1)}</small><small>${esc(visibleDescription(m.description))}</small></div><strong>×${count(actor,m.id)}</strong><div class="gc-stack-adjust"><button class="gc-secondary" type="button" data-action="takeMat" data-id="${esc(m.id)}">${icon('fa-minus')}</button><button class="gc-secondary" type="button" data-action="giveMat" data-id="${esc(m.id)}">${icon('fa-plus')}</button></div></div>`).join('')}</div>`+
      `<h3 class="gc-inv-title">${icon('fa-flask')} Alchemy Items</h3><div class="gc-potion-list">${potions.map(i=>`<div class="gc-potion"><img class="gc-potion-icon" src="${esc((replaceableArtwork(i.img)?artworkFor(db.recipes.find(r=>r.id===i.getFlag(ID,'recipeId'))):null)||i.img)}" alt=""><div><strong>${esc(i.name)} ×${quantity(i)}</strong><small>${esc(visibleDescription(db.recipes.find(r=>r.id===i.getFlag(ID,'recipeId'))?.description||''))}</small></div><div class="gc-inline-actions"><button class="gc-secondary" data-action="takeRecipe" data-id="${esc(i.getFlag(ID,'recipeId'))}" type="button">${icon('fa-minus')}</button><button class="gc-secondary" data-action="giveRecipe" data-id="${esc(i.getFlag(ID,'recipeId'))}" type="button">${icon('fa-plus')}</button><button class="gc-secondary" data-action="drink" data-id="${esc(i.id)}" type="button">${icon('fa-flask-vial')} Use</button></div></div>`).join('')||'<p class="gc-help">Craft a potion to use it here. Non-healing and transmutation effects are announced in chat for GM adjudication.</p>'}</div><h3 class="gc-inv-title">${icon('fa-hammer')} Blacksmithing Items</h3><div class="gc-potion-list">${equipped.map(i=>`<div class="gc-potion"><img class="gc-potion-icon" src="${esc((replaceableArtwork(i.img)?artworkFor(db.recipes.find(r=>r.id===i.getFlag(ID,'recipeId'))):null)||i.img)}" alt=""><div><strong>${esc(i.name)}</strong><small>${esc(db.recipes.find(r=>r.id===i.getFlag(ID,'recipeId'))?.description|| (i.type==='weapon'?'Attack-ready weapon':'Equipable armor / shield'))}</small></div><div class="gc-inline-actions"><button class="gc-secondary" data-action="takeRecipe" data-id="${esc(i.getFlag(ID,'recipeId'))}" type="button">${icon('fa-minus')}</button><button class="gc-secondary" data-action="giveRecipe" data-id="${esc(i.getFlag(ID,'recipeId'))}" type="button">${icon('fa-plus')}</button><button class="gc-secondary" data-action="sheetItem" data-id="${esc(i.id)}" type="button">${icon('fa-up-right-from-square')} Item Sheet</button></div></div>`).join('')||'<p class="gc-help">Craft a weapon, shield or metal good to see it here.</p>'}</div>`;
  }
  gmTab(db){const kind=this.editor?.kind||'material',key=({material:'materials',node:'nodes',recipe:'recipes'})[kind],entries=db[key];
    return this.heading('fa-gears','GM Studio','Manage the catalogue, map deposits and four world compendiums with real D&D Items.')+
    `<div class="gc-gm-layout"><aside class="gc-gm-side"><div class="gc-gm-title">${icon('fa-sliders')} Library</div>
      ${[['material','Materials','fa-gem',db.materials.length],['node','Gathering Nodes','fa-mountain',db.nodes.length],['recipe','Recipes','fa-scroll',db.recipes.length]].map(([k,name,ic,len])=>`<button class="gc-gm-group ${kind===k?'is-on':''}" type="button" data-action="gmkind" data-id="${k}">${icon(ic)} ${name}<span>${len}</span></button>`).join('')}
      <p class="gc-help">Gathering is unlimited. Characters need the right tool in their inventory. Tool proficiency is optional and gives Advantage.</p><button type="button" class="gc-secondary gc-full" data-action="saveSettings">${icon('fa-floppy-disk')} Save settings</button>
      <label class="gc-checkbox"><input type="checkbox" name="sceneOnly" ${db.settings.sceneOnly?'checked':''}> Scene-only gathering (15 ft from bound tokens)</label>
      <button type="button" class="gc-secondary gc-full" data-action="sync">${icon('fa-book')} Create / Sync Compendiums</button>
      <p class="gc-help">World packs: <b>Ores & Metals</b>, <b>Alchemy Ingredients</b>, <b>Monster Drops</b>, and <b>Ready-to-use Items</b>. Sync adds missing items only; edited copies are never overwritten. Drag these items onto actors, chest actors or scene loot inventories.</p></aside>
      <section class="gc-gm-main"><div class="gc-library"><div class="gc-lib-header"><strong>${kind==='material'?'Materials':kind==='node'?'Gathering Nodes':'Recipes'}</strong><button type="button" data-action="new">${icon('fa-plus')} New</button></div><div class="gc-lib-list">${entries.map(x=>`<button class="gc-library-item ${this.editor?.id===x.id?'is-active':''}" type="button" data-action="edit" data-id="${esc(x.id)}">${icon(x.icon)} <span>${esc(x.name)}</span>${icon('fa-chevron-right')}</button>`).join('')}</div></div>
      ${this.editor?.id?this.editorForm(db,kind,entries.find(x=>x.id===this.editor.id)):this.editor?.isNew?this.editorForm(db,kind,{}):'<div class="gc-empty gc-placeholder">Select an entry to edit or press New.</div>'}</section></div>`;
  }
  field(k,label,val,type='text',rest=''){return `<label class="gc-field"><span>${esc(label)}</span><input name="${k}" type="${type}" value="${esc(val??'')}" ${rest}></label>`;}
  select(k,label,options,chosen){return `<label class="gc-field"><span>${esc(label)}</span><select name="${k}">${options.map(([id,name])=>`<option value="${esc(id)}" ${id===chosen?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;}
  ingRow(ing,mats){return `<div class="gc-ing-row"><select name="ing-id">${mats.map(([id,name])=>`<option value="${esc(id)}" ${id===ing.id?'selected':''}>${esc(name)}</option>`).join('')}</select><input name="ing-qty" type="number" min="1" max="99" value="${num(ing.qty,1,1,99)}"><button type="button" data-action="removeIngredient" title="Remove ingredient">${icon('fa-xmark')}</button></div>`;}
  editorForm(db,kind,entry={}){const isNew=!entry.id,mats=db.materials.map(m=>[m.id,m.name]),groupChoices=[['Ore & Mineral','Ore & Mineral'],['Refined Metal','Refined Metal'],['Alchemical Ingredient','Alchemical Ingredient'],['Monster Drop','Monster Drop']];
    let extra='';
    if(kind==='material')extra=this.select('group','Resource group',groupChoices,entry.group||'Ore & Mineral')+this.field('tier','Tier',entry.tier||1,'number','min="1" max="4"')+this.field('color','Accent color',hue(entry.color),'color')+this.field('img','Image path',entry.img||'icons/svg/item-bag.svg');
    if(kind==='node')extra=this.select('requiredTool','Required physical tool',[['','Auto by resource group'],...Object.entries(TOOL_SPECS).map(([k,s])=>[k,s.label])],entry.requiredTool||'')+this.select('toolProficiency','Optional proficiency for Advantage',[['','Auto from tool'],...Object.entries(PROF_OPTIONS)],entry.toolProficiency||'')+this.select('materialId','Harvested material',mats,entry.materialId||mats[0]?.[0])+this.select('bonusId','Bonus find',[['','None'],...mats],entry.bonusId||'')+this.field('bonusChance','Bonus chance (%)',entry.bonusChance||0,'number','min="0" max="100"')+this.select('skill','Skill check',skills,entry.skill||'sur')+this.field('dc','DC',entry.dc||12,'number','min="1" max="40"')+this.field('minYield','Min yield',entry.minYield||1,'number','min="1" max="20"')+this.field('maxYield','Max yield',entry.maxYield||2,'number','min="1" max="20"')+`<label class="gc-checkbox"><input type="checkbox" name="active" ${entry.active!==false?'checked':''}> Available to players</label>`+(entry.id?`<button type="button" class="gc-secondary gc-full" data-action="bindToken">${icon('fa-map-pin')} Bind selected map token</button><p class="gc-help">Select a token on the scene as GM, then bind it to this node. Players can harvest within 15 ft when scene-only mode is on.</p>`:'');
    if(kind==='recipe'){
      const choices=[['','Use generated native Item'],...(game.items?.contents||[]).filter(i=>['loot','weapon','equipment','consumable','tool'].includes(i.type)).map(i=>[i.uuid,i.name])];
      extra=this.select('requiredTool','Required physical tool',[['','Auto by profession'],...Object.entries(TOOL_SPECS).map(([k,s])=>[k,s.label])],entry.requiredTool||'')+this.select('toolProficiency','Required tool proficiency',[['','Auto from tool'],...Object.entries(PROF_OPTIONS)],entry.toolProficiency||'')+this.select('category','Profession',[['metallurgy','Metallurgy'],['alchemy','Alchemy']],entry.category||'metallurgy')+this.field('subcategory','Craft group',entry.subcategory||'Custom')+this.field('tier','Tier',entry.tier||1,'number','min="1" max="4"')+this.select('outputItemUuid','Linked World Item (optional)',choices,entry.outputItemUuid||'')+this.field('outputQuantity','Output count',entry.outputQuantity||1,'number','min="1" max="99"')+this.field('dc','Standard craft DC',entry.dc||12,'number','min="1" max="40"')+this.field('effect','Potion effect note / healing:XdY+Z',entry.effect||'')+this.field('img','Item image path',entry.img||'icons/svg/item-bag.svg')+`<div class="gc-ingredients-editor"><div class="gc-ingredient-title">Ingredients<button type="button" data-action="addIngredient">${icon('fa-plus')} Add</button></div><div class="gc-ingredient-rows">${(entry.ingredients||[{id:mats[0]?.[0],qty:1}]).map(i=>this.ingRow(i,mats)).join('')}</div></div><p class="gc-help">Built-in blacksmithing gear and alchemy items are ready to use. Custom recipes can link to any prepared World Item for full D&D5e actions.</p>`;
    }
    return `<form class="gc-gm-form" data-editor-form="1"><h3>${isNew?'New':'Edit'} ${esc(kind)}</h3><div class="gc-fields">${this.field('name','Name',entry.name||'')}${this.field('description','Description',entry.description||'')}${this.field('icon','Font Awesome icon',entry.icon||'fa-gem')}${extra}</div><div class="gc-form-actions"><button class="gc-primary" type="submit">${icon('fa-floppy-disk')} Save</button>${isNew?'':`<button class="gc-danger" type="button" data-action="delete" data-id="${esc(entry.id)}">${icon('fa-trash')} Delete</button>`}<button class="gc-secondary" type="button" data-action="cancel">Cancel</button></div></form>`;
  }
  async click(e){const button=e.target.closest('button[data-action]');if(!button||this.busy)return;const a=button.dataset.action,id=button.dataset.id;
    if(a==='tab'){this.tab=id;this.search='';this.group='all';this.page=1;this.readyOnly=false;return this.refresh({resetScroll:true});}
    if(a==='more'){this.rememberScroll();this.page++;return this.refresh();}
    if(a==='readyOnly'){this.readyOnly=!this.readyOnly;this.page=1;return this.refresh();}
    if(a==='toggleZero'){this.showZero=!this.showZero;return this.refresh();}
    if(a==='gmode'){this.gatherMode=button.dataset.mode;return this.refresh();}
    if(a==='cmode'){this.craftMode=button.dataset.mode;return this.refresh();}
    if(a==='category'){this.category=id;this.page=1;return this.refresh();}
    if(a==='group'){this.group=id;this.page=1;return this.refresh();}
    if(a==='gather')return this.locked(()=>this.gather(id));
    if(a==='craft')return this.locked(()=>this.craft(id));
    if(a==='craftMax')return this.locked(()=>this.craft(id,10));
    if(a==='trainRank')return this.locked(()=>beginLesson(this.checkActor(),'rank',null,notify));
    if(a==='finishLesson')return this.locked(()=>finishLesson(this.checkActor(),notify,announce,announceGM));
    if(a==='learnEnchant')return this.locked(()=>beginLesson(this.checkActor(),'enchant',id,notify));
    if(a==='useEnchant')return this.locked(()=>useEnchantment(this.checkActor(),id,button.dataset.enchant,notify,announce));
    if(a==='startEnchant')return this.locked(()=>beginEnchantment(this,id,{actor:this.checkActor(),announce,notify}));
    if(a==='finishEnchant')return this.locked(()=>finishEnchantment(this,id,{actor:this.checkActor(),announce,announceGM,notify}));
    if(a==='drink')return this.locked(()=>this.drink(id));
    if(a==='giveMat')return this.locked(()=>adjustMaterialQuantity(this.checkActor(),id,1));
    if(a==='takeMat')return this.locked(()=>adjustMaterialQuantity(this.checkActor(),id,-1));
    if(a==='giveRecipe')return this.locked(()=>adjustCraftedQuantity(this.checkActor(),id,1));
    if(a==='takeRecipe')return this.locked(()=>adjustCraftedQuantity(this.checkActor(),id,-1));
    if(a==='sheetItem'){const item=this.actor?.items?.get?.(id)||this.actor?.items?.find(i=>i.id===id);return item?.sheet?.render(true);}
    if(a==='saveEnchantSlots'&&game.user.isGM)return this.locked(async()=>{
      const actor=this.checkActor(),item=actor.items.get?.(id)||actor.items.find(i=>i.id===id);
      if(!item||!['weapon','equipment'].includes(item.type))throw new Error('Select a valid equipment item.');
      const input=this.element.querySelector('[name=enchantSlots]');
      const value=Number(input?.value);
      if(!Number.isInteger(value)||value<0||value>6)throw new Error('Slot capacity must be between 0 and 6.');
      await item.update({['flags.'+ID+'.enchantSlots']:value});
      notify('Enchant slots set to '+value+' on '+item.name+'.');
    });
    if(!game.user.isGM)return;
    if(a==='gmkind'){this.editor={kind:id,id:null};return this.refresh();}
    if(a==='new'){this.editor={kind:this.editor.kind,id:null,isNew:true};return this.refresh();}
    if(a==='edit'){this.editor={kind:this.editor.kind,id};return this.refresh();}
    if(a==='cancel'){this.editor={kind:this.editor.kind,id:null};return this.refresh();}
    if(a==='addIngredient'){const rows=this.element.querySelector('.gc-ingredient-rows'),mats=database().materials.map(m=>[m.id,m.name]);if(rows&&mats.length)rows.insertAdjacentHTML('beforeend',this.ingRow({id:mats[0][0],qty:1},mats));return;}
    if(a==='removeIngredient'){if(this.element.querySelectorAll('.gc-ing-row').length>1)button.closest('.gc-ing-row')?.remove();return;}
    if(a==='saveSettings')return this.locked(()=>this.saveSettings());
    if(a==='bindToken')return this.locked(()=>this.bindToken());
    if(a==='sync')return this.locked(()=>syncCompendiums());
    if(a==='delete')return this.locked(()=>this.deleteEntry(id));
  }
  change(e){if(e.target.name==='actor'){this.actorId=e.target.value;this.enchantItemId=null;return this.refresh();}
    if(e.target.name==='enchantItem'){this.enchantItemId=e.target.value;this.page=1;return this.refresh();}
    if(e.target.name==='enchantFilter'){this.enchantFilter=e.target.value;this.page=1;return this.refresh();}
    if(e.target.name==='sceneOnly'&&game.user.isGM)return this.locked(async()=>{const db=clone(database());db.settings.sceneOnly=e.target.checked;await game.settings.set(ID,'database',db);});
  }
  input(e){if(!e.target.matches('[data-search]'))return;this.search=e.target.value;this.page=1;clearTimeout(this.searchTimer);
    this.searchTimer=setTimeout(async()=>{await this.refresh();const field=this.element?.querySelector('[data-search]');if(field){field.focus({preventScroll:true});field.setSelectionRange?.(field.value.length,field.value.length);}},230);
  }
  submit(e){if(!e.target.matches('[data-editor-form]'))return;e.preventDefault();if(game.user.isGM&&!this.busy)return this.locked(()=>this.saveEntry(e.target));}
  async locked(fn){if(this.busy)return;this.busy=true;try{await fn();}catch(err){console.error(`${ID} | Action failed`,err);notify(err.message||'Unexpected error',true);}finally{this.busy=false;await this.refresh();}}
  checkActor(){const actor=this.actor;if(!actor||!(game.user.isGM||actor.isOwner))throw new Error('You do not own this character.');return actor;}
  async gather(id){const actor=this.checkActor(),db=database(),node=db.nodes.find(n=>n.id===id&&n.active);
    if(!node)throw new Error('That gathering node is unavailable.');
    if(db.settings.sceneOnly){const near=nearestNodeToken(actor,id);if(!near||near.feet>15)throw new Error('Move your character within 15 ft of the mapped gathering token.');}
    const mat=material(db,node.materialId);if(!mat)throw new Error('The resource no longer exists.');
    const toolKey=requiredForNode(node,mat),gate=toolGate(actor,toolKey,node.toolProficiency);
    if(!gate.ok)throw new Error(gate.error);
    const risky=this.gatherMode==='bold',dc=num(node.dc,12)+(risky?3:-2);
    const spec=TOOL_SPECS[toolKey],profId=node.toolProficiency||spec.proficiency;
    const mod=Number(actor.system?.abilities?.[spec.ability]?.mod||0);
    const toolCheck=mod+proficiencyBonus(actor)*proficiencyLevel(actor,profId);
    const bonus=Math.max(skillBonus(actor,node.skill),toolCheck)+toolItemBonus(gate.tool);
    const roll=await new Roll(rollFormula(gate.advantage),{bonus}).evaluate();
    const success=roll.total>=dc;let obtained=0,bonusText='';
    if(success){const minimum=num(node.minYield,1,1,20),maximum=Math.max(minimum,num(node.maxYield,2,1,20));obtained=(minimum+Math.floor(Math.random()*(maximum-minimum+1)))*(risky?2:1);await grantMaterial(actor,mat,obtained);
      const rare=material(db,node.bonusId);if(rare&&Math.random()*100<num(node.bonusChance,0,0,100)){await grantMaterial(actor,rare,1);bonusText=`<p>Rare find: <strong>${esc(rare.name)} ×1</strong></p>`;}
    }
    await announce(actor,`<p><b>${esc(actor.name)}</b> ${success?'harvested':'failed to harvest'} <b>${esc(node.name)}</b>.</p><p>${esc(skillLabels[node.skill]||node.skill)} + ${esc(TOOL_SPECS[toolKey].label)} roll: ${roll.total} (${risky?'Risky':'Careful'}${gate.advantage?', Tool Proficiency Advantage':''}).</p>${success?`<p>${esc(mat.name)} ×${obtained}</p>${bonusText}`:'<p>No materials gained. You can try gathering again.</p>'}`);
    await announceGM(actor,`<p>Gathering: ${esc(node.name)} — ${esc(skillLabels[node.skill]||node.skill)} ${roll.total} vs DC ${dc} (${success?'success':'failure'}; ${gate.advantage?'Advantage':'Normal'}).</p>`);
    notify(success?`Harvested ${mat.name} ×${obtained}.`:'Gathering failed.');
  }
  async craft(id,maxBatch=1){const actor=this.checkActor(),db=database(),recipe=db.recipes.find(r=>r.id===id);if(!recipe)throw new Error('Recipe not found.');
    const inspired=this.craftMode==='inspired',required=requirements(actor,recipe,db,inspired);
    if(!required.length||required.some(i=>!i.mat||i.have<i.qty))throw new Error('Missing required materials.');
    if(recipe.outputItemUuid){const source=await fromUuid(recipe.outputItemUuid);if(!source||source.documentName!=='Item')throw new Error('Linked Item not found. GM must relink it.');}
    const toolKey=requiredForRecipe(recipe),gate=toolGate(actor,toolKey,recipe.toolProficiency);
    if(!gate.ok)throw new Error(gate.error);
    const check=craftCheck(actor,recipe,toolKey,recipe.toolProficiency,gate.tool);
    const dc=num(recipe.dc,12)+(inspired?3:0),roll=await new Roll(rollFormula(gate.advantage),{bonus:check.total}).evaluate();
    const success=roll.total>=dc;
    const batch=maxBatch>1&&!inspired?Math.max(1,Math.min(10,...required.map(i=>Math.floor(i.have/i.qty)))):1;
    const consumed=required.map(i=>({id:i.id,qty:i.qty*batch})),amount=num(recipe.outputQuantity,1,1,99)*(inspired?2:1)*batch;let paid=false;
    try{
      await consume(actor,consumed);paid=true;
      if(success)await grantProduct(actor,recipe,amount);
    }catch(e){if(paid&&success){try{await refund(actor,consumed,db);}catch(err){notify('Item creation failed and refund failed. Contact the GM.',true);console.error(err);}}throw e;}
    await announce(actor,`<p><strong>${esc(actor.name)}</strong> ${success?'crafted':'failed to craft'} <strong>${esc(recipe.name)}</strong>.</p><p>${esc(TOOL_SPECS[toolKey].label)} check total: <strong>${roll.total}</strong>. ${gate.advantage?'Advantage (tool proficient).':'Normal roll.'} ${inspired?'Inspired attempt.':'Standard attempt.'}</p><p>${success?`Produced ×${amount}.`:'Materials were consumed; no item produced.'}</p>`);
    await announceGM(actor,`<p>Crafting ${esc(recipe.name)}: d20 + ability ${check.modifier} + PB ${check.pb} × ${check.multiplier} + level ${check.levelBonus} + item ${check.itemBonus} = ${roll.total} vs DC ${dc} (${success?'success':'failure'}).</p>`);
    notify(success?`Crafted ${recipe.name} ×${amount}.`:`Crafting failed: ${recipe.name} (roll ${roll.total}).`);
  }
  async drink(itemId){const actor=this.checkActor(),item=actor.items.get?.(itemId)||actor.items.find(i=>i.id===itemId);
    if(!item||quantity(item)<1)throw new Error('Potion is no longer in this inventory.');
    const recipe=database().recipes.find(r=>r.id===item.getFlag(ID,'recipeId')&&r.category==='alchemy');
    if(!recipe)throw new Error('This is not a Gathering & Crafting potion.');
    const effect=String(item.getFlag(ID,'effect')||recipe.effect||'');
    const formula=/^healing:(\d+d\d+\+\d+)$/.exec(effect),tempFormula=/^temp:(\d+d\d+)$/.exec(effect);
    let roll=null,hpOld=null,healed=0,tempOld=null,tempGained=0;
    if(formula){roll=await new Roll(formula[1]).evaluate();const hp=actor.system?.attributes?.hp||{};if(!Number.isFinite(Number(hp.value))||!Number.isFinite(Number(hp.max)))throw new Error('Cannot find character HP.');
      hpOld=Number(hp.value);healed=Math.max(0,Math.min(Number(hp.max)-hpOld,Number(roll.total)));}
    if(tempFormula){roll=await new Roll(tempFormula[1]).evaluate();const hp=actor.system?.attributes?.hp||{};
      tempOld=Number(hp.temp||0);tempGained=Math.max(0,Number(roll.total)-tempOld);}
    // Consumption and HP update must succeed together. Restore the stack on error.
    const saved=item.toObject();try{
      if(quantity(item)===1)await actor.deleteEmbeddedDocuments('Item',[item.id]);else await item.update({'system.quantity':quantity(item)-1});
      if(formula&&healed>0)await actor.update({'system.attributes.hp.value':hpOld+healed});
      if(tempFormula&&tempGained>0)await actor.update({'system.attributes.hp.temp':tempOld+tempGained});
    }catch(error){try{if(formula&&hpOld!=null)await actor.update({'system.attributes.hp.value':hpOld});if(tempFormula&&tempOld!=null)await actor.update({'system.attributes.hp.temp':tempOld});}catch(e){console.error(`${ID} | HP rollback failed`,e);}try{const current=actor.items.get?.(itemId)||actor.items.find(i=>i.id===itemId);if(current)await current.update({'system.quantity':saved.system.quantity});else{delete saved._id;await actor.createEmbeddedDocuments('Item',[saved]);}}catch(e){console.error(`${ID} | potion rollback failed`,e);}throw error;}
    await announce(actor,`<p><b>${esc(actor.name)}</b> drinks <b>${esc(recipe.name)}</b>.</p><p>${esc(visibleDescription(recipe.description))}</p>${formula?`<p>Healing roll: ${roll.total}; HP restored: <b>${healed}</b>.</p>`:tempFormula?`<p>Temporary HP roll: ${roll.total}; new temporary HP: <b>${tempOld+tempGained}</b>.</p>`:'<p><em>Apply the effect according to the item description. Utility brews such as gender change, height change, featherfall, glide, spider climb and similar transformations are announced here for GM adjudication.</em></p>'}`);
    notify(`Used ${recipe.name}${formula?` (+${healed} HP)`:tempFormula?` (+${tempGained} temporary HP)`:''}.`);
  }
  async saveSettings(){const db=clone(database());db.settings.sceneOnly=!!this.element.querySelector('[name=sceneOnly]')?.checked;await game.settings.set(ID,'database',db);notify('Gathering settings saved. Attempts are unlimited.');}
  async bindToken(){const nodeId=this.editor?.id;const token=canvas?.tokens?.controlled?.[0];if(!token||!nodeId)throw new Error('Select a scene token before binding a gathering node.');await token.document.setFlag(ID,'nodeId',nodeId);notify(`Selected token bound to ${database().nodes.find(n=>n.id===nodeId)?.name||nodeId}.`);}
  async deleteEntry(id){const kind=this.editor?.kind,key=({material:'materials',node:'nodes',recipe:'recipes'})[kind],db=clone(database()),entry=db[key]?.find(v=>v.id===id);if(!entry)return;
    if(kind==='material'&&(db.nodes.some(n=>n.materialId===id||n.bonusId===id)||db.recipes.some(r=>r.ingredients.some(i=>i.id===id))))throw new Error('This material is used by a node or recipe. Remove those dependencies first.');
    if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Delete entry?'},content:`<p>Delete <strong>${esc(entry.name)}</strong> from the world catalogue? Items already owned by characters are unaffected.</p>`}))return;
    db[key]=db[key].filter(v=>v.id!==id);await game.settings.set(ID,'database',db);this.editor={kind,id:null};notify('Entry deleted.');
  }
  async saveEntry(form){if(!game.user.isGM)return;const db=clone(database()),kind=this.editor.kind,key=({material:'materials',node:'nodes',recipe:'recipes'})[kind],fd=new FormData(form);
    const name=String(fd.get('name')||'').trim().slice(0,90);if(!name)throw new Error('Enter a name.');
    const entry={id:this.editor.id||foundry.utils.randomID(12),name,description:String(fd.get('description')||'').trim().slice(0,350),icon:/^fa-[a-z0-9-]+$/.test(String(fd.get('icon')))?String(fd.get('icon')):'fa-gem'};
    if(kind==='material'){entry.group=['Ore & Mineral','Refined Metal','Alchemical Ingredient','Monster Drop'].includes(fd.get('group'))?fd.get('group'):'Ore & Mineral';entry.tier=num(fd.get('tier'),1,1,4);entry.color=hue(fd.get('color'));entry.img=String(fd.get('img')||'icons/svg/item-bag.svg').slice(0,250);}
    if(kind==='node'){entry.materialId=String(fd.get('materialId')||'');entry.bonusId=String(fd.get('bonusId')||'');entry.bonusChance=num(fd.get('bonusChance'),0,0,100);entry.skill=skillLabels[fd.get('skill')]?String(fd.get('skill')):'sur';entry.dc=num(fd.get('dc'),12,1,40);entry.minYield=num(fd.get('minYield'),1,1,20);entry.maxYield=Math.max(entry.minYield,num(fd.get('maxYield'),2,1,20));entry.active=fd.get('active')==='on';entry.requiredTool=TOOL_SPECS[fd.get('requiredTool')]?String(fd.get('requiredTool')):'';entry.toolProficiency=PROF_OPTIONS[fd.get('toolProficiency')]?String(fd.get('toolProficiency')):'';const mg=material(db,entry.materialId)?.group;entry.group=mg==='Alchemical Ingredient'?'alchemy':mg==='Monster Drop'?'monster':'metallurgy';if(!material(db,entry.materialId))throw new Error('Choose a valid material.');}
    if(kind==='recipe'){
      entry.category=fd.get('category')==='alchemy'?'alchemy':'metallurgy';entry.subcategory=String(fd.get('subcategory')||'Custom').slice(0,40);entry.tier=num(fd.get('tier'),1,1,4);entry.outputItemUuid=String(fd.get('outputItemUuid')||'');entry.outputQuantity=num(fd.get('outputQuantity'),1,1,99);entry.requiredTool=TOOL_SPECS[fd.get('requiredTool')]?String(fd.get('requiredTool')):'';entry.toolProficiency=PROF_OPTIONS[fd.get('toolProficiency')]?String(fd.get('toolProficiency')):'';entry.dc=num(fd.get('dc'),12,1,40);entry.effect=String(fd.get('effect')||'').slice(0,100);entry.img=String(fd.get('img')||'icons/svg/item-bag.svg').slice(0,250);
      const merged=new Map(),ids=fd.getAll('ing-id').map(String),counts=fd.getAll('ing-qty');ids.forEach((i,idx)=>merged.set(i,(merged.get(i)||0)+num(counts[idx],1,1,99)));
      entry.ingredients=[...merged].map(([id,qty])=>({id,qty}));if(!entry.ingredients.length||entry.ingredients.some(i=>!material(db,i.id)))throw new Error('Choose at least one valid ingredient.');
      if(entry.outputItemUuid){const it=await fromUuid(entry.outputItemUuid);if(!it||it.documentName!=='Item')throw new Error('Linked Item not found.');}
    }
    const ix=db[key].findIndex(v=>v.id===entry.id);if(ix>=0)db[key][ix]=entry;else db[key].push(entry);
    await game.settings.set(ID,'database',db);this.editor={kind,id:entry.id};notify('Saved to world catalogue. Use Sync Compendiums to add missing Items.');
  }
}
let windowInstance;
function open(actor){if(!windowInstance)windowInstance=new GatheringCrafting();if(actor&&(game.user.isGM||actor.isOwner))windowInstance.actorId=actor.id;windowInstance.render({force:true});return windowInstance;}
function makeLauncherButton(actor,inTabs=false){
  const button=document.createElement('button');
  button.type='button';
  button.className=inTabs?'item gc-launcher gc-sheet-tab':'gc-launcher';
  button.title='Gathering & Crafting';
  button.setAttribute('aria-label','Open Gathering & Crafting');
  // A short label fits next to Affinity even on narrower sheets.
  button.innerHTML=icon('fa-hammer')+' <span>'+(inTabs?'Crafting':'Gathering & Crafting')+'</span>';
  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation(); // Clicking the launcher must never switch the sheet tab.
    open(actor);
  });
  return button;
}
function affinityTab(root){
  if(!root?.querySelectorAll)return null;
  const selectors=[
    'nav [data-tab]', '.sheet-tabs [data-tab]', '.tabs [data-tab]',
    '[role="tablist"] [data-tab]', 'nav a', 'nav button', '.tabs a', '.tabs button',
    '.sheet-tabs a', '.sheet-tabs button', '.tabs .item',
    '.sheet-navigation a', '.sheet-navigation button', '[role="tab"]'
  ];
  const candidates=new Set(selectors.flatMap(selector=>[...root.querySelectorAll(selector)]));
  return [...candidates].find(el=>{
    if(el.classList?.contains('gc-launcher'))return false;
    const id=String(el.dataset?.tab||el.getAttribute?.('data-tab')||'').trim().toLowerCase();
    const label=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    const title=String(el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'').trim().toLowerCase();
    return id==='affinity'||label==='affinity'||title==='affinity';
  })||null;
}
function placeSheetLauncher(root,actor){
  const affinity=affinityTab(root);
  if(!affinity)return false;
  // Keep the same list structure when a third-party sheet renders nav as <li>.
  const anchor=affinity.parentElement?.tagName==='LI'?affinity.parentElement:affinity;
  const wrapper=root.querySelector('.gc-sheet-tab-holder');
  const existing=wrapper?.querySelector('.gc-sheet-tab')||root.querySelector('.gc-sheet-tab');
  const button=existing||makeLauncherButton(actor,true);
  const entry=anchor.tagName==='LI'?(wrapper||document.createElement('li')):button;
  if(entry!==button){
    entry.classList.add('gc-sheet-tab-holder');
    if(!entry.contains(button))entry.append(button);
  }else if(wrapper)wrapper.remove();
  // Remove the old full-width header launcher if the nav is now available.
  for(const old of root.querySelectorAll('.gc-launcher:not(.gc-sheet-tab)'))old.remove();
  if(anchor.nextElementSibling!==entry)anchor.after(entry);
  return true;
}
function launcher(html,selector,actor){
  const root=html instanceof HTMLElement?html:html?.[0];
  const parent=root?.querySelector(selector);
  if(!parent)return;
  if(actor){
    if(!placeSheetLauncher(root,actor)){
      // Fallback for NPC and third-party sheets without an Affinity tab.
      if(!parent.querySelector('.gc-launcher'))parent.append(makeLauncherButton(actor));
      // Other modules can inject their own tabs after this render hook.
      if(typeof MutationObserver==='function'&&!root._gcSheetTabObserver){
        const observer=new MutationObserver(()=>{
          if(placeSheetLauncher(root,actor)){observer.disconnect();root._gcSheetTabObserver=null;}
          else if(!root.isConnected){observer.disconnect();root._gcSheetTabObserver=null;}
        });
        root._gcSheetTabObserver=observer;
        observer.observe(root,{childList:true,subtree:true});
        setTimeout(()=>{if(root._gcSheetTabObserver===observer){observer.disconnect();root._gcSheetTabObserver=null;}},2500);
      }
    }
  }else if(!parent.querySelector('.gc-launcher')){
    parent.append(makeLauncherButton(null));
  }
  // Optional compact power controls inside D&D5e character-sheet headers.
  if(actor&&!parent.querySelector('.gc-sheet-powers')){
    const powers=Array.from(actor.items?.contents||actor.items||[]).flatMap(item=>(item.getFlag?.(ID,'enchantments')||[]).flatMap(applied=>{
      const enchant=enchantById(applied.id);
      return enchant?.power?[{item,enchant,spent:Number(item.getFlag?.(ID,'enchantmentUses')?.[applied.id]||0)}]:[];
    }));
    if(powers.length){
      const details=document.createElement('details');details.className='gc-sheet-powers';
      const summary=document.createElement('summary');summary.textContent='Enchantment Powers ('+powers.length+')';details.append(summary);
      const list=document.createElement('div');list.className='gc-sheet-power-buttons';
      for(const {item,enchant,spent} of powers){
        const action=document.createElement('button');action.type='button';
        const available=Math.max(0,enchant.power.uses-spent);
        action.textContent=enchant.name+' · '+item.name+' ('+available+'/'+enchant.power.uses+')';
        action.disabled=available===0||item.system?.equipped!==true;
        action.title=available===0?'Recharge after a Long Rest':item.system?.equipped!==true?'Equip this Item to use its power':enchant.description;
        action.addEventListener('click',async event=>{
          event.preventDefault();event.stopPropagation();
          try{await useEnchantment(actor,item.id,enchant.id,notify,announce);sheetPowerRefresh(actor);}
          catch(error){console.error('gathering-crafting | Enchantment power',error);notify(error.message||'Power could not be used.',true);}
        });
        list.append(action);
      }
      details.append(list);parent.append(details);
    }
  }
}
function sheetPowerRefresh(actor){for(const app of Object.values(actor.apps||{}))if(app?.rendered)app.render({force:true});}
Hooks.once('init',()=>{
  if(game.system.id!=='dnd5e')return;
  game.settings.register(ID,'database',{name:'Gathering & Crafting Catalogue',scope:'world',config:false,type:Object,default:clone(CATALOG),onChange:()=>{if(windowInstance?.rendered)windowInstance.render();}});
  game.settings.register(ID,'backup010',{name:'Legacy Catalogue Backup (v0.1.0)',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'compendiumBootstrapped',{name:'Legacy compendiums created',scope:'world',config:false,type:Boolean,default:false});
  game.settings.register(ID,'compendiumBootstrapped030',{name:'v0.3 native item compendiums created',scope:'world',config:false,type:Boolean,default:false});
  game.settings.register(ID,'backup020',{name:'Catalogue backup before v0.3.0',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'backup040',{name:'Catalogue backup before v0.5.0',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'backup050',{name:'Catalogue backup before v0.5.1',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'backup060',{name:'Catalogue backup before v0.6.0',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'backup081',{name:'Catalogue backup before v0.8.1',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'backup082',{name:'Catalogue backup before v0.8.2 Alchemy art',scope:'world',config:false,type:Object,default:{}});
  game.settings.register(ID,'backup080',{name:'Catalogue backup before v0.8.0',scope:'world',config:false,type:Object,default:{}});
  game.keybindings.register(ID,'open',{name:'Open Gathering & Crafting',hint:'Open gathering and crafting for your selected character.',editable:[{key:'KeyG',modifiers:['ALT']}],onDown:()=>{open();return true;},restricted:false,precedence:CONST.KEYBINDING_PRECEDENCE.NORMAL});
});
Hooks.once('ready',async()=>{
  if(game.system.id!=='dnd5e'){if(game.user.isGM)notify('Gathering & Crafting requires the dnd5e system.',true);return;}
  const mod=game.modules.get(ID);if(mod)mod.api={open,getDatabase:()=>clone(database()),syncCompendiums,version:VERSION};
  if(!game.user.isGM)return;
  try{
    let old=database();const needsArtMigration=validDb(old)&&num(old.catalogVersion,0)<10;
    if(!validDb(old)||num(old.catalogVersion,0)<2){
      if(validDb(old))await game.settings.set(ID,'backup010',clone(old));
      old=mergeCatalog(old);await game.settings.set(ID,'database',old);
    }
    if(num(old.catalogVersion,0)<3){
      await game.settings.set(ID,'backup020',clone(old));
      const upgraded=clone(old);const known=new Map([...CATALOG.materials,...CATALOG.recipes].map(i=>[i.id,i]));
      for(const entry of [...upgraded.materials,...upgraded.recipes]){
        const art=known.get(entry.id)?.img;
        if(art?.includes('/icons/painted/')&&String(entry.img||'').includes('/icons/v2/'))entry.img=art;
      }
      upgraded.catalogVersion=3;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('Catalogue upgraded. Previous recipes and customized Items were preserved.');
    }
    if(num(old.catalogVersion,0)<5){
      await game.settings.set(ID,'backup040',clone(old));
      const upgraded=mergeCatalog(old);const known=new Map([...CATALOG.materials,...CATALOG.recipes].map(i=>[i.id,i]));
      for(const entry of [...upgraded.materials,...upgraded.recipes]){
        const source=known.get(entry.id);const art=source?.img;const desc=source?.description;
        if(art&&(!entry.img||/\/icons\/(v2|v4|v5|painted)\//.test(String(entry.img||''))))entry.img=art;
        if((!entry.description||!String(entry.description).trim())&&desc)entry.description=desc;
      }
      upgraded.catalogVersion=5;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('Catalogue upgraded to v0.5.0. Existing recipes, items and GM edits were preserved.');
    }
    if(num(old.catalogVersion,0)<6){
      await game.settings.set(ID,'backup050',clone(old));
      const upgraded=mergeCatalog(old);const known=new Map([...CATALOG.materials,...CATALOG.recipes].map(i=>[i.id,i]));
      for(const entry of [...upgraded.materials,...upgraded.recipes]){
        const source=known.get(entry.id);const art=source?.img;const desc=source?.description;
        if(art&&(!entry.img||/\/icons\/(v2|v4|v5|v6|painted)\//.test(String(entry.img||''))))entry.img=art;
        if((!entry.description||!String(entry.description).trim())&&desc)entry.description=desc;
      }
      upgraded.catalogVersion=6;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('Catalogue upgraded to v0.5.1 with D&D-style artwork. Existing recipes, items and GM edits were preserved.');
    }
    if(num(old.catalogVersion,0)<7){
      await game.settings.set(ID,'backup060',clone(old));
      const upgraded=mergeCatalog(old);const known=new Map([...CATALOG.materials,...CATALOG.recipes].map(i=>[i.id,i]));
      for(const entry of [...upgraded.materials,...upgraded.recipes]){
        const source=known.get(entry.id);const art=source?.img;const desc=source?.description;
        if(art&&(!entry.img||/\/icons\/(v2|v4|v5|v6|v7|painted)\//.test(String(entry.img||''))))entry.img=art;
        if((!entry.description||!String(entry.description).trim())&&desc)entry.description=desc;
      }
      upgraded.catalogVersion=7;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('Catalogue upgraded to v0.6.0 with full fantasy item art. Existing recipes, items and GM edits were preserved.');
    }
    if(num(old.catalogVersion,0)<8){
      await game.settings.set(ID,'backup080',clone(old));
      const upgraded=mergeCatalog(old);
      const known=new Map([...CATALOG.materials,...CATALOG.recipes].map(i=>[i.id,i]));
      for(const entry of [...upgraded.materials,...upgraded.recipes]){
        const latest=known.get(entry.id);
        if(latest?.img&&(!entry.img||replaceableArtwork(entry.img)))entry.img=latest.img;
        if(!entry.description?.trim()&&latest?.description)entry.description=latest.description;
      }
      upgraded.catalogVersion=8;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('Illustrated item artwork installed. Recipes, inventories and GM edits preserved.');
    }
    if(num(old.catalogVersion,0)<9){
      await game.settings.set(ID,'backup081',clone(old));
      const upgraded=mergeCatalog(old);
      const painted=CATALOG.materials.find(m=>m.id==='iron-ore')?.img;
      const entry=upgraded.materials.find(m=>m.id==='iron-ore');
      if(entry&&painted&&(!entry.img||replaceableArtwork(entry.img)))entry.img=painted;
      upgraded.catalogVersion=9;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('Original painted Iron Ore artwork installed; other items and GM edits preserved.');
    }
    if(num(old.catalogVersion,0)<10){
      await game.settings.set(ID,'backup082',clone(old));
      const upgraded=mergeCatalog(old);
      const paintedMaterialIds=new Set(["kingsfoil","glowshroom","spider-silk"]);
      const paintedRecipeIds=new Set(["wyvern-poison","dragonfire-tonic","healing-potion","growth-draught","featherfall-philter","genderflux-elixir","voidward-philter"]);
      for(const kind of ['materials','recipes']){
        const selected=kind==='materials'?paintedMaterialIds:paintedRecipeIds;
        const sources=new Map(CATALOG[kind].filter(x=>selected.has(x.id)).map(x=>[x.id,x.img]));
        for(const entry of upgraded[kind]){
          const desired=sources.get(entry.id);
          if(desired&&(!entry.img||replaceableArtwork(entry.img)))entry.img=desired;
        }
      }
      upgraded.catalogVersion=10;
      await game.settings.set(ID,'database',upgraded);
      old=upgraded;
      notify('New individually painted Alchemy artwork installed; custom images and all recipes preserved.');
    }
    if(!game.settings.get(ID,'compendiumBootstrapped030')||needsArtMigration)await syncCompendiums();
    if(needsArtMigration)await refreshOwnedArtwork();
  }catch(e){console.error(`${ID} | Setup failed`,e);notify('Compendium setup needs GM attention. Open GM Studio and select Create / Sync Compendiums.',true);}
});
for(const hook of ['renderActorDirectory','renderActorDirectoryV2'])Hooks.on(hook,(app,html)=>launcher(html,'.directory-header, header.directory-header, .header-actions',null));
for(const hook of ['renderActorSheet','renderActorSheetV2'])Hooks.on(hook,(sheet,html)=>{const actor=sheet.actor||sheet.document;if(actor&&['character','npc'].includes(actor.type)&&(game.user.isGM||actor.isOwner))launcher(html,'.sheet-header, .window-header .window-controls',actor);});

Hooks.on('dnd5e.restCompleted',(actor,result,config)=>recoverEnchantmentUses(actor,result,config).catch(e=>console.error('gathering-crafting | Long Rest charge recovery',e)));
