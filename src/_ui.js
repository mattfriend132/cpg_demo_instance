/* ---------- downloads and uploads ---------- */
function dataBlob(u){const [h,b64]=u.split(",");const mime=(h.match(/data:([^;]+)/)||[])[1]||"image/jpeg";const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);return new Blob([arr],{type:mime})}
let dlCap;
async function download(url,name){
  let blob;
  try{blob=/^data:/.test(url)?dataBlob(url):await (await fetch(url)).blob()}
  catch(e){if(/^https?:/.test(url))window.open(url,"_blank","noopener");else toast("Your browser blocked the download.");return}
  return saveBlob(blob,name);
}
async function saveBlob(blob,name){
  /* inside the claude.ai viewer, saves go through its downloads capability */
  if(window.claude&&window.claude.use){try{if(dlCap===undefined)dlCap=await window.claude.use("downloads");if(dlCap){await dlCap.save({filename:name,data:blob});return}}catch(e){return}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function extOf(url){if(/\.mp4($|\?)/.test(url))return "mp4";if(/\.glb($|\?)/.test(url))return "glb";if(/\.fbx($|\?)/.test(url))return "fbx";return /^data:image\/webp/.test(url)?"webp":/^data:image\/png|\.png($|\?)/.test(url)?"png":"jpg"}
function openUpload(target){const f=$("#fileIn");f.dataset.target=target;f.value="";f.click()}
$("#fileIn").addEventListener("change",async e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;const target=e.target.dataset.target;
  if(!/^image\//.test(file.type)){toast("Choose a PNG, JPG or WebP image.");return}
  try{
    const url=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url});
    const sc=Math.min(1,1536/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement("canvas");
    c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
    S.up[target]=c.toDataURL("image/jpeg",0.9);
  }catch(err){toast("That image couldn't be read. Try another file.");return}
  S.src[target]="upload";renderInput();if(liveMode()&&S.ptype==="auto")detect(S.up[target]);
});
async function downloadZip(){
  if(S.zipping)return;
  if(!window.JSZip){toast("The zip tool didn't load. Check your connection and try again.");return}
  const items=[];STEPS.forEach(st=>(S.results[st.id]||[]).filter(x=>x.url&&x.status==="done").forEach(r=>items.push({st,r})));
  if(!items.length){toast("Nothing to download yet.");return}
  S.zipping=true;toast("Preparing a zip of "+items.length+" assets…");
  const zip=new window.JSZip();let added=0,skipped=0;const used={};
  await Promise.all(items.map(async({st,r})=>{
    try{
      const blob=/^data:/.test(r.url)?dataBlob(r.url):await (await tfetch(r.url,{},90000)).blob();
      const folder=(st.group==="pipe"?String(PIPE.indexOf(st)+1).padStart(2,"0")+"-":"more-")+slug(st.tab);
      let base=slug(r.name)||"asset";const key=folder+"/"+base;used[key]=(used[key]||0)+1;if(used[key]>1)base+="-"+used[key];
      zip.file(folder+"/"+base+"."+extOf(r.url),blob);added++;
    }catch(e){skipped++}
  }));
  try{
    if(!added){toast("Couldn't fetch the assets for the zip. Try again.");return}
    const out=await zip.generateAsync({type:"blob",compression:"STORE"});
    await saveBlob(out,"fal-cpg-studio-campaign.zip");
    toast(skipped?`Zip ready with ${added} assets. ${skipped} couldn't be fetched here and were left out.`:`Zip ready with ${added} assets.`);
  }finally{S.zipping=false}
}
/* 3D results use Google's model-viewer, loaded only when a 3D card first appears */
function ensureMV(){if(window.customElements&&customElements.get("model-viewer"))return;if(document.getElementById("mvjs"))return;const s=document.createElement("script");s.type="module";s.id="mvjs";s.src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3/dist/model-viewer.min.js";document.head.appendChild(s)}

/* ---------- render: chrome ---------- */
function renderTop(){
  const live=liveMode();
  const tag=$("#modeTag");tag.textContent=live?"Live":"Sample mode";tag.className="tag"+(live?" live":"");
  const sp=$("#spend");sp.hidden=!live;sp.innerHTML="Session <b>"+money(S.spend)+"</b>";
  const kb=$("#keyBtn");kb.className=live?"btn":"btn dark";kb.innerHTML=live?'<span class="dot"></span>fal key connected':"Add fal key";
  document.querySelectorAll('[data-act="track"]').forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===S.track));
}
function renderTabs(){
  const moreOn=S.gallery||cur().group==="more";
  $("#tabs").innerHTML=`<span class="tabgrp">Campaign pipeline</span>`+PIPE.map((st,i)=>{const on=!S.gallery&&S.step===st.id,done=S.picked[st.id]!==undefined&&!on;
    const spin=S.pipe&&S.pipe.i===i;
    return `<button class="tab ${done?"done":""}" data-act="tab" data-v="${st.id}" ${on?'aria-current="step"':""}><span class="n">${spin?'<span class="spin" style="width:10px;height:10px;border-width:1.5px"></span>':done?I.ck:i+1}</span>${st.tab}</button>`}).join("")
    +`<span class="tabsep" aria-hidden="true"></span><button class="tab" data-act="gallery" ${moreOn?'aria-current="step"':""}><span class="n grid4">${I.grid}</span>More use cases</button>`;
  const sub=$("#subtabs");sub.hidden=!moreOn;
  sub.innerHTML=moreOn?`<button class="subtab" data-act="gallery" ${S.gallery?'aria-current="page"':""}>All</button>`+MORE.map(st=>`<button class="subtab" data-act="tab" data-v="${st.id}" ${!S.gallery&&S.step===st.id?'aria-current="page"':""}>${esc(st.tab)}</button>`).join(""):"";
  renderPipe();
}
function renderPipe(){
  const el=$("#pipe");if(!el)return;
  if(S.pipe){el.innerHTML=`<button class="btn light" disabled><span class="spin"></span>Running ${PIPE[S.pipe.i].tab}, step ${S.pipe.i+1} of ${PIPE.length}</button><span class="pipemeta">Each step feeds its pick into the next.</span>`;return}
  const e=pipelineEstimate();
  el.innerHTML=`<button class="btn light" data-act="pipeline">${I.play}Run the full pipeline</button><span class="pipemeta">${PIPE.length} steps, <b>${e.n} assets</b>${liveMode()?`, about <b>${money(e.c)}</b> on your fal key`:` from samples. About <b>${money(e.c)}</b> to run live`}</span>`;
}

