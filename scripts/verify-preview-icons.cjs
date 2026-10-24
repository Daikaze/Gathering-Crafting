#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const catalog=JSON.parse(fs.readFileSync(path.join(root,"data/catalog.json"),"utf8"));
const ids=[...catalog.recipes.map(x=>["recipe:"+x.id,x.img]),...catalog.materials.map(x=>["material:"+x.id,x.img])];
const files=new Map();
function localPath(img) {
  const prefix="modules/gathering-crafting/";
  if(typeof img!=="string"||!img.startsWith(prefix))throw Error("Invalid module icon path "+img);
  const relative=img.slice(prefix.length);
  if(!relative.startsWith("icons/")||!relative.endsWith(".webp")||relative.includes(".."))throw Error("Unsafe icon path "+relative);
  return relative;
}
function dimensions(buf) {
 if(buf.length<30||buf.toString("ascii",0,4)!=="RIFF"||buf.toString("ascii",8,12)!=="WEBP")throw Error("Invalid WebP");
 const kind=buf.toString("ascii",12,16);
 if(kind==="VP8 ")return [buf.readUInt16LE(26)&0x3fff,buf.readUInt16LE(28)&0x3fff];
 if(kind==="VP8L")return [1+(buf[21]|((buf[22]&0x3f)<<8)),1+((buf[22]>>6)|(buf[23]<<2)|((buf[24]&15)<<10))];
 if(kind==="VP8X")return [1+buf.readUIntLE(24,3),1+buf.readUIntLE(27,3)];
 throw Error("Unsupported WebP "+kind);
}
if(ids.length!==224)throw Error("Expected 224 catalog entries; found "+ids.length);
for(const [id,img] of ids){
 const rel=localPath(img),absolute=path.resolve(root,rel);
 if(!absolute.startsWith(root+path.sep))throw Error("Unsafe path");
 if(files.has(rel))throw Error("Repeated icon path "+rel);
 files.set(rel,id);
 if(!fs.existsSync(absolute))throw Error("Missing icon for "+id+": "+rel);
 const buf=fs.readFileSync(absolute);
 const [w,h]=dimensions(buf);
 if(w!==256||h!==256)throw Error("Preview icon must be 256x256: "+id+" = "+w+"x"+h);
 const hash=crypto.createHash("sha256").update(buf).digest("hex");
 if(!globalThis.__iconHashes)globalThis.__iconHashes=new Set();
 if(globalThis.__iconHashes.has(hash))throw Error("Duplicate image bytes: "+id);
 globalThis.__iconHashes.add(hash);
}
console.log("PASS: 224 unique catalog icon paths, 224 unique 256x256 WebPs");
