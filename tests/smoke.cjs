/* Lightweight Foundry V14/dnd5e 5.3.3 mock regression tests: node tests/smoke.cjs */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
const catalogJS=fs.readFileSync(path.join(base,'scripts/catalog.js'),'utf8').replace('export const CATALOG','const CATALOG');
const itemsJS=fs.readFileSync(path.join(base,'scripts/items.js'),'utf8').replaceAll(/^export /gm,'');
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
assert.ok(cat.recipes.every(r=>r.img.includes('/icons/')));
assert.ok(cat.materials.every(m=>m.img.includes('/icons/')));
for(const m of cat.materials)assert.ok(fs.existsSync(path.join(base,m.img.replace('modules/gathering-crafting/',''))),m.img);
for(const r of cat.recipes)assert.ok(fs.existsSync(path.join(base,r.img.replace('modules/gathering-crafting/',''))),r.img);
const hooksOnce=new Map(),hooksOn=new Map(),world=new Map(),messages=[],packs=new Map();let roll=19,counter=0,failOutput=false,failChat=false;
const deep=o=>structuredClone(o);
class ItemDoc{
  constructor(data,parent){this.id=data._id||`item${++counter}`;this.name=data.name;this.img=data.img;this.type=data.type;this.flags=deep(data.flags||{});this.system=deep(data.system||{});this.documentName='Item';this.parent=parent;this.sheet={render(){}};}
  getFlag(ns,k){return this.flags[ns]?.[k];}
  toObject(){return{_id:this.id,name:this.name,img:this.img,type:this.type,flags:deep(this.flags),system:deep(this.system)};}
  async update(ch){for(const[k,v]of Object.entries(ch)){if(k==='system.quantity')this.system.quantity=v;else if(k==='system.attributes.hp.temp')this.system.attributes??={},this.system.attributes.hp??={},this.system.attributes.hp.temp=v;else if(k.startsWith('system.'))this.system[k.slice(7)]=v;else this[k]=v;}}
}
class Actor{
  constructor(){this.id='a1';this.name='Hero';this.type='character';this.isOwner=true;this.items=[];this.flags={};this.system={skills:{ath:{total:4},sur:{total:4},inv:{total:4},nat:{total:4}},abilities:{str:{mod:2}},attributes:{prof:2,hp:{value:12,max:20,temp:0}}};}
  getFlag(ns,k){return this.flags?.[ns]?.[k];}
  async setFlag(ns,k,v){(this.flags[ns]||={})[k]=v;}
  async createEmbeddedDocuments(kind,items){if(failOutput&&items.some(i=>i.flags?.['gathering-crafting']?.recipeId))throw Error('forced output failure');const docs=items.map(i=>new ItemDoc(i,this));this.items.push(...docs);return docs;}
  async updateEmbeddedDocuments(kind,changes){for(const c of changes){const item=this.items.find(i=>i.id===c._id);assert.ok(item);await item.update(c);}}
  async deleteEmbeddedDocuments(kind,ids){this.items=this.items.filter(i=>!ids.includes(i.id));}
  async update(change){for(const[k,v]of Object.entries(change)){if(k==='system.attributes.hp.value')this.system.attributes.hp.value=v; if(k==='system.attributes.hp.temp')this.system.attributes.hp.temp=v;}}
}
const actor=new Actor();
const context={console,structuredClone,Math,Number,JSON,FormData,setTimeout,clearTimeout,Hooks:{once:(h,fn)=>hooksOnce.set(h,fn),on:(h,fn)=>hooksOn.set(h,fn)},
  foundry:{utils:{deepClone:deep,randomID:()=>`new${++counter}`},applications:{api:{ApplicationV2:class{constructor(){this.rendered=true;}render(){return Promise.resolve(this);}async _onRender(){}},DialogV2:{confirm:async()=>true}}},documents:{collections:{CompendiumCollection:{createCompendium:async({name,label})=>{const pack={collection:`world.${name}`,locked:false,label,items:[],async getDocuments(){return this.items;},async configure({locked}){this.locked=locked;}};packs.set(pack.collection,pack);return pack;}}}}},
  game:{system:{id:'dnd5e',version:'5.3.3'},user:{isGM:true,character:actor},actors:{contents:[actor]},items:{contents:[]},packs:{get:(key)=>packs.get(key)},modules:new Map([['gathering-crafting',{}]]),
    settings:{register:(id,k,o)=>world.set(`${id}.${k}`,deep(o.default)),get:(id,k)=>world.get(`${id}.${k}`),set:async(id,k,v)=>{world.set(`${id}.${k}`,deep(v));}},keybindings:{register(){}}},
  Item:{implementation:{createDocuments:async(arr,{pack})=>{const target=packs.get(pack);const docs=arr.map(x=>new ItemDoc(x,null));target.items.push(...docs);return docs;}}},
  canvas:{tokens:{placeables:[],controlled:[]},grid:{size:100},scene:{grid:{distance:5}}},
  ui:{notifications:{info:()=>{},error:x=>{console.log('mock notification',x)}}},
  ChatMessage:{getSpeaker:()=>({alias:'Hero'}),create:async msg=>{if(failChat)throw Error('chat is offline');messages.push(msg);}},
  Roll:class{constructor(expr,vars={}){this.total=expr.startsWith('1d20')?roll+Number(vars.bonus||0):7;}async evaluate(){return this;}},
  fromUuid:async()=>null,CONST:{KEYBINDING_PRECEDENCE:{NORMAL:0}}};
