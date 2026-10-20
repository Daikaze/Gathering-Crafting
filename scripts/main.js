/** Gathering & Crafting v0.1.0 — Foundry V14 / dnd5e 5.3.3. No external modules. */
const ID = "gathering-crafting";
const clone = (v) => foundry.utils.deepClone(v);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const int = (v, fallback = 0, min = 0, max = 9999) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
};
const idNew = () => foundry.utils.randomID(12);
const toast = (message, error = false) => ui.notifications[error ? "error" : "info"](message);
const safeIcon = (s) => /^fa-[a-z0-9-]+$/.test(String(s || "")) ? s : "fa-cube";
const glyph = (s) => `<i class="fa-solid ${safeIcon(s)}" aria-hidden="true"></i>`;
const displayNumber = (n) => `${Number(n) >= 0 ? "+" : ""}${n}`;
const resource = (id, db) => db.materials.find(m => m.id === id);
const attempts = (actor) => int(actor?.getFlag(ID, "attempts"), 0);

const DEMO = {
  settings: {dailyLimit: 6},
  materials: [
    {id:"iron-ore", img:"modules/gathering-crafting/icons/iron-ore.svg", name:"Желязна руда", icon:"fa-gem", color:"#96aec7", description:"Сурова руда за метали и оръжия."},
    {id:"copper-ore", img:"modules/gathering-crafting/icons/copper-ore.svg", name:"Медна руда", icon:"fa-mountain", color:"#d69a65", description:"Лесна за обработка руда."},
    {id:"oak-wood", img:"modules/gathering-crafting/icons/oak-wood.svg", name:"Дъбова дървесина", icon:"fa-tree", color:"#b29b6b", description:"Здрава дървесина за инструменти."},
    {id:"herbs", img:"modules/gathering-crafting/icons/herbs.svg", name:"Лечебни билки", icon:"fa-leaf", color:"#66bd8a", description:"Основна съставка за лечебни смеси."},
    {id:"crystal", img:"modules/gathering-crafting/icons/crystal.svg", name:"Магически кристал", icon:"fa-wand-magic-sparkles", color:"#b58cff", description:"Рядък кристал, съхраняващ енергия."},
    {id:"leather", img:"modules/gathering-crafting/icons/leather.svg", name:"Здрава кожа", icon:"fa-paw", color:"#cd936a", description:"Обработена кожа за екипировка."},
    {id:"monster-bone", img:"modules/gathering-crafting/icons/monster-bone.svg", name:"Чудовищна кост", icon:"fa-skull", color:"#cfbfa3", description:"Остатък от опасни създания."},
    {id:"wild-flower", img:"modules/gathering-crafting/icons/wild-flower.svg", name:"Диво цвете", icon:"fa-seedling", color:"#e88fae", description:"Използва се в алхимични рецепти."}
  ],
  nodes: [
    {id:"old-mine", name:"Стара мина", icon:"fa-mountain", description:"Миньорски тунели с достъпни метални жилки.", materialId:"iron-ore", bonusId:"crystal", bonusChance:15, dc:12, skill:"ath", minYield:1, maxYield:2, active:true},
    {id:"copper-vein", name:"Медна жила", icon:"fa-gem", description:"Плитко находище, подходящо за начинаещи.", materialId:"copper-ore", bonusId:"", bonusChance:0, dc:9, skill:"ath", minYield:1, maxYield:3, active:true},
    {id:"green-grove", name:"Горска поляна", icon:"fa-leaf", description:"Местни лечебни растения и билки.", materialId:"herbs", bonusId:"wild-flower", bonusChance:25, dc:11, skill:"sur", minYield:1, maxYield:2, active:true},
    {id:"old-oaks", name:"Стари дъбове", icon:"fa-tree", description:"Здрави клони и ценна дървесина.", materialId:"oak-wood", bonusId:"", bonusChance:0, dc:10, skill:"sur", minYield:1, maxYield:2, active:true},
    {id:"bone-field", name:"Зверска следа", icon:"fa-paw", description:"Следи от хищници, кожа и кости.", materialId:"leather", bonusId:"monster-bone", bonusChance:30, dc:14, skill:"sur", minYield:1, maxYield:2, active:true}
  ],
  recipes: [
    {id:"iron-ingot", img:"modules/gathering-crafting/icons/iron-ingot.svg", name:"Железен слитък", icon:"fa-hammer", description:"Преработена суровина за ковачество.", category:"smithing", ingredients:[{id:"iron-ore", qty:3}], outputQuantity:1, outputItemUuid:"", dc:12},
    {id:"copper-ring", img:"modules/gathering-crafting/icons/copper-ring.svg", name:"Меден пръстен", icon:"fa-ring", description:"Просто украшение от мека руда.", category:"smithing", ingredients:[{id:"copper-ore", qty:3}], outputQuantity:1, outputItemUuid:"", dc:11},
    {id:"healing-salve", img:"modules/gathering-crafting/icons/healing-salve.svg", name:"Лечебен мехлем", icon:"fa-flask", description:"Алхимична смес. За реален лечебен ефект GM може да свърже dnd5e Item.", category:"alchemy", ingredients:[{id:"herbs", qty:3},{id:"wild-flower", qty:1}], outputQuantity:1, outputItemUuid:"", dc:11},
    {id:"oak-handle", img:"modules/gathering-crafting/icons/oak-handle.svg", name:"Дъбова дръжка", icon:"fa-hammer", description:"Част за бъдещи оръжия и инструменти.", category:"woodworking", ingredients:[{id:"oak-wood",qty:3}], outputQuantity:1, outputItemUuid:"", dc:11},
    {id:"leather-wrap", img:"modules/gathering-crafting/icons/leather-wrap.svg", name:"Кожена намотка", icon:"fa-shield-halved", description:"Материал за защита и оборудване.", category:"leatherworking", ingredients:[{id:"leather",qty:3}], outputQuantity:1, outputItemUuid:"", dc:12},
    {id:"arcane-focus", img:"modules/gathering-crafting/icons/arcane-focus.svg", name:"Кристален фокус", icon:"fa-wand-magic-sparkles", description:"Магически компонент. GM може да зададе готов dnd5e Item.", category:"arcane", ingredients:[{id:"crystal",qty:2},{id:"monster-bone",qty:1}], outputQuantity:1, outputItemUuid:"", dc:17}
  ]
};

