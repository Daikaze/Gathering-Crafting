/* Lightweight Foundry V14/dnd5e 5.3.3 mock regression tests: node tests/smoke.cjs */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
const catalogJS=fs.readFileSync(path.join(base,'scripts/catalog.js'),'utf8').replace('export const CATALOG','const CATALOG');
const itemsJS=fs.readFileSync(path.join(base,'scripts/items.js'),'utf8').replaceAll(/^export /gm,'');
const toolsJS=fs.readFileSync(path.join(base,'scripts/tool-rules.mjs'),'utf8').replaceAll(/^export /gm,'');
const enchRulesJS=fs.readFileSync(path.join(base,'scripts/enchanting.mjs'),'utf8').replaceAll(/^export /gm,'');
const enchUIJS=fs.readFileSync(path.join(base,'scripts/enchanting-ui.mjs'),'utf8').replace(/^import .*;$/gm,'').replaceAll(/^export /gm,'');
const moduleJS=fs.readFileSync(path.join(base,'scripts/main.js'),'utf8').replace(/^import .*;$/gm,'');
const cat=JSON.parse(fs.readFileSync(path.join(base,'data/catalog.json'),'utf8'));
assert.equal(cat.materials.length,102);assert.equal(cat.recipes.length,122);assert.equal(cat.nodes.length,71);
const groupCount=Object.groupBy(cat.materials,m=>m.group);
assert.equal(groupCount['Ore & Mineral'].length,24);
assert.equal(groupCount['Refined Metal'].length,20);
assert.equal(groupCount['Alchemical Ingredient'].length,40);
assert.equal(groupCount['Monster Drop'].length,18);
assert.equal(cat.recipes.filter(r=>r.category==='metallurgy').length,56);
assert.equal(cat.recipes.filter(r=>r.category==='alchemy').length,66);
assert.ok(cat.recipes.every(r=>r.description&&r.description.length>10));
assert.ok(cat.materials.every(m=>m.description&&m.description.length>10));
assert.ok(cat.recipes.every(r=>r.ingredients.length>0&&r.ingredients.every(i=>cat.materials.some(m=>m.id===i.id))));
assert.ok(cat.recipes.every(r=>r.category!=='alchemy'||r.ingredients.length>=2));
const paintedAlchemyMaterials=new Set(["kingsfoil","glowshroom","spider-silk"]);
const paintedAlchemyRecipes=new Set(["wyvern-poison","dragonfire-tonic","healing-potion","growth-draught","featherfall-philter","genderflux-elixir","voidward-philter"]);
assert.ok(cat.recipes.every(r=>r.img.includes('/icons/illustrated/')||(paintedAlchemyRecipes.has(r.id)&&r.img.includes('/icons/handpainted/alchemy/'))));
assert.ok(cat.materials.every(m=>!paintedAlchemyMaterials.has(m.id)||m.img.endsWith('/icons/handpainted/alchemy/'+m.id+'.webp')));
assert.ok(cat.recipes.every(r=>!paintedAlchemyRecipes.has(r.id)||r.img.endsWith('/icons/handpainted/alchemy/'+r.id+'.webp')));
const paintedEntries=[...cat.materials.filter(m=>paintedAlchemyMaterials.has(m.id)),...cat.recipes.filter(r=>paintedAlchemyRecipes.has(r.id))];
assert.equal(paintedEntries.length,10);
const paintedHashes=new Set();
for(const entry of paintedEntries){
  const file=path.join(base,entry.img.replace('modules/gathering-crafting/',''));
  assert.ok(fs.existsSync(file),file);
  const buf=fs.readFileSync(file);
  assert.ok(buf.length>1000,'Preview art should be a nonempty valid WebP image');
  assert.equal(buf.toString('ascii',0,4),'RIFF');
  assert.equal(buf.toString('ascii',8,12),'WEBP');
  paintedHashes.add(require('node:crypto').createHash('sha256').update(buf).digest('hex'));
}
assert.equal(paintedHashes.size,10,'Every special-path Alchemy item should have its own WebP bytes');
assert.ok(cat.materials.every(m=>m.img.includes('/icons/illustrated/')||((m.id==='iron-ore'||paintedAlchemyMaterials.has(m.id))&&m.img.includes('/icons/handpainted/'))));
for(const m of cat.materials)assert.ok(fs.existsSync(path.join(base,m.img.replace('modules/gathering-crafting/',''))),m.img);
for(const r of cat.recipes)assert.ok(fs.existsSync(path.join(base,r.img.replace('modules/gathering-crafting/',''))),r.img);
const hooksOnce=new Map(),hooksOn=new Map(),world=new Map(),messages=[],packs=new Map();let roll=19,counter=0,failOutput=false,failChat=false;
const deep=o=>structuredClone(o);
const mockLegacy={collection:'legacy-content.items',getIndex:async()=>{throw Error('Forbidden: external artwork scanned');}};
const mockPotion={collection:'potion-crafting.items',getIndex:async()=>{throw Error('Forbidden: external artwork scanned');}};
class ItemDoc{
  constructor(data,parent){this.id=data._id||`item${++counter}`;this.name=data.name;this.img=data.img;this.type=data.type;this.flags=deep(data.flags||{});this.system=deep(data.system||{});this.documentName='Item';this.parent=parent;this.sheet={render(){}};}
  getFlag(ns,k){return this.flags[ns]?.[k];}
  toObject(){return{_id:this.id,name:this.name,img:this.img,type:this.type,flags:deep(this.flags),system:deep(this.system)};}
  async update(ch){for(const[k,v]of Object.entries(ch)){if(k.startsWith('system.')||k.startsWith('flags.')){const parts=k.split('.');let cur=this;for(let i=0;i<parts.length-1;i++)cur=cur[parts[i]]??={};cur[parts.at(-1)]=v;}else this[k]=v;}}
}
class Actor{
  constructor(){this.id='a1';this.name='Hero';this.type='character';this.isOwner=true;this.items=[];this.flags={};this.system={skills:{ath:{total:4},sur:{total:4},inv:{total:4},nat:{total:4}},abilities:{str:{mod:2}},attributes:{prof:2,hp:{value:12,max:20,temp:0}}};}
  getFlag(ns,k){return this.flags?.[ns]?.[k];}
  async setFlag(ns,k,v){(this.flags[ns]||={})[k]=v;}
  async createEmbeddedDocuments(kind,items){if(failOutput&&items.some(i=>i.flags?.['gathering-crafting']?.recipeId))throw Error('forced output failure');const docs=items.map(i=>new ItemDoc(i,this));this.items.push(...docs);return docs;}
  async updateEmbeddedDocuments(kind,changes){for(const c of changes){const item=this.items.find(i=>i.id===c._id);assert.ok(item);await item.update(c);}}
  async deleteEmbeddedDocuments(kind,ids){this.items=this.items.filter(i=>!ids.includes(i.id));}
  async update(change){for(const[k,v]of Object.entries(change)){if(k==='system.attributes.hp.value')this.system.attributes.hp.value=v; if(k==='system.attributes.hp.temp')this.system.attributes.hp.temp=v; if(k==='system.currency')this.system.currency=deep(v); if(k.startsWith('flags.')){const keys=k.split('.');let p=this;for(let j=0;j<keys.length-1;j++)p=p[keys[j]]??={};p[keys.at(-1)]=deep(v);}}}
}
const actor=new Actor();actor.system.currency={pp:20,gp:500,ep:0,sp:0,cp:0};actor.flags['gathering-crafting']={enchanter:{rank:1,known:['weapon-arcane-infusion'],training:null}};
actor.system.details={level:5};actor.system.abilities.int={mod:2};actor.system.abilities.wis={mod:1};actor.system.abilities.dex={mod:2};actor.system.attributes.prof=3;
actor.system.tools={mason:{value:1},herb:{value:1},leatherworker:{value:1},smith:{value:1},alchemist:{value:1}};
for(const name of ['Pickaxe',"Smith's Tools","Alchemist's Supplies",'Herbalism Kit','Skinning Knife',"Jeweler's Tools"])actor.items.push(new ItemDoc({name,type:'tool',system:{quantity:1}},actor));
const context={console,structuredClone,Math,Number,JSON,FormData,setTimeout,clearTimeout,Hooks:{once:(h,fn)=>hooksOnce.set(h,fn),on:(h,fn)=>hooksOn.set(h,fn)},
  foundry:{utils:{deepClone:deep,randomID:()=>`new${++counter}`},applications:{api:{ApplicationV2:class{constructor(){this.rendered=true;}render(){return Promise.resolve(this);}async _onRender(){}},DialogV2:{confirm:async()=>true}}},documents:{collections:{CompendiumCollection:{createCompendium:async({name,label})=>{const pack={collection:`world.${name}`,locked:false,label,items:[],async getDocuments(){return this.items;},async configure({locked}){this.locked=locked;}};packs.set(pack.collection,pack);return pack;}}}}},
  game:{system:{id:'dnd5e',version:'5.3.3'},time:{worldTime:0},user:{isGM:true,character:actor},actors:{contents:[actor]},items:{contents:[]},packs:{get:(key)=>packs.get(key),contents:[mockLegacy,mockPotion]},modules:new Map([['gathering-crafting',{}]]),
    settings:{register:(id,k,o)=>world.set(`${id}.${k}`,deep(o.default)),get:(id,k)=>world.get(`${id}.${k}`),set:async(id,k,v)=>{world.set(`${id}.${k}`,deep(v));}},keybindings:{register(){}}},
  Item:{implementation:{createDocuments:async(arr,{pack})=>{const target=packs.get(pack);const docs=arr.map(x=>new ItemDoc(x,null));target.items.push(...docs);return docs;}}},
  canvas:{tokens:{placeables:[],controlled:[]},grid:{size:100},scene:{grid:{distance:5}}},
  ui:{notifications:{info:()=>{},error:x=>{console.log('mock notification',x)}}},
  ChatMessage:{getSpeaker:()=>({alias:'Hero'}),create:async msg=>{if(failChat)throw Error('chat is offline');messages.push(msg);}},
  Roll:class{constructor(expr,vars={}){this.total=expr.startsWith('1d20')?roll+Number(vars.bonus||0):7;}async evaluate(){return this;}},
  fromUuid:async()=>null,CONST:{KEYBINDING_PRECEDENCE:{NORMAL:0}}};
