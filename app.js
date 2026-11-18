(() => {
  const STORE = 'gfc-club-desk-v1';
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const safe = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const today = () => new Date().toISOString().slice(0,10);
  const initialSquad = (window.GFC_INITIAL_SQUAD || []).map(p => ({...p}));
  const defaultCardTemplate=()=>({id:'gfc-classic',name:'GFC Red & Black',width:902,height:1389,background:'',source:'built-in',layers:[
    {id:'photo',label:'Player photo',type:'photo',field:'photo',x:15,y:18,w:80,h:68,fit:'cover',focusX:50,focusY:43,visible:true},
    {id:'logo',label:'Club crest',type:'logo',src:'assets/brand/gfc-logo.png',x:4,y:4,w:13,h:12,visible:true},
    {id:'number',label:'Shirt number',type:'text',field:'number',x:5,y:24,w:24,h:16,fontSize:10,color:'#ed1c24',font:'Winner GFC',align:'left',visible:true},
    {id:'position',label:'Position',type:'text',field:'position',x:5,y:43,w:24,h:10,fontSize:5.5,color:'#ed1c24',font:'Winner GFC',align:'left',visible:true},
    {id:'name',label:'Player name',type:'text',field:'name',x:8,y:79,w:82,h:10,fontSize:7.3,color:'#ed1c24',font:'Winner GFC',align:'center',visible:true},
    {id:'rating',label:'Rating',type:'text',field:'rating',x:70,y:91,w:25,h:6,fontSize:4.2,color:'#fff7f5',font:'Winner GFC',align:'right',visible:true}
  ]});

  let data;
  const shapesFor=size=>size===7?['2-3-1','3-2-1','2-2-2','3-1-2']:['4-3-3','4-4-2','4-2-3-1','3-5-2','3-4-3','5-3-2'];
  // Accepts anything (old localStorage data, a backup file, nothing) and returns safe, complete app data.
  function normalize(raw){
    raw=raw&&typeof raw==='object'?raw:{};
    const d={squad:Array.isArray(raw.squad)?raw.squad:initialSquad,cardTemplates:Array.isArray(raw.cardTemplates)?raw.cardTemplates.filter(t=>t&&t.id):[],activeCardTemplateId:raw.activeCardTemplateId||'gfc-classic',cardTemplateFilter:raw.cardTemplateFilter||'all',matches:raw.matches||[],growth:raw.growth||[],posts:raw.posts||[],formation:raw.formation||{size:11,shape:'4-3-3',slots:{},bench:[]}};
    d.cardTemplates.forEach(t=>{if(!Array.isArray(t.layers))t.layers=defaultCardTemplate().layers;t.width=t.width||902;t.height=t.height||1389;});
    if(!d.cardTemplates.some(t=>t.id==='gfc-classic'))d.cardTemplates.unshift(defaultCardTemplate());
    const known=id=>id==='gfc-original'||d.cardTemplates.some(t=>t.id===id);
    if(!known(d.activeCardTemplateId)||d.activeCardTemplateId==='gfc-original')d.activeCardTemplateId='gfc-classic';
    if(d.cardTemplateFilter!=='all'&&!known(d.cardTemplateFilter))d.cardTemplateFilter='all';
    d.squad=d.squad.map(p=>{const original=initialSquad.find(q=>q.id===p.id);let templateId=p.templateId||(String(p.card||'').startsWith('assets/cards/')?'gfc-original':'gfc-classic');if(!known(templateId)||(templateId==='gfc-original'&&!original?.card&&!p.card))templateId='gfc-classic';return {...original,...p,templateId,card:templateId==='gfc-original'?(original?.card||p.card||''):(p.card||'')};});
    d.squad.forEach(p=>{const f=p.face,ok=f&&typeof f==='object'&&[f.x,f.y,f.s].every(v=>Number.isFinite(+v)&&v!==null);if(ok)p.face={x:Math.min(1,Math.max(0,+f.x)),y:Math.min(1,Math.max(0,+f.y)),s:Math.min(.95,Math.max(.05,+f.s))};else delete p.face;});
    d.packs={};for(const m of d.matches){const r=raw.packs?.[m.id];if(!r||typeof r!=='object')continue;const D=PACK_DEFAULT,n=(k,lo,hi)=>cl(r[k]??D[k],lo,hi);
      d.packs[m.id]={bg:typeof r.bg==='string'&&r.bg.startsWith('data:image/')?r.bg:'',fx:n('fx',0,100),fy:n('fy',0,100),bgZoom:n('bgZoom',100,300),tint:n('tint',0,1),shade:n('shade',0,.8),vignette:n('vignette',0,.9),grain:n('grain',0,1),primary:/^#[0-9a-f]{6}$/i.test(r.primary)?r.primary:D.primary,font:typeof r.font==='string'?r.font:'',format:r.format==='story'?'story':'feed',pitch:PITCHES.some(q=>q[0]===r.pitch)?r.pitch:'classic',cardStyle:r.cardStyle==='match'||(Array.isArray(raw.cardStyles)&&raw.cardStyles.some(x=>x&&x.id===r.cardStyle))||(Array.isArray(raw.cardDesigns)&&raw.cardDesigns.some(x=>x&&`design:${x.id}`===r.cardStyle))?r.cardStyle:'',layouts:r.layouts&&typeof r.layouts==='object'?r.layouts:{}};}
    d.fonts=Array.isArray(raw.fonts)?raw.fonts.filter(x=>x&&x.name&&x.src).map(x=>({name:x.name,src:x.src})):[];
    d.cardTemplates.forEach(t=>{if(Array.isArray(t.fonts)){t.fonts.forEach(x=>{if(x&&x.name&&x.src&&!d.fonts.some(y=>y.name===x.name))d.fonts.push({name:x.name,src:x.src});});delete t.fonts;}});
    const cleanEd=s=>{const o={};if(!s||typeof s!=='object')return o;if(GC.PRESETS.some(q=>q.id===s.preset))o.preset=s.preset;if(GC.PATTERNS.some(q=>q[0]===s.pattern))o.pattern=s.pattern;if(GC.SHAPES.some(q=>q[0]===s.shape))o.shape=s.shape;if(s.frameTop===true)o.frameTop=true;for(const k of ['shapeImg','bg','frame'])if(typeof s[k]==='string'&&s[k].startsWith('data:image/'))o[k]=s[k];for(const k of ['c1','c2','accent','ink'])if(/^#[0-9a-f]{6}$/i.test(s[k]))o[k]=s[k];if(typeof s.label==='string')o.label=s.label.slice(0,18);if(s.stats===false)o.stats=false;if(typeof s.designId==='string'&&s.designId.length<=40)o.designId=s.designId;if(s.shine===false)o.shine=false;if(typeof s.font==='string'&&(d.fonts.some(f=>f.name===s.font)||['Winner GFC','Bebas GFC','Arial'].includes(s.font)))o.font=s.font;return o;};
    const oldLogo=/assets\/brand\/gfc-(crest\.png|circle\.jpg)$/,newLogo=v=>typeof v==='string'&&oldLogo.test(v)?'assets/brand/gfc-logo.png':v;
    d.cardTemplates.forEach(t=>(t.layers||[]).forEach(l=>{if(l&&l.src)l.src=newLogo(l.src);}));d.squad.forEach(p=>{if(p.photo)p.photo=newLogo(p.photo);});
    d.editions={};for(const [id,s] of Object.entries(raw.editions&&typeof raw.editions==='object'?raw.editions:{}))if(d.matches.some(m=>m.id===id))d.editions[id]=cleanEd(s);
    d.cardStyles=(Array.isArray(raw.cardStyles)?raw.cardStyles:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string').slice(0,24).map(x=>({id:x.id,name:x.name.slice(0,30)||'Style',ed:cleanEd(x.ed)}));
    {const img=v=>typeof v==='string'&&v.startsWith('data:image/')?v:'',hx=(v,f)=>/^#[0-9a-f]{6}$/i.test(v)?v:f,nm=(v,lo,hi,f)=>Number.isFinite(+v)&&v!==''&&v!=null?Math.min(hi,Math.max(lo,+v)):f,types=['photo','name','number','position','rating','logo','attrs','text'];
      d.cardDesigns=(Array.isArray(raw.cardDesigns)?raw.cardDesigns:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string').slice(0,12).map(x=>{const b=x.blend||{};let layers=(Array.isArray(x.layers)?x.layers:[]).filter(l=>l&&typeof l.id==='string'&&types.includes(l.type)).slice(0,20).map(l=>({id:l.id.slice(0,20),type:l.type,label:String(l.label||l.type).slice(0,20),x:nm(l.x,0,1,.5),y:nm(l.y,0,1,.5),s:nm(l.s,.02,1.5,.1),color:hx(l.color,'#ffffff'),font:typeof l.font==='string'&&/^[\w \-]{1,40}$/.test(l.font)?l.font:'',shadow:l.shadow!==false,visible:l.visible!==false,text:String(l.text||'').slice(0,24)}));if(!layers.length)layers=GC.defaultLayers();
        return {id:x.id.slice(0,40),name:x.name.slice(0,30)||'Template',bg:img(x.bg),frame:img(x.frame),frameTop:x.frameTop===true,shapeImg:img(x.shapeImg),face:(f=>f&&typeof f==='object'?{on:f.on===true,x:nm(f.x,0,1,.5),y:nm(f.y,0,1,.3),s:nm(f.s,.1,.9,.36)}:{...GC.faceDefaults(),on:false})(x.face),fade:(f=>f&&typeof f==='object'?{on:f.on===true,color:hx(f.color,''),amount:nm(f.amount,0,100,88),height:nm(f.height,10,90,46)}:{...GC.fadeDefaults(),on:false})(x.fade),shape:GC.SHAPES.some(q=>q[0]===x.shape)?x.shape:'shield',color1:hx(x.color1,'#2a060b'),color2:hx(x.color2,'#ed1c24'),blend:{preset:['none','match','warm','cool','mono','custom'].includes(b.preset)?b.preset:'none',color:hx(b.color,'#1f4fd8'),amount:nm(b.amount,0,100,0),contrast:nm(b.contrast,50,150,100),saturation:nm(b.saturation,0,200,100),brightness:nm(b.brightness,50,150,100)},layers};});}
    const old=raw.formation||{};d.lineups=raw.lineups&&typeof raw.lineups==='object'?raw.lineups:{};
    if(old.slots&&Object.keys(old.slots).length&&!d.lineups.practice)d.lineups.practice={A:{size:old.size,shape:old.shape,slots:old.slots}};
    d.formation={matchId:old.matchId||'',team:old.team==='B'?'B':'A',colors:{primary:'#ed1c24',base:'#160b0e',line:'#fff7f5',...(old.colors||{})}};
    if(d.formation.matchId&&!d.matches.some(x=>x.id===d.formation.matchId))d.formation.matchId='';
    for(const set of Object.values(d.lineups)){const seen=new Set();for(const team of ['A','B']){const t=set[team];if(!t||typeof t!=='object'){delete set[team];continue;}t.size=t.size===7?7:11;if(!shapesFor(t.size).includes(t.shape))t.shape=shapesFor(t.size)[0];t.slots=t.slots&&typeof t.slots==='object'?t.slots:{};{const pos={};for(const [k,v] of Object.entries(t.pos&&typeof t.pos==='object'?t.pos:{}))if(v&&Number.isFinite(+v.x)&&Number.isFinite(+v.y))pos[k]={x:Math.min(.94,Math.max(.06,+v.x)),y:Math.min(.95,Math.max(.05,+v.y))};t.pos=pos;}const valid=new Set();formationLayers(t.shape).forEach((line,li)=>line.forEach((_,i)=>valid.add(`${li}-${i}`)));for(const [key,id] of Object.entries(t.slots)){if(!valid.has(key)||!d.squad.some(p=>p.id===id)||seen.has(id))delete t.slots[key];else seen.add(id);}for(const k of Object.keys(t.pos))if(!t.slots[k])delete t.pos[k];t.captain=typeof t.captain==='string'&&Object.values(t.slots).includes(t.captain)?t.captain:'';}}
    {const ids=new Set(d.squad.map(p=>p.id)),okDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||''),allAttrs=[...G.OUTFIELD_ATTRS,...G.GK_ATTRS];
      d.rules=G.mergeRules(raw.rules);d.settings={pitchTheme:Object.keys(PITCH_THEMES).includes(raw.settings?.pitchTheme)?raw.settings.pitchTheme:'pitch-classic',defaultDesign:d.cardDesigns.some(x=>x.id===raw.settings?.defaultDesign)?raw.settings.defaultDesign:'',exportScale:[1,2,3].includes(+raw.settings?.exportScale)?+raw.settings.exportScale:2};
      d.training=(Array.isArray(raw.training)?raw.training:[]).filter(x=>x&&okDate(x.date)).map(x=>({id:x.id||uid(),date:x.date,note:String(x.note||'').slice(0,200),attended:[...new Set((Array.isArray(x.attended)?x.attended:[]).filter(id=>ids.has(id)))]}));
      const nm=o=>Object.fromEntries(Object.entries(o&&typeof o==='object'?o:{}).filter(([k,v])=>ids.has(k)&&Number(v)>0).map(([k,v])=>[k,Math.min(30,Math.floor(Number(v)))]));
      d.matches.forEach(m=>{const s=m.stats;if(!s||typeof s!=='object'){delete m.stats;return;}const played=[...new Set((Array.isArray(s.played)?s.played:[]).filter(id=>ids.has(id)))];m.stats={played,goals:nm(s.goals),assists:nm(s.assists),potm:played.includes(s.potm)?s.potm:''};});
      d.squad.forEach(p=>{p.foot=['R','L'].includes(p.foot)?p.foot:'';p.joined=okDate(p.joined)?p.joined:'';p.attrs=Object.fromEntries(Object.entries(p.attrs&&typeof p.attrs==='object'?p.attrs:{}).filter(([k,v])=>allAttrs.includes(k)&&Number(v)>=1).map(([k,v])=>[k,Math.min(99,Math.round(Number(v)))]));p.history=(Array.isArray(p.history)?p.history:[]).filter(h=>h&&okDate(h.date)).slice(-60);});
      d.progress={unlocked:{},claimed:{},exports:Math.max(0,Math.floor(Number(raw.progress?.exports))||0),days:Array.isArray(raw.progress?.days)?raw.progress.days.filter(okDate).slice(-400):[]};
      for(const [k,v] of Object.entries(raw.progress?.unlocked&&typeof raw.progress.unlocked==='object'?raw.progress.unlocked:{}))if(G.ACHIEVEMENTS.some(a=>a.id===k)&&okDate(v))d.progress.unlocked[k]=v;
      for(const [k,v] of Object.entries(raw.progress?.claimed&&typeof raw.progress.claimed==='object'?raw.progress.claimed:{}))if(v&&okDate(v.date)&&Number.isFinite(+v.xp))d.progress.claimed[k]={date:v.date,xp:Math.max(0,+v.xp)};}
    return d;
  }
  let page = 'overview';
  let toastTimer;
  let pendingTacticPlayer=null;
  let activeTacticDrag=null;
  let suppressTacticClickUntil=0;
  const posterImages=new Map();
  const GC=window.GFC_CARDS;
  const pages = {cards:'Club',overview:'Home',matches:'Matches',packs:'Match pack',squad:'Squad',formation:'Tactics',growth:'Club',instagram:'Club',game:'Club',history:'Club',analytics:'Analytics'};
  // Storage: IndexedDB first (large imported artwork fits), localStorage as legacy source and fallback.
  let dbPromise,pendingSaves=0,saveChain=Promise.resolve(),saveTimer;
  const openDb=()=>dbPromise||(dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(new Error('IndexedDB is unavailable'));const req=indexedDB.open('gfc-club-desk',1);req.onupgradeneeded=()=>req.result.createObjectStore('kv');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('IndexedDB is blocked'));}));
  const dbRun=(mode,fn)=>openDb().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('kv',mode),req=fn(tx.objectStore('kv'));tx.oncomplete=()=>resolve(req.result);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));}));
  async function loadStored(){
    let fromDb=null,fromLocal=null;
    try{fromDb=await dbRun('readonly',s=>s.get(STORE))||null;}catch(error){console.warn('Browser database unavailable; using localStorage.',error);}
    try{const text=localStorage.getItem(STORE);if(text){try{fromLocal=JSON.parse(text);}catch{try{localStorage.setItem(STORE+'-unreadable',text);}catch{}toast('Saved club data could not be read. A copy was kept; restore from a backup if you have one.');}}}catch{}
    // Newest copy wins, so a save that fell back to localStorage is never hidden by an older database copy.
    const raw=fromDb&&fromLocal?((fromLocal.savedAt||0)>(fromDb.savedAt||0)?fromLocal:fromDb):fromDb||fromLocal;
    return {raw,migrate:!fromDb&&!!fromLocal};
  }
  const setSaveState=text=>{const el=$('#saveState');if(el)el.textContent=text;};
  // Returns a promise: true when the data reached storage. Callers that can fail (imports, template saves) await it and roll back.
  function persist(message='Saved locally'){
    const snap=structuredClone({...data,savedAt:Date.now()});
    pendingSaves++;setSaveState('Saving…');
    const run=saveChain
      .then(async()=>{try{await dbRun('readwrite',s=>s.put(snap,STORE));}catch(dbError){console.warn('Database save failed; trying localStorage.',dbError);localStorage.setItem(STORE,JSON.stringify(snap));}})
      .then(()=>true,error=>{console.error(error);toast('Could not save. Export a club backup now, then free up browser storage or use smaller images.');return false;})
      .then(ok=>{pendingSaves--;setSaveState(ok?message:'Not saved · export backup');if(ok)checkProgress();return ok;});
    saveChain=run;return run;
  }
  // For high-frequency edits (typing, colour pickers): saves 300 ms after the last change.
  function persistSoon(){clearTimeout(saveTimer);setSaveState('Saving…');saveTimer=setTimeout(()=>persist(),300);}
  window.addEventListener('beforeunload',e=>{if(pendingSaves>0){e.preventDefault();e.returnValue='';}});
  window.addEventListener('pagehide',()=>{if(saveTimer){clearTimeout(saveTimer);saveTimer=0;persist();}});
  async function showStorage(){
    const el=$('#storageNote');if(!el||!navigator.storage?.estimate)return;
    try{const {usage,quota}=await navigator.storage.estimate(),mb=n=>(n/1048576).toFixed(n<10485760?1:0);el.textContent=`Browser storage: ${mb(usage)} MB used${quota?` of about ${mb(quota)} MB available`:''}. Imported artwork lives in this browser's database, so export a backup before clearing site data.`;}catch{}
  }
  // ---- Installable app (PWA): offline shell + install button ----
  let installEvent=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});window.addEventListener('appinstalled',()=>{installEvent=null;toast('GFC is installed.');});
  const isInstalled=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function registerWorker(){
    if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
    try{const had=!!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(()=>{});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)toast('Updated. Reopen the app to use the newest version.');});}catch{}
  }
  async function boot(){
    const {raw,migrate}=await loadStored();
    data=normalize(raw);await ensureFonts();if(!data.progress.days.includes(today()))data.progress.days.push(today());G.ACHIEVEMENTS.filter(a=>!data.progress.unlocked[a.id]&&a.test(data)).forEach(a=>{data.progress.unlocked[a.id]=today();});persistSoon();
    try{navigator.storage?.persist?.();}catch{}
    registerWorker();
    setPage('overview');
    if(migrate)persist('Moved to browser database');
    if(location.protocol==='file:')toast('Open the app through the local server (see README). From a file:// address, card previews and PNG export are blocked by the browser.');
  }
  function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('is-visible'),Math.max(2600,String(message).length*60)); }
  const fmtDate = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) : 'Date to be confirmed';
  const fmtTime = d => d ? new Date(d).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  function setPage(key) { if(!pages[key]) return; if(key!=='formation')pendingTacticPlayer=null; page=key; $$('.nav-item[data-nav]').forEach(b=>{const nk=['instagram','growth','history','packs','cards'].includes(key)?'game':key;b.classList.toggle('is-active',b.dataset.nav===nk); if(b.dataset.nav===nk)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}); $('#pageTitle').textContent=pages[key]; $('#appContent').innerHTML=views[key](); if(key==='packs') bindPack();if(key==='cards')bindCards();  scrollTo(0,0); bindView(); renderChip(); if(key==='squad'||key==='formation'||key==='overview')requestAnimationFrame(renderDynamicCards);if(key==='squad')showStorage(); }
  const heading=(title,desc,action='')=>`<div class="page-heading"><div class="page-heading-copy"><p class="eyebrow">GAMUDA FOOTBALL CLUB</p><h2>${title}</h2><p class="lead">${desc}</p></div>${action?`<div class="page-actions">${action}</div>`:''}</div>`;
  const btn=(label,action,cls='button button-primary',extra='')=>`<button class="${cls}" type="button" data-action="${action}" ${extra}>${label}</button>`;
  const empty=(title,body,action,label)=>`<div class="empty-state"><span class="empty-mark">G</span><h3>${title}</h3><p>${body}</p>${action?btn(label,action,'button button-secondary'):''}</div>`;
  const upcoming=()=>[...data.matches].filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const views={
    overview:()=>homeView(),
    matches:()=>matchdayView(),
    game:()=>gameView(),
    history:()=>historyView(),
    analytics:()=>analyticsView(),
    squad:()=>{
      const active=data.cardTemplates.find(t=>t.id===data.activeCardTemplateId)||data.cardTemplates[0],filter=data.cardTemplateFilter||'all';
      const countFor=id=>data.squad.filter(p=>p.templateId===id).length,roster=data.squad.filter(p=>filter==='all'||p.templateId===filter);
      const filterName=filter==='all'?'All players':filter==='gfc-original'?'Original GFC cards':data.cardTemplates.find(t=>t.id===filter)?.name||'Filtered cards';
      return `${heading('Squad & card templates','Build a reusable card design, then apply it to players across the squad.',btn('＋ Create player card','card-editor'))}<section class="template-workbench panel"><div class="template-workbench-head"><div><p class="eyebrow">CARD TEMPLATE STUDIO</p><h3>Import or choose a card design</h3><p class="caption">Templates keep their own photo, logo, number, name, position, and rating placements. Editing a template redraws every player card that uses it.</p></div><div class="template-workbench-actions">${btn('Import PSD / image','import-template','button button-secondary')}${btn('Arrange active template','edit-active-template','button button-primary')}${btn('Apply to all players','apply-active-template','button button-quiet')}${btn('Manage fonts','manage-fonts','button button-quiet')}</div></div><input id="cardTemplateFile" type="file" accept=".psd,.psb,image/png,image/jpeg,image/webp" hidden><p class="template-import-note">Accepts PNG, JPG, WebP, and PSD / PSB saved as 8-bit RGB or grayscale. A PSD / PSB imports as one flattened picture: Photoshop layers, masks, smart objects, text and effects are not editable here, so hide sample player art and text in Photoshop first. The player photo, crest, name, number, position, and rating stay movable app layers on top.</p><div class="template-controls"><label class="field"><span class="field-label">Template for new cards</span><select id="activeCardTemplate" class="select">${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===active?.id?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label><label class="field"><span class="field-label">Filter squad cards</span><select id="cardTemplateFilter" class="select"><option value="all" ${filter==='all'?'selected':''}>All players · ${data.squad.length}</option><option value="gfc-original" ${filter==='gfc-original'?'selected':''}>Original GFC cards · ${countFor('gfc-original')}</option>${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${filter===t.id?'selected':''}>${safe(t.name)} · ${countFor(t.id)}</option>`).join('')}</select></label></div><div class="template-gallery">${data.cardTemplates.map(t=>`<article class="template-tile ${t.id===active?.id?'is-active':''}"><button class="template-thumb" type="button" data-action="activate-template-${safe(t.id)}" aria-label="Use ${safe(t.name)} template"><img data-template-thumb="${safe(t.id)}" src="${BLANK_IMG}" alt=""><i>${t.id===active?.id?'ACTIVE':'USE TEMPLATE'}</i></button><div class="template-tile-copy"><strong>${safe(t.name)}</strong><small>${countFor(t.id)} player cards</small></div><div class="template-tile-actions"><button class="button button-quiet button-small" type="button" data-action="edit-template-${safe(t.id)}">Arrange</button>${btn('Duplicate','duplicate-template-'+safe(t.id),'button button-quiet button-small')}${btn('Apply to squad','apply-template-'+safe(t.id),'button button-secondary button-small')}${t.id==='gfc-classic'?'':btn('Delete','delete-template-'+safe(t.id),'button button-quiet button-small')}</div></article>`).join('')}</div><p class="caption storage-note" id="storageNote"></p></section><div class="squad-roster-heading"><div><p class="eyebrow">PLAYER ROSTER</p><h3>${safe(filterName)}</h3></div><span>${roster.length} shown</span></div><div class="player-card-grid">${roster.map(p=>cardTile(p)).join('')||'<p class="caption">No players use this template yet. Choose a template from a player’s card menu, or create a player card with this template.</p>'}</div>`;
    },
    packs:()=>packView(),
    formation:()=>{
      const bd=board(),shapes=shapesFor(bd.size),n=bd.shape,layers=formationLayers(n),used=[];
      if(bd.captain&&!Object.values(bd.slots).includes(bd.captain))bd.captain='';
      const tier=p=>p.rating==null?'tier-gold':p.rating>=85?'tier-icon':p.rating>=75?'tier-gold':p.rating>=65?'tier-silver':'tier-bronze';
      const placed=[],slots=layers.map((line,li)=>line.map((pos,i)=>{
        const key=`${li}-${i}`,id=bd.slots[key]||'',player=data.squad.find(p=>p.id===id),xy=slotXY(bd,li,i,line.length,layers.length);if(id)used.push(id);
        const fit=player?G.fit(pos,player.position):null;if(player)placed.push({role:pos,player});
        return `<div class="fc-slot ${player?'has-player':''}" style="left:${xy.x*100}%;top:${xy.y*100}%">${player?`<div class="fc-card ${tier(player)} ${pendingTacticPlayer?.id===player.id?'is-selected':''}" data-tactic-player="${player.id}" data-from-slot="${key}" tabindex="0" role="button" aria-label="${safe(player.name)}, ${safe(player.position)}, shirt ${safe(player.number)}${fit==='off'?', playing out of position':''}${bd.captain===player.id?', captain':''}. Drag to move, or tap and then tap a spot."><img src="${safe(player.card||player.photo||BLANK_IMG)}" data-template-player="${safe(player.id)}" alt="" draggable="false"><span class="fc-name">${safe(player.name)}</span>${fit?`<i class="fit fit-${fit}" title="${fit==='off'?'Out of position':'Right area of the pitch'}"></i>`:''}${bd.captain===player.id?'<i class="cap-badge">C</i>':''}</div>`:`<span class="fc-empty" aria-label="Empty ${pos} position">${pos}</span>`}</div>`;
      }).join('')).join('');
      const other=otherTeamIds(),subs=data.squad.filter(p=>!used.includes(p.id)&&!other.includes(p.id)),tr=G.teamRatings(null,placed),rv=v=>v==null?'–':v;
      const themes=G.unlockedRewards(G.clubLevel(data).level).filter(r=>r.type==='pitch');
      return `${heading('Tactics','Drag cards anywhere on the pitch. Drop one on another card to swap, or back on the bench to take it off.',btn('Create formation poster','formation-poster'))}${matchBar()}<section class="panel formation-toolbar"><label class="field-label" for="formationSize">Squad format</label><select id="formationSize" class="select"><option value="11" ${bd.size===11?'selected':''}>11-a-side</option><option value="7" ${bd.size===7?'selected':''}>7-a-side</option></select><label class="field-label" for="formationShape">Formation</label><select id="formationShape" class="select">${shapes.map(s=>`<option ${s===n?'selected':''}>${s}</option>`).join('')}</select><label class="field-label" for="formationCaptain">Captain</label><select id="formationCaptain" class="select"><option value="">None</option>${placed.map(x=>`<option value="${safe(x.player.id)}" ${bd.captain===x.player.id?'selected':''}>${safe(x.player.name)}</option>`).join('')}</select><label class="field-label" for="pitchTheme">Pitch</label><select id="pitchTheme" class="select">${themes.map(r=>`<option value="${r.id}" ${data.settings.pitchTheme===r.id?'selected':''}>${PITCH_THEMES[r.id]||r.label}</option>`).join('')}</select>${btn('Auto-fill','auto-fill','button button-secondary')}${Object.keys(bd.pos||{}).length?btn('Reset positions','reset-positions','button button-quiet'):''}</section><section class="tr-panel panel" aria-label="Team ratings"><div class="tr-ovr"><small>TEAM OVR</small><b>${rv(tr.ovr)}</b></div><div class="tr-lines"><div><small>ATTACK</small><b>${rv(tr.att)}</b></div><div><small>MIDFIELD</small><b>${rv(tr.mid)}</b></div><div><small>DEFENCE</small><b>${rv(tr.def)}</b></div><div><small>AVG RATING</small><b>${rv(tr.average)}</b></div><div><small>BALANCE</small><b class="tr-bal">${tr.balance||'–'}</b></div></div><p class="caption">${tr.rated?`Worked out from ${tr.rated} of ${placed.length} placed players that have a rating.`:'No ratings yet. Add ratings in each player\'s profile to see team ratings.'} Green dot: player is in the right area of the pitch. Red dot: out of position.</p></section><section class="fc-screen"><div class="fc-pitch-wrap"><div class="fc-pitch theme-${data.settings.pitchTheme}" data-pitch><div class="fc-mark fc-mark-half"></div><div class="fc-mark fc-mark-circle"></div><div class="fc-mark fc-mark-box-top"></div><div class="fc-mark fc-mark-box-bottom"></div>${slots}</div></div><aside class="fc-bench substitutes"><div class="substitutes-head"><div><p class="eyebrow">BENCH</p><h3>Substitutes</h3></div><span>${subs.length} available</span></div><div class="fc-deck">${subs.map(p=>`<div class="fc-card fc-bench-card ${tier(p)} ${pendingTacticPlayer?.id===p.id?'is-selected':''}" data-tactic-player="${p.id}" data-from-slot="" tabindex="0" role="button" aria-label="${safe(p.name)}, ${safe(p.position)}, shirt ${safe(p.number)}. Drag onto the pitch, or tap and then tap a spot."><img src="${safe(p.card||p.photo||BLANK_IMG)}" data-template-player="${safe(p.id)}" alt="" draggable="false"><span class="fc-name">${safe(p.name)}</span></div>`).join('')||'<p class="caption">Everyone available is on the pitch.</p>'}</div></aside></section>`;
    },
    growth:()=>{const latest=data.growth[data.growth.length-1];const metric=key=>latest?.[key]??'—';return `${heading('Club growth','Record real numbers over time to see what is working.',btn('＋ Add snapshot','add-growth'))}<section class="growth-metrics"><div class="growth-metric"><span class="growth-label">Instagram followers</span><strong class="growth-number">${metric('followers')}</strong></div><div class="growth-metric"><span class="growth-label">Active squad</span><strong class="growth-number">${metric('members')}</strong></div><div class="growth-metric"><span class="growth-label">Average attendance</span><strong class="growth-number">${metric('attendance')}</strong></div><div class="growth-metric"><span class="growth-label">Post reach</span><strong class="growth-number">${metric('reach')}</strong></div></section><section class="panel"><div class="panel-header"><div><p class="eyebrow">MEASURED BY YOU</p><h3>Growth over time</h3></div><span class="caption">Only your recorded snapshots appear here.</span></div>${data.growth.length>1?`<div class="growth-chart">${chartSvg()}</div>`:empty(data.growth.length?'Add another snapshot to see a trend':'No growth data yet','Add a monthly snapshot from your club records. Nothing is estimated.')}</section><section class="panel snapshot-list"><div class="panel-header"><h3>Snapshots</h3></div>${data.growth.length?[...data.growth].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`<div class="post-row"><div class="post-row-main"><strong>${fmtDate(g.date)}</strong><span>${g.followers??'—'} followers · ${g.members??'—'} players · ${g.attendance??'—'} attendance · reach ${g.reach??'—'}</span></div>${btn('Remove','delete-growth-'+g.id,'button button-quiet button-small')}</div>`).join(''):'<p class="caption">Your snapshots will be listed here.</p>'}</section>`;},
    instagram:()=>{const upcomingPosts=[...data.posts].sort((a,b)=>a.dateTime.localeCompare(b.dateTime));return `${heading('Instagram planner','Prepare captions and schedule reminders for @genmudafc.',btn('＋ Plan a post','add-post'))}<div class="planner-layout"><section class="panel"><div class="panel-header"><div><p class="eyebrow">CONTENT QUEUE</p><h3>Upcoming posts</h3></div><span>${upcomingPosts.filter(p=>p.status==='planned').length} planned</span></div>${upcomingPosts.length?`<div class="post-list">${upcomingPosts.map(p=>`<article class="post-row"><div class="post-thumb">${p.image?`<img src="${safe(p.image)}" alt="">`:'GFC'}</div><div class="post-row-main"><span class="meta-label">${fmtDate(p.dateTime.slice(0,10))} · ${fmtTime(p.dateTime)}</span><strong>${safe(p.title)}</strong><span>${safe(p.caption).slice(0,100)}</span><span class="status-tag ${p.status==='posted'?'is-complete':'is-planned'}">${p.status==='posted'?'Marked posted':'Planned reminder'}</span></div><div class="table-actions">${p.status==='planned'?btn('Mark posted','posted-'+p.id,'button button-secondary button-small'):''}${btn('Remove','delete-post-'+p.id,'button button-quiet button-small')}</div></article>`).join('')}</div>`:empty('Your content queue is clear','Plan matchday announcements, results, and club updates here.','add-post','Plan a post')}</section><aside class="panel"><p class="eyebrow">PUBLISHING</p><h3>Keep @genmudafc on schedule</h3><p class="caption">This planner saves locally and can prepare reminders and captions. Direct Instagram publishing needs a connected Meta business account and authorised publishing setup.</p><div class="notice"><strong>Manual publishing is ready</strong><span>Download your poster, copy the caption, then publish in Instagram. Mark it posted here afterward.</span></div><div class="poster-actions">${btn('Export calendar (.ics)','export-ics','button button-secondary')}${btn('Build a poster','goto-studio','button button-quiet')}</div></aside></div>`;}
  };
  const CARD_W=902,CARD_H=1389,PREVIEW_W=451,PREVIEW_H=694;
  const BLANK_IMG='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const cardImageCache=new Map(),loadedCardFonts=new Set(),cardUrlCache=new Map();
  const clubTabs=k=>`<div class="pack-tabs">${[['game','Game Center'],['history','History'],['growth','Growth'],['cards','Match cards'],['packs','Match pack posters'],['instagram','Instagram planner']].map(([id,l])=>`<button type="button" class="team-tab ${k===id?'is-active':''}" data-nav="${id}">${l}</button>`).join('')}</div>`;
  {const g=views.growth,ig=views.instagram;views.growth=()=>clubTabs('growth')+g();views.instagram=()=>clubTabs('instagram')+ig();views.cards=cardsView;}
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v)),round1=v=>Math.round(v*10)/10;
  function loadCardImage(src){
    if(!src)return Promise.resolve(null);if(cardImageCache.has(src))return Promise.resolve(cardImageCache.get(src));
    return new Promise(resolve=>{const im=new Image();im.onload=()=>{if(cardImageCache.size>60)cardImageCache.delete(cardImageCache.keys().next().value);cardImageCache.set(src,im);resolve(im);};im.onerror=()=>resolve(null);im.src=src;});
  }
  function drawDefaultCardBase(ctx,w,h,red='#ed1c24'){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#09070a';ctx.fillRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w*.79,0);ctx.lineTo(w,h*.16);ctx.lineTo(w,h*.83);ctx.lineTo(w*.52,h);ctx.lineTo(0,h*.84);ctx.closePath();ctx.clip();const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#25090f');grad.addColorStop(.5,'#10090d');grad.addColorStop(1,'#260912');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.globalAlpha=.35;ctx.fillStyle=red;ctx.beginPath();ctx.moveTo(w*.38,0);ctx.lineTo(w*.68,0);ctx.lineTo(w,h*.25);ctx.lineTo(w,h*.53);ctx.closePath();ctx.fill();ctx.globalAlpha=.22;const step=Math.max(7,w/100);for(let y=step;y<h;y+=step)for(let x=step;x<w;x+=step){ctx.fillStyle=red;ctx.fillRect(x,y,Math.max(1,w/900),Math.max(1,w/900));}ctx.globalAlpha=1;ctx.restore();ctx.strokeStyle=red;ctx.lineWidth=Math.max(2,w/450);ctx.strokeRect(2,2,w-4,h-4);
  }
  // Draws one card. All images are loaded first, then the canvas is painted in one synchronous pass,
  // so overlapping calls (dragging in the editor) can never interleave. A newer call makes an older one stop.
  async function drawTemplateCard(canvas,player,template,editor=false,selected=''){
    if(!canvas||!template)return;
    const token=canvas._paintToken=(canvas._paintToken||0)+1,stale=()=>canvas._paintToken!==token;
    const layers=template.layers||[],photoSrc=player.photo||'assets/brand/gfc-logo.png';
    await ensureFonts();
    const families=new Set(layers.filter(l=>l.type==='text'&&l.visible!==false).map(l=>l.font||'Winner GFC'));
    await Promise.all([...families].map(f=>document.fonts.load(`700 24px "${f}"`).catch(()=>{})));
    const sources=new Set([template.background,photoSrc,...layers.filter(l=>l.type==='logo').map(l=>l.src||'assets/brand/gfc-logo.png')].filter(Boolean)),loaded=new Map();
    await Promise.all([...sources].map(async src=>loaded.set(src,await loadCardImage(src))));
    if(stale())return;
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;drawDefaultCardBase(ctx,w,h);
    const bg=loaded.get(template.background);if(bg)ctx.drawImage(bg,0,0,w,h);
    for(const layer of layers){
      if(layer.visible===false)continue;const x=layer.x/100*w,y=layer.y/100*h,lw=layer.w/100*w,lh=layer.h/100*h;if(lw<=0||lh<=0)continue;
      if(layer.type==='photo'){
        const im=loaded.get(photoSrc);if(!im)continue;ctx.save();ctx.beginPath();ctx.rect(x,y,lw,lh);ctx.clip();
        if(layer.fit==='contain'){const scale=Math.min(lw/im.width,lh/im.height),dw=im.width*scale,dh=im.height*scale;ctx.drawImage(im,x+(lw-dw)/2,y+(lh-dh)/2,dw,dh);}
        else{const crop=player.crop||{},zoom=Math.max(1,Number(crop.zoom??layer.zoom??100)/100),fx=Number(crop.x??layer.focusX??50)/100,fy=Number(crop.y??layer.focusY??43)/100,scale=Math.max(lw/im.width,lh/im.height)*zoom,sw=lw/scale,sh=lh/scale;ctx.drawImage(im,(im.width-sw)*fx,(im.height-sh)*fy,sw,sh,x,y,lw,lh);}
        ctx.restore();
      }else if(layer.type==='logo'){
        const im=loaded.get(layer.src||'assets/brand/gfc-logo.png');if(!im)continue;ctx.save();
        if(layer.round){ctx.beginPath();ctx.ellipse(x+lw/2,y+lh/2,lw/2,lh/2,0,0,Math.PI*2);ctx.clip();}
        const scale=Math.min(lw/im.width,lh/im.height),dw=im.width*scale,dh=im.height*scale;ctx.drawImage(im,x+(lw-dw)/2,y+(lh-dh)/2,dw,dh);ctx.restore();
      }else if(layer.type==='text'){
        let text=layer.field==='customText'?(layer.text||'CLUB NAME'):layer.field==='rating'?(player.rating==null?'':`${player.rating} OVR`):String(player[layer.field]??'');if(!text)continue;
        text=String(text).toUpperCase();let fs=Math.max(8,w*(Number(layer.fontSize)||6)/100);const family=layer.font||'Winner GFC',setFont=()=>{ctx.font=`${layer.weight||700} ${fs}px "${family}",sans-serif`;};
        ctx.save();ctx.beginPath();ctx.rect(x,y,lw,lh);ctx.clip();ctx.textBaseline='middle';ctx.textAlign=layer.align||'left';ctx.fillStyle=layer.color||'#fff';setFont();
        while(ctx.measureText(text).width>lw&&fs>8){fs*=.94;setFont();}
        ctx.fillText(text,layer.align==='center'?x+lw/2:layer.align==='right'?x+lw:x,y+lh/2);ctx.restore();
      }
    }
    if(editor){
      const shown=canvas.getBoundingClientRect().width,unit=shown?w/shown:1,hs=11*unit;
      for(const layer of layers){if(layer.visible===false)continue;const isSel=layer.id===selected;ctx.save();ctx.strokeStyle=isSel?'#41a6ff':'rgba(255,255,255,.65)';ctx.lineWidth=(isSel?2:1)*unit;ctx.setLineDash(isSel?[]:[5*unit,4*unit]);ctx.strokeRect(layer.x/100*w,layer.y/100*h,layer.w/100*w,layer.h/100*h);ctx.restore();}
      const sel=layers.find(l=>l.id===selected&&l.visible!==false);
      if(sel){ctx.save();ctx.fillStyle='#41a6ff';ctx.strokeStyle='#fff';ctx.lineWidth=unit;for(const [hx,hy] of [[0,0],[1,0],[0,1],[1,1]]){const cx=(sel.x+hx*sel.w)/100*w,cy=(sel.y+hy*sel.h)/100*h;ctx.fillRect(cx-hs/2,cy-hs/2,hs,hs);ctx.strokeRect(cx-hs/2,cy-hs/2,hs,hs);}ctx.restore();}
    }
  }
  // Cards on screen are rendered at half size (same ratio) and cached as images; exports render at full size.
  const cardSig=(p,t)=>[t.rev||0,t.updated||0,p.name,p.number,p.position,p.rating,JSON.stringify(p.crop||null),(p.photo||'').length].join('|');
  function cardUrl(p,t){
    const key=p.id+'|'+t.id,sig=cardSig(p,t),hit=cardUrlCache.get(key);if(hit?.sig===sig)return hit.promise;
    const promise=(async()=>{const c=document.createElement('canvas');c.width=PREVIEW_W;c.height=PREVIEW_H;await drawTemplateCard(c,p,t);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw new Error('The card could not be drawn.');return URL.createObjectURL(blob);})();
    cardUrlCache.set(key,{sig,promise});promise.catch(()=>{if(cardUrlCache.get(key)?.promise===promise)cardUrlCache.delete(key);});
    if(hit)hit.promise.then(url=>setTimeout(()=>URL.revokeObjectURL(url),30000),()=>{});return promise;
  }
  let renderWarned=false;
  function renderDynamicCards(){
    $$('#appContent [data-template-player]').forEach(async node=>{
      const p=data.squad.find(x=>x.id===node.dataset.templatePlayer),t=data.cardTemplates.find(x=>x.id===p?.templateId);if(!p||!t)return;
      try{node.src=await cardUrl(p,t);}
      catch{node.src=p.photo||'assets/brand/gfc-logo.png';if(!renderWarned){renderWarned=true;toast(location.protocol==='file:'?'Cards cannot be drawn from a file:// address. Start the local server from the README and open http://localhost:4173.':'A player card could not be drawn. Try reloading the app.');}}
    });
    const sample=data.squad.find(p=>p.photo)||{name:'PLAYER',number:'22',position:'ST',rating:82,photo:'assets/brand/gfc-logo.png'};
    $$('#appContent [data-template-thumb]').forEach(async node=>{const t=data.cardTemplates.find(x=>x.id===node.dataset.templateThumb);if(!t)return;try{node.src=await cardUrl({...sample,id:'__sample__'},t);}catch{}});
  }
  // ---- Image helpers ----
  const hasAlpha=canvas=>{const px=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=3;i<px.length;i+=4)if(px[i]<250)return true;return false;};
  // Downsizes a user image for storage. Keeps transparency (PNG) only when the picture actually has some.
  async function imageFileToDataUrl(file,maxSide){
    if(!file.type.startsWith('image/'))throw new Error('Choose an image file (PNG, JPG or WebP).');
    let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('That image could not be opened. It may be damaged or in an unsupported format; export it as PNG or JPG.');}
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));
    c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close?.();
    return hasAlpha(c)?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.86);
  }
  // ---- Template import ----
  const TEMPLATE_EXTS=['psd','psb','png','jpg','jpeg','webp'];
  const UNSUPPORTED_NAMES={ai:'Illustrator (.ai)',eps:'EPS',svg:'SVG',tif:'TIFF',tiff:'TIFF',gif:'GIF',bmp:'BMP',heic:'HEIC',heif:'HEIF',pdf:'PDF',xcf:'GIMP (.xcf)',sketch:'Sketch',fig:'Figma',indd:'InDesign',psdt:'Photoshop template (.psdt)',kra:'Krita'};
  async function loadTemplateSource(file){
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(!TEMPLATE_EXTS.includes(ext)){const label=UNSUPPORTED_NAMES[ext];throw new Error(`${label?label+' files':'.'+ext+' files'} cannot be imported. Export the card as PNG, JPG or WebP, or save a PSD / PSB as 8-bit RGB, then import it again.`);}
    if(!file.size)throw new Error('That file is empty.');
    if(ext==='psd'||ext==='psb'){
      if(file.size>400*1048576)throw new Error('This Photoshop file is over 400 MB. Export a card-sized PNG instead.');
      if(!window.GFC_READ_PSD_COMPOSITE)throw new Error('PSD import tools did not load. Refresh the app and try again.');
      const parsed=await window.GFC_READ_PSD_COMPOSITE(file);
      return {source:parsed.canvas,kind:'Photoshop composite',notes:['Photoshop layers, masks, smart objects, text layers and effects are flattened into one background. If sample player art or text shows in the preview, hide it in Photoshop and import again.']};
    }
    if(file.size>60*1048576)throw new Error('This image is over 60 MB. Export a smaller PNG or JPG (about 1800 px wide is plenty).');
    try{return {source:await createImageBitmap(file),kind:'image',notes:[]};}
    catch{throw new Error('This image could not be opened. It may be damaged or saved in an unsupported variant. Re-export it as PNG or JPG.');}
  }
  function composeBackground(source,fit,fx,fy,outW=CARD_W,outH=CARD_H){
    const c=document.createElement('canvas');c.width=outW;c.height=outH;const ctx=c.getContext('2d'),sw=source.width,sh=source.height;
    if(fit==='stretch')ctx.drawImage(source,0,0,outW,outH);
    else if(fit==='contain'){ctx.fillStyle='#09070a';ctx.fillRect(0,0,outW,outH);const s=Math.min(outW/sw,outH/sh);ctx.drawImage(source,(outW-sw*s)/2,(outH-sh*s)/2,sw*s,sh*s);}
    else{const s=Math.max(outW/sw,outH/sh),cw=outW/s,ch=outH/s;ctx.drawImage(source,(sw-cw)*fx/100,(sh-ch)*fy/100,cw,ch,0,0,outW,outH);}
    return c;
  }
  function isUniform(source){
    const c=document.createElement('canvas');c.width=48;c.height=74;const ctx=c.getContext('2d');ctx.drawImage(source,0,0,48,74);const px=ctx.getImageData(0,0,48,74).data;
    for(let i=4;i<px.length;i+=4)if(Math.abs(px[i]-px[0])>3||Math.abs(px[i+1]-px[1])>3||Math.abs(px[i+2]-px[2])>3||Math.abs(px[i+3]-px[3])>3)return false;return true;
  }
  async function importCardTemplate(file){
    if(!file)return;let loaded;
    try{loaded=await loadTemplateSource(file);}
    catch(error){toast(error instanceof RangeError?'This file needs more memory than the browser can give. Export a smaller card-sized PNG and import that.':error.message||'That template could not be imported. Try a PNG or JPG export.');return;}
    const {source,kind,notes}=loaded,name=file.name.replace(/\.(psd|psb|png|jpe?g|webp)$/i,'').replace(/[_-]+/g,' ').trim()||'Imported GFC card';
    const blank=isUniform(source),ratioOff=Math.abs(source.width/source.height-CARD_W/CARD_H)/(CARD_W/CARD_H);
    openModal('Import card template',`<label class="field field-span-2"><span class="field-label">Template name</span><input class="input" id="importName" value="${safe(name)}" maxlength="60"></label><label class="field"><span class="field-label">Fit to the ${CARD_W} × ${CARD_H} card</span><select class="select" id="importFit"><option value="cover">Fill card · trim edges</option><option value="contain">Fit inside · keep whole image</option><option value="stretch">Stretch to card</option></select></label><label class="field" id="importFocusX"><span class="field-label">Crop left / right</span><input class="input range-input" type="range" id="importFx" min="0" max="100" value="50"></label><label class="field" id="importFocusY"><span class="field-label">Crop up / down</span><input class="input range-input" type="range" id="importFy" min="0" max="100" value="50"></label><div class="template-import-preview field-span-2"><canvas id="importPreview" width="${PREVIEW_W}" height="${PREVIEW_H}"></canvas><div class="template-import-notes" id="importNotes"></div></div>`,'Import template');
    const form=$('.dialog-form',modal),preview=$('#importPreview'),fitSel=$('#importFit'),fx=$('#importFx'),fy=$('#importFy');
    const refresh=()=>{
      const fit=fitSel.value;$('#importFocusX').hidden=$('#importFocusY').hidden=fit!=='cover';
      const pctx=preview.getContext('2d');pctx.drawImage(composeBackground(source,fit,Number(fx.value),Number(fy.value),PREVIEW_W,PREVIEW_H),0,0);
      const lines=[`Source: ${source.width} × ${source.height} px (${kind}).`];
      if(fit==='cover'&&ratioOff>.02)lines.push(`About ${Math.round((1-Math.min(source.width/source.height,CARD_W/CARD_H)/Math.max(source.width/source.height,CARD_W/CARD_H))*100)}% of the picture is trimmed to fit the card. Use the crop sliders or choose another fit.`);
      if(fit==='stretch'&&ratioOff>.02)lines.push('Stretching changes the picture’s proportions.');
      if(source.width<CARD_W*.9)lines.push(`This image is narrower than ${CARD_W} px, so exported cards will look soft. Use a larger export if you have one.`);
      if(blank)lines.push('The image looks blank. For a PSD, save it again with Maximize Compatibility on, or export a PNG from Photoshop.');
      $('#importNotes').innerHTML=[...lines,...notes].map(l=>`<p class="template-import-note">${safe(l)}</p>`).join('');
    };
    [fitSel,fx,fy].forEach(el=>el.addEventListener('input',refresh));refresh();
    form.onsubmit=async e=>{
      e.preventDefault();const submit=$('[type="submit"]',form);submit.disabled=true;
      try{
        const canvas=composeBackground(source,fitSel.value,Number(fx.value),Number(fy.value)),background=hasAlpha(canvas)?canvas.toDataURL('image/png'):canvas.toDataURL('image/jpeg',.9);
        const template={...defaultCardTemplate(),id:uid(),name:$('#importName').value.trim()||name,background,source:kind,rev:0,updated:Date.now()};
        const previous={templates:data.cardTemplates,active:data.activeCardTemplateId};
        data.cardTemplates=[...data.cardTemplates,template];data.activeCardTemplateId=template.id;
        if(!await persist()){data.cardTemplates=previous.templates;data.activeCardTemplateId=previous.active;toast('This template could not be saved, so nothing was changed. Export a backup, then try a smaller image.');return;}
        modal.close();setPage('squad');toast('Card template imported. Arrange its player photo and fields.');setTimeout(()=>templateEditor(template.id),150);
      }finally{submit.disabled=false;}
    };
  }
  // ---- Template editor ----
  function layerProps(template,layer){
    const range=(id,label,val,min,max,step='1')=>`<label class="field"><span class="field-label">${label} · <b id="${id}Value">${val}</b></span><input class="input range-input" type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
    const fonts=fontChoices(),custom=layer.field==='customText'||layer.custom;
    return `<p class="eyebrow">MOVE · RESIZE · STYLE</p>${range('tplX','Left',round1(layer.x),0,100,'.1')}${range('tplY','Top',round1(layer.y),0,100,'.1')}${range('tplW','Width',round1(layer.w),1,100,'.1')}${range('tplH','Height',round1(layer.h),1,100,'.1')}`
      +(layer.type==='text'?`${range('tplFontSize','Text size',layer.fontSize||6,1,30,'.2')}<label class="field"><span class="field-label">Font</span><select class="select" id="tplFont">${fonts.map(f=>`<option value="${safe(f)}" ${(layer.font||'Winner GFC')===f?'selected':''}>${safe(f)}</option>`).join('')}</select></label><label class="field"><span class="field-label">Add a font file</span><input class="input" type="file" id="tplFontFile" accept=".ttf,.otf,.woff,.woff2"></label>${data.fonts.some(f=>f.name===layer.font)?'<div class="template-layer-order"><button class="button button-quiet button-small" type="button" id="tplRemoveFont">Remove this font</button></div>':''}<label class="field"><span class="field-label">Text colour</span><input class="input color-input" type="color" id="tplColor" value="${safe(layer.color||'#ed1c24')}"></label><label class="field"><span class="field-label">Alignment</span><select class="select" id="tplAlign">${['left','center','right'].map(a=>`<option ${layer.align===a?'selected':''}>${a}</option>`).join('')}</select></label>${layer.field==='customText'?`<label class="field field-span-2"><span class="field-label">Text</span><input class="input" id="tplText" value="${safe(layer.text||'GFC')}"></label>`:''}`:'')
      +(layer.type==='photo'?`<label class="field"><span class="field-label">Photo fit</span><select class="select" id="tplFit"><option value="cover" ${layer.fit!=='contain'?'selected':''}>Crop to fill</option><option value="contain" ${layer.fit==='contain'?'selected':''}>Show full photo</option></select></label>${range('tplZoom','Photo zoom %',layer.zoom??100,100,300,'1')}${range('tplFocusX','Photo left / right',layer.focusX??50,0,100)}${range('tplFocusY','Photo up / down',layer.focusY??43,0,100)}`:'')
      +(layer.type==='logo'?`<label class="field"><span class="field-label">Logo / image file</span><input class="input" type="file" id="tplLogoFile" accept="image/png,image/jpeg,image/webp"></label><label class="field inline-field"><input type="checkbox" id="tplRound" ${layer.round?'checked':''}><span class="field-label">Crop to circle</span></label>`:'')
      +`<label class="field inline-field"><input type="checkbox" id="tplVisible" ${layer.visible===false?'':'checked'}><span class="field-label">Show this layer</span></label>${custom?'<div class="template-layer-order"><button class="button button-quiet button-small" type="button" id="tplDelete">Remove this layer</button></div>':''}`;
  }
  function templateEditor(templateId){
    const source=data.cardTemplates.find(t=>t.id===templateId);if(!source)return;
    const draft=structuredClone(source);let selectedId=draft.layers[0]?.id||'',dirty=false,drag=null;
    const previewDefault=data.squad.find(p=>p.photo)?.id||'';
    openModal('Arrange card template',`<div class="template-designer field-span-2"><div class="template-designer-stage"><canvas id="templateDesignerCanvas" width="${PREVIEW_W}" height="${PREVIEW_H}" tabindex="0" role="img" aria-label="Card template preview. Drag layers to move them; arrow keys nudge the selected layer."></canvas><p class="caption">Drag a layer to move it, or drag a blue corner handle to resize it. Arrow keys nudge the selected layer (Shift for bigger steps).</p></div><aside class="template-designer-controls"><label class="field"><span class="field-label">Template name</span><input class="input" id="templateName" value="${safe(draft.name)}" maxlength="60"></label><label class="field"><span class="field-label">Preview with player</span><select class="select" id="tplPreviewPlayer">${data.squad.map(p=>`<option value="${safe(p.id)}" ${p.id===previewDefault?'selected':''}>${safe(p.name)} · #${safe(p.number)}</option>`).join('')||'<option value="">Sample player</option>'}</select></label><div><p class="field-label">Layers (top first)</p><div class="template-layer-list" id="templateLayerList"></div></div><div class="template-layer-properties" id="templateLayerControls"></div><div class="template-layer-order"><button class="button button-secondary button-small" type="button" id="addTemplateText">＋ Add text</button><button class="button button-secondary button-small" type="button" id="addTemplateImage">＋ Add logo / image</button></div></aside></div>`,'Save template');
    const canvas=$('#templateDesignerCanvas'),form=$('.dialog-form',modal),list=$('#templateLayerList'),controls=$('#templateLayerControls');
    const selected=()=>draft.layers.find(l=>l.id===selectedId);
    const previewPlayer=()=>data.squad.find(p=>p.id===$('#tplPreviewPlayer').value)||{name:'PLAYER',number:'22',position:'ST',rating:82,photo:'assets/brand/gfc-logo.png'};
    const draw=()=>drawTemplateCard(canvas,previewPlayer(),draft,true,selectedId);
    const touch=()=>{dirty=true;};
    const moveLayer=(id,dir)=>{const i=draft.layers.findIndex(l=>l.id===id),j=i+dir;if(i<0||j<0||j>=draft.layers.length)return;[draft.layers[i],draft.layers[j]]=[draft.layers[j],draft.layers[i]];touch();renderList();draw();};
    const icon=l=>l.type==='photo'?'▧':l.type==='logo'?'◉':'T';
    function renderList(){
      list.innerHTML=[...draft.layers].reverse().map(l=>{const visible=l.visible!==false;return `<div class="template-layer-row ${l.id===selectedId?'is-selected':''}"><button type="button" class="layer-icon-button ${visible?'':'is-off'}" data-eye="${safe(l.id)}" aria-pressed="${visible}" aria-label="${visible?'Hide':'Show'} ${safe(l.label)}">${visible?'◉':'○'}</button><button type="button" class="template-layer-button" data-template-layer="${safe(l.id)}"><span>${icon(l)}</span>${safe(l.label)}</button><button type="button" class="layer-icon-button" data-up="${safe(l.id)}" aria-label="Bring ${safe(l.label)} forward" ${draft.layers[draft.layers.length-1]===l?'disabled':''}>↑</button><button type="button" class="layer-icon-button" data-down="${safe(l.id)}" aria-label="Send ${safe(l.label)} backward" ${draft.layers[0]===l?'disabled':''}>↓</button></div>`;}).join('')||'<p class="caption">No layers yet.</p>';
      $$('[data-template-layer]',list).forEach(b=>b.onclick=()=>{selectedId=b.dataset.templateLayer;renderList();renderProps();draw();});
      $$('[data-eye]',list).forEach(b=>b.onclick=()=>{const l=draft.layers.find(x=>x.id===b.dataset.eye);l.visible=l.visible===false;touch();renderList();if(l.id===selectedId)renderProps();draw();});
      $$('[data-up]',list).forEach(b=>b.onclick=()=>moveLayer(b.dataset.up,1));$$('[data-down]',list).forEach(b=>b.onclick=()=>moveLayer(b.dataset.down,-1));
    }
    function renderProps(){
      const layer=selected();controls.innerHTML=layer?layerProps(draft,layer):'<p class="caption">Select or add a layer to edit it.</p>';if(!layer)return;
      const map={tplX:'x',tplY:'y',tplW:'w',tplH:'h',tplFontSize:'fontSize',tplColor:'color',tplFont:'font',tplAlign:'align',tplFit:'fit',tplZoom:'zoom',tplFocusX:'focusX',tplFocusY:'focusY',tplText:'text'};
      $$('input,select',controls).forEach(el=>el.addEventListener('input',()=>{
        if(map[el.id])layer[map[el.id]]=el.type==='range'?Number(el.value):el.value;
        if(el.id==='tplVisible'){layer.visible=el.checked;renderList();}
        if(el.id==='tplRound')layer.round=el.checked;
        const label=$('#'+el.id+'Value');if(label)label.textContent=el.value;touch();draw();
      }));
      $('#tplDelete',controls)?.addEventListener('click',()=>{draft.layers=draft.layers.filter(l=>l.id!==selectedId);selectedId=draft.layers[0]?.id||'';touch();renderList();renderProps();draw();});
      $('#tplLogoFile',controls)?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{layer.src=await imageFileToDataUrl(file,700);touch();draw();}catch(error){toast(error.message);}e.target.value='';});
      $('#tplFontFile',controls)?.addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{layer.font=await addFontFile(file);touch();renderProps();draw();}catch(error){toast(error.message);}});
      $('#tplRemoveFont',controls)?.addEventListener('click',async()=>{const name=layer.font;if(await removeFont(name)){draft.layers.forEach(l=>{if(l.font===name)l.font='Winner GFC';});touch();renderProps();draw();}});
    }
    function addLayer(layer){draft.layers.push(layer);selectedId=layer.id;touch();renderList();renderProps();draw();}
    $('#addTemplateText').onclick=()=>addLayer({id:uid(),label:'Club text',type:'text',field:'customText',text:'GFC',x:8,y:10,w:80,h:8,fontSize:6,color:'#ed1c24',font:'Winner GFC',align:'left',visible:true});
    $('#addTemplateImage').onclick=()=>addLayer({id:uid(),label:'Logo / image',type:'logo',custom:true,src:'',x:40,y:4,w:20,h:12,visible:true});
    $('#templateName').addEventListener('input',touch);$('#tplPreviewPlayer').addEventListener('change',draw);
    // Pointer interaction: corner handles resize the selected layer, anywhere else on a layer moves it.
    const pct=e=>{const r=canvas.getBoundingClientRect();return {px:(e.clientX-r.left)/r.width*100,py:(e.clientY-r.top)/r.height*100,rw:r.width,rh:r.height};};
    const hitHandle=(layer,px,py,rw,rh)=>{const tx=14/rw*100,ty=14/rh*100;for(const [name,hx,hy] of [['nw',0,0],['ne',1,0],['sw',0,1],['se',1,1]])if(Math.abs(px-(layer.x+hx*layer.w))<=tx&&Math.abs(py-(layer.y+hy*layer.h))<=ty)return name;return '';};
    const topLayerAt=(px,py)=>[...draft.layers].reverse().find(l=>l.visible!==false&&px>=l.x&&px<=l.x+l.w&&py>=l.y&&py<=l.y+l.h);
    canvas.addEventListener('pointerdown',e=>{
      const {px,py,rw,rh}=pct(e),cur=selected(),handle=cur&&cur.visible!==false?hitHandle(cur,px,py,rw,rh):'',layer=handle?cur:topLayerAt(px,py);if(!layer)return;
      if(layer.id!==selectedId){selectedId=layer.id;renderList();renderProps();}
      drag={px,py,x:layer.x,y:layer.y,w:layer.w,h:layer.h,handle};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});draw();
    });
    canvas.addEventListener('pointermove',e=>{
      const {px,py,rw,rh}=pct(e);
      if(!drag){const cur=selected(),h=cur&&cur.visible!==false?hitHandle(cur,px,py,rw,rh):'';canvas.style.cursor=h?(h==='nw'||h==='se'?'nwse-resize':'nesw-resize'):topLayerAt(px,py)?'move':'default';return;}
      const layer=selected(),dx=px-drag.px,dy=py-drag.py,MIN=2;if(!layer)return;
      if(drag.handle){
        let {x,y,w,h}=drag;
        if(drag.handle.includes('e'))w=clamp(drag.w+dx,MIN,100-drag.x);
        if(drag.handle.includes('s'))h=clamp(drag.h+dy,MIN,100-drag.y);
        if(drag.handle.includes('w')){const nx=clamp(drag.x+dx,0,drag.x+drag.w-MIN);w=drag.w+(drag.x-nx);x=nx;}
        if(drag.handle.includes('n')){const ny=clamp(drag.y+dy,0,drag.y+drag.h-MIN);h=drag.h+(drag.y-ny);y=ny;}
        Object.assign(layer,{x:round1(x),y:round1(y),w:round1(w),h:round1(h)});
      }else{layer.x=round1(clamp(drag.x+dx,0,100-layer.w));layer.y=round1(clamp(drag.y+dy,0,100-layer.h));}
      touch();[['tplX',layer.x],['tplY',layer.y],['tplW',layer.w],['tplH',layer.h]].forEach(([id,v])=>{const el=$('#'+id,controls);if(el){el.value=v;$('#'+id+'Value',controls).textContent=v;}});draw();
    });
    const endDrag=()=>{drag=null;};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
    canvas.addEventListener('keydown',e=>{
      const layer=selected(),step=e.shiftKey?2:.5,move={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];if(!layer||!move)return;
      e.preventDefault();layer.x=round1(clamp(layer.x+move[0],0,100-layer.w));layer.y=round1(clamp(layer.y+move[1],0,100-layer.h));touch();
      [['tplX',layer.x],['tplY',layer.y]].forEach(([id,v])=>{const el=$('#'+id,controls);if(el){el.value=v;$('#'+id+'Value',controls).textContent=v;}});draw();
    });
    // Closing with unsaved changes asks first.
    const confirmDiscard=()=>!dirty||confirm('Discard your unsaved changes to this template?');
    $$('[data-close]',modal).forEach(b=>b.onclick=()=>{if(confirmDiscard())modal.close();});modal.oncancel=e=>{if(!confirmDiscard())e.preventDefault();};
    // Save over the template, or keep the original and save the edits as a new template.
    async function save(asCopy){
      const out=structuredClone(draft),previous={templates:data.cardTemplates,active:data.activeCardTemplateId};
      out.name=$('#templateName').value.trim()||'GFC card template';out.updated=Date.now();
      if(asCopy){out.id=uid();out.rev=0;if(out.name===source.name)out.name+=' copy';data.cardTemplates=[...data.cardTemplates,out];}
      else{out.rev=(source.rev||0)+1;data.cardTemplates=data.cardTemplates.map(t=>t.id===out.id?out:t);}
      data.activeCardTemplateId=out.id;
      if(!await persist()){data.cardTemplates=previous.templates;data.activeCardTemplateId=previous.active;return;}
      dirty=false;modal.close();setPage('squad');toast(asCopy?'Saved as a new template.':'Template saved. Player cards using it have been refreshed.');
    }
    form.onsubmit=e=>{e.preventDefault();save(false);};
    const copyBtn=document.createElement('button');copyBtn.type='button';copyBtn.className='button button-secondary';copyBtn.textContent='Save as copy';copyBtn.onclick=()=>save(true);
    $('.dialog-actions',modal).insertBefore(copyBtn,$('[type="submit"]',modal));
    renderList();renderProps();draw();
  }
  async function duplicateTemplate(id){
    const t=data.cardTemplates.find(x=>x.id===id);if(!t)return;
    const copy=structuredClone(t),previous=data.activeCardTemplateId;copy.id=uid();copy.name=`${t.name} copy`;copy.rev=0;copy.updated=Date.now();
    data.cardTemplates.push(copy);data.activeCardTemplateId=copy.id;
    if(!await persist()){data.cardTemplates.pop();data.activeCardTemplateId=previous;return;}
    setPage('squad');toast(`Duplicated as “${copy.name}”.`);
  }
  async function deleteTemplate(id){
    const t=data.cardTemplates.find(x=>x.id===id);if(!t)return;
    if(id==='gfc-classic')return toast('The built-in GFC template can be edited or duplicated, but not deleted.');
    const users=data.squad.filter(p=>p.templateId===id);
    if(!confirm(`Delete “${t.name}”?${users.length?` ${users.length} player card${users.length>1?'s':''} will go back to their original card or GFC Red & Black.`:''} Players and photos are kept.`))return;
    const previous={templates:data.cardTemplates,squad:data.squad.map(p=>({...p})),active:data.activeCardTemplateId,filter:data.cardTemplateFilter};
    data.cardTemplates=data.cardTemplates.filter(x=>x.id!==id);
    data.squad.forEach(p=>{if(p.templateId!==id)return;const original=initialSquad.find(q=>q.id===p.id);p.templateId=original?.card?'gfc-original':'gfc-classic';p.card=original?.card||'';});
    if(data.activeCardTemplateId===id)data.activeCardTemplateId='gfc-classic';if(data.cardTemplateFilter===id)data.cardTemplateFilter='all';
    if(!await persist()){Object.assign(data,{cardTemplates:previous.templates,squad:previous.squad,activeCardTemplateId:previous.active,cardTemplateFilter:previous.filter});return;}
    setPage('squad');toast('Template deleted.');
  }
  async function assignTemplate(playerId,templateId){
    const p=data.squad.find(x=>x.id===playerId);if(!p)return;const previous={templateId:p.templateId,card:p.card},original=initialSquad.find(q=>q.id===p.id);
    p.templateId=templateId;p.card=templateId==='gfc-original'?(original?.card||''):'';
    if(!await persist())Object.assign(p,previous);
    setPage('squad');
  }
  // ---- Line-ups: every match has a Team A and a Team B. "practice" is the board with no match chosen. ----
  const boardKey=()=>data.formation.matchId||'practice';
  const peek=(key,team)=>data.lineups[key]?.[team];
  const lineupFor=(key,team)=>{const set=data.lineups[key]||(data.lineups[key]={});return set[team]||(set[team]={size:11,shape:'4-3-3',slots:{}});};
  const board=()=>lineupFor(boardKey(),data.formation.team);
  // Position of a player slot as a fraction of the pitch: a dragged position wins over the formation's own spot.
  const slotXY=(team,li,i,n,L)=>team.pos?.[`${li}-${i}`]||{x:(i+1)/(n+1),y:.1+li*.8/(L-1)};
  // A player can be in one team per match, so the other team's players are not offered as substitutes here.
  const otherTeamIds=()=>Object.values(peek(boardKey(),data.formation.team==='A'?'B':'A')?.slots||{});
  const placedCount=(key,team)=>Object.keys(peek(key,team)?.slots||{}).length;
  const matchLabel=m=>`${m.opponent||'Opponent'} · ${fmtDate(m.date)}`;
  function matchBar(){
    const key=boardKey(),matches=[...data.matches].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<section class="panel match-bar"><label class="field"><span class="field-label">Match</span><select id="formationMatch" class="select"><option value="">Practice board · no match</option>${matches.map(m=>`<option value="${safe(m.id)}" ${m.id===data.formation.matchId?'selected':''}>${safe(matchLabel(m))}</option>`).join('')}</select></label><div class="team-tabs" role="tablist" aria-label="Team line-up">${['A','B'].map(t=>`<button class="team-tab ${t===data.formation.team?'is-active':''}" type="button" role="tab" aria-selected="${t===data.formation.team}" data-team="${t}">Team ${t}<small>${placedCount(key,t)} placed</small></button>`).join('')}</div></section>`;
  }
  function makeFormationPoster(){
    const key=boardKey(),a=placedCount(key,'A'),b=placedCount(key,'B');
    if(!data.formation.matchId)return toast('Choose a match at the top of the board first. Posters are made per match.');
    if(!a&&!b)return toast('Place players on the pitch first, then create the poster.');
    packUi.matchId=data.formation.matchId;packUi.kind='lineup'+(placedCount(key,data.formation.team)?data.formation.team:a?'A':'B');packUi.selected='';setPage('packs');
  }
  // ---- Fonts: one library shared by the poster studio and card templates ----
  const BUILT_IN_FONTS=['Winner GFC','Bebas GFC','Arial'],fontFaces=new Map();
  const fontChoices=()=>[...BUILT_IN_FONTS,...data.fonts.map(f=>f.name)];
  const posterFontStack=name=>`"${name||'Winner GFC'}","Winner GFC","Bebas GFC",sans-serif`;
  const fontUsage=name=>data.cardTemplates.reduce((n,t)=>n+t.layers.filter(l=>l.font===name).length,0)+Object.values(data.packs).filter(p=>p.font===name).length;
  async function ensureFonts(){
    for(const f of data.fonts){if(fontFaces.has(f.name))continue;try{const face=new FontFace(f.name,`url(${f.src})`);await face.load();document.fonts.add(face);fontFaces.set(f.name,face);}catch(error){console.warn('Font could not be loaded',f.name,error);}}
  }
  async function addFontFile(file){
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(!['ttf','otf','woff','woff2'].includes(ext))throw new Error('Fonts must be TTF, OTF, WOFF or WOFF2 files.');
    if(file.size>3*1048576)throw new Error('That font file is over 3 MB. Use a smaller font or a WOFF2 version.');
    let name=file.name.replace(/\.[^.]+$/,'').replace(/[^\w \-]/g,'').replace(/\s+/g,' ').trim()||'Custom font';
    if(BUILT_IN_FONTS.includes(name))name+=' Custom';
    if(data.fonts.some(f=>f.name===name))return name;
    const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('That font file could not be read.'));r.readAsDataURL(file);});
    let face;try{face=new FontFace(name,`url(${src})`);await face.load();}catch{throw new Error('That font file could not be loaded. It may be damaged or not a real font.');}
    document.fonts.add(face);fontFaces.set(name,face);
    const previous=data.fonts;data.fonts=[...data.fonts,{name,src}];
    if(!await persist()){data.fonts=previous;document.fonts.delete(face);fontFaces.delete(name);throw new Error('The font could not be saved, so it was not added.');}
    return name;
  }
  async function removeFont(name){
    const used=fontUsage(name);
    if(!confirm(`Remove “${name}”?${used?` ${used} place${used>1?'s':''} using it will switch to Winner GFC.`:''}`))return false;
    const previous={fonts:data.fonts,packs:Object.entries(data.packs).filter(([,p])=>p.font===name).map(([id])=>id)},changed=[];
    data.cardTemplates.forEach(t=>t.layers.forEach(l=>{if(l.font===name){changed.push(l);l.font='Winner GFC';t.rev=(t.rev||0)+1;}}));
    previous.packs.forEach(id=>{data.packs[id].font='';});
    data.fonts=data.fonts.filter(f=>f.name!==name);
    if(!await persist()){data.fonts=previous.fonts;previous.packs.forEach(id=>{data.packs[id].font=name;});changed.forEach(l=>{l.font=name;});return false;}
    const face=fontFaces.get(name);if(face)document.fonts.delete(face);fontFaces.delete(name);return true;
  }
  function fontManager(){
    let changed=false;
    openModal('Fonts','<div class="field-span-2 font-list" id="fontList"></div><label class="field field-span-2"><span class="field-label">Add a font file</span><input class="input" type="file" id="fontFile" accept=".ttf,.otf,.woff,.woff2"><span class="field-help">TTF, OTF, WOFF or WOFF2, up to 3 MB each. Added fonts are saved with your club data and can be used in the poster studio and card templates.</span></label>','Done');
    const list=$('#fontList');
    const render=()=>{
      list.innerHTML=[...BUILT_IN_FONTS.map(name=>({name,builtin:true})),...data.fonts].map(f=>{const n=f.builtin?0:fontUsage(f.name);return `<div class="font-row"><span class="font-sample" style="font-family:'${safe(f.name)}',sans-serif">GAMUDA FC 22</span><span class="font-meta"><b>${safe(f.name)}</b><small>${f.builtin?'Built in':`Added · used in ${n} place${n===1?'':'s'}`}</small></span>${f.builtin?'':`<button class="button button-quiet button-small" type="button" data-remove-font="${safe(f.name)}">Remove</button>`}</div>`;}).join('');
      $$('[data-remove-font]',list).forEach(b=>b.onclick=async()=>{if(await removeFont(b.dataset.removeFont)){changed=true;render();toast('Font removed.');}});
    };
    $('#fontFile').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const name=await addFontFile(file);changed=true;render();toast(`“${name}” is ready to use.`);}catch(error){toast(error.message);}});
    $('.dialog-form',modal).onsubmit=e=>{e.preventDefault();modal.close();};
    modal.onclose=()=>{modal.onclose=null;if(changed)setPage(page);};
    render();
  }
  // ---- Line-up poster: draws the board's pitch for Team A, Team B or both ----
  async function posterImg(src){if(!src)return null;let im=posterImages.get(src);if(!im){im=await new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src;});if(im)posterImages.set(src,im);}return im;}
  // Style follows the club's Instagram: crimson-to-black gradient, cropped giant heading, white pitch lines, dark-red player cards.
  async function drawPitchPanel(ctx,x,y,w,h,team,hf,cap=86,ec=null,pitch='classic'){
    const layers=formationLayers(team.shape),maxN=Math.max(...layers.map(l=>l.length)),cw=Math.min(w/(maxN+.6)*.82,cap),chh=cw*(ec?GC.RATIO:1.5);
    ctx.save();ctx.strokeStyle='rgba(255,247,245,.92)';ctx.lineWidth=Math.max(2,w/190);ctx.lineJoin='round';
    const L=x+6,R=x+w-6,T=y+6,B=y+h-6,mx=(L+R)/2,mid=(T+B)/2,kind=pitch||'classic',W2=R-L,H2=B-T;
    const path=()=>{ctx.beginPath();
      if(kind==='classic'){ctx.moveTo(L,B);ctx.lineTo(L,T+H2*.08);ctx.lineTo(L+W2*.06,T);ctx.lineTo(R-W2*.06,T);ctx.lineTo(R,T+H2*.08);ctx.lineTo(R,B);}
      else if(kind==='rect'||kind==='none'){ctx.rect(L,T,W2,H2);}
      else if(kind==='rounded'){const r=W2*.09;ctx.moveTo(L+r,T);ctx.lineTo(R-r,T);ctx.quadraticCurveTo(R,T,R,T+r);ctx.lineTo(R,B-r);ctx.quadraticCurveTo(R,B,R-r,B);ctx.lineTo(L+r,B);ctx.quadraticCurveTo(L,B,L,B-r);ctx.lineTo(L,T+r);ctx.quadraticCurveTo(L,T,L+r,T);ctx.closePath();}
      else if(kind==='arch'){const r=W2*.5;ctx.moveTo(L,B);ctx.lineTo(L,T+r);ctx.arc(mx,T+r,r,Math.PI,0);ctx.lineTo(R,B);ctx.closePath();}
      else{const ins=W2*.13;ctx.moveTo(L+ins,T);ctx.lineTo(R-ins,T);ctx.lineTo(R,B);ctx.lineTo(L,B);ctx.closePath();}};
    if(kind!=='none'){path();ctx.stroke();ctx.save();path();ctx.clip();
      const at=kind==='arch'?B-H2*.9:T;
      ctx.beginPath();ctx.moveTo(L-4,mid);ctx.lineTo(R+4,mid);ctx.stroke();ctx.beginPath();ctx.arc(mx,mid,W2*.09,0,Math.PI*2);ctx.stroke();
      ctx.strokeRect(L+W2*.2,at,W2*.6,H2*.14);ctx.strokeRect(L+W2*.34,at,W2*.32,H2*.075);ctx.strokeRect(L+W2*.2,B-H2*.14,W2*.6,H2*.14);ctx.strokeRect(L+W2*.34,B-H2*.075,W2*.32,H2*.075);ctx.restore();}
    for(let li=0;li<layers.length;li++){const line=layers[li];for(let i=0;i<line.length;i++){
      const sp=slotXY(team,li,i,line.length,layers.length),cx=x+sp.x*w,cy=y+sp.y*h,p=data.squad.find(q=>q.id===team.slots[`${li}-${i}`]),x0=cx-cw/2,y0=cy-chh/2;
      ctx.textAlign='center';
      if(p&&ec){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=10*sbScale(ctx);GC.drawCard(ctx,x0,y0,cw,p,ec.ed,{photo:await posterImg(p.photo),crest:ec.look.crest,bgImage:ec.look.bgImage,shapeImage:ec.look.shapeImage,frameImage:ec.look.frameImage,attrKeys:G.attrKeys(p),potm:ec.m.stats?.potm===p.id});ctx.shadowBlur=0;}
      else if(p){
        const im=await posterImg(p.card);
        if(im){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=10*sbScale(ctx);ctx.drawImage(im,x0,y0,cw,chh);ctx.shadowBlur=0;}
        else{const ph=await posterImg(p.photo);ctx.save();ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,y0,cw,chh,8):ctx.rect(x0,y0,cw,chh);ctx.fillStyle='#4a0a10';ctx.fill();ctx.clip();if(ph){const s=Math.max(cw/ph.width,chh*.75/ph.height);ctx.drawImage(ph,cx-ph.width*s/2,y0,ph.width*s,ph.height*s);}ctx.restore();
          ctx.fillStyle='rgba(20,4,6,.82)';ctx.fillRect(x0,y0+chh*.72,cw,chh*.28);ctx.fillStyle='#fff';ctx.textBaseline='middle';let nf=Math.min(cap*.18,cw*.2);ctx.font=`bold ${nf}px ${hf}`;const name=String(p.name).toUpperCase();while(ctx.measureText(name).width>cw-6&&nf>7){nf-=.5;ctx.font=`bold ${nf}px ${hf}`;}ctx.fillText(name,cx,y0+chh*.86);}
      }else{ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(255,247,245,.55)';ctx.lineWidth=2;ctx.strokeRect(x0,y0,cw,chh);ctx.restore();ctx.fillStyle='rgba(255,247,245,.7)';ctx.textBaseline='middle';ctx.font=`bold ${Math.max(10,cw*.24)}px ${hf}`;ctx.fillText(line[i],cx,cy);}
    }}
    ctx.restore();
  }
  // ---- Match pack: one art style per match, shared by every poster of that match ----
  const PITCHES=[['classic','Classic'],['rect','Rectangle'],['rounded','Rounded'],['arch','Arch'],['perspective','Perspective'],['none','No outline']];
  const sizeSelect=id=>`<label class="export-scale"><span>Size</span><select class="select" id="${id}">${[1,2,3].map(n=>`<option value="${n}" ${(data.settings.exportScale||1)===n?'selected':''}>${n}×</option>`).join('')}</select></label>`;
  const PACK_W=1080,MAX_PX=16000000,PACK_KINDS=[['next','Next match'],['matchday','Matchday'],['score','Full time'],['lineupA','Line-up A'],['lineupB','Line-up B'],['rosterA','Squad list A'],['rosterB','Squad list B']];
  const PACK_DEFAULT={bg:'',fx:50,fy:45,bgZoom:100,tint:.55,shade:.3,vignette:.55,grain:.4,primary:'#ed1c24',font:'',format:'feed',pitch:'classic',cardStyle:'',layouts:{}};
  const packUi={matchId:'',kind:'next',selected:'',boxes:{}};
  let packPaint=Promise.resolve(),packToken=0;
  const cl=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(+v)?+v:lo));
  function getPack(id){return data.packs[id]||(data.packs[id]={...PACK_DEFAULT,layouts:{}});}
  function teamStarters(m,team){
    const t=peek(m.id,team);if(!t)return [];const out=[];
    formationLayers(t.shape).forEach((line,li)=>line.forEach((_,i)=>{const p=data.squad.find(q=>q.id===t.slots[`${li}-${i}`]);if(p)out.push({line:li,p});}));
    return out.sort((a,b)=>b.line-a.line).map(x=>({n:x.p.number,name:String(x.p.name).toUpperCase()}));
  }
  function packElements(kind,m){
    const opp=(m.opponent||'OPPONENT').toUpperCase(),when=[m.date?fmtDate(m.date):'',m.time||''].filter(Boolean).join('  ·  ').toUpperCase(),where=[m.competition,m.venue].filter(Boolean).join('  ·  ').toUpperCase();
    const T=(id,label,text,x,y,s,o={})=>({id,label,type:'text',text,x,y,s,...o}),logo=(x,y,s)=>({id:'logo',label:'Club crest',type:'logo',x,y,s});
    const vs=T('vs','Versus line',`GFC VS ${opp}`,.5,.7,.06,{weight:'bold'}),dt=T('date','Date and time',when,.5,.77,.034,{weight:'bold',italic:true}),pl=T('place','Competition and venue',where,.5,.82,.03,{italic:true,alpha:.85});
    if(kind==='next')return [T('title','Heading','NEXT MATCH',.5,.42,.19,{accent:true}),vs,dt,pl,logo(.5,.92,.1)];
    if(kind==='matchday')return [T('title','Heading','MATCHDAY',.5,.42,.2,{accent:true}),vs,dt,pl,logo(.5,.92,.1)];
    if(kind==='score')return [T('title','Heading','FULL TIME',.5,.12,.14,{accent:true}),T('score','Score',`${m.home??'-'} – ${m.away??'-'}`,.5,.45,.3,{weight:'bold'}),vs,T('place','Competition and venue',where,.5,.8,.03,{italic:true,alpha:.85}),logo(.5,.92,.1)];
    const team=kind.slice(-1);
    if(kind.startsWith('lineup')){const t=peek(m.id,team)||{shape:'4-3-3'};return [T('title','Heading','FORMATION',.5,.045,.27,{accent:true}),T('sub','Details line',[`GFC VS ${opp}`,m.date?fmtDate(m.date):''].filter(Boolean).join('  ·  ').toUpperCase(),.5,.16,.026,{weight:'bold'}),T('shape','Formation label',t.shape,.1,.945,.03,{italic:true,align:'left'}),T('team','Team label',`TEAM ${team}`,.9,.945,.03,{italic:true,align:'right'}),logo(.5,.94,.07)];}
    return [T('title','Heading',`TEAM ${team}`,.5,.07,.1,{accent:true}),T('sub','Details line',`GFC VS ${opp}${m.date?'  ·  '+fmtDate(m.date):''}`.toUpperCase(),.5,.125,.026,{weight:'bold'}),{id:'list',label:'Player list',type:'list',lines:teamStarters(m,team),x:.38,y:.17,s:.058},logo(.5,.94,.07)];
  }
  const sbScale=ctx=>{const t=ctx.getTransform();return Math.hypot(t.a,t.b)||1;};
  const packLayout=(pack,kind,id)=>pack.layouts[kind]?.[id]||{};
  async function renderPack(canvas,m,pack,kind,scale=1){
    const token=++packToken,story=pack.format==='story',W=PACK_W,H=story?1920:1350;scale=Math.min(scale,Math.sqrt(MAX_PX/(W*H)));
    await ensureFonts();const hf=posterFontStack(pack.font);try{await document.fonts.load(`700 40px ${hf}`);}catch{}
    const bg=pack.bg?await posterImg(pack.bg):null,logo=await posterImg('assets/brand/gfc-logo.png');
    const lineup=kind.startsWith('lineup')?peek(m.id,kind.slice(-1))||{size:11,shape:'4-3-3',slots:{}}:null;
    if(lineup)for(const id of Object.values(lineup.slots)){const p=data.squad.find(q=>q.id===id);if(p){await posterImg(p.card);await posterImg(p.photo);}}
    if(token!==packToken)return;
    canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);canvas.style.aspectRatio=`${W} / ${H}`;
    const ctx=canvas.getContext('2d'),red=pack.primary;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#140306';ctx.fillRect(0,0,W,H);
    if(bg){const s=Math.max(W/bg.width,H/bg.height)*(pack.bgZoom||100)/100,sw=W/s,sh=H/s;ctx.drawImage(bg,(bg.width-sw)*pack.fx/100,(bg.height-sh)*pack.fy/100,sw,sh,0,0,W,H);}
    else{const g=ctx.createRadialGradient(W*.5,H*.45,W*.1,W*.5,H*.5,H*.75);g.addColorStop(0,'#b5141a');g.addColorStop(.6,'#5e0a10');g.addColorStop(1,'#140306');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    if(bg&&pack.tint>0){ctx.globalAlpha=pack.tint;ctx.globalCompositeOperation='saturation';ctx.fillStyle='#808080';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='multiply';ctx.fillStyle=red;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
    if(pack.shade>0){ctx.fillStyle=`rgba(10,2,4,${pack.shade})`;ctx.fillRect(0,0,W,H);}
    if(pack.vignette>0){const v=ctx.createRadialGradient(W/2,H/2,W*.35,W/2,H/2,H*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${pack.vignette})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H);}
    ctx.fillStyle='rgba(255,255,255,.06)';for(let i=0,n=Math.round(pack.grain*5000);i<n;i++){const s=(i*9301+49297)%233280;ctx.fillRect(s%W,(s*7)%H,1.6,1.6);}
    let ec=null;if(lineup&&pack.cardStyle){const ed=edFor(m,pack.cardStyle);if(ed)ec={ed,m,look:await cardAssets(ed)};}
    if(lineup)await drawPitchPanel(ctx,40,H*.2,W-80,H*.69,lineup,hf,140,ec,pack.pitch);
    const boxes={};
    for(const el of packElements(kind,m)){
      const ov=packLayout(pack,kind,el.id);if(ov.hide)continue;
      const x=(ov.x??el.x)*W,y=(ov.y??el.y)*H,size=(ov.s??el.s)*W,text=ov.text??el.text,align=el.align||'center';
      if(el.type==='logo'){if(logo){ctx.save();ctx.beginPath();ctx.arc(x,y,size/2,0,Math.PI*2);ctx.clip();ctx.fillStyle='#fff';ctx.fillRect(x-size/2,y-size/2,size,size);ctx.drawImage(logo,x-size/2,y-size/2,size,size);ctx.restore();}boxes[el.id]={x:x-size/2,y:y-size/2,w:size,h:size};continue;}
      ctx.textBaseline='middle';ctx.textAlign=align;
      if(el.type==='list'){
        const lh=size*1.14,gap=size*.4;ctx.font=`bold ${size}px ${hf}`;let maxW=0;
        el.lines.forEach((l,i)=>{ctx.textAlign='right';ctx.fillStyle=red;ctx.fillText(String(l.n),x,y+i*lh+lh/2);ctx.textAlign='left';ctx.fillStyle='#fff7f5';ctx.fillText(l.name,x+gap,y+i*lh+lh/2);maxW=Math.max(maxW,ctx.measureText(l.name).width);});
        boxes.list={x:x-size*1.2,y,w:size*1.2+gap+maxW,h:Math.max(lh,el.lines.length*lh)};continue;
      }
      let fs=size;ctx.font=`${el.italic?'italic ':''}${el.weight||'bold'} ${fs}px ${hf}`;while(ctx.measureText(text).width>W*.96&&fs>12){fs-=2;ctx.font=`${el.italic?'italic ':''}${el.weight||'bold'} ${fs}px ${hf}`;}
      ctx.fillStyle=el.accent?red:'#fff7f5';ctx.globalAlpha=el.alpha??1;ctx.fillText(text,x,y);ctx.globalAlpha=1;
      const tw=ctx.measureText(text).width;boxes[el.id]={x:align==='left'?x:align==='right'?x-tw:x-tw/2,y:y-fs*.55,w:tw,h:fs*1.1};
    }
    if(token!==packToken)return;
    packUi.boxes=boxes;
    const sel=boxes[packUi.selected];if(sel&&canvas.dataset.export!=='1'){ctx.save();ctx.setLineDash([10,8]);ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.strokeRect(sel.x-6,sel.y-6,sel.w+12,sel.h+12);ctx.restore();}
  }
  async function packBlob(m,pack,kind,scale){
    const c=document.createElement('canvas');c.dataset.export='1';await renderPack(c,m,pack,kind,scale);
    return new Promise(r=>c.toBlob(r,'image/png'));
  }
  const packMatch=()=>data.matches.find(x=>x.id===packUi.matchId);
  const packRepaint=()=>{const c=$('#packCanvas'),m=packMatch();if(c&&m)packPaint=renderPack(c,m,getPack(m.id),packUi.kind);return packPaint;};
  function packView(){
    if(!data.matches.length)return heading('Match pack','Every match gets its own art style, shared by all of its posters.')+empty('Add a match first','A pack is built for one match, then every poster for that match follows its style.','quick-match','Add a match');
    if(!data.matches.some(x=>x.id===packUi.matchId))packUi.matchId=(data.matches.find(x=>x.id===data.formation.matchId)||upcoming()||data.matches[0]).id;
    const matches=[...data.matches].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `${heading('Match pack','One art style per match. Set it once, then every poster for that match follows it. Drag any text on the poster to move it.',`<label class="export-scale"><span>Size</span><select class="select" id="packScale">${[1,2,3].map(n=>`<option value="${n}" ${(data.settings.exportScale||1)===n?'selected':''}>${n}× · ${PACK_W*n} px wide</option>`).join('')}</select></label>`+btn('Export all posters','pack-export-all')+btn('Export this poster','pack-export','button button-secondary'))}
<section class="panel match-bar"><label class="field"><span class="field-label">Match</span><select id="packMatch" class="select">${matches.map(m=>`<option value="${safe(m.id)}" ${m.id===packUi.matchId?'selected':''}>${safe(matchLabel(m))}</option>`).join('')}</select></label><label class="field"><span class="field-label">Copy style from</span><select id="packCopy" class="select"></select></label></section>
<div class="pack-tabs" role="tablist">${PACK_KINDS.map(([k,l])=>`<button type="button" class="team-tab ${k===packUi.kind?'is-active':''}" data-pack-kind="${k}">${l}</button>`).join('')}</div>
<div class="pack-layout"><div class="pack-stage"><canvas id="packCanvas" class="pack-canvas"></canvas><p class="caption">Tap a text to select it, then drag it or use the sliders. Exports are 1080 px wide.</p></div><div class="pack-side"><section class="panel pack-panel" id="packStyle"></section><section class="panel pack-panel" id="packSel"></section></div></div>`;
  }
  function bindPack(){
    const m=packMatch();if(!m)return;const pack=getPack(m.id),save=()=>persistSoon();
    const others=data.matches.filter(x=>x.id!==m.id&&data.packs[x.id]);
    $('#packCopy').innerHTML='<option value="">Choose a match…</option>'+others.map(x=>`<option value="${safe(x.id)}">${safe(matchLabel(x))}</option>`).join('');
    $('#packMatch').onchange=e=>{packUi.matchId=e.target.value;packUi.selected='';setPage('packs');};
    $('#packCopy').onchange=async e=>{const src=data.packs[e.target.value];if(!src)return;if(!confirm('Replace this match\'s style and text positions with the copied one?'))return;const prev=data.packs[m.id];data.packs[m.id]=JSON.parse(JSON.stringify(src));if(!await persist()){data.packs[m.id]=prev;return;}setPage('packs');toast('Style copied.');};
    $$('[data-pack-kind]').forEach(b=>b.onclick=()=>{packUi.kind=b.dataset.packKind;packUi.selected='';setPage('packs');});
    const sliders=[['tint','Red tint on photo',0,1,.05],['shade','Darken',0,.8,.05],['vignette','Vignette',0,.9,.05],['grain','Film grain',0,1,.05]];
    $('#packStyle').innerHTML=`<h3>Style for this match</h3><label class="field"><span class="field-label">Background (PSD, PSB, PNG, JPG)</span><input class="input" type="file" id="packBg" accept=".psd,.psb,.png,.jpg,.jpeg,.webp"></label>${pack.bg?'<button class="button button-quiet button-small" type="button" id="packBgClear">Remove background</button>':'<p class="caption">No background yet, so the default red gradient is used. A Photoshop file is flattened into one picture; layers are not kept.</p>'}<div id="packBgNote" class="caption"></div>${pack.bg?'<p class="caption">Drag the empty part of the poster to move the photo. Pinch (or scroll) to zoom it. Drag any text to move it.</p>':''}${sliders.map(([k,l,lo,hi,st])=>`<label class="field"><span class="field-label">${l}</span><input type="range" data-pack-range="${k}" min="${lo}" max="${hi}" step="${st}" value="${pack[k]}"></label>`).join('')}<label class="field"><span class="field-label">Heading font</span><select class="select" id="packFont">${[['','Default (Winner GFC)'],...fontChoices().map(n=>[n,n])].map(([v,l])=>`<option value="${safe(v)}" ${v===pack.font?'selected':''}>${safe(l)}</option>`).join('')}</select></label><div class="pack-row"><label class="field"><span class="field-label">Accent colour</span><input class="input" type="color" id="packColor" value="${pack.primary}"></label><label class="field"><span class="field-label">Format</span><select class="select" id="packFormat"><option value="feed" ${pack.format==='feed'?'selected':''}>Feed 4:5</option><option value="story" ${pack.format==='story'?'selected':''}>Story 9:16</option></select></label></div><label class="field"><span class="field-label">Player cards on line-up posters</span><select class="select" id="packCardStyle"><option value="">Each player's own card</option><option value="match" ${pack.cardStyle==='match'?'selected':''}>This match's card style</option>${data.cardDesigns.map(s=>`<option value="design:${safe(s.id)}" ${pack.cardStyle==='design:'+s.id?'selected':''}>${safe(s.name)} (template)</option>`).join('')}${data.cardStyles.map(s=>`<option value="${safe(s.id)}" ${pack.cardStyle===s.id?'selected':''}>${safe(s.name)} (saved)</option>`).join('')}</select></label><label class="field"><span class="field-label">Pitch shape on line-up posters</span><select class="select" id="packPitch">${PITCHES.map(([k,l])=>`<option value="${k}" ${pack.pitch===k?'selected':''}>${l}</option>`).join('')}</select></label><button class="button button-quiet button-small" type="button" data-action="manage-fonts">Manage fonts</button>`;
    $$('[data-pack-range]',$('#packStyle')).forEach(r=>r.oninput=()=>{pack[r.dataset.packRange]=Number(r.value);packRepaint();save();});
    $('#packFont').onchange=e=>{pack.font=e.target.value;packRepaint();save();};
    $('#packPitch').onchange=e=>{pack.pitch=e.target.value;packRepaint();save();};
    $('#packScale')&&($('#packScale').onchange=e=>{data.settings.exportScale=+e.target.value;persist();});
    $('#packCardStyle').onchange=e=>{pack.cardStyle=e.target.value;packRepaint();save();};
    $('#packColor').oninput=e=>{pack.primary=e.target.value;packRepaint();save();};
    $('#packFormat').onchange=e=>{pack.format=e.target.value;packRepaint();save();};
    $('#packBgClear')?.addEventListener('click',async()=>{const prev=pack.bg;pack.bg='';if(!await persist()){pack.bg=prev;return;}setPage('packs');});
    $('#packBg').onchange=async e=>{
      const file=e.target.files[0];e.target.value='';if(!file)return;const note=$('#packBgNote');note.textContent='Reading the file…';
      try{
        const src=await loadTemplateSource(file),c=composeBackground(src.source,'cover',50,50,1080,1920);src.source.close?.();
        if(isUniform(c))throw new Error('That file looks blank. If it is a Photoshop file, make sure its layers are visible and save as 8-bit RGB.');
        const prev=pack.bg;pack.bg=c.toDataURL('image/jpeg',.88);
        if(!await persist()){pack.bg=prev;throw new Error('The background could not be saved (browser storage may be full), so it was not applied.');}
        setPage('packs');toast('Background set for every poster of this match.');
      }catch(error){note.textContent=error.message;toast(error.message);}
    };
    // selected element panel
    const els=packElements(packUi.kind,m),sel=els.find(x=>x.id===packUi.selected),box=$('#packSel');
    if(!sel){box.innerHTML='<h3>Selected text</h3><p class="caption">Nothing selected. Tap a text or the crest on the poster.</p>'+(Object.keys(pack.layouts[packUi.kind]||{}).length?'<button class="button button-quiet button-small" type="button" id="packResetAll">Reset this poster layout</button>':'');}
    else{
      const ov=packLayout(pack,packUi.kind,sel.id),val=(k,d)=>ov[k]??d;
      box.innerHTML=`<h3>${safe(sel.label)}</h3>${sel.type==='text'?`<label class="field"><span class="field-label">Text</span><input class="input" id="packText" value="${safe(val('text',sel.text))}"></label>`:''}<label class="field"><span class="field-label">Left to right</span><input type="range" id="packX" min="0" max="1" step="0.005" value="${val('x',sel.x)}"></label><label class="field"><span class="field-label">Top to bottom</span><input type="range" id="packY" min="0" max="1" step="0.005" value="${val('y',sel.y)}"></label><label class="field"><span class="field-label">Size</span><input type="range" id="packS" min="0.01" max="0.4" step="0.002" value="${val('s',sel.s)}"></label><div class="pack-row"><button class="button button-quiet button-small" type="button" id="packHide">Hide</button><button class="button button-quiet button-small" type="button" id="packResetEl">Reset this item</button></div>`;
      const set=(k,v)=>{((pack.layouts[packUi.kind]??={})[sel.id]??={})[k]=v;packRepaint();save();};
      $('#packText')?.addEventListener('input',e=>set('text',e.target.value));
      for(const [id,k] of [['packX','x'],['packY','y'],['packS','s']])$('#'+id).oninput=e=>set(k,Number(e.target.value));
      $('#packHide').onclick=()=>{set('hide',true);packUi.selected='';setPage('packs');};
      $('#packResetEl').onclick=()=>{delete pack.layouts[packUi.kind]?.[sel.id];save();setPage('packs');};
    }
    $('#packResetAll')?.addEventListener('click',()=>{delete pack.layouts[packUi.kind];save();setPage('packs');});
    const hidden=els.filter(x=>packLayout(pack,packUi.kind,x.id).hide);
    if(hidden.length)box.insertAdjacentHTML('beforeend',`<div class="pack-row">${hidden.map(x=>`<button class="button button-quiet button-small" type="button" data-pack-show="${x.id}">Show ${safe(x.label)}</button>`).join('')}</div>`);
    $$('[data-pack-show]',box).forEach(b=>b.onclick=()=>{delete pack.layouts[packUi.kind][b.dataset.packShow].hide;save();setPage('packs');});
    // drag on canvas
    const canvas=$('#packCanvas');canvas.style.touchAction=(packUi.selected||pack.bg)?'none':'auto';let drag=null,raf=0,bgDrag=null;const pts=new Map();canvas.addEventListener('wheel',e=>{if(!pack.bg)return;e.preventDefault();pack.bgZoom=cl((pack.bgZoom||100)*(e.deltaY<0?1.06:.94),100,300);packRepaint();clearTimeout(canvas._wz);canvas._wz=setTimeout(save,400);},{passive:false});
    canvas.onpointerdown=e=>{
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(bgDrag&&pts.size===2){const [a,b]=[...pts.values()];bgDrag={...bgDrag,pinch:true,d0:Math.hypot(a.x-b.x,a.y-b.y)||1,z0:pack.bgZoom||100};canvas.setPointerCapture(e.pointerId);return;}
      const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)*PACK_W/r.width,py=(e.clientY-r.top)*(canvas.height/canvas.width*PACK_W)/r.height;
      const id=Object.keys(packUi.boxes).reverse().find(k=>{const b=packUi.boxes[k];return px>=b.x-10&&px<=b.x+b.w+10&&py>=b.y-10&&py<=b.y+b.h+10;});
      if(!id){const im=pack.bg&&posterImages.get(pack.bg);if(im){bgDrag={sx:e.clientX,sy:e.clientY,fx:pack.fx,fy:pack.fy,rw:r.width,rh:r.height,im,moved:false};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}if(packUi.selected){packUi.selected='';setPage('packs');}return;}
      const el=els.find(x=>x.id===id),ov=packLayout(pack,packUi.kind,id),wasSelected=packUi.selected===id;packUi.selected=id;
      drag={id,sx:e.clientX,sy:e.clientY,ox:ov.x??el.x,oy:ov.y??el.y,rw:r.width,rh:r.height,moved:false,wasSelected};canvas.setPointerCapture(e.pointerId);e.preventDefault();
    };
    canvas.onpointermove=e=>{if(bgDrag){pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const H=canvas.height/canvas.width*PACK_W;
        if(bgDrag.pinch){if(pts.size<2)return;const [a,b]=[...pts.values()];pack.bgZoom=cl(bgDrag.z0*Math.hypot(a.x-b.x,a.y-b.y)/bgDrag.d0,100,300);bgDrag.moved=true;}
        else{const dxp=e.clientX-bgDrag.sx,dyp=e.clientY-bgDrag.sy;if(!bgDrag.moved&&Math.hypot(dxp,dyp)<4)return;bgDrag.moved=true;const S=Math.max(PACK_W/bgDrag.im.width,H/bgDrag.im.height)*(pack.bgZoom||100)/100,tx=bgDrag.im.width*S-PACK_W,ty=bgDrag.im.height*S-H;
          if(tx>1)pack.fx=cl(bgDrag.fx-dxp*PACK_W/bgDrag.rw/tx*100,0,100);if(ty>1)pack.fy=cl(bgDrag.fy-dyp*H/bgDrag.rh/ty*100,0,100);}
        if(!raf)raf=requestAnimationFrame(()=>{raf=0;packRepaint();});return;}
      if(!drag)return;const dx=(e.clientX-drag.sx)/drag.rw,dy=(e.clientY-drag.sy)/drag.rh;if(!drag.moved&&Math.hypot(dx*drag.rw,dy*drag.rh)<4)return;drag.moved=true;
      const o=((pack.layouts[packUi.kind]??={})[drag.id]??={});o.x=cl(drag.ox+dx,0,1);o.y=cl(drag.oy+dy,0,1);if(!raf)raf=requestAnimationFrame(()=>{raf=0;packRepaint();});};
    canvas.onpointerup=canvas.onpointercancel=e=>{if(bgDrag){pts.delete(e.pointerId);const m=bgDrag.moved;if(!pts.size){bgDrag=null;if(m)save();else if(packUi.selected){packUi.selected='';setPage('packs');}}else if(bgDrag.pinch){bgDrag=null;save();}return;}if(!drag)return;const d=drag;drag=null;if(d.moved)save();setPage('packs');};
    packRepaint();
  }
  async function exportPack(all){
    const m=packMatch();if(!m)return;const pack=getPack(m.id),kinds=all?PACK_KINDS.map(k=>k[0]).filter(k=>!/^(lineup|roster)/.test(k)||placedCount(m.id,k.slice(-1))):[packUi.kind];
    if(!kinds.length)return;toast(all?`Exporting ${kinds.length} posters…`:'Exporting…');
    const sc=data.settings.exportScale||1,eff=Math.min(sc,Math.sqrt(MAX_PX/(PACK_W*(pack.format==='story'?1920:1350)))),tag=eff>1.001?`@${+eff.toFixed(2)}x`:'';
    if(eff<sc-.01)toast(`Story at ${sc}× is too big for phones, so it is exported at ${+eff.toFixed(1)}×.`);
    for(const k of kinds){const blob=await packBlob(m,pack,k,sc);if(!blob){toast('Could not export a poster. Please try again.');return;}download(blob,`GFC-${(m.opponent||'match').replace(/[^\w]+/g,'-')}-${k}${tag}.png`);if(all)await new Promise(r=>setTimeout(r,500));}
    data.progress.exports+=kinds.length;persist();toast(all?'Pack exported.':'Poster exported.');
  }

  // ===== Settings (gear, top right): data, fonts, export size, theme, calendar, reset =====
  const APP_VERSION='5.14';
  async function settingsSheet(){
    let usage='';try{const e=await navigator.storage?.estimate?.();if(e?.usage)usage=` · about ${(e.usage/1048576).toFixed(1)} MB used in this browser`;}catch{}
    const row=(t,d,b)=>`<div class="set-row"><div><b>${t}</b><small>${d}</small></div>${b}</div>`,B=(id,l,c='button-secondary')=>`<button type="button" class="button ${c} button-small" id="${id}">${l}</button>`;
    openSheet('Settings',`<div class="set-list">
<p class="eyebrow">YOUR DATA</p>
${row('Save data','Download a backup file with your squad, matches, cards, templates, posters and fonts. Keep it somewhere safe.',B('setSave','Save backup','button-primary'))}
${row('Restore data','Load a backup file. This replaces what is in the app now.',B('setRestore','Restore backup'))}
${row('Storage',`${data.squad.length} players, ${data.matches.length} matches, ${data.cardDesigns.length} card templates${safe(usage)}`,'')}
<p class="eyebrow">DESIGN</p>
${row('Fonts','Add your own fonts for posters and cards.',B('setFonts','Manage fonts'))}
${row('Export size','Posters and cards are redrawn at this size, so they stay sharp. 3× is the biggest.',`<select class="select" id="setScale">${[1,2,3].map(n=>`<option value="${n}" ${(data.settings.exportScale||1)===n?'selected':''}>${n}×</option>`).join('')}</select>`)}
${row('Pitch style','Colours of the Tactics board.',`<select class="select" id="setPitch">${Object.entries(PITCH_THEMES).map(([k,l])=>`<option value="${k}" ${data.settings.pitchTheme===k?'selected':''}>${l}</option>`).join('')}</select>`)}
<p class="eyebrow">APP</p>
${row('Install app',isInstalled()?'GFC is installed on this device and works offline.':installEvent?'Add GFC to your home screen. It opens full screen and works offline.':'On iPhone: tap Share, then Add to Home Screen. On Android or desktop Chrome: browser menu, Install app.',installEvent&&!isInstalled()?B('setInstall','Install','button-primary'):'')}
<p class="eyebrow">MORE</p>
${row('Instagram calendar','Download planned posts as a calendar file.',B('setIcs','Export calendar'))}
${row('Start again','Erase everything in this browser and go back to the starting squad. Save a backup first.',B('setReset','Erase data','button-quiet'))}
<p class="caption">GFC Club Manager v${APP_VERSION} · data stays in this browser.</p></div>`,'settings-sheet');
    $('#setSave').onclick=()=>{backup();toast('Backup saved to your downloads.');};
    $('#setRestore').onclick=()=>{modal.close();$('#backupImport').click();};
    $('#setFonts').onclick=()=>{modal.close();fontManager();};
    $('#setScale').onchange=e=>{data.settings.exportScale=+e.target.value;persist();toast(`Exports will be ${e.target.value}×.`);};
    $('#setPitch').onchange=e=>{data.settings.pitchTheme=e.target.value;persist();if(page==='formation')setPage('formation');};
    $('#setInstall')&&($('#setInstall').onclick=async()=>{const e=installEvent;installEvent=null;if(e){e.prompt();await e.userChoice.catch(()=>{});}modal.close();});
    $('#setIcs').onclick=()=>exportICS();
    $('#setReset').onclick=async()=>{if(!confirm('Erase everything in this browser (players, matches, cards, templates, posters, fonts) and start again? This cannot be undone. Save a backup first if you may need it.'))return;if(!confirm('Really erase all data?'))return;const previous=data;data=normalize({});if(!await persist()){data=previous;return;}modal.close();setPage('overview');toast('Data erased. Starting fresh.');};
  }
  // ===== Match cards: one Ultimate-Team-style card design per match (cards.js draws them) =====
  const cardUi={matchId:'',scope:'xi',selected:''};let cardToken=0;
  const cardMatch=()=>data.matches.find(x=>x.id===cardUi.matchId);
  // A saved template laid over a match look: its pictures, colours, shape and item layout win.
  const designEd=(base,dz)=>({...base,design:dz,bg:dz.bg,frame:dz.frame,frameTop:dz.frameTop,shapeImg:dz.shapeImg,shape:dz.shapeImg?'custom':dz.shape});
  const designOf=m=>{const id=data.editions[m.id]?.designId;if(id==='none')return null;return data.cardDesigns.find(x=>x.id===(id||data.settings.defaultDesign))||null;};
  const cardEd=m=>{const e=GC.resolve(m.id,data.editions[m.id]),dz=designOf(m);return dz?designEd(e,dz):e;};
  function cardPlayers(m){
    let ids;
    if(cardUi.scope==='played')ids=m.stats?.played||[];
    else if(cardUi.scope==='xi'){ids=[...Object.values(peek(m.id,'A')?.slots||{}),...Object.values(peek(m.id,'B')?.slots||{})];}
    else ids=data.squad.map(p=>p.id);
    const seen=new Set();return ids.filter(id=>!seen.has(id)&&seen.add(id)).map(playerById).filter(Boolean);
  }
  const cardOpts=(m,p,look,photo)=>({photo,crest:look.crest,bgImage:look.bgImage,shapeImage:look.shapeImage,frameImage:look.frameImage,attrKeys:G.attrKeys(p),potm:m.stats?.potm===p.id});
  async function cardAssets(ed){
    await ensureFonts();const f=ed.font||'Winner GFC';try{await document.fonts.load(`700 24px "${f}"`);}catch{}
    const [crest,bgImage,shapeImage,frameImage]=await Promise.all([loadCardImage('assets/brand/gfc-logo.png'),ed.bg?loadCardImage(ed.bg):null,ed.shapeImg?loadCardImage(ed.shapeImg):null,ed.frame?loadCardImage(ed.frame):null]);
    return {crest,bgImage,shapeImage,frameImage};
  }
  // The design a poster should use: this match's own look, or one saved in the app.
  const edFor=(m,id)=>id==='match'?cardEd(m):id.startsWith('design:')?(data.cardDesigns.find(x=>`design:${x.id}`===id)?designEd(GC.resolve(m.id,{}),data.cardDesigns.find(x=>`design:${x.id}`===id)):null):data.cardStyles.some(x=>x.id===id)?GC.resolve(m.id,data.cardStyles.find(x=>x.id===id).ed):null;
  // Lets you make a picture's white or black background transparent before it is used. Resolves with the new picture, or null if cancelled.
  function cutoutDialog(src,opts={}){
    return new Promise(async resolve=>{
      const im=await loadCardImage(src);if(!im)return resolve({src,clear:false});
      let done=false;const finish=v=>{if(done)return;done=true;modal.oncancel=null;if(modal.open)modal.close();resolve(v);};
      const ai=!opts.frame,modes=[...(ai?[['ai','✨ AI · any photo']]:[]),['none','Keep as is'],['white','Remove white'],['black','Remove black'],['auto','Match corners']];
      let mode=ai&&opts.photo?'ai':'none';
      openSheet('Remove the background',`<p class="caption" id="cutHelp"></p>
<div class="cut-stage"><canvas id="cutCanvas" width="${im.naturalWidth||im.width}" height="${im.naturalHeight||im.height}"></canvas></div>
<p class="caption" id="cutStatus" hidden></p>
<div class="cc-chips">${modes.map(([k,l])=>`<button type="button" class="team-tab ${k===mode?'is-active':''}" data-cut-mode="${k}">${l}</button>`).join('')}</div>
<div id="cutColour"><label class="field"><span class="field-label">Strength <b id="cutTolV">30</b></span><input type="range" id="cutTol" min="0" max="60" value="30"></label>
<label class="cc-check"><input type="checkbox" id="cutEdges" checked> Edges only (keep matching colours inside the artwork)</label></div>
<div id="cutAi" hidden><div class="st-grid"><label class="field"><span class="field-label">Sharp edge <b id="cutSharpV">70</b></span><input type="range" id="cutSharp" min="0" max="100" value="70"></label><label class="field"><span class="field-label">Edge in/out <b id="cutEdgeV">0</b></span><input type="range" id="cutEdge" min="-50" max="50" value="0"></label></div>
<label class="cc-check"><input type="checkbox" id="cutMain" checked> Keep only the main person</label>
<p class="field-label">Touch up with your finger</p><div class="cc-chips">${[['off','Off'],['erase','Erase'],['restore','Restore']].map(([k,l])=>`<button type="button" class="team-tab ${k==='off'?'is-active':''}" data-cut-brush="${k}">${l}</button>`).join('')}<button type="button" class="team-tab" id="cutUndo">Undo brush</button></div>
<label class="field"><span class="field-label">Brush size <b id="cutBrushV">4</b></span><input type="range" id="cutBrush" min="1" max="15" value="4"></label></div>
${opts.frame?`<label class="cc-check"><input type="checkbox" id="cutFrame"> Extract the frame only (hollow out the middle so a photo can show through)</label><label class="field"><span class="field-label">Frame thickness <b id="cutThickV">7</b>%</span><input type="range" id="cutThick" min="2" max="25" value="7"></label>`:''}
<div class="cc-stage-actions"><button class="button button-quiet" type="button" id="cutCancel">Cancel</button><button class="button button-primary" type="button" id="cutUse">Use picture</button></div>`,'cut-sheet');
      const cv=$('#cutCanvas',modal),ctx=cv.getContext('2d',{willReadFrequently:true}),W=cv.width,H=cv.height,status=t=>{const e=$('#cutStatus',modal);e.hidden=!t;e.textContent=t||'';};
      ctx.drawImage(im,0,0,W,H);const orig=ctx.getImageData(0,0,W,H),srcC=document.createElement('canvas');srcC.width=W;srcC.height=H;srcC.getContext('2d').putImageData(orig,0,0);
      let aiState=null,aiBusy=false,ov=null,brush='off',ovStack=[],base=null,raf=0;
      const wantFrame=()=>!!$('#cutFrame',modal)?.checked,hasOv=()=>!!ov;
      const help=()=>{$('#cutHelp',modal).textContent=mode==='ai'?'The cut-out is made on your phone, nothing is uploaded. Use Sharp edge to harden the outline, Edge to trim or grow it, and paint with your finger to fix any spot.':'Pick the colour behind the picture. Light or dark areas inside the artwork are kept when "Edges only" is on.';$('#cutAi',modal).hidden=mode!=='ai';$('#cutColour',modal).hidden=mode==='ai'||mode==='none';};
      const aiAlpha=()=>{const a=$('#cutMain',modal).checked?aiState.main:aiState.full;return GFC_BG.curve(a,+$('#cutSharp',modal).value,+$('#cutEdge',modal).value);};
      const paint=()=>{
        if(mode==='ai'){if(!aiState){ctx.putImageData(orig,0,0);return;}if(!base)base=aiAlpha();const id=new ImageData(new Uint8ClampedArray(orig.data),W,H),d=id.data;for(let i=0;i<base.length;i++){const o=ov?ov[i]:0;d[i*4+3]=o===1?255:o===2?0:base[i];}ctx.putImageData(id,0,0);return;}
        ctx.clearRect(0,0,W,H);ctx.drawImage(im,0,0,W,H);if(mode==='none'&&!wantFrame()&&!hasOv())return;const id=ctx.getImageData(0,0,W,H);
        if(mode!=='none')GC.removeBackground(id,{mode,tol:+$('#cutTol',modal).value,edgesOnly:$('#cutEdges',modal).checked});if(wantFrame())GC.extractFrame(id,{thickness:+$('#cutThick',modal).value});
        if(ov){const d=id.data;for(let i=0;i<ov.length;i++){if(ov[i]===2)d[i*4+3]=0;else if(ov[i]===1)d[i*4+3]=255;}}ctx.putImageData(id,0,0);
      };
      const draw=()=>{if(mode==='ai')base=null;paint();};
      const runAi=async()=>{
        if(aiState||aiBusy)return;aiBusy=true;
        try{status('Loading the cut-out model… (first time only, about 45 MB)');
          const m=await GFC_BG.predict(srcC,p=>status(`Loading the cut-out model… ${Math.round(p*100)}%`));
          status('Finding the player…');await new Promise(r=>setTimeout(r,30));
          await new Promise(r=>setTimeout(r,30));const full=GFC_BG.refine(orig,m);status('Cleaning the edges…');await new Promise(r=>setTimeout(r,30));
          aiState={full,main:GFC_BG.keepMain(full,W,H)};status('');draw();
        }catch(e){status('');toast(e.message||'The AI cut-out could not run on this device. Try Remove white or Match corners.');mode='none';$$('[data-cut-mode]',modal).forEach(x=>x.classList.toggle('is-active',x.dataset.cutMode==='none'));help();draw();}
        aiBusy=false;
      };
      let t0;const soon=()=>{clearTimeout(t0);t0=setTimeout(draw,60);};
      help();if(mode==='ai')runAi();
      $$('[data-cut-mode]',modal).forEach(b=>b.onclick=()=>{mode=b.dataset.cutMode;$$('[data-cut-mode]',modal).forEach(x=>x.classList.toggle('is-active',x===b));help();if(mode==='ai'&&!aiState)runAi();draw();});
      if($('#cutFrame',modal)){$('#cutFrame',modal).onchange=draw;$('#cutThick',modal).oninput=e=>{$('#cutThickV',modal).textContent=e.target.value;soon();};}
      $('#cutTol',modal).oninput=e=>{$('#cutTolV',modal).textContent=e.target.value;soon();};$('#cutEdges',modal).onchange=draw;
      for(const [id,l] of [['cutSharp','cutSharpV'],['cutEdge','cutEdgeV'],['cutBrush','cutBrushV']])$('#'+id,modal).oninput=e=>{$('#'+l,modal).textContent=e.target.value;if(id!=='cutBrush')soon();};
      $('#cutMain',modal).onchange=draw;
      $$('[data-cut-brush]',modal).forEach(b=>b.onclick=()=>{brush=b.dataset.cutBrush;$$('[data-cut-brush]',modal).forEach(x=>x.classList.toggle('is-active',x===b));cv.style.touchAction=brush==='off'?'auto':'none';});
      $('#cutUndo',modal).onclick=()=>{if(!ovStack.length)return;ov=ovStack.pop();paint();};
      let down=null;const at=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};};
      const stamp=(x,y)=>{const rad=Math.max(2,W*(+$('#cutBrush',modal).value)/200),v=brush==='erase'?2:1,x0=Math.max(0,Math.floor(x-rad)),x1=Math.min(W-1,Math.ceil(x+rad)),y0=Math.max(0,Math.floor(y-rad)),y1=Math.min(H-1,Math.ceil(y+rad));for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)if((xx-x)**2+(yy-y)**2<=rad*rad)ov[yy*W+xx]=v;};
      const line=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/Math.max(2,W*.004)));for(let i=1;i<=n;i++)stamp(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n);};
      cv.onpointerdown=e=>{if(brush==='off')return;if(mode==='ai'&&!aiState)return;if(!ov)ov=new Uint8Array(W*H);ovStack.push(ov.slice());if(ovStack.length>6)ovStack.shift();cv.setPointerCapture(e.pointerId);down=at(e);stamp(down.x,down.y);if(!raf)raf=requestAnimationFrame(()=>{raf=0;paint();});e.preventDefault();};
      cv.onpointermove=e=>{if(!down)return;const p=at(e);line(down,p);down=p;if(!raf)raf=requestAnimationFrame(()=>{raf=0;paint();});};
      cv.onpointerup=cv.onpointercancel=()=>{down=null;};
      $('#cutCancel',modal).onclick=()=>finish(null);
      $('#cutUse',modal).onclick=()=>{if(aiBusy)return toast('Still working on the cut-out…');paint();const d=ctx.getImageData(0,0,W,H).data;let clear=false;for(let i=3;i<d.length;i+=4*Math.max(1,Math.floor(d.length/4/6000)))if(d[i]<250){clear=true;break;}finish({src:cv.toDataURL('image/png'),orig:src,clear,extracted:wantFrame()});};
      modal.oncancel=()=>finish(null);modal.addEventListener('close',()=>finish(null),{once:true});
    });
  }
  // Solid outline of a frame picture: everything not reachable from the edges through see-through pixels counts as inside.
  async function frameSilhouette(src){
    const im=await loadCardImage(src);if(!im)return '';const W=240,H=Math.round(W*GC.RATIO),c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.drawImage(im,0,0,W,H);
    const img=ctx.getImageData(0,0,W,H),d=img.data,out=new Uint8Array(W*H),q=[];
    const clear=i=>d[i*4+3]<16,push=i=>{if(!out[i]&&clear(i)){out[i]=1;q.push(i);}};
    for(let x=0;x<W;x++){push(x);push((H-1)*W+x);}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1);}
    while(q.length){const i=q.pop(),x=i%W,y=(i/W)|0;if(x>0)push(i-1);if(x<W-1)push(i+1);if(y>0)push(i-W);if(y<H-1)push(i+W);}
    for(let i=0;i<W*H;i++){d[i*4]=d[i*4+1]=d[i*4+2]=255;d[i*4+3]=out[i]?0:255;}ctx.putImageData(img,0,0);return c.toDataURL('image/png');
  }
  // Shrinks an imported picture so it stays light to store; shapes keep their transparency (PNG), backgrounds become JPEG.
  async function importPicture(file,max,keepAlpha){
    const url=URL.createObjectURL(file);
    try{const im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('That picture could not be read. Use PNG, JPG, WEBP or SVG.'));i.src=url;});
      const iw=im.naturalWidth||600,ih=im.naturalHeight||900,s=Math.min(1,max/Math.max(iw,ih)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*s));c.height=Math.max(1,Math.round(ih*s));
      const ctx=c.getContext('2d');if(!keepAlpha){ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(im,0,0,c.width,c.height);
      let clear=false;if(keepAlpha){const d=ctx.getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4*Math.max(1,Math.floor(d.length/4/4000)))if(d[i]<250){clear=true;break;}}
      return {src:keepAlpha?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.86),clear};}
    finally{URL.revokeObjectURL(url);}
  }
  async function paintCards(){
    const m=cardMatch();if(!m)return;const tok=++cardToken,ed=cardEd(m),look=await cardAssets(ed);
    for(const c of $$('#appContent canvas[data-cc]')){
      const p=playerById(c.dataset.cc);if(!p)continue;const photo=await loadCardImage(p.photo);if(tok!==cardToken)return;
      const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);GC.drawCard(ctx,4,4,c.width-8,p,ed,cardOpts(m,p,look,photo));
    }
  }
  function cardsView(){
    const ms=[...data.matches].sort((a,b)=>b.date.localeCompare(a.date));
    if(!ms.length)return `${heading('Match cards','Every match gets its own card design.')}${clubTabs('cards')}${empty('No matches yet','Add a fixture and its card pack appears here.','quick-match','Add a match')}`;
    if(!ms.some(x=>x.id===cardUi.matchId))cardUi.matchId=(upcoming()||ms[0]).id;
    const m=cardMatch(),ed=cardEd(m),dz=designOf(m),pls=cardPlayers(m);if(!pls.some(p=>p.id===cardUi.selected))cardUi.selected=pls[0]?.id||'';
    const scopes=[['xi','Line-ups'],['played','Played'],['squad','Whole squad']];
    return `${heading('Match cards','Every match gets its own card design. Pick a look, tweak it, then export one card or the whole sheet.')}${clubTabs('cards')}
<section class="panel match-bar"><label class="field"><span class="field-label">Match</span><select id="ccMatch" class="select">${ms.map(x=>`<option value="${safe(x.id)}" ${x.id===m.id?'selected':''}>${safe(matchLabel(x))}</option>`).join('')}</select></label></section>
<div class="cc-layout"><div class="cc-stage">${cardUi.selected?`<canvas id="ccPreview" class="cc-preview" data-cc="${safe(cardUi.selected)}" width="308" height="474"></canvas>`:'<p class="caption">No players in this selection yet.</p>'}
<div class="cc-stage-actions">${btn('Export card','cc-export-one','button button-primary button-small')}${btn('Export sheet','cc-export-sheet','button button-secondary button-small')}${btn('Save all','cc-export-all','button button-quiet button-small')}</div></div>
<section class="panel cc-controls"><p class="field-label">Card template</p><div class="cc-chips"><button type="button" class="team-tab ${!dz?'is-active':''}" data-cc-design="none">No template</button>${data.cardDesigns.map(x=>`<button type="button" class="team-tab ${dz?.id===x.id?'is-active':''}" data-cc-design="${safe(x.id)}">${safe(x.name)}</button>`).join('')}${btn('＋ New template','studio-new','button button-primary button-small')}</div>
${dz?`<div class="cc-stage-actions">${btn('Edit template','studio-edit','button button-secondary button-small')}${btn('Duplicate','design-dup','button button-quiet button-small')}${btn(data.settings.defaultDesign===dz.id?'Used for all matches':'Use for all matches','design-default','button button-quiet button-small')}${btn('Delete','design-del','button button-quiet button-small')}</div>`:'<p class="caption">Make a template once: pick a background from your gallery, place the name, number and photo, and every player card follows it.</p>'}
<div class="cc-stage-actions">${sizeSelect('ccScale')}<span class="caption">Export size for card PNGs</span></div>
<details class="cc-more"><summary>Quick looks (used when no template is chosen)</summary>
<label class="cc-check"><input type="checkbox" id="ccShine" ${ed.shine?'checked':''}> Shine effect</label>
<p class="field-label">Look</p><div class="cc-chips">${GC.PRESETS.map(q=>`<button type="button" class="cc-look ${ed.preset===q.id?'is-active':''}" data-cc-preset="${q.id}" style="background:linear-gradient(135deg,${q.c2},${q.c1})" aria-label="${safe(q.name)}"><span>${safe(q.name)}</span></button>`).join('')}</div>
<p class="field-label">Shape</p><div class="cc-chips">${GC.SHAPES.map(([id,l])=>`<button type="button" class="team-tab ${ed.shape===id?'is-active':''}" data-cc-shape="${id}">${l}</button>`).join('')}${ed.shape==='custom'?'<button type="button" class="team-tab is-active" disabled>Imported</button>':''}</div>
<div class="cc-row"><label class="field"><span class="field-label">Import shape (PNG or SVG with a see-through background)</span><input class="input" type="file" id="ccShapeFile" accept="image/png,image/svg+xml,image/webp"></label><label class="field"><span class="field-label">Import background (PNG, JPG, WEBP)</span><input class="input" type="file" id="ccBgFile" accept="image/png,image/jpeg,image/webp"></label></div>
<div class="cc-row"><label class="field"><span class="field-label">Import card frame (PNG with see-through edges)</span><input class="input" type="file" id="ccFrameFile" accept="image/png,image/webp"></label><label class="cc-check"><input type="checkbox" id="ccFrameTop" ${ed.frameTop?'checked':''}> Frame over the photo</label></div>
<div class="cc-stage-actions">${ed.frame?btn('Remove frame','cc-clear-frame','button button-quiet button-small'):''}${ed.shape==='custom'?btn('Remove imported shape','cc-clear-shape','button button-quiet button-small'):''}${ed.bg?btn('Remove background','cc-clear-bg','button button-quiet button-small'):''}</div>
<p class="field-label">Pattern</p><div class="cc-chips">${GC.PATTERNS.map(([id,l])=>`<button type="button" class="team-tab ${ed.pattern===id?'is-active':''}" data-cc-pattern="${id}">${l}</button>`).join('')}</div>
<div class="cc-colors"><label>Top<input type="color" data-cc-color="c2" value="${ed.c2}"></label><label>Base<input type="color" data-cc-color="c1" value="${ed.c1}"></label><label>Trim<input type="color" data-cc-color="accent" value="${ed.accent}"></label><label>Text<input type="color" data-cc-color="ink" value="${ed.ink}"></label></div>
<div class="cc-row"><label class="field"><span class="field-label">Edition label</span><input class="input" id="ccLabel" maxlength="18" value="${safe(ed.label)}"></label><label class="field"><span class="field-label">Font</span><select class="select" id="ccFont">${fontChoices().map(n=>`<option ${n===(ed.font||'Winner GFC')?'selected':''}>${safe(n)}</option>`).join('')}</select></label></div>
<label class="cc-check"><input type="checkbox" id="ccStats" ${ed.stats?'checked':''}> Show attributes</label>
<div class="cc-save"><label class="field"><span class="field-label">Save this style in the app</span><input class="input" id="ccStyleName" maxlength="30" placeholder="Style name, e.g. Night match"></label>${btn('Save style','cc-save-style','button button-secondary button-small')}</div>
${data.cardStyles.length?`<p class="field-label">Saved styles</p><div class="cc-chips">${data.cardStyles.map(s=>`<span class="cc-saved"><button type="button" class="team-tab" data-cc-apply="${safe(s.id)}">${safe(s.name)}</button><button type="button" class="cc-x" data-cc-del="${safe(s.id)}" aria-label="Delete ${safe(s.name)}">×</button></span>`).join('')}</div>`:''}
<div class="cc-stage-actions">${btn('Shuffle design','cc-shuffle','button button-secondary button-small')}${btn('Reset to auto','cc-reset','button button-quiet button-small')}</div></details></section></div>
<div class="pack-tabs">${scopes.map(([k,l])=>`<button type="button" class="team-tab ${cardUi.scope===k?'is-active':''}" data-cc-scope="${k}">${l}</button>`).join('')}</div>
${pls.length?`<div class="cc-grid">${pls.map(p=>`<button type="button" class="cc-tile ${p.id===cardUi.selected?'is-active':''}" data-cc-pick="${safe(p.id)}" aria-label="${safe(p.name)}"><canvas data-cc="${safe(p.id)}" width="308" height="474"></canvas></button>`).join('')}</div>`:`<p class="caption">${cardUi.scope==='played'?'No played list recorded for this match yet.':'Nobody placed yet. Set a line-up in Tactics, or pick Whole squad.'}</p>`}
<p class="caption">Ratings and attributes show "--" until you record them. The player of the match gets a gold card automatically.</p>`;
  }
  function bindCards(){
    const m=cardMatch();if(!m){return;}
    const redraw=()=>{const y=scrollY;setPage('cards');scrollTo(0,y);};
    const set=(patch,keep)=>{const s={...(data.editions[m.id]||{})};for(const [k,v] of Object.entries(patch)){if(v==null)delete s[k];else s[k]=v;}data.editions[m.id]=s;persistSoon();keep?paintCards():redraw();};
    $('#ccMatch').onchange=e=>{cardUi.matchId=e.target.value;cardUi.selected='';setPage('cards');};
    $$('[data-cc-preset]').forEach(b=>b.onclick=()=>set({preset:b.dataset.ccPreset,c1:null,c2:null,accent:null,ink:null}));
    $('#ccScale')&&($('#ccScale').onchange=e=>{data.settings.exportScale=+e.target.value;persist();});
    $$('[data-cc-design]').forEach(b=>b.onclick=()=>set({designId:b.dataset.ccDesign==='none'?'none':b.dataset.ccDesign}));
    $('#ccShine').onchange=e=>set({shine:e.target.checked?null:false},true);
    $$('[data-cc-pattern]').forEach(b=>b.onclick=()=>set({pattern:b.dataset.ccPattern}));
    $$('[data-cc-color]').forEach(i=>i.oninput=()=>set({[i.dataset.ccColor]:i.value},true));
    $('#ccLabel').oninput=e=>set({label:e.target.value},true);
    $('#ccFont').onchange=e=>set({font:e.target.value},true);
    $('#ccStats').onchange=e=>set({stats:e.target.checked?null:false},true);
    $$('[data-cc-scope]').forEach(b=>b.onclick=()=>{cardUi.scope=b.dataset.ccScope;cardUi.selected='';redraw();});
    $$('[data-cc-pick]').forEach(b=>b.onclick=()=>{cardUi.selected=b.dataset.ccPick;redraw();scrollTo(0,0);});
    $$('[data-cc-shape]').forEach(b=>b.onclick=()=>set({shape:b.dataset.ccShape,shapeImg:null}));
    $('#ccShapeFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{let r=await importPicture(f,700,true);r=await cutoutDialog(r.src);if(!r)return;if(!r.clear)toast('That picture has no see-through area, so the card stays a full rectangle.');set({shapeImg:r.src,shape:null});}catch(err){toast(err.message);}};
    $('#ccFrameFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{let r=await importPicture(f,900,true);r=await cutoutDialog(r.src,{frame:true});if(!r)return;const sil=await frameSilhouette(r.src);set({frame:r.src,shapeImg:sil||null,shape:null,frameTop:r.extracted?true:null});if(!r.clear)toast('That picture has no see-through edges, so the card stays a rectangle.');}catch(err){toast(err.message);}};
    $('#ccFrameTop').onchange=e=>set({frameTop:e.target.checked?true:null},true);
    $('#ccBgFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const r=await importPicture(f,900,false);set({bg:r.src});}catch(err){toast(err.message);}};
    $$('[data-cc-apply]').forEach(b=>b.onclick=async()=>{const s=data.cardStyles.find(x=>x.id===b.dataset.ccApply);if(!s)return;data.editions[m.id]=JSON.parse(JSON.stringify(s.ed));persistSoon();redraw();toast(`Style "${s.name}" applied.`);});
    $$('[data-cc-del]').forEach(b=>b.onclick=async()=>{const s=data.cardStyles.find(x=>x.id===b.dataset.ccDel);if(!s||!confirm(`Delete the saved style "${s.name}"?`))return;const prev=data.cardStyles;data.cardStyles=prev.filter(x=>x.id!==s.id);Object.values(data.packs).forEach(pk=>{if(pk.cardStyle===s.id)pk.cardStyle='';});if(!await persist()){data.cardStyles=prev;return;}redraw();});
    paintCards();
  }
  async function saveCardStyle(){
    const m=cardMatch(),name=($('#ccStyleName').value||'').trim();if(!m)return;if(!name)return toast('Give the style a name first.');
    if(data.cardStyles.length>=24)return toast('You can keep up to 24 styles. Delete one first.');
    const ed=cardEd(m),{preset,pattern,shape,c1,c2,accent,ink,label,stats,font,bg,shapeImg,shine,frame,frameTop}=ed,saved={frame:frame||undefined,frameTop:frameTop||undefined,shine:shine?undefined:false,preset,pattern,shape:shape==='custom'?undefined:shape,c1,c2,accent,ink,label,font:font||undefined,bg:bg||undefined,shapeImg:shapeImg||undefined};if(!stats)saved.stats=false;
    const prev=data.cardStyles;data.cardStyles=[...prev,{id:uid(),name:name.slice(0,30),ed:JSON.parse(JSON.stringify(saved))}];
    if(!await persist()){data.cardStyles=prev;return;}toast(`Saved "${name}". Pick it when you make a formation poster.`);const y=scrollY;setPage('cards');scrollTo(0,y);
  }
  // ===== Card Studio: full-screen editor for card templates (drag items on the card, like Phonto) =====
  let studio=null;
  const stClone=d=>({...d,layers:d.layers.map(l=>({...l})),blend:{...d.blend},face:{...d.face},fade:{...d.fade}});
  const BLENDS={none:{amount:0,contrast:100,saturation:100,brightness:100},warm:{color:'#ff9a3c',amount:28,contrast:105,saturation:100,brightness:100},cool:{color:'#3c8cff',amount:28,contrast:105,saturation:100,brightness:100},mono:{amount:0,contrast:110,saturation:0,brightness:100}};
  async function avgColor(src,fb,strip){const im=await loadCardImage(src);if(!im)return fb;const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');if(strip)x.drawImage(im,0,im.height*.85,im.width,im.height*.15,0,0,16,16);else x.drawImage(im,0,0,16,16);const q=x.getImageData(0,0,16,16).data;let r=0,g=0,b=0;for(let i=0;i<q.length;i+=4){r+=q[i];g+=q[i+1];b+=q[i+2];}const n=q.length/4;return '#'+[r,g,b].map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');}
  async function stLoad(){const s=studio,p=playerById(s.pid),d=s.d;const [crest,bg,shape,frame,photo]=await Promise.all([loadCardImage('assets/brand/gfc-logo.png'),loadCardImage(d.bg),loadCardImage(d.shapeImg),loadCardImage(d.frame),loadCardImage(p?.photo)]);await ensureFonts();for(const f of new Set(d.layers.map(l=>l.font||'Winner GFC'))){try{await document.fonts.load(`700 24px "${f}"`);}catch{}}s.look={crest,bg,shape,frame,photo};stDraw();}
  function stDraw(){
    const s=studio;if(!s)return;const cv=$('#stCanvas'),ctx=cv.getContext('2d'),d=s.d,p=playerById(s.pid)||{name:'PLAYER',number:'10',position:'ST',rating:80,attrs:{}};
    ctx.clearRect(0,0,cv.width,cv.height);
    const ed={...GC.resolve('studio',{}),design:d,bg:d.bg,frame:d.frame,frameTop:d.frameTop,shapeImg:d.shapeImg,shape:d.shapeImg?'custom':d.shape},L=s.look;
    s.boxes=GC.drawDesign(ctx,0,0,cv.width,p,ed,{photo:L.photo,crest:L.crest,bgImage:L.bg,shapeImage:L.shape,frameImage:L.frame,attrKeys:G.attrKeys(p)});
    if(d.face.on){const W=cv.width,H=cv.height,fx=d.face.x*W,fy=d.face.y*H,r=d.face.s*W/2;s.boxes=[{id:'face',x:fx-r,y:fy-r,w:2*r,h:2*r},...s.boxes.filter(b=>b.id!=='photo')];
      ctx.save();ctx.strokeStyle='#3ee0ff';ctx.fillStyle='rgba(62,224,255,.12)';ctx.lineWidth=s.sel==='face'?4:2;ctx.setLineDash([12,8]);ctx.beginPath();ctx.arc(fx,fy,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(fx-10,fy);ctx.lineTo(fx+10,fy);ctx.moveTo(fx,fy-10);ctx.lineTo(fx,fy+10);ctx.stroke();ctx.restore();}
    const b=s.boxes.find(x=>x.id===s.sel);
    if(b){ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=4;ctx.strokeRect(b.x-4,b.y-4,b.w+8,b.h+8);ctx.restore();}
    if(s.guides){ctx.save();ctx.strokeStyle='#3ee0ff';ctx.lineWidth=2;ctx.beginPath();if(s.guides.x!=null){ctx.moveTo(s.guides.x*cv.width,0);ctx.lineTo(s.guides.x*cv.width,cv.height);}if(s.guides.y!=null){ctx.moveTo(0,s.guides.y*cv.height);ctx.lineTo(cv.width,s.guides.y*cv.height);}ctx.stroke();ctx.restore();}
  }
  const stPush=()=>{const s=studio;s.undo.push(stClone(s.d));if(s.undo.length>30)s.undo.shift();s.dirty=true;$('#stUndo').disabled=false;};
  const stPushSoon=()=>{const s=studio,t=Date.now();if(!s.last||t-s.last>800)stPush();s.last=t;};
  const stLayer=()=>studio.sel==='face'?studio.d.face:studio.d.layers.find(l=>l.id===studio.sel);
  function stChips(){
    const s=studio;$('#stChips').innerHTML=[['bg','Background'],['face','Face guide'],['fade','Gradient'],['filter','Filter'],...s.d.layers.map(l=>[l.id,l.label])].map(([id,l])=>`<button type="button" class="st-chip ${s.sel===id?'is-active':''} ${s.d.layers.find(x=>x.id===id)?.visible===false?'is-off':''}" data-st-sel="${safe(id)}">${safe(l)}</button>`).join('')+'<button type="button" class="st-chip" id="stAddText">＋ Text</button>';
    $$('[data-st-sel]',$('#studio')).forEach(b=>b.onclick=()=>{s.sel=b.dataset.stSel;stChips();stPanel();stDraw();});
    $('#stAddText').onclick=()=>{if(s.d.layers.length>=20)return toast('That is enough items for one card.');stPush();const l={id:uid().slice(0,8),type:'text',label:'Text',x:.5,y:.93,s:.06,color:'#ffffff',font:'',shadow:true,visible:true,text:'TEXT'};s.d.layers.push(l);s.sel=l.id;stChips();stPanel();stDraw();};
  }
  function stPanel(){
    const s=studio,d=s.d,P=$('#stPanel'),l=stLayer(),rng=(id,lab,v,lo,hi)=>`<label class="st-rng"><span>${lab} <b id="${id}V">${Math.round(v)}</b></span><input type="range" id="${id}" min="${lo}" max="${hi}" value="${v}"></label>`;
    if(s.sel==='bg'){
      P.innerHTML=`<div class="st-row"><label class="st-btn st-file">Background from gallery<input type="file" id="stBgFile" accept="image/*"></label>${d.bg?'<button type="button" class="st-btn" id="stBgClear">Remove</button>':''}<label class="st-btn st-file">Frame<input type="file" id="stFrameFile" accept="image/png,image/webp"></label>${d.frame?'<button type="button" class="st-btn" id="stFrameClear">Remove frame</button>':''}</div>
<div class="st-row"><label class="st-col">Top<input type="color" id="stC2" value="${d.color2}"></label><label class="st-col">Base<input type="color" id="stC1" value="${d.color1}"></label><label class="st-col">Shape<select id="stShape">${GC.SHAPES.filter(q=>q[0]!=='custom').map(([k,n])=>`<option value="${k}" ${!d.shapeImg&&d.shape===k?'selected':''}>${safe(n)}</option>`).join('')}${d.shapeImg?'<option selected>From frame</option>':''}</select></label>${d.frame?`<label class="st-chk"><input type="checkbox" id="stFrameTop" ${d.frameTop?'checked':''}> Frame over photo</label>`:''}</div>`;
      $('#stBgFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const r=await importPicture(f,1000,false);stPush();d.bg=r.src;await stLoad();stPanel();}catch(err){toast(err.message);}};
      $('#stBgClear')&&($('#stBgClear').onclick=async()=>{stPush();d.bg='';await stLoad();stPanel();});
      $('#stFrameFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{let r=await importPicture(f,900,true);r=await cutoutDialog(r.src,{frame:true});if(!r)return;const sil=await frameSilhouette(r.src);stPush();d.frame=r.src;d.shapeImg=sil||'';d.frameTop=!!r.extracted;await stLoad();stPanel();}catch(err){toast(err.message);}};
      $('#stFrameClear')&&($('#stFrameClear').onclick=async()=>{stPush();d.frame='';d.shapeImg='';d.frameTop=false;await stLoad();stPanel();});
      $('#stC1').oninput=e=>{stPushSoon();d.color1=e.target.value;stDraw();};$('#stC2').oninput=e=>{stPushSoon();d.color2=e.target.value;stDraw();};
      $('#stShape').onchange=async e=>{stPush();d.shape=e.target.value;d.shapeImg='';await stLoad();stPanel();};
      $('#stFrameTop')&&($('#stFrameTop').onchange=e=>{stPush();d.frameTop=e.target.checked;stDraw();});
    }else if(s.sel==='fade'){
      const f=d.fade;
      P.innerHTML=`<div class="st-row"><label class="st-chk"><input type="checkbox" id="stFo" ${f.on?'checked':''}> Gradient from the bottom</label><label class="st-col">Colour<input type="color" id="stFc" value="${f.color||d.color1}"></label><button type="button" class="st-btn" id="stFcard">Card colour</button>${d.bg?'<button type="button" class="st-btn" id="stFbg">Match background</button>':''}</div><div class="st-grid">${rng('stFa','Strength',f.amount,0,100)}${rng('stFh','Height',f.height,10,90)}</div><p class="st-hint">Fades the photo into the card so the name has a clear space.</p>`;
      $('#stFo').onchange=e=>{stPush();f.on=e.target.checked;stDraw();};
      $('#stFc').oninput=e=>{stPushSoon();f.color=e.target.value;stDraw();};
      $('#stFcard').onclick=()=>{stPush();f.color='';$('#stFc').value=d.color1;stDraw();};
      $('#stFbg')&&($('#stFbg').onclick=async()=>{stPush();f.color=await avgColor(d.bg,d.color1,true);$('#stFc').value=f.color;stDraw();});
      $('#stFa').oninput=e=>{stPushSoon();f.amount=+e.target.value;$('#stFaV').textContent=e.target.value;stDraw();};
      $('#stFh').oninput=e=>{stPushSoon();f.height=+e.target.value;$('#stFhV').textContent=e.target.value;stDraw();};
    }else if(s.sel==='filter'){
      const b=d.blend;
      P.innerHTML=`<div class="st-row">${[['none','None'],['match','Match card'],['warm','Warm'],['cool','Cool'],['mono','Mono']].map(([k,n])=>`<button type="button" class="st-chip ${b.preset===k?'is-active':''}" data-st-bp="${k}">${n}</button>`).join('')}<label class="st-col">Tint<input type="color" id="stBc" value="${b.color}"></label></div>
<div class="st-grid">${rng('stBa','Tint strength',b.amount,0,100)}${rng('stBk','Contrast',b.contrast,50,150)}${rng('stBs','Saturation',b.saturation,0,200)}${rng('stBb','Brightness',b.brightness,50,150)}</div><p class="st-hint">The same grade is applied to every player photo, so they all look alike.</p>`;
      const set=(patch)=>{stPushSoon();Object.assign(b,patch,{preset:'custom'});stDraw();};
      $$('[data-st-bp]',P).forEach(x=>x.onclick=async()=>{stPush();const k=x.dataset.stBp;Object.assign(b,k==='match'?{color:await avgColor(d.bg,d.color2),amount:35,contrast:105,saturation:95,brightness:100}:BLENDS[k],{preset:k});stDraw();stPanel();});
      const bind=(id,key)=>{$('#'+id).oninput=e=>{$('#'+id+'V').textContent=e.target.value;set({[key]:+e.target.value});};};bind('stBa','amount');bind('stBk','contrast');bind('stBs','saturation');bind('stBb','brightness');
      $('#stBc').oninput=e=>set({color:e.target.value,amount:b.amount||30});
    }else if(l){
      const isFace=s.sel==='face',isText=!isFace&&!['photo','logo'].includes(l.type),guided=!isFace&&l.type==='photo'&&d.face.on;
      P.innerHTML=`<div class="st-grid">${guided?'<p class="st-hint">The photo follows the face guide. Move or resize the guide circle instead.</p>':rng('stSize',isFace?'Circle size':'Size',l.s*100,isFace?10:3,isFace?90:l.type==='photo'?150:60)}${isText?`<label class="st-col">Colour<input type="color" id="stColor" value="${l.color||'#ffffff'}"></label>`:''}</div>
<div class="st-row">${isText?`<label class="st-col">Font<select id="stFont">${fontChoices().map(n=>`<option ${n===(l.font||'Winner GFC')?'selected':''}>${safe(n)}</option>`).join('')}</select></label><label class="st-chk"><input type="checkbox" id="stShadow" ${l.shadow?'checked':''}> Shadow</label>`:''}<label class="st-chk"><input type="checkbox" id="stShow" ${(isFace?l.on:l.visible!==false)?'checked':''}> ${isFace?'Fit photos to this circle':'Show'}</label>${isFace?'<button type="button" class="st-btn" id="stFaceSet">Set face for preview player</button>':''}${l.type==='text'?`<input class="st-text" id="stText" maxlength="24" value="${safe(l.text||'')}" aria-label="Text"><button type="button" class="st-btn" id="stDel">Delete</button>`:''}${l.type==='photo'?'<label class="st-btn st-file">Player photo from gallery<input type="file" id="stPhotoFile" accept="image/*"></label><button type="button" class="st-btn" id="stFaceSet2">Set face</button>':''}</div>
<div class="st-row st-nudge"><button type="button" class="st-btn" data-nx="-1" aria-label="Left">◀</button><button type="button" class="st-btn" data-ny="-1" aria-label="Up">▲</button><button type="button" class="st-btn" data-ny="1" aria-label="Down">▼</button><button type="button" class="st-btn" data-nx="1" aria-label="Right">▶</button><button type="button" class="st-btn" id="stCx">Centre ↔</button><button type="button" class="st-btn" id="stCy">Centre ↕</button></div>`;
      $('#stSize')&&($('#stSize').oninput=e=>{stPushSoon();l.s=e.target.value/100;$('#stSizeV').textContent=e.target.value;stDraw();});
      $('#stColor')&&($('#stColor').oninput=e=>{stPushSoon();l.color=e.target.value;stDraw();});
      $('#stFont')&&($('#stFont').onchange=async e=>{stPush();l.font=e.target.value==='Winner GFC'?'':e.target.value;await stLoad();});
      $('#stShadow')&&($('#stShadow').onchange=e=>{stPush();l.shadow=e.target.checked;stDraw();});
      $('#stShow').onchange=e=>{stPush();if(isFace)l.on=e.target.checked;else l.visible=e.target.checked;stChips();stPanel();stDraw();};
      $('#stFaceSet2')&&($('#stFaceSet2').onclick=()=>faceDialog(playerById(s.pid)).then(()=>stLoad()));
      $('#stFaceSet')&&($('#stFaceSet').onclick=()=>faceDialog(playerById(s.pid)).then(()=>stLoad()));
      $('#stText')&&($('#stText').oninput=e=>{stPushSoon();l.text=e.target.value;stDraw();});
      $('#stDel')&&($('#stDel').onclick=()=>{stPush();d.layers=d.layers.filter(x=>x!==l);s.sel='bg';stChips();stPanel();stDraw();});
      $$('[data-nx],[data-ny]',P).forEach(x=>x.onclick=()=>{stPushSoon();l.x=clamp(l.x+(+x.dataset.nx||0)*.005,0,1);l.y=clamp(l.y+(+x.dataset.ny||0)*.005,0,1);stDraw();});
      $('#stCx').onclick=()=>{stPush();l.x=.5;stDraw();};$('#stCy').onclick=()=>{stPush();l.y=.5;stDraw();};
      $('#stPhotoFile')&&($('#stPhotoFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';const p=playerById(s.pid);if(!f||!p)return;try{let r=await importPicture(f,1400,true);r=await cutoutDialog(r.src,{photo:true});if(!r)return;p.photo=r.src;persistSoon();await stLoad();toast(`Photo set for ${p.name}.`);}catch(err){toast(err.message);}});
    }else P.innerHTML='<p class="st-hint">Tap an item on the card, or pick one below.</p>';
  }
  function stBind(){
    const s=studio,cv=$('#stCanvas'),pts=new Map();let drag=null;
    const fr=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
    cv.onpointerdown=e=>{
      cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pts.size===2){const l=stLayer(),[a,b]=[...pts.values()];if(l){stPush();drag={mode:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,s0:l.s,l};}return;}
      const f=fr(e),px=f.x*cv.width,py=f.y*cv.height,inb=b=>px>=b.x-12&&px<=b.x+b.w+12&&py>=b.y-12&&py<=b.y+b.h+12;
      const hit=s.boxes.find(b=>b.id===s.sel&&inb(b))||[...s.boxes].reverse().find(inb);
      if(!hit){drag=null;return;}
      if(s.sel!==hit.id){s.sel=hit.id;stChips();stPanel();stDraw();}
      const l=stLayer();drag={mode:'move',l,sx:f.x,sy:f.y,x0:l.x,y0:l.y,pushed:false};
    };
    cv.onpointermove=e=>{
      if(!pts.has(e.pointerId)||!drag)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(drag.mode==='pinch'){if(pts.size<2)return;const [a,b]=[...pts.values()];drag.l.s=clamp(drag.s0*Math.hypot(a.x-b.x,a.y-b.y)/drag.d0,.02,1.5);stDraw();return;}
      if(pts.size!==1)return;const f=fr(e);if(!drag.pushed){stPush();drag.pushed=true;}
      let nx=clamp(drag.x0+f.x-drag.sx,0,1),ny=clamp(drag.y0+f.y-drag.sy,0,1);const others=s.d.layers.filter(o=>o!==drag.l&&o.visible!==false),snap=(v,t)=>t.find(q=>Math.abs(v-q)<.012);
      const tx=snap(nx,[.5,.08,.92,...others.map(o=>o.x)]),ty=snap(ny,[.5,.08,.92,...others.map(o=>o.y)]);s.guides={};if(tx!=null){nx=tx;s.guides.x=tx;}if(ty!=null){ny=ty;s.guides.y=ty;}
      drag.l.x=nx;drag.l.y=ny;stDraw();
    };
    const up=e=>{pts.delete(e.pointerId);if(pts.size===0)drag=null;else if(drag&&drag.mode==='pinch')drag=null;s.guides=null;stDraw();if(s.sel&&stLayer())stPanel();};
    cv.onpointerup=up;cv.onpointercancel=up;
  }
  async function openStudio(id){
    const m=cardMatch(),src=id?data.cardDesigns.find(x=>x.id===id):null;if(!m)return;
    if(!src&&data.cardDesigns.length>=12)return toast('You can keep up to 12 templates. Delete one first.');
    const d=src?stClone(src):{id:'',name:'My card',face:GC.faceDefaults(),fade:GC.fadeDefaults(),bg:'',frame:'',frameTop:false,shapeImg:'',shape:'shield',color1:'#2a060b',color2:'#ed1c24',blend:GC.blendDefaults(),layers:GC.defaultLayers()};
    const pls=data.squad;studio={d,id:src?.id||'',sel:'name',undo:[],pid:(cardPlayers(m).find(p=>p.photo)||cardPlayers(m)[0]||pls[0]||{}).id||'',look:{},boxes:[],guides:null,dirty:false,m};
    const el=document.createElement('div');el.id='studio';el.className='studio';el.setAttribute('role','dialog');el.setAttribute('aria-label','Card template studio');
    el.innerHTML=`<header class="st-top"><button type="button" class="st-btn" id="stClose" aria-label="Close">✕</button><input id="stName" class="st-name" maxlength="30" value="${safe(d.name)}" aria-label="Template name"><button type="button" class="st-btn" id="stUndo" disabled>Undo</button><button type="button" class="st-btn st-primary" id="stSave">Save</button></header>
<div class="st-stage"><canvas id="stCanvas" width="540" height="832" draggable="false"></canvas><select id="stWho" class="st-who" aria-label="Preview player">${pls.map(p=>`<option value="${safe(p.id)}" ${p.id===studio.pid?'selected':''}>${safe(p.name)}</option>`).join('')}</select></div>
<div class="st-dock"><div class="st-chips" id="stChips"></div><div class="st-panel" id="stPanel"></div></div>`;
    document.body.appendChild(el);document.documentElement.classList.add('studio-open');
    $('#stName').oninput=()=>{studio.dirty=true;};$('#stWho').onchange=async e=>{studio.pid=e.target.value;await stLoad();};
    $('#stUndo').onclick=async()=>{const u=studio.undo.pop();if(!u)return;studio.d=u;$('#stUndo').disabled=!studio.undo.length;if(!studio.d.layers.some(l=>l.id===studio.sel)&&!['bg','filter'].includes(studio.sel))studio.sel='bg';stChips();stPanel();await stLoad();};
    $('#stClose').onclick=stClose;$('#stSave').onclick=stSave;el.onkeydown=e=>{if(e.key==='Escape'&&!modal.open)stClose();};
    stBind();stChips();stPanel();await stLoad();
  }
  function stClose(force){if(!studio)return;if(!force&&studio.dirty&&!confirm('Close without saving your changes?'))return;$('#studio').remove();document.documentElement.classList.remove('studio-open');studio=null;}
  async function stSave(){
    const s=studio,d=stClone(s.d),m=s.m;d.name=($('#stName').value||'').trim().slice(0,30)||'My card';d.id=s.id||uid();
    const prev=data.cardDesigns,prevEd=data.editions[m.id];
    data.cardDesigns=s.id?prev.map(x=>x.id===d.id?d:x):[...prev,d];data.editions[m.id]={...(prevEd||{}),designId:d.id};
    if(!await persist()){data.cardDesigns=prev;if(prevEd)data.editions[m.id]=prevEd;else delete data.editions[m.id];return;}
    stClose(true);toast(`Saved "${d.name}" and applied it to this match. Pick it for any formation poster.`);setPage('cards');
  }
  // Lets you mark where a player's face is, so every template fits it into its face guide circle.
  function faceDialog(p,list=[]){
    return new Promise(async done=>{
      const im=p&&await loadCardImage(p.photo);if(!im){toast('Add a player photo first.');return done();}
      const f={...(p.face||{x:.5,y:.22,s:.34})};
      openSheet(`Face outline · ${safe(p.name)}`,`<p class="caption">Drag the circle onto the face and set its size. Every card template then lines up this player's face with its guide.</p><div class="fg-row"><div class="cut-stage"><canvas id="fgCanvas" style="touch-action:none;cursor:grab"></canvas></div>${data.cardDesigns.length?'<div class="fg-prev"><canvas id="fgPrev" width="200" height="308" aria-label="Card preview"></canvas><small>Live card</small></div>':''}</div><label class="field"><span class="field-label">Face size</span><input type="range" id="fgSize" min="10" max="80" value="${Math.round(f.s*100)}"></label><div class="cc-stage-actions"><button class="button button-quiet" type="button" id="fgReset">Reset</button><button class="button button-quiet" type="button" id="fgCancel">Cancel</button><button class="button button-primary" type="button" id="fgSave">Save face</button>${list.length>1?'<button class="button button-primary" type="button" id="fgNext">Save &amp; next player ›</button>':''}</div>`,'cut-sheet');
      const cv=$('#fgCanvas',modal),k=Math.min(1,600/im.width);cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);const ctx=cv.getContext('2d');
      let draw=()=>{ctx.fillStyle='#2a303a';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);const x=f.x*cv.width,y=f.y*cv.height,r=f.s*cv.width/2;ctx.save();ctx.strokeStyle='#3ee0ff';ctx.lineWidth=Math.max(2,cv.width/150);ctx.fillStyle='rgba(62,224,255,.14)';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x+8,y);ctx.moveTo(x,y-8);ctx.lineTo(x,y+8);ctx.stroke();ctx.restore();};draw=(d0=>()=>{d0();drawPrev();})(draw);
      const m0=(()=>{try{return cardMatch();}catch{return null;}})(),dz=(m0&&designOf(m0))||data.cardDesigns.find(x=>x.id===data.settings.defaultDesign)||data.cardDesigns[0];let L=null;
      if(dz){const [crest,bg,shape,frame]=await Promise.all([loadCardImage('assets/brand/gfc-logo.png'),loadCardImage(dz.bg),loadCardImage(dz.shapeImg),loadCardImage(dz.frame)]);await ensureFonts();L={crest,bg,shape,frame};}
      function drawPrev(){const pv=$('#fgPrev',modal);if(!pv||!L)return;const c=pv.getContext('2d');c.clearRect(0,0,pv.width,pv.height);GC.drawDesign(c,0,0,pv.width,{...p,face:{...f}},designEd(GC.resolve('studio',{}),dz),{photo:im,crest:L.crest,bgImage:L.bg,shapeImage:L.shape,frameImage:L.frame,attrKeys:G.attrKeys(p)});}
      draw();
      const at=e=>{const r=cv.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};};let drag=false;
      cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);drag=true;Object.assign(f,at(e));draw();};cv.onpointermove=e=>{if(drag){Object.assign(f,at(e));draw();}};cv.onpointerup=cv.onpointercancel=()=>{drag=false;};
      $('#fgSize',modal).oninput=e=>{f.s=e.target.value/100;draw();};
      $('#fgReset',modal).onclick=()=>{Object.assign(f,{x:.5,y:.22,s:.34});$('#fgSize',modal).value=34;draw();};
      let end=false;const finish=()=>{if(end)return;end=true;modal.oncancel=null;if(modal.open)modal.close();done();};
      $('#fgCancel',modal).onclick=finish;
      const save=async next=>{const prev=p.face;p.face={x:+f.x.toFixed(3),y:+f.y.toFixed(3),s:+f.s.toFixed(3)};if(!await persist()){if(prev)p.face=prev;else delete p.face;}else toast(`Face saved for ${p.name}.`);finish();if(next){const q=list[(list.indexOf(p)+1)%list.length];if(q&&q!==p)return faceDialog(q,list);}if(!studio)setPage(page);};
      $('#fgSave',modal).onclick=()=>save(false);$('#fgNext',modal)&&($('#fgNext',modal).onclick=()=>save(true));
      modal.oncancel=finish;modal.addEventListener('close',()=>{if(!modal.open)finish();},{once:true});
    });
  }
  function designAction(name){if(name.startsWith('face-')){const p=playerById(name.slice(5));return p&&faceDialog(p,data.squad.filter(q=>q.photo));}
    const m=cardMatch(),dz=m&&designOf(m);if(name==='studio-new')return openStudio('');if(!dz)return;
    if(name==='studio-edit')return openStudio(dz.id);
    if(name==='design-dup'){if(data.cardDesigns.length>=12)return toast('You can keep up to 12 templates. Delete one first.');const c={...stClone(dz),id:uid(),name:`${dz.name} copy`.slice(0,30)};data.cardDesigns=[...data.cardDesigns,c];data.editions[m.id]={...(data.editions[m.id]||{}),designId:c.id};persist();return setPage('cards');}
    if(name==='design-default'){data.settings.defaultDesign=dz.id;for(const e of Object.values(data.editions))delete e.designId;persist();toast(`"${dz.name}" is now used for every match.`);return setPage('cards');}
    if(name==='design-del'){if(!confirm(`Delete the template "${dz.name}"? Matches and posters using it go back to their normal card look.`))return;
      const snap=JSON.stringify([data.cardDesigns,data.editions,data.packs,data.settings.defaultDesign]);const id=dz.id;
      data.cardDesigns=data.cardDesigns.filter(x=>x.id!==id);for(const e of Object.values(data.editions))if(e.designId===id)delete e.designId;for(const pk of Object.values(data.packs))if(pk.cardStyle===`design:${id}`)pk.cardStyle='';if(data.settings.defaultDesign===id)data.settings.defaultDesign='';
      return persist().then(ok=>{if(!ok){const [a,b,c,e]=JSON.parse(snap);data.cardDesigns=a;data.editions=b;data.packs=c;data.settings.defaultDesign=e;}setPage('cards');});}
  }
  const xTag=(w,h)=>{const k=exportScaleFor(w,h);return k>1.001?`@${+k.toFixed(2)}x`:'';};
  const exportScaleFor=(w,h)=>{const want=data.settings.exportScale||1;return Math.min(want,Math.sqrt(MAX_PX/(w*h)));};
  async function cardBlob(m,list,sheet){
    const ed=cardEd(m),look=await cardAssets(ed),crest=look.crest,c=document.createElement('canvas'),ctx=c.getContext('2d');
    const items=await Promise.all(list.map(async p=>({player:p,opts:cardOpts(m,p,look,await loadCardImage(p.photo))})));
    if(sheet){const s=GC.sheetSize(items.length),k=exportScaleFor(s.w,s.h);c.width=Math.round(s.w*k);c.height=Math.round(s.h*k);ctx.setTransform(c.width/s.w,0,0,c.height/s.h,0,0);ctx.imageSmoothingQuality='high';GC.drawSheet(ctx,s.w,s.h,{title:`GFC VS ${m.opponent||'TBC'}`,sub:[m.competition||'Friendly',m.date?fmtDate(m.date):''].filter(Boolean).join('  ·  ')},items,ed,{crest});}
    else{const W0=724,H0=Math.round(724*GC.RATIO)+8,k=exportScaleFor(W0,H0);c.width=Math.round(W0*k);c.height=Math.round(H0*k);ctx.setTransform(c.width/W0,0,0,c.height/H0,0,0);ctx.imageSmoothingQuality='high';GC.drawCard(ctx,4,4,716,items[0].player,ed,items[0].opts);}
    return new Promise(r=>c.toBlob(r,'image/png'));
  }
  async function exportCards(mode){
    const m=cardMatch();if(!m)return;const slug=(m.opponent||'match').replace(/[^\w]+/g,'-'),pls=cardPlayers(m),one=playerById(cardUi.selected);
    if(mode==='one'&&!one)return toast('Pick a card first.');if(mode!=='one'&&!pls.length)return toast('No players in this selection yet.');
    toast('Exporting…');
    if(mode==='one')download(await cardBlob(m,[one],false),`GFC-${slug}-${one.name}${xTag(724,Math.round(724*GC.RATIO)+8)}.png`);
    else if(mode==='sheet'){const sz=GC.sheetSize(pls.length);download(await cardBlob(m,pls,true),`GFC-${slug}-cards${xTag(sz.w,sz.h)}.png`);}
    else for(const p of pls){download(await cardBlob(m,[p],false),`GFC-${slug}-${p.name}${xTag(724,Math.round(724*GC.RATIO)+8)}.png`);await new Promise(r=>setTimeout(r,450));}
    data.progress.exports+=1;persist();toast('Exported.');
  }
  // ===== Game layer (screens). The maths lives in game.js; everything shown is counted from recorded data. =====
  const G=window.GFC_GAME;
  const PITCH_THEMES={'pitch-classic':'Classic','pitch-night':'Night match','pitch-crimson':'Crimson'};
  const nr='<span class="nr">Not recorded</span>';
  const playerById=id=>data.squad.find(p=>p.id===id);
  const clubOvr=()=>{const r=data.squad.filter(p=>p.rating!=null).map(p=>p.rating).sort((a,b)=>b-a).slice(0,11);return r.length?Math.round(r.reduce((n,x)=>n+x,0)/r.length):null;}; // average of the best 11 rated players
  const captainIds=()=>Object.values(data.lineups).flatMap(s=>['A','B'].map(k=>s[k]?.captain)).filter(Boolean);
  const bar=(pct,cls='')=>`<span class="xp-bar ${cls}"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></span>`;
  const resultBadge=m=>{const r=G.resultOf(m);return r?`<span class="res-badge res-${r}">${r==='W'?'WIN':r==='D'?'DRAW':'LOSS'}</span>`:'';};
  const opponentMark=m=>`<span class="opp-mark" aria-hidden="true">${safe((m.opponent||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase())}</span>`;
  function renderChip(){const c=$('#xpChip');if(!c||!data)return;const l=G.clubLevel(data);c.innerHTML=`<b>LV ${l.level}</b>${bar(l.pct)}<small>${l.into}/${l.need} XP</small>`;}
  // Unlocks any achievement whose condition is now true. Returns the new ones; `silent` leaves the announcement to the caller.
  function checkProgress({silent=false}={}){
    const fresh=G.ACHIEVEMENTS.filter(a=>!data.progress.unlocked[a.id]&&a.test(data));
    fresh.forEach(a=>{data.progress.unlocked[a.id]=today();});
    if(fresh.length){persistSoon();if(!silent)announce(fresh);}
    renderChip();return fresh;
  }
  function announce(list){
    const pop=document.createElement('div');pop.className='unlock-pop';pop.setAttribute('role','status');
    pop.innerHTML=list.map(a=>`<div class="unlock-item"><span class="unlock-badge">${a.icon}</span><span><small>ACHIEVEMENT UNLOCKED</small><b>${safe(a.name)}</b><em>+${a.xp} club XP</em></span></div>`).join('');
    document.body.append(pop);setTimeout(()=>pop.remove(),4200);
  }
  function streak(){const days=new Set(data.progress.days);let n=0;const d=new Date(today()+'T00:00:00');if(!days.has(today()))d.setDate(d.getDate()-1);for(;;n++){const k=d.toISOString().slice(0,10);if(!days.has(k))break;d.setDate(d.getDate()-1);}return n;}
  const openSheet=(title,html,cls='')=>{modal.oncancel=null;modal.className='dialog '+cls;modal.innerHTML=`<div class="dialog-header"><div><p class="eyebrow">GFC</p><h2 id="modalTitle">${title}</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div><div class="sheet-body">${html}</div>`;modal.showModal();lockPage();$$('[data-close]',modal).forEach(b=>b.onclick=()=>modal.close());$$('[data-action]',modal).forEach(b=>b.onclick=()=>{modal.close();action(b.dataset.action);});};

  // ---- Player dialog: bio, rating, attributes. Saving a changed rating or attribute adds a development snapshot. ----
  function playerDialog(p={}){
    const attrInputs=(keys,set)=>keys.map(k=>`<label class="field attr-field" data-attr-set="${set}"><span class="field-label">${k.toUpperCase()}</span><input class="input" name="attr-${k}" type="number" min="1" max="99" inputmode="numeric" value="${p.attrs?.[k]??''}"></label>`).join('');
    openModal(p.id?'Edit player':'Add player',`${field('Name','name',p.name||'')}${field('Shirt number','number',p.number||'')}<label class="field"><span class="field-label">Position</span><select class="select" name="position" id="pdPos">${['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(x=>`<option ${x===(p.position||'ST')?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span class="field-label">Preferred foot</span><select class="select" name="foot"><option value="">Not recorded</option><option value="R" ${p.foot==='R'?'selected':''}>Right</option><option value="L" ${p.foot==='L'?'selected':''}>Left</option></select></label>${field('Overall rating (optional)','rating',p.rating??'','number','min="1" max="99"')}${field('Joined the club','joined',p.joined||(p.id?'':today()),'date')}${field('Portrait path (optional)','photo',p.photo||'')}<div class="field-span-2 attr-grid"><p class="field-label">Attributes (optional, 1 to 99). Leave blank if you have not rated them.</p><div class="attr-row">${attrInputs(G.OUTFIELD_ATTRS,'out')}${attrInputs(G.GK_ATTRS,'gk')}</div></div>`);
    const sync=()=>{const gk=$('#pdPos').value==='GK';$$('[data-attr-set]',modal).forEach(x=>{x.hidden=(x.dataset.attrSet==='gk')!==gk;});};$('#pdPos').onchange=sync;sync();
    $('.dialog-form',modal).onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),position=f.get('position'),attrs={};
      for(const k of G.attrKeys({position})){const v=f.get('attr-'+k);if(v!==''&&v!=null&&Number(v)>=1)attrs[k]=Math.min(99,Math.max(1,Math.round(Number(v))));}
      const rating=f.get('rating')===''?null:Math.min(99,Math.max(1,Math.round(Number(f.get('rating')))));
      const history=[...(p.history||[])],last=history[history.length-1];
      if((rating!=null||Object.keys(attrs).length)&&(!last||last.ovr!==rating||JSON.stringify(last.attrs||{})!==JSON.stringify(attrs)))history.push({date:today(),ovr:rating,attrs});
      const obj={...p,id:p.id||uid(),name:f.get('name').trim().toUpperCase(),number:f.get('number'),position,foot:f.get('foot'),rating,attrs,history:history.slice(-60),joined:f.get('joined')||'',photo:f.get('photo')||p.photo||'assets/brand/gfc-logo.png'};
      if(!obj.templateId)obj.templateId=data.activeCardTemplateId||'gfc-classic';
      data.squad=data.squad.filter(x=>x.id!==obj.id).concat(obj);persist();modal.close();setPage(page);toast('Player saved.');
    };
  }

  // ---- Training log ----
  function trainingDialog(){
    openModal('Log training',`${field('Date','date',today(),'date')}${field('Note (optional)','note','')}<div class="field-span-2"><p class="field-label">Who attended?</p><div class="rr-list">${[...data.squad].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<label class="rr-row rr-simple"><input type="checkbox" name="att" value="${safe(p.id)}"><span><b>${safe(p.name)}</b><small>#${safe(p.number)} · ${safe(p.position)}</small></span></label>`).join('')}</div></div>`,'Save training');
    $('.dialog-form',modal).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);data.training.push({id:uid(),date:f.get('date')||today(),note:f.get('note').trim(),attended:f.getAll('att')});persist();modal.close();setPage(page);toast('Training logged.');};
  }

  // ---- Record a result: score plus optional per-player stats. Nothing here is guessed. ----
  function resultDialog(id){
    const m=data.matches.find(x=>x.id===id);if(!m)return;
    const st=m.stats||{played:[],goals:{},assists:{},potm:''},suggested=!m.stats?Object.values(peek(m.id,'A')?.slots||{}):[];
    const rows=[...data.squad].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<div class="rr-row"><label class="rr-played"><input type="checkbox" name="played" value="${safe(p.id)}" ${(st.played.includes(p.id)||suggested.includes(p.id))?'checked':''}><span><b>${safe(p.name)}</b><small>#${safe(p.number)} · ${safe(p.position)}</small></span></label><label class="rr-n">G<input type="number" min="0" max="30" inputmode="numeric" name="g-${safe(p.id)}" value="${st.goals[p.id]||''}"></label><label class="rr-n">A<input type="number" min="0" max="30" inputmode="numeric" name="a-${safe(p.id)}" value="${st.assists[p.id]||''}"></label><label class="rr-potm"><input type="radio" name="potm" value="${safe(p.id)}" ${st.potm===p.id?'checked':''}><span>POTM</span></label></div>`).join('');
    openModal(`Result · GFC vs ${safe(m.opponent||'opponent')}`,`${field('GFC score','home',m.home??'','number','min="0" required inputmode="numeric"')}${field('Opponent score','away',m.away??'','number','min="0" required inputmode="numeric"')}<div class="field-span-2"><p class="field-label">Who played? ${suggested.length?'Pre-selected from your Team A line-up, so untick anyone who did not play. ':''}Goals (G), assists (A) and player of the match are optional. Leave them blank if you did not record them.</p><div class="rr-list">${rows}</div></div>`,'Save result');
    $('.dialog-form',modal).onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),played=f.getAll('played'),goals={},assists={};
      for(const pid of played){const g=Math.floor(Number(f.get('g-'+pid)))||0,a=Math.floor(Number(f.get('a-'+pid)))||0;if(g>0)goals[pid]=g;if(a>0)assists[pid]=a;}
      const home=Number(f.get('home')),away=Number(f.get('away')),sum=Object.values(goals).reduce((n,x)=>n+x,0);
      if(sum>home)return toast(`You entered ${sum} goals for players but the GFC score is ${home}.`);
      const potm=f.get('potm')&&played.includes(f.get('potm'))?f.get('potm'):'';
      const previous={home:m.home,away:m.away,stats:m.stats};m.home=home;m.away=away;
      if(played.length)m.stats={played,goals,assists,potm};else delete m.stats;
      const before=Object.keys(data.progress.unlocked).length,fresh=checkProgress({silent:true});
      if(!await persist()){m.home=previous.home;m.away=previous.away;if(previous.stats)m.stats=previous.stats;else delete m.stats;fresh.forEach(a=>delete data.progress.unlocked[a.id]);return;}
      modal.close();setPage(page);resultScreen(m,fresh);
    };
  }
  function resultScreen(m,fresh){
    const r=G.resultOf(m),xp=G.matchXp(data,m),win=r==='W';
    const perf=xp.per.filter(x=>x.g||x.a||x.cs||x.pm);
    const learn=r==='L'?`<section class="rs-learn"><h3>Learn from the match</h3><ul><li>${m.away>0?`GFC conceded ${m.away}. Review the back line in Tactics before the next match.`:''}</li>${xp.per.length?`<li>${xp.per.length} players earned XP in this match.</li>`:''}<li>Every match adds club XP, so the squad keeps growing.</li></ul></section>`:'';
    const confetti=win&&!matchMedia('(prefers-reduced-motion: reduce)').matches?`<div class="confetti" aria-hidden="true">${Array.from({length:26},(_,i)=>`<i style="left:${(i*37)%100}%;animation-delay:${(i%9)*.12}s;background:${['#ed1c24','#f3c969','#fff7f5'][i%3]}"></i>`).join('')}</div>`:'';
    openSheet('Full time',`${confetti}<div class="rs-score ${win?'is-win':''}"><div><small>GAMUDA FC</small><b>${m.home}</b></div><span>${r==='W'?'WIN':r==='D'?'DRAW':'LOSS'}</span><div><small>${safe((m.opponent||'OPPONENT').toUpperCase())}</small><b>${m.away}</b></div></div><div class="rs-xp"><div><small>MATCH XP</small><b>+${xp.total}</b></div><div><small>CLUB XP</small><b>+${xp.club}</b></div></div>${xp.per.length?`<section><h3>Player XP</h3><ul class="rs-list">${xp.per.slice(0,8).map(x=>`<li><span>${safe(x.p.name)}${x.g?` · ⚽ ${x.g}`:''}${x.a?` · 🅰️ ${x.a}`:''}${x.cs?' · 🧤':''}${x.pm?' · ⭐':''}</span><b>+${x.xp}</b></li>`).join('')}</ul></section>`:'<p class="caption">No player stats were recorded for this match, so only club XP was added.</p>'}${fresh.length?`<section><h3>Achievements</h3><div class="rs-ach">${fresh.map(a=>`<span class="rs-badge">${a.icon} ${safe(a.name)}</span>`).join('')}</div></section>`:''}${learn}<div class="dialog-actions"><button class="button button-quiet" type="button" data-close>Close</button>${btn('Make the result poster','poster-for-'+m.id,'button button-primary')}</div>`,'is-result');
    if(fresh.length)announce(fresh);
  }

  // ---- Player profile (bottom sheet on phones) ----
  function playerProfile(id){
    const p=playerById(id);if(!p)return;
    const s=G.playerStats(data,p),lv=G.playerLevel(data,p),dev=G.development(p),states=G.cardStates(data,p,captainIds());
    const keys=G.attrKeys(p),attr=keys.map(k=>`<div class="attr"><span>${k.toUpperCase()}</span>${bar(p.attrs?.[k]??0,'attr-bar')}<b>${p.attrs?.[k]??'–'}</b></div>`).join('');
    const games=data.matches.filter(m=>m.stats?.played.includes(p.id)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
    const mine=[s.goals>0&&['⚽','Scorer'],s.assists>0&&['🅰️','Creator'],s.potm>0&&['⭐','Match winner'],s.cleanSheets>0&&['🧤','Clean sheet'],lv.level>=5&&['🚀','Level 5'],dev.delta>=5&&['📈','Rising star']].filter(Boolean);
    const stat=(label,v)=>`<div class="pstat"><small>${label}</small><b>${v==null?nr:v}</b></div>`;
    const isGK=p.position==='GK';
    openSheet(safe(p.name),`<div class="pp-head"><div class="pp-card"><img src="${safe(p.card||p.photo||BLANK_IMG)}" data-template-player="${safe(p.id)}" alt="${safe(p.name)} card"></div><div class="pp-info"><div class="pp-ovr"><b>${p.rating??'–'}</b><small>${p.rating==null?'NOT RATED':'OVR'}</small></div><div class="pp-bio"><span>#${safe(p.number)} · ${safe(p.position)}</span><span>Foot: ${p.foot==='R'?'Right':p.foot==='L'?'Left':nr}</span><span>Joined: ${p.joined?fmtDate(p.joined):nr}</span>${states.length?`<span class="pp-states">${states.map(x=>`<i class="state state-${x}">${({captain:'Captain','in-form':'In form',potm:'Player of the Match',improved:'Improved'})[x]}</i>`).join('')}</span>`:''}</div></div></div>
<section class="pp-block"><h3>Progression</h3><div class="pp-lv"><b>LEVEL ${lv.level}</b><small>${lv.into.toLocaleString()} / ${lv.need.toLocaleString()} XP</small></div>${bar(lv.pct,'xp-big')}<p class="caption">Trend: ${dev.trend==='up'?'▲ rising':dev.trend==='down'?'▼ lower':dev.trend==='steady'?'● steady':'Not enough rating history yet'}${dev.from!=null&&dev.delta?` · OVR ${dev.from} → ${dev.to}`:''}</p></section>
<section class="pp-block"><h3>Attributes</h3>${Object.keys(p.attrs||{}).length?`<div class="attr-list">${attr}</div>`:`<p class="caption">${nr}. Add them with Edit.</p>`}</section>
<section class="pp-block"><h3>Performance</h3><div class="pstats">${stat('Matches',s.apps)}${stat('Goals',s.goals)}${stat('Assists',s.assists)}${isGK||G.isDefensive(p)?stat('Clean sheets',s.cleanSheets):''}${stat('Player of the match',s.potm)}${stat('Training',s.trainings)}</div></section>
<section class="pp-block"><h3>Achievements</h3>${mine.length?`<div class="rs-ach">${mine.map(([i,n])=>`<span class="rs-badge">${i} ${n}</span>`).join('')}</div>`:'<p class="caption">None yet. They appear as stats are recorded.</p>'}</section>
<section class="pp-block"><h3>Match history</h3>${games.length?`<ul class="rs-list">${games.map(m=>`<li><span>${fmtDate(m.date)} · vs ${safe(m.opponent)}${m.stats.goals[p.id]?` · ⚽ ${m.stats.goals[p.id]}`:''}${m.stats.assists[p.id]?` · 🅰️ ${m.stats.assists[p.id]}`:''}</span><b>${m.home}–${m.away}</b></li>`).join('')}</ul>`:`<p class="caption">${nr}.</p>`}</section>
<div class="dialog-actions"><button class="button button-quiet" type="button" data-close>Close</button><button class="button button-secondary" type="button" id="ppEdit">Edit player</button></div>`,'is-profile');
    $('#ppEdit',modal).onclick=()=>{modal.close();playerDialog(p);};
    const img=$('.pp-card img',modal);const t=data.cardTemplates.find(x=>x.id===p.templateId);if(t)cardUrl(p,t).then(u=>{img.src=u;}).catch(()=>{});
  }
  // ===== Screens =====
  const anUi={season:'all',tab:'stats'};
  const MONTH=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  // Everything that happened, newest first. Only recorded things appear: results, joiners, training, unlocks, rating milestones.
  function timeline(){
    const ev=[];
    for(const m of data.matches)if(G.hasResult(m))ev.push({date:m.date,icon:G.resultOf(m)==='W'?'🏆':'⚽',text:`${G.resultOf(m)==='W'?'Win':G.resultOf(m)==='D'?'Draw':'Result'}: GFC ${m.home}–${m.away} ${m.opponent||'opponent'}`,kind:'match'});
    const first=[...data.matches].filter(G.hasResult).sort((a,b)=>a.date.localeCompare(b.date));
    if(first[0])ev.push({date:first[0].date,icon:'🎬',text:'First recorded match',kind:'milestone'});
    const win=first.find(m=>G.resultOf(m)==='W');if(win)ev.push({date:win.date,icon:'🥇',text:'First recorded victory',kind:'milestone'});
    for(const p of data.squad){if(p.joined)ev.push({date:p.joined,icon:'🧢',text:`${p.name} joined the club`,kind:'squad'});const h=(p.history||[]).find(x=>x.ovr>=75);if(h)ev.push({date:h.date,icon:'📈',text:`${p.name} reached OVR 75`,kind:'dev'});}
    for(const t of data.training)ev.push({date:t.date,icon:'🏃',text:`Training${t.attended.length?` · ${t.attended.length} attended`:''}${t.note?` · ${t.note}`:''}`,kind:'training'});
    for(const [id,date] of Object.entries(data.progress.unlocked)){const a=G.ACHIEVEMENTS.find(x=>x.id===id);if(a)ev.push({date,icon:a.icon,text:`Achievement unlocked: ${a.name}`,kind:'ach'});}
    return ev.sort((a,b)=>b.date.localeCompare(a.date));
  }
  const objRow=o=>`<div class="obj ${o.done?'is-done':''} ${o.claimed?'is-claimed':''}"><div class="obj-main"><strong>${safe(o.title)}</strong><small>${o.value} / ${o.target} · +${o.xp} club XP</small>${bar(o.target?o.value*100/o.target:0)}</div>${o.claimed?'<span class="obj-state">Claimed ✓</span>':o.done?btn('Claim','claim-'+o.key,'button button-primary button-small'):`<span class="obj-state">${Math.round(o.target?o.value*100/o.target:0)}%</span>`}</div>`;
  const miniCard=(label,p,value)=>`<div class="snap"><small>${label}</small>${p?`<button class="snap-card" type="button" data-action="profile-${safe(p.id)}"><img src="${safe(p.card||p.photo||BLANK_IMG)}" data-template-player="${safe(p.id)}" alt="" draggable="false"><span><b>${safe(p.name)}</b><em>${value}</em></span></button>`:`<div class="snap-empty">${nr}</div>`}</div>`;

  function homeView(){
    const lv=G.clubLevel(data),ovr=clubOvr(),n=upcoming(),season=today().slice(0,4);
    const last=[...data.matches].filter(G.hasResult).sort((a,b)=>b.date.localeCompare(a.date))[0],an=G.analytics(data,'all');
    const days=n?Math.round((new Date(n.date+'T00:00:00')-new Date(today()+'T00:00:00'))/864e5):null;
    const frame=G.unlockedRewards(lv.level).filter(r=>r.type==='badge').pop(),nextReward=G.REWARDS.find(r=>r.level>lv.level);
    const best=[...data.squad].filter(p=>p.rating!=null).sort((a,b)=>b.rating-a.rating)[0],improved=an.developed.find(x=>x.dev.delta>0);
    const month=today().slice(0,7),potmCount={};data.matches.filter(m=>m.stats?.potm&&m.date.startsWith(month)).forEach(m=>{potmCount[m.stats.potm]=(potmCount[m.stats.potm]||0)+1;});
    const potmId=Object.keys(potmCount).sort((a,b)=>potmCount[b]-potmCount[a])[0];
    const seasonMatches=data.matches.filter(m=>m.date.startsWith(season)),seasonDone=seasonMatches.filter(G.hasResult).length;
    const key=last?.stats?data.squad.map(p=>({p,g:last.stats.goals[p.id]||0,a:last.stats.assists[p.id]||0,pm:last.stats.potm===p.id})).filter(x=>x.g||x.a||x.pm):null;
    const objs=G.objectives(data).filter(o=>!o.claimed).sort((a,b)=>(b.done-a.done)||((b.value/b.target)-(a.value/a.target))).slice(0,4);
    const act=timeline().slice(0,6);
    const loop=['Player data','Card','Squad','Tactics','Matchday','Result','XP','Development','Club'];
    return `<section class="club-head"><div class="club-badge ${frame?'frame-'+frame.id:''}"><img src="./assets/brand/gfc-logo.png" alt=""></div><div class="club-head-main"><p class="eyebrow">SEASON ${season}</p><h2>Gamuda Football Club</h2><div class="club-facts"><span><b>${data.squad.length}</b> players</span><span><b>${ovr??'–'}</b> club OVR${ovr==null?' · not rated':''}</span><span>🔥 <b>${streak()}</b> day streak</span></div></div><div class="club-level"><div class="hub-lv"><b>${lv.level}</b><span>CLUB LEVEL</span></div>${bar(lv.pct,'xp-big')}<small>${lv.into} / ${lv.need} XP</small></div></section>
<section class="hub-hero"><div class="hub-next"><p class="eyebrow">NEXT MATCH</p>${n?`<h2>GFC <i>VS</i> ${safe((n.opponent||'TBC').toUpperCase())}</h2><p class="hub-when">${safe(n.competition||'Friendly')} · ${fmtDate(n.date)}${n.time?' · '+safe(n.time):''}${n.venue?' · '+safe(n.venue):''}</p><div class="hub-count"><b>${days<=0?'TODAY':days}</b><small>${days<=0?'MATCHDAY':days===1?'DAY TO GO':'DAYS TO GO'}</small></div><div class="hero-actions">${btn('Prepare match','prepare-'+n.id)}${btn('Set line-up','goto-formation','button button-secondary')}</div>`:`<h2>NO MATCH YET</h2><p class="hub-when">Add a fixture to prepare your line-up and posters.</p><div class="hero-actions">${btn('Add a match','quick-match')}</div>`}</div>
<div class="hub-last panel"><p class="eyebrow">LATEST RESULT</p>${last?`<div class="last-score">${resultBadge(last)}<b>${last.home} – ${last.away}</b><span>vs ${safe(last.opponent||'opponent')}</span></div><p class="caption">${fmtDate(last.date)}</p>${key===null?`<p class="caption">Player stats: ${nr}</p>`:key.length?`<ul class="rs-list">${key.map(x=>`<li><span>${safe(x.p.name)}${x.g?` · ⚽ ${x.g}`:''}${x.a?` · 🅰️ ${x.a}`:''}${x.pm?' · ⭐ POTM':''}</span></li>`).join('')}</ul>`:'<p class="caption">No goals, assists or POTM were recorded.</p>'}${btn('Match report','result-'+last.id,'button button-quiet button-small')}`:`<p class="caption">No result recorded yet.</p>${n?btn('Record a result','result-'+n.id,'button button-quiet button-small'):''}`}</div></section>
<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">SQUAD SNAPSHOT</p><h3>Your players right now</h3></div></div><div class="snaps">${miniCard('Best rated',best,best?`OVR ${best.rating}`:'')}${miniCard('Most improved',improved?.p,improved?`+${improved.dev.delta} OVR`:'')}${miniCard('Top scorer',an.scorers[0]?.p,an.scorers[0]?`${an.scorers[0].s.goals} goals`:'')}${miniCard('Top assister',an.assisters[0]?.p,an.assisters[0]?`${an.assisters[0].s.assists} assists`:'')}${miniCard('Player of the month',playerById(potmId),potmId?`${potmCount[potmId]}× POTM`:'')}</div></section>
<section class="hub-cols"><div class="hub-block"><div class="section-heading"><div><p class="eyebrow">CLUB PROGRESS</p><h3>Level ${lv.level}</h3></div><button class="button button-quiet button-small" data-nav="game" type="button">Game Center</button></div>${bar(lv.pct,'xp-big')}<p class="caption">${lv.need-lv.into} XP to level ${lv.level+1}.${nextReward?` Next reward at level ${nextReward.level}: <b>${safe(nextReward.label)}</b>.`:''}</p><p class="caption">Season ${season}: ${seasonDone} of ${seasonMatches.length||0} fixtures played.</p></div>
<div class="hub-block"><div class="section-heading"><div><p class="eyebrow">ACTIVE OBJECTIVES</p><h3>What to do next</h3></div></div>${objs.map(objRow).join('')}</div></section>
<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">RECENT ACTIVITY</p><h3>Club timeline</h3></div><button class="button button-quiet button-small" data-nav="history" type="button">Full history</button></div>${act.length?`<ul class="feed">${act.map(a=>`<li><span>${a.icon}</span><div><b>${safe(a.text)}</b><small>${fmtDate(a.date)}</small></div></li>`).join('')}</ul>`:'<p class="caption">Nothing recorded yet. Add players, matches or a training session and they appear here.</p>'}</section>
<section class="hub-block loop"><p class="eyebrow">THE CLUB LOOP</p><ol>${loop.map(x=>`<li>${x}</li>`).join('')}</ol></section>
<section class="hub-block hub-data"><div><p class="eyebrow">QUICK ACTIONS</p></div><div class="hero-actions">${btn('＋ Player','add-player','button button-secondary')}${btn('＋ Training','log-training','button button-secondary')}${btn('＋ Match','quick-match','button button-secondary')}${btn('Export backup','export-backup','button button-quiet')}${btn('Restore backup','import-backup','button button-quiet')}</div></section>`;
  }

  const matchCard=m=>`<article class="match-row ${G.hasResult(m)?'is-complete':''}"><div class="match-row-main">${opponentMark(m)}<div><span class="meta-label">${fmtDate(m.date)}${m.time?` · ${safe(m.time)}`:''}</span><h3>${safe(m.opponent||'Opponent to be confirmed')}</h3><span>${safe(m.competition||'Friendly')}${m.venue?` · ${safe(m.venue)}`:''}</span></div></div><div class="match-row-score">${G.hasResult(m)?`${resultBadge(m)}<b>${m.home} — ${m.away}</b>`:'VS'}</div><div class="table-actions">${G.hasResult(m)?'':btn('Prepare','prepare-'+m.id,'button button-primary button-small')}${btn(G.hasResult(m)?'Report':'Result','result-'+m.id,'button button-secondary button-small')}${btn('Cards','cards-'+m.id,'button button-quiet button-small')}${btn('Poster','poster-for-'+m.id,'button button-quiet button-small')}${btn('Edit','edit-match-'+m.id,'button button-quiet button-small')}${btn('Remove','delete-match-'+m.id,'button button-quiet button-small')}</div></article>`;
  function matchdayView(){
    const sorted=[...data.matches].sort((a,b)=>b.date.localeCompare(a.date));
    return `${heading('Matchday','Prepare the line-up, make the posters, then record the result to earn XP.',btn('＋ New match','quick-match'))}${sorted.length?`<div class="match-list">${sorted.map(matchCard).join('')}</div>`:empty('No matches yet','Add your first fixture to start your season.','quick-match','Add a match')}`;
  }
  function prepareSheet(id){
    const m=data.matches.find(x=>x.id===id);if(!m)return;
    const A=peek(m.id,'A'),xi=A?Object.entries(A.slots):[],layers=A?formationLayers(A.shape):[],taken=new Set([...Object.values(A?.slots||{}),...Object.values(peek(m.id,'B')?.slots||{})]);
    const rows=xi.map(([k,pid])=>{const [li,i]=k.split('-').map(Number),p=playerById(pid),f=G.fit(layers[li]?.[i],p?.position);return p?`<li><span class="fit fit-${f||'none'}"></span><span>${safe(p.name)}</span><small>${safe(p.position)} · #${safe(p.number)}${A.captain===p.id?' · C':''}</small></li>`:'';}).join('');
    openSheet('Matchday',`<div class="md-vs"><div><img src="./assets/brand/gfc-logo.png" alt=""><b>GFC</b></div><span>VS</span><div>${opponentMark(m)}<b>${safe((m.opponent||'TBC').toUpperCase())}</b></div></div><p class="md-meta">${safe(m.competition||'Friendly')} · ${fmtDate(m.date)}${m.time?' · KO '+safe(m.time):''}${m.venue?' · '+safe(m.venue):''}</p><div class="pstats"><div class="pstat"><small>Formation</small><b>${A&&xi.length?safe(A.shape):nr}</b></div><div class="pstat"><small>Starting XI</small><b>${xi.length?`${xi.length} / ${A.size}`:nr}</b></div><div class="pstat"><small>Substitutes</small><b>${data.squad.filter(p=>!taken.has(p.id)).length}</b></div></div>${rows?`<ul class="xi">${rows}</ul>`:'<p class="caption">No starting XI yet. Set the line-up in Tactics.</p>'}<div class="dialog-actions"><button class="button button-quiet" type="button" data-close>Close</button>${btn('Set line-up','tactics-'+m.id,'button button-secondary')}${btn('Generate matchday poster','poster-md-'+m.id)}</div>`,'is-profile');
  }

  function gameView(){
    const lv=G.clubLevel(data),rows=G.clubXpBreakdown(data).filter(r=>r.xp>0),objs=G.objectives(data),cats=['DAILY','WEEKLY','SEASON','CLUB','PLAYER'];
    const board=data.squad.map(p=>({p,s:G.playerStats(data,p),l:G.playerLevel(data,p)})).filter(x=>x.s.xp>0).sort((a,b)=>b.s.xp-a.s.xp).slice(0,6);
    const train=[...data.training].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
    return `${heading('Game Center','Your club’s progression: level, objectives, achievements and rewards. Everything is earned from real activity.',btn('XP rules','edit-rules','button button-quiet')+btn('＋ Training','log-training'))}${clubTabs('game')}
<section class="hub-hero"><div class="hub-level panel"><p class="eyebrow">CLUB LEVEL</p><div class="hub-lv"><b>${lv.level}</b><span>${lv.into} / ${lv.need} XP</span></div>${bar(lv.pct,'xp-big')}<p class="caption">${lv.total} club XP in total.</p></div><div class="hub-block"><p class="eyebrow">WHERE CLUB XP COMES FROM</p>${rows.length?`<ul class="rs-list">${rows.map(r=>`<li><span>${safe(r.label)}${r.per!=null?` · ${r.n} × ${r.per}`:''}</span><b>+${r.xp}</b></li>`).join('')}</ul>`:'<p class="caption">No XP yet. Record a match or a training session.</p>'}</div></section>
<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">OBJECTIVES</p><h3>Claim your rewards</h3></div></div>${cats.map(c=>`<h4 class="cat">${c}</h4>${objs.filter(o=>o.cat===c).map(objRow).join('')}`).join('')}</section>
<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">ACHIEVEMENTS</p><h3>${Object.keys(data.progress.unlocked).length} of ${G.ACHIEVEMENTS.length} unlocked</h3></div></div><div class="ach-grid">${G.ACHIEVEMENTS.map(a=>{const d=data.progress.unlocked[a.id];return `<div class="ach ${d?'is-done':''}"><span class="ach-badge">${d?a.icon:'🔒'}</span><span><strong>${safe(a.name)}</strong><small>${safe(a.desc)}${d?` · ${fmtDate(d)}`:''}</small></span><b>+${a.xp}</b></div>`;}).join('')}</div></section>
<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">REWARDS</p><h3>Unlocked by club level</h3></div></div><div class="rewards">${G.REWARDS.map(r=>`<div class="reward ${r.level<=lv.level?'is-open':''}"><b>LV ${r.level}</b><span><strong>${safe(r.label)}</strong><small>${safe(r.note)}</small></span><i>${r.level<=lv.level?'Unlocked':'Locked'}</i></div>`).join('')}</div></section>
<section class="hub-cols"><div class="hub-block"><p class="eyebrow">PLAYER XP</p>${board.length?`<ul class="rs-list">${board.map(x=>`<li><button class="link-btn" data-action="profile-${safe(x.p.id)}" type="button">${safe(x.p.name)} · LV ${x.l.level}</button><b>${x.s.xp} XP</b></li>`).join('')}</ul>`:`<p class="caption">${nr}. Record a result with player stats, or log training.</p>`}</div><div class="hub-block"><p class="eyebrow">TRAINING LOG</p>${train.length?`<ul class="rs-list">${train.map(t=>`<li><span>${fmtDate(t.date)}${t.note?` · ${safe(t.note)}`:''} · ${t.attended.length} attended</span><button class="link-btn" data-action="delete-training-${safe(t.id)}" type="button">Remove</button></li>`).join('')}</ul>`:'<p class="caption">No sessions logged yet.</p>'}</div></section>`;
  }
  function rulesDialog(){
    const r=data.rules,f=(label,name,v)=>field(label,name,v,'number','min="0" max="9999"');
    openModal('XP rules',`<p class="caption field-span-2">Change how much XP each event is worth. Totals update everywhere straight away.</p>${f('Appearance (player)','p-appearance',r.player.appearance)}${f('Goal (player)','p-goal',r.player.goal)}${f('Assist (player)','p-assist',r.player.assist)}${f('Clean sheet (player)','p-cleanSheet',r.player.cleanSheet)}${f('Player of the match','p-potm',r.player.potm)}${f('Training (player)','p-training',r.player.training)}${f('Match played (club)','c-match',r.club.match)}${f('Win (club)','c-win',r.club.win)}${f('Draw (club)','c-draw',r.club.draw)}${f('Training session (club)','c-training',r.club.training)}${f('Player recruited (club)','c-recruit',r.club.recruit)}${f('Player XP per level step','playerLevelStep',r.playerLevelStep,'')}${f('Club XP per level step','clubLevelStep',r.clubLevelStep)}`,'Save rules');
    $('.dialog-form',modal).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),n=k=>Math.max(0,Math.floor(Number(f.get(k)))||0);
      data.rules=G.mergeRules({player:Object.fromEntries(['appearance','goal','assist','cleanSheet','potm','training'].map(k=>[k,n('p-'+k)])),club:Object.fromEntries(['match','win','draw','training','recruit'].map(k=>[k,n('c-'+k)])),playerLevelStep:n('playerLevelStep')||250,clubLevelStep:n('clubLevelStep')||300});
      persist();modal.close();setPage(page);toast('XP rules saved.');};
  }
  async function claimObjective(key){
    const o=G.objectives(data).find(x=>x.key===key);if(!o||!o.done||o.claimed)return;
    data.progress.claimed[key]={date:today(),xp:o.xp};
    if(!await persist()){delete data.progress.claimed[key];return;}
    checkProgress();setPage(page);toast(`Objective complete: +${o.xp} club XP`);
  }
  function historyView(){
    const ev=timeline(),years=[...new Set(ev.map(e=>e.date.slice(0,4)))];
    return `${heading('Club history','A digital archive of everything the club has recorded.')}${clubTabs('history')}${ev.length?years.map(y=>`<section class="hub-block"><h3 class="hist-year">${y}</h3>${[...new Set(ev.filter(e=>e.date.startsWith(y)).map(e=>e.date.slice(5,7)))].map(mo=>`<div class="hist-month"><b>${MONTH[Number(mo)-1]}</b><ul class="feed">${ev.filter(e=>e.date.startsWith(y+'-'+mo)).map(e=>`<li><span>${e.icon}</span><div><b>${safe(e.text)}</b><small>${fmtDate(e.date)}</small></div></li>`).join('')}</ul></div>`).join('')}</section>`).join(''):empty('History starts with your first record','Add a match result, a player or a training session.','quick-match','Add a match')}`;
  }
  function analyticsView(){
    const a=G.analytics(data,anUi.season),sel=`<label class="field an-season"><span class="field-label">Season</span><select class="select" id="anSeason"><option value="all">All time</option>${a.seasons.map(y=>`<option value="${y}" ${anUi.season===y?'selected':''}>${y} season</option>`).join('')}</select></label>`;
    const tabs=`<div class="pack-tabs">${[['stats','Season'],['dev','Development']].map(([k,l])=>`<button class="team-tab ${anUi.tab===k?'is-active':''}" type="button" data-an-tab="${k}">${l}</button>`).join('')}</div>`;
    const tile=(l,v,s='')=>`<div class="pstat"><small>${l}</small><b>${v==null?nr:v}</b>${s?`<em>${s}</em>`:''}</div>`;
    const bars=(rows,key,unit)=>rows.length?`<div class="bars">${rows.map(x=>`<div class="barrow"><span>${safe(x.p.name)}</span>${bar(x.s[key]*100/rows[0].s[key])}<b>${x.s[key]} ${unit}</b></div>`).join('')}</div>`:`<p class="caption">${nr}.</p>`;
    let body;
    if(anUi.tab==='dev'){
      const players=data.squad.filter(p=>p.history?.length).map(p=>({p,dev:G.development(p),lv:G.playerLevel(data,p)}));
      body=players.length?`<div class="dev-list">${players.map(({p,dev,lv})=>`<button class="dev-row" type="button" data-action="profile-${safe(p.id)}"><b>${safe(p.name)}</b><span class="dev-ovr">OVR ${dev.from??'–'} → <strong>${dev.to??'–'}</strong>${dev.delta?`<i class="${dev.delta>0?'up':'down'}">${dev.delta>0?'▲':'▼'} ${Math.abs(dev.delta)}</i>`:''}</span><span class="dev-xp">${bar(lv.pct)}<small>LV ${lv.level}</small></span>${dev.attrs.filter(x=>x.delta).map(x=>`<small class="dev-attr">${x.key.toUpperCase()} ${x.from} → ${x.to}</small>`).join('')}</button>`).join('')}</div>`:empty('No development recorded yet','Give players a rating or attributes in their profile. Each change is saved as a development snapshot.','add-player','Add a player');
    }else{
      body=`<div class="pstats">${tile('Matches',a.played)}${tile('Wins',a.w)}${tile('Draws',a.d)}${tile('Losses',a.l)}${tile('Win rate',a.winPct==null?null:a.winPct+'%')}${tile('Goals for',a.played?a.gf:null)}${tile('Goals against',a.played?a.ga:null)}${tile('Clean sheets',a.played?a.cleanSheets:null)}${tile('Training sessions',a.trainings)}${tile('Avg. attendance',a.attendance)}</div>${a.played?`<div class="wdl" aria-label="Wins draws losses"><i class="w" style="flex:${a.w}"></i><i class="d" style="flex:${a.d}"></i><i class="l" style="flex:${a.l}"></i></div><div class="form-strip">${a.form.map(r=>`<span class="res-badge res-${r}">${r}</span>`).join('')}</div>`:''}<section class="hub-cols"><div class="hub-block"><p class="eyebrow">TOP SCORERS</p>${bars(a.scorers,'goals','goals')}</div><div class="hub-block"><p class="eyebrow">TOP ASSISTERS</p>${bars(a.assisters,'assists','assists')}</div></section><section class="hub-block"><p class="eyebrow">APPEARANCES</p>${bars(a.apps,'apps','apps')}</section>`;
    }
    return `${heading('Analytics','Counted from the matches, stats and training you have recorded.')}${sel}${tabs}${body}`;
  }
  function cardTile(p){
    const original=initialSquad.find(q=>q.id===p.id),templateName=p.templateId==='gfc-original'?'Original GFC card':data.cardTemplates.find(t=>t.id===p.templateId)?.name||'GFC template';
    const assign=`<label class="player-card-assign"><span class="field-label">Card template</span><select class="select" data-assign-template="${safe(p.id)}" aria-label="Card template for ${safe(p.name)}">${original?.card?`<option value="gfc-original" ${p.templateId==='gfc-original'?'selected':''}>Original GFC card</option>`:''}${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===p.templateId?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label>`;
    const art=p.templateId==='gfc-original'&&p.card?`<img class="player-card-art" src="${safe(p.card)}" alt="${safe(p.name)} GFC card · number ${safe(p.number)} · ${safe(p.position)}">`:`<img class="player-card-art" src="${BLANK_IMG}" data-template-player="${safe(p.id)}" alt="${safe(p.name)} GFC player card">`;
    const lv=G.playerLevel(data,p),states=G.cardStates(data,p,captainIds());
    return `<article class="player-card-shell ${states.map(s=>'cs-'+s).join(' ')}"><button class="card-open" type="button" data-action="profile-${safe(p.id)}" aria-label="Open ${safe(p.name)} profile">${art}${states.length?`<span class="card-states">${states.map(s=>`<i class="state state-${s}">${({captain:'C','in-form':'🔥',potm:'⭐',improved:'▲'})[s]}</i>`).join('')}</span>`:''}</button><div class="player-card-tools"><span><strong>${safe(p.name)}</strong><small>#${safe(p.number)} · ${safe(p.position)} · ${p.rating!=null?safe(p.rating)+' OVR':'Not rated'} · LV ${lv.level}</small>${bar(lv.pct)}</span><span>${btn('Profile','profile-'+p.id,'button button-secondary button-small')}${btn('Edit card','edit-player-'+p.id,'button button-quiet button-small')}${btn('Face outline'+(p.face?' ✓':''),'face-'+p.id,'button button-quiet button-small')}${btn('PNG','export-player-'+p.id,'button button-secondary button-small')}</span>${assign}</div></article>`;
  }
  // First number of a shape is the defence, the last is the attack. Lines are drawn attack-first, goalkeeper last.
  const lineRole=(i,n)=>i===0?'DEF':i===n-1?'ATT':'MID';
  function formationLayers(shape){const nums=shape.split('-').map(Number);return [...nums.map((count,i)=>Array.from({length:count},()=>lineRole(i,nums.length))).reverse(),['GK']];}
  // Carries the current line-up into another formation: players keep their line (DEF/MID/ATT/GK), extras fill open slots, nobody is dropped.
  function remapSlots(oldShape,oldSlots,newShape){
    const oldLayers=formationLayers(oldShape),byRole={},parse=k=>k.split('-').map(Number);
    Object.keys(oldSlots).sort((a,b)=>{const [la,ia]=parse(a),[lb,ib]=parse(b);return la-lb||ia-ib;}).forEach(key=>{const [li,i]=parse(key),role=oldLayers[li]?.[i]||'MID';(byRole[role]=byRole[role]||[]).push(oldSlots[key]);});
    const slots={},open=[];
    formationLayers(newShape).forEach((line,li)=>line.forEach((role,i)=>{const key=`${li}-${i}`,id=byRole[role]?.shift();if(id)slots[key]=id;else open.push(key);}));
    Object.values(byRole).flat().forEach((id,n)=>{if(open[n])slots[open[n]]=id;});
    return slots;
  }
  function setFormation(size,shape){const f=board();f.slots=remapSlots(f.shape,f.slots,shape);f.pos={};f.size=size;f.shape=shape;persist();setPage('formation');}
  function autoFillFormation(){
    const layers=formationLayers(board().shape),taken=otherTeamIds(),pool=data.squad.filter(p=>!taken.includes(p.id)),slots={};
    const prefs=(role,i,n)=>role==='GK'?['GK']:role==='DEF'?(n>=4&&i===0?['LB','CB']:n>=4&&i===n-1?['RB','CB']:['CB','LB','RB']):role==='MID'?['CM','CDM','CAM']:(n>=3&&i===0?['LW','ST']:n>=3&&i===n-1?['RW','ST']:['ST','CAM','LW','RW']);
    layers.forEach((line,li)=>line.forEach((role,i)=>{
      let best=-1;for(const pos of prefs(role,i,line.length)){best=pool.findIndex(p=>p.position===pos);if(best>=0)break;}
      if(best<0)best=pool.findIndex(p=>role==='GK'?p.position==='GK':p.position!=='GK');if(best<0&&pool.length)best=0;
      if(best>=0)slots[`${li}-${i}`]=pool.splice(best,1)[0].id;
    }));
    board().slots=slots;board().pos={};persist();setPage('formation');toast(`Team ${data.formation.team} sorted by position. Review the line-up.`);
  }
  function chartSvg(){const keys=['followers','members','attendance','reach'];const vals=data.growth;const max=Math.max(1,...vals.flatMap(v=>keys.map(k=>Number(v[k])||0)));const pts=vals.map((v,i)=>`${30+i*620/Math.max(1,vals.length-1)},${178-(Number(v.followers)||Number(v.members)||0)/max*145}`).join(' ');return `<svg viewBox="0 0 680 220" role="img" aria-label="Growth snapshots over time"><path d="M30 180H650M30 110H650M30 40H650" class="chart-grid"/><polyline points="${pts}" class="chart-line"/>${vals.map((v,i)=>`<circle cx="${30+i*620/Math.max(1,vals.length-1)}" cy="${178-(Number(v.followers)||Number(v.members)||0)/max*145}" r="5" class="chart-dot"/><text x="${30+i*620/Math.max(1,vals.length-1)}" y="207" text-anchor="middle">${fmtDate(v.date).replace(/,? \d{4}/,'')}</text>`).join('')}</svg>`;}
  function bindView(){
  const appContent=$('#appContent');
  if(!appContent.dataset.tacticsBound){appContent.dataset.tacticsBound='true';
    const cardAt=target=>target?.closest?.('[data-tactic-player]');
    const markSelected=()=>$$('[data-tactic-player]').forEach(x=>x.classList.toggle('is-selected',x.dataset.tacticPlayer===pendingTacticPlayer?.id));
    // Drop rules (like EA FC): on the bench = take off the pitch; on/near a position = fill or swap it; in open space = card stays where you drop it.
    const place=(src,x,y)=>{
      const t=board(),L=formationLayers(t.shape),pitch=$('[data-pitch]');if(!pitch)return;pendingTacticPlayer=null;
      const deckScroll=$('.fc-deck')?.scrollLeft||0,r=pitch.getBoundingClientRect(),over=document.elementFromPoint(x,y);let changed=false;
      const spots=[];L.forEach((line,li)=>line.forEach((_,i)=>{const k=`${li}-${i}`,s=slotXY(t,li,i,line.length,L.length);spots.push({k,x:s.x,y:s.y,home:slotXY({},li,i,line.length,L.length)});}));
      if(over?.closest?.('.fc-bench')){if(src.slot){delete t.slots[src.slot];if(t.pos)delete t.pos[src.slot];changed=true;}}
      else if(over?.closest?.('[data-pitch]')){
        const fx=cl((x-r.left)/r.width,.06,.94),fy=cl((y-r.top)/r.height,.05,.95),dist=s=>Math.hypot((s.x-fx)*r.width,(s.y-fy)*r.height);
        const near=spots.filter(s=>s.k!==src.slot).sort((a,b)=>dist(a)-dist(b))[0],reach=Math.max(40,r.width*.09);
        if(near&&dist(near)<=reach){
          const displaced=t.slots[near.k]||'';if(src.slot){if(displaced)t.slots[src.slot]=displaced;else delete t.slots[src.slot];}
          t.slots[near.k]=src.id;changed=true;
        }else if(src.slot){
          const home=spots.find(s=>s.k===src.slot).home;(t.pos??={});
          if(Math.hypot((home.x-fx)*r.width,(home.y-fy)*r.height)<24)delete t.pos[src.slot];else t.pos[src.slot]={x:fx,y:fy};changed=true;
        }else{
          const free=spots.filter(s=>!t.slots[s.k]).sort((a,b)=>dist(a)-dist(b))[0];
          if(!free)toast('The pitch is full. Drop onto a player to swap, or drag one off first.');
          else{t.slots[free.k]=src.id;(t.pos??={})[free.k]={x:fx,y:fy};changed=true;}
        }
      }
      if(changed)persist();
      setPage('formation');const deck=$('.fc-deck');if(deck)deck.scrollLeft=deckScroll;
    };
    const endDrag=()=>{if(activeTacticDrag?.ghost)activeTacticDrag.ghost.remove();$$('.is-dragging,.drop-ready').forEach(x=>x.classList.remove('is-dragging','drop-ready'));activeTacticDrag=null;};
    appContent.addEventListener('click',e=>{
      if(page!=='formation'||Date.now()<suppressTacticClickUntil)return;const card=cardAt(e.target);
      if(pendingTacticPlayer&&(!card||card.dataset.tacticPlayer!==pendingTacticPlayer.id)&&e.target.closest('[data-pitch],.fc-bench')){place(pendingTacticPlayer,e.clientX,e.clientY);return;}
      if(card){pendingTacticPlayer={id:card.dataset.tacticPlayer,slot:card.dataset.fromSlot||''};markSelected();}
    });
    appContent.addEventListener('keydown',e=>{
      if(page!=='formation')return;
      if(e.key==='Escape'&&pendingTacticPlayer){pendingTacticPlayer=null;markSelected();return;}
      if(!['Enter',' '].includes(e.key))return;const card=cardAt(e.target);
      if(card){e.preventDefault();pendingTacticPlayer={id:card.dataset.tacticPlayer,slot:card.dataset.fromSlot||''};markSelected();return;}
      const slot=e.target.closest?.('.fc-slot');if(pendingTacticPlayer&&slot){e.preventDefault();const r=slot.getBoundingClientRect();place(pendingTacticPlayer,r.left+r.width/2,r.top+r.height/2);}
    });
    appContent.addEventListener('pointerdown',e=>{if(page!=='formation'||e.button!==0)return;const card=cardAt(e.target);if(!card)return;activeTacticDrag={id:card.dataset.tacticPlayer,slot:card.dataset.fromSlot||'',startX:e.clientX,startY:e.clientY,moved:false,ghost:null};});
    document.addEventListener('pointermove',e=>{
      if(!activeTacticDrag)return;const dx=e.clientX-activeTacticDrag.startX,dy=e.clientY-activeTacticDrag.startY;if(!activeTacticDrag.moved&&Math.hypot(dx,dy)<8)return;
      if(!activeTacticDrag.moved){activeTacticDrag.moved=true;const source=$(`[data-tactic-player="${CSS.escape(activeTacticDrag.id)}"]`,appContent);if(source){source.classList.add('is-dragging');const ghost=source.cloneNode(true);ghost.classList.add('tactics-drag-ghost');ghost.removeAttribute('data-tactic-player');document.body.append(ghost);activeTacticDrag.ghost=ghost;}}
      if(activeTacticDrag.ghost){activeTacticDrag.ghost.style.left=e.clientX+'px';activeTacticDrag.ghost.style.top=e.clientY+'px';}
      const over=document.elementFromPoint(e.clientX,e.clientY);$$('.fc-bench,[data-pitch]').forEach(x=>x.classList.remove('drop-ready'));over?.closest?.('.fc-bench,[data-pitch]')?.classList.add('drop-ready');
    });
    document.addEventListener('pointerup',e=>{
      if(!activeTacticDrag)return;const drag=activeTacticDrag;if(drag.moved)suppressTacticClickUntil=Date.now()+350;endDrag();
      if(drag.moved)place({id:drag.id,slot:drag.slot},e.clientX,e.clientY);
    });
    document.addEventListener('pointercancel',endDrag);
  }
  $$('#appContent [data-nav]').forEach(el=>el.addEventListener('click',()=>setPage(el.dataset.nav)));
  $$('#appContent [data-action]').forEach(el=>el.addEventListener('click',()=>action(el.dataset.action)));
  if($('#cardTemplateFile'))$('#cardTemplateFile').addEventListener('change',e=>{const file=e.target.files[0];if(file)importCardTemplate(file);e.target.value='';});
  if($('#activeCardTemplate'))$('#activeCardTemplate').addEventListener('change',()=>{data.activeCardTemplateId=$('#activeCardTemplate').value;persist();setPage('squad');});
  if($('#cardTemplateFilter'))$('#cardTemplateFilter').addEventListener('change',()=>{data.cardTemplateFilter=$('#cardTemplateFilter').value;persist();setPage('squad');});
  $$('#appContent [data-assign-template]').forEach(el=>el.addEventListener('change',()=>assignTemplate(el.dataset.assignTemplate,el.value)));
  if($('#formationSize'))$('#formationSize').addEventListener('change',()=>{const size=Number($('#formationSize').value);setFormation(size,shapesFor(size)[0]);});
  if($('#anSeason'))$('#anSeason').addEventListener('change',e=>{anUi.season=e.target.value;setPage('analytics');});
  $$('#appContent [data-an-tab]').forEach(b=>b.addEventListener('click',()=>{anUi.tab=b.dataset.anTab;setPage('analytics');}));
  if($('#formationCaptain'))$('#formationCaptain').addEventListener('change',e=>{board().captain=e.target.value;persist();setPage('formation');});
  if($('#pitchTheme'))$('#pitchTheme').addEventListener('change',e=>{data.settings.pitchTheme=e.target.value;persist();setPage('formation');});
  if($('#formationMatch'))$('#formationMatch').addEventListener('change',()=>{data.formation.matchId=$('#formationMatch').value;pendingTacticPlayer=null;persist();setPage('formation');});
  $$('#appContent [data-team]').forEach(b=>b.addEventListener('click',()=>{data.formation.team=b.dataset.team;pendingTacticPlayer=null;persist();setPage('formation');}));
  if($('#formationShape'))$('#formationShape').addEventListener('change',()=>setFormation(board().size,$('#formationShape').value));
}
  function action(name){if(name==='settings')return settingsSheet();if(name.startsWith('face-')||name.startsWith('studio-')||name.startsWith('design-'))return designAction(name);if(name.startsWith('cards-')){cardUi.matchId=name.slice(6);cardUi.selected='';return setPage('cards');}if(name==='quick-match'||name==='add-match')return matchDialog();if(name==='cc-save-style')return saveCardStyle();if(name==='cc-clear-shape'||name==='cc-clear-bg'||name==='cc-clear-frame'){const m=cardMatch();if(m){const s={...(data.editions[m.id]||{})};if(name==='cc-clear-frame'){delete s.frame;delete s.frameTop;delete s.shapeImg;delete s.shape;}else if(name==='cc-clear-bg')delete s.bg;else{delete s.shapeImg;delete s.shape;}data.editions[m.id]=s;persistSoon();const y=scrollY;setPage('cards');scrollTo(0,y);}return;}if(name==='cc-export-one')return exportCards('one');if(name==='cc-export-sheet')return exportCards('sheet');if(name==='cc-export-all')return exportCards('all');if(name==='cc-shuffle'){const m=cardMatch();if(m){{const {c1,c2,accent,ink,...keep}=data.editions[m.id]||{};data.editions[m.id]={...keep,...GC.shuffle()};}persistSoon();const y=scrollY;setPage('cards');scrollTo(0,y);}return;}if(name==='cc-reset'){const m=cardMatch();if(m){delete data.editions[m.id];persistSoon();const y=scrollY;setPage('cards');scrollTo(0,y);}return;}if(name==='auto-fill')return autoFillFormation();if(name==='reset-positions'){board().pos={};persist();return setPage('formation');}if(name==='formation-poster')return makeFormationPoster();if(name==='pack-export')return exportPack(false);if(name==='pack-export-all')return exportPack(true);if(name==='manage-fonts')return fontManager();if(name==='goto-matches')return setPage('matches');if(name==='goto-squad')return setPage('squad');if(name==='add-player')return playerDialog();if(name==='card-editor')return cardEditor();if(name==='import-template')return $('#cardTemplateFile')?.click();if(name==='edit-active-template')return templateEditor(data.activeCardTemplateId);if(name==='apply-active-template')return applyTemplateToSquad(data.activeCardTemplateId);if(name.startsWith('apply-template-'))return applyTemplateToSquad(name.slice(15));if(name.startsWith('edit-template-'))return templateEditor(name.slice(14));if(name.startsWith('duplicate-template-'))return duplicateTemplate(name.slice(19));if(name.startsWith('delete-template-'))return deleteTemplate(name.slice(16));if(name.startsWith('activate-template-')){data.activeCardTemplateId=name.slice(18);persist();return setPage('squad');}if(name.startsWith('export-player-'))return exportPlayerCard(name.slice(14));if(name==='add-growth')return growthDialog();if(name==='add-post')return postDialog();if(name==='export-backup')return backup();if(name==='import-backup')return $('#backupImport').click();if(name==='goto-formation')return setPage('formation');if(name==='log-training')return trainingDialog();if(name==='edit-rules')return rulesDialog();if(name.startsWith('prepare-'))return prepareSheet(name.slice(8));if(name.startsWith('result-'))return (()=>{const m=data.matches.find(x=>x.id===name.slice(7));return m&&G.hasResult(m)&&m.stats?resultScreen(m,[]):resultDialog(name.slice(7));})();if(name.startsWith('profile-'))return playerProfile(name.slice(8));if(name.startsWith('claim-'))return claimObjective(name.slice(6));if(name.startsWith('delete-training-')){if(!confirm('Remove this training session?'))return;data.training=data.training.filter(x=>x.id!==name.slice(16));persist();return setPage(page);}if(name.startsWith('tactics-')){data.formation.matchId=name.slice(8);data.formation.team='A';persist();return setPage('formation');}if(name.startsWith('poster-md-')){packUi.matchId=name.slice(10);packUi.kind='matchday';packUi.selected='';return setPage('packs');}if(name==='export-ics')return exportICS();if(name.startsWith('edit-match-'))return matchDialog(data.matches.find(m=>m.id===name.slice(11)));if(name.startsWith('delete-match-'))return deleteItem('matches',name.slice(13),'fixture');if(name.startsWith('poster-for-')){packUi.matchId=name.slice(11);packUi.kind=data.matches.find(m=>m.id===packUi.matchId)?.home!=null?'score':'next';return setPage('packs');}if(name.startsWith('edit-player-'))return cardEditor(data.squad.find(p=>p.id===name.slice(12)));if(name.startsWith('delete-growth-'))return deleteItem('growth',name.slice(14),'snapshot');if(name.startsWith('delete-post-'))return deleteItem('posts',name.slice(12),'post');if(name.startsWith('posted-')){const p=data.posts.find(x=>x.id===name.slice(7));p.status='posted';persist();setPage('instagram');toast('Marked as posted.');}}
  const modal=$('#modal');const lockPage=()=>document.documentElement.classList.add('modal-open');modal.addEventListener('close',()=>document.documentElement.classList.remove('modal-open'));function openModal(title,body,submit='Save'){modal.oncancel=null;modal.innerHTML=`<div class="dialog-header"><div><p class="eyebrow">GFC CLUB DESK</p><h2 id="modalTitle">${title}</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div><form class="dialog-form"><div class="form-grid">${body}</div><div class="dialog-actions"><button class="button button-quiet" type="button" data-close>Cancel</button><button class="button button-primary" type="submit">${submit}</button></div></form>`;modal.showModal();lockPage();$$('[data-close]',modal).forEach(b=>b.onclick=()=>modal.close());}
  function field(label,id,value='',type='text',extra=''){return `<label class="field"><span class="field-label">${label}</span><input class="input" id="${id}" name="${id}" type="${type}" value="${safe(value)}" ${extra}></label>`;}
  function matchDialog(m={}){openModal(m.id?'Edit fixture':'Add a fixture',`${field('Opponent','opponent',m.opponent||'')}${field('Competition','competition',m.competition||'Friendly')}${field('Date','date',m.date||today(),'date')}${field('Kick-off','time',m.time||'','time')}${field('Venue','venue',m.venue||'')}${field('GFC score','home',m.home??'','number','min="0"')}${field('Opponent score','away',m.away??'','number','min="0"')}`);$('.dialog-form',modal).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const obj={id:m.id||uid(),opponent:f.get('opponent').trim(),competition:f.get('competition').trim(),date:f.get('date'),time:f.get('time'),venue:f.get('venue'),home:f.get('home')===''?null:Number(f.get('home')),away:f.get('away')===''?null:Number(f.get('away'))};data.matches=data.matches.filter(x=>x.id!==obj.id).concat(obj);persist();modal.close();setPage('matches');toast('Fixture saved.');};}
  async function applyTemplateToSquad(templateId){
    const template=data.cardTemplates.find(t=>t.id===templateId);if(!template)return;
    if(!confirm(`Apply “${template.name}” to all ${data.squad.length} players? Original card files stay in the app folder, and any player can switch back from the template menu on their card.`))return;
    const previous={squad:data.squad.map(p=>({...p})),active:data.activeCardTemplateId,filter:data.cardTemplateFilter};
    data.squad.forEach(p=>{p.templateId=template.id;p.card='';});data.activeCardTemplateId=template.id;data.cardTemplateFilter=template.id;
    if(!await persist()){data.squad=previous.squad;data.activeCardTemplateId=previous.active;data.cardTemplateFilter=previous.filter;return;}
    setPage('squad');toast(`${template.name} applied to the squad.`);
  }
  // Full-size export: every card is 902 × 1389 px, whatever the template.
  async function exportPlayerCard(id){
    const player=data.squad.find(p=>p.id===id);if(!player)return;
    const template=data.cardTemplates.find(t=>t.id===player.templateId),fileName=`GFC-${player.name.replace(/[^a-z0-9]+/gi,'-')}-card.png`;
    if(!template){if(!player.card)return toast('This card has no artwork to export.');const a=document.createElement('a');a.href=player.card;a.download=fileName;a.click();return toast('Original card artwork downloaded.');}
    try{
      const canvas=document.createElement('canvas');canvas.width=CARD_W;canvas.height=CARD_H;await drawTemplateCard(canvas,player,template);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('empty');
      download(blob,fileName);toast(`Exported ${CARD_W} × ${CARD_H} PNG.`);
    }catch{toast(location.protocol==='file:'?'Export is blocked on a file:// address. Start the local server from the README and open http://localhost:4173.':'The card could not be exported. Try again.');}
  }
  function cardEditor(p={},pre={}){
    const selectedTemplate=p.templateId&&p.templateId!=='gfc-original'&&data.cardTemplates.some(t=>t.id===p.templateId)?p.templateId:data.activeCardTemplateId;let photoData=pre.photoData||'',photoOrig=pre.photoOrig??p.photoOrig??'',cropTouched=!!pre.touched;
    const photoLayer=t=>t?.layers.find(l=>l.type==='photo')||{};
    const range=(id,label,val,min,max)=>`<label class="field"><span class="field-label">${label} · <b id="${id}Value">${val}</b></span><input class="input range-input" type="range" id="${id}" min="${min}" max="${max}" value="${val}"></label>`;
    const t0=data.cardTemplates.find(t=>t.id===selectedTemplate)||data.cardTemplates[0],crop=p.crop||{};
    const body=`${field('Player name','cardName',p.name||'','text','maxlength="40" required')}${field('Shirt number','cardNumber',p.number||'')}${`<label class="field"><span class="field-label">Position</span><select class="select" name="cardPosition">${['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(x=>`<option ${x===(p.position||'ST')?'selected':''}>${x}</option>`).join('')}</select></label>`}${field('Rating (optional)','cardRating',p.rating??'','number','min="1" max="99"')}${`<label class="field"><span class="field-label">Card template</span><select class="select" id="playerCardTemplate" name="templateId">${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===selectedTemplate?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label>`}${`<label class="field field-span-2"><span class="field-label">Player portrait</span><input class="input" id="playerCardPhoto" type="file" accept="image/*">${(p.photo||pre.photoData)?`<button class="button button-quiet" type="button" id="cardEditCut">✂️ Edit this photo again (cut-out, brush)</button>`:''}<span class="field-help">A transparent PNG cut-out works best. The template controls the frame; the sliders below adjust this player’s crop.</span></label>`}${range('cardZoom','Photo zoom %',crop.zoom??photoLayer(t0).zoom??100,100,300)}${range('cardFocusX','Photo left / right',crop.x??photoLayer(t0).focusX??50,0,100)}${range('cardFocusY','Photo up / down',crop.y??photoLayer(t0).focusY??43,0,100)}${`<div class="card-template-preview field-span-2"><p class="field-label">Live card preview</p><canvas id="playerCardPreview" width="${PREVIEW_W}" height="${PREVIEW_H}"></canvas></div>`}`;
    openModal(p.id?'Edit player card':'Create player card',body,'Save player card');
    const form=$('.dialog-form',modal),canvas=$('#playerCardPreview'),currentPhoto=p.photo||'assets/brand/gfc-logo.png';
    const currentCrop=()=>cropTouched||p.crop?{zoom:Number($('#cardZoom').value),x:Number($('#cardFocusX').value),y:Number($('#cardFocusY').value)}:undefined;
    const draw=()=>{const template=data.cardTemplates.find(t=>t.id===$('#playerCardTemplate').value)||data.cardTemplates[0];return drawTemplateCard(canvas,{name:$('#cardName').value||'PLAYER',number:$('#cardNumber').value||'00',position:$('[name="cardPosition"]',form).value,rating:$('#cardRating').value===''?null:Number($('#cardRating').value),photo:photoData||currentPhoto,crop:currentCrop()},template);};
    $$('#modal input,#modal select').forEach(el=>el.addEventListener('input',draw));
    $('#playerCardTemplate').addEventListener('change',()=>{if(cropTouched||p.crop)return draw();const l=photoLayer(data.cardTemplates.find(t=>t.id===$('#playerCardTemplate').value));[['cardZoom',l.zoom??100],['cardFocusX',l.focusX??50],['cardFocusY',l.focusY??43]].forEach(([id,v])=>{$('#'+id).value=v;$('#'+id+'Value').textContent=v;});draw();});
    ['cardZoom','cardFocusX','cardFocusY'].forEach(id=>$('#'+id).addEventListener('input',()=>{cropTouched=true;$('#'+id+'Value').textContent=$('#'+id).value;}));
    // one path for "new upload" and "edit again": the cut-out screen shares the dialog, so keep what was typed and reopen the form afterwards
    const recut=async(src,orig)=>{
      const draft={...p,name:$('#cardName').value,number:$('#cardNumber').value,position:$('[name="cardPosition"]',form).value,rating:$('#cardRating').value===''?null:Number($('#cardRating').value),templateId:$('#playerCardTemplate').value,crop:currentCrop()},keep={photoData,photoOrig,touched:cropTouched};
      const cut=await cutoutDialog(src,{photo:true});
      if(!cut){cardEditor(draft,keep);return;}
      cardEditor({...draft,crop:undefined},{photoData:cut.src,photoOrig:orig||cut.orig,touched:false});};
    $('#playerCardPhoto').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const r=await importPicture(file,1400,true);await recut(r.src,r.src);}catch(error){e.target.value='';toast(error.message);}});
    $('#cardEditCut')?.addEventListener('click',()=>recut(photoOrig||photoData||currentPhoto,photoOrig).catch(err=>toast(err.message)));
    const resetCropToTemplate=()=>{const l=photoLayer(data.cardTemplates.find(t=>t.id===$('#playerCardTemplate').value));[['cardZoom',l.zoom??100],['cardFocusX',l.focusX??50],['cardFocusY',l.focusY??43]].forEach(([id,v])=>{$('#'+id).value=v;$('#'+id+'Value').textContent=v;});};
    // Phonto-style: drag the card to move the photo, pinch / wheel / buttons to zoom. The old sliders stay as hidden values.
    ['cardZoom','cardFocusX','cardFocusY'].forEach(id=>{$('#'+id).closest('label').style.display='none';});
    canvas.insertAdjacentHTML('beforebegin','<p class="caption">Drag the card to move the photo. Pinch with two fingers to zoom.</p>');
    canvas.insertAdjacentHTML('afterend','<div class="cc-stage-actions"><button type="button" class="button button-quiet button-small" id="cardZoomOut">－ Zoom out</button><button type="button" class="button button-quiet button-small" id="cardZoomIn">＋ Zoom in</button></div>');
    canvas.style.touchAction='none';
    {const pts=new Map();let g=null;
      const setCrop=(z,x,y)=>{cropTouched=true;[['cardZoom',Math.round(Math.min(250,Math.max(100,z)))],['cardFocusX',Math.round(Math.min(100,Math.max(0,x)))],['cardFocusY',Math.round(Math.min(100,Math.max(0,y)))]].forEach(([id,v])=>{$('#'+id).value=v;$('#'+id+'Value').textContent=v;});draw();};
      const cur=()=>({z:+$('#cardZoom').value,x:+$('#cardFocusX').value,y:+$('#cardFocusY').value});
      const geo=async()=>{const t=data.cardTemplates.find(q=>q.id===$('#playerCardTemplate').value)||data.cardTemplates[0],l=photoLayer(t),im=await loadCardImage(photoData||currentPhoto),r=canvas.getBoundingClientRect();return im?{iw:im.width,ih:im.height,lw:(l.w||100)/100*r.width,lh:(l.h||100)/100*r.height}:null;};
      canvas.onpointerdown=async e=>{canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const c=cur(),k=await geo();if(!k)return;
        if(pts.size===2){const [a,b]=[...pts.values()];g={mode:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,z0:c.z,k};}else g={mode:'move',sx:e.clientX,sy:e.clientY,c,k};};
      canvas.onpointermove=e=>{if(!g||!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const c=cur();
        if(g.mode==='pinch'){if(pts.size<2)return;const [a,b]=[...pts.values()];setCrop(g.z0*Math.hypot(a.x-b.x,a.y-b.y)/g.d0,c.x,c.y);return;}
        if(pts.size!==1)return;const {iw,ih,lw,lh}=g.k,S=Math.max(lw/iw,lh/ih)*g.c.z/100,tx=iw*S-lw,ty=ih*S-lh;
        setCrop(g.c.z,tx>1?g.c.x-(e.clientX-g.sx)/tx*100:g.c.x,ty>1?g.c.y-(e.clientY-g.sy)/ty*100:g.c.y);};
      canvas.onpointerup=canvas.onpointercancel=e=>{pts.delete(e.pointerId);if(!pts.size)g=null;else if(g?.mode==='pinch')g=null;};
      canvas.addEventListener('wheel',e=>{e.preventDefault();const c=cur();setCrop(c.z*(e.deltaY<0?1.08:.93),c.x,c.y);},{passive:false});
      $('#cardZoomIn').onclick=()=>{const c=cur();setCrop(c.z*1.12,c.x,c.y);};$('#cardZoomOut').onclick=()=>{const c=cur();setCrop(c.z/1.12,c.x,c.y);};}
    draw();
    form.onsubmit=async e=>{
      e.preventDefault();const f=new FormData(form),name=String(f.get('cardName')).trim().toUpperCase();
      if(!name)return toast('Enter a player name.');
      if(!photoData&&!p.id)return toast('Choose a player portrait to build this card.');
      const templateId=f.get('templateId'),obj={...p,id:p.id||uid(),name,number:f.get('cardNumber'),position:f.get('cardPosition'),rating:f.get('cardRating')===''?null:Number(f.get('cardRating')),photo:photoData||currentPhoto,photoOrig:photoOrig||undefined,templateId,card:'',crop:currentCrop()};
      if(!obj.crop)delete obj.crop;
      const previous={squad:data.squad,active:data.activeCardTemplateId},i=data.squad.findIndex(x=>x.id===obj.id);
      data.squad=i>=0?data.squad.map(x=>x.id===obj.id?obj:x):[...data.squad,obj];data.activeCardTemplateId=templateId;
      if(!await persist()){data.squad=previous.squad;data.activeCardTemplateId=previous.active;return;}
      modal.close();setPage('squad');toast('Player saved with the selected template.');
    };
  }
  function growthDialog(){openModal('Record a growth snapshot',`${field('Snapshot date','date',today(),'date')}${field('Instagram followers','followers','','number','min="0"')}${field('Active squad','members',String(data.squad.length),'number','min="0"')}${field('Match attendance','attendance','','number','min="0"')}${field('Post reach','reach','','number','min="0"')}`);$('.dialog-form',modal).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);data.growth.push({id:uid(),date:f.get('date'),followers:num(f.get('followers')),members:num(f.get('members')),attendance:num(f.get('attendance')),reach:num(f.get('reach'))});persist();modal.close();setPage('growth');toast('Snapshot recorded.');};}
  function postDialog(){openModal('Plan an Instagram post',`${field('Post title','title','Matchday announcement')}${field('Date and time','dateTime',`${today()}T18:00`,'datetime-local')}${`<label class="field field-span-2"><span class="field-label">Caption</span><textarea class="textarea" name="caption" rows="4">#GFC #GamudaFC</textarea></label>`}${field('Poster file (optional)','image','','text','placeholder="Paste an image path"')}`,'Add to planner');$('.dialog-form',modal).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);data.posts.push({id:uid(),title:f.get('title'),dateTime:f.get('dateTime'),caption:f.get('caption'),image:f.get('image'),status:'planned'});persist();modal.close();setPage('instagram');toast('Post reminder added.');};}
  function num(v){return v===''?null:Number(v);}function deleteItem(key,id,label){if(!confirm(`Remove this ${label}?`))return;data[key]=data[key].filter(x=>x.id!==id);persist();setPage(page);toast(`${label[0].toUpperCase()+label.slice(1)} removed.`);}
  function backup(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});download(blob,'GFC-club-backup.json');}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);}
  $('#backupImport').addEventListener('change',e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;const reader=new FileReader();
    reader.onerror=()=>toast('That backup file could not be opened.');
    reader.onload=async()=>{
      let next;try{const parsed=JSON.parse(reader.result);if(!parsed||!Array.isArray(parsed.squad)||!Array.isArray(parsed.matches))throw new Error('not a backup');next=normalize(parsed);}catch{return toast('That file is not a GFC club backup. Choose a backup exported from this app.');}
      if(!confirm(`Restore this backup? It replaces everything now in this browser (${data.squad.length} players, ${data.cardTemplates.length} templates, ${data.matches.length} fixtures) with ${next.squad.length} players, ${next.cardTemplates.length} templates and ${next.matches.length} fixtures. Export a backup first if you may need the current data.`))return;
      const previous=data;data=next;await ensureFonts();if(!await persist()){data=previous;return;}setPage(page);toast('Backup restored.');
    };
    reader.readAsText(file);
  });
  function exportICS(){const events=data.posts.filter(p=>p.status==='planned').map(p=>{const start=new Date(p.dateTime);const end=new Date(start.getTime()+30*60000);const ics=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');return `BEGIN:VEVENT\nUID:${p.id}@gfc-club-desk\nDTSTAMP:${ics(new Date())}\nDTSTART:${ics(start)}\nDTEND:${ics(end)}\nSUMMARY:${(p.title+' · @genmudafc').replace(/[,;]/g,'\\$&')}\nDESCRIPTION:${p.caption.replace(/\n/g,'\\n')}\nEND:VEVENT`;});download(new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//GFC Club Desk//EN\n${events.join('\n')}\nEND:VCALENDAR`],{type:'text/calendar'}),'GFC-instagram-plan.ics');toast('Calendar reminders exported.');}
  $$('.nav-item[data-nav]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.nav)));$$('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));$('#backupImport').accept='.json,application/json';boot();
})();

