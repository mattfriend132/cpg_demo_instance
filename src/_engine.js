/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>n==null?"usage-based":"$"+(n>0&&n<0.1&&Math.round(n*1000)%10?n.toFixed(3):n.toFixed(2));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:m);
const I={
  dl:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10"/></svg>',
  ck:'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>',
  up:'<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11V3M4.5 6.5 8 3l3.5 3.5M3 13.5h10"/></svg>',
  ar:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  back:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8H3M7 4 3 8l4 4"/></svg>',
  chev:'<svg class="chev" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg>',
  play:'<svg class="ico" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.2v9.6c0 .5.5.8.9.5l7.2-4.8c.4-.3.4-.8 0-1L5.9 2.7c-.4-.3-.9 0-.9.5Z"/></svg>',
  grid:'<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>'
};
const SANDBOXED=/(^|\.)(claudeusercontent\.com|claude\.ai)$/.test(location.hostname);
const SANDBOXMSG="Live runs can't start inside claude.ai, which blocks calls to outside APIs. Open the hosted version of CPG Studio to run live.";
const NETMSG="Couldn't reach fal from this page. Open the hosted version of CPG Studio to run live.";

/* ---------- prompt templates, editable per step. Words in braces come from the product profile and the option ---------- */
const TPL={
 concept:"Turn this packaging sketch into a photorealistic product photo of the finished {pack}. Design direction: {direction}. Keep the exact pack shape, proportions and layout from the sketch, and keep the brand name and printed text exactly as written: {copy}. Ignore the handwritten notes, arrows, construction lines and the sketchbook. Front three-quarter view, the pack centered on a pure white background, soft even studio lighting with a gentle contact shadow, crisp printed graphics, realistic materials.",
 variants:"Create the {variant} {word} variant of this exact {product}. Keep the same pack shape, brand name, logo, layout, typography, camera angle and lighting. Recolor the main color blocks to {hex} with harmonizing tones, replace the illustration with {art}, and add the name \"{variant}\" in the same typeface just below the product descriptor. Pure white background, crisp printed graphics.",
 shelf:"Place this exact {product} in {placement}. Every other product in the scene is fictional and plain: no logos, no brand names, no readable text, no real store names. Keep the product's shape, label design, colors and all printed text exactly as in the image, at a realistic size for its surroundings. Photorealistic commercial photography, lighting that suits the setting, sharp focus on the product.",
 localize:"Localize this exact {product} for {market}. Keep the brand name and logo exactly as they are. Translate every other word on the pack into {language}, set in a typeface that matches the original style. Keep the pack shape, colors, graphics and illustration the same. Show the pack {setting}, at a realistic size, label facing the camera. Any other products, signs or stores in the scene are generic, with no real logos or brand names. Photorealistic, natural light.",
 audiences:"Create an authentic lifestyle photo for {audience}. This exact {product} appears where it is really used: {usage}. Keep its pack shape, label, colors and text unchanged, label facing the camera, at a realistic size next to people and objects. People, styling and setting feel true to {market}. No other brand logos or readable brand names anywhere in the scene. Natural light, candid editorial photography.",
 video:"{motion} Keep the {product}'s pack, label, colors and text exactly as in the image, at a realistic size. Smooth, realistic motion.",
 personal:"Personalize this exact {product} for one customer. Replace the {word} name line with the words \"{message}\" set in the same typeface and color, sized to fit. Keep everything else on the pack exactly the same: shape, brand name, logo, colors, illustration, camera angle and lighting. Pure white background.",
 ugc:"The person speaks directly to the camera in a casual, upbeat selfie-video style and says: \"{line}\" Natural hand and head movement, they keep holding the {product} with the label visible. Realistic voice, no background music.",
 usage:"Create a styled product photo: {scene}. This exact {product} appears with its pack shape, label, colors and text unchanged, label facing the camera, at a realistic size. No other brand logos or readable brand names. Editorial photography, natural light.",
 ooh:"Show this campaign image as {placement}, photographed in a real city setting. Add the headline \"{headline}\" in bold clean type on the ad. The ad artwork keeps the product, people and colors from the image. Any other signage in the scene is generic, with no real brand names or logos.",
 ab:"Turn this image into a finished social media ad in a {aspect} {format_name} format. Set the headline \"{headline}\" in bold clean sans-serif type with strong contrast, plus a small \"Shop now\" button. Keep the product, people and colors exactly as they are, and do not cover the product."
};
const VPROMPT='You label consumer packaged goods for a creative tool. The image may be a sketch, a packshot or a scene. Identify the main product. Reply with JSON only, no prose: {"category": one of "drinks","food","home","personal", "product": a short noun phrase for the physical pack (for example "slim aluminum drinks can", "cereal box", "laundry detergent bottle", "shampoo bottle"), "brand": the brand name as printed or ""}';

