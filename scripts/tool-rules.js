/** Optional D&D5e tool proficiency checks. No tool proficiency is a hard gate. */
export const toolName = id => ({smith:"Smith's Tools",alchemist:"Alchemist's Supplies",herb:"Herbalism Kit",pois:"Poisoner's Kit"})[id] || id;
export const craftingTool = recipe => recipe?.category === "alchemy" ? "alchemist" : "smith";
export const gatheringTool = material => {
  if(material?.group === "Alchemical Ingredient") return "herb";
  if(material?.group === "Monster Drop") return "alchemist";
  return "smith";
};
/** DnD5e 5.3.3: 0=untrained, .5=half, 1=proficient, 2=expert. */
export function hasToolProficiency(actor,toolId) {
  if(!toolId) return true;
  const entry = actor?.system?.tools?.[toolId];
  const individual = Number((typeof entry === "object" && entry !== null ? entry.value : entry) ?? 0);
  const universal = Number(actor?.system?.rolls?.ability?.tool?.proficiency ?? 0);
  const legacy = actor?.system?.traits?.toolProf?.value;
  return (Number.isFinite(individual) && individual > 0)
    || (Number.isFinite(universal) && universal > 0)
    || (Array.isArray(legacy) && legacy.includes(toolId))
    || (legacy instanceof Set && legacy.has(toolId));
}
export function toolRollFormula(actor,toolId) {
  return hasToolProficiency(actor,toolId) ? "1d20 + @bonus" : "2d20kl1 + @bonus";
}
