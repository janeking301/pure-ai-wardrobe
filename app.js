const K='pureAIWardrobeFresh',IMGDB='pureAIWardrobeImagesV2',SESSION='pureAIWardrobePhotoSession';
const cats=['全部','上衣','下身','洋裝','外套','鞋子','包包','襪子','配件','其他'];let cat='全部';
const uid=()=>crypto.randomUUID?.()||Date.now()+'-'+Math.random();
const toast=t=>{const e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2400)};
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function load(){try{const x=JSON.parse(localStorage.getItem(K)||'{}');return{items:Array.isArray(x.items)?x.items:[],diary:Array.isArray(x.diary)?x.diary:[]}}catch{return{items:[],diary:[]}}}let db=load();
function save(){try{localStorage.setItem(K,JSON.stringify(db));return true}catch(e){console.error(e);toast('衣櫥資料儲存空間不足，請減少圖片數量後再試');return false}}
function clearInput(id){const e=document.getElementById(id);if(e)e.value=''}
function tab(id){document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));document.getElementById(id)?.classList.add('active');document.querySelectorAll('.nav button').forEach(e=>e.classList.remove('on'));document.getElementById('n-'+id)?.classList.add('on');render();scrollTo({top:0,behavior:'smooth'})}
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(IMGDB,2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('photos'))d.createObjectStore('photos');if(!d.objectStoreNames.contains('diary'))d.createObjectStore('diary')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function putPhotos(files){const d=await openDB(),sid=uid();return new Promise((ok,no)=>{const tx=d.transaction('photos','readwrite'),st=tx.objectStore('photos');files.forEach((f,i)=>st.put(f,sid+':'+(i+1)));tx.oncomplete=()=>{d.close();localStorage.setItem(SESSION,sid);ok(sid)};tx.onerror=()=>{d.close();no(tx.error)}})}
async function getPhoto(sid,n){if(!sid||!n)return null;const d=await openDB();return new Promise((ok,no)=>{const r=d.transaction('photos').objectStore('photos').get(sid+':'+n);r.onsuccess=()=>{d.close();ok(r.result||null)};r.onerror=()=>{d.close();no(r.error)}})}
function crop(blob,c){return new Promise((ok,no)=>{if(!blob)return ok('');const im=new Image();im.onload=()=>{try{const x=Math.max(0,Math.min(1000,+c.x||0)),y=Math.max(0,Math.min(1000,+c.y||0)),w=Math.max(1,Math.min(1000-x,+c.w||1000)),h=Math.max(1,Math.min(1000-y,+c.h||1000));const sx=im.naturalWidth*x/1000,sy=im.naturalHeight*y/1000,sw=im.naturalWidth*w/1000,sh=im.naturalHeight*h/1000,sc=Math.min(1,360/Math.max(sw,sh));const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(sw*sc));cv.height=Math.max(1,Math.round(sh*sc));cv.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,cv.width,cv.height);URL.revokeObjectURL(im.src);ok(cv.toDataURL('image/jpeg',.55))}catch(e){no(e)}};im.onerror=no;im.src=URL.createObjectURL(blob)})}
function normalize(raw){let s=String(raw||'').trim().replace(/^\uFEFF/,'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim().replace(/[“”„‟＂]/g,'\"').replace(/[‘’＇]/g,"'");const a=s.indexOf('['),b=s.lastIndexOf(']');if(a>=0&&b>=a)s=s.slice(a,b+1);const p=JSON.parse(s);return Array.isArray(p)?p:(Array.isArray(p.items)?p.items:Array.isArray(p.data)?p.data:[p])}
function getSplitFiles(){return [...(document.getElementById('splitFiles1')?.files||[]),...(document.getElementById('splitFiles2')?.files||[])]}
async function importAI(){const btn=document.getElementById('importBtn');if(btn)btn.disabled=true;try{const ta=document.getElementById('importText'),raw=ta?.value.trim();if(!raw)return toast('❌ 沒有讀到 JSON 內容');const rows=normalize(raw);if(!rows.length)return toast('❌ JSON 沒有單品資料');let sid=localStorage.getItem(SESSION);const fs=getSplitFiles();if(fs.length)sid=await putPhotos(fs);const needsPhoto=rows.some(x=>Number(x.photo||x.sourcePhoto||0)>0&&x.crop);if(needsPhoto&&!sid)return toast('❌ 找不到這批原始穿搭照，請重新選照片');const out=[];for(const x of rows){let img=x.img||x.image||x.photoUrl||'';const p=Number(x.photo||x.sourcePhoto||0);if(!img&&p&&x.crop&&sid){const blob=await getPhoto(sid,p);if(blob)try{img=await crop(blob,x.crop)}catch(e){console.error('CROP',e)}}const aliases={'連衣裙':'洋裝','連身裙':'洋裝','裙子':'下身','褲子':'下身','鞋':'鞋子','襪':'襪子','包':'包包','飾品':'配件'};let c=aliases[String(x.cat||x.category||'其他')]||String(x.cat||x.category||'其他');if(!cats.includes(c))c='其他';out.push({id:uid(),img,name:String(x.name||'未命名單品'),cat:c,color:Array.isArray(x.color)?x.color.join('、'):String(x.color||''),tags:Array.isArray(x.tags)?x.tags.join('、'):String(x.tags||''),note:String(x.note||''),last:0})}db.items=[...db.items,...out];if(!save())return;ta.value='';cat='全部';render();toast(`已加入 ${out.length} 件單品 ✦`)}catch(e){console.error('IMPORT',e);toast('❌ JSON 匯入失敗：'+(e?.message||e?.name||'格式錯誤'))}finally{if(btn)btn.disabled=false}}
function addItems(){const input=document.getElementById('itemFiles'),fs=[...(input?.files||[])];if(!fs.length)return toast('先選單品照');let done=0;fs.forEach(f=>{const r=new FileReader();r.onload=()=>{db.items.push({id:uid(),img:r.result,name:f.name.replace(/\.[^.]+$/,''),cat:'其他',color:'',tags:'',note:'',last:0});done++;if(done===fs.length&&save()){clearInput('itemFiles');render();toast(`已加入 ${fs.length} 件單品 ✦`)}};r.onerror=()=>toast('❌ 單品圖片讀取失敗');r.readAsDataURL(f)})}
function updateUploadCount(){[['splitFiles1','splitLabel1','照片 1'],['splitFiles2','splitLabel2','照片 2']].forEach(([id,label,base])=>{const e=document.getElementById(id),l=document.getElementById(label);if(e&&l)l.textContent=e.files.length?`${base}・已選 ${e.files.length} 張`:base});const fs=getSplitFiles();if(fs.length)putPhotos(fs).then(()=>toast(`已保存 ${fs.length} 張穿搭照 ✦`)).catch(e=>console.error(e))}
function simplifyStyleUI(){document.querySelector('.actions')?.remove();let s=document.getElementById('simpleStyleCSS');if(!s){s=document.createElement('style');s.id='simpleStyleCSS';s.textContent='.simple-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.simple-upload{padding:14px;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer}.simple-upload small{color:var(--muted);font-size:11px;margin-top:4px}.simple-upload input{margin-top:10px}.json-big{display:block;width:100%;min-height:420px;resize:vertical;border:1px solid var(--line);border-radius:15px;background:#fff;padding:13px;color:var(--text);outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6}.full{width:100%;margin-top:10px}';document.head.appendChild(s)}const style=document.getElementById('classify');if(!style)return;style.innerHTML=`<div class="hero ai"><h2>分類</h2><div class="simple-upload-grid"><label class="upload simple-upload"><span class="big">📸</span><strong id="splitLabel1">照片 1</strong><small>上傳穿搭照</small><input id="splitFiles1" type="file" accept="image/*" multiple></label><label class="upload simple-upload"><span class="big">📸</span><strong id="splitLabel2">照片 2</strong><small>可再放另一批照片</small><input id="splitFiles2" type="file" accept="image/*" multiple></label></div></div><div class="hero"><h2>JSON</h2><textarea id="importText" class="json-big" rows="18" placeholder='把 ChatGPT 回傳的 JSON 直接貼在這裡'></textarea><button id="importBtn" class="btn full" onclick="importAI()">加入我的衣櫥</button></div>`;document.getElementById('splitFiles1')?.addEventListener('change',updateUploadCount);document.getElementById('splitFiles2')?.addEventListener('change',updateUploadCount)}

const DAILY_OUTFIT_KEY='pureAIWardrobeDailyOutfit';
const outfitPick=(arr,rng,used)=>{
  const pool=arr.filter(x=>!used.has(x.id));
  if(!pool.length)return null;
  const x=pool[Math.floor(rng()*pool.length)];
  used.add(x.id);
  return x;
};
const outfitRng=seed=>{
  let n=0;
  for(let i=0;i<seed.length;i++)n=(n*31+seed.charCodeAt(i))>>>0;
  return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296};
};
function buildOutfit(force=false){
  const all=db.items||[];
  const by=c=>all.filter(x=>x.cat===c);
  const tops=by('上衣'),bottoms=by('下身'),dresses=by('洋裝'),shoes=by('鞋子'),bags=by('包包'),socks=by('襪子'),outers=by('外套'),accessories=by('配件');
  if(!all.length)return [];
  const today=new Date().toLocaleDateString('sv-SE');
  let rng=force?Math.random:outfitRng(today+'|'+all.map(x=>x.id).join('|'));
  if(!force){
    try{
      const saved=JSON.parse(localStorage.getItem(DAILY_OUTFIT_KEY)||'null');
      if(saved?.date===today&&Array.isArray(saved.ids)){
        const savedItems=saved.ids.map(id=>all.find(x=>x.id===id)).filter(Boolean);
        if(savedItems.length)return savedItems;
      }
    }catch{}
  }
  const used=new Set(),result=[];
  const useDress=dresses.length&&(!tops.length||!bottoms.length||rng()<0.38);
  if(useDress){
    const dress=outfitPick(dresses,rng,used);if(dress)result.push({item:dress,label:'洋裝'});
  }else{
    const top=outfitPick(tops,rng,used);if(top)result.push({item:top,label:'上衣'});
    const bottom=outfitPick(bottoms,rng,used);if(bottom)result.push({item:bottom,label:'下身'});
  }
  const shoe=outfitPick(shoes,rng,used);if(shoe)result.push({item:shoe,label:'鞋子'});
  if(outers.length&&rng()<0.48){const outer=outfitPick(outers,rng,used);if(outer)result.push({item:outer,label:'外套'})}
  if(bags.length&&rng()<0.65){const bag=outfitPick(bags,rng,used);if(bag)result.push({item:bag,label:'包包'})}
  if(socks.length&&rng()<0.62){const sock=outfitPick(socks,rng,used);if(sock)result.push({item:sock,label:'襪子'})}
  if(accessories.length&&rng()<0.55){const acc=outfitPick(accessories,rng,used);if(acc)result.push({item:acc,label:'配件'})}
  if(result.length&&(!force)){
    localStorage.setItem(DAILY_OUTFIT_KEY,JSON.stringify({date:today,ids:result.map(x=>x.item.id)}));
  }
  return result;
}
function outfitCard(x){
  const src=x.item.img||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="100%" height="100%" fill="#eee9e5"/><text x="50%" y="50%" text-anchor="middle" fill="#9b8d86" font-size="25">圖片未建立</text></svg>');
  return `<article class="card"><img src="${src}" loading="lazy"><div class="pad"><div class="meta" style="color:var(--rose);font-weight:700">${esc(x.label)}</div><div class="name" style="margin-top:4px">${esc(x.item.name)}</div><div class="meta">${esc(x.item.color||'')}</div></div></article>`;
}
function renderOutfit(){
  const grid=document.getElementById('outfitGrid'),date=document.getElementById('outfitDate'),note=document.getElementById('outfitNote');
  if(!grid)return;
  const today=new Date();
  const dateText=today.toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  if(date)date.innerHTML=`<b>${dateText}</b><span>今日穿搭</span>`;
  const outfit=buildOutfit(false);
  if(!outfit.length){
    grid.innerHTML='<div class="empty">👗<br><br>衣櫥還沒有足夠單品。<br>先到「分類」把穿搭照整理進衣櫥吧。</div>';
    if(note)note.style.display='none';
    return;
  }
  grid.innerHTML=outfit.map(outfitCard).join('');
  if(note){
    const missing=[];
    if(!outfit.some(x=>x.label==='上衣'||x.label==='洋裝'))missing.push('上衣／洋裝');
    if(!outfit.some(x=>x.label==='下身'||x.label==='洋裝'))missing.push('下身');
    if(!outfit.some(x=>x.label==='鞋子'))missing.push('鞋子');
    note.textContent=missing.length?`衣櫥目前少了：${missing.join('、')}。有新增單品後，重新抽一套就會一起納入。`:'這套是從你的衣櫥隨機組合的。想換口味就按「換一套」✦';
    note.style.display='block';
  }
}
function rerollOutfit(){
  const grid=document.getElementById('outfitGrid');if(!grid)return;
  const outfit=buildOutfit(true);
  if(!outfit.length){renderOutfit();return}
  grid.innerHTML=outfit.map(outfitCard).join('');
  const note=document.getElementById('outfitNote');
  if(note){note.textContent='已重新抽一套 ✦';note.style.display='block'}
  toast('換好一套新的了 ✦');
}

function card(x){const src=x.img||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="100%" height="100%" fill="#eee9e5"/><text x="50%" y="50%" text-anchor="middle" fill="#9b8d86" font-size="25">圖片未建立</text></svg>');return `<article class="card"><img src="${src}" loading="lazy"><div class="pad"><div class="name">${esc(x.name)}</div><div class="meta">${esc(x.cat)}${x.color?' · '+esc(x.color):''}</div>${String(x.tags||'').split(/[,，、 ]/).filter(Boolean).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}<div class="card-actions"><button class="btn secondary small" onclick="edit('${x.id}')">✎ 編輯</button><button class="btn danger small" onclick="del('${x.id}')">刪除</button></div></div></article>`}
let editPhotoData='';
function previewEditPhoto(input){const f=input?.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{editPhotoData=String(r.result||'');const p=document.getElementById('editPreview');if(p)p.src=editPhotoData;const n=document.getElementById('editPhotoName');if(n)n.textContent=`已選：${f.name}`;};r.readAsDataURL(f)}
function edit(id){const x=db.items.find(i=>i.id===id);if(!x)return;editPhotoData=x.img||'';document.getElementById('mt').textContent='編輯單品';document.getElementById('mb').innerHTML=`<img id="editPreview" class="preview" src="${x.img||''}"><div class="photo-edit"><div class="photo-edit-title">照片</div><div class="row"><label class="btn secondary small photo-btn">更換照片<input type="file" accept="image/*" onchange="previewEditPhoto(this)"></label><label class="btn ghost small photo-btn">截圖後上傳<input type="file" accept="image/*" onchange="previewEditPhoto(this)"></label></div><div id="editPhotoName" class="meta">可直接從相簿選剛截好的圖片</div></div><div class="form"><input id="en" value="${esc(x.name)}"><select id="ec">${cats.slice(1).map(c=>`<option ${x.cat===c?'selected':''}>${c}</option>`).join('')}</select><input id="eco" value="${esc(x.color)}"><input id="et" value="${esc(x.tags)}"><textarea id="eno">${esc(x.note)}</textarea><button class="btn" onclick="saveEdit('${x.id}')">儲存</button></div>`;document.getElementById('modal').classList.add('show')}
function saveEdit(id){const x=db.items.find(i=>i.id===id);if(!x)return;x.name=document.getElementById('en').value.trim()||'未命名單品';x.cat=document.getElementById('ec').value;x.color=document.getElementById('eco').value.trim();x.tags=document.getElementById('et').value.trim();x.note=document.getElementById('eno').value.trim();if(editPhotoData)x.img=editPhotoData;if(save()){editPhotoData='';closeModal();render()}}
function closeModal(){document.getElementById('modal')?.classList.remove('show')}
function del(id){db.items=db.items.filter(x=>x.id!==id);if(save())render()}
function renderDiary(){const d=document.getElementById('diaryGrid');if(!d)return;const rows=db.diary.slice();if(!rows.length){d.innerHTML='<div class="empty">📔<br><br>還沒有穿搭。</div>';return}d.innerHTML=rows.map(x=>`<article><div style="position:relative"><img id="diary-img-${x.id}" src="${x.img||''}"></div><div class="dbody"><b>${esc(x.note||'今天的穿搭')}</b><div style="display:flex;gap:7px;margin-top:9px"><button class="btn danger small" onclick="deleteDiary('${x.id}')">刪除</button></div></div></article>`).join('');rows.forEach(async x=>{if(x.img)return;try{const blob=await getDiaryBlob(x.photoKey);if(!blob)return;window.__diaryUrls=window.__diaryUrls||{};const url=URL.createObjectURL(blob);window.__diaryUrls[x.id]=url;const im=document.getElementById('diary-img-'+x.id);if(im)im.src=url}catch(e){console.error('DIARY PHOTO',e)}})}
async function putDiaryBlob(id,blob){const d=await openDB();return new Promise((ok,no)=>{const tx=d.transaction('diary','readwrite');tx.objectStore('diary').put(blob,id);tx.oncomplete=()=>{d.close();ok(true)};tx.onerror=()=>{d.close();no(tx.error)}})}
async function getDiaryBlob(id){if(!id)return null;const d=await openDB();return new Promise((ok,no)=>{const r=d.transaction('diary').objectStore('diary').get(id);r.onsuccess=()=>{d.close();ok(r.result||null)};r.onerror=()=>{d.close();no(r.error)}})}
async function deleteDiary(id){const x=db.diary.find(i=>i.id===id);if(!x)return;db.diary=db.diary.filter(i=>i.id!==id);if(window.__diaryUrls?.[id]){URL.revokeObjectURL(window.__diaryUrls[id]);delete window.__diaryUrls[id]}if(save()){renderDiary();toast('已刪除這套穿搭');try{const d=await openDB();await new Promise((ok,no)=>{const tx=d.transaction('diary','readwrite');tx.objectStore('diary').delete(x.photoKey);tx.oncomplete=()=>{d.close();ok(true)};tx.onerror=()=>{d.close();no(tx.error)}})}catch(e){console.error('DIARY DELETE STORAGE',e)}}}
async function addDiary(){const fs=[...(document.getElementById('diaryFiles')?.files||[])];if(!fs.length)return toast('先選穿搭照');const note=document.getElementById('note')?.value.trim()||'今天的穿搭';try{for(const f of fs){const id=uid();await putDiaryBlob(id,f);db.diary.unshift({id,photoKey:id,img:'',note,date:new Date().toLocaleDateString('zh-TW')})}if(save()){clearInput('diaryFiles');const n=document.getElementById('note');if(n)n.value='';renderDiary();toast(`已新增 ${fs.length} 套穿搭`)}}catch(e){console.error('DIARY SAVE',e);toast('❌ 穿搭新增失敗，請再試一次')}}
function shop(){toast('購物分析區已準備好')}
function render(){const t=document.getElementById('today');if(t)t.textContent=new Date().toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit',weekday:'short'});const f=document.getElementById('filter');if(f)f.innerHTML=cats.map(c=>`<button class="${cat===c?'on':''}" onclick="cat='${c}';render()">${c}</button>`).join('');const g=document.getElementById('closetGrid');if(g){const a=cat==='全部'?db.items:db.items.filter(x=>x.cat===cat);g.innerHTML=a.length?a.map(card).join(''):'<div class="empty">👗<br><br>這個分類還沒有單品。</div>'}const n=document.getElementById('neglected');if(n)n.innerHTML=db.items.slice(0,4).map(card).join('')||'<div class="empty">🪞<br><br>衣櫥還是空的。</div>';renderDiary();renderOutfit()}
window.tab=tab;window.addItems=addItems;window.clearInput=clearInput;window.importAI=importAI;window.addDiary=addDiary;window.deleteDiary=deleteDiary;window.edit=edit;window.saveEdit=saveEdit;window.previewEditPhoto=previewEditPhoto;window.closeModal=closeModal;window.del=del;window.shop=shop;window.rerollOutfit=rerollOutfit;render();simplifyStyleUI();