/* ---------- render: input panel ---------- */
const field=(label,hint,body)=>`<div class="field"><div class="flabel">${label}${hint?`<span>${hint}</span>`:""}</div>${body}</div>`;
const LIVETIP="Add your fal key to run this live";
function tile(act,v,on,img,label,o){o=o||{};return `<button class="tile ${o.sq?"sq":""}" data-act="${act}" data-v="${esc(v)}" aria-pressed="${!!on&&!o.dis}" ${o.dis?`disabled title="${LIVETIP}"`:""}><span class="ti">${img?`<img src="${img}" alt="">`:""}</span><span class="tl">${esc(label)}${o.dis?' <span class="lv">Live</span>':""}</span></button>`}
function upTile(st,on,sq){
  const dis=!liveMode();
  if(S.up[st.id]&&!dis)return tile("src","upload",on,S.up[st.id],on?"Replace":"Your upload",{sq});
  return `<button class="tile add ${sq?"sq":""}" data-act="upload" data-v="${st.id}" ${dis?`disabled title="${LIVETIP}"`:""}><span class="ti">${I.up}</span><span class="tl">Upload</span></button>`;
}
function chip(st,o,on,c){const dis=optLive(st,o,c);const small=o.lang||(o.ar&&st.id!=="ooh"?o.ar:"")||(o.hex||"");
  return `<button class="chip" data-act="opt" data-v="${esc(o.id)}" aria-pressed="${!!on&&!dis}" ${dis?`disabled title="${LIVETIP}"`:""}>${o.hex?`<span class="sw" style="background:${o.hex}"></span>`:""}${esc(o.name)}${small?` <small>${esc(small)}</small>`:""}${dis?' <span class="lv">Live</span>':""}</button>`}