vm.createContext(context);vm.runInContext(`${catalogJS}\n${itemsJS}\n${moduleJS}\nglobalThis.testAPI={GatheringCrafting,count,grantMaterial,consume,makeCraftData,mergeCatalog,syncCompendiums,adjustMaterialQuantity,adjustCraftedQuantity,CATALOG};`,context);
const {GatheringCrafting,count,grantMaterial,makeCraftData,syncCompendiums,mergeCatalog,adjustMaterialQuantity,adjustCraftedQuantity}=context.testAPI;
(async()=>{
  hooksOnce.get('init')();assert.equal(context.game.settings.get('gathering-crafting','database').recipes.length,122);
  await hooksOnce.get('ready')();assert.equal(packs.size,4);
  assert.equal(packs.get('world.gc-ores-metals').items.length,44);assert.equal(packs.get('world.gc-ingredients').items.length,40);assert.equal(packs.get('world.gc-monster-drops').items.length,18);assert.equal(packs.get('world.gc-ready-items').items.length,122);
  const db=context.game.settings.get('gathering-crafting','database');
  assert.equal(db.catalogVersion,4);
  await syncCompendiums();assert.equal(packs.get('world.gc-ores-metals').items.length,44,'sync must not duplicate entries');
  const app=new GatheringCrafting();app.tab='craft';assert.ok(app.template().includes('Metallurgy'));assert.ok(app.template().includes('Inventory'));app.tab='backpack';assert.ok(app.template().includes('Monster Drops'));
  assert.ok(!/[А-Яа-я]/.test(app.template()),'UI should contain no Bulgarian text');
  assert.ok(app.recipeCard(db,db.recipes.find(r=>r.id==='genderflux-elixir'),actor).includes('Genderflux Elixir'));
  await app.gather('node-iron-ore');assert.equal(actor.getFlag('gathering-crafting','attempts'),1);assert.ok(count(actor,'iron-ore')>0);
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
  app.craftMode='inspired';roll=1;await app.craft('iron-ingot');assert.ok(count(actor,'iron-ingot')>=1);
  app.craftMode='steady';failChat=true;await app.craft('iron-ingot');failChat=false;
  // Regression: updating an existing v0.3 world appends missing v0.4 defaults,
  // preserving GM edits and inventory without duplicating old entries.
  const legacyCatalog=deep(db);
  legacyCatalog.catalogVersion=3;
  legacyCatalog.materials=legacyCatalog.materials.filter(m=>m.id!=='wolf-fang');
  legacyCatalog.nodes=legacyCatalog.nodes.filter(n=>n.id!=='wolf-carcass');
  legacyCatalog.recipes=legacyCatalog.recipes.filter(r=>r.id!=='genderflux-elixir');
  legacyCatalog.materials.find(m=>m.id==='redroot').description='GM custom description';
  await context.game.settings.set('gathering-crafting','database',legacyCatalog);
  await context.game.settings.set('gathering-crafting','compendiumBootstrapped040',false);
  const priorInv=count(actor,'redroot');
  await hooksOnce.get('ready')();
  const upgradedDb=context.game.settings.get('gathering-crafting','database');
  assert.equal(upgradedDb.catalogVersion,4);
  assert.equal(upgradedDb.materials.length,102);
  assert.equal(upgradedDb.recipes.length,122);
  assert.equal(upgradedDb.nodes.length,71);
  assert.equal(upgradedDb.materials.find(m=>m.id==='redroot').description,'GM custom description');
  assert.equal(count(actor,'redroot'),priorInv);
  assert.equal(packs.get('world.gc-monster-drops').items.length,18);
  assert.ok(context.game.settings.get('gathering-crafting','compendiumBootstrapped040'));
  const old={settings:{dailyLimit:4},materials:[{id:'player-herb',name:'Custom Herb',group:'Alchemical Ingredient'}],nodes:[],recipes:[{id:'player-tonic',name:'Player Tonic',category:'alchemy',ingredients:[{id:'player-herb',qty:1}]}]};
  const migrated=mergeCatalog(old);assert.equal(migrated.settings.dailyLimit,4);assert.ok(migrated.recipes.some(r=>r.id==='player-tonic'));assert.ok(migrated.materials.some(m=>m.id==='player-herb'));
  db.settings.sceneOnly=true;await context.game.settings.set('gathering-crafting','database',db);
  await assert.rejects(()=>app.gather('node-iron-ore'),/Move your character/);
  app.tab='craft';app.category='all';app.page=1;app.search='';
  const preview=app.template().replaceAll('modules/gathering-crafting/','file:///mnt/data/gc-v040-publish/');
  const css=fs.readFileSync(path.join(base,'styles/module.css'),'utf8');
  fs.writeFileSync('/mnt/data/gc-v040-publish-preview.html',`<!DOCTYPE html><html lang="en"><meta charset="utf-8"><style>body{background:#101620;font-family:Arial;padding:30px}.gathering-crafting{width:1000px;height:740px;margin:auto;overflow:hidden;border-radius:13px}.gathering-crafting .window-content{height:100%}${css}</style><div class="gathering-crafting"><div class="window-content"><div class="gc-root">${preview}</div></div></div></html>`);
  console.log('PASS: v0.4.0 102 materials / 122 recipes / 71 nodes, 4 World Compendiums, inventory add/remove, monster drops, special brews, native Items, rollback and scene gating.');
})().catch(e=>{console.error(e);process.exitCode=1;});
