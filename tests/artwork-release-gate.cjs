/* Release gate for original, individually painted Gathering & Crafting artwork. */
const fs=require("node:fs"), path=require("node:path"), crypto=require("node:crypto"), assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const catalog=JSON.parse(fs.readFileSync(path.join(root,"data/catalog.json"),"utf8"));
const mod=JSON.parse(fs.readFileSync(path.join(root,"module.json"),"utf8"));
const entries=[...catalog.materials,...catalog.recipes];
const byId=new Map();
for(const entry of entries){if(!byId.has(entry.id))byId.set(entry.id,[]);byId.get(entry.id).push(entry);}
const bad=[], painted=[], hashes=new Map();
for(const [id,group] of byId){
  const paths=[...new Set(group.map(e=>e.img))];
  if(paths.length!==1){bad.push(id+": same material and recipe have different artwork paths");continue;}
  const img=paths[0];
  if(!/^modules\/gathering-crafting\/icons\/handpainted\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.webp$/.test(img)||!img.endsWith("/"+id+".webp")){bad.push(id+": not yet assigned an individual named painting");continue;}
  const file=path.resolve(root,img.replace("modules/gathering-crafting/",""));
  if(!file.startsWith(path.join(root,"icons")+path.sep)){bad.push(id+": unsafe artwork path");continue;}
  if(!fs.existsSync(file)){bad.push(id+": missing artwork file");continue;}
  const bytes=fs.readFileSync(file);
  if(bytes.length<5000||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP"){bad.push(id+": invalid or implausibly small WebP");continue;}
  const hash=crypto.createHash("sha256").update(bytes).digest("hex");
  const other=hashes.get(hash);if(other){bad.push(id+": identical artwork bytes to "+other);continue;}
  hashes.set(hash,id);painted.push(id);
}
const required=process.argv.includes("--require-complete")||/^1\./.test(mod.version);
console.log("Art readiness:",painted.length+"/"+byId.size,"unique original item images;",bad.length,"not ready. Total catalogue entries:",entries.length);
if(bad.length)console.log("Missing or mismatched (first 20):",bad.slice(0,20).join("; "));
if(required&&bad.length){console.error("BLOCK RELEASE 1.0.0: incomplete independently painted artwork coverage.");process.exit(1);}
if(required)console.log("Artwork file readiness passed. Manual visual verification remains required.");