function sourceField(st){
  const m=srcKind(st);
  const ps=presetsOf(st);
  if(ps)return field(st.srcLabel,"Pick one",`<div class="tiles">${ps.map(p=>tile("src",p.id,m===p.id,p.img,p.name,{sq:st.sq})).join("")}${upTile(st,m==="upload",st.sq)}</div>`);
  const prev=st.prev?pickedUrl(st.prev):null;
  return field("Source","Pick one",`<div class="tiles">
    ${prev?tile("src","carry",m==="carry",prev,"From "+ST[st.prev].tab,{dis:!canCarry(st),sq:st.sq}):""}
    ${tile("src","base",m==="base",base(st.id),st.baseLabel,{sq:st.sq})}
    ${upTile(st,m==="upload",st.sq)}</div>`);
}
function customRow(st){const dis=!liveMode();const extra=st.customKind==="variant"?`<input type="color" id="custom-hex" value="#5718C0" aria-label="Variant color" title="Variant color" style="width:36px;flex:none;padding:2px;height:34px" ${dis?"disabled":""}>`:st.customKind==="market"?`<input type="text" id="custom-lang" placeholder="Language" aria-label="Language" maxlength="40" style="max-width:120px" ${dis?"disabled":""}>`:"";return `<div class="addrow"><input type="text" id="custom-in" placeholder="${esc(dis?"Add your fal key to write your own":st.custom)}" aria-label="Add your own" maxlength="200" ${dis?"disabled":""}>${extra}<button class="btn sm" data-act="addcustom" ${dis?"disabled":""}>Add</button></div>`}
function modelField(st){
  const ep=epOf(st),on=S.cmp===st.id,dis=!canCompare(st)||!!S.pipe;
  const sub=on?"One "+unitWord(st)+" from each model":ep.lab+" · "+priceTxt(ep)+" · "+ep.tier;
  const why=S.pipe?"Compare is off while the full pipeline runs":SANDBOXED?"Open the hosted version of CPG Studio to compare models":"Add your fal key to compare models on this step";
  return field("Model",esc(sub),`<div class="mrow"><select id="epSel" aria-label="Model for this step" ${on?"disabled":""}>${eps(st).map(e=>`<option value="${e.key}" ${e.key===ep.key?"selected":""}>${esc(e.name)} · ${esc(e.lab)} · ${e.ps?money(e.ps)+"/s":e.unit==null?"usage-based":money(e.unit)}</option>`).join("")}</select><button class="cmpbtn" data-act="compare" aria-pressed="${on}" ${dis?`disabled title="${why}"`:`title="Run one option on every model side by side"`}><i></i>Compare models</button></div>`);
}
const PT_OPTS=[["auto","Auto detect (vision model)"]].concat(CAT_IDS.map(k=>[k,CATS[k].name]));
function ptypeField(st,c){
  const p=c.profile,url=srcUrl(st);let hint;
  if(S.ptype!=="auto")hint="Set by you for every step";
  else if(url&&S.detecting[url])hint="Detecting with "+VISION.name+"\u2026";
  else if(p.pending)hint=S.detErr&&c.kind==="upload"?S.detErr:"Detects with "+VISION.name+" when you run";
  else if(p.detected)hint="Detected by "+VISION.name;
  else if(c.kind==="carry")hint="From your "+ST[st.prev].tab+" pick";
  else hint=liveMode()&&st.id==="concept"?"Detects with "+VISION.name+" when you run":"Pre-detected for the sample";
  const now=p.pending?"":`<p class="fnote" style="margin-top:8px"><b>${esc(CATS[p.cat].name)}</b>: ${esc(p.product)}${p.brand?" \u00b7 "+esc(p.brand):""}</p>`;
  return field("Product type",esc(hint),`<div class="mrow"><select id="ptypeSel" aria-label="Product type">${PT_OPTS.map(([v,l])=>`<option value="${v}" ${S.ptype===v?"selected":""}>${esc(l)}</option>`).join("")}</select></div>${now}`);
}
function stepFields(st){
  const c=ctxOf(st);let h=sourceField(st);
  if(st.kind!=="3d")h+=ptypeField(st,c);
  if(st.headline)h+=field("Headline",liveMode()?"Set on every placement":"Samples use the default",`<input type="text" id="oohIn" class="txt" value="${esc(oohHeadline(c))}" maxlength="60" aria-label="Headline" ${liveMode()?"":"disabled"}>`);
  if(st.fmt)h+=field("Format","",`<div class="seg" role="group" aria-label="Ad format">${AB_FORMATS.map(f=>{const dis=!liveMode()&&f.id!=="p45";return `<button data-act="abfmt" data-v="${f.id}" aria-pressed="${S.abfmt===f.id}" ${dis?`disabled title="${LIVETIP}"`:""}>${f.name} ${f.r}</button>`}).join("")}</div>`);
  if(st.kind==="3d")return h+field("Output","",`<p class="fnote">A textured GLB file, ready for web 360 viewers, AR and 3D tools. Generation takes a few minutes per model.</p>`);
  const all=opts(st,c),ids=selOpts(st).map(o=>o.id);
  h+=field(st.optLabel(c),S.cmp===st.id?"Pick one to compare":st.optHint,`<div class="chips">${all.map(o=>chip(st,o,ids.includes(o.id),c)).join("")}</div>${st.custom?customRow(st):""}`);
  if(st.dur)h+=field("Length",S.cmp===st.id?"Same length for each model":money(epOf(st).ps)+" per second",`<div class="seg" role="group" aria-label="Clip length">${[4,6,8].map(d=>`<button data-act="vdur" data-v="${d}" aria-pressed="${S.vdur===d}">${d} seconds</button>`).join("")}</div>`);
  if(st.fixedDur)h+=field("Length","",`<p class="fnote">${st.fixedDur} second clips with the presenter's voice and room sound.</p>`);
  return h;
}
function renderInput(){
  const st=cur(),i=st.group==="pipe"?PIPE.indexOf(st):MORE.indexOf(st),hasPrompt=!!TPL[st.id];
  const chain=st.prev?`<span class="chain">${I.ar}Uses your ${esc(ST[st.prev].tab)} pick</span>`:"";
  $("#inputPanel").innerHTML=`
    <div class="phead"><h2>Input</h2><span class="eyebrow">${st.group==="pipe"?`Step ${i+1} of ${PIPE.length}`:"More use cases"}</span></div>
    <div class="intro"><h3>${esc(st.title)}</h3><p>${esc(st.desc)}</p>${st.group==="more"?chain:""}</div>
    <div class="fields">${modelField(st)+stepFields(st)}</div>
    ${hasPrompt?`<details class="adv" ${S.advOpen?"open":""} id="adv"><summary>Prompt ${I.chev}</summary>
      <div class="inner"><div class="ctl"><label for="prIn">Prompt template</label><textarea id="prIn">${esc(tplOf(st))}</textarea><span class="hint">Words in braces, like {${st.ph}}, are filled in for each ${unitWord(st)}. <button class="btn ghost sm" data-act="resetprompt" style="height:auto;padding:0;color:var(--accent)">Reset</button></span></div></div></details>`:""}
    <div class="pfoot"><span class="est tnum" id="estLine">${estHTML(st)}</span>
      <button class="btn primary" data-act="run" ${S.running[st.id]?"disabled":""}>${I.play}${S.running[st.id]?"Running":(liveMode()?"Run":"Show samples")}</button></div>`;
}

