/** Runtime-only artwork references to installed Compendiums. Never redistributes assets. */
export const ART_CHANNELS={blacksmithing:'Legacy Content',alchemy:'Potion Crafting & Ingredients'};
const state={packs:[],matched:{blacksmithing:null,alchemy:null},art:new Map(),counts:{blacksmithing:0,alchemy:0},errors:[]};
const norm=s=>String(s||'').toLocaleLowerCase('en-US').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const compact=s=>norm(s).replace(/\s/g,'');
const isItemPack=p=>p?.documentName==='Item'||p?.metadata?.type==='Item';
function packs(){const p=game?.packs;return Array.from(p?.contents||p?.values?.()||[]).filter(isItemPack);}
function searchText(pack){const packageName=pack.metadata?.packageName||pack.metadata?.package||pack.collection?.split('.')[0]||'';
 const title=game?.modules?.get?.(packageName)?.title||'';
 return [pack.title,pack.metadata?.label,pack.label,pack.metadata?.name,pack.collection,title,packageName].filter(Boolean).join(' ');}
function scorePack(pack,channel){const raw=norm(searchText(pack));const key=compact(searchText(pack));const isLegacy=channel==='blacksmithing';
 if(isLegacy){if(/pathfinder|pf2e|starfinder/.test(raw))return 0;
  if(/legacy content/.test(raw))return /dnd5e|foundry|dungeon|5e/.test(raw)?110:100;
  if(key.includes('legacycontent'))return 90;
  return 0;
 }
 if(/potion crafting.*ingredient|potion.*crafting.*ingredient|potioncraftingingredient/.test(raw)||key.includes('potioncraftingingredient'))return 120;
 if(/potion crafting/.test(raw))return 85;
 return 0;
}
function validImage(path){return typeof path==='string'&&path.length>3&&!/^(?:icons\/svg\/|systems\/dnd5e\/icons\/svg\/)/i.test(path)&&!/[<>]/.test(path);}
function indexing(entries){return Array.isArray(entries)?entries:Array.from(entries?.contents||entries?.values?.()||[]);}
const aliases={
 'iron-dagger':['dagger'], 'steel-dagger':['dagger'], 'steel-sword':['longsword'], 'silvered-blade':['silvered longsword','longsword'],
 'mithral-blade':['scimitar'], 'adamantine-blade':['adamantine longsword','longsword'],
 'steel-spear':['spear'], 'steel-shield':['shield'], 'dusksteel-buckler':['shield'], 'adamantine-shield':['shield'],
 'steel-chain-shirt':['chain shirt'], 'steel-helm':['helmet'], 'steel-gauntlets':['gauntlets'],
 'brass-compass':['compass'], 'steel-arrowheads':['arrowheads'],
 'healing-potion':['potion of healing'], 'minor-healing-potion':['potion of healing'],
 'greater-healing-potion':['potion of greater healing','greater healing potion'],
 'superior-healing-potion':['potion of superior healing','superior healing potion'],
 'supreme-healing-potion':['potion of supreme healing','supreme healing potion'],
 'acid-flask':['acid (vial)','acid vial','acid'], 'antitoxin':['antitoxin']
};
function entryChannel(entry){if(entry.category==='alchemy'||entry.group==='Alchemical Ingredient'||entry.group==='Monster Drop')return 'alchemy';return 'blacksmithing';}
export function artworkFor(entry){if(!entry)return 'icons/svg/item-bag.svg';
 const own=String(entry.img||'');
 // An explicit GM-supplied image always beats automatic art matching.
 if(own&&!/^modules\/gathering-crafting\/icons\//.test(own)&&!own.startsWith('icons/svg/'))return own;
 return state.art.get(`${entryChannel(entry)}:${entry.id}`)||entry.img||'icons/svg/item-bag.svg';}
export function withCompendiumArtwork(entry){return {...entry,img:artworkFor(entry)};}
export function currentArtSources(){return {packs:state.packs.map(p=>({collection:p.collection,label:p.title||p.metadata?.label||p.collection})),matched:{...state.matched},counts:{...state.counts},errors:[...state.errors]};}
export function resetArtSources(){state.packs=[];state.matched={blacksmithing:null,alchemy:null};state.art.clear();state.counts={blacksmithing:0,alchemy:0};state.errors=[];}
export async function scanCompendiumArt(db,preferred={}){
 resetArtSources();
 state.packs=packs();
 for(const channel of Object.keys(ART_CHANNELS)){
  const selected=String(preferred?.[channel]||'');
  const candidates=selected?state.packs.filter(p=>p.collection===selected):state.packs
   .map(p=>({p,score:scorePack(p,channel)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.p);
  if(!candidates.length)continue;
  const itemEntries=[...db.materials,...db.recipes].filter(e=>entryChannel(e)===channel);
  // A named installed Compendium is authoritative, even if a particular item is absent.
  for(const pack of candidates){
   try{
    const entries=indexing(await pack.getIndex({fields:['name','img','type']}));
    const lookup=new Map();
    for(const e of entries){if(!validImage(e.img)||!e.name)continue;
     const name=norm(e.name);if(name&&!lookup.has(name))lookup.set(name,e.img);
    }
    const matches=new Map();
    for(const e of itemEntries){
     const exact=lookup.get(norm(e.name));
     // Hand-picked base-item aliases: never give a random unrelated icon to an item.
     const fallback=aliases[e.id]?.map(name=>lookup.get(norm(name))).find(Boolean);
     if(exact||fallback)matches.set(`${channel}:${e.id}`,exact||fallback);
    }
    if(!state.matched[channel]||matches.size>state.counts[channel]){
     state.matched[channel]={collection:pack.collection,label:pack.title||pack.metadata?.label||pack.collection};
     state.counts[channel]=matches.size;
     for(const key of [...state.art.keys()])if(key.startsWith(`${channel}:`))state.art.delete(key);
     for(const [key,img] of matches)state.art.set(key,img);
    }
    if(selected||matches.size)break;
   }catch(e){state.errors.push(`${pack.collection}: ${e?.message||e}`);}
  }
 }
 return currentArtSources();
}
