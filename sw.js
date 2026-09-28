const CACHE='gt-v6-2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./assets/life-data.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET')return;
 if(url.origin!==self.location.origin||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/rest/'))return;
 if(url.origin===self.location.origin && url.pathname.startsWith('/api/')){
   e.respondWith(fetch(req)); return;
 }
 if(req.mode==='navigate'){
   e.respondWith(fetch(req).then(resp=>{const clone=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',clone));return resp}).catch(()=>caches.match('./index.html')));return;
 }
 if(url.pathname.endsWith("/assets/life-data.js")){
   e.respondWith(fetch(req).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone))}return resp}).catch(()=>caches.match(req)));return;
 }
 if(url.origin===self.location.origin && ASSETS.some(a=>url.pathname.endsWith(a.replace('./','/')))){
   e.respondWith(caches.match(req).then(r=>r||fetch(req).then(resp=>{const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone));return resp})));return;
 }
 e.respondWith(fetch(req));
});