/* ---------- render: result panel ---------- */
function fmtDur(sec){sec=Math.round(sec);if(sec<60)return sec+"s";return Math.floor(sec/60)+" min "+String(sec%60).padStart(2,"0")+"s"}
function mediaHTML(r){
  if(r.m3d){ensureMV();return `<model-viewer src="${r.url}" ${r.poster?`poster="${r.poster}"`:""} camera-controls auto-rotate shadow-intensity="0.6" exposure="1.05" loading="lazy" alt="${esc(r.name)}"></model-viewer><span class="vtag">3D, drag to rotate</span>`}
  if(r.video)return `<video src="${r.url}" ${r.poster?`poster="${r.poster}"`:""} muted loop playsinline autoplay preload="metadata"></video><span class="vtag">Video</span>`;
  return `<img src="${r.url}" alt="${esc(r.name)}" loading="lazy">`;
}
function cardHTML(id,r,k){
  const st=ST[id];let inner="",cls="card";
  if(r.status==="queued"||r.status==="running"){cls+=" busy";const el=r.t0?Math.round((Date.now()-r.t0)/1000)+"s":"";inner=`<div class="state"><div><b>${r.status==="queued"?"In queue":"Generating"}</b>${r.status==="queued"&&r.pos!=null?"Position "+(r.pos+1)+" · ":""}${el}${r.reqId?`<br><span title="${esc(r.reqId)}" style="font-size:11px">Request ${esc(r.reqId.slice(0,13))}</span>`:""}</div></div>`}
  else if(r.status==="error"){cls+=" fail";inner=`<div class="state"><div><b>Failed</b>${esc(r.err||"")}</div></div>`}
  else if(r.url)inner=mediaHTML(r)+(st.audio&&r.video?`<button class="snd" data-act="snd" data-v="${k}">Sound on</button>`:"");
  else inner=`<div class="state"><div><b>Not in the sample set</b>Add your fal key to generate it live.</div></div>`;
  const can=r.status==="done"&&r.url,on=S.picked[id]===r.id;
  const pick=can?`data-act="pick" data-v="${esc(r.id)}" role="button" tabindex="0" aria-pressed="${on}"`:"";
  const dl=can?`<button class="dlb" data-act="dl" data-v="${k}" aria-label="Download ${esc(r.name)}">${I.dl}</button>`:"";
  let foot;
  if(r.model){const tm=r.status==="done"?(r.secs!=null?fmtDur(r.secs)+(r.sample?" to generate":""):""):r.status==="error"?"":"…";
    foot=`<div class="cn">${esc(r.name)}</div><div class="lab">${esc(r.lab)}</div><div class="cm tnum"><span title="Generation time">${tm}</span><b title="Cost on fal">${r.cost==null?"usage-based":money(r.cost)}</b></div>`}
  else{const meta=r.sample?(r.url?"Sample":"Live only"):r.status==="done"?(r.secs!=null?r.secs.toFixed(1)+"s":""):r.status==="error"?"":"…";
    foot=`<div class="cn">${esc(r.name)}</div><div class="cm tnum"><span>${meta}</span><span>${r.sample||r.cost==null?"":money(r.cost)}</span></div>`}
  return `<div class="${cls}${on?" on":""}" id="c-${id}-${k}" ${pick}><div class="im" style="--ar:${r.ar||"1/1"}">${inner}<span class="ck">${I.ck}</span>${dl}</div>${foot}</div>`;
}
function updateCard(id,k){if(S.step!==id||S.gallery||S.view!=="preview")return;const el=document.getElementById("c-"+id+"-"+k);const r=S.results[id]&&S.results[id][k];if(el&&r)el.outerHTML=cardHTML(id,r,k)}
function apiCode(st){
  const {jobs}=jobsFor(st);if(!jobs.length)return "Pick at least one option to see the request.";
  const short=v=>typeof v==="string"&&/^data:/.test(v)?"https://.../your-upload.jpg":v;
  const clean=o=>Array.isArray(o)?o.map(clean):o&&typeof o==="object"?Object.fromEntries(Object.entries(o).map(([k,v])=>[k,clean(v)])):short(o);
  const j=jobs[0],body=JSON.stringify(clean(j.input),null,2).replace(/\n/g,"\n  ");
  const out=j.m3d?"const glbUrl = (result.data.model_glb || result.data.model_mesh).url;":j.video?"const videoUrl = result.data.video.url;":"const imageUrl = result.data.images[0].url;";
  return `import { fal } from "@fal-ai/client";\n\nfal.config({ credentials: process.env.FAL_KEY });\n\nconst result = await fal.subscribe("${j.endpoint}", {\n  input: ${body}\n});\n\n${out}\n\n// ${S.cmp===st.id?`Compare mode sends the same request to ${jobs.length} models in parallel:\n// ${jobs.map(x=>x.endpoint).join(", ")}\n// Each model family takes its own input fields; switching is one line.`:`This step sends ${jobs.length} request${jobs.length===1?"":"s"} like this one in parallel.`}`;
}
function nextOf(st){if(st.group!=="pipe")return null;const i=PIPE.indexOf(st);return PIPE[i+1]||null}
function renderResult(){
  const st=cur(),id=st.id,r=S.results[id],running=!!S.running[id];
  let badge='<span class="badge">Idle</span>';
  if(running)badge='<span class="badge run">Running</span>';
  else if(r&&r.length){if(r[0].sample)badge='<span class="badge">Sample</span>';else if(r.some(x=>x.status==="error"))badge='<span class="badge err">'+(r.every(x=>x.status==="error")?"Failed":"Partly failed")+'</span>';else badge='<span class="badge ok">Completed</span>'}
  let body;
  if(S.view==="api")body=`<div class="codebar"><span class="est">The same call your team would make with <b>@fal-ai/client</b></span><button class="btn sm" data-act="copy">Copy</button></div><pre class="code" id="code">${esc(apiCode(st))}</pre>`;
  else if(!r)body=`<div class="empty"><div><b>Results land here as a batch</b>Set your inputs, then press ${liveMode()?"Run":"Show samples"}.</div></div>`;
  else{
    const fb=fallbackOf(st),keyBtn=!S.key?`<button data-act="key">Add fal key</button>`:"";
    let note=running&&S.busy[id]&&fb&&S.cmp!==id?`<div class="note"><span>fal's queue for ${esc(epOf(st).label)} is very busy right now (position ${S.busy[id].toLocaleString()}). Switch this batch to ${esc(fb.label)}?</span><button data-act="fallback">Switch and rerun</button></div>`:"";
    if(!note&&r[0]&&r[0].model){
      if(r[0].sample)note=`<div class="note"><span>${r.some(x=>x.url)?"Pre-generated on fal from "+esc(CMP[id].what)+". Times are measured generation times; prices are fal list prices. Pick a card to use that model for this step.":"Compare samples cover "+esc(CMP[id].what)+". Add your fal key to compare any option live."}</span>${keyBtn}</div>`;
      else if(!running)note=`<div class="note"><span>Pick a card to use that model for this step.</span></div>`;
    }
    if(!note&&r[0]&&r[0].sample){
      const mk=st.models[0];const ce=epOf(st);
      if(S.key&&SANDBOXED)note=`<div class="note"><span>${SANDBOXMSG}</span></div>`;
      else if(ce.key!==mk&&!S.key)note=`<div class="note"><span>These samples were made with ${MDL[mk].name}. ${CMP[id]?`Turn on Compare models to see ${esc(ce.name)} side by side, or add`:"Add"} your fal key to run ${esc(ce.name)} live.</span>${keyBtn}</div>`;
      else if(!S.key)note=`<div class="note"><span>These are pre-generated samples. Add your fal key to run this step live on your own inputs.</span>${keyBtn}</div>`;
    }
    body=(note||"")+`<div class="grid ${st.kind!=="image"||id==="ooh"?"wide":""}">${r.map((x,k)=>cardHTML(id,x,k)).join("")}</div>`;
  }
  if(S.view!=="api")body+=cmpHTML(st);
  const done=r?r.filter(x=>x.status==="done"&&x.url):[];
  let meta="";const u=unitWord(st);
  if(r&&r.length){
    if(r[0].model&&r[0].sample)meta=`${r.length} models compared, from samples`;
    else if(r[0].sample)meta=`${done.length} sample ${u}${done.length===1?"":"s"}`;
    else if(running)meta=`${r.filter(x=>x.status==="done").length} of ${r.length} done`;
    else{const cost=r.filter(x=>x.status==="done").reduce((a,x)=>a+(x.cost||0),0);const b=S.batch[id];meta=`${done.length} ${u}${done.length===1?"":"s"}${b?" in "+fmtDur(b.secs)+", run in parallel":""} · ${money(cost)}`}
  }
  const picked=S.picked[id]!==undefined,nx=nextOf(st);
  let nav;
  if(st.group==="more")nav=`<button class="btn" data-act="gallery">${I.back}All use cases</button>`;
  else if(nx){const uses=nx.prev===id;nav=`<button class="btn ${!uses||picked?"primary":""}" data-act="next" ${uses&&!picked?'disabled title="Pick a result first"':""}>${uses?"Use in":"Next:"} ${esc(nx.tab)} ${I.ar}</button>`}
  else nav=`<button class="btn ${done.length?"primary":""}" data-act="showboard" ${STEPS.some(x=>(S.results[x.id]||[]).some(y=>y.url))?"":"disabled"}>View campaign board ${I.ar}</button>`;
  $("#resultPanel").innerHTML=`
    <div class="phead"><h2>Result ${badge}</h2>
      <div class="seg" role="group" aria-label="View"><button data-act="view" data-v="preview" aria-pressed="${S.view==="preview"}">Preview</button><button data-act="view" data-v="api" aria-pressed="${S.view==="api"}">API</button></div></div>
    <div class="rbody">${body}</div>
    <div class="rfoot"><span class="est tnum">${meta||"Nothing generated yet"}</span>
      <span class="acts">${running?`<button class="btn" data-act="cancel">Cancel</button>`:""}${done.length?`<button class="btn" data-act="dlall">${I.dl}Download all</button>`:""}${nav}</span></div>`;
}
function cmpHTML(st){
  const t=TR[st.id],r=S.results[st.id],u=unitWord(st);
  let main,sub;
  if(r&&r.length&&!r[0].sample&&!S.running[st.id]){const d=r.filter(x=>x.status==="done");const c=d.reduce((a,x)=>a+(x.cost||0),0);const b=S.batch[st.id];main=money(c);sub=`${d.length} ${u}${d.length===1?"":"s"}${b?" in "+fmtDur(b.secs):""}, run in parallel`}
  else{const js=jobsFor(st).jobs;const tot=js.reduce((a,j)=>a+(j.cost||0),0);main=js.some(j=>j.cost==null)?"Usage-based":"About "+money(tot);sub=st.kind==="video"?"Clips render in parallel":st.kind==="3d"?"Minutes, not weeks":"The whole batch runs in parallel"}
  return `<div class="cmp"><div><span class="eyebrow">Today</span><b>${t.today}</b><small>${t.time}</small></div><div class="fal"><span class="eyebrow">With fal</span><b>${main}</b><small>${sub}</small></div></div>`;
}
const usd=n=>n>=1000?"$"+Math.round(n).toLocaleString("en-US"):money(n);