/* ---------- steps: six chained pipeline steps, then the other use cases ---------- */
const IMGM=["nb","seed","klein"];
const smp=id=>(o,c)=>c.base&&c.match?(((SAMP[c.chain].steps||{})[id]||{})[o.id]||null):null;
const STEPS=[
 {id:"concept",group:"pipe",tab:"Concept",title:"From sketch to finished pack",desc:"Turn a rough pack sketch into photoreal renders in every design direction you are weighing, before a single print proof.",
  kind:"image",models:IMGM,presets:()=>PRODUCTS,srcLabel:"Sketch",sq:true,optLabel:()=>"Design directions",optHint:"One render each",
  options:()=>DIRECTIONS,defN:4,ar:()=>"1:1",ph:"direction",
  vars:(o,c)=>({pack:c.pack,copy:c.copy,direction:o.desc}),
  sample:(o,c)=>c.preset&&c.match?IMG[c.preset+"_"+o.id]||null:null},
 {id:"variants",group:"pipe",tab:"Variants",title:"Every variant and edition",desc:"Spin flavors, scents and limited editions from one master pack, matched to exact hex values. Logo, layout and type stay locked.",
  kind:"image",models:IMGM,prev:"concept",baseLabel:"Sample pack",optLabel:c=>CATS[c.cat].vlabel,optHint:"Exact hex values",sq:true,
  options:c=>CATS[c.cat].variants,defN:5,ar:()=>"1:1",ph:"variant",
  vars:o=>({variant:o.name,hex:o.hex,art:o.art}),sample:smp("variants")},
 {id:"shelf",group:"pipe",tab:"Shelf test",title:"Test it on shelf",desc:"See each variant in the aisle where it will really sell, next to generic competitors, plus a marketplace-ready main image, before anything is printed.",
  kind:"image",models:IMGM,prev:"variants",baseLabel:"Sample pack",optLabel:()=>"Placements",optHint:"One image each",
  options:c=>CATS[c.cat].shelf,defN:5,ar:o=>o.ar,ph:"placement",
  vars:o=>({placement:o.desc}),sample:smp("shelf")},
 {id:"localize",group:"pipe",tab:"Localize",title:"Localize for every market",desc:"Translate the pack copy and show it where it is used in each market. Headline and variant text only: legal and nutrition panels still go through your normal artwork process.",
  kind:"image",models:IMGM,prev:"variants",baseLabel:"Sample pack",optLabel:()=>"Markets",optHint:"One image each",
  options:()=>MARKETS,defN:6,ar:()=>"4:5",ph:"market",
  vars:(o,c)=>({market:o.name,language:o.lang,setting:CATS[c.cat].setting(o)}),sample:smp("localize"),meta:o=>({market:o.name})},
 {id:"audiences",group:"pipe",tab:"Audiences",title:"Personalize by audience and moment",desc:"Lifestyle imagery for each audience and occasion, in the places the product is really used, cast and styled for the market you picked.",
  kind:"image",models:IMGM,prev:"localize",baseLabel:"Sample pack, localized",optLabel:()=>"Audiences and moments",optHint:"One image each",custom:"Describe an audience or moment",
  options:c=>CATS[c.cat].audiences,defN:4,ar:()=>"4:5",ph:"audience",
  vars:(o,c)=>({audience:o.desc,market:c.market,usage:CATS[c.cat].where}),sample:smp("audiences")},
 {id:"video",group:"pipe",tab:"Social video",title:"Social video in seconds",desc:"Turn a campaign still into short clips for Reels, TikTok and retail media. One still, every cut you need.",
  kind:"video",models:["h3","h3t","kling","veo"],prev:"audiences",baseLabel:"Sample scene",optLabel:()=>"Motion",optHint:"One clip each",custom:"Describe the motion",
  options:c=>CATS[c.cat].motions,defN:3,ar:()=>"4:5",ph:"motion",dur:true,
  vars:o=>({motion:o.desc}),sample:smp("video")},

 {id:"personal",group:"more",tab:"Personalized packs",title:"A pack for every person",desc:"Names, messages and moments printed on the pack for gifting, loyalty and promotions. One template, thousands of versions.",
  kind:"image",models:IMGM,prev:"variants",baseLabel:"Sample pack",optLabel:()=>"Messages",optHint:"One pack each",custom:"Type a name or message, like Go team Lena",sq:true,
  options:c=>CATS[c.cat].names,defN:4,ar:()=>"1:1",ph:"message",
  vars:o=>({message:o.name}),sample:smp("personal")},
 {id:"ugc",group:"more",tab:"UGC creator ads",title:"Creator-style ads with speech",desc:"An AI presenter holds the product and talks to camera, with voice. Label AI presenters as each platform requires.",
  kind:"video",models:["veo","kling"],presets:()=>SAMP[chain()].creators,srcLabel:"Creator",optLabel:()=>"Script",optHint:"One clip each",custom:"Type a line for the presenter to say",
  options:c=>CATS[c.cat].scripts,defN:1,ar:()=>"9:16",ph:"line",fixedDur:8,audio:true,
  vars:o=>({line:o.desc}),sample:(o,c)=>c.preset&&c.match?SAMP[c.chain].ugc[c.preset+"_"+o.id]||null:null},
 {id:"usage",group:"more",tab:"Usage scenes",title:"Show it in use",desc:"Recipes, serves, routines and before-and-afters, styled for the product's category, without a studio day.",
  kind:"image",models:IMGM,prev:"variants",baseLabel:"Sample pack",optLabel:()=>"Scenes",optHint:"One image each",custom:"Describe a scene",
  options:c=>CATS[c.cat].usage,defN:4,ar:()=>"4:5",ph:"scene",
  vars:o=>({scene:o.desc}),sample:smp("usage")},
 {id:"m3d",group:"more",tab:"3D and AR",title:"A 3D model from one image",desc:"Turn a packshot into a textured 3D model for 360 viewers, AR try-out, virtual shelves and retail media. Small print on the texture can soften, so keep final artwork for print.",
  kind:"3d",models:["hun","trellis","tripo"],prev:"variants",baseLabel:"Sample pack",sq:true,
  options:()=>[{id:"glb",name:"3D model"}],defN:1,ar:()=>"1:1"},
 {id:"ooh",group:"more",tab:"Out-of-home",title:"See it out in the world",desc:"Mock the campaign up on billboards, transit and in-store displays to sell it in, before you buy media.",
  kind:"image",models:IMGM,prev:"audiences",baseLabel:"Sample scene",optLabel:()=>"Placements",optHint:"One mock-up each",headline:true,
  options:()=>OOH,defN:3,ar:o=>o.ar,ph:"placement",
  vars:(o,c)=>({placement:o.desc,headline:oohHeadline(c)}),sample:(o,c)=>!S.text.ooh||S.text.ooh.trim()===CATS[c.cat].headlines[0].name?smp("ooh")(o,c):null},
 {id:"ab",group:"more",tab:"A/B ad variants",title:"Ad variants for testing",desc:"One key visual, many headlines and formats, so performance teams can test dozens of variants instead of three.",
  kind:"image",models:IMGM,prev:"audiences",baseLabel:"Sample scene",optLabel:()=>"Headlines",optHint:"One ad each",custom:"Type a headline",fmt:true,
  options:c=>CATS[c.cat].headlines,defN:4,ar:()=>abFmt().r,ph:"headline",
  vars:o=>({headline:o.name,aspect:abFmt().r,format_name:abFmt().word}),sample:(o,c)=>S.abfmt==="p45"?smp("ab")(o,c):null}
];
const ST={};STEPS.forEach((s,i)=>{s.idx=i;ST[s.id]=s});
const PIPE=STEPS.filter(s=>s.group==="pipe"),MORE=STEPS.filter(s=>s.group==="more");
const FAST_MODEL={video:"h3t",ugc:"veo",m3d:"hun"};
const abFmt=()=>AB_FORMATS.find(f=>f.id===S.abfmt)||AB_FORMATS[0];
const oohHeadline=c=>(S.text.ooh||"").trim()||CATS[c.cat].headlines[0].name;

