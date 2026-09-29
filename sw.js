const CACHE='pure-wardrobe-v11';
const APP=['./','./index.html','./app.js','./debug.js','./manifest.json'];
const JSON_HOTFIX=`// Pure AI Wardrobe import hotfix v11
;(()=>{
  const __normalizeJSON=(raw)=>{
    let s=String(raw??'').replace(/^\uFEFF/,'').trim();
    s=s.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    s=s.replace(/[“”＂]/g,'\"').replace(/[‘’]/g,"'");
    const a=s.indexOf('['),b=s.lastIndexOf(']');
    if(a>=0&&b>=a)s=s.slice(a,b+1);
    const p=JSON.parse(s);
    return Array.isArray(p)?p:(Array.isArray(p.items)?p.items:Array.isArray(p.data)?p.data:[p]);
  };
  window.normalize=__normalizeJSON;
})();\n`;
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
  if(new URL(req.url).pathname.endsWith('/app.js')){
    e.respondWith(fetch(req,{cache:'no-store'}).then(async r=>{
      if(!r.ok)return r;
      const text=await r.text();
      const headers=new Headers(r.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      return new Response(text+'\n'+JSON_HOTFIX,{status:r.status,statusText:r.statusText,headers});
    }).catch(()=>caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