/* ---------- render: gallery of other use cases ---------- */
function gthumb(id){const s=SAMP[chain()],first=o=>o?Object.values(o)[0]:null;if(id==="ugc")return s.creators[0].img;if(id==="m3d")return s.glb.hun.poster;return first(s.steps[id])}
function renderGallery(){
  const g=$("#gallery"),w=$("#work");g.hidden=!S.gallery;w.hidden=S.gallery;
  if(!S.gallery){g.innerHTML="";return}
  g.innerHTML=`<div class="galhead"><div><div class="eyebrow">More use cases</div><h2>Beyond the core pipeline</h2><p>Each one is a single step you can try on its own. Most pick up where the pipeline left off, so your flavor or campaign scene carries straight in.</p></div></div>
  <div class="ggrid">${MORE.map(st=>`<button class="gcard" data-act="tab" data-v="${st.id}"><span class="gi"><img src="${gthumb(st.id)}" alt="" loading="lazy" style="object-position:50% 35%"></span><span class="gb"><h3>${esc(st.tab)}</h3><p>${esc(st.desc)}</p><span class="gm"><span>${st.prev?"Uses your "+esc(ST[st.prev].tab)+" pick":"Standalone"}</span><b>Try it ${I.ar}</b></span></span></button>`).join("")}</div>`;
}

