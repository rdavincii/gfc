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
    {id:'logo',label:'Club crest',type:'logo',src:'assets/brand/gfc-crest.png',x:4,y:4,w:13,h:12,visible:true},
    {id:'number',label:'Shirt number',type:'text',field:'number',x:5,y:24,w:24,h:16,fontSize:10,color:'#ed1c24',font:'Winner GFC',align:'left',visible:true},
    {id:'position',label:'Position',type:'text',field:'position',x:5,y:43,w:24,h:10,fontSize:5.5,color:'#ed1c24',font:'Winner GFC',align:'left',visible:true},
    {id:'name',label:'Player name',type:'text',field:'name',x:8,y:79,w:82,h:10,fontSize:7.3,color:'#ed1c24',font:'Winner GFC',align:'center',visible:true},
    {id:'rating',label:'Rating',type:'text',field:'rating',x:70,y:91,w:25,h:6,fontSize:4.2,color:'#fff7f5',font:'Winner GFC',align:'right',visible:true}
  ]});

  let data;
  const shapesFor=size=>size===7?['2-3-1','3-2-1','2-2-2','3-1-2']:['4-3-3','4-4-2','4-2-3-1','3-5-2','3-4-3'];
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
    d.packs={};for(const m of d.matches){const r=raw.packs?.[m.id];if(!r||typeof r!=='object')continue;const D=PACK_DEFAULT,n=(k,lo,hi)=>cl(r[k]??D[k],lo,hi);
      d.packs[m.id]={bg:typeof r.bg==='string'&&r.bg.startsWith('data:image/')?r.bg:'',fx:n('fx',0,100),fy:n('fy',0,100),tint:n('tint',0,1),shade:n('shade',0,.8),vignette:n('vignette',0,.9),grain:n('grain',0,1),primary:/^#[0-9a-f]{6}$/i.test(r.primary)?r.primary:D.primary,font:typeof r.font==='string'?r.font:'',format:r.format==='story'?'story':'feed',layouts:r.layouts&&typeof r.layouts==='object'?r.layouts:{}};}
    d.fonts=Array.isArray(raw.fonts)?raw.fonts.filter(x=>x&&x.name&&x.src).map(x=>({name:x.name,src:x.src})):[];
    d.cardTemplates.forEach(t=>{if(Array.isArray(t.fonts)){t.fonts.forEach(x=>{if(x&&x.name&&x.src&&!d.fonts.some(y=>y.name===x.name))d.fonts.push({name:x.name,src:x.src});});delete t.fonts;}});
    const old=raw.formation||{};d.lineups=raw.lineups&&typeof raw.lineups==='object'?raw.lineups:{};
    if(old.slots&&Object.keys(old.slots).length&&!d.lineups.practice)d.lineups.practice={A:{size:old.size,shape:old.shape,slots:old.slots}};
    d.formation={matchId:old.matchId||'',team:old.team==='B'?'B':'A',colors:{primary:'#ed1c24',base:'#160b0e',line:'#fff7f5',...(old.colors||{})}};
    if(d.formation.matchId&&!d.matches.some(x=>x.id===d.formation.matchId))d.formation.matchId='';
    for(const set of Object.values(d.lineups)){const seen=new Set();for(const team of ['A','B']){const t=set[team];if(!t||typeof t!=='object'){delete set[team];continue;}t.size=t.size===7?7:11;if(!shapesFor(t.size).includes(t.shape))t.shape=shapesFor(t.size)[0];t.slots=t.slots&&typeof t.slots==='object'?t.slots:{};{const pos={};for(const [k,v] of Object.entries(t.pos&&typeof t.pos==='object'?t.pos:{}))if(v&&Number.isFinite(+v.x)&&Number.isFinite(+v.y))pos[k]={x:Math.min(.94,Math.max(.06,+v.x)),y:Math.min(.95,Math.max(.05,+v.y))};t.pos=pos;}const valid=new Set();formationLayers(t.shape).forEach((line,li)=>line.forEach((_,i)=>valid.add(`${li}-${i}`)));for(const [key,id] of Object.entries(t.slots)){if(!valid.has(key)||!d.squad.some(p=>p.id===id)||seen.has(id))delete t.slots[key];else seen.add(id);}for(const k of Object.keys(t.pos))if(!t.slots[k])delete t.pos[k];}}
    d.progress={seen:Array.isArray(raw.progress?.seen)?raw.progress.seen.filter(x=>typeof x==='string'):[],exports:Math.max(0,Math.floor(Number(raw.progress?.exports))||0),days:Array.isArray(raw.progress?.days)?raw.progress.days.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-400):[]};
    return d;
  }
  let page = 'overview';
  let toastTimer;
  let pendingTacticPlayer=null;
  let activeTacticDrag=null;
  let suppressTacticClickUntil=0;
  const posterImages=new Map();
  const pages = {overview:'Hub',matches:'Matches',packs:'Match pack',squad:'Squad',formation:'Formation',growth:'Club',instagram:'Club'};
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
  async function boot(){
    const {raw,migrate}=await loadStored();
    data=normalize(raw);await ensureFonts();if(!data.progress.days.includes(today()))data.progress.days.push(today());data.progress.seen.push(...ACHIEVEMENTS.filter(a=>!data.progress.seen.includes(a[0])&&a[4]()).map(a=>a[0]));persistSoon();
    try{navigator.storage?.persist?.();}catch{}
    setPage('overview');
    if(migrate)persist('Moved to browser database');
    if(location.protocol==='file:')toast('Open the app through the local server (see README). From a file:// address, card previews and PNG export are blocked by the browser.');
  }
  function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('is-visible'),Math.max(2600,String(message).length*60)); }
  const fmtDate = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) : 'Date to be confirmed';
  const fmtTime = d => d ? new Date(d).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  function setPage(key) { if(!pages[key]) return; if(key!=='formation')pendingTacticPlayer=null; page=key; $$('.nav-item[data-nav]').forEach(b=>{const nk=key==='instagram'?'growth':key;b.classList.toggle('is-active',b.dataset.nav===nk); if(b.dataset.nav===nk)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}); $('#pageTitle').textContent=pages[key]; $('#appContent').innerHTML=views[key](); if(key==='packs') bindPack();  scrollTo(0,0); bindView(); renderChip(); if(key==='squad'||key==='formation'||key==='overview')requestAnimationFrame(renderDynamicCards);if(key==='squad')showStorage(); }
  const heading=(title,desc,action='')=>`<div class="page-heading"><div class="page-heading-copy"><p class="eyebrow">GAMUDA FOOTBALL CLUB</p><h2>${title}</h2><p class="lead">${desc}</p></div>${action?`<div class="page-actions">${action}</div>`:''}</div>`;
  const btn=(label,action,cls='button button-primary',extra='')=>`<button class="${cls}" type="button" data-action="${action}" ${extra}>${label}</button>`;
  const empty=(title,body,action,label)=>`<div class="empty-state"><span class="empty-mark">G</span><h3>${title}</h3><p>${body}</p>${action?btn(label,action,'button button-secondary'):''}</div>`;
  const upcoming=()=>[...data.matches].filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const matchRows=()=> [...data.matches].sort((a,b)=>a.date.localeCompare(b.date)).map(m=>`<article class="match-row ${m.date<today()?'is-complete':''}"><div class="match-row-main"><span class="meta-label">${fmtDate(m.date)}${m.time?` · ${safe(m.time)}`:''}</span><h3>${safe(m.opponent||'Opponent to be confirmed')}</h3><span>${safe(m.competition||'Friendly')}${m.venue?` · ${safe(m.venue)}`:''}</span></div><div class="match-row-score">${m.home!=null&&m.away!=null?`${m.home} — ${m.away}`:'VS'}</div><div class="table-actions">${btn('Poster','poster-for-'+m.id,'button button-quiet button-small')}${btn('Edit','edit-match-'+m.id,'button button-quiet button-small')}${btn('Remove','delete-match-'+m.id,'button button-quiet button-small')}</div></article>`).join('');
  const views={
    overview:()=>{
      const n=upcoming(),l=levelInfo(),st=streak(),days=n?Math.round((new Date(n.date+'T00:00:00')-new Date(today()+'T00:00:00'))/864e5):null;
      const top=[...data.squad].filter(p=>p.rating!=null).sort((a,b)=>b.rating-a.rating).slice(0,6);
      const tiles=[['matches','📅','Matches','Fixtures and results'],['squad','🃏','Squad','Cards and templates'],['formation','⚽','Formation','Team A and Team B'],['packs','🎨','Match pack','Posters for a match'],['growth','📈','Club','Growth and content']];
      return `<section class="hub-hero"><div class="hub-next"><p class="eyebrow">NEXT MATCH</p>${n?`<h2>GFC <i>VS</i> ${safe((n.opponent||'TBC').toUpperCase())}</h2><p class="hub-when">${fmtDate(n.date)}${n.time?' · '+safe(n.time):''}${n.venue?' · '+safe(n.venue):''}</p><div class="hub-count"><b>${days<=0?'TODAY':days}</b><small>${days<=0?'MATCHDAY':days===1?'DAY TO GO':'DAYS TO GO'}</small></div><div class="hero-actions">${btn('Set the line-up','goto-formation')}${btn('Match pack','poster-for-'+n.id,'button button-secondary')}</div>`:`<h2>NO MATCH YET</h2><p class="hub-when">Add a fixture to unlock your line-up and poster pack.</p><div class="hero-actions">${btn('Add a match','quick-match')}</div>`}</div><div class="hub-level"><p class="eyebrow">CLUB LEVEL</p><div class="hub-lv"><b>${l.level}</b><span>${safe(l.title)}</span></div><div class="xp-bar xp-big"><i style="width:${l.pct}%"></i></div><p class="caption">${l.xp} XP · ${l.next} to level ${l.level+1}</p><div class="hub-streak"><span>🔥</span><b>${st}</b><small>day streak</small></div></div></section>
<section class="hub-tiles">${tiles.map(([k,i,a,b])=>`<button class="hub-tile" type="button" data-nav="${k}"><span class="hub-tile-icon">${i}</span><strong>${a}</strong><small>${b}</small></button>`).join('')}</section>
${top.length?`<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">SQUAD</p><h3>Top rated</h3></div></div><div class="hub-cards">${top.map(p=>`<div class="hub-card"><img src="${safe(p.card||p.photo||BLANK_IMG)}" data-template-player="${safe(p.id)}" alt="${safe(p.name)}"></div>`).join('')}</div></section>`:''}
<section class="hub-block"><div class="section-heading"><div><p class="eyebrow">ACHIEVEMENTS</p><h3>${data.progress.seen.length} of ${ACHIEVEMENTS.length} unlocked</h3></div></div><div class="ach-grid">${ACHIEVEMENTS.map(([id,name,desc,xp])=>{const done=data.progress.seen.includes(id);return `<div class="ach ${done?'is-done':''}"><span class="ach-badge">${done?'★':'🔒'}</span><span><strong>${safe(name)}</strong><small>${safe(desc)}</small></span><b>+${xp}</b></div>`;}).join('')}</div></section>
<section class="hub-block hub-data"><div><p class="eyebrow">CLUB DATA</p><p class="caption">Everything is saved on this device. Make a backup now and then.</p></div><div class="hero-actions">${btn('Export backup','export-backup','button button-secondary')}${btn('Restore backup','import-backup','button button-quiet')}</div></section>`;
    },
    matches:()=>`${heading('Fixtures & results','Build a clear season schedule. Add scores after the final whistle.',btn('＋ New match','quick-match'))}<section class="panel match-list">${data.matches.length?matchRows():empty('Fixtures start here','Add your next match, then use it to build a club poster.','quick-match','Add a match')}</section>`,
    squad:()=>{
      const active=data.cardTemplates.find(t=>t.id===data.activeCardTemplateId)||data.cardTemplates[0],filter=data.cardTemplateFilter||'all';
      const countFor=id=>data.squad.filter(p=>p.templateId===id).length,roster=data.squad.filter(p=>filter==='all'||p.templateId===filter);
      const filterName=filter==='all'?'All players':filter==='gfc-original'?'Original GFC cards':data.cardTemplates.find(t=>t.id===filter)?.name||'Filtered cards';
      return `${heading('Squad & card templates','Build a reusable card design, then apply it to players across the squad.',btn('＋ Create player card','card-editor'))}<section class="template-workbench panel"><div class="template-workbench-head"><div><p class="eyebrow">CARD TEMPLATE STUDIO</p><h3>Import or choose a card design</h3><p class="caption">Templates keep their own photo, logo, number, name, position, and rating placements. Editing a template redraws every player card that uses it.</p></div><div class="template-workbench-actions">${btn('Import PSD / image','import-template','button button-secondary')}${btn('Arrange active template','edit-active-template','button button-primary')}${btn('Apply to all players','apply-active-template','button button-quiet')}${btn('Manage fonts','manage-fonts','button button-quiet')}</div></div><input id="cardTemplateFile" type="file" accept=".psd,.psb,image/png,image/jpeg,image/webp" hidden><p class="template-import-note">Accepts PNG, JPG, WebP, and PSD / PSB saved as 8-bit RGB or grayscale. A PSD / PSB imports as one flattened picture: Photoshop layers, masks, smart objects, text and effects are not editable here, so hide sample player art and text in Photoshop first. The player photo, crest, name, number, position, and rating stay movable app layers on top.</p><div class="template-controls"><label class="field"><span class="field-label">Template for new cards</span><select id="activeCardTemplate" class="select">${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===active?.id?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label><label class="field"><span class="field-label">Filter squad cards</span><select id="cardTemplateFilter" class="select"><option value="all" ${filter==='all'?'selected':''}>All players · ${data.squad.length}</option><option value="gfc-original" ${filter==='gfc-original'?'selected':''}>Original GFC cards · ${countFor('gfc-original')}</option>${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${filter===t.id?'selected':''}>${safe(t.name)} · ${countFor(t.id)}</option>`).join('')}</select></label></div><div class="template-gallery">${data.cardTemplates.map(t=>`<article class="template-tile ${t.id===active?.id?'is-active':''}"><button class="template-thumb" type="button" data-action="activate-template-${safe(t.id)}" aria-label="Use ${safe(t.name)} template"><img data-template-thumb="${safe(t.id)}" src="${BLANK_IMG}" alt=""><i>${t.id===active?.id?'ACTIVE':'USE TEMPLATE'}</i></button><div class="template-tile-copy"><strong>${safe(t.name)}</strong><small>${countFor(t.id)} player cards</small></div><div class="template-tile-actions"><button class="button button-quiet button-small" type="button" data-action="edit-template-${safe(t.id)}">Arrange</button>${btn('Duplicate','duplicate-template-'+safe(t.id),'button button-quiet button-small')}${btn('Apply to squad','apply-template-'+safe(t.id),'button button-secondary button-small')}${t.id==='gfc-classic'?'':btn('Delete','delete-template-'+safe(t.id),'button button-quiet button-small')}</div></article>`).join('')}</div><p class="caption storage-note" id="storageNote"></p></section><div class="squad-roster-heading"><div><p class="eyebrow">PLAYER ROSTER</p><h3>${safe(filterName)}</h3></div><span>${roster.length} shown</span></div><div class="player-card-grid">${roster.map(p=>cardTile(p)).join('')||'<p class="caption">No players use this template yet. Choose a template from a player’s card menu, or create a player card with this template.</p>'}</div>`;
    },
    packs:()=>packView(),
    formation:()=>{
      const bd=board(),shapes=shapesFor(bd.size),n=bd.shape,layers=formationLayers(n),used=[];
      const tier=p=>p.rating==null?'tier-gold':p.rating>=85?'tier-icon':p.rating>=75?'tier-gold':p.rating>=65?'tier-silver':'tier-bronze';
      const slots=layers.map((line,li)=>line.map((pos,i)=>{
        const key=`${li}-${i}`,id=bd.slots[key]||'',player=data.squad.find(p=>p.id===id),xy=slotXY(bd,li,i,line.length,layers.length);if(id)used.push(id);
        return `<div class="fc-slot ${player?'has-player':''}" style="left:${xy.x*100}%;top:${xy.y*100}%">${player?`<div class="fc-card ${tier(player)} ${pendingTacticPlayer?.id===player.id?'is-selected':''}" data-tactic-player="${player.id}" data-from-slot="${key}" tabindex="0" role="button" aria-label="${safe(player.name)}, ${safe(player.position)}, shirt ${safe(player.number)}. Drag to move, or tap and then tap a spot."><img src="${safe(player.card||player.photo||BLANK_IMG)}" data-template-player="${safe(player.id)}" alt="" draggable="false"><span class="fc-name">${safe(player.name)}</span></div>`:`<span class="fc-empty" aria-label="Empty ${pos} position">${pos}</span>`}</div>`;
      }).join('')).join('');
      const other=otherTeamIds(),subs=data.squad.filter(p=>!used.includes(p.id)&&!other.includes(p.id)),rated=used.map(id=>data.squad.find(p=>p.id===id)).filter(p=>p&&p.rating!=null),ovr=rated.length?Math.round(rated.reduce((s,p)=>s+Number(p.rating),0)/rated.length):'–';
      return `${heading('Formation','Drag cards anywhere on the pitch. Drop one on another card to swap, or back on the bench to take it off.',btn('Create formation poster','formation-poster'))}${matchBar()}<section class="panel formation-toolbar"><label class="field-label" for="formationSize">Squad format</label><select id="formationSize" class="select"><option value="11" ${bd.size===11?'selected':''}>11-a-side</option><option value="7" ${bd.size===7?'selected':''}>7-a-side</option></select><label class="field-label" for="formationShape">Formation</label><select id="formationShape" class="select">${shapes.map(s=>`<option ${s===n?'selected':''}>${s}</option>`).join('')}</select>${btn('Auto-fill','auto-fill','button button-secondary')}${Object.keys(bd.pos||{}).length?btn('Reset positions','reset-positions','button button-quiet'):''}<span class="fc-ovr"><small>TEAM OVR</small><b>${ovr}</b></span></section><section class="fc-screen"><div class="fc-pitch-wrap"><div class="fc-pitch" data-pitch><div class="fc-mark fc-mark-half"></div><div class="fc-mark fc-mark-circle"></div><div class="fc-mark fc-mark-box-top"></div><div class="fc-mark fc-mark-box-bottom"></div>${slots}</div></div><aside class="fc-bench substitutes"><div class="substitutes-head"><div><p class="eyebrow">BENCH</p><h3>Squad</h3></div><span>${subs.length} available</span></div><div class="fc-deck">${subs.map(p=>`<div class="fc-card fc-bench-card ${tier(p)} ${pendingTacticPlayer?.id===p.id?'is-selected':''}" data-tactic-player="${p.id}" data-from-slot="" tabindex="0" role="button" aria-label="${safe(p.name)}, ${safe(p.position)}, shirt ${safe(p.number)}. Drag onto the pitch, or tap and then tap a spot."><img src="${safe(p.card||p.photo||BLANK_IMG)}" data-template-player="${safe(p.id)}" alt="" draggable="false"><span class="fc-name">${safe(p.name)}</span></div>`).join('')||'<p class="caption">Everyone available is on the pitch.</p>'}</div></aside></section>`;
    },
    growth:()=>{const latest=data.growth[data.growth.length-1];const metric=key=>latest?.[key]??'—';return `${heading('Club growth','Record real numbers over time to see what is working.',btn('＋ Add snapshot','add-growth'))}<section class="growth-metrics"><div class="growth-metric"><span class="growth-label">Instagram followers</span><strong class="growth-number">${metric('followers')}</strong></div><div class="growth-metric"><span class="growth-label">Active squad</span><strong class="growth-number">${metric('members')}</strong></div><div class="growth-metric"><span class="growth-label">Average attendance</span><strong class="growth-number">${metric('attendance')}</strong></div><div class="growth-metric"><span class="growth-label">Post reach</span><strong class="growth-number">${metric('reach')}</strong></div></section><section class="panel"><div class="panel-header"><div><p class="eyebrow">MEASURED BY YOU</p><h3>Growth over time</h3></div><span class="caption">Only your recorded snapshots appear here.</span></div>${data.growth.length>1?`<div class="growth-chart">${chartSvg()}</div>`:empty(data.growth.length?'Add another snapshot to see a trend':'No growth data yet','Add a monthly snapshot from your club records. Nothing is estimated.')}</section><section class="panel snapshot-list"><div class="panel-header"><h3>Snapshots</h3></div>${data.growth.length?[...data.growth].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`<div class="post-row"><div class="post-row-main"><strong>${fmtDate(g.date)}</strong><span>${g.followers??'—'} followers · ${g.members??'—'} players · ${g.attendance??'—'} attendance · reach ${g.reach??'—'}</span></div>${btn('Remove','delete-growth-'+g.id,'button button-quiet button-small')}</div>`).join(''):'<p class="caption">Your snapshots will be listed here.</p>'}</section>`;},
    instagram:()=>{const upcomingPosts=[...data.posts].sort((a,b)=>a.dateTime.localeCompare(b.dateTime));return `${heading('Instagram planner','Prepare captions and schedule reminders for @genmudafc.',btn('＋ Plan a post','add-post'))}<div class="planner-layout"><section class="panel"><div class="panel-header"><div><p class="eyebrow">CONTENT QUEUE</p><h3>Upcoming posts</h3></div><span>${upcomingPosts.filter(p=>p.status==='planned').length} planned</span></div>${upcomingPosts.length?`<div class="post-list">${upcomingPosts.map(p=>`<article class="post-row"><div class="post-thumb">${p.image?`<img src="${safe(p.image)}" alt="">`:'GFC'}</div><div class="post-row-main"><span class="meta-label">${fmtDate(p.dateTime.slice(0,10))} · ${fmtTime(p.dateTime)}</span><strong>${safe(p.title)}</strong><span>${safe(p.caption).slice(0,100)}</span><span class="status-tag ${p.status==='posted'?'is-complete':'is-planned'}">${p.status==='posted'?'Marked posted':'Planned reminder'}</span></div><div class="table-actions">${p.status==='planned'?btn('Mark posted','posted-'+p.id,'button button-secondary button-small'):''}${btn('Remove','delete-post-'+p.id,'button button-quiet button-small')}</div></article>`).join('')}</div>`:empty('Your content queue is clear','Plan matchday announcements, results, and club updates here.','add-post','Plan a post')}</section><aside class="panel"><p class="eyebrow">PUBLISHING</p><h3>Keep @genmudafc on schedule</h3><p class="caption">This planner saves locally and can prepare reminders and captions. Direct Instagram publishing needs a connected Meta business account and authorised publishing setup.</p><div class="notice"><strong>Manual publishing is ready</strong><span>Download your poster, copy the caption, then publish in Instagram. Mark it posted here afterward.</span></div><div class="poster-actions">${btn('Export calendar (.ics)','export-ics','button button-secondary')}${btn('Build a poster','goto-studio','button button-quiet')}</div></aside></div>`;}
  };
  const CARD_W=902,CARD_H=1389,PREVIEW_W=451,PREVIEW_H=694;
  const BLANK_IMG='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const cardImageCache=new Map(),loadedCardFonts=new Set(),cardUrlCache=new Map();
  const clubTabs=k=>`<div class="pack-tabs"><button type="button" class="team-tab ${k==='growth'?'is-active':''}" data-nav="growth">Growth</button><button type="button" class="team-tab ${k==='instagram'?'is-active':''}" data-nav="instagram">Instagram planner</button></div>`;
  {const g=views.growth,ig=views.instagram;views.growth=()=>clubTabs('growth')+g();views.instagram=()=>clubTabs('instagram')+ig();}
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
    const layers=template.layers||[],photoSrc=player.photo||'assets/brand/gfc-circle.jpg';
    await ensureFonts();
    const families=new Set(layers.filter(l=>l.type==='text'&&l.visible!==false).map(l=>l.font||'Winner GFC'));
    await Promise.all([...families].map(f=>document.fonts.load(`700 24px "${f}"`).catch(()=>{})));
    const sources=new Set([template.background,photoSrc,...layers.filter(l=>l.type==='logo').map(l=>l.src||'assets/brand/gfc-crest.png')].filter(Boolean)),loaded=new Map();
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
        const im=loaded.get(layer.src||'assets/brand/gfc-crest.png');if(!im)continue;ctx.save();
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
      catch{node.src=p.photo||'assets/brand/gfc-circle.jpg';if(!renderWarned){renderWarned=true;toast(location.protocol==='file:'?'Cards cannot be drawn from a file:// address. Start the local server from the README and open http://localhost:4173.':'A player card could not be drawn. Try reloading the app.');}}
    });
    const sample=data.squad.find(p=>p.photo)||{name:'PLAYER',number:'22',position:'ST',rating:82,photo:'assets/brand/gfc-circle.jpg'};
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
    const previewPlayer=()=>data.squad.find(p=>p.id===$('#tplPreviewPlayer').value)||{name:'PLAYER',number:'22',position:'ST',rating:82,photo:'assets/brand/gfc-circle.jpg'};
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
  async function drawPitchPanel(ctx,x,y,w,h,team,hf,cap=86){
    const layers=formationLayers(team.shape),maxN=Math.max(...layers.map(l=>l.length)),cw=Math.min(w/(maxN+.6)*.82,cap),chh=cw*1.5;
    ctx.save();ctx.strokeStyle='rgba(255,247,245,.92)';ctx.lineWidth=Math.max(2,w/190);
    const L=x+6,R=x+w-6,T=y+6,B=y+h-6,mx=(L+R)/2,mid=(T+B)/2;
    ctx.beginPath();ctx.moveTo(L+(R-L)*.0,B);ctx.lineTo(L,T+(B-T)*.08);ctx.lineTo(L+(R-L)*.06,T);ctx.lineTo(R-(R-L)*.06,T);ctx.lineTo(R,T+(B-T)*.08);ctx.lineTo(R,B);ctx.stroke();
    ctx.beginPath();ctx.moveTo(L,mid);ctx.lineTo(R,mid);ctx.stroke();ctx.beginPath();ctx.arc(mx,mid,(R-L)*.09,0,Math.PI*2);ctx.stroke();
    ctx.strokeRect(L+(R-L)*.2,T,(R-L)*.6,(B-T)*.14);ctx.strokeRect(L+(R-L)*.34,B-(B-T)*.075,(R-L)*.32,(B-T)*.075);ctx.strokeRect(L+(R-L)*.2,B-(B-T)*.14,(R-L)*.6,(B-T)*.14);
    for(let li=0;li<layers.length;li++){const line=layers[li];for(let i=0;i<line.length;i++){
      const sp=slotXY(team,li,i,line.length,layers.length),cx=x+sp.x*w,cy=y+sp.y*h,p=data.squad.find(q=>q.id===team.slots[`${li}-${i}`]),x0=cx-cw/2,y0=cy-chh/2;
      ctx.textAlign='center';
      if(p){
        const im=await posterImg(p.card);
        if(im){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=10;ctx.drawImage(im,x0,y0,cw,chh);ctx.shadowBlur=0;}
        else{const ph=await posterImg(p.photo);ctx.save();ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,y0,cw,chh,8):ctx.rect(x0,y0,cw,chh);ctx.fillStyle='#4a0a10';ctx.fill();ctx.clip();if(ph){const s=Math.max(cw/ph.width,chh*.75/ph.height);ctx.drawImage(ph,cx-ph.width*s/2,y0,ph.width*s,ph.height*s);}ctx.restore();
          ctx.fillStyle='rgba(20,4,6,.82)';ctx.fillRect(x0,y0+chh*.72,cw,chh*.28);ctx.fillStyle='#fff';ctx.textBaseline='middle';let nf=Math.min(cap*.18,cw*.2);ctx.font=`bold ${nf}px ${hf}`;const name=String(p.name).toUpperCase();while(ctx.measureText(name).width>cw-6&&nf>7){nf-=.5;ctx.font=`bold ${nf}px ${hf}`;}ctx.fillText(name,cx,y0+chh*.86);}
      }else{ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(255,247,245,.55)';ctx.lineWidth=2;ctx.strokeRect(x0,y0,cw,chh);ctx.restore();ctx.fillStyle='rgba(255,247,245,.7)';ctx.textBaseline='middle';ctx.font=`bold ${Math.max(10,cw*.24)}px ${hf}`;ctx.fillText(line[i],cx,cy);}
    }}
    ctx.restore();
  }
  // ---- Match pack: one art style per match, shared by every poster of that match ----
  const PACK_W=1080,PACK_KINDS=[['next','Next match'],['matchday','Matchday'],['score','Full time'],['lineupA','Line-up A'],['lineupB','Line-up B'],['rosterA','Squad list A'],['rosterB','Squad list B']];
  const PACK_DEFAULT={bg:'',fx:50,fy:45,tint:.55,shade:.3,vignette:.55,grain:.4,primary:'#ed1c24',font:'',format:'feed',layouts:{}};
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
  const packLayout=(pack,kind,id)=>pack.layouts[kind]?.[id]||{};
  async function renderPack(canvas,m,pack,kind){
    const token=++packToken,story=pack.format==='story',W=PACK_W,H=story?1920:1350;
    await ensureFonts();const hf=posterFontStack(pack.font);try{await document.fonts.load(`700 40px ${hf}`);}catch{}
    const bg=pack.bg?await posterImg(pack.bg):null,logo=await posterImg('assets/brand/gfc-circle.jpg');
    const lineup=kind.startsWith('lineup')?peek(m.id,kind.slice(-1))||{size:11,shape:'4-3-3',slots:{}}:null;
    if(lineup)for(const id of Object.values(lineup.slots)){const p=data.squad.find(q=>q.id===id);if(p){await posterImg(p.card);await posterImg(p.photo);}}
    if(token!==packToken)return;
    canvas.width=W;canvas.height=H;canvas.style.aspectRatio=`${W} / ${H}`;
    const ctx=canvas.getContext('2d'),red=pack.primary;ctx.fillStyle='#140306';ctx.fillRect(0,0,W,H);
    if(bg){const s=Math.max(W/bg.width,H/bg.height),sw=W/s,sh=H/s;ctx.drawImage(bg,(bg.width-sw)*pack.fx/100,(bg.height-sh)*pack.fy/100,sw,sh,0,0,W,H);}
    else{const g=ctx.createRadialGradient(W*.5,H*.45,W*.1,W*.5,H*.5,H*.75);g.addColorStop(0,'#b5141a');g.addColorStop(.6,'#5e0a10');g.addColorStop(1,'#140306');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    if(bg&&pack.tint>0){ctx.globalAlpha=pack.tint;ctx.globalCompositeOperation='saturation';ctx.fillStyle='#808080';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='multiply';ctx.fillStyle=red;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
    if(pack.shade>0){ctx.fillStyle=`rgba(10,2,4,${pack.shade})`;ctx.fillRect(0,0,W,H);}
    if(pack.vignette>0){const v=ctx.createRadialGradient(W/2,H/2,W*.35,W/2,H/2,H*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${pack.vignette})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H);}
    ctx.fillStyle='rgba(255,255,255,.06)';for(let i=0,n=Math.round(pack.grain*5000);i<n;i++){const s=(i*9301+49297)%233280;ctx.fillRect(s%W,(s*7)%H,1.6,1.6);}
    if(lineup)await drawPitchPanel(ctx,40,H*.2,W-80,H*.69,lineup,hf,140);
    const boxes={};
    for(const el of packElements(kind,m)){
      const ov=packLayout(pack,kind,el.id);if(ov.hide)continue;
      const x=(ov.x??el.x)*W,y=(ov.y??el.y)*H,size=(ov.s??el.s)*W,text=ov.text??el.text,align=el.align||'center';
      if(el.type==='logo'){if(logo){ctx.save();ctx.beginPath();ctx.arc(x,y,size/2,0,Math.PI*2);ctx.clip();ctx.drawImage(logo,x-size/2,y-size/2,size,size);ctx.restore();}boxes[el.id]={x:x-size/2,y:y-size/2,w:size,h:size};continue;}
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
  async function packBlob(m,pack,kind){
    const c=document.createElement('canvas');c.dataset.export='1';await renderPack(c,m,pack,kind);
    return new Promise(r=>c.toBlob(r,'image/png'));
  }
  const packMatch=()=>data.matches.find(x=>x.id===packUi.matchId);
  const packRepaint=()=>{const c=$('#packCanvas'),m=packMatch();if(c&&m)packPaint=renderPack(c,m,getPack(m.id),packUi.kind);return packPaint;};
  function packView(){
    if(!data.matches.length)return heading('Match pack','Every match gets its own art style, shared by all of its posters.')+empty('Add a match first','A pack is built for one match, then every poster for that match follows its style.','quick-match','Add a match');
    if(!data.matches.some(x=>x.id===packUi.matchId))packUi.matchId=(data.matches.find(x=>x.id===data.formation.matchId)||upcoming()||data.matches[0]).id;
    const matches=[...data.matches].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `${heading('Match pack','One art style per match. Set it once, then every poster for that match follows it. Drag any text on the poster to move it.',btn('Export all posters','pack-export-all')+btn('Export this poster','pack-export','button button-secondary'))}
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
    const sliders=[['tint','Red tint on photo',0,1,.05],['shade','Darken',0,.8,.05],['vignette','Vignette',0,.9,.05],['grain','Film grain',0,1,.05],['fx','Photo position · left to right',0,100,1],['fy','Photo position · top to bottom',0,100,1]];
    $('#packStyle').innerHTML=`<h3>Style for this match</h3><label class="field"><span class="field-label">Background (PSD, PSB, PNG, JPG)</span><input class="input" type="file" id="packBg" accept=".psd,.psb,.png,.jpg,.jpeg,.webp"></label>${pack.bg?'<button class="button button-quiet button-small" type="button" id="packBgClear">Remove background</button>':'<p class="caption">No background yet, so the default red gradient is used. A Photoshop file is flattened into one picture; layers are not kept.</p>'}<div id="packBgNote" class="caption"></div>${sliders.map(([k,l,lo,hi,st])=>`<label class="field"><span class="field-label">${l}</span><input type="range" data-pack-range="${k}" min="${lo}" max="${hi}" step="${st}" value="${pack[k]}"></label>`).join('')}<label class="field"><span class="field-label">Heading font</span><select class="select" id="packFont">${[['','Default (Winner GFC)'],...fontChoices().map(n=>[n,n])].map(([v,l])=>`<option value="${safe(v)}" ${v===pack.font?'selected':''}>${safe(l)}</option>`).join('')}</select></label><div class="pack-row"><label class="field"><span class="field-label">Accent colour</span><input class="input" type="color" id="packColor" value="${pack.primary}"></label><label class="field"><span class="field-label">Format</span><select class="select" id="packFormat"><option value="feed" ${pack.format==='feed'?'selected':''}>Feed 4:5</option><option value="story" ${pack.format==='story'?'selected':''}>Story 9:16</option></select></label></div><button class="button button-quiet button-small" type="button" data-action="manage-fonts">Manage fonts</button>`;
    $$('[data-pack-range]',$('#packStyle')).forEach(r=>r.oninput=()=>{pack[r.dataset.packRange]=Number(r.value);packRepaint();save();});
    $('#packFont').onchange=e=>{pack.font=e.target.value;packRepaint();save();};
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
    const canvas=$('#packCanvas');canvas.style.touchAction=packUi.selected?'none':'auto';let drag=null,raf=0;
    canvas.onpointerdown=e=>{
      const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)*canvas.width/r.width,py=(e.clientY-r.top)*canvas.height/r.height;
      const id=Object.keys(packUi.boxes).reverse().find(k=>{const b=packUi.boxes[k];return px>=b.x-10&&px<=b.x+b.w+10&&py>=b.y-10&&py<=b.y+b.h+10;});
      if(!id){if(packUi.selected){packUi.selected='';setPage('packs');}return;}
      const el=els.find(x=>x.id===id),ov=packLayout(pack,packUi.kind,id),wasSelected=packUi.selected===id;packUi.selected=id;
      drag={id,sx:e.clientX,sy:e.clientY,ox:ov.x??el.x,oy:ov.y??el.y,rw:r.width,rh:r.height,moved:false,wasSelected};canvas.setPointerCapture(e.pointerId);e.preventDefault();
    };
    canvas.onpointermove=e=>{if(!drag)return;const dx=(e.clientX-drag.sx)/drag.rw,dy=(e.clientY-drag.sy)/drag.rh;if(!drag.moved&&Math.hypot(dx*drag.rw,dy*drag.rh)<4)return;drag.moved=true;
      const o=((pack.layouts[packUi.kind]??={})[drag.id]??={});o.x=cl(drag.ox+dx,0,1);o.y=cl(drag.oy+dy,0,1);if(!raf)raf=requestAnimationFrame(()=>{raf=0;packRepaint();});};
    canvas.onpointerup=canvas.onpointercancel=()=>{if(!drag)return;const d=drag;drag=null;if(d.moved)save();setPage('packs');};
    packRepaint();
  }
  async function exportPack(all){
    const m=packMatch();if(!m)return;const pack=getPack(m.id),kinds=all?PACK_KINDS.map(k=>k[0]).filter(k=>!/^(lineup|roster)/.test(k)||placedCount(m.id,k.slice(-1))):[packUi.kind];
    if(!kinds.length)return;toast(all?`Exporting ${kinds.length} posters…`:'Exporting…');
    for(const k of kinds){const blob=await packBlob(m,pack,k);if(!blob){toast('Could not export a poster. Please try again.');return;}download(blob,`GFC-${(m.opponent||'match').replace(/[^\w]+/g,'-')}-${k}.png`);if(all)await new Promise(r=>setTimeout(r,500));}
    data.progress.exports+=kinds.length;persist();toast(all?'Pack exported.':'Poster exported.');
  }
  // ---- Club progress: levels, XP, streak and achievements are worked out from the club's own data ----
  const fullTeam=t=>t&&Object.keys(t.slots).length>=t.size;
  const ACHIEVEMENTS=[
    ['fixture','First fixture','Add a match',20,()=>data.matches.length>=1],
    ['season','Season planner','Have 5 fixtures',40,()=>data.matches.length>=5],
    ['result','Full time','Log a final score',30,()=>data.matches.some(m=>m.home!=null&&m.away!=null)],
    ['lineup','Line-up locked','Fill every position in one team',40,()=>Object.values(data.lineups).some(s=>fullTeam(s.A)||fullTeam(s.B))],
    ['both','Two squads','Fill Team A and Team B for one match',60,()=>Object.values(data.lineups).some(s=>fullTeam(s.A)&&fullTeam(s.B))],
    ['pack','Art director','Add a background to a match pack',50,()=>Object.values(data.packs).some(p=>p.bg)],
    ['export','On the feed','Export a poster',30,()=>data.progress.exports>=1],
    ['content','Content machine','Export 10 posters',80,()=>data.progress.exports>=10],
    ['template','Card designer','Create your own card template',50,()=>data.cardTemplates.length>1],
    ['font','Type nerd','Add a font',20,()=>data.fonts.length>=1],
    ['growth','Growth tracker','Record a growth snapshot',20,()=>data.growth.length>=1],
    ['planner','Content planner','Plan an Instagram post',20,()=>data.posts.length>=1],
    ['squad','Full squad','Have 22 players',30,()=>data.squad.length>=22]
  ];
  const LEVEL_TITLES=['Rookie','Academy','Starter','Pro','Captain','Legend'];
  const xpTotal=()=>ACHIEVEMENTS.filter(a=>data.progress.seen.includes(a[0])).reduce((n,a)=>n+a[3],0)+data.progress.exports*10;
  function levelInfo(){const xp=xpTotal();let level=1;while(xp>=100*level*(level+1)/2)level++;const from=100*(level-1)*level/2,to=100*level*(level+1)/2;return {xp,level,title:LEVEL_TITLES[Math.min(level-1,LEVEL_TITLES.length-1)],pct:Math.round((xp-from)*100/(to-from)),next:to-xp};}
  function streak(){const days=new Set(data.progress.days);let n=0;const d=new Date(today()+'T00:00:00');if(!days.has(today()))d.setDate(d.getDate()-1);for(;;n++){const k=d.toISOString().slice(0,10);if(!days.has(k))break;d.setDate(d.getDate()-1);}return n;}
  function renderChip(){const c=$('#xpChip');if(!c||!data)return;const l=levelInfo();c.innerHTML=`<b>LV ${l.level}</b><span class="xp-bar"><i style="width:${l.pct}%"></i></span><small>${safe(l.title)}</small>`;}
  function checkProgress(){
    const fresh=ACHIEVEMENTS.filter(a=>!data.progress.seen.includes(a[0])&&a[4]());
    if(fresh.length){data.progress.seen.push(...fresh.map(a=>a[0]));toast(`Achievement unlocked: ${fresh.map(a=>a[1]).join(', ')} · +${fresh.reduce((n,a)=>n+a[3],0)} XP`);persistSoon();}
    renderChip();
  }
  function cardTile(p){
    const original=initialSquad.find(q=>q.id===p.id),templateName=p.templateId==='gfc-original'?'Original GFC card':data.cardTemplates.find(t=>t.id===p.templateId)?.name||'GFC template';
    const assign=`<label class="player-card-assign"><span class="field-label">Card template</span><select class="select" data-assign-template="${safe(p.id)}" aria-label="Card template for ${safe(p.name)}">${original?.card?`<option value="gfc-original" ${p.templateId==='gfc-original'?'selected':''}>Original GFC card</option>`:''}${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===p.templateId?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label>`;
    const art=p.templateId==='gfc-original'&&p.card?`<img class="player-card-art" src="${safe(p.card)}" alt="${safe(p.name)} GFC card · number ${safe(p.number)} · ${safe(p.position)}">`:`<img class="player-card-art" src="${BLANK_IMG}" data-template-player="${safe(p.id)}" alt="${safe(p.name)} GFC player card">`;
    return `<article class="player-card-shell">${art}<div class="player-card-tools"><span><strong>${safe(p.name)}</strong><small>#${safe(p.number)} · ${safe(p.position)}${p.rating!=null?' · '+safe(p.rating)+' OVR':''} · ${safe(templateName)}</small></span><span>${btn('Edit card','edit-player-'+p.id,'button button-quiet button-small')}${btn('PNG','export-player-'+p.id,'button button-secondary button-small')}</span>${assign}</div></article>`;
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
  if($('#formationMatch'))$('#formationMatch').addEventListener('change',()=>{data.formation.matchId=$('#formationMatch').value;pendingTacticPlayer=null;persist();setPage('formation');});
  $$('#appContent [data-team]').forEach(b=>b.addEventListener('click',()=>{data.formation.team=b.dataset.team;pendingTacticPlayer=null;persist();setPage('formation');}));
  if($('#formationShape'))$('#formationShape').addEventListener('change',()=>setFormation(board().size,$('#formationShape').value));
}
  function action(name){if(name==='quick-match'||name==='add-match')return matchDialog();if(name==='auto-fill')return autoFillFormation();if(name==='reset-positions'){board().pos={};persist();return setPage('formation');}if(name==='formation-poster')return makeFormationPoster();if(name==='pack-export')return exportPack(false);if(name==='pack-export-all')return exportPack(true);if(name==='manage-fonts')return fontManager();if(name==='goto-matches')return setPage('matches');if(name==='goto-squad')return setPage('squad');if(name==='add-player')return playerDialog();if(name==='card-editor')return cardEditor();if(name==='import-template')return $('#cardTemplateFile')?.click();if(name==='edit-active-template')return templateEditor(data.activeCardTemplateId);if(name==='apply-active-template')return applyTemplateToSquad(data.activeCardTemplateId);if(name.startsWith('apply-template-'))return applyTemplateToSquad(name.slice(15));if(name.startsWith('edit-template-'))return templateEditor(name.slice(14));if(name.startsWith('duplicate-template-'))return duplicateTemplate(name.slice(19));if(name.startsWith('delete-template-'))return deleteTemplate(name.slice(16));if(name.startsWith('activate-template-')){data.activeCardTemplateId=name.slice(18);persist();return setPage('squad');}if(name.startsWith('export-player-'))return exportPlayerCard(name.slice(14));if(name==='add-growth')return growthDialog();if(name==='add-post')return postDialog();if(name==='export-backup')return backup();if(name==='import-backup')return $('#backupImport').click();if(name==='goto-formation')return setPage('formation');if(name==='export-ics')return exportICS();if(name.startsWith('edit-match-'))return matchDialog(data.matches.find(m=>m.id===name.slice(11)));if(name.startsWith('delete-match-'))return deleteItem('matches',name.slice(13),'fixture');if(name.startsWith('poster-for-')){packUi.matchId=name.slice(11);packUi.kind=data.matches.find(m=>m.id===packUi.matchId)?.home!=null?'score':'next';return setPage('packs');}if(name.startsWith('edit-player-'))return cardEditor(data.squad.find(p=>p.id===name.slice(12)));if(name.startsWith('delete-growth-'))return deleteItem('growth',name.slice(14),'snapshot');if(name.startsWith('delete-post-'))return deleteItem('posts',name.slice(12),'post');if(name.startsWith('posted-')){const p=data.posts.find(x=>x.id===name.slice(7));p.status='posted';persist();setPage('instagram');toast('Marked as posted.');}}
  const modal=$('#modal');function openModal(title,body,submit='Save'){modal.oncancel=null;modal.innerHTML=`<div class="dialog-header"><div><p class="eyebrow">GFC CLUB DESK</p><h2 id="modalTitle">${title}</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div><form class="dialog-form"><div class="form-grid">${body}</div><div class="dialog-actions"><button class="button button-quiet" type="button" data-close>Cancel</button><button class="button button-primary" type="submit">${submit}</button></div></form>`;modal.showModal();$$('[data-close]',modal).forEach(b=>b.onclick=()=>modal.close());}
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
  function cardEditor(p={}){
    const selectedTemplate=p.templateId&&p.templateId!=='gfc-original'&&data.cardTemplates.some(t=>t.id===p.templateId)?p.templateId:data.activeCardTemplateId;let photoData='',cropTouched=false;
    const photoLayer=t=>t?.layers.find(l=>l.type==='photo')||{};
    const range=(id,label,val,min,max)=>`<label class="field"><span class="field-label">${label} · <b id="${id}Value">${val}</b></span><input class="input range-input" type="range" id="${id}" min="${min}" max="${max}" value="${val}"></label>`;
    const t0=data.cardTemplates.find(t=>t.id===selectedTemplate)||data.cardTemplates[0],crop=p.crop||{};
    const body=`${field('Player name','cardName',p.name||'','text','maxlength="40" required')}${field('Shirt number','cardNumber',p.number||'')}${`<label class="field"><span class="field-label">Position</span><select class="select" name="cardPosition">${['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(x=>`<option ${x===(p.position||'ST')?'selected':''}>${x}</option>`).join('')}</select></label>`}${field('Rating (optional)','cardRating',p.rating??'','number','min="1" max="99"')}${`<label class="field"><span class="field-label">Card template</span><select class="select" id="playerCardTemplate" name="templateId">${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===selectedTemplate?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label>`}${`<label class="field field-span-2"><span class="field-label">Player portrait</span><input class="input" id="playerCardPhoto" type="file" accept="image/*"><span class="field-help">A transparent PNG cut-out works best. The template controls the frame; the sliders below adjust this player’s crop.</span></label>`}${range('cardZoom','Photo zoom %',crop.zoom??photoLayer(t0).zoom??100,100,300)}${range('cardFocusX','Photo left / right',crop.x??photoLayer(t0).focusX??50,0,100)}${range('cardFocusY','Photo up / down',crop.y??photoLayer(t0).focusY??43,0,100)}${`<div class="card-template-preview field-span-2"><p class="field-label">Live card preview</p><canvas id="playerCardPreview" width="${PREVIEW_W}" height="${PREVIEW_H}"></canvas></div>`}`;
    openModal(p.id?'Edit player card':'Create player card',body,'Save player card');
    const form=$('.dialog-form',modal),canvas=$('#playerCardPreview'),currentPhoto=p.photo||'assets/brand/gfc-circle.jpg';
    const currentCrop=()=>cropTouched||p.crop?{zoom:Number($('#cardZoom').value),x:Number($('#cardFocusX').value),y:Number($('#cardFocusY').value)}:undefined;
    const draw=()=>{const template=data.cardTemplates.find(t=>t.id===$('#playerCardTemplate').value)||data.cardTemplates[0];return drawTemplateCard(canvas,{name:$('#cardName').value||'PLAYER',number:$('#cardNumber').value||'00',position:$('[name="cardPosition"]',form).value,rating:$('#cardRating').value===''?null:Number($('#cardRating').value),photo:photoData||currentPhoto,crop:currentCrop()},template);};
    $$('#modal input,#modal select').forEach(el=>el.addEventListener('input',draw));
    $('#playerCardTemplate').addEventListener('change',()=>{if(cropTouched||p.crop)return draw();const l=photoLayer(data.cardTemplates.find(t=>t.id===$('#playerCardTemplate').value));[['cardZoom',l.zoom??100],['cardFocusX',l.focusX??50],['cardFocusY',l.focusY??43]].forEach(([id,v])=>{$('#'+id).value=v;$('#'+id+'Value').textContent=v;});draw();});
    ['cardZoom','cardFocusX','cardFocusY'].forEach(id=>$('#'+id).addEventListener('input',()=>{cropTouched=true;$('#'+id+'Value').textContent=$('#'+id).value;}));
    $('#playerCardPhoto').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{photoData=await imageFileToDataUrl(file,1400);draw();}catch(error){e.target.value='';toast(error.message);}});
    draw();
    form.onsubmit=async e=>{
      e.preventDefault();const f=new FormData(form),name=String(f.get('cardName')).trim().toUpperCase();
      if(!name)return toast('Enter a player name.');
      if(!photoData&&!p.id)return toast('Choose a player portrait to build this card.');
      const templateId=f.get('templateId'),obj={...p,id:p.id||uid(),name,number:f.get('cardNumber'),position:f.get('cardPosition'),rating:f.get('cardRating')===''?null:Number(f.get('cardRating')),photo:photoData||currentPhoto,templateId,card:'',crop:currentCrop()};
      if(!obj.crop)delete obj.crop;
      const previous={squad:data.squad,active:data.activeCardTemplateId},i=data.squad.findIndex(x=>x.id===obj.id);
      data.squad=i>=0?data.squad.map(x=>x.id===obj.id?obj:x):[...data.squad,obj];data.activeCardTemplateId=templateId;
      if(!await persist()){data.squad=previous.squad;data.activeCardTemplateId=previous.active;return;}
      modal.close();setPage('squad');toast('Player saved with the selected template.');
    };
  }
  function playerDialog(p={}){openModal(p.id?'Edit player':'Add player',`${field('Name','name',p.name||'')}${field('Shirt number','number',p.number||'')}${`<label class="field"><span class="field-label">Position</span><select class="select" name="position">${['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(x=>`<option ${x===(p.position||'ST')?'selected':''}>${x}</option>`).join('')}</select></label>`}${field('Rating (optional)','rating',p.rating??'','number','min="1" max="99"')}${field('Portrait path (optional)','photo',p.photo||'')}`);$('.dialog-form',modal).onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const obj={id:p.id||uid(),name:f.get('name').trim().toUpperCase(),number:f.get('number'),position:f.get('position'),rating:f.get('rating')===''?null:Number(f.get('rating')),photo:f.get('photo')||'assets/brand/gfc-circle.jpg'};data.squad=data.squad.filter(x=>x.id!==obj.id).concat(obj);persist();modal.close();setPage('squad');toast('Player card saved.');};}
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

