// Validate the individual-artwork workstream. Does not change production catalogues.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'production-manifest.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const expected=[
 ...catalog.recipes.filter(x=>x.category==='metallurgy').map(x=>['recipe',x]),
 ...catalog.recipes.filter(x=>x.category==='alchemy').map(x=>['recipe',x]),
 ...catalog.materials.map(x=>['material',x])
];
assert.equal(expected.length,224); assert.equal(plan.items.length,224);
const allowed=new Set(['not-generated','generated','needs-revision','approved']);
const paths=new Set(), digests=new Map();let approved=0, present=0, missing=[];
for(let i=0;i<expected.length;i++){
 const [type,entry]=expected[i], item=plan.items[i];
 assert.equal(item.id,`${type}:${entry.id}`);
 assert.equal(item.name,entry.name);
 assert.equal(item.target,`icons/original/${type}s/${entry.id}.webp`);
 assert.ok(allowed.has(item.status),item.id);
 assert.ok(!paths.has(item.target),`duplicate output filename: ${item.target}`);paths.add(item.target);
 assert.ok(item.prompt.includes('ONE original')&&item.prompt.includes('ONE')&&item.prompt.includes('No characters'),`non-standalone instruction: ${item.id}`);
 const dest=path.resolve(root,item.target);
 assert.ok(dest.startsWith(root+path.sep),'unsafe destination');
 if(!fs.existsSync(dest)){
   missing.push(item.id); assert.notEqual(item.status,'approved',`approved but missing: ${item.id}`);continue;
 }
 const file=fs.readFileSync(dest);present++;
 assert.ok(file.length>10000,`too little image data: ${item.id}`);
 assert.equal(file.toString('ascii',0,4),'RIFF');
 assert.equal(file.toString('ascii',8,12),'WEBP');
 const sha=crypto.createHash('sha256').update(file).digest('hex');
 assert.ok(!digests.has(sha),`byte-identical images: ${item.id} vs ${digests.get(sha)}`);
 digests.set(sha,item.id);
 if(item.status==='approved'){
   for(const [k,v] of Object.entries(item.review))assert.equal(v,true,`approval check ${k} missing: ${item.id}`);
   approved++;
 }
}
const allDone=approved===224&&missing.length===0;
console.log(`Independent paintings: ${approved}/224 approved; ${present}/224 WebP assets saved; ${missing.length} missing.`);
if(process.argv.includes('--complete')) assert.ok(allDone,'STOP: Original artwork production is not finished. Do not publish yet.');
