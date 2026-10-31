/* Lightweight Foundry V14/dnd5e 6.0.6 mock regression tests: node tests/smoke.cjs */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
const catalogJS=fs.readFileSync(path.join(base,'scripts/catalog.js'),'utf8').replace('export const CATALOG','const CATALOG');
const itemsJS=fs.readFileSync(path.join(base,'scripts/items.js'),'utf8').replaceAll(/^export /gm,'');
const toolsJS=fs.readFileSync(path.join(base,'scripts/tool-rules.mjs'),'utf8').replaceAll(/^export /gm,'');
const enchRulesJS=fs.readFileSync(path.join(base,'scripts/enchanting.mjs'),'utf8').replace(/^import .*;$/gm,'').replaceAll(/^export /gm,'');
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
const hooksOnce=new Map(),hooksOn=new Map(),world=new Map(),messages=[],packs=new Map(),rollHistory=[];let roll=19,counter=0,failOutput=false,failChat=false;
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
  game:{system:{id:'dnd5e',version:'6.0.6'},time:{worldTime:0},user:{isGM:true,character:actor},actors:{contents:[actor]},items:{contents:[]},packs:{get:(key)=>packs.get(key),contents:[mockLegacy,mockPotion]},modules:new Map([['gathering-crafting',{}]]),
    settings:{register:(id,k,o)=>world.set(`${id}.${k}`,deep(o.default)),get:(id,k)=>world.get(`${id}.${k}`),set:async(id,k,v)=>{world.set(`${id}.${k}`,deep(v));}},keybindings:{register(){}}},
  Item:{implementation:{createDocuments:async(arr,{pack})=>{const target=packs.get(pack);const docs=arr.map(x=>new ItemDoc(x,null));target.items.push(...docs);return docs;}}},
  canvas:{tokens:{placeables:[],controlled:[]},grid:{size:100},scene:{grid:{distance:5}}},
  ui:{notifications:{info:()=>{},error:x=>{console.log('mock notification',x)}}},
  ChatMessage:{getSpeaker:()=>({alias:'Hero'}),create:async msg=>{if(failChat)throw Error('chat is offline');messages.push(msg);}},
  Roll:class{constructor(expr,vars={}){rollHistory.push(expr);this.total=(expr.startsWith('1d20')||expr.startsWith('2d20kh'))?roll+Number(vars.bonus||0):7;}async evaluate(){return this;}},
  fromUuid:async()=>null,CONST:{KEYBINDING_PRECEDENCE:{NORMAL:0}}};