/* ---------- render: picks, board, business case ---------- */
function renderPicks(){
  const items=PIPE.map(st=>{const u=pickedUrl(st.id);const r=pickedRes(st.id);
    if(u&&r&&!r.video)return `<div class="pk"><img src="${u}" alt=""><span><b>${st.tab}</b>${esc(r.name)}</span></div>`;
    if(u&&r)return `<div class="pk"><img src="${r.poster||""}" alt=""><span><b>${st.tab}</b>${esc(r.name)}</span></div>`;
    return `<div class="pk slot"><i></i><span><b>${st.tab}</b>Not picked</span></div>`}).join("");
  const any=PIPE.some(st=>pickedUrl(st.id));
  $("#picks").innerHTML=`<span class="eyebrow" style="margin-right:4px">Your picks</span>${items}<span class="spacer"></span><button class="btn" data-act="dlpicks" ${any?"":"disabled"}>${I.dl}Download picks</button><button class="btn" data-act="showboard" ${STEPS.some(x=>(S.results[x.id]||[]).some(y=>y.url))?"":"disabled"}>View campaign board</button>`;
}
function renderBoard(){
  const el=$("#board");if(!el)return;
  if(!S.board){el.hidden=true;el.innerHTML="";return}
  el.hidden=false;
  const rows=[];let n=0,cost=0,est=0,lo=0,hi=0,steps=0;
  STEPS.forEach(st=>{
    const d=(S.results[st.id]||[]).filter(x=>x.status==="done"&&x.url);if(!d.length)return;
    steps++;n+=d.length;d.forEach(x=>{cost+=x.sample?0:(x.cost||0);est+=x.cost||0});
    const t=TR[st.id];if(t.per==="once"){lo+=t.lo;hi+=t.hi}else if(t.per==="item"){lo+=t.lo*d.length;hi+=t.hi*d.length}
    rows.push(`<div class="boardrow"><h3>${esc(st.tab)}<span>${esc(st.title)}</span></h3><div class="bgrid">${d.map(x=>`<div class="bthumb ${S.picked[st.id]===x.id?"on":""}" title="${esc(x.name)}">${x.video?`<video src="${x.url}" ${x.poster?`poster="${x.poster}"`:""} muted loop playsinline autoplay preload="metadata"></video>`:x.m3d?`<img src="${x.poster||base("m3d")}" alt="${esc(x.name)}">`:`<img src="${x.url}" alt="${esc(x.name)}">`}</div>`).join("")}</div></div>`);
  });
  const bs=S.boardStats||{},live=!!bs.live&&cost>0;
  el.innerHTML=`<div class="sechead"><div><div class="eyebrow">Campaign board</div><h2>One sketch, a global campaign</h2></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="dlboard">${I.dl}Download all as zip</button><button class="btn ghost" data-act="hideboard">Hide board</button></div></div>
    <div class="stats tnum">
      <div><span class="eyebrow">Assets created</span><b>${n}</b><small>Across ${steps} steps</small></div>
      <div><span class="eyebrow">Time</span><b>${live&&bs.secs?fmtDur(bs.secs):"Minutes"}</b><small>${live?"End to end, each step in parallel":"Typical for a live run"}</small></div>
      <div><span class="eyebrow">Cost on fal</span><b>${live?money(cost):money(est)}</b><small>${live?"Billed to your fal key":"Estimated for a live run"}</small></div>
      <div class="hl"><span class="eyebrow">Traditional route</span><b>${lo?usd(lo)+" to "+usd(hi):"Weeks"}</b><small>Plus weeks of agency rounds and shoots</small></div>
    </div>${rows.join("")}`;
}
const SRC_LINKS=[
 ["ManyPixels, packaging design cost","https://www.manypixels.co/blog/print-design/packaging-design-cost"],
 ["Contra, SKU adaptations","https://contra.com/s/vFPBoq6r-packaging-sku-adaptations-and-print-ready-prepress"],
 ["AIM, changing packaging artwork","https://www.aim.be/news/infographic-on-key-facts-changing-packaging-artwork"],
 ["aytm, shelf test","https://aytm.com/solutions-center/shelf-test"],
 ["Wonderful Machine, food and drink photography","https://www.wonderfulmachine.com/article/building-estimates-food-drink-product-photography/"],
 ["Advids, short video cost","https://advids.co/pricing/how-much-short-video-creation-cost"],
 ["Influee, UGC rates","https://influee.co/blog/ugc-price"],
 ["FrameSixty, 3D rendering","https://framesixty.com/3d-product-rendering-services/"],
 ["AdQuick, billboard costs","https://www.adquick.com/answers/what-is-the-average-price-of-a-billboard-ad-in-2025"]
];
function renderRoi(){
  const r=S.roi;
  $("#roi").innerHTML=`<div class="sechead"><div><div class="eyebrow">Business case</div><h2>What this looks like at your scale</h2></div></div>
  <div class="roi">
    <div class="in">
      <label for="roi-skus">New SKUs per year<input id="roi-skus" type="number" min="1" step="1" value="${r.skus}"></label>
      <label for="roi-markets">Markets<input id="roi-markets" type="number" min="1" step="1" value="${r.markets}"></label>
      <label for="roi-images">Lifestyle images per SKU per market<input id="roi-images" type="number" min="0" step="1" value="${r.images}"></label>
      <label for="roi-videos">Short videos per SKU per market<input id="roi-videos" type="number" min="0" step="1" value="${r.videos}"></label>
    </div>
    <div class="out" id="roiOut"></div>
  </div>`;
  updateRoi();
}
function updateRoi(){
  const r=S.roi,el=$("#roiOut");if(!el)return;
  const k=v=>Math.max(0,Math.floor(+v||0));
  const sk=k(r.skus),mk=k(r.markets),im=k(r.images),vd=k(r.videos);
  const packs=sk,loc=sk*mk,imgs=sk*mk*im,vids=sk*mk*vd,assets=packs+loc+imgs+vids;
  const fal=(packs+loc+imgs)*0.045+vids*0.18,fast=(packs+loc+imgs)*0.022+vids*0.09;
  const lo=packs*600+loc*450+imgs*300+vids*500,hi=packs*1500+loc*1500+imgs*800+vids*5000;
  const mult=fal>0?Math.round(lo/fal):0;
  el.innerHTML=`<div class="big tnum">
      <div><span class="eyebrow">Assets per year</span><b>${assets.toLocaleString("en-US")}</b></div>
      <div class="fal"><span class="eyebrow">With fal</span><b>${usd(fal)}</b><small class="est">${usd(fast)} on the fastest models</small></div>
      <div><span class="eyebrow">Today</span><b>${lo?usd(lo)+" to "+usd(hi):"$0"}</b></div>
    </div>
    <p style="margin:0;font-size:14px;color:var(--ink-2);max-width:60ch">${mult>1?`That is at least <b>${mult.toLocaleString("en-US")}x</b> less than the traditional route, with assets ready in hours instead of weeks.`:"Adjust the numbers to match a typical year."}</p>
    <p class="fine">Today figures are estimates built from public pricing pages, not quotes: variant and SKU artwork $600 to $1,500 per SKU; market adaptations $450 to $1,500 each (full EU artwork changes run over €5,000 per SKU); lifestyle photography $3,000 to $8,000 per shoot day, assuming about 10 finished images per day ($300 to $800 each); short-form video $500 to $5,000 each. fal costs assume Nano Banana 2.1 at about $0.045 per image and 6 second H3 Max clips at $0.18 (FLUX.2 [klein] and H3 Max Turbo for the fastest figure).</p>
    <p class="fine">Sources: ${SRC_LINKS.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join(" · ")}</p>`;
}
function render(){renderTop();renderTabs();renderGallery();if(!S.gallery){renderInput();renderResult()}renderPicks();renderBoard();
  /* the other use cases read as their own page: no pipeline picks strip or campaign board there */
  const more=S.gallery||cur().group==="more";$("#picks").parentElement.hidden=more;if(more)$("#board").hidden=true}