vm.createContext(context);vm.runInContext(`${catalogJS}\n${itemsJS}\n${toolsJS}\n${enchRulesJS}\n${enchUIJS}\n${moduleJS}\nglobalThis.testAPI={GatheringCrafting,count,grantMaterial,consume,makeCraftData,mergeCatalog,syncCompendiums,adjustMaterialQuantity,adjustCraftedQuantity,CATALOG,artworkFor,refreshOwnedArtwork,beginEnchantment,finishEnchantment,beginLesson,finishLesson};`,context);
const {GatheringCrafting,count,grantMaterial,makeCraftData,syncCompendiums,mergeCatalog,adjustMaterialQuantity,adjustCraftedQuantity,artworkFor,refreshOwnedArtwork,beginEnchantment,finishEnchantment,beginLesson,finishLesson}=context.testAPI;
(async()=>{
  hooksOnce.get('init')();assert.equal(context.game.settings.get('gathering-crafting','database').recipes.length,122);
  await hooksOnce.get('ready')();assert.equal(packs.size,4);
  assert.equal(packs.get('world.gc-ores-metals').items.length,44);assert.equal(packs.get('world.gc-ingredients').items.length,40);assert.equal(packs.get('world.gc-monster-drops').items.length,18);assert.equal(packs.get('world.gc-ready-items').items.length,122);
  const db=context.game.settings.get('gathering-crafting','database');
  assert.equal(db.catalogVersion,10);
  assert.ok(!fs.existsSync(path.join(base,'scripts/art-sources.js')),'external art scanner must be removed');
  assert.equal(artworkFor(db.materials.find(m=>m.id==='iron-ore')),db.materials.find(m=>m.id==='iron-ore').img+'?gc-art=v1.3.0');
  assert.ok(db.materials.find(m=>m.id==='iron-ore').img.endsWith('/icons/handpainted/iron-ore.webp'));
  assert.ok(artworkFor(db.recipes.find(r=>r.id==='steel-sword')).includes('/icons/illustrated/'));
  assert.equal(artworkFor({...db.materials.find(m=>m.id==='iron-ore'),img:'user-uploads/ore.webp'}),'user-uploads/ore.webp');
  assert.equal(artworkFor(db.recipes.find(r=>r.id==='supreme-healing-potion')),
    'modules/gathering-crafting/icons/illustrated/craft-supreme-healing-potion.webp?gc-art=v1.2.0');
  await syncCompendiums();assert.equal(packs.get('world.gc-ores-metals').items.length,44,'sync must not duplicate entries');
  const oldIconItem=packs.get('world.gc-ores-metals').items.find(i=>i.getFlag('gathering-crafting','resourceId')==='iron-ore');
  oldIconItem.img='modules/legacy-content/images/iron-ore.webp';
  const customIconItem=packs.get('world.gc-ores-metals').items.find(i=>i.getFlag('gathering-crafting','resourceId')==='silver-ore');
  customIconItem.img='user-uploads/my-custom-silver.webp';
  await syncCompendiums();
  assert.ok(oldIconItem.img.includes('/icons/handpainted/'),'old external artwork must revert to bundled art');
  assert.equal(customIconItem.img,'user-uploads/my-custom-silver.webp','GM images should be preserved');
  // Upgrade existing v0.7 worlds and keep GM edits while resetting bundled icons.
  const oldWorld=structuredClone(db);
  oldWorld.catalogVersion=7;
  oldWorld.materials.find(m=>m.id==='iron-ore').img='modules/gathering-crafting/icons/v7/iron-ore.svg';
  oldWorld.materials.find(m=>m.id==='silver-ore').img='user-uploads/my-custom-silver.webp';
  oldWorld.materials.find(m=>m.id==='glowshroom').img='user-uploads/custom-glow.webp';
  oldWorld.materials.find(m=>m.id==='iron-ore').name='Iron Ore, Localized by GM';
  await context.game.settings.set('gathering-crafting','database',oldWorld);
  await hooksOnce.get('ready')();
  const migratedWorld=context.game.settings.get('gathering-crafting','database');
  assert.equal(migratedWorld.catalogVersion,10);
  assert.equal(migratedWorld.materials.find(m=>m.id==='iron-ore').name,'Iron Ore, Localized by GM');
  assert.ok(migratedWorld.materials.find(m=>m.id==='iron-ore').img.includes('/icons/handpainted/'));
  assert.equal(migratedWorld.materials.find(m=>m.id==='silver-ore').img,'user-uploads/my-custom-silver.webp');
  assert.equal(migratedWorld.materials.find(m=>m.id==='glowshroom').img,'user-uploads/custom-glow.webp');
  assert.ok(migratedWorld.materials.find(m=>m.id==='kingsfoil').img.endsWith('/icons/handpainted/alchemy/kingsfoil.webp'));
  assert.ok(migratedWorld.recipes.find(r=>r.id==='genderflux-elixir').img.endsWith('/icons/handpainted/alchemy/genderflux-elixir.webp'));
  assert.ok(migratedWorld.recipes.find(r=>r.id==='featherfall-philter').img.endsWith('/icons/handpainted/alchemy/featherfall-philter.webp'));
  assert.equal(context.game.settings.get('gathering-crafting','backup082').catalogVersion,9);
  assert.equal(context.game.settings.get('gathering-crafting','backup080').catalogVersion,7);
  const actorOld=new ItemDoc({...packs.get('world.gc-ingredients').items[0].toObject(),img:'modules/potion-crafting/images/old.webp',_id:undefined,system:{quantity:2}},actor);
  actor.items.push(actorOld);
  await refreshOwnedArtwork();
  assert.ok(actorOld.img.includes('/icons/illustrated/'),'actor items imported from external art packs should be corrected');
  assert.equal(context.game.modules.get('gathering-crafting').api.scanArtwork,undefined,'external scanner API removed');
  // Regression: "Show more" must preserve .gc-content scrollTop after a V14 render.
  const scroll = {scrollTop:385};
  const root = {addEventListener(){}};
  const app=new GatheringCrafting();
  app.element={querySelector(selector){if(selector==='.gc-content')return scroll;if(selector==='.gc-root')return root;return null;}};
  const moreBefore=app.page;
  await app.click({target:{closest(){return {dataset:{action:'more'}};}}});
  assert.equal(app.page,moreBefore+1);
  assert.equal(app.pendingScrollTop,385,'Show more must preserve the inner scrolling panel, not the hidden window-content');
  scroll.scrollTop=0; // Simulate Foundry replacing the application HTML.
  await app._onRender({},{});
  assert.equal(scroll.scrollTop,385,'Scroll must be restored after rerender');
  assert.equal(app.pendingScrollTop,null,'Scroll restore should happen only once');
  app.tab='alchemy';assert.ok(app.template().includes('Alchemy'));assert.ok(app.template().includes('Inventory'));
  app.search='iron ingot';assert.ok(app.craftTab(db,actor,'alchemy').includes('Nothing matches the current filters'));
  assert.ok(app.craftTab(db,actor,'metallurgy').includes('Iron Ingot'));
  app.tab='blacksmithing';app.search='';assert.ok(app.template().includes('Blacksmithing'));
  app.tab='backpack';assert.ok(app.template().includes('Monster Drops'));
  app.tab='gm';assert.ok(!app.template().includes('Compendium Artwork'));assert.ok(!app.template().includes('Rescan Artwork'));app.tab='backpack';
  assert.ok(!/[А-Яа-я]/.test(app.template()),'UI should contain no Bulgarian text');
  assert.ok(app.template().includes('Unlimited'),'unlimited gather UI should appear');
  assert.ok(!app.template().includes('attempts left'),'no old daily cap label');
  assert.ok(!app.craftTab(db,actor,'alchemy').includes('Always succeeds'),'crafting must always roll');
  assert.ok(app.recipeCard(db,db.recipes.find(r=>r.id==='genderflux-elixir'),actor).includes('Genderflux Elixir'));
  await app.gather('node-iron-ore');assert.equal(actor.getFlag('gathering-crafting','attempts'),undefined,'no more gather attempt cap');assert.ok(count(actor,'iron-ore')>0);
  await grantMaterial(actor,db.materials.find(m=>m.id==='coal'),8);
  await grantMaterial(actor,db.materials.find(m=>m.id==='iron-ore'),12);
  const before=count(actor,'iron-ore');await app.craft('iron-ingot');assert.equal(count(actor,'iron-ore'),before-3);assert.equal(count(actor,'iron-ingot'),1);
  await grantMaterial(actor,db.materials.find(m=>m.id==='iron-ingot'),4);
  const beforeCoal=count(actor,'coal');await app.craft('steel-ingot');assert.equal(count(actor,'coal'),beforeCoal-2);assert.equal(count(actor,'steel-ingot'),1);
  // imported compendium item as ingredient / new monster drops and special potion
  const redroot=packs.get('world.gc-ingredients').items.find(i=>i.getFlag('gathering-crafting','resourceId')==='redroot');
  actor.items.push(new ItemDoc({...redroot.toObject(),_id:undefined,system:{...redroot.system,quantity:3}},actor));
  await grantMaterial(actor,db.materials.find(m=>m.id==='sunpetal'),3);
  await app.craft('healing-potion');
  const potion=actor.items.find(i=>i.getFlag('gathering-crafting','recipeId')==='healing-potion');assert.ok(potion);assert.equal(potion.type,'consumable');
  assert.equal(makeCraftData(db.recipes.find(r=>r.id==='steel-spear')).type,'weapon');
  assert.equal(makeCraftData(db.recipes.find(r=>r.id==='dusksteel-buckler')).type,'equipment');
  assert.equal(makeCraftData(db.recipes.find(r=>r.id==='healing-potion')).system.activities.use.type,'heal');
  await app.drink(potion.id);assert.equal(actor.system.attributes.hp.value,19);assert.ok(!actor.items.includes(potion),'single potion should be consumed');
  // inventory quick add / remove for materials and crafted items
  await adjustMaterialQuantity(actor,'kingsfoil',2);assert.equal(count(actor,'kingsfoil'),2);await adjustMaterialQuantity(actor,'kingsfoil',-1);assert.equal(count(actor,'kingsfoil'),1);
  await adjustCraftedQuantity(actor,'iron-ingot',1);assert.equal(count(actor,'iron-ingot'),4);await adjustCraftedQuantity(actor,'iron-ingot',-2);assert.equal(count(actor,'iron-ingot'),2);
  // monster-drop craft recipe with utility effect note
  await grantMaterial(actor,db.materials.find(m=>m.id==='griffon-feather'),1);
  await grantMaterial(actor,db.materials.find(m=>m.id==='skyblossom'),1);
  await app.craft('featherfall-philter');
  const ff=actor.items.find(i=>i.getFlag('gathering-crafting','recipeId')==='featherfall-philter');assert.ok(ff);
  await app.drink(ff.id);assert.ok(messages.some(m=>String(m.content).includes('Featherfall Philter')));
  failOutput=true;const beforeR=count(actor,'redroot'),beforeS=count(actor,'sunpetal');await assert.rejects(()=>app.craft('healing-potion'));assert.equal(count(actor,'redroot'),beforeR);assert.equal(count(actor,'sunpetal'),beforeS);failOutput=false;
  app.craftMode='inspired';roll=1;const preFailed=count(actor,'iron-ingot');await app.craft('iron-ingot');assert.equal(count(actor,'iron-ingot'),preFailed,'failed roll never produces an item');roll=19;
  app.craftMode='steady';failChat=true;await app.craft('iron-ingot');failChat=false;
  const old={settings:{dailyLimit:4},materials:[{id:'player-herb',name:'Custom Herb',group:'Alchemical Ingredient'}],nodes:[],recipes:[{id:'player-tonic',name:'Player Tonic',category:'alchemy',ingredients:[{id:'player-herb',qty:1}]}]};
  const migrated=mergeCatalog(old);assert.equal(migrated.settings.dailyLimit,4);assert.ok(migrated.recipes.some(r=>r.id==='player-tonic'));assert.ok(migrated.materials.some(m=>m.id==='player-herb'));
  const gmEdit={catalogVersion:4,settings:{dailyLimit:5},materials:[{...db.materials.find(m=>m.id==='iron-ore'),name:'GM Custom Iron'}],nodes:[],recipes:[]};
  assert.equal(mergeCatalog(gmEdit).materials.find(m=>m.id==='iron-ore').name,'GM Custom Iron','upgrade must preserve edits to bundled entries');
  db.settings.sceneOnly=true;await context.game.settings.set('gathering-crafting','database',db);
  await assert.rejects(()=>app.gather('node-iron-ore'),/Move your character/);
  app.tab='blacksmithing';app.page=1;app.search='';
  const preview=app.template().replaceAll('modules/gathering-crafting/',`file://${base}/`);
  const css=fs.readFileSync(path.join(base,'styles/module.css'),'utf8');
  fs.writeFileSync(path.join(require('node:os').tmpdir(),'gc-v100-preview.html'),`<!DOCTYPE html><html lang="en"><meta charset="utf-8"><style>body{background:#101620;font-family:Arial;padding:30px}.gathering-crafting{width:1000px;height:740px;margin:auto;overflow:hidden;border-radius:13px}.gathering-crafting .window-content{height:100%}${css}</style><div class="gathering-crafting"><div class="window-content"><div class="gc-root">${preview}</div></div></div></html>`);
  // v1.2.0 Enchanting regression: full UI, payment, world-time job, native +1.
  app.tab='enchanting';app.search='';
  const enchantedWeapon=new ItemDoc({name:'Enchanted Test Sword',type:'weapon',system:{quantity:1,description:{value:'Existing description'},rarity:'uncommon',properties:[],magicalBonus:0}},actor);
  actor.items.push(enchantedWeapon);app.enchantItemId=enchantedWeapon.id;
  assert.ok(app.template().includes('Enchanting'));
  assert.ok(app.template().includes('Spell Channel'));
  const oldGold=context.game.user.character.system.currency.pp*10+context.game.user.character.system.currency.gp;
  await beginEnchantment(app,'weapon-arcane-infusion',{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantmentPending')?.id,'weapon-arcane-infusion');
  assert.equal(context.game.user.character.system.currency.pp*10+context.game.user.character.system.currency.gp,oldGold-250);
  assert.ok(app.template().includes('in progress'));
  await assert.rejects(()=>finishEnchantment(app,enchantedWeapon.id,{actor,announce:async()=>{},notify:()=>{}}));
  context.game.time.worldTime=5*86400;
  await finishEnchantment(app,enchantedWeapon.id,{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantmentPending'),null);
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantments').length,1);
  assert.equal(enchantedWeapon.system.magicalBonus,1);
  assert.ok(enchantedWeapon.system.properties.includes('mgc'));
  assert.ok(enchantedWeapon.system.description.value.includes('Existing description'));
  assert.ok(enchantedWeapon.system.description.value.includes('Arcane Infusion'));
  // Profession training must consume world time, gold and Arcana success.
  actor.flags['gathering-crafting'].enchanter={rank:0,known:[],training:null};
  await beginLesson(actor,'rank',null,()=>{});
  assert.equal(actor.getFlag('gathering-crafting','enchanter').rank,0);
  await assert.rejects(()=>finishLesson(actor,()=>{},async()=>{}));
  context.game.time.worldTime+=3*86400;
  await finishLesson(actor,()=>{},async()=>{});
  assert.equal(actor.getFlag('gathering-crafting','enchanter').rank,1);
  await beginLesson(actor,'enchant','weapon-spell-channel',()=>{});
  context.game.time.worldTime+=2*86400;
  await finishLesson(actor,()=>{},async()=>{});
  assert.ok(actor.getFlag('gathering-crafting','enchanter').known.includes('weapon-spell-channel'));
  console.log('PASS: v1.1.0 224 selected, separate WebP item icons, verified art paths, no external artwork scans, split professions, safe image migration, inventory, potion use, Show more scroll, rollback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