vm.createContext(context);vm.runInContext(`${catalogJS}\n${itemsJS}\n${toolsJS}\n${enchRulesJS}\n${enchUIJS}\n${moduleJS}\nglobalThis.testAPI={GatheringCrafting,count,grantMaterial,consume,makeCraftData,mergeCatalog,syncCompendiums,adjustMaterialQuantity,adjustCraftedQuantity,CATALOG,artworkFor,refreshOwnedArtwork,beginEnchantment,finishEnchantment,beginLesson,finishLesson,useEnchantment,recoverEnchantmentUses,launcher,affinityTab,placeSheetLauncher};`,context);
const {GatheringCrafting,count,grantMaterial,makeCraftData,syncCompendiums,mergeCatalog,adjustMaterialQuantity,adjustCraftedQuantity,artworkFor,refreshOwnedArtwork,beginEnchantment,finishEnchantment,beginLesson,finishLesson,useEnchantment,recoverEnchantmentUses}=context.testAPI;
(async()=>{
  hooksOnce.get('init')();assert.equal(context.game.settings.get('gathering-crafting','database').recipes.length,122);
  await hooksOnce.get('ready')();assert.equal(packs.size,4);
  assert.equal(packs.get('world.gc-ores-metals').items.length,44);assert.equal(packs.get('world.gc-ingredients').items.length,40);assert.equal(packs.get('world.gc-monster-drops').items.length,18);assert.equal(packs.get('world.gc-ready-items').items.length,122);
  const db=context.game.settings.get('gathering-crafting','database');
  assert.equal(db.catalogVersion,11);
  assert.ok(!fs.existsSync(path.join(base,'scripts/art-sources.js')),'external art scanner must be removed');
  assert.equal(artworkFor(db.materials.find(m=>m.id==='iron-ore')),db.materials.find(m=>m.id==='iron-ore').img+'?gc-art=v1.3.7');
  assert.ok(db.materials.find(m=>m.id==='iron-ore').img.endsWith('/icons/handpainted/iron-ore.webp'));
  assert.ok(artworkFor(db.recipes.find(r=>r.id==='steel-sword')).includes('/icons/illustrated/'));
  assert.equal(artworkFor({...db.materials.find(m=>m.id==='iron-ore'),img:'user-uploads/ore.webp'}),'user-uploads/ore.webp');
  assert.equal(artworkFor(db.recipes.find(r=>r.id==='supreme-healing-potion')),
    'modules/gathering-crafting/icons/illustrated/craft-supreme-healing-potion.webp?gc-art=v1.3.7');
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
  oldWorld.recipes.find(r=>r.id==='steel-helm').description='Reinforced metal helm; GM-defined armor properties.';
  oldWorld.recipes.find(r=>r.id==='silver-circlet').description='My custom silver circlet description, by the GM.';
  const legacyHelm=new ItemDoc({name:'Steel Helm',type:'loot',
    system:{quantity:1,description:{value:'<p>Reinforced metal helm; GM-defined armor properties.</p><p>Player-added lore remains.</p>'}},
    flags:{'gathering-crafting':{recipeId:'steel-helm'}}},actor);
  actor.items.push(legacyHelm);
  await context.game.settings.set('gathering-crafting','database',oldWorld);
  await hooksOnce.get('ready')();
  const migratedWorld=context.game.settings.get('gathering-crafting','database');
  assert.equal(migratedWorld.catalogVersion,11);
  assert.ok(migratedWorld.recipes.find(r=>r.id==='steel-helm').description.includes('Equippable headwear'));
  assert.equal(migratedWorld.recipes.find(r=>r.id==='silver-circlet').description,'My custom silver circlet description, by the GM.');
  assert.ok(legacyHelm.system.description.value.includes('Equippable headwear'));
  assert.ok(legacyHelm.system.description.value.includes('Player-added lore remains.'));
  assert.equal(legacyHelm.type,'loot','Never forcibly swap existing embedded Item type or destroy prior flags');
  assert.equal(context.game.settings.get('gathering-crafting','backupBlacksmith110').catalogVersion,10);
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
  const chainShirt=makeCraftData(db.recipes.find(r=>r.id==='steel-chain-shirt'));
  assert.equal(chainShirt.type,'equipment');
  assert.equal(chainShirt.system.armor.value,13);
  assert.equal(chainShirt.system.armor.dex,2);
  assert.deepEqual(Array.from(chainShirt.system.rarities),['uncommon']);
  assert.equal(chainShirt.system.weight.value,20);
  const helmData=makeCraftData(db.recipes.find(r=>r.id==='steel-helm'));
  assert.equal(helmData.type,'equipment');
  assert.equal(helmData.system.equipped,false);
  assert.ok(!helmData.system.armor,'Helms must not provide a separate AC bonus');
  assert.equal(makeCraftData(db.recipes.find(r=>r.id==='dragonsilver-charm')).type,'equipment');
  assert.equal(makeCraftData(db.recipes.find(r=>r.id==='blacksteel-armor-plates')).type,'loot');
  const nativeHelm=await actor.createEmbeddedDocuments('Item',[helmData]);
  assert.equal(nativeHelm[0].type,'equipment','Newly crafted items should be native D&D Equipment');
  assert.equal(makeCraftData(db.recipes.find(r=>r.id==='healing-potion')).system.activities.use.type,'heal');
  const nativePotion=makeCraftData(db.recipes.find(r=>r.id==='healing-potion'));
  assert.equal(nativePotion.system.uses.max,'1');
  assert.equal(nativePotion.system.uses.autoDestroy,true);
  assert.equal(nativePotion.system.activities.use.consumption.targets[0].type,'itemUses');
  const ore=makeCraftData(db.recipes.find(r=>r.id==='iron-ingot'));
  assert.equal(ore.system.weight.value,1);
  assert.equal(typeof ore.system.weight.units,'string');
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
  // Native theme is loaded on V14; the archived theme must not style other apps.
  const installedManifest=JSON.parse(fs.readFileSync(path.join(base,'module.json'),'utf8'));
  assert.deepEqual(installedManifest.styles,['styles/native-v14.css']);
  assert.equal(installedManifest.version,'1.3.8');
  assert.equal(GatheringCrafting.DEFAULT_OPTIONS.window.resizable,true);
  assert.equal(GatheringCrafting.DEFAULT_OPTIONS.window.minimizable,true);
  assert.equal(GatheringCrafting.DEFAULT_OPTIONS.window.frame,true);
  const nativeCss=fs.readFileSync(path.join(base,'styles/native-v14.css'),'utf8');
  assert.match(nativeCss,/\\.gathering-crafting \\.gc-content/);
  assert.match(nativeCss,/@container gc-workshop/);
  assert.ok(!nativeCss.includes('.window-app button'),'Only style module-owned controls');
  const css=fs.readFileSync(path.join(base,'styles/native-v14.css'),'utf8');
  fs.writeFileSync(path.join(require('node:os').tmpdir(),'gc-v100-preview.html'),`<!DOCTYPE html><html lang="en"><meta charset="utf-8"><style>body{background:#101620;font-family:Arial;padding:30px}.gathering-crafting{width:1000px;height:740px;margin:auto;overflow:hidden;border-radius:13px}.gathering-crafting .window-content{height:100%}${css}</style><div class="gathering-crafting"><div class="window-content"><div class="gc-root">${preview}</div></div></div></html>`);
  // v1.2.0 Enchanting regression: full UI, payment, world-time job, native +1.
  app.tab='enchanting';app.search='';
  const enchantedWeapon=new ItemDoc({name:'Enchanted Test Sword',type:'weapon',system:{quantity:1,description:{value:'Existing description'},rarity:'uncommon',properties:[],magicalBonus:0}},actor);
  actor.items.push(enchantedWeapon);app.enchantItemId=enchantedWeapon.id;
  assert.ok(app.template().includes('Enchanting'));
  assert.ok(app.template().includes('Spell Channel'));
  // The elemental picker is removed. Every damage type has its own sorted card.
  app.page=100;let allEnchantHtml=app.template();
  assert.ok(!allEnchantHtml.includes('name="enchantElement"'));
  assert.ok(allEnchantHtml.includes('Elemental Binding — Cold'));
  assert.ok(allEnchantHtml.includes('Greater Elemental Binding — Thunder'));
  assert.ok(allEnchantHtml.indexOf('Spell Channel</strong>')<allEnchantHtml.indexOf('Astral Sever</strong>'),'Novice enchantments must appear before Master enchantments');
  app.page=1;
  // Dropdown and search rerenders must retain the current .gc-content scrollTop.
  const scrollHost={scrollTop:460};
  const enchantRoot={addEventListener(){}};
  app.element={querySelector(sel){return sel==='.gc-content'?scrollHost:sel==='.gc-root'?enchantRoot:null;}};
  await app.change({target:{name:'enchantFilter',value:'learned'}});
  assert.equal(app.pendingScrollTop,460,'dropdown changes preserve scroll position before render');
  await app._onRender({},{});
  assert.equal(scrollHost.scrollTop,460,'dropdown preserves viewport after render');
  scrollHost.scrollTop=380;
  app.search='binding';await app.refresh();
  assert.equal(app.pendingScrollTop,380,'search rerender remembers scroll position');
  await app._onRender({},{});
  assert.equal(scrollHost.scrollTop,380);
  app.enchantFilter='all';app.search='';
  await app.refresh({resetScroll:true});await app._onRender({},{});
  assert.equal(scrollHost.scrollTop,0,'switching tabs is allowed to reset scroll');
  delete app.element;
  // The crafter pays no gold: the GP shown in Enchanting is only a market/service value.
  actor.system.currency={pp:0,gp:0,ep:0,sp:0,cp:0};
  const oldGold=JSON.stringify(actor.system.currency);
  // In v1.3.5 only the physical tool is required. Existing rank/known flags
  // and tool proficiencies no longer gate the actual enchantment.
  actor.flags['gathering-crafting'].enchanter={rank:0,known:[],training:null};
  actor.system.tools.jeweler={value:0};
  const jewel=actor.items.find(x=>x.name==="Jeweler's Tools");
  jewel.name="Jeweler’s Tools +1";
  jewel.system.type={baseItem:'jewel'};
  assert.ok(app.template().includes('Jeweler’s Tools +1'),'display the real held tool');
  assert.ok(!app.template().includes('Study formula ·'),'formula learning is optional');

  await beginEnchantment(app,'weapon-arcane-infusion',{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantmentPending')?.id,'weapon-arcane-infusion');
  assert.equal(JSON.stringify(actor.system.currency),oldGold,'Enchanting must not deduct money or require available gold');
  assert.ok(app.template().includes('in progress'));
  await assert.rejects(()=>finishEnchantment(app,enchantedWeapon.id,{actor,announce:async()=>{},notify:()=>{}}));
  context.game.time.worldTime=4*86400;
  await finishEnchantment(app,enchantedWeapon.id,{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantmentPending'),null);
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantments').length,1);
  assert.equal(enchantedWeapon.system.magicalBonus,1);
  assert.ok(enchantedWeapon.system.properties.includes('mgc'));
  assert.ok(enchantedWeapon.system.description.value.includes('Existing description'));
  assert.ok(enchantedWeapon.system.description.value.includes('Arcane Infusion'));
  assert.ok(rollHistory.includes('1d20 + @bonus'),'without proficiency the Enchanting completion check is normal');
  // Proficiency should only change the roll to advantage, never eligibility.
  const advantagedSword=new ItemDoc({name:'Advantaged Sword',type:'weapon',
    system:{quantity:1,rarity:'uncommon',type:{value:'martialM',baseItem:'longsword'},
    description:{value:'Sword'},properties:[],magicalBonus:0}},actor);
  actor.items.push(advantagedSword);
  app.enchantItemId=advantagedSword.id;actor.system.tools.jewel={value:1};
  await beginEnchantment(app,'weapon-arcane-infusion',{actor,announce:async()=>{},notify:()=>{}});
  context.game.time.worldTime+=4*86400;
  await finishEnchantment(app,advantagedSword.id,{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(rollHistory.at(-1),'2d20kh + @bonus','tool proficiency must grant Advantage on completion');
  assert.equal(advantagedSword.system.magicalBonus,1);

  // Profession training must consume world time and Arcana success, but never gold.
  actor.flags['gathering-crafting'].enchanter={rank:0,known:[],training:null};
  await beginLesson(actor,'rank',null,()=>{});
  assert.equal(actor.getFlag('gathering-crafting','enchanter').rank,0);
  await assert.rejects(()=>finishLesson(actor,()=>{},async()=>{}));
  context.game.time.worldTime+=2*86400;
  await finishLesson(actor,()=>{},async()=>{});
  assert.equal(actor.getFlag('gathering-crafting','enchanter').rank,1);
  await beginLesson(actor,'enchant','weapon-spell-channel',()=>{});
  context.game.time.worldTime+=2*86400;
  await finishLesson(actor,()=>{},async()=>{});
  assert.ok(actor.getFlag('gathering-crafting','enchanter').known.includes('weapon-spell-channel'));
  // Fixed-element crafting stores Cold without any global element picker.
  actor.flags['gathering-crafting'].enchanter={rank:2,known:['weapon-elemental-binding-cold'],training:null};
  const frostSword=new ItemDoc({name:'Frost Sword',type:'weapon',system:{quantity:1,rarity:'uncommon',
    type:{value:'martialM',baseItem:'longsword'},description:{value:'A sword.'},
    damage:{base:{bonus:'',types:['slashing']}},properties:[]}},actor);
  actor.items.push(frostSword);app.enchantItemId=frostSword.id;
  await beginEnchantment(app,'weapon-elemental-binding-cold',{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(frostSword.getFlag('gathering-crafting','enchantmentPending').element,'Cold');
  context.game.time.worldTime+=3*86400;
  await finishEnchantment(app,frostSword.id,{actor,announce:async()=>{},notify:()=>{}});
  assert.ok(frostSword.system.damage.base.bonus.includes('1d4[cold]'));
  // Already existing v1.3.1 jobs also complete using their saved selected type.
  const oldJob=new ItemDoc({name:'Legacy Thunder Sword',type:'weapon',system:{quantity:1,
    rarity:'rare',type:{value:'martialM',baseItem:'longsword'},
    description:{value:''},damage:{base:{bonus:'',types:['slashing']}},properties:[]},
    flags:{'gathering-crafting':{enchantmentPending:{id:'weapon-elemental-binding',
      element:'Thunder',finishAt:context.game.time.worldTime-1,startedAt:0,days:4,cost:300}}}},actor);
  actor.items.push(oldJob);
  await finishEnchantment(app,oldJob.id,{actor,announce:async()=>{},notify:()=>{}});
  assert.ok(oldJob.system.damage.base.bonus.includes('1d4[thunder]'));

  // v1.3.3: robe and equipment whitelist is enforced in the real start action.
  const newRobe=new ItemDoc({name:'Enchanter Robe',type:'equipment',
    system:{type:{value:'clothing',subtype:'robe'},quantity:1,rarity:'uncommon',description:{value:'Cloth robes'}}},actor);
  actor.items.push(newRobe);app.enchantItemId=newRobe.id;
  actor.flags['gathering-crafting'].enchanter={rank:2,known:['armor-mystic-stitching','armor-guardians-crest'],training:null};
  app.tab='enchanting';app.search='';app.page=100;app.enchantFilter='all';
  const robeHTML=app.template();
  assert.ok(robeHTML.includes('Enchanter Robe (Robes)'),'Robe Item must be listed and classified');
  assert.ok(robeHTML.includes('Compatible with:'),'Every enchant card must identify permitted equipment');
  assert.ok(robeHTML.includes('Only for: Shields')||robeHTML.includes('Incompatible with Robes'),'Shield enchants must not be usable on robes');
  await assert.rejects(()=>beginEnchantment(app,'armor-guardians-crest',{actor,announce:async()=>{},notify:()=>{}}),'Shield-only enchantment cannot start on a robe');
  assert.equal(newRobe.getFlag('gathering-crafting','enchantmentPending'),undefined);
  await beginEnchantment(app,'armor-mystic-stitching',{actor,announce:async()=>{},notify:()=>{}});
  assert.equal(newRobe.getFlag('gathering-crafting','enchantmentPending').id,'armor-mystic-stitching');
  context.game.time.worldTime+=3*86400;
  await finishEnchantment(app,newRobe.id,{actor,announce:async()=>{},notify:()=>{}});
  assert.ok(newRobe.getFlag('gathering-crafting','enchantments').some(x=>x.id==='armor-mystic-stitching'));
  assert.ok(newRobe.system.description.value.includes('Cloth robes'));
  const newShield=new ItemDoc({name:'Tower Shield',type:'equipment',
    system:{type:{value:'shield'},quantity:1,rarity:'uncommon',description:{value:'Shield'}}},actor);
  actor.items.push(newShield);app.enchantItemId=newShield.id;
  await assert.rejects(()=>beginEnchantment(app,'armor-mystic-stitching',{actor,announce:async()=>{},notify:()=>{}}),'Robe-only enchantment cannot start on a shield');

  assert.equal(JSON.stringify(actor.system.currency),oldGold,'Training and formula study must not deduct gold');
  // Power use is equipment-bound, once per Long Rest, and restores on native long rest.
  enchantedWeapon.system.equipped=true;
  enchantedWeapon.flags['gathering-crafting'].enchantments.push({id:'weapon-hunters-marking'});
  await useEnchantment(actor,enchantedWeapon.id,'weapon-hunters-marking',()=>{},async()=>{});
  assert.equal(enchantedWeapon.getFlag('gathering-crafting','enchantmentUses')['weapon-hunters-marking'],1);
  await assert.rejects(()=>useEnchantment(actor,enchantedWeapon.id,'weapon-hunters-marking',()=>{},async()=>{}));
  await recoverEnchantmentUses(actor,{longRest:true},{type:'long'});
  assert.equal(Object.keys(enchantedWeapon.getFlag('gathering-crafting','enchantmentUses')).length,0);
  // Regular gathering and crafting work with tools alone and get Advantage when proficient.
  const currentDb=context.game.settings.get('gathering-crafting','database');currentDb.settings.sceneOnly=false;
  const noProfTest=actor.items.find(x=>x.name==="Pickaxe");
  assert.ok(noProfTest);
  actor.system.tools.mason={value:0};
  rollHistory.length=0;
  await app.gather('node-iron-ore');
  assert.equal(rollHistory.at(-1),'1d20 + @bonus');
  actor.system.tools.mason={value:1};
  await app.gather('node-iron-ore');
  assert.equal(rollHistory.at(-1),'2d20kh + @bonus');
  // Player rendering does not show target DCs on any player-facing tab.
  context.game.user.isGM=false;
  actor.flags['gathering-crafting'].enchanter={rank:1,known:[],training:null};
  app.enchantItemId=enchantedWeapon.id;
  app.tab='enchanting';app.search='';
  let playerHTML=app.template();
  assert.ok(!/\bDC\s*[+−-]?\s*\d+/i.test(playerHTML),'player Enchanting must not display DCs');
  assert.ok(playerHTML.includes('Market value: 250 gp'),'prices remain visible as market values');
  assert.ok(!playerHTML.includes('Not enough gold'),'zero gold never locks enchantments');
  app.tab='gather';playerHTML=app.template();
  assert.ok(!/\bDC\s*[+−-]?\s*\d+/i.test(playerHTML),'player Gathering must not display DCs');
  app.tab='alchemy';playerHTML=app.template();
  assert.ok(!/\bDC\s*[+−-]?\s*\d+/i.test(playerHTML),'player Crafting must not display DCs');
  context.game.users=[{id:'gm-actor',isGM:true},{id:'player-actor',isGM:false}];
  const scenes=structuredClone(context.game.settings.get('gathering-crafting','database'));scenes.settings.sceneOnly=false;
  await context.game.settings.set('gathering-crafting','database',scenes);
  const startingMessages=messages.length;
  await app.gather('node-iron-ore');
  const fresh=messages.slice(startingMessages);
  assert.ok(fresh.some(x=>!x.whisper&&!x.content.includes(' vs DC ')),'public messages hide target DC');
  assert.ok(fresh.some(x=>x.whisper?.includes('gm-actor')&&x.content.includes(' vs DC ')),'GM whisper contains target DC');
  context.game.user.isGM=true;
  // v1.3.4: the sheet launcher is an inline item AFTER Affinity, not an extra header row.
  class FakeTabNode {
    constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.parentElement=null;this.attrs={};this.className='';this.dataset={};this.listeners={};this.isConnected=true;this.classList={
      contains:name=>this.className.split(/\s+/).includes(name),
      add:name=>{if(!this.className.split(/\s+/).includes(name))this.className=(this.className+' '+name).trim();}
    };}
    append(child){if(child.parentElement){const old=child.parentElement.children;old.splice(old.indexOf(child),1);}this.children.push(child);child.parentElement=this;return child;}
    after(child){const parent=this.parentElement;if(!parent)throw Error('no parent');if(child.parentElement){const old=child.parentElement.children;old.splice(old.indexOf(child),1);}const i=parent.children.indexOf(this);parent.children.splice(i+1,0,child);child.parentElement=parent;}
    remove(){if(!this.parentElement)return;const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}
    contains(child){return this===child||this.children.some(x=>x.contains(child));}
    get nextElementSibling(){if(!this.parentElement)return null;const l=this.parentElement.children;return l[l.indexOf(this)+1]||null;}
    setAttribute(k,v){this.attrs[k]=v;}
    getAttribute(k){return this.attrs[k]||null;}
    addEventListener(k,fn){this.listeners[k]=fn;}
    querySelector(selector){
      if(selector.includes('.sheet-header'))return this.find(n=>n.className.includes('sheet-header'));
      if(selector.includes('.directory-header'))return this.find(n=>n.className.includes('directory-header'));
      if(selector==='.gc-sheet-tab-holder')return this.find(n=>n.className.includes('gc-sheet-tab-holder'));
      if(selector==='.gc-sheet-tab')return this.find(n=>n.className.includes('gc-sheet-tab'));
      if(selector==='.gc-sheet-powers')return this.find(n=>n.className.includes('gc-sheet-powers'));
      if(selector==='.gc-launcher')return this.find(n=>n.className.includes('gc-launcher'));
      return null;
    }
    querySelectorAll(selector){
      if(selector==='.gc-launcher:not(.gc-sheet-tab)')return this.list().filter(n=>n.className.split(/\s+/).includes('gc-launcher')&&!n.className.split(/\s+/).includes('gc-sheet-tab'));
      if(selector.includes('nav')||selector.includes('tabs')||selector.includes('role="tab"'))return this.list().filter(n=>n.dataset.tab==='affinity');
      return [];
    }
    list(){return this.children.flatMap(n=>[n,...n.list()]);}
    find(predicate){return this.list().find(predicate)||null;}
  }
  context.HTMLElement=FakeTabNode;
  context.document={createElement:tag=>new FakeTabNode(tag)};
  const sheetRoot=new FakeTabNode('div');
  const sheetHeader=new FakeTabNode('header');sheetHeader.className='sheet-header';sheetRoot.append(sheetHeader);
  const nav=new FakeTabNode('nav');nav.className='tabs';sheetRoot.append(nav);
  const affinity=new FakeTabNode('a','Affinity');affinity.dataset.tab='affinity';nav.append(affinity);
  const {launcher}=context.testAPI;
  launcher(sheetRoot,'.sheet-header',actor);
  assert.equal(nav.children.length,2,'one inline launcher must follow Affinity');
  assert.equal(nav.children[0],affinity);
  assert.ok(nav.children[1].className.includes('gc-sheet-tab'));
  assert.ok(!sheetHeader.querySelector('.gc-launcher'),'old full-width header launcher must not exist');
  launcher(sheetRoot,'.sheet-header',actor);
  assert.equal(nav.children.length,2,'repeat sheet render must not duplicate Crafting nav button');
  assert.ok(!sheetHeader.querySelector('.gc-launcher'));
  assert.ok(sheetHeader.querySelector('.gc-sheet-powers'),'existing power controls stay in the header');
  let prevented=false,stopped=false;
  nav.children[1].listeners.click({preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.ok(prevented&&stopped,'opening crafting must not trigger the Affinity tab');
  const fallbackRoot=new FakeTabNode('div'),fallbackHeader=new FakeTabNode('header');
  fallbackHeader.className='sheet-header';fallbackRoot.append(fallbackHeader);
  launcher(fallbackRoot,'.sheet-header',actor);
  assert.ok(fallbackHeader.querySelector('.gc-launcher'),'NPC sheets without Affinity retain a header launcher');
  console.log('PASS: v1.3.7 56 Blacksmith descriptions, native gear, safe migration and legacy checks;  separate WebP item icons, verified art paths, no external artwork scans, split professions, safe image migration, inventory, potion use, Show more scroll, rollback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
