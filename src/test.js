const fs=require('fs');const {JSDOM}=require('jsdom');
const path=require('path').join(__dirname,'..','index.html');
let html=fs.readFileSync(path,'utf8');
html=html.replace(/\n\}\)\(\);\n<\/script>/,"\nwindow.__T={S,ST,STEPS,PIPE,MORE,SAMP,CATS,buildJobs,jobsFor,ctxOf,srcKind,srcUrl,selOpts,epOf,eps,CMP,cmpOn,cmpOff,run,runPipeline,canCarry,render,chain};\n})();\n</script>");
html=html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>','');
const calls=[];
function mk(host){
 return new JSDOM(html,{url:'https://'+(host||'cpg.example.com')+'/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:false});w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
  w.JSZip=function(){this.file=()=>{};this.generateAsync=async()=>new w.Blob(['x'])};
  w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  w.fetch=async(url,opt)=>{opt=opt||{};const body=opt.body?JSON.parse(opt.body):null;calls.push({url,method:opt.method||'GET',body});
   const J=o=>({ok:true,status:200,json:async()=>o,blob:async()=>new w.Blob(['x'])});
   if(opt.method==='POST'){const ep=url.replace('https://queue.fal.run/','');w.__last=w.__last||{};w.__last[ep]=body;return J({request_id:'r'+calls.length,status_url:'https://queue.fal.run/'+ep+'/requests/r/status',response_url:'https://queue.fal.run/'+ep+'/requests/r'})}
   if(/\/status$/.test(url))return J({status:'COMPLETED',queue_position:0});
   if(/openrouter/.test(url)){const b=w.__last['openrouter/router/vision'];const u=b.image_urls[0];
     const cat=/jymT7|data:image\/jpeg;base64,BOTTLE/.test(u)?'home':/uq8LL/.test(u)?'food':'drinks';
     return J({output:'```json\n{"category":"'+cat+'","product":"'+({home:'laundry detergent bottle',food:'cereal box',drinks:'drinks can'})[cat]+'","brand":"X"}\n```'})}
   if(/image-to-video/.test(url))return J({video:{url:'https://v3b.fal.media/files/b/x/out.mp4'}});
   if(/hunyuan|trellis/.test(url))return J({model_glb:{url:'https://v3b.fal.media/files/b/x/m.glb'}});
   if(/tripo/.test(url))return J({model_mesh:{url:'https://v3b.fal.media/files/b/x/m.glb'}});
   return J({images:[{url:'https://v3b.fal.media/files/b/x/out-'+calls.length+'.jpg'}]});
  };
 }});
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{
 const dom=mk();const w=dom.window,d=w.document;await sleep(50);
 const T=w.__T,S=T.S;const click=sel=>{const el=typeof sel==='string'?d.querySelector(sel):sel;if(!el)throw new Error('no el '+sel);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))};
 ok(d.querySelectorAll('#tabs .tab').length===7,'7 tabs');
 ok(/Variants/.test(d.querySelector('#tabs').textContent)&&!/Flavors/.test(d.querySelector('#tabs').textContent),'tab renamed to Variants');
 ok(d.querySelector('#ptypeSel')&&d.querySelector('#ptypeSel').value==='auto','product type dropdown defaults to auto detect');
 // each sample chain: every step's default selection has samples, and the chain runs end to end
 for(const ch of ['can','box','bottle']){
  S.src.concept=ch;S.results={};S.picked={};S.board=false;S.step='concept';T.render();
  for(const st of T.STEPS){const b=T.buildJobs(st);const miss=b.jobs.filter(j=>!j.demo).map(j=>j.id);ok(!b.error&&b.jobs.length&&!miss.length,`${ch}: samples for ${st.id} (${b.jobs.length}) cat=${T.ctxOf(st).cat}`+(miss.length?' missing '+miss:''))}
  await T.runPipeline();await sleep(20);
  ok(T.PIPE.every(st=>S.picked[st.id]!==undefined&&(S.results[st.id]||[]).every(r=>r.url)),`${ch}: pipeline picks + media`);
  ok(T.PIPE.filter(st=>st.prev).every(st=>S.src[st.id]==='carry'),`${ch}: carried forward ${T.PIPE.map(s=>S.src[s.id]).join(',')}`);
  const vprompt=(S.results.video||[])[0].input.prompt,aprompt=S.results.audiences[0].input.prompt;
  if(ch==='bottle')ok(/laundry/.test(aprompt)&&/never on a dining table/.test(aprompt)&&!/cheers/.test(vprompt),'bottle prompts are laundry-aware');
  if(ch==='box')ok(/cereal box/.test(aprompt)&&/Japan/.test(aprompt),'box prompts use product + market');
 }
 // compare samples on the can chain
 S.src.concept='can';S.results={};S.picked={};T.render();
 for(const id in T.CMP){const st=T.ST[id];S.step=id;T.cmpOn(st);const j=T.jobsFor(st);ok(j.jobs.length===st.models.length&&j.jobs.every(x=>x.demo),'compare samples '+id);T.cmpOff()}
 // manual product type override changes options, and marks unsampled options Live in sample mode
 S.step='variants';S.src.concept='can';T.render();d.querySelector('#ptypeSel').value='home';d.querySelector('#ptypeSel').dispatchEvent(new w.Event('change',{bubbles:true}));
 ok(/Lavender/.test(d.querySelector('#inputPanel').textContent)&&/Scents/.test(d.querySelector('#inputPanel').textContent),'manual Home care shows scents');
 S.ptype='auto';T.render();
 // gallery
 click('[data-act="gallery"]');ok(d.querySelectorAll('.gcard').length===6,'gallery 6 cards');
 for(const ch of ['can','box','bottle']){S.src.concept=ch;S.results={};S.picked={};for(const st of T.MORE){S.gallery=true;T.render();click(`.gcard[data-v="${st.id}"]`);const cards=d.querySelectorAll('#resultPanel .card');ok(cards.length>0&&[...cards].every(c=>c.querySelector('img,video,model-viewer')),`${ch} more ${st.id}: ${cards.length} cards`)}}
 // text checks
 const txt=d.body.textContent;ok(!/—/.test(html),'no em dashes');ok(!/\bFal\b|\bFAL\b/.test(txt),'fal lowercase');
 // LIVE: auto detect on the detergent sketch, then the profile carries down the chain
 S.key='k:s';S.results={};S.picked={};S.src={concept:'bottle'};S.step='concept';S.gallery=false;S.track='budget';S.ep={};T.render();calls.length=0;
 await T.runPipeline();await sleep(20);
 const vis=calls.filter(c=>c.method==='POST'&&/openrouter/.test(c.url));
 ok(vis.length===1&&vis[0].body.model,'live: one vision call for the sketch ('+vis.length+')');
 ok(T.PIPE.every(st=>(S.results[st.id]||[]).every(r=>r.status==='done')),'live pipeline done');
 const post=calls.filter(c=>c.method==='POST'&&!/openrouter/.test(c.url)).map(c=>c.body.prompt||'');
 ok(post.some(p=>/laundry room shelf/.test(p))&&!post.some(p=>/cafe|beach kiosk|market stall/.test(p)),'live localize uses laundry settings');
 ok(!post.some(p=>/cheers|on the table while the people/.test(p)),'live video motions are category-aware');
 ok(S.results.audiences[0].meta.profile.cat==='home','profile carried to audiences');
 // live: every model adapter
 for(const st of T.STEPS){for(const ep of T.eps(st)){S.step=st.id;S.ep[st.id]=ep.key;calls.length=0;await T.run(st);const rs=S.results[st.id];ok(rs.every(r=>r.status==='done'&&r.url),`live ${st.id} ${ep.key}`)}}
 // live: upload triggers detection
 S.step='usage';S.src.usage='upload';S.up.usage='data:image/jpeg;base64,BOTTLE';calls.length=0;T.render();await T.run(T.ST.usage);
 ok(calls.some(c=>/openrouter/.test(c.url))&&T.ctxOf(T.ST.usage).cat==='home','upload auto-detected as home care');
 // review fixes
 S.gallery=false;S.step='concept';T.render();click('[data-act="gallery"]');
 ok(d.querySelector('#work').hidden&&!d.querySelector('#gallery').hidden&&/\[hidden\]\{display:none!important\}/.test(html),'gallery replaces the step panels');
 ok(d.querySelector('#picks').parentElement.hidden,'picks strip hidden in More use cases');
 click('.gcard[data-v="ooh"]');ok(d.querySelector('.subtab[aria-current="page"]').textContent==='Out-of-home','tile highlights its subtab');
 // live: More use cases start from the pipeline pick
 S.picked.variants=S.results.variants[0].id;delete S.src.m3d;S.step='m3d';T.render();ok(T.srcKind(T.ST.m3d)==='carry'&&T.srcUrl(T.ST.m3d)!==T.SAMP.can.base.m3d,'live More use case defaults to your pick');
 // write-ins
 S.step='variants';T.render();d.querySelector('#custom-in').value='Watermelon';d.querySelector('#custom-hex').value='#ff5577';click('[data-act="addcustom"]');
 const wm=T.buildJobs(T.ST.variants).jobs.find(j=>j.name==='Watermelon');ok(wm&&/#FF5577/.test(wm.input.prompt)&&/watermelon illustration/.test(wm.input.prompt),'custom variant with color');
 S.step='localize';T.render();d.querySelector('#custom-in').value='Nigeria';d.querySelector('#custom-lang').value='English';click('[data-act="addcustom"]');
 const ng=T.buildJobs(T.ST.localize).jobs.find(j=>j.name==='Nigeria');ok(ng&&/into English/.test(ng.input.prompt)&&/Nigeria/.test(ng.input.prompt),'custom market with language: '+(ng?ng.input.prompt.slice(0,60):''));
 ok(!/in a supermarket shelf|in an online marketplace/.test(T.buildJobs(T.ST.shelf).jobs.map(j=>j.input.prompt).join(' ')),'shelf prompts read correctly');
 // sandbox
 const d2=mk('x.claudeusercontent.com');await sleep(50);ok(d2.window.document.querySelector('[data-act="compare"]').disabled,'sandbox disables compare');
 console.log(fails?fails+' FAILURES':'ALL PASS');
})().catch(e=>{console.log('ERROR',e.stack);process.exit(1)});
