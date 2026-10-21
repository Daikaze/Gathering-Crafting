/** D&D5e v5 tool requirements and deterministic crafting modifiers.
 * No Foundry globals: directly testable with node --test.
 * Full actor.system.tools names match CONFIG.DND5E.tools; item aliases support
 * stock tools, mundane equipment (pickaxe), and user-created translations.
 */
export const TOOL_SPECS=Object.freeze({
  pickaxe:{label:"Pickaxe",proficiency:"mason",proficiencyLabel:"Mason's Tools",ability:"str",
    aliases:["pickaxe","miner's pick","miners pick","mining pick","кирка"]},
  herbalism:{label:"Herbalism Kit",proficiency:"herb",proficiencyLabel:"Herbalism Kit",ability:"wis",
    aliases:["herbalism kit","herbalist's kit","herbalists kit","билкарски комплект"]},
  skinning:{label:"Skinning Knife",proficiency:"leatherworker",proficiencyLabel:"Leatherworker's Tools",ability:"dex",
    aliases:["skinning knife","skinning kit","butcher's knife","butchers knife","нож за дране","нож за одиране"]},
  smith:{label:"Smith's Tools",proficiency:"smith",proficiencyLabel:"Smith's Tools",ability:"str",
    aliases:["smith's tools","smiths tools","blacksmith tools","ковашки инструменти"]},
  alchemist:{label:"Alchemist's Supplies",proficiency:"alchemist",proficiencyLabel:"Alchemist's Supplies",ability:"int",
    aliases:["alchemist's supplies","alchemists supplies","alchemy kit","алхимични инструменти"]},
  woodcarver:{label:"Woodcarver's Tools",proficiency:"woodcarver",proficiencyLabel:"Woodcarver's Tools",ability:"wis",
    aliases:["woodcarver's tools","woodcarvers tools","carving tools","дърводелски инструменти"]}
});
export const PROF_OPTIONS=Object.freeze({
 mason:"Mason's Tools",herb:"Herbalism Kit",leatherworker:"Leatherworker's Tools",
 smith:"Smith's Tools",alchemist:"Alchemist's Supplies",woodcarver:"Woodcarver's Tools",
 jeweler:"Jeweler's Tools",tinker:"Tinker's Tools",pois:"Poisoner's Kit",
 carpenter:"Carpenter's Tools",glassblower:"Glassblower's Tools",thief:"Thieves' Tools"
});
const norm=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();
const num=value=>Number.isFinite(Number(value))?Number(value):0;
export function requiredForNode(node={},mat={}){
  if(TOOL_SPECS[node.requiredTool])return node.requiredTool;
  if(node.group==="monster"||mat.group==="Monster Drop")return "skinning";
  if(node.group==="alchemy"||mat.group==="Alchemical Ingredient")return "herbalism";
  if(mat.id==="oak-wood"||mat.group==="Wood")return "woodcarver";
  return "pickaxe";
}
export function requiredForRecipe(recipe={}){
  if(TOOL_SPECS[recipe.requiredTool])return recipe.requiredTool;
  return recipe.category==="alchemy"?"alchemist":"smith";
}
export function itemForTool(actor,toolKey){
  const spec=TOOL_SPECS[toolKey];
  if(!spec)return null;
  return Array.from(actor?.items??[]).find(item=>{
    const qty=Number(item.system?.quantity??1);
    if(!Number.isFinite(qty)||qty<=0)return false;
    const flag=item.getFlag?.("gathering-crafting","toolKey")??item.flags?.["gathering-crafting"]?.toolKey;
    if(flag===toolKey)return true;
    const base=norm(item.system?.type?.baseItem);
    if(spec.aliases.some(alias=>base===norm(alias)))return true;
    const name=norm(item.name);
    return spec.aliases.some(alias=>name===norm(alias));
  })??null;
}
export function proficiencyLevel(actor,proficiencyId){
  const entry=actor?.system?.tools?.[proficiencyId];
  const val=typeof entry==="object"?entry?.value:entry;
  return Math.max(0,Math.min(2,num(val)));
}
export function actorLevel(actor){
  const details=actor?.system?.details??{};
  const explicit=num(details.level);
  if(explicit>0)return Math.max(1,Math.floor(explicit));
  const classes=Array.from(actor?.items??[]).filter(i=>i.type==="class");
  const summed=classes.reduce((n,c)=>n+Math.max(0,num(c.system?.levels)),0);
  return Math.max(1,Math.floor(summed||1));
}
export function proficiencyBonus(actor){
  const provided=num(actor?.system?.attributes?.prof);
  if(provided>0)return provided;
  return Math.min(6,2+Math.floor((actorLevel(actor)-1)/4));
}
export function toolGate(actor,toolKey,proficiencyId=null){
  const spec=TOOL_SPECS[toolKey];
  if(!spec)return {ok:false,tool:null,error:"Unsupported tool requirement."};
  const tool=itemForTool(actor,toolKey);
  if(!tool)return {ok:false,tool:null,error:"Requires "+spec.label+" in the character's inventory."};
  const prof=proficiencyId||spec.proficiency;
  if(proficiencyLevel(actor,prof)<1)
    return {ok:false,tool,error:"Requires proficiency in "+(PROF_OPTIONS[prof]||prof)+" (set it on the D&D5e character sheet)."};
  return {ok:true,tool,error:"",proficiency:prof};
}
export function toolItemBonus(item){
  // An explicit fixed tool/item bonus; no arbitrary formula evaluation.
  const a=num(item?.system?.magicalBonus??item?.system?.bonus??0);
  return Math.max(-10,Math.min(10,a));
}
export function craftCheck(actor,recipe,toolKey,proficiencyId,tool){
  const spec=TOOL_SPECS[toolKey];
  const proficiency=proficiencyId||spec?.proficiency;
  const pb=proficiencyBonus(actor);
  const modifier=num(actor?.system?.abilities?.[spec?.ability||"int"]?.mod);
  const multiplier=proficiencyLevel(actor,proficiency);
  const level=actorLevel(actor);
  const levelBonus=Math.min(5,Math.floor((level-1)/4));
  const itemBonus=toolItemBonus(tool);
  const total=modifier+pb*multiplier+levelBonus+itemBonus;
  return {ability:spec?.ability||"int",modifier,pb,multiplier,level,levelBonus,itemBonus,total};
}