/* ---------- modal + toast ---------- */
let toastT;
function toast(m){let t=$(".toast");if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}t.textContent=m;clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),3200)}
function keyModal(){
  const has=!!S.key,mask=has?S.key.slice(0,4)+"…"+S.key.slice(-4):"";
  $("#modalRoot").innerHTML=`<div class="scrim" data-act="close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="kmT">
    <h2 id="kmT">${has?"Your fal key":"Connect your fal key"}</h2>
    <p>Runs bill to your own fal account. Create a key in the <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener">fal dashboard</a> under API keys.</p>
    ${has?`<p class="tnum">Connected key: <b>${esc(mask)}</b></p>`:""}
    <div class="ctl"><label for="keyIn">${has?"Replace key":"API key"}</label><input id="keyIn" type="password" autocomplete="off" spellcheck="false" placeholder="key_id:key_secret"></div>
    <div class="err" id="keyErr"></div>
    ${SANDBOXED?`<p class="fine" style="border-left-color:var(--accent)">${SANDBOXMSG}</p>`:""}<p class="fine">Your key stays in this browser and is sent only to fal with your own requests. Nothing is stored on a server.</p>
    <div class="row">${has?`<button class="btn ghost" data-act="rmkey">Remove key</button>`:""}<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="savekey">${has?"Save":"Connect"}</button></div>
  </div></div>`;
  setTimeout(()=>{const k=$("#keyIn");k&&k.focus()},0);
}

/* ---------- events ---------- */
function goStep(id){if(S.cmp!=null&&S.cmp!==id)cmpOff();S.step=id;S.gallery=false;S.view="preview";
  const st=ST[id];if(st.prev&&canCarry(st)&&S.src[id]!=="upload")S.src[id]="carry";
  if(!S.results[id]&&!S.running[id]&&!liveMode()&&st.group==="more"){S.results[id]=buildJobs(st).jobs.map(j=>Object.assign({},j,{url:j.demo,status:"done",sample:true,secs:j.sampleSecs}))}
  render()}