/* ---------- state ---------- */
const S={
 step:"concept",gallery:false,track:"premium",key:LS.get("fal_key"),spend:0,view:"preview",vdur:6,abfmt:"p45",ptype:"auto",
 sel:{},selCat:{},extra:{},src:{concept:"can"},text:{ooh:null},det:{},detecting:{},detErr:null,
 up:{},ep:{},prompt:{},results:{},picked:{},running:{},batch:{},cancel:{},busy:{},cmp:null,cmpSave:null,board:false,pipe:null,
 roi:{skus:40,markets:8,images:4,videos:2}
};
STEPS.forEach(s=>{S.sel[s.id]=[];S.extra[s.id]=[]});
const cur=()=>ST[S.step];
const liveMode=()=>!!S.key&&!SANDBOXED;

/* ---------- sources: preset tiles, carry from an earlier step, the sample input, or an upload ---------- */
function pickedRes(id){const r=S.results[id];return r?r.find(x=>x.id===S.picked[id]):null}
function pickedUrl(id){const p=pickedRes(id);return p&&p.status==="done"&&p.url?p.url:null}
/* the sample chain follows the sketch chosen in Concept */
function chain(){const k=S.src.concept;return SAMP[k]?k:"can"}
const base=id=>SAMP[chain()].base[id];
function presetsOf(st){return st.presets?st.presets():null}
function canCarry(st){if(!st.prev)return false;const c=pickedUrl(st.prev);if(!c)return false;if(liveMode())return true;return c===base(st.id)}
function srcKind(st){
  const ps=presetsOf(st),dflt=ps?ps[0].id:"base";let m=S.src[st.id]||dflt;
  if(ps&&m!=="upload"&&m!=="carry"&&!ps.some(p=>p.id===m))m=dflt;
  if(m==="carry"&&!canCarry(st))return dflt;
  if(m==="upload"&&(!S.up[st.id]||!liveMode()))return dflt;
  return m;
}
function srcUrl(st){const m=srcKind(st);if(m==="upload")return S.up[st.id];if(m==="carry")return pickedUrl(st.prev);const ps=presetsOf(st);if(ps){const p=ps.find(x=>x.id===m);return p?p.img:null}return base(st.id)}

