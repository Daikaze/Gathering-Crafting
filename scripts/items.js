/** Native dnd5e Item payloads for Foundry 14 / dnd5e 5.3.x.
 * The optional activity data is only convenience; crafted consumables can also be used
 * with the module's reliable Use button, which manages stacks and recovery itself.
 */
const NS='gathering-crafting';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const positive=(n,fall=1)=>Number.isFinite(+n)&&+n>0?Math.min(999,Math.trunc(+n)):fall;
const weaponSpecs={
 'iron-dagger':{base:'dagger',type:'simpleM',dice:4,damage:'piercing',properties:['fin','lgt','thr'],weight:1,value:2,range:[20,60]},
 'steel-dagger':{base:'dagger',type:'simpleM',dice:4,damage:'piercing',properties:['fin','lgt','thr'],weight:1,value:4,range:[20,60]},
 'steel-sword':{base:'longsword',type:'martialM',dice:8,damage:'slashing',properties:['ver'],weight:3,value:20},
 'silvered-blade':{base:'longsword',type:'martialM',dice:8,damage:'slashing',properties:['ver'],weight:3,value:120},
 'mithral-blade':{base:'scimitar',type:'martialM',dice:6,damage:'slashing',properties:['fin','lgt'],weight:2,value:225},
 'adamantine-blade':{base:'longsword',type:'martialM',dice:8,damage:'slashing',properties:['ver'],weight:3,value:450}
};
const shields={'steel-shield':{value:2,weight:6,price:15},'adamantine-shield':{value:2,weight:6,price:300}};
export function outputKind(recipe){
 if(recipe.category==='alchemy')return 'consumable';
 if(weaponSpecs[recipe.id])return 'weapon';
 if(shields[recipe.id])return 'equipment';
 return 'loot';
}
function damage(number,denomination,types,bonus=''){
 return {number,denomination,bonus,types:Array.isArray(types)?types:[types],custom:{enabled:false,formula:''},scaling:{mode:'',number:null,formula:''}};
}
function healActivity(formula){
 const found=/^(\d+)d(\d+)(?:\+(\d+))?$/.exec(formula||'');
 if(!found)return null;
 return {type:'heal',name:'Drink Potion',activation:{type:'bonus',value:1,condition:''},
  healing:damage(+found[1],+found[2],['healing'],found[3]||''),
  consumption:{targets:[{type:'item',target:'',value:'1',scaling:{mode:'',formula:''}}]},
  target:{template:{count:'',units:'ft',type:''},affects:{count:'1',type:'creature',choice:false,special:''},prompt:false},
  range:{value:null,units:'self',special:''}};
}
function physicalActivity(r){
 return {type:'attack',name:'Attack',activation:{type:'action',value:1,condition:''},
  attack:{ability:'',bonus:'',flat:false,type:{value:'melee',classification:'weapon'}},
  damage:{includeBase:true,parts:[]},
  ...(r.range?{range:{value:r.range[0],long:r.range[1],units:'ft'}}:{})};
}
function utilityActivity(){
 return {type:'utility',name:'Use Item',activation:{type:'action',value:1,condition:''},
  consumption:{targets:[{type:'item',target:'',value:'1',scaling:{mode:'',formula:''}}]}};
}
export function makeMaterialData(mat,qty=1){
 return {name:mat.name,type:'loot',img:mat.img||'icons/svg/item-bag.svg',
  system:{quantity:positive(qty),weight:0.1,price:{value:Math.max(1,Math.round(Math.pow(3,positive(mat.tier)))/2),denomination:'gp'},
   description:{value:`<p>${escapeHTML(mat.description||'Crafting material.')}</p><p><strong>Material:</strong> ${escapeHTML(mat.group)} · Tier ${positive(mat.tier)}</p>`}},
  flags:{[NS]:{resourceId:mat.id}}};
}
export function makeCraftData(recipe,qty=1){
 const kind=outputKind(recipe),spec=weaponSpecs[recipe.id],shield=shields[recipe.id],system={quantity:positive(qty),
  description:{value:`<p>${escapeHTML(recipe.description||'A handmade item.')}</p><p><strong>Trade:</strong> ${escapeHTML(recipe.subcategory||recipe.category||'Crafting')} · Tier ${positive(recipe.tier)}</p>${kind==='consumable'?'<p>Use with the potion action or the Gathering & Crafting Inventory.</p>':''}`}};
 if(spec){
  Object.assign(system,{type:{value:spec.type,baseItem:spec.base},weight:spec.weight,price:{value:spec.value,denomination:'gp'},
   equipped:false,properties:spec.properties,
   damage:{base:damage(1,spec.dice,[spec.damage])},
   activities:{attack:physicalActivity(spec)}});
  if(spec.range)system.range={value:spec.range[0],long:spec.range[1],units:'ft'};
 }else if(shield){
  Object.assign(system,{type:{value:'shield',baseItem:'shield'},weight:shield.weight,price:{value:shield.price,denomination:'gp'},equipped:false,
   armor:{type:'shield',value:shield.value,dex:null},properties:[],activities:{}});
 }else if(kind==='consumable'){
  const f=/^healing:(\d+d\d+\+\d+)$/.exec(recipe.effect||'');
  Object.assign(system,{type:{value:'potion'},weight:0.5,price:{value:Math.max(5,5*Math.pow(3,positive(recipe.tier)-1)),denomination:'gp'},
   activities:{use:f?healActivity(f[1]):utilityActivity()}});
 }else{
  Object.assign(system,{weight:recipe.subcategory==='Smelting'?1:0.5,
   price:{value:Math.max(1,2*Math.pow(3,positive(recipe.tier)-1)),denomination:'gp'}});
 }
 return {name:recipe.name,type:kind,img:recipe.img||'icons/svg/item-bag.svg',system,
  flags:{[NS]:{recipeId:recipe.id,effect:recipe.effect||'',...(recipe.subcategory==='Smelting'?{resourceId:recipe.id}:{})}}};
}
export const nativeTemplates={weapons:weaponSpecs,shields};