const CATEGORIES = [
  ["all","Всички","fa-layer-group"],
  ["smithing","Ковачество","fa-hammer"],
  ["alchemy","Алхимия","fa-flask"],
  ["woodworking","Дърводелство","fa-tree"],
  ["leatherworking","Кожарство","fa-shield-halved"],
  ["arcane","Магия","fa-wand-magic-sparkles"]
];
const SKILLS = [["sur","Survival"],["ath","Athletics"],["prc","Perception"],["inv","Investigation"],["nat","Nature"],["slt","Sleight of Hand"]];
const categories = Object.fromEntries(CATEGORIES.map(([id,label])=>[id,label]));
const skillLabel = Object.fromEntries(SKILLS.map(([id,label])=>[id,label]));
const settingsDB = () => game.settings.get(ID, "database");
function validWorldDB(db) {
  return !!db && Array.isArray(db.materials) && Array.isArray(db.nodes) && Array.isArray(db.recipes);
}
function materialItems(actor, materialId) {
  return actor.items.filter(i => i.getFlag(ID,"resourceId") === materialId);
}
function materialCount(actor, materialId) {
  return materialItems(actor, materialId).reduce((sum, i) => sum + int(i.system?.quantity,1), 0);
}
function skillBonus(actor, skillId) {
  const data = actor.system?.skills?.[skillId] ?? {};
  if (Number.isFinite(Number(data.total)) && data.total !== undefined && data.total !== null) return Number(data.total);
  const ability = data.ability || (skillId === "ath" ? "str" : skillId === "slt" ? "dex" : skillId === "inv" || skillId === "nat" ? "int" : "wis");
  const base = data.mod !== undefined && data.mod !== null && Number.isFinite(Number(data.mod)) ? Number(data.mod) : Number(actor.system?.abilities?.[ability]?.mod ?? 0);
  const proficiency = Number(actor.system?.attributes?.prof ?? 2);
  return Math.trunc(base + Math.floor(proficiency * Number(data.value || 0)));
}
function makeMaterialData(mat, quantity) {
  return {
    name: mat.name,
    type: "loot",
    img: mat.img || "icons/svg/item-bag.svg",
    system: {quantity, description: {value:`<p>${esc(mat.description || "Материал за изработка.")}</p>`}},
    flags: {[ID]: {resourceId:mat.id}}
  };
}
async function grantMaterial(actor, mat, qty) {
  const item = materialItems(actor, mat.id)[0];
  if (item) {
    await item.update({"system.quantity":int(item.system?.quantity,0) + qty});
  } else {
    await actor.createEmbeddedDocuments("Item", [makeMaterialData(mat, qty)]);
  }
}
async function consumeMaterials(actor, list) {
  // Combine by ID to guard against duplicate ingredient entries.
  const need = new Map();
  for (const p of list) need.set(p.id,(need.get(p.id)||0)+int(p.qty,0));
  for (const [id,qty] of need) if (materialCount(actor,id) < qty) throw new Error(`Недостатъчно материал: ${id}`);
  const updates = [], deletes = [];
  for (const [id,qty] of need) {
    let remaining = qty;
    for (const item of materialItems(actor,id)) {
      if (!remaining) break;
      const has = int(item.system?.quantity,1);
      const take = Math.min(remaining,has);
      const after = has - take;
      if (after > 0) updates.push({_id:item.id,"system.quantity":after});
      else deletes.push(item.id);
      remaining -= take;
    }
  }
  const originals = [...need.keys()].flatMap(id => materialItems(actor,id)).map(item => ({
    id:item.id, quantity:int(item.system?.quantity,1), data:item.toObject()
  }));
  try {
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    if (deletes.length) await actor.deleteEmbeddedDocuments("Item", deletes);
  } catch (error) {
    // Restore any partially updated stacks if a document operation fails.
    try {
      for (const before of originals) {
        const current = actor.items.get?.(before.id) ?? actor.items.find(i=>i.id===before.id);
        if (current) {
          if (int(current.system?.quantity,0)!==before.quantity)
            await current.update({"system.quantity":before.quantity});
        } else {
          const data=clone(before.data);
          delete data._id;
          await actor.createEmbeddedDocuments("Item",[data]);
        }
      }
    } catch (restoreError) {
      console.error(`${ID} | inventory rollback failed`,restoreError);
      toast("ВНИМАНИЕ: неуспешно възстановяване на ресурси. Потърси GM.",true);
    }
    throw error;
  }
}
async function refundMaterials(actor, list, db) {
  for (const ingredient of list) {
    const mat = resource(ingredient.id, db);
    if (mat && ingredient.qty) await grantMaterial(actor, mat, int(ingredient.qty));
  }
}
async function grantCraft(actor, recipe, amount) {
  let data;
  if (recipe.outputItemUuid) {
    const source = await fromUuid(recipe.outputItemUuid);
    if (!source || source.documentName !== "Item") throw new Error("Свързаният Item не съществува. GM трябва да го избере отново.");
    data = source.toObject();
    delete data._id;
    data.system ||= {};
    data.system.quantity = amount;
  } else {
    data = {
      name:recipe.name, type:"loot", img:recipe.img || "icons/svg/item-bag.svg",
      system:{quantity:amount, description:{value:`<p>${esc(recipe.description)}</p><p><em>Тестов crafted предмет. За работещо оръжие/отвара свържи Item в GM Studio.</em></p>`}}
    };
  }
  data.flags ||= {};
  data.flags[ID] = {...(data.flags[ID] || {}), recipeId: recipe.id};
  const canStack = data.type === "loot" || data.type === "consumable";
  const existing = canStack ? actor.items.find(i => i.getFlag(ID,"recipeId") === recipe.id && i.type === data.type && i.name === data.name) : null;
  if (existing) await existing.update({"system.quantity":int(existing.system?.quantity,1)+amount});
  else await actor.createEmbeddedDocuments("Item",[data]);
}
function availableActors() {
  const all = game.actors?.contents ?? [];
  return all.filter(a => ["character","npc"].includes(a.type) && (game.user.isGM || a.isOwner))
    .sort((a,b) => Number(b.type === "character")-Number(a.type === "character") || a.name.localeCompare(b.name));
}
function actorCurrent(preferredId) {
  const list = availableActors();
  const controlled = canvas?.tokens?.controlled?.[0]?.actor;
  if (preferredId) return list.find(a=>a.id===preferredId) || null;
  if (controlled) return list.find(a=>a.id===controlled.id) ?? list[0] ?? null;
  const assigned = game.user.character;
  return list.find(a=>a.id===assigned?.id) ?? list[0] ?? null;
}
function safeColor(color) {return /^#[0-9a-fA-F]{6}$/.test(String(color)) ? color : "#9fb7cb";}
function requirements(actor, recipe, db, extra = false) {
  const list = recipe.ingredients.map((p, idx) => ({...p, qty:int(p.qty,1) + (extra && idx === 0 ? 1 : 0)}));
  return list.map(p => ({...p, material:resource(p.id,db), have:actor ? materialCount(actor,p.id):0}));
}
async function publish(actor, text) {
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<div class="gc-chat"><h3>⚒ Gathering & Crafting</h3>${text}</div>`});
}

class GatheringCrafting extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "gc-main-window",
    classes: ["gathering-crafting"],
    window: {title:"Gathering & Crafting", icon:"fa-solid fa-hammer", resizable:true},
    position: {width:940, height:700}
  };
  constructor(options={}) {
    super(options);
    this.actorId = null;
    this.tab = "gather";
    this.gatherMode = "careful";
    this.craftMode = "steady";
    this.category = "all";
    this.search = "";
    this.editor = null;
    this.busy = false;
    this.actorId = actorCurrent()?.id ?? null;
  }
  get actor() {return actorCurrent(this.actorId);}
  async _renderHTML() {
    const wrap = document.createElement("div");
    wrap.className = "gc-root";
    wrap.innerHTML = this.template();
    return wrap;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  async _onRender(context, options) {
    await super._onRender(context,options);
    const root = this.element.querySelector(".gc-root");
    if (!root) return;
    root.addEventListener("click", (e) => this.handleClick(e));
    root.addEventListener("change", (e) => this.handleChange(e));
    root.addEventListener("input", (e) => this.handleInput(e));
    root.addEventListener("submit", (e) => this.handleSubmit(e));
  }
  refresh() {return this.render({force:true});}
  template() {
    const db = settingsDB();
    if (!validWorldDB(db)) return `<div class="gc-empty">World data липсват. GM трябва да активира модула повторно.</div>`;
    const actor = this.actor;
    const actors = availableActors();
    const gm = game.user.isGM;
    const used = actor ? attempts(actor) : 0;
    const total = int(db.settings?.dailyLimit,6,1,100);
    const actorPicker = `<label class="gc-selectwrap">${glyph("fa-user-shield")}<select name="actor" aria-label="Избери герой">${actors.map(a=>`<option value="${esc(a.id)}" ${actor?.id===a.id?"selected":""}>${esc(a.name)} (${a.type === "character" ? "PC" : "NPC"})</option>`).join("")}</select></label>`;
    return `<div class="gc-top">
      <div class="gc-brand"><span class="gc-brand-logo">${glyph("fa-hammer")}</span><div><span class="gc-subtitle">AVERIS WORKSHOP · v0.1.0</span><div class="gc-brand-title">Gathering <span>&</span> Crafting</div></div></div>
      <div class="gc-top-right">${actorPicker}<div class="gc-energy" title="Оставащи опити за събиране">${glyph("fa-bolt")} <b>${actor ? Math.max(0,total-used) : 0}</b><small>/ ${total} опита</small></div></div>
    </div>
    <nav class="gc-tabs" aria-label="Раздели">
      ${this.nav("gather","fa-seedling","Gathering")}${this.nav("craft","fa-hammer","Crafting")}${this.nav("backpack","fa-box-open","Материали")}${gm ? this.nav("gm","fa-gears","GM Studio") : ""}
    </nav>
    <div class="gc-content">${!actor && this.tab!=="gm" ? `<div class="gc-empty">${glyph("fa-circle-info")} Няма достъпен герой. GM трябва да даде Owner достъп или да зададе персонаж.</div>` : this.tab === "gather" ? this.gatherTab(db, actor) : this.tab === "craft" ? this.craftTab(db, actor) : this.tab === "backpack" ? this.backpackTab(db, actor) : gm ? this.gmTab(db) : ""}</div>
    <footer class="gc-footer"><span>${glyph("fa-shield-halved")} Материалите се съхраняват в инвентара на героя</span><span>v0.1.0 · Foundry V14 / dnd5e 5.3.3</span></footer>`;
  }
  nav(id,icon,label) {return `<button type="button" class="gc-nav ${this.tab===id ? "is-active" : ""}" data-action="tab" data-id="${id}">${glyph(icon)} <span>${esc(label)}</span></button>`;}
  heading(icon,title,lead) {return `<header class="gc-section-head"><div><h2>${glyph(icon)} ${esc(title)}</h2><p>${esc(lead)}</p></div></header>`;}
  gatherTab(db,actor) {
    const remaining = Math.max(0,int(db.settings.dailyLimit,6,1,100)-attempts(actor));
    const list = db.nodes.filter(n=>n.active && (!this.search || `${n.name} ${n.description}`.toLowerCase().includes(this.search.toLowerCase())));
    return `${this.heading("fa-compass","Изследвай и събирай","Избери находище, реши колко риск да поемеш и събери ресурси с един клик.")}
      <div class="gc-toolbar"><div class="gc-mode" role="group" aria-label="Начин на събиране"><button type="button" data-action="gmode" data-mode="careful" class="${this.gatherMode==="careful"?"is-on":""}">${glyph("fa-shield-heart")} Внимателно <small>DC −2 · нормален добив</small></button><button type="button" data-action="gmode" data-mode="bold" class="${this.gatherMode==="bold"?"is-on":""}">${glyph("fa-bolt")} Рисковано <small>DC +3 · двоен добив</small></button></div><label class="gc-search">${glyph("fa-magnifying-glass")}<input type="search" data-search placeholder="Търси находище..." value="${esc(this.search)}"></label></div>
      <div class="gc-notice">${glyph("fa-circle-info")} <span>Тестова версия: всички активни находища са достъпни от всеки град/сцена. <b>${remaining} от ${int(db.settings.dailyLimit,6,1,100)}</b> оставащи опита. GM ги възстановява от GM Studio.</span></div>
      <div class="gc-grid">${list.map(n=>this.nodeCard(db,n,actor,remaining)).join("") || `<div class="gc-empty">Няма намерени находища.</div>`}</div>`;
  }
  nodeCard(db,node,actor,remaining) {
    const mat=resource(node.materialId,db), bonus=resource(node.bonusId,db);
    const dc=int(node.dc,12) + (this.gatherMode==="bold"?3:-2);
    const qty = `${int(node.minYield,1)}–${int(node.maxYield,2)}${this.gatherMode==="bold"?" ×2":""}`;
    return `<article class="gc-tile gc-node"><div class="gc-tile-banner"><span class="gc-hero-icon">${glyph(node.icon)}</span><span class="gc-dc">DC ${dc} · ${esc(skillLabel[node.skill]||node.skill)}</span></div><div class="gc-tile-body"><h3>${esc(node.name)}</h3><p>${esc(node.description)}</p><div class="gc-loot"><span class="gc-mat-icon" style="--gc-mat:${safeColor(mat?.color)}">${glyph(mat?.icon)}</span><div><b>${esc(mat?.name || "Липсващ материал")}</b><small>Добив: ${qty}</small></div>${bonus?`<span class="gc-rare" title="Бонус: ${esc(bonus.name)} (${int(node.bonusChance,0,0,100)}%)">${glyph("fa-gem")} ${int(node.bonusChance,0,0,100)}%</span>`:""}</div><button type="button" class="gc-primary" data-action="gather" data-id="${esc(node.id)}" ${!remaining||!mat||this.busy?"disabled":""}>${glyph("fa-hand-sparkles")} Събери ${glyph("fa-arrow-right")}</button></div></article>`;
  }
  craftTab(db,actor) {
    const recipes = db.recipes.filter(r => (this.category==="all"||r.category===this.category) && (!this.search || `${r.name} ${r.description}`.toLowerCase().includes(this.search.toLowerCase())));
    return `${this.heading("fa-hammer","Работилница","Подготви съставките и избери сигурна или по-амбициозна изработка.")}
      <div class="gc-toolbar"><div class="gc-mode" role="group" aria-label="Начин на изработка"><button type="button" data-action="cmode" data-mode="steady" class="${this.craftMode==="steady"?"is-on":""}">${glyph("fa-check-circle")} Стандартно <small>100% успех · 1× резултат</small></button><button type="button" data-action="cmode" data-mode="inspired" class="${this.craftMode==="inspired"?"is-on":""}">${glyph("fa-wand-magic-sparkles")} Майсторски опит <small>+1 от първата суровина · шанс 2×</small></button></div><label class="gc-search">${glyph("fa-magnifying-glass")}<input type="search" data-search placeholder="Търси рецепта..." value="${esc(this.search)}"></label></div>
      <div class="gc-category">${CATEGORIES.map(([id,name,icon])=>`<button type="button" data-action="category" data-id="${id}" class="${this.category===id?"is-on":""}">${glyph(icon)} ${esc(name)}</button>`).join("")}</div>
      <div class="gc-grid">${recipes.map(r=>this.recipeCard(db,r,actor)).join("") || `<div class="gc-empty">Няма рецепти в тази категория.</div>`}</div>`;
  }
  recipeCard(db,recipe,actor) {
    const ingredients = requirements(actor,recipe,db,this.craftMode==="inspired");
    const can = ingredients.length>0 && ingredients.every(i=>!!i.material && i.have>=i.qty);
    const gear=recipe.outputItemUuid && game.items?.contents.some(i=>i.uuid===recipe.outputItemUuid);
    return `<article class="gc-tile gc-recipe"><div class="gc-tile-banner gc-craft-art"><span class="gc-hero-icon">${glyph(recipe.icon)}</span><span class="gc-dc">${esc(categories[recipe.category]||"Craft")}${this.craftMode==="inspired"?` · DC ${int(recipe.dc,12)}`:""}</span></div><div class="gc-tile-body"><h3>${esc(recipe.name)}</h3><p>${esc(recipe.description)}</p><div class="gc-recipe-meta">${glyph("fa-cubes-stacked")} Резултат: ${int(recipe.outputQuantity,1,1,99)}× ${gear ? "свързан Item" : "тестов предмет"}</div><div class="gc-ingredients">${ingredients.map(i=>`<div class="gc-ingredient ${i.have>=i.qty?"gc-have":"gc-miss"}"><span class="gc-mat-icon" style="--gc-mat:${safeColor(i.material?.color)}">${glyph(i.material?.icon)}</span><span>${esc(i.material?.name||"Липсващ материал")}</span><b>${i.have}/${i.qty}</b></div>`).join("")}</div><button type="button" class="gc-primary" data-action="craft" data-id="${esc(recipe.id)}" ${!can||this.busy?"disabled":""}>${glyph(can?"fa-hammer":"fa-lock")} ${can ? "Изработи" : "Липсват съставки"} ${can?glyph("fa-arrow-right"):""}</button></div></article>`;
  }
  backpackTab(db, actor) {
    const inventory = db.materials.map(m=>({...m,qty:materialCount(actor,m.id)}));
    const total = inventory.reduce((s,m)=>s+m.qty,0);
    return `${this.heading("fa-box-open","Твоята раница","Материалите са истински Loot items в D&D 5e инвентара на героя.")}
      <div class="gc-stats"><div>${glyph("fa-boxes-stacked")} <b>${total}</b><small>Общо ресурси</small></div><div>${glyph("fa-gem")} <b>${inventory.filter(m=>m.qty>0).length}</b><small>Различни материали</small></div><div>${glyph("fa-flask")} <b>${actor.items.filter(i=>i.getFlag(ID,"recipeId")).length}</b><small>Изработени предмети</small></div></div>
      <div class="gc-material-grid">${inventory.map(m=>`<div class="gc-material ${m.qty?"":"is-zero"}"><div class="gc-inv-icon" style="--gc-mat:${safeColor(m.color)}">${glyph(m.icon)}</div><div class="gc-inv-name"><b>${esc(m.name)}</b><small>${esc(m.description)}</small></div><strong>×${m.qty}</strong></div>`).join("")}</div>`;
  }
  gmTab(db) {
    const editor = this.editor;
    return `${this.heading("fa-gears","GM Studio","Създавай ресурси, находища и рецепти, без да пишеш код.")}
      <div class="gc-gm-layout"><aside class="gc-gm-side"><div class="gc-gm-title">${glyph("fa-sliders")} Библиотека</div>${[["material","Материали","fa-gem",db.materials.length],["node","Находища","fa-mountain",db.nodes.length],["recipe","Рецепти","fa-scroll",db.recipes.length]].map(([id,name,icon,count])=>`<button type="button" class="gc-gm-group ${(editor?.kind||"material")===id?"is-on":""}" data-action="gmkind" data-id="${id}">${glyph(icon)} ${name} <span>${count}</span></button>`).join("")}
      <div class="gc-gm-limit"><label>Опита за събиране</label><div class="gc-inline"><input type="number" name="dailyLimit" min="1" max="100" value="${int(db.settings.dailyLimit,6,1,100)}"><button type="button" data-action="limit" title="Запази лимита">${glyph("fa-floppy-disk")}</button></div></div><button type="button" class="gc-secondary gc-reset" data-action="resetattempts">${glyph("fa-rotate-right")} Върни опитите на героя</button><p class="gc-help">Промените в библиотеката важат за всички играчи. Изтриването на ресурс не изтрива съществуващите предмети от инвентара.</p></aside>
      <div class="gc-gm-main">${this.editorList(db)}${editor ? this.editorForm(db,editor) : `<div class="gc-empty gc-placeholder">${glyph("fa-hand-pointer")} Избери елемент за редактиране или натисни + Нов.</div>`}</div></div>`;
  }
  editorList(db) {
    const kind = this.editor?.kind || "material";
    const list = kind==="material"?db.materials:kind==="node"?db.nodes:db.recipes;
    const title = {material:"Материали",node:"Находища",recipe:"Рецепти"}[kind];
    return `<div class="gc-library"><div class="gc-lib-header"><strong>${title}</strong><button type="button" data-action="new" data-kind="${kind}">${glyph("fa-plus")} Нов</button></div><div class="gc-lib-list">${list.map(x=>`<button type="button" class="gc-library-item ${this.editor?.id===x.id?"is-active":""}" data-action="edit" data-kind="${kind}" data-id="${esc(x.id)}">${glyph(x.icon)} <span>${esc(x.name)}</span>${glyph("fa-chevron-right")}</button>`).join("")||`<p class="gc-help">Списъкът е празен.</p>`}</div></div>`;
  }
  editorForm(db,{kind,id}) {
    const entry = (kind==="material"?db.materials:kind==="node"?db.nodes:db.recipes).find(x=>x.id===id) || {};
    const isNew=!id;
    const input=(name,label,type="text",value="",extra="") => `<label class="gc-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
    const select=(name,label,options,value)=>`<label class="gc-field"><span>${label}</span><select name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${value===v?"selected":""}>${esc(t)}</option>`).join("")}</select></label>`;
    const mats = db.materials.map(m=>[m.id,m.name]);
    const iconInput = input("icon","Font Awesome иконка (fa-leaf, fa-gem...)","text",entry.icon || (kind==="node"?"fa-mountain":kind==="recipe"?"fa-hammer":"fa-gem"),"maxlength=70");
    const common = `${input("name","Име *","text",entry.name||"","required maxlength=90")}${input("description","Описание","text",entry.description||"","maxlength=300")}${iconInput}`;
    let rest="";
    if (kind==="material") rest = input("color","Цвят (HEX)","color",safeColor(entry.color||"#9fb7cb"));
    if (kind==="node") rest = `${select("materialId","Основен материал",mats,entry.materialId)}${select("bonusId","Рядък бонус",[["","Без бонус"],...mats],entry.bonusId||"")}${input("bonusChance","Шанс за бонус %","number",entry.bonusChance??15,"min=0 max=100")}${select("skill","Проверка",SKILLS,entry.skill||"sur")}${input("dc","Трудност (DC)","number",entry.dc??12,"min=1 max=40")}${input("minYield","Минимален добив","number",entry.minYield??1,"min=1 max=20")}${input("maxYield","Максимален добив","number",entry.maxYield??2,"min=1 max=20")}<label class="gc-checkbox"><input name="active" type="checkbox" ${entry.active!==false?"checked":""}> Активно находище за играчите</label>`;
    if (kind==="recipe") {
      const sourceChoices = [["","Тестов Loot предмет (без механичен ефект)"],...game.items.contents.filter(i=>["loot","weapon","equipment","consumable","tool","container"].includes(i.type)).map(i=>[i.uuid, `${i.name} (${i.type})`])];
      const ingredients = entry.ingredients || [{id:mats[0]?.[0],qty:1}];
      rest = `${input("img","Иконка за Loot резултат (път)","text",entry.img||"","maxlength=250")}${select("category","Професия",CATEGORIES.filter(([id])=>id!=="all").map(([id,name])=>[id,name]),entry.category||"smithing")}${select("outputItemUuid","Изходен Item от World Items",sourceChoices,entry.outputItemUuid||"")}${input("outputQuantity","Количество резултат","number",entry.outputQuantity??1,"min=1 max=99")}${input("dc","DC за майсторски опит","number",entry.dc??12,"min=1 max=40")}
       <div class="gc-ingredients-editor"><div class="gc-ingredient-title">Съставки <button type="button" data-action="addingredient">${glyph("fa-plus")} Добави</button></div><div class="gc-ingredient-rows">${ingredients.map((ing,i)=>this.ingRow(ing,mats,i)).join("")}</div></div><p class="gc-help">За истински potions, weapons или equipment първо създай предмет в Items, после го избери тук. Модулът ще създаде копие в героя.</p>`;
    }
    return `<form class="gc-gm-form" data-editor-form="true"><h3>${isNew?"Нов": "Редактирай"} ${kind==="material"?"материал":kind==="node"?"находище":"рецепта"}</h3><div class="gc-fields">${common}${rest}</div><div class="gc-form-actions"><button type="submit" class="gc-primary">${glyph("fa-floppy-disk")} Запази</button>${!isNew?`<button type="button" class="gc-danger" data-action="delete" data-kind="${kind}" data-id="${esc(id)}">${glyph("fa-trash")} Изтрий</button>`:""}<button type="button" class="gc-secondary" data-action="cancel">Откажи</button></div></form>`;
  }
  ingRow(ing,mats,i) {return `<div class="gc-ing-row"><select name="ing-id">${mats.map(([id,name])=>`<option value="${esc(id)}" ${ing.id===id?"selected":""}>${esc(name)}</option>`).join("")}</select><input type="number" name="ing-qty" value="${int(ing.qty,1,1,99)}" min="1" max="99" aria-label="Брой"><button type="button" data-action="removeingredient" title="Махни съставката">${glyph("fa-xmark")}</button></div>`;}

  async handleClick(e) {
    const button = e.target.closest("button[data-action]");
    if (!button || this.busy) return;
    const action=button.dataset.action, id=button.dataset.id;
    if (action==="tab") {this.tab=id; this.search=""; if(id==="gm")this.editor ||= {kind:"material",id:null};return this.refresh();}
    if (action==="gmode") {this.gatherMode=button.dataset.mode;return this.refresh();}
    if (action==="cmode") {this.craftMode=button.dataset.mode;return this.refresh();}
    if (action==="category") {this.category=id;return this.refresh();}
    if (action==="gather") return this.runLocked(()=>this.gather(id));
    if (action==="craft") return this.runLocked(()=>this.craft(id));
    if (!game.user.isGM) return;
    if (action==="gmkind") {this.editor={kind:id,id:null};return this.refresh();}
    if (action==="new") {this.editor={kind:button.dataset.kind,id:null};return this.refresh();}
    if (action==="edit") {this.editor={kind:button.dataset.kind,id};return this.refresh();}
    if (action==="cancel") {this.editor=null;return this.refresh();}
    if (action==="addingredient") {
      const rows=this.element.querySelector(".gc-ingredient-rows");
      const mats=settingsDB().materials.map(m=>[m.id,m.name]);
      if (!mats.length) return toast("Първо създай материал.",true);
      rows?.insertAdjacentHTML("beforeend",this.ingRow({id:mats[0][0],qty:1},mats,0));return;
    }
    if (action==="removeingredient") {const rows=this.element.querySelectorAll(".gc-ing-row"); if(rows.length>1)button.closest(".gc-ing-row")?.remove(); else toast("Рецептата трябва да има поне една съставка.",true);return;}
    if (action==="delete") return this.runLocked(()=>this.removeEntry(button.dataset.kind,id));
    if (action==="limit") return this.runLocked(()=>this.setLimit());
    if (action==="resetattempts") return this.runLocked(()=>this.resetAttempts());
  }
  handleInput(e) {
    if (!e.target.matches("[data-search]")) return;
    this.search = e.target.value;
    // Avoid rerendering a focused search control on every keystroke.
    const q = this.search.trim().toLowerCase();
    const root=e.target.closest(".gc-content");
    root?.querySelectorAll(".gc-grid .gc-tile").forEach(card=>{
      card.hidden=!!q && !card.textContent.toLowerCase().includes(q);
    });
  }
  handleChange(e) {
    if (e.target.name === "actor") {this.actorId=e.target.value;return this.refresh();}
  }
  handleSubmit(e) {
    if (!e.target.matches("[data-editor-form]")) return;
    e.preventDefault();
    if (!game.user.isGM || this.busy) return;
    return this.runLocked(()=>this.saveEntry(e.target));
  }
  async runLocked(fn) {
    if (this.busy) return;
    this.busy = true;
    try {await fn();}
    catch(err) {console.error(`${ID} | action failed`,err);toast(err.message||"Неочаквана грешка.",true);}
    finally {this.busy=false;await this.refresh();}
  }
  checkActor() {
    const a=this.actor;
    if (!a || !(game.user.isGM || a.isOwner)) throw new Error("Нямаш права за този герой.");
    return a;
  }
  async gather(nodeId) {
    const actor=this.checkActor(),db=settingsDB();
    const node=db.nodes.find(n=>n.id===nodeId && n.active);
    if(!node) throw new Error("Находището е затворено.");
    const mat=resource(node.materialId,db);
    if(!mat) throw new Error("Този материал вече не съществува.");
    const limit=int(db.settings.dailyLimit,6,1,100),used=attempts(actor);
    if(used>=limit) throw new Error("Нямаш оставащи опити. GM трябва да ги възстанови.");
    const isBold=this.gatherMode==="bold";
    const dc=int(node.dc,12,1,40)+(isBold?3:-2);
    const bonus=skillBonus(actor,node.skill);
    const roll=await new Roll("1d20 + @bonus",{bonus}).evaluate();
    // Consume one attempt even on failure. Only a single user's action can be in flight in this window.
    await actor.setFlag(ID,"attempts",used+1);
    const success=roll.total>=dc;
    let qty=0,bonusText="";
    if(success) {
      const min=int(node.minYield,1,1,20),max=Math.max(min,int(node.maxYield,2,1,20));
      qty=min+Math.floor(Math.random()*(max-min+1));
      if(isBold)qty*=2;
      await grantMaterial(actor,mat,qty);
      const bonusMat=resource(node.bonusId,db);
      if(bonusMat && Math.random()*100 < int(node.bonusChance,0,0,100)) {
        await grantMaterial(actor,bonusMat,1);
        bonusText=`<p>✨ Рядка находка: <b>${esc(bonusMat.name)} ×1</b></p>`;
      }
    }
    await publish(actor,`<p><b>${esc(actor.name)}</b> ${success?"успя":"не успя"} да събере от <b>${esc(node.name)}</b>.</p><p>🎲 ${esc(skillLabel[node.skill]||node.skill)} ${roll.total} срещу DC ${dc} (${isBold?"рисковано":"внимателно"})</p>${success?`<p>🎒 <b>${esc(mat.name)} ×${qty}</b></p>${bonusText}`:"<p>Не са получени материали. Опитът е изразходван.</p>"}`);
    toast(success?`Получени: ${mat.name} ×${qty}`:"Неуспешно събиране.");
  }
  async craft(recipeId) {
    const actor=this.checkActor(),db=settingsDB();
    const recipe=db.recipes.find(r=>r.id===recipeId);
    if(!recipe) throw new Error("Рецептата е изтрита.");
    const inspired=this.craftMode==="inspired";
    const needed=requirements(actor,recipe,db,inspired);
    if(!needed.length||needed.some(i=>!i.material||i.have<i.qty)) throw new Error("Нямаш необходимите съставки.");
    // Validate source before spending materials.
    if(recipe.outputItemUuid) {
      const src=await fromUuid(recipe.outputItemUuid);
      if(!src || src.documentName!=="Item") throw new Error("Липсва избраният изходен Item. Свържи нов от GM Studio.");
    }
    const ingredientList=needed.map(i=>({id:i.id,qty:i.qty}));
    let bonus=0,roll=null,twice=false;
    if(inspired) {
      bonus=skillBonus(actor,recipe.category==="alchemy"||recipe.category==="arcane"?"inv":"ath");
      roll=await new Roll("1d20 + @bonus",{bonus}).evaluate();
      twice=roll.total>=int(recipe.dc,12,1,40);
    }
    let spent=false;
    const amount=int(recipe.outputQuantity,1,1,99)*(twice?2:1);
    try {
      await consumeMaterials(actor,ingredientList);
      spent=true;
      await grantCraft(actor,recipe,amount);
    } catch(error) {
      if(spent) {try {await refundMaterials(actor,ingredientList,db);} catch(refundError){console.error(`${ID} | refund failed`,refundError);toast("ВНИМАНИЕ: връщането на материалите е неуспешно. Свържи се с GM.",true);}}
      throw error;
    }
    try {
      await publish(actor,`<p><b>${esc(actor.name)}</b> изработи <b>${esc(recipe.name)} ×${amount}</b>.</p><p>${inspired?`🎲 Майсторски опит: ${roll.total} срещу DC ${int(recipe.dc,12,1,40)} — ${twice?"бонус резултат ×2":"стандартен резултат"}.`:"🔨 Сигурна изработка без проверка."}</p>`);
    } catch(chatError) {console.warn(`${ID} | chat summary could not be sent`,chatError);}
    toast(`Изработено: ${recipe.name} ×${amount}`);
  }
  async setLimit() {
    if(!game.user.isGM) return;
    const input=this.element.querySelector('input[name="dailyLimit"]');
    const db=clone(settingsDB());
    db.settings.dailyLimit=int(input?.value,6,1,100);
    await game.settings.set(ID,"database",db);
    toast("Лимитът е запазен.");
  }
  async resetAttempts() {
    if(!game.user.isGM) return;
    const actor=this.actor;
    if(!actor) throw new Error("Избери герой.");
    await actor.setFlag(ID,"attempts",0);
    toast(`Опитите на ${actor.name} са възстановени.`);
  }
  async removeEntry(kind,elementId) {
    if(!game.user.isGM) return;
    const key={material:"materials",node:"nodes",recipe:"recipes"}[kind];
    if(!key)return;
    const db=clone(settingsDB()), el=db[key].find(v=>v.id===elementId);
    if(!el)return;
    if(kind==="material" && (db.nodes.some(n=>n.materialId===elementId||n.bonusId===elementId)||db.recipes.some(r=>r.ingredients.some(i=>i.id===elementId)))) throw new Error("Материалът се използва в находище/рецепта. Първо промени зависимите записи.");
    if(!await foundry.applications.api.DialogV2.confirm({window:{title:"Изтриване"}, content:`<p>Да изтрия ли <b>${esc(el.name)}</b> от библиотеката?</p>`}))return;
    db[key]=db[key].filter(v=>v.id!==elementId);
    await game.settings.set(ID,"database",db);
    this.editor={kind,id:null};
    toast("Елементът е изтрит.");
  }
  async saveEntry(form) {
    if(!game.user.isGM)return;
    const db=clone(settingsDB());
    const kind=this.editor?.kind, key={material:"materials",node:"nodes",recipe:"recipes"}[kind];
    if(!key)throw new Error("Няма избран редактор.");
    const fd=new FormData(form);
    const name=String(fd.get("name")||"").trim().slice(0,90);
    if(!name)throw new Error("Попълни име.");
    const entry={id:this.editor.id || idNew(),name,description:String(fd.get("description")||"").trim().slice(0,300),icon:safeIcon(fd.get("icon"))};
    if(kind==="material"){entry.color=safeColor(fd.get("color")); entry.img=String(fd.get("img")||"").trim().slice(0,250);}
    if(kind==="node") {
      if(!db.materials.length)throw new Error("Първо добави материал.");
      entry.materialId=String(fd.get("materialId")||"");
      entry.bonusId=String(fd.get("bonusId")||"");
      entry.bonusChance=int(fd.get("bonusChance"),0,0,100);
      entry.skill=SKILLS.some(x=>x[0]===fd.get("skill"))?String(fd.get("skill")):"sur";
      entry.dc=int(fd.get("dc"),12,1,40);
      entry.minYield=int(fd.get("minYield"),1,1,20);
      entry.maxYield=Math.max(entry.minYield,int(fd.get("maxYield"),2,1,20));
      entry.active=fd.get("active")==="on";
      if(!resource(entry.materialId,db))throw new Error("Избери валиден основен материал.");
    }
    if(kind==="recipe") {
      entry.img=String(fd.get("img")||"").trim().slice(0,250);
      const ids=fd.getAll("ing-id").map(String);
      const qtys=fd.getAll("ing-qty");
      const merged=new Map();
      ids.forEach((materialId,i)=>merged.set(materialId,(merged.get(materialId)||0)+int(qtys[i],1,1,99)));
      entry.ingredients=[...merged].map(([id,qty])=>({id,qty:Math.min(qty,999)}));
      if(!entry.ingredients.length||entry.ingredients.some(i=>!resource(i.id,db)))throw new Error("Рецептата трябва да има валидни съставки.");
      entry.category=categories[fd.get("category")] && fd.get("category")!=="all" ?String(fd.get("category")):"smithing";
      entry.outputItemUuid=String(fd.get("outputItemUuid")||"");
      if(entry.outputItemUuid && !game.items.contents.some(i=>i.uuid===entry.outputItemUuid))throw new Error("Избери валиден Item от World Items.");
      entry.outputQuantity=int(fd.get("outputQuantity"),1,1,99);
      entry.dc=int(fd.get("dc"),12,1,40);
    }
    const index=db[key].findIndex(v=>v.id===entry.id);
    if(index>=0)db[key][index]=entry; else db[key].push(entry);
    await game.settings.set(ID,"database",db);
    this.editor={kind,id:entry.id};
    toast("Запазено в световната библиотека.");
  }
}

let app;
const openUI = (actor) => {
  if (!app) app=new GatheringCrafting();
  if(actor && (game.user.isGM||actor.isOwner)) app.actorId=actor.id;
  app.render({force:true});
  return app;
};

function mountLauncher(html, selector, actor) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if(!root) return;
  const parent = root.querySelector(selector);
  if(!parent || parent.querySelector(".gc-launcher")) return;
  const btn=document.createElement("button");
  btn.type="button";
  btn.className="gc-launcher";
  btn.title="Gathering & Crafting";
  btn.innerHTML=`${glyph("fa-hammer")} <span>Gathering & Crafting</span>`;
  btn.addEventListener("click",e=>{e.preventDefault();openUI(actor);});
  parent.append(btn);
}

Hooks.once("init",()=>{
  if(game.system.id!=="dnd5e")return;
  game.settings.register(ID,"database",{name:"Gathering & Crafting Database",scope:"world",config:false,type:Object,default:clone(DEMO),onChange:()=>{if(app?.rendered)app.render();}});
  game.keybindings.register(ID,"open",{
    name:"Отвори Gathering & Crafting",hint:"Показва събиране и изработка на избрания герой.",
    editable:[{key:"KeyG",modifiers:["ALT"]}],
    onDown:()=>{openUI();return true;},restricted:false,precedence:CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
});
Hooks.once("ready",()=>{
  if(game.system.id!=="dnd5e") {
    if(game.user.isGM)toast("Gathering & Crafting изисква dnd5e система.",true);
    return;
  }
  const mod=game.modules.get(ID);
  if(mod)mod.api={open:openUI, getDatabase:()=>clone(settingsDB()),version:"0.1.0"};
  if(game.user.isGM && !validWorldDB(settingsDB()))toast("Gathering & Crafting: Невалидна библиотека, провери настройките.",true);
});
// Actor Directory and actor-sheet quick launches are additive; they never replace native controls.
for(const hook of ["renderActorDirectory","renderActorDirectoryV2"]) {
  Hooks.on(hook,(app,html)=>mountLauncher(html,".directory-header, header.directory-header, .header-actions",null));
}
for(const hook of ["renderActorSheet","renderActorSheetV2"]) {
  Hooks.on(hook,(sheet,html)=>{
    const actor=sheet.actor||sheet.document;
    if(!actor || !["character","npc"].includes(actor.type) || !(game.user.isGM||actor.isOwner))return;
    mountLauncher(html,".sheet-header, .window-header .window-controls",actor);
  });
}