/* ---------- product profile: category, product noun and brand, carried down the chain ----------
   Auto detect asks a vision model on fal about the source image; a manual pick overrides the category. */
function profileOf(st,c){
  let p=null;const url=srcUrl(st);
  if(c.kind==="carry"){const r=pickedRes(st.prev);p=r&&r.meta&&r.meta.profile}
  else if(c.kind==="upload")p=S.det[url]||null;
  else if(st.id==="concept")p=(liveMode()&&S.det[url])||PROFILES[c.preset];
  else p=PROFILES[c.chain];
  p=p?Object.assign({},p):{cat:"drinks",product:"product",brand:"",pending:true};
  if(S.ptype!=="auto"){if(p.cat!==S.ptype&&p.pending)p.product=CATS[S.ptype].noun;p.cat=S.ptype;p.manual=true}
  return p;
}
function ctxOf(st){
  const m=srcKind(st),ch=chain(),c={kind:m,chain:ch,base:false,preset:null};
  if(st.presets){if(m!=="upload"&&m!=="carry")c.preset=m}else c.base=srcUrl(st)===base(st.id);
  c.profile=profileOf(st,c);c.cat=c.profile.cat;
  /* samples only apply when the category matches the sample chain's category */
  c.match=c.cat===(st.id==="concept"&&c.preset?PROFILES[c.preset]:PROFILES[ch]).cat;
  if(st.id==="concept"){const pr=c.preset?PRODUCTS.find(p=>p.id===c.preset):null;c.pack=pr?pr.pack:(c.profile.pending?"product package":c.profile.product);c.copy=pr?pr.copy:"every brand name and word exactly as written"}
  if(st.id==="audiences"){const r=m==="carry"?pickedRes("localize"):null;c.market=r&&r.meta&&r.meta.market?r.meta.market:m==="base"?SAMP[ch].market:"the target market"}
  return c;
}
function opts(st,c){return st.options(c||ctxOf(st)).concat(S.extra[st.id]||[])}
/* in sample mode an option is only offered when a pre-generated sample exists for it */
function optLive(st,o,c){if(liveMode())return false;if(st.kind==="3d")return false;return !st.sample(o,c)}
function selOpts(st){
  const c=ctxOf(st),all=opts(st,c),usable=all.filter(o=>!optLive(st,o,c));
  /* a new category or sample chain resets the selection to that category's defaults */
  const key=c.cat+"|"+c.chain+"|"+liveMode();
  if(S.selCat[st.id]!==key){S.selCat[st.id]=key;S.sel[st.id]=usable.slice(0,st.defN).map(o=>o.id)}
  let ids=S.sel[st.id].filter(id=>usable.some(o=>o.id===id));
  if(!ids.length&&usable[0])ids=[usable[0].id];
  S.sel[st.id]=ids;return all.filter(o=>ids.includes(o.id));
}