/* keep the step selector in view so the highlighted use case is visible */
const scrollWork=()=>{const t=$("#tabs");if(!t||!t.getBoundingClientRect)return;const y=t.getBoundingClientRect().top+(window.scrollY||0)-70;if(typeof window.scrollTo==="function")try{window.scrollTo({top:Math.max(0,y),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}catch(e){}};
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");if(!el)return;
  const a=el.dataset.act,v=el.dataset.v,st=cur(),id=st.id;
  if(a==="close"){if(e.target===el||el.tagName==="BUTTON")$("#modalRoot").innerHTML="";return}
  switch(a){
    case "tab":goStep(v);if(el.classList.contains("gcard"))scrollWork();break;
    case "gallery":cmpOff();S.gallery=true;render();scrollWork();break;
    case "compare":if(!canCompare(st)||S.pipe)break;if(S.cmp===id)cmpOff();else cmpOn(st);renderInput();renderPipe();if(S.view==="api")renderResult();break;
    case "pipeline":runPipeline();break;
    case "showboard":S.board=true;renderBoard();{const b=$("#board");b&&b.scrollIntoView&&b.scrollIntoView({behavior:"smooth",block:"start"})}break;
    case "hideboard":S.board=false;renderBoard();break;
    case "dlboard":downloadZip();break;
    case "vdur":S.vdur=+v;renderInput();renderPipe();break;
    case "abfmt":S.abfmt=v;renderInput();break;
    case "opt":pickOpt(st,v);renderInput();renderPipe();break;
    case "src":if(v==="upload"&&srcKind(st)==="upload")openUpload(id);else S.src[id]=v;renderInput();renderPipe();if(S.view==="api")renderResult();break;
    case "upload":openUpload(v);break;
    case "addcustom":{const inp=$("#custom-in");const txt=(inp&&inp.value||"").trim();if(!txt){toast("Type something first.");break}
      const nid="c"+Date.now().toString(36);const name=txt.length>34?txt.slice(0,32)+"…":txt;
      const o={id:nid,name};if(st.customKind==="variant"){o.name=txt;o.hex=(($("#custom-hex")||{}).value||"#5718C0").toUpperCase();o.art="a simple "+txt.toLowerCase()+" illustration"}else if(st.customKind==="market"){const lang=(($("#custom-lang")||{}).value||"").trim();if(!lang){toast("Add the language for this market.");break}o.name=txt;o.lang=lang;o.city=txt;o.drink="on a cafe table in "+txt}else if(id==="personal"||id==="ab")o.name=txt;else if(id==="ugc")o.desc=txt;else o.desc=txt+(id==="video"&&!/[.!?]$/.test(txt)?".":"");
      S.extra[id].push(o);pickOpt(st,nid);renderInput();renderPipe();break}
    case "track":S.track=v;S.ep={};renderTop();if(!S.gallery)renderInput();renderPipe();if(S.view==="api"&&!S.gallery)renderResult();break;
    case "key":keyModal();break;
    case "savekey":{const k=$("#keyIn").value.trim();if(!k){$("#keyErr").textContent="Paste your fal API key first.";return}if(!k.includes(":")){$("#keyErr").textContent="fal keys look like key_id:key_secret. Check you copied the whole key.";return}
      S.key=k;LS.set("fal_key",k);$("#modalRoot").innerHTML="";render();toast("fal key connected. Runs are live now.");break}
    case "rmkey":S.key=null;LS.set("fal_key",null);$("#modalRoot").innerHTML="";render();toast("Key removed. Back to sample mode.");break;
    case "resetprompt":delete S.prompt[id];renderInput();break;
    case "run":run(st);break;
    case "fallback":{const fb=fallbackOf(st);if(!fb)break;S.cancel[id]=true;S.ep[id]=fb.key;toast("Switching to "+fb.label+".");(async()=>{for(let k=0;k<40&&S.running[id];k++)await sleep(250);S.running[id]=false;run(st)})();break}
    case "cancel":S.cancel[id]=true;toast("Cancelling. Requests already running may still finish.");break;
    case "view":S.view=v;renderResult();break;
    case "copy":{const t=$("#code").textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast("Copied"),()=>{const rg=document.createRange();rg.selectNodeContents($("#code"));const s=getSelection();s.removeAllRanges();s.addRange(rg);toast("Selected. Press Cmd+C to copy.")});break}
    case "pick":{if(e.target.closest("model-viewer"))break;S.picked[id]=v;const pr=pickedRes(id);if(pr&&pr.model&&epOf(st).key!==pr.model){S.ep[id]=pr.model;toast(pr.name+" is now the model for this step.");renderInput();renderPipe()}renderTabs();renderResult();renderPicks();if(S.board)renderBoard();break}
    case "snd":{e.stopPropagation();const vd=el.parentElement.querySelector("video");if(vd){vd.muted=!vd.muted;if(!vd.muted){vd.currentTime=0;vd.play().catch(()=>{})}el.textContent=vd.muted?"Sound on":"Mute"}break}
    case "dl":{e.stopPropagation();const r=S.results[id][+v];download(r.url,`fal-${slug(st.tab)}-${slug(r.name)}.${extOf(r.url)}`);break}
    case "dlall":{const rs=(S.results[id]||[]).filter(x=>x.url&&x.status==="done");(async()=>{for(const r of rs){await download(r.url,`fal-${slug(st.tab)}-${slug(r.name)}.${extOf(r.url)}`);await sleep(400)}})();break}
    case "dlpicks":(async()=>{for(const p of PIPE){const u=pickedUrl(p.id);if(u){await download(u,`fal-${slug(p.tab)}-pick.${extOf(u)}`);await sleep(400)}}})();break;
    case "next":{const nx=nextOf(st);if(!nx)break;if(nx.prev===id&&S.picked[id]===undefined)return;cmpOff();S.step=nx.id;S.view="preview";
      if(canCarry(nx))S.src[nx.id]="carry";render();scrollWork();break}
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape")$("#modalRoot").innerHTML="";
  if(e.key==="Enter"&&e.target.id==="custom-in"){e.preventDefault();const b=document.querySelector('[data-act="addcustom"]');b&&b.click()}
  if(e.key==="Enter"&&e.target.id==="keyIn"){const b=document.querySelector('[data-act="savekey"]');b&&b.click()}
  const c=e.target.closest&&e.target.closest('[data-act="pick"]');if(c&&e.target===c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();c.click()}
});
function updateEst(){const el=document.getElementById("estLine");if(el)el.innerHTML=estHTML(cur())}
document.addEventListener("input",e=>{
  if(e.target.id==="prIn")S.prompt[S.step]=e.target.value;
  if(e.target.id==="oohIn"){S.text.ooh=e.target.value;updateEst()}
  if(/^roi-/.test(e.target.id||"")){S.roi[e.target.id.slice(4)]=e.target.value;updateRoi()}
});
document.addEventListener("change",e=>{if(e.target.id==="ptypeSel"){S.ptype=e.target.value;S.text.ooh=null;render();return}if(e.target.id==="epSel"){S.ep[S.step]=e.target.value;renderInput();renderPipe();if(S.view==="api")renderResult()}});
document.addEventListener("toggle",e=>{if(e.target.id==="adv")S.advOpen=e.target.open},true);

/* ---------- brand band pixel art ---------- */
function drawPix(){
  const c=$("#pix");if(!c)return;const w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;
  const d=Math.min(2,window.devicePixelRatio||1);c.width=w*d;c.height=h*d;const x=c.getContext("2d");x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);
  let seed=23;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const cell=9;
  const blobs=[[w*.6,h*.38,h*.6],[w*.86,h*.14,h*.5],[w*.95,h*.76,h*.55],[w*.72,h*.95,h*.32]];
  for(let gx=cell/2;gx<w;gx+=cell)for(let gy=cell/2;gy<h;gy+=cell){
    let v=0;for(const [bx,by,br] of blobs){v=Math.max(v,1-Math.hypot(gx-bx,(gy-by)*1.15)/br)}
    v+=(rnd()-.5)*.32;if(v<.2)continue;
    const s=v>.62?3.4:v>.42?3:2.4;x.fillStyle=v>.62?"#A284FF":v>.42?"#5718C0":"#2D2D2F";
    x.beginPath();x.moveTo(gx,gy-s);x.lineTo(gx+s,gy);x.lineTo(gx,gy+s);x.lineTo(gx-s,gy);x.closePath();x.fill();
  }
}
window.addEventListener("resize",()=>{clearTimeout(drawPix.t);drawPix.t=setTimeout(drawPix,120)});

/* open in a working state: step 1 samples shown, the bold can picked */
S.results.concept=buildJobs(ST.concept).jobs.map(j=>Object.assign({},j,{url:j.demo,status:"done",sample:true}));
S.picked.concept="bold";
render();
renderRoi();
requestAnimationFrame(drawPix);
