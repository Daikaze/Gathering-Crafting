/** Built-in native dnd5e 5.3.3 item templates. Generated items are normal Foundry Items. */
const NS='gathering-crafting';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weapons={
'iron-dagger':['simpleM','dagger',4,'piercing',['fin','lgt','thr'],2],
'steel-dagger':['simpleM','dagger',4,'piercing',['fin','lgt','thr'],4],
'steel-sword':['martialM','longsword',8,'slashing',['ver'],20],
'silvered-blade':['martialM','longsword',8,'slashing',['ver'],120],
'mithral-blade':['martialM','scimitar',6,'slashing',['fin','lgt'],225],
'adamantine-blade':['martialM','longsword',8,'slashing',['ver'],450]};
const shields={'steel-shield':[2,15],'adamantine-shield':[2,300]};
const damage=(n,d,types,bonus='')=>({number:n,denomination:d,bonus,types:[types],custom:{enabled:false,formula:''},scaling:{mode:'',number:null,formula:''}});
export const outputKind=r=>r.category==='alchemy'?'consumable':weapons[r.id]?'weapon':shields[r.id]?'equipment':'loot';
export function makeMaterialData(m,qty=1){return {name:m.name,type:'loot',img:m.img||'icons/svg/item-bag.svg',system:{quantity:Math.max(1,+qty||1),weight:.1,price:{value:Math.max(1,Math.pow(3,+m.tier||1)/2),denomination:'gp'},description:{value:`<p>${esc(m.description)}</p><p>${esc(m.group)} · Tier ${+m.tier||1}</p>`}},flags:{[NS]:{resourceId:m.id}}};}
export function makeCraftData(r,qty=1){
const type=outputKind(r),system={quantity:Math.max(1,+qty||1),description:{value:`<p>${esc(r.description)}</p><p>${esc(r.subcategory||r.category)} · Tier ${+r.tier||1}</p>`}};
if(type==='weapon'){
const [weapon,base,die,dtype,props,price]=weapons[r.id];
Object.assign(system,{type:{value:weapon,baseItem:base},weight:3,price:{value:price,denomination:'gp'},properties:props,equipped:false,damage:{base:damage(1,die,dtype)},activities:{attack:{type:'attack',name:'Attack',activation:{type:'action',value:1},attack:{ability:'',bonus:'',flat:false,type:{value:'melee',classification:'weapon'}},damage:{includeBase:true,parts:[]}}}});
if(base==='dagger')system.range={value:20,long:60,units:'ft'};
}else if(type==='equipment'){
Object.assign(system,{type:{value:'shield',baseItem:'shield'},equipped:false,armor:{type:'shield',value:2},weight:6,price:{value:shields[r.id][1],denomination:'gp'},activities:{}});
}else if(type==='consumable'){
const match=/^healing:(\d+)d(\d+)\+(\d+)$/.exec(r.effect||'');
const use=match?{type:'heal',name:'Drink Potion',activation:{type:'bonus',value:1},healing:damage(+match[1],+match[2],'healing',match[3]),consumption:{targets:[{type:'item',target:'',value:'1'}]}}:{type:'utility',name:'Use Item',activation:{type:'action',value:1},consumption:{targets:[{type:'item',target:'',value:'1'}]}};
Object.assign(system,{type:{value:'potion'},weight:.5,price:{value:Math.max(5,5*Math.pow(3,(+r.tier||1)-1)),denomination:'gp'},activities:{use}});
}else{Object.assign(system,{weight:r.subcategory==='Smelting'?1:.5,price:{value:Math.max(1,2*Math.pow(3,(+r.tier||1)-1)),denomination:'gp'}});}
return {name:r.name,type,img:r.img||'icons/svg/item-bag.svg',system,flags:{[NS]:{recipeId:r.id,effect:r.effect||'',...(r.subcategory==='Smelting'?{resourceId:r.id}:{})}}};
}
