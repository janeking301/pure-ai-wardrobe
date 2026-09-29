const CACHE='pure-wardrobe-v10';
const APP=['./','./index.html','./app.js','./debug.js','./manifest.json'];
const PATCH=`
// Pure AI Wardrobe import hotfix v10
(()=>{
  const cleanJSONText=raw=>String(raw||'').replace(/^\\uFEFF/,'').trim().replace(/^```(?:json)?\\s*/i,'').replace(/\\s*```$/,'').trim().replace(/[“”„‟＂]/g,'"').replace(/[‘’＇]/g,"'");
  const parseImportJSON=raw=>{let s=cleanJSONText(raw),a=s.indexOf('['),b=s.lastIndexOf(']');if(a>=0&&b>=a)s=s.slice(a,b+1);const p=JSON.parse(s);return Array.isArray(p)?p:(Array.isArray(p.items)?p.items:Array.isArray(p.data)?p.data:[p])};
  window.importAI=async function(){
    const ta=document.getElementById('importText');
    try{
      const raw=ta?.value?.trim()||'';if(!raw)return toast('❌ 沒有讀到 JSON 內容');
      const rows=parseImportJSON(raw);if(!rows.length)return toast('❌ JSON 沒有單品資料');
      const needsPhoto=rows.some(x=>Number(x?.photo||x?.sourcePhoto||0)>0&&x?.crop);
      const fs=[...(document.getElementById('splitFiles')?.files||[])];
      let sid=null;
      if(needsPhoto){
        if(fs.length)sid=await putPhotos(fs);else sid=localStorage.getItem('pureAIWardrobePhotoSession');
        if(!sid){toast('❌ 找不到這批原始穿搭照，請重新選照片後再匯入');return}
      }
      const aliases={'連衣裙':'洋裝','連身裙':'洋裝','裙子':'下身','褲子':'下身','鞋':'鞋子','襪':'襪子','包':'包包','飾品':'配件'};
      const validCats=['上衣','下身','洋裝','外套','鞋子','包包','襪子','配件','其他'];
      const out=[];
      for(const x of rows){
        let img=x.img||x.image||x.photoUrl||'';const p=Number(x.photo||x.sourcePhoto||0);
        if(!img&&p&&x.crop&&sid){const blob=await getPhoto(sid,p);if(!blob)throw new Error('找不到第 '+p+' 張原始照片');img=await crop(blob,x.crop)}
        let c=String(x.cat||x.category||'其他');c=aliases[c]||c;if(!validCats.includes(c))c='其他';
        out.push({id:uid(),img,name:String(x.name||'未命名單品'),cat:c,color:Array.isArray(x.color)?x.color.join('、'):String(x.color||''),tags:Array.isArray(x.tags)?x.tags.join('、'):String(x.tags||''),note:String(x.note||''),last:0});
      }
      const old=db.items;db.items=out;if(!save()){db.items=old;return}ta.value='';cat='全部';render();tab('closet');toast('已加入 '+out.length+' 件單品 ✦');
    }catch(e){console.error('IMPORT HOTFIX',e);toast('❌ 匯入失敗：'+(e?.message||e?.name||'未知錯誤'))}
  };
  window.runDebug=async function(){
    const out=[];const check=(n,ok,d='')=>out.push((ok?'✅ ':'❌ ')+n+(d?'：'+d:''));
    try{
      check('JavaScript 主程式',true,'app.js 已執行（v10 修正版）');
      const ta=document.getElementById('importText'),raw=ta?.value?.trim()||'';check('JSON 輸入框',!!ta,raw?'有內容':'目前沒有內容');
      let rows=null;if(raw){try{rows=parseImportJSON(raw);check('JSON 格式',true,rows.length+' 件，智慧引號已自動處理')}catch(e){check('JSON 格式',false,e.message)}}
      const fs=[...(document.getElementById('splitFiles')?.files||[])];check('目前頁面選取的原始照片',fs.length>0,fs.length+' 張');
      const sid=localStorage.getItem('pureAIWardrobePhotoSession');check('照片 Session',!!sid,sid?'存在':'不存在');
      try{const d=await openDB();const count=await new Promise((ok,no)=>{const r=d.transaction('photos').objectStore('photos').count();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});d.close();check('IndexedDB 原圖儲存',count>0,count+' 個照片物件')}catch(e){check('IndexedDB 原圖儲存',false,e.message)}
      check('衣櫥資料儲存',Array.isArray(db?.items),Array.isArray(db?.items)?db.items.length+' 件現有單品':'無法讀取');
      check('JS / Promise 錯誤',true,'尚未捕捉到 JS / Promise 錯誤');
    }catch(e){check('偵錯程式',false,e.message)}
    alert(out.join('\\n'));
  };
})();`;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(async r=>{if(r.ok){const c=await caches.open(CACHE);c.put(req,r.clone());return r}const cached=await caches.match('./index.html');return cached||r}).catch(()=>caches.match('./index.html')));return;
  }
  if(new URL(req.url).pathname.endsWith('/app.js')){
    e.respondWith(fetch(req,{cache:'no-store'}).then(async r=>{if(!r.ok)return r;const text=await r.text();const body=text+'\\n'+PATCH;const headers=new Headers(r.headers);headers.set('content-type','application/javascript; charset=utf-8');const out=new Response(body,{status:r.status,statusText:r.statusText,headers});const c=await caches.open(CACHE);c.put(req,out.clone());return out}).catch(()=>caches.match(req)));return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});