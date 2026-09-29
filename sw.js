const CACHE='pure-wardrobe-v9';
const APP=['./','./index.html','./app.js','./debug.js','./manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(async r=>{
      if(r.ok){const c=await caches.open(CACHE);c.put(req,r.clone());return r}
      const cached=await caches.match('./index.html');
      return cached||r;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});