/* ---------- models ---------- */
const durOf=st=>st.fixedDur||(st.dur?S.vdur:0);
function eps(st){return st.models.map(k=>{const m=MDL[k];return Object.assign({key:k,label:m.name},m,{unit:m.ps?m.ps*durOf(st):m.unit})})}
function epOf(st){const l=eps(st);const k=S.ep[st.id]||(S.track==="premium"?l[0].key:(FAST_MODEL[st.id]||"klein"));return l.find(e=>e.key===k)||l[0]}
function fallbackOf(st){const k=FALLBACK[epOf(st).key];return k?eps(st).find(e=>e.key===k)||null:null}
const priceTxt=e=>e.per?e.per:e.ps?money(e.ps)+" per second":money(e.unit)+(e.m3d?" per model":" per image");
const SD_SIZE={"1:1":{width:1536,height:1536},"3:4":{width:1344,height:1792},"4:3":{width:1792,height:1344},"4:5":{width:1440,height:1800},"9:16":{width:1152,height:2048},"16:9":{width:2048,height:1152}};
const FX_SIZE={"1:1":{width:1024,height:1024},"3:4":{width:768,height:1024},"4:3":{width:1024,height:768},"4:5":{width:896,height:1120},"9:16":{width:768,height:1344},"16:9":{width:1344,height:768}};
/* one prompt, several APIs: each model family takes its own input shape */
function imgInput(ep,prompt,urls,ar){
  if(ep.key==="seed")return {prompt,image_urls:urls,image_size:SD_SIZE[ar]||"auto_2K",output_format:"jpeg"};
  if(ep.key==="klein")return {prompt,image_urls:urls,image_size:FX_SIZE[ar]||"square_hd",output_format:"jpeg"};
  return {prompt,image_urls:urls,num_images:1,aspect_ratio:ar||"auto",output_format:"jpeg"};
}
function vidInput(ep,prompt,url,dur,st){
  if(ep.key==="kling")return {prompt,start_image_url:url,duration:String(dur),generate_audio:!!st.audio};
  if(ep.key==="veo"){const o={prompt,image_url:url,duration:dur+"s",generate_audio:!!st.audio,resolution:"720p"};if(st.audio)o.aspect_ratio="9:16";return o}
  return {prompt,image_url:url,duration:dur,resolution:"768P",prompt_expansion_mode:"balanced"};
}
function m3dInput(ep,url){
  if(ep.key==="hun")return {input_image_url:url};
  if(ep.key==="tripo")return {image_url:url,texture:true,pbr:true};
  return {image_url:url};
}
const tplOf=st=>S.prompt[st.id]!=null?S.prompt[st.id]:TPL[st.id];

function buildJobs(st,epArg){
  const ep=epArg||epOf(st),jobs=[];let error=null;
  const src=srcUrl(st),c=ctxOf(st),prof=c.profile;
  if(!src)error=st.presets?"Pick a "+st.srcLabel.toLowerCase()+" first.":"Pick a source image first.";
  if(st.kind==="3d"){
    const g=c.base&&c.match?SAMP[c.chain].glb[ep.key]:null;
    jobs.push({id:"glb-"+ep.key,name:ep.name,endpoint:ep.id,cost:ep.unit,input:m3dInput(ep,src),demo:g?g.url:null,poster:g?g.poster:src,m3d:true,ar:"1/1",sampleSecs:g?g.secs:null,meta:{profile:prof}});
    return {jobs,error};
  }
  const common={product:prof.product,word:CATS[prof.cat].word,usage:CATS[prof.cat].where};
  for(const o of selOpts(st)){
    const prompt=fill(tplOf(st),Object.assign({},common,st.vars(o,c)));
    const ar=st.ar(o);
    const input=st.kind==="video"?vidInput(ep,prompt,src,durOf(st),st):imgInput(ep,prompt,[src],ar);
    jobs.push({id:o.id,name:o.name,endpoint:ep.id,cost:ep.unit,input,demo:st.sample(o,c),meta:Object.assign({profile:prof},st.meta?st.meta(o,c):{}),
      video:st.kind==="video",poster:st.kind==="video"?src:null,ar:ar.replace(":","/"),hex:o.hex});
  }
  if(!jobs.length&&!error)error="Pick at least one option.";
  return {jobs,error};
}

