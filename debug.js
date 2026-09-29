(()=>{
const logs=[];
const log=(stage,msg,data={})=>{logs.push({t:new Date().toLocaleTimeString('zh-TW',{hour12:false}),stage,msg,data});render()};
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

// 修正 ChatGPT 複製 JSON 時常見的智慧引號問題，例如 “name” → "name"。
function cleanJSONText(raw){
  return String(raw||'').replace(/^\uFEFF/,'').trim()
    .replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim()
    .replace(/[“”„‟＂]/g,'"')
    .replace(/[‘’＇]/g,"'");
}
function parseImportJSON(raw){
  let s=cleanJSONText(raw);
  const a=s.indexOf('['),b=s.lastIndexOf(']');
  if(a>=0&&b>=a)s=s.slice(a,b+1);
  const parsed=JSON.parse(s);
  return Array.isArray(parsed)?parsed:(Array.isArray(parsed.items)?parsed.items:Array.isArray(parsed.data)?parsed.data:[parsed]);
}

function render(){const e=document.getElementById('pwDebugBody');if(!e)return;e.innerHTML=logs.map(x=>`<div style="padding:7px 0;border-bottom:1px solid #eee"><b>${esc(x.t)} · ${esc(x.stage)}</b><br>${esc(x.msg)}${Object.keys(x.data).length?`<pre style="white-space:pre-wrap;font-size:10px;margin:4px 0 0">${esc(JSON.stringify(x.data,null,2))}</pre>`:''}</div>`).join('')||'尚未執行測試';}

async function openPhotoDB(){return new Promise((ok,no)=>{const r=indexedDB.open('pureAIWardrobeImagesV2',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function getPhotoKeys(){const d=await openPhotoDB();return new Promise((ok,no)=>{const tx=d.transaction('photos');const r=tx.objectStore('photos').getAllKeys();r.onsuccess=()=>{const v=r.result||[];d.close();ok(v)};r.onerror=()=>{d.close();no(r.error)}})}
async function recoverSession(requiredCount){
  const sid=localStorage.getItem('pureAIWardrobePhotoSession');
  if(sid)return sid;
  try{
    const keys=await getPhotoKeys();
    const groups={};
    keys.forEach(k=>{const s=String(k),i=s.lastIndexOf(':');if(i>0){const id=s.slice(0,i);(groups[id]||(groups[id]=[])).push(s)}});
    const candidates=Object.entries(groups).filter(([,v])=>v.length>=requiredCount);
    if(!candidates.length)return null;
    const best=candidates[candidates.length-1][0];
    localStorage.setItem('pureAIWardrobePhotoSession',best);
    return best;
  }catch(e){return null}
}

// 覆寫匯入流程：先自動修正智慧引號，再處理照片 Session。
window.importAI=async function(){
  const btn=document.getElementById('importBtn');
  if(btn)btn.disabled=true;
  const ta=document.getElementById('importText');
  try{
    const raw=ta?.value?.trim()||'';
    if(!raw){toast('❌ 沒有讀到 JSON 內容');return}
    let rows;
    try{rows=parseImportJSON(raw)}catch(e){
      const smart=/[“”„‟＂‘’＇]/.test(raw);
      toast(smart?'❌ JSON 使用了智慧引號，網站正在嘗試自動修正但仍無法解析':'❌ JSON 格式錯誤：'+(e?.message||'無法解析'));
      console.error('IMPORT JSON',e,raw);
      return;
    }
    if(!rows.length){toast('❌ JSON 沒有單品資料');return}
    const needsPhoto=rows.some(x=>Number(x?.photo||x?.sourcePhoto||0)>0&&x?.crop);
    const fs=[...(document.getElementById('splitFiles')?.files||[])];
    let sid=null;
    if(needsPhoto){
      if(fs.length){
        sid=await putPhotos(fs);
      }else{
        sid=await recoverSession(Math.max(...rows.map(x=>Number(x?.photo||x?.sourcePhoto||0)).filter(Boolean),1));
      }
      if(!sid){toast('❌ 找不到這批原始穿搭照。請重新選照片後再匯入');return}
    }
    const aliases={'連衣裙':'洋裝','連身裙':'洋裝','裙子':'下身','褲子':'下身','鞋':'鞋子','襪':'襪子','包':'包包','飾品':'配件'};
    const validCats=['上衣','下身','洋裝','外套','鞋子','包包','襪子','配件','其他'];
    const out=[];
    for(const x of rows){
      let img=x.img||x.image||x.photoUrl||'';
      const p=Number(x.photo||x.sourcePhoto||0);
      if(!img&&p&&x.crop&&sid){
        let blob=await getPhoto(sid,p);
        if(!blob)throw new Error(`找不到第 ${p} 張原始照片`);
        img=await crop(blob,x.crop);
      }
      let c=String(x.cat||x.category||'其他');
      c=aliases[c]||c;if(!validCats.includes(c))c='其他';
      out.push({id:uid(),img,name:String(x.name||'未命名單品'),cat:c,color:Array.isArray(x.color)?x.color.join('、'):String(x.color||''),tags:Array.isArray(x.tags)?x.tags.join('、'):String(x.tags||''),note:String(x.note||''),last:0});
    }
    const old=db.items;db.items=out;
    if(!save()){db.items=old;return}
    ta.value='';
    cat='全部';
    render();
    tab('closet');
    toast(`已加入 ${out.length} 件單品 ✦`);
  }catch(e){
    console.error('IMPORT',e);
    toast('❌ 匯入失敗：'+(e?.message||e?.name||'未知錯誤')+'。請點「🛠 偵錯」查看');
  }finally{if(btn)btn.disabled=false}
};

async function inspect(){
  logs.length=0;render();log('開始','偵錯已啟動',{url:location.href});
  try{
    log('JavaScript','主程式已載入',{importOverride:typeof window.importAI==='function'});
    const f=document.getElementById('splitFiles');
    log('照片輸入',f?'找到 #splitFiles':'找不到 #splitFiles',{count:f?.files?.length||0,names:[...(f?.files||[])].map(x=>x.name)});
    const ta=document.getElementById('importText');
    const raw=ta?.value?.trim()||'';
    log('JSON輸入',ta?'讀取 #importText':'找不到 #importText',{length:raw.length,preview:raw.slice(0,160)});
    let rows=[];
    if(raw){
      try{rows=parseImportJSON(raw);log('JSON解析','成功，已支援 ChatGPT 智慧引號',{rows:rows.length});}
      catch(e){
        const smart=/[“”„‟＂‘’＇]/.test(raw);
        log('JSON解析','失敗',{error:String(e),smartQuotes:smart,可修正:smart});
      }
    }
    const photoRows=rows.filter(x=>Number(x?.photo||x?.sourcePhoto||0)>0&&x?.crop);
    log('照片依賴','檢查 photo/crop',{rowsWithPhotoCrop:photoRows.length,photoNumbers:photoRows.map(x=>x.photo)});
    const sid=localStorage.getItem('pureAIWardrobePhotoSession');
    let keys=[];try{keys=await getPhotoKeys()}catch(e){log('IndexedDB','讀取失敗',{error:String(e)})}
    log('Session','目前照片 Session',{session:sid||'(沒有)'});
    log('IndexedDB','原始照片資料庫',{storedRecords:keys.length,sessionRecords:sid?keys.filter(k=>String(k).startsWith(sid+':')).length:0});
    if(photoRows.length&&f?.files?.length){log('結論','✅ 條件可通過：目前有原始照片。按「加入我的衣櫥」時會自動建立 Session');}
    else if(photoRows.length&&!sid&&keys.length){log('結論','⚠️ Session 遺失，但 IndexedDB 還有舊照片。匯入時會嘗試自動找回最近可用照片批次');}
    else if(photoRows.length&&!sid&&!keys.length){log('結論','❌ 卡在：JSON需要原圖，但網站目前沒有原始照片。請重新選這批穿搭照');}
    else if(!raw){log('結論','❌ 卡在：沒有 JSON');}
    else{log('結論','✅ JSON 與基本條件通過，可執行匯入');}
  }catch(e){log('偵錯程式','❌ 偵錯本身發生例外',{error:String(e),stack:e?.stack})}
}

function addUI(){
  if(document.getElementById('pwDebugBtn'))return;
  const style=document.createElement('style');style.textContent='#pwDebugBtn{position:fixed;right:12px;bottom:88px;z-index:9999;border:0;border-radius:999px;padding:9px 12px;background:#3c3431;color:#fff;font-size:12px;box-shadow:0 5px 18px #0003}#pwDebug{position:fixed;inset:0;z-index:10000;background:#f8f4ef;display:none;overflow:auto;padding:18px}#pwDebug.open{display:block}#pwDebug .box{max-width:700px;margin:auto;background:#fff;border-radius:18px;padding:16px}';document.head.appendChild(style);
  const b=document.createElement('button');b.id='pwDebugBtn';b.textContent='🛠 偵錯';b.onclick=()=>{document.getElementById('pwDebug').classList.add('open');inspect()};document.body.appendChild(b);
  const p=document.createElement('div');p.id='pwDebug';p.innerHTML='<div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><b>Pure AI Wardrobe 偵錯中心</b><button id="pwDebugClose">關閉</button></div><p style="font-size:12px;color:#777">現在會額外檢查智慧引號、原始照片 Session，以及舊照片是否可以自動找回。</p><button id="pwDebugRun" style="padding:9px 12px">重新檢查</button><button id="pwDebugCopy" style="padding:9px 12px;margin-left:6px">複製偵錯結果</button><div id="pwDebugBody" style="margin-top:12px;font-size:12px"></div></div>';document.body.appendChild(p);
  document.getElementById('pwDebugClose').onclick=()=>p.classList.remove('open');document.getElementById('pwDebugRun').onclick=inspect;document.getElementById('pwDebugCopy').onclick=()=>navigator.clipboard?.writeText(logs.map(x=>`${x.t} ${x.stage}: ${x.msg} ${JSON.stringify(x.data)}`).join('\n'));
  window.addEventListener('error',e=>log('JavaScript','❌ 執行錯誤',{message:e.message,file:e.filename,line:e.lineno,column:e.colno}));window.addEventListener('unhandledrejection',e=>log('Promise','❌ 未處理錯誤',{reason:String(e.reason)}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addUI);else addUI();
})();