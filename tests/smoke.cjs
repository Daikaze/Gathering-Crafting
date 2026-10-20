/* Lightweight non-Foundry smoke tests. Run: node tests/smoke.cjs */
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname,'../scripts/main.js'),'utf8');
const hookOnce=new Map(), hookOn=new Map(), world=new Map(), messages=[];
let rollResult=18,failChat=false,failOutput=false,failDelete=false;
let counter=0;
class Item {
  constructor(data,parent) {this.id=`item${++counter}`;this.name=data.name;this.type=data.type;this.img=data.img;this.flags=structuredClone(data.flags||{});this.system=structuredClone(data.system||{});this.parent=parent;}
  getFlag(module,key) {return this.flags?.[module]?.[key];}
  toObject(){return {_id:this.id,name:this.name,type:this.type,img:this.img,system:structuredClone(this.system),flags:structuredClone(this.flags)};}
  async update(update) {for(const [key,val] of Object.entries(update)){if(key==='system.quantity') this.system.quantity=val; else if(key==='name')this.name=val;}}
}
class Actor {
  constructor(id,type='character') {this.id=id;this.name='Tester';this.type=type;this.isOwner=true;this.items=[];this.flags={};this.system={skills:{ath:{total:3},sur:{total:5},inv:{total:2}},attributes:{prof:2}};}
  getFlag(module,key) {return this.flags?.[module]?.[key];}
  async setFlag(module,key,value){(this.flags[module] ||= {})[key]=value;}
  async createEmbeddedDocuments(type,arr) {if(failOutput && arr.some(x=>x.flags?.['gathering-crafting']?.recipeId)){throw new Error('forced creation error');}const added=arr.map(v=>new Item(v,this));this.items.push(...added);return added;}
  async updateEmbeddedDocuments(type,changes){for(const c of changes){const item=this.items.find(i=>i.id===c._id);if(!item)throw new Error('missing item');await item.update(c);}}
  async deleteEmbeddedDocuments(type,ids){if(failDelete)throw new Error("forced deletion error");this.items=this.items.filter(i=>!ids.includes(i.id));}
}
const actor=new Actor('char1');
const context={
  console, structuredClone,Math,Number,JSON,FormData,
  Hooks:{once:(name,fn)=>hookOnce.set(name,fn),on:(name,fn)=>hookOn.set(name,fn)},
  foundry:{utils:{deepClone:structuredClone,randomID:()=>`new${++counter}`},applications:{api:{ApplicationV2:class {constructor() {this.rendered=true;}render(){this.rendered=true;return Promise.resolve(this);}async _onRender(){}},DialogV2:{confirm:async()=>true}}}},
  game:{system:{id:'dnd5e',version:'5.3.3'},user:{isGM:true,character:actor},actors:{contents:[actor]},items:{contents:[]},modules:new Map([['gathering-crafting',{}]]),settings:{register:(id,key,opt)=>world.set(`${id}.${key}`,structuredClone(opt.default)),get:(id,key)=>world.get(`${id}.${key}`),set:async(id,key,val)=>world.set(`${id}.${key}`,val)},keybindings:{register(){}}},
  ui:{notifications:{info:()=>{},error:(msg)=>{console.warn('notification',msg)}}},
  canvas:{tokens:{controlled:[]}},CONST:{KEYBINDING_PRECEDENCE:{NORMAL:0}},
  ChatMessage:{getSpeaker:()=>({alias:'Tester'}),create:async(data)=>{if(failChat)throw new Error('forced chat error');messages.push(data);}},
  Roll:class {constructor(expr,vals){this.total=rollResult + Number(vals.bonus||0);} async evaluate(){return this;}},
  fromUuid:async(uuid)=>context.game.items.contents.find(i=>i.uuid===uuid)||null
};
vm.createContext(context);
vm.runInContext(`${script}\n;globalThis.__test={GatheringCrafting,resource,materialCount,grantMaterial,consumeMaterials,requirements,DEMO};`,context);
const {GatheringCrafting,materialCount,DEMO,grantMaterial} = context.__test;
(async()=>{
  hookOnce.get('init')();hookOnce.get('ready')();
  const app=new GatheringCrafting();
  assert.equal(app.actor.id, actor.id);
  assert.equal(app.template().includes('Gathering'),true);
  assert.equal(DEMO.materials.length,8);
  assert.equal(DEMO.nodes.length,5);
  assert.equal(DEMO.recipes.length,6);
  let db=context.game.settings.get('gathering-crafting','database');
  await app.gather('old-mine');
  assert.equal(actor.getFlag('gathering-crafting','attempts'),1);
  assert.equal(materialCount(actor,'iron-ore')>=1,true);
  rollResult=1;await app.gather('old-mine');
  assert.equal(actor.getFlag('gathering-crafting','attempts'),2);
  for (let i=0;i<5;i++) await grantMaterial(actor,db.materials.find(x=>x.id==='iron-ore'),3);
  const before=materialCount(actor,'iron-ore');
  app.craftMode='steady'; await app.craft('iron-ingot');
  assert.equal(materialCount(actor,'iron-ore'),before-3);
  assert.equal(actor.items.some(x=>x.getFlag('gathering-crafting','recipeId')==='iron-ingot'),true);
  failChat=true;
  const beforeChat=materialCount(actor,'iron-ore');
  await app.craft('iron-ingot');
  assert.equal(materialCount(actor,'iron-ore'),beforeChat-3,'Chat failure should not give free materials');
  failChat=false;
  failOutput=true;
  // output exists so craft updates existing; force throw by making a new recipe type
  const beforeOutput=materialCount(actor,'iron-ore');
  try {await app.craft('iron-ingot');}catch{}
  // Existing output stacks; ensure still spends material with no fail forced
  assert.equal(materialCount(actor,'iron-ore'),beforeOutput-3);
  failOutput=false;
  // Inspired: spends an extra ore, success doubles the output.
  await grantMaterial(actor,db.materials.find(x=>x.id==='iron-ore'),12);
  app.craftMode='inspired';
  rollResult=20;
  const preInspired=materialCount(actor,'iron-ore');
  const product=actor.items.find(x=>x.getFlag('gathering-crafting','recipeId')==='iron-ingot');
  const productCount=product.system.quantity;
  await app.craft('iron-ingot');
  assert.equal(materialCount(actor,'iron-ore'),preInspired-4);
  assert.equal(product.system.quantity,productCount+2);
  rollResult=1;
  const preFailInspired=materialCount(actor,'iron-ore');
  const productBefore=product.system.quantity;
  await app.craft('iron-ingot');
  assert.equal(materialCount(actor,'iron-ore'),preFailInspired-4);
  assert.equal(product.system.quantity,productBefore+1);
  // Simulate an output creation failure and verify all ingredients are refunded.
  await grantMaterial(actor,db.materials.find(x=>x.id==='herbs'),5);
  await grantMaterial(actor,db.materials.find(x=>x.id==='wild-flower'),1);
  app.craftMode='steady';
  const beforeHerbs=materialCount(actor,'herbs');
  const beforeFlowers=materialCount(actor,'wild-flower');
  failOutput=true;
  await assert.rejects(()=>app.craft('healing-salve'));
  assert.equal(materialCount(actor,'herbs'),beforeHerbs);
  assert.equal(materialCount(actor,'wild-flower'),beforeFlowers);
  failOutput=false;
  // Partial inventory write failure must revert other stack updates.
  failDelete=true;
  await assert.rejects(()=>app.craft('healing-salve'));
  assert.equal(materialCount(actor,'herbs'),beforeHerbs);
  assert.equal(materialCount(actor,'wild-flower'),beforeFlowers);
  failDelete=false;
  const invBefore=materialCount(actor,'herbs');
  await app.resetAttempts();
  assert.equal(actor.getFlag('gathering-crafting','attempts'),0);
  // Player cannot change GM settings through the instance.
  context.game.user.isGM=false;
  const origLimit=context.game.settings.get('gathering-crafting','database').settings.dailyLimit;
  await app.setLimit();
  assert.equal(context.game.settings.get('gathering-crafting','database').settings.dailyLimit,origLimit);
  app.tab='craft';app.craftMode='inspired';
  assert.equal(app.template().includes('Майсторски'),true);
  assert.equal(materialCount(actor,'herbs'),invBefore);
  const css=fs.readFileSync(path.join(__dirname,'../styles/module.css'),'utf8');
  fs.writeFileSync('/mnt/data/gc-ui-preview.html',`<!doctype html><html><head><meta charset="utf-8"><style>body{background:#192028;padding:50px;font-family:Inter,Arial,sans-serif;} .gathering-crafting{width:940px;height:700px;margin:auto;border-radius:12px;overflow:hidden;box-shadow:0 25px 50px #0007;} .gathering-crafting .window-content{height:100%;} ${css}</style></head><body><div class="gathering-crafting"><div class="window-content"><div class="gc-root">${new GatheringCrafting().template()}</div></div></div></body></html>`);
  console.log('PASS: manifest hooks, default database, HTML rendering, gathering, attempt usage, inventory items, crafting, inspired success/failure, output rollback, partial consume rollback, chat-error isolation, GM check and reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