/* ---------- compare models: pre-generated on the drinks can chain, with measured generation times on fal ---------- */
const onCan=()=>chain()==="can"&&S.ptype!=="food"&&S.ptype!=="home"&&S.ptype!=="personal";
const CMP={
 concept:{what:"the can sketch in Bold and bright",ok:()=>srcKind(ST.concept)==="can"&&onCan()&&S.sel.concept[0]==="bold",def:()=>{S.src.concept="can";S.sel.concept=["bold"]},
  nb:[IMG.can_bold,null],seed:[U("0aad965d/P8P14Y1MRBc3hNNwF9pr1_4e7c6931a1a3403f9665b78a404f19a3.jpg"),54],klein:[U("0aad9657/jbH3DqzcxkdNY58OvvjGs_wF03awI8.jpg"),2]},
 variants:{what:"Pink Grapefruit on the sample can",ok:()=>onCan()&&ctxOf(ST.variants).base&&S.sel.variants[0]==="grapefruit",def:()=>{S.src.variants="base";S.sel.variants=["grapefruit"]},
  nb:[SAMP.can.steps.variants.grapefruit,11],seed:[U("0aad965b/uPxSzUrmXUzjbBYVlnJXJ_6d5ef8d58a5a4180bb88b6c2ade0585b.jpg"),39],klein:[U("0aad9658/0mYFrfSni70gDZYKn2nE4_MPVoHKRR.jpg"),2]},
 shelf:{what:"the store shelf with the sample can",ok:()=>onCan()&&ctxOf(ST.shelf).base&&S.sel.shelf[0]==="shelf",def:()=>{S.src.shelf="base";S.sel.shelf=["shelf"]},
  nb:[SAMP.can.steps.shelf.shelf,13],seed:[U("0aad9673/eLsmRVYjB1ISzujJ12DE6_e0e7f1157a6840b286fae3d92833d81f.jpg"),139],klein:[U("0aad9665/7JrW9JWihdzjTnCJwFvEO_noZy8BJg.jpg"),2]},
 localize:{what:"Mexico on the sample can",ok:()=>onCan()&&ctxOf(ST.localize).base&&S.sel.localize[0]==="mx",def:()=>{S.src.localize="base";S.sel.localize=["mx"]},
  nb:[SAMP.can.steps.localize.mx,11],seed:[U("0aad9674/5PIcMASPoFgDwH30AiAhp_d91ac2e740ba4750877ca0299f4cbf89.jpg"),119],klein:[U("0aad9668/ShaaPjgMZQkU_a-DVXPqK_rKxcZnY6.jpg"),2]},
 audiences:{what:"the Gen Z rooftop with the Mexico can",ok:()=>onCan()&&ctxOf(ST.audiences).base&&S.sel.audiences[0]==="genz",def:()=>{S.src.audiences="base";S.sel.audiences=["genz"]},
  nb:[SAMP.can.steps.audiences.genz,12],seed:[U("0aad9698/K_N2Da4bJ9m1mOEvUYtCs_028a29a72bd144f7a737d07a41adf7f4.jpg"),134],klein:[U("0aad968b/A1YaCpJAOWihAUfIl88uC_fjUSC8G2.jpg"),2]},
 video:{what:"a 6 second slow push-in on the sample scene",ok:()=>onCan()&&ctxOf(ST.video).base&&S.sel.video[0]==="push"&&S.vdur===6,def:()=>{S.src.video="base";S.sel.video=["push"];S.vdur=6},
  h3:[SAMP.can.steps.video.push,6],h3t:[U("0aad96a1/ZO8VQoc52ysPE4M2Els4o_minimax-h3.mp4"),6],kling:[U("0aad96ac/vpZur4WrW-pGMtB6tQNdX_output.mp4"),121],veo:[U("0aad96a7/xfkmeQqvUKO765D0ig21a_1537ce24927442679ecf448c13ae398a.mp4"),66]},
 ugc:{what:"the kitchen creator with the taste test script",ok:()=>onCan()&&srcKind(ST.ugc)==="kitchen"&&S.sel.ugc[0]==="taste",def:()=>{S.src.ugc="kitchen";S.sel.ugc=["taste"]},
  veo:[SAMP.can.ugc.kitchen_taste,60],kling:[U("0aad96ad/Ep7Ta_WfZ9g-tfvMxkIFW_output.mp4"),126]},
 m3d:{what:"the sample can",ok:()=>onCan()&&ctxOf(ST.m3d).base,def:()=>{S.src.m3d="base"},
  hun:[SAMP.can.glb.hun.url,162],trellis:[SAMP.can.glb.trellis.url,253],tripo:[SAMP.can.glb.tripo.url,207]}
};
const canCompare=st=>liveMode()||(!SANDBOXED&&!!CMP[st.id]&&onCan());
function cmpOn(st){selOpts(st);S.cmpSave={sel:S.sel[st.id].slice()};S.sel[st.id].splice(1);S.cmp=st.id;if(!liveMode()&&CMP[st.id])CMP[st.id].def()}
function cmpOff(){if(S.cmp==null)return;const id=S.cmp,sv=S.cmpSave||{};if(sv.sel){const c0=S.sel[id][0];S.sel[id]=sv.sel;if(c0!=null&&!S.sel[id].includes(c0))S.sel[id].push(c0)}S.cmp=null;S.cmpSave=null}
function pickOpt(st,v){selOpts(st);const a=S.sel[st.id];if(S.cmp===st.id){a.splice(0,a.length,v);return}const k=a.indexOf(v);if(k>-1){if(a.length>1)a.splice(k,1)}else a.push(v)}
function jobsFor(st){
  if(S.cmp!==st.id)return buildJobs(st);
  const c=CMP[st.id],ok=!!(c&&c.ok()),out=[];let error=null;
  for(const ep of eps(st)){const b=buildJobs(st,ep);if(b.error){error=b.error;break}const j=b.jobs[0];if(!j)continue;
    const s=ok&&c[ep.key];
    out.push(Object.assign({},j,{id:"m-"+ep.key,name:ep.name,lab:ep.lab,model:ep.key,opt:j.name,demo:s?s[0]:null,sampleSecs:s?s[1]:null,poster:j.m3d&&s?(SAMP.can.glb[ep.key].poster||j.poster):j.poster}));}
  if(!out.length&&!error)error="Pick an option first.";
  return {jobs:error?[]:out,error};
}
const unitWord=st=>st.kind==="video"?"clip":st.kind==="3d"?"model":"image";
function estHTML(st){
  const {jobs}=jobsFor(st),n=jobs.length,known=jobs.filter(j=>j.cost!=null),tot=known.reduce((a,j)=>a+j.cost,0),u=unitWord(st);
  if(S.cmp===st.id)return `${n} models, one ${u} each = <b>${known.length===n?money(tot):"about "+money(tot)+" plus usage-based"}</b>`;
  const ep=epOf(st);if(ep.unit==null)return `${n} ${u}, ${esc(ep.per)}`;
  return `${n} ${u}${n===1?"":"s"} × ${money(ep.unit)} = <b>${money(tot)}</b>`;
}

