/* Reproducible build: run `node chess/src/build.js` from anywhere.
   Reads sources in this dir, auto-bumps the SW cache version, writes to ../ (chess/). */
const fs=require('fs');
const path=require('path');
const SRC=__dirname+path.sep;
const OUT=path.resolve(__dirname,'..')+path.sep;
const read=f=>fs.readFileSync(SRC+f,'utf8');
const b64=f=>fs.readFileSync(SRC+'fonts'+path.sep+f).toString('base64');

// auto-bump cache version
let ver=8; try{ver=parseInt(fs.readFileSync(SRC+'version.txt','utf8').trim())||8;}catch(e){}
ver+=1; fs.writeFileSync(SRC+'version.txt',String(ver));

const fontFace=(w,file)=>`@font-face{font-family:'Heebo';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/ttf;base64,${b64(file)}) format('truetype');}`;
const fonts=[fontFace(400,'Heebo-400.ttf'),fontFace(700,'Heebo-700.ttf'),fontFace(800,'Heebo-800.ttf')].join('\n');
const css=read('app.css');
const template=read('template.html');
const js=[read('engine.js'),read('ai.js'),read('content.js'),read('app.js')].join('\n;\n');

const html=`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>מאמן השחמט · 900 → 1400</title>
<meta name="description" content="אפליקציית תרגול שחמט: מסלול לימוד מדורג, מאמן פתיחות, תרגילים, סיומים ומשחק חי.">
<meta name="theme-color" content="#1f4433">
<meta name="theme-color" content="#0f1512" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="מאמן שחמט">
<meta name="robots" content="noindex">
<style>
${fonts}
${css}
</style>
</head>
<body>
${template}
<script>
${js}
</script>
<script>
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
</script>
</body>
</html>`;
fs.writeFileSync(OUT+'index.html',html);

const manifest={
  name:"מאמן השחמט · 900→1400", short_name:"מאמן שחמט",
  description:"תרגול שחמט: מסלול מדורג, פתיחות, מוטיבים, סיומים ומשחק מול המחשב",
  lang:"he", dir:"rtl", start_url:".", scope:".", id:"./",
  display:"standalone", orientation:"any",
  background_color:"#e9e0cd", theme_color:"#1f4433",
  icons:[
    {src:"icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},
    {src:"icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},
    {src:"icon-maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}
  ]
};
fs.writeFileSync(OUT+'manifest.webmanifest',JSON.stringify(manifest,null,2));

const sw=`const CACHE='chess-trainer-v${ver}';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{try{const cp=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}catch(x){}return resp;}).catch(()=>caches.match('./index.html'))));});`;
fs.writeFileSync(OUT+'sw.js',sw);

console.log('built chess/index.html — cache v'+ver+' — '+(html.length/1024).toFixed(0)+'KB');