/* ---------- fal queue API ---------- */
async function errOf(res){
  let t="";try{const j=await res.json();const d=j.detail;t=typeof d==="string"?d:Array.isArray(d)?d.map(x=>x.msg||JSON.stringify(x)).join("; "):(j.message||j.error||"")}catch(e){}
  if(res.status===401||res.status===403)return "fal rejected this key. Check it under Add fal key.";
  return String(t||("Request failed ("+res.status+")")).slice(0,200);
}
function tfetch(url,opt,ms){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms||30000);return fetch(url,Object.assign({},opt,{signal:c.signal})).finally(()=>clearTimeout(t))}
function outOf(j){
  const f=(j.images&&j.images[0])||j.image||j.video||j.model_glb||(j.model_urls&&j.model_urls.glb)||j.model_mesh;
  const p=j.thumbnail||j.rendered_image;
  return f&&f.url?{url:f.url,poster:p&&p.url?p.url:null}:null;
}
async function falCall(endpoint,input,onStatus,isCancelled){
  const H={"Authorization":"Key "+S.key,"Content-Type":"application/json"};
  let res;try{res=await tfetch("https://queue.fal.run/"+endpoint,{method:"POST",headers:H,body:JSON.stringify(input)},45000)}catch(e){throw new Error(e.name==="AbortError"?"fal didn't respond. Check your connection and try again.":NETMSG)}
  if(!res.ok)throw new Error(await errOf(res));
  const sub=await res.json();
  if(!sub.status_url||!sub.response_url)throw new Error("fal did not accept the request.");
  const started=Date.now();
  for(;;){
    await sleep(1500);
    if(isCancelled&&isCancelled()){if(sub.cancel_url)tfetch(sub.cancel_url,{method:"PUT",headers:H},10000).catch(()=>{});throw new Error("Cancelled")}
    if(Date.now()-started>10*60*1000)throw new Error("Still waiting in fal's queue after 10 minutes. Try again or switch to a faster model.");
    let r;try{r=await tfetch(sub.status_url,{headers:H},20000)}catch(e){continue}
    if(!r.ok)throw new Error(await errOf(r));
    const s=await r.json();onStatus&&onStatus(s.status,s.queue_position,sub.request_id);
    if(s.status==="COMPLETED")break;
  }
  let out;try{out=await tfetch(sub.response_url,{headers:H},30000)}catch(e){throw new Error(NETMSG)}
  if(!out.ok)throw new Error(await errOf(out));
  return out.json();
}
async function falRun(endpoint,input,onStatus,isCancelled){
  const o=outOf(await falCall(endpoint,input,onStatus,isCancelled));
  if(!o)throw new Error("fal returned no output for this request.");
  return o;
}
/* vision auto detect: one small call per source image, cached */
function parseProfile(txt){
  const m=String(txt||"").match(/\{[\s\S]*\}/);if(!m)return null;
  let j;try{j=JSON.parse(m[0])}catch(e){return null}
  const cat=CAT_IDS.includes(j.category)?j.category:null;if(!cat)return null;
  return {cat,product:String(j.product||CATS[cat].noun).slice(0,60),brand:String(j.brand||"").slice(0,40),detected:true};
}
async function detect(url){
  if(!url||S.det[url]||S.detecting[url])return;
  S.detecting[url]=true;S.detErr=null;if(typeof renderInput==="function"&&!S.gallery)renderInput();
  try{const j=await falCall(VISION.id,{model:VISION.model,image_urls:[url],prompt:VPROMPT});const p=parseProfile(j.output);
    if(p){S.det[url]=p;S.spend+=0.001}else S.detErr="The vision model couldn't tell what the product is. Pick a product type.";}
  catch(e){S.detErr="Auto detect failed: "+e.message}
  finally{delete S.detecting[url];if(typeof render==="function")render()}
}
/* auto detect runs on uploads and, live, on the Concept sketch; carried picks already know their profile */
function needsDetect(st){if(S.ptype!=="auto"||!liveMode())return null;const m=srcKind(st);if(m==="upload"||(st.id==="concept"&&m!=="carry"))return srcUrl(st);return null}

async function run(st){
  const id=st.id;if(S.running[id])return;
  const du=needsDetect(st);if(du&&!S.det[du]){await detect(du);if(!S.det[du]&&!S.pipe){toast(S.detErr||"Pick a product type first.");return}}
  const {jobs,error}=jobsFor(st);
  if(error){toast(error);return}
  delete S.picked[id];S.view="preview";
  if(S.key&&SANDBOXED&&!S.pipe)toast(SANDBOXMSG);
  if(!liveMode()){
    S.results[id]=jobs.map(j=>Object.assign({},j,{url:j.demo,status:"done",sample:true,secs:j.sampleSecs}));
    S.batch[id]=null;render();return;
  }
  const items=jobs.map(j=>Object.assign({},j,{status:"queued"}));
  const rid=(S.rid=(S.rid||0)+1);S.runOf=S.runOf||{};S.runOf[id]=rid;S.results[id]=items;S.running[id]=true;S.cancel[id]=false;S.busy[id]=0;
  const t0=performance.now();items.forEach(it=>it.t0=Date.now());render();
  const tick=setInterval(()=>items.forEach((it,k)=>{if(it.status==="queued"||it.status==="running")updateCard(id,k)}),1000);
  await Promise.all(items.map(async(it,k)=>{
    const s0=performance.now();
    try{
      const o=await falRun(it.endpoint,it.input,(stt,pos,req)=>{it.reqId=req;const ns=stt==="IN_QUEUE"?"queued":"running";if(ns!==it.status||pos!==it.pos){it.status=ns;it.pos=pos;updateCard(id,k);if(ns==="queued"&&pos>25&&!S.busy[id]){S.busy[id]=pos;if(S.step===id)renderResult()}}},()=>S.cancel[id]);
      it.url=o.url;if(o.poster)it.poster=o.poster;
      it.secs=(performance.now()-s0)/1000;it.status="done";S.spend+=it.cost||0;
    }catch(e){it.status="error";it.err=e.message}
    updateCard(id,k);renderTop();
  }));
  clearInterval(tick);if(S.runOf[id]!==rid)return;S.running[id]=false;S.batch[id]={secs:(performance.now()-t0)/1000};
  if(items.every(x=>x.status==="error")&&items[0].err&&!S.cancel[id])toast(items[0].err);
  render();
}

/* ---------- full pipeline: each step's pick feeds the next ---------- */
function pipelineEstimate(){let n=0,c=0;PIPE.forEach(st=>{const k=selOpts(st).length;n+=k;c+=k*(epOf(st).unit||0)});return {n,c}}
async function runPipeline(){
  if(S.pipe||STEPS.some(st=>S.running[st.id]))return;
  const live=liveMode(),t0=performance.now();
  cmpOff();S.pipe={i:0};S.board=false;S.gallery=false;renderBoard();renderPipe();
  for(let i=0;i<PIPE.length;i++){
    const st=PIPE[i];S.pipe.i=i;S.step=st.id;S.view="preview";
    if(st.prev)S.src[st.id]=canCarry(st)?"carry":"base";
    render();
    await run(st);
    if(!live)await sleep(380);
    const done=(S.results[st.id]||[]).filter(x=>x.status==="done"&&x.url);
    if(!done.length){toast("The "+st.tab+" step didn't return a result, so the pipeline stopped there.");S.pipe=null;render();return}
    const pref=SAMP[chain()].pref[st.id];
    S.picked[st.id]=(done.find(x=>x.id===pref)||done[0]).id;
  }
  S.boardStats={secs:(performance.now()-t0)/1000,live};
  S.pipe=null;S.board=true;render();
  const b=$("#board");b&&b.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
