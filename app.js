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
    const d={squad:Array.isArray(raw.squad)?raw.squad:initialSquad,cardTemplates:Array.isArray(raw.cardTemplates)?raw.cardTemplates.filter(t=>t&&t.id):[],activeCardTemplateId:raw.activeCardTemplateId||'gfc-classic',cardTemplateFilter:raw.cardTemplateFilter||'all',matches:raw.matches||[],growth:raw.growth||[],posts:raw.posts||[],formation:raw.formation||{size:11,shape:'4-3-3',slots:{},bench:[]},studio:raw.studio||{type:'next',opponent:'',competition:'',date:'',venue:'',home:0,away:'',headline:'NEXT MATCH',photo:'assets/brand/match-action.jpg',customPhoto:''}};
    d.cardTemplates.forEach(t=>{if(!Array.isArray(t.layers))t.layers=defaultCardTemplate().layers;t.width=t.width||902;t.height=t.height||1389;});
    if(!d.cardTemplates.some(t=>t.id==='gfc-classic'))d.cardTemplates.unshift(defaultCardTemplate());
    const known=id=>id==='gfc-original'||d.cardTemplates.some(t=>t.id===id);
    if(!known(d.activeCardTemplateId)||d.activeCardTemplateId==='gfc-original')d.activeCardTemplateId='gfc-classic';
    if(d.cardTemplateFilter!=='all'&&!known(d.cardTemplateFilter))d.cardTemplateFilter='all';
    d.squad=d.squad.map(p=>{const original=initialSquad.find(q=>q.id===p.id);let templateId=p.templateId||(String(p.card||'').startsWith('assets/cards/')?'gfc-original':'gfc-classic');if(!known(templateId)||(templateId==='gfc-original'&&!original?.card&&!p.card))templateId='gfc-classic';return {...original,...p,templateId,card:templateId==='gfc-original'?(original?.card||p.card||''):(p.card||'')};});
    d.fonts=Array.isArray(raw.fonts)?raw.fonts.filter(x=>x&&x.name&&x.src).map(x=>({name:x.name,src:x.src})):[];
    d.cardTemplates.forEach(t=>{if(Array.isArray(t.fonts)){t.fonts.forEach(x=>{if(x&&x.name&&x.src&&!d.fonts.some(y=>y.name===x.name))d.fonts.push({name:x.name,src:x.src});});delete t.fonts;}});
    const old=raw.formation||{};d.lineups=raw.lineups&&typeof raw.lineups==='object'?raw.lineups:{};
    if(old.slots&&Object.keys(old.slots).length&&!d.lineups.practice)d.lineups.practice={A:{size:old.size,shape:old.shape,slots:old.slots}};
    d.formation={matchId:old.matchId||'',team:old.team==='B'?'B':'A',colors:{primary:'#ed1c24',base:'#160b0e',line:'#fff7f5',...(old.colors||{})}};
    if(d.formation.matchId&&!d.matches.some(x=>x.id===d.formation.matchId))d.formation.matchId='';
    for(const set of Object.values(d.lineups)){const seen=new Set();for(const team of ['A','B']){const t=set[team];if(!t||typeof t!=='object'){delete set[team];continue;}t.size=t.size===7?7:11;if(!shapesFor(t.size).includes(t.shape))t.shape=shapesFor(t.size)[0];t.slots=t.slots&&typeof t.slots==='object'?t.slots:{};const valid=new Set();formationLayers(t.shape).forEach((line,li)=>line.forEach((_,i)=>valid.add(`${li}-${i}`)));for(const [key,id] of Object.entries(t.slots)){if(!valid.has(key)||!d.squad.some(p=>p.id===id)||seen.has(id))delete t.slots[key];else seen.add(id);}}}
    d.studio={format:'feed',fit:'crop',focusX:50,focusY:45,...d.studio};
    if(!d.studio.opponent&&d.studio.home===0&&d.studio.away===0)d.studio.home=d.studio.away='';
    return d;
  }
  let page = 'overview';
  let toastTimer;
  let posterPaint=Promise.resolve();
  let pendingTacticPlayer=null;
  let activeTacticDrag=null;
  let suppressTacticClickUntil=0;
  const posterImages=new Map();
  const pages = {overview:'Overview',matches:'Matches',studio:'Poster studio',squad:'Squad',formation:'Formation',growth:'Club growth',instagram:'Instagram planner'};
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
    const snap=structuredClone({...data,studio:{...data.studio,customPhoto:''},savedAt:Date.now()});
    pendingSaves++;setSaveState('Saving…');
    const run=saveChain
      .then(async()=>{try{await dbRun('readwrite',s=>s.put(snap,STORE));}catch(dbError){console.warn('Database save failed; trying localStorage.',dbError);localStorage.setItem(STORE,JSON.stringify(snap));}})
      .then(()=>true,error=>{console.error(error);toast('Could not save. Export a club backup now, then free up browser storage or use smaller images.');return false;})
      .then(ok=>{pendingSaves--;setSaveState(ok?message:'Not saved · export backup');return ok;});
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
    data=normalize(raw);await ensureFonts();
    try{navigator.storage?.persist?.();}catch{}
    setPage('overview');
    if(migrate)persist('Moved to browser database');
    if(location.protocol==='file:')toast('Open the app through the local server (see README). From a file:// address, card previews and PNG export are blocked by the browser.');
  }
  function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('is-visible'),Math.max(2600,String(message).length*60)); }
  const fmtDate = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) : 'Date to be confirmed';
  const fmtTime = d => d ? new Date(d).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  function setPage(key) { if(!pages[key]) return; if(key!=='formation')pendingTacticPlayer=null; page=key; $$('.nav-item[data-nav]').forEach(b=>{b.classList.toggle('is-active',b.dataset.nav===key); if(b.dataset.nav===key)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}); $('#pageTitle').textContent=pages[key]; $('#appContent').innerHTML=views[key](); if(key==='studio') addStudioControls(); if(key==='formation') addFormationColors(); $('#sidebar').classList.remove('is-open'); bindView(); if(key==='squad'||key==='formation')requestAnimationFrame(renderDynamicCards);if(key==='squad')showStorage(); }
  const heading=(title,desc,action='')=>`<div class="page-heading"><div class="page-heading-copy"><p class="eyebrow">GAMUDA FOOTBALL CLUB</p><h2>${title}</h2><p class="lead">${desc}</p></div>${action?`<div class="page-actions">${action}</div>`:''}</div>`;
  const btn=(label,action,cls='button button-primary',extra='')=>`<button class="${cls}" type="button" data-action="${action}" ${extra}>${label}</button>`;
  const empty=(title,body,action,label)=>`<div class="empty-state"><span class="empty-mark">G</span><h3>${title}</h3><p>${body}</p>${action?btn(label,action,'button button-secondary'):''}</div>`;
  const upcoming=()=>[...data.matches].filter(m=>m.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const matchRows=()=> [...data.matches].sort((a,b)=>a.date.localeCompare(b.date)).map(m=>`<article class="match-row ${m.date<today()?'is-complete':''}"><div class="match-row-main"><span class="meta-label">${fmtDate(m.date)}${m.time?` · ${safe(m.time)}`:''}</span><h3>${safe(m.opponent||'Opponent to be confirmed')}</h3><span>${safe(m.competition||'Friendly')}${m.venue?` · ${safe(m.venue)}`:''}</span></div><div class="match-row-score">${m.home!=null&&m.away!=null?`${m.home} — ${m.away}`:'VS'}</div><div class="table-actions">${btn('Poster','poster-for-'+m.id,'button button-quiet button-small')}${btn('Edit','edit-match-'+m.id,'button button-quiet button-small')}${btn('Remove','delete-match-'+m.id,'button button-quiet button-small')}</div></article>`).join('');
  const views={
    overview:()=>{const n=upcoming();return `<section class="club-hero"><div class="club-hero-copy"><p class="eyebrow">YOUR CLUB, IN ONE PLACE</p><h2>Make every match<br>count.</h2><p>Manage fixtures, shape your squad, and keep your club story moving.</p><div class="hero-actions">${btn('Create matchday','quick-match')} ${btn('Build a poster','goto-studio','button button-secondary')}</div></div><div class="club-hero-photo"><img src="assets/brand/match-action.jpg" alt="Gamuda FC players in match action"><span class="club-hero-mark"><img src="assets/brand/gfc-circle.jpg" alt="">Gamuda FC</span></div></section><div class="dashboard-top"><section class="panel match-summary"><div class="panel-header"><div><p class="eyebrow">UP NEXT</p><h3>${n?safe(n.opponent||'Matchday'): 'Your next match'}</h3></div>${btn('All matches','goto-matches','button button-quiet button-small')}</div>${n?`<div class="match-detail"><strong>${fmtDate(n.date)}</strong><span>${safe(n.time||'Time TBC')} · ${safe(n.competition||'Friendly')}</span><span>${safe(n.venue||'Venue to be confirmed')}</span></div>`:empty('No fixture added yet','Add a match to prepare a matchday poster and keep your season organised.','quick-match','Add a match')}</section><section class="panel mini-squad"><div class="panel-header"><div><p class="eyebrow">SQUAD</p><h3>${data.squad.length} player cards</h3></div>${btn('Manage squad','goto-squad','button button-quiet button-small')}</div><div class="mini-player-list">${data.squad.slice(0,5).map(p=>`<span class="mini-player"><img src="${safe(p.card||p.photo)}" alt=""><b>${safe(p.name)}</b><i>#${safe(p.number)}</i></span>`).join('')}</div><p class="caption">Imported from your GFC player-card project.</p></section></div><section class="dashboard-bottom"><div class="section-heading"><div><p class="eyebrow">CLUB DESK</p><h3>Keep the club moving</h3></div></div><div class="stat-strip"><button class="stat-cell" data-nav="matches"><span class="stat-label">Fixtures</span><strong class="stat-value">${data.matches.length}</strong><span>Manage your season</span></button><button class="stat-cell" data-nav="formation"><span class="stat-label">Line-up</span><strong class="stat-value">${safe(board().shape)}</strong><span>Set your formation</span></button><button class="stat-cell" data-nav="growth"><span class="stat-label">Growth log</span><strong class="stat-value">${data.growth.length}</strong><span>Recorded snapshots</span></button><button class="stat-cell" data-nav="instagram"><span class="stat-label">Content queue</span><strong class="stat-value">${data.posts.filter(p=>p.status==='planned').length}</strong><span>Planned posts</span></button></div></section>`;},
    matches:()=>`${heading('Fixtures & results','Build a clear season schedule. Add scores after the final whistle.',btn('＋ New match','quick-match'))}<section class="panel match-list">${data.matches.length?matchRows():empty('Fixtures start here','Add your next match, then use it to build a club poster.','quick-match','Add a match')}</section>`,
    studio:()=>`${heading('Poster studio','Create a club-ready graphic and export a crisp 2K portrait PNG.',btn('Export 2K PNG','export-poster'))}<div class="studio-layout"><section class="panel poster-form"><div class="poster-form-section"><label class="field-label" for="posterType">Poster type</label><select id="posterType" class="select"><option value="next">Next match</option><option value="matchday">Matchday</option><option value="score">Full time</option><option value="lineup">Starting XI</option><option value="player">Player spotlight</option></select><div class="type-selector"><button class="type-choice" data-type="next">NEXT MATCH</button><button class="type-choice" data-type="matchday">MATCHDAY</button><button class="type-choice" data-type="score">FULL TIME</button><button class="type-choice" data-type="lineup">LINE-UP</button></div></div><div class="form-grid"><label class="field"><span class="field-label">Opponent / headline</span><input class="input" id="posterOpponent" value="${safe(data.studio.opponent)}" placeholder="Opponent name"></label><label class="field"><span class="field-label">Competition</span><input class="input" id="posterCompetition" value="${safe(data.studio.competition)}" placeholder="League / friendly"></label><label class="field"><span class="field-label">Date</span><input class="input" type="date" id="posterDate" value="${safe(data.studio.date)}"></label><label class="field"><span class="field-label">Venue</span><input class="input" id="posterVenue" value="${safe(data.studio.venue)}" placeholder="Ground"></label><label class="field"><span class="field-label">GFC score</span><input class="input" type="number" min="0" id="posterHome" value="${safe(data.studio.home)}"></label><label class="field"><span class="field-label">Opponent score</span><input class="input" type="number" min="0" id="posterAway" value="${safe(data.studio.away)}"></label><label class="field field-span-2"><span class="field-label">Background photo</span><input class="input" type="file" id="posterPhoto" accept="image/*"><span class="field-help">Use your match photos. The image stays in this browser for this session.</span></label></div><div class="poster-actions">${btn('Use next fixture','load-next','button button-secondary')}${btn('Manage fonts','manage-fonts','button button-quiet')}${btn('Export 2K PNG','export-poster')}</div><p class="resolution-note">Export size: 2048 × 2560 px · PNG</p></section><section class="poster-stage-panel"><div class="poster-stage"><canvas class="poster-canvas" id="posterCanvas" width="640" height="800" aria-label="Poster preview"></canvas></div><p class="caption">Preview shown at reduced size. Your export is 2K.</p></section></div>`,
    squad:()=>{
      const active=data.cardTemplates.find(t=>t.id===data.activeCardTemplateId)||data.cardTemplates[0],filter=data.cardTemplateFilter||'all';
      const countFor=id=>data.squad.filter(p=>p.templateId===id).length,roster=data.squad.filter(p=>filter==='all'||p.templateId===filter);
      const filterName=filter==='all'?'All players':filter==='gfc-original'?'Original GFC cards':data.cardTemplates.find(t=>t.id===filter)?.name||'Filtered cards';
      return `${heading('Squad & card templates','Build a reusable card design, then apply it to players across the squad.',btn('＋ Create player card','card-editor'))}<section class="template-workbench panel"><div class="template-workbench-head"><div><p class="eyebrow">CARD TEMPLATE STUDIO</p><h3>Import or choose a card design</h3><p class="caption">Templates keep their own photo, logo, number, name, position, and rating placements. Editing a template redraws every player card that uses it.</p></div><div class="template-workbench-actions">${btn('Import PSD / image','import-template','button button-secondary')}${btn('Arrange active template','edit-active-template','button button-primary')}${btn('Apply to all players','apply-active-template','button button-quiet')}${btn('Manage fonts','manage-fonts','button button-quiet')}</div></div><input id="cardTemplateFile" type="file" accept=".psd,.psb,image/png,image/jpeg,image/webp" hidden><p class="template-import-note">Accepts PNG, JPG, WebP, and PSD / PSB saved as 8-bit RGB or grayscale. A PSD / PSB imports as one flattened picture: Photoshop layers, masks, smart objects, text and effects are not editable here, so hide sample player art and text in Photoshop first. The player photo, crest, name, number, position, and rating stay movable app layers on top.</p><div class="template-controls"><label class="field"><span class="field-label">Template for new cards</span><select id="activeCardTemplate" class="select">${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${t.id===active?.id?'selected':''}>${safe(t.name)}</option>`).join('')}</select></label><label class="field"><span class="field-label">Filter squad cards</span><select id="cardTemplateFilter" class="select"><option value="all" ${filter==='all'?'selected':''}>All players · ${data.squad.length}</option><option value="gfc-original" ${filter==='gfc-original'?'selected':''}>Original GFC cards · ${countFor('gfc-original')}</option>${data.cardTemplates.map(t=>`<option value="${safe(t.id)}" ${filter===t.id?'selected':''}>${safe(t.name)} · ${countFor(t.id)}</option>`).join('')}</select></label></div><div class="template-gallery">${data.cardTemplates.map(t=>`<article class="template-tile ${t.id===active?.id?'is-active':''}"><button class="template-thumb" type="button" data-action="activate-template-${safe(t.id)}" aria-label="Use ${safe(t.name)} template"><img data-template-thumb="${safe(t.id)}" src="${BLANK_IMG}" alt=""><i>${t.id===active?.id?'ACTIVE':'USE TEMPLATE'}</i></button><div class="template-tile-copy"><strong>${safe(t.name)}</strong><small>${countFor(t.id)} player cards</small></div><div class="template-tile-actions"><button class="button button-quiet button-small" type="button" data-action="edit-template-${safe(t.id)}">Arrange</button>${btn('Duplicate','duplicate-template-'+safe(t.id),'button button-quiet button-small')}${btn('Apply to squad','apply-template-'+safe(t.id),'button button-secondary button-small')}${t.id==='gfc-classic'?'':btn('Delete','delete-template-'+safe(t.id),'button button-quiet button-small')}</div></article>`).join('')}</div><p class="caption storage-note" id="storageNote"></p></section><div class="squad-roster-heading"><div><p class="eyebrow">PLAYER ROSTER</p><h3>${safe(filterName)}</h3></div><span>${roster.length} shown</span></div><div class="player-card-grid">${roster.map(p=>cardTile(p)).join('')||'<p class="caption">No players use this template yet. Choose a template from a player’s card menu, or create a player card with this template.</p>'}</div>`;
    },
    formation:()=>{const bd=board(),shapes=shapesFor(bd.size);const n=bd.shape;const layers=formationLayers(n);const used=[];const lines=layers.map((line,li)=>`<div class="pitch-line">${line.map((pos,i)=>{const key=`${li}-${i}`,id=bd.slots[key]||'',player=data.squad.find(p=>p.id===id);if(id)used.push(id);return `<div class="pitch-slot ${player?'has-player':''}" data-slot="${key}" tabindex="0" role="group" style="left:${(i+1)*100/(line.length+1)}%;top:${12+li*72/(layers.length-1)}%" aria-label="${player?safe(player.name):'Empty '+pos+' slot'}">${player?`<div class="tactic-player ${pendingTacticPlayer?.id===player.id?'is-selected':''}" data-tactic-player="${player.id}" data-from-slot="${key}" tabindex="0" role="button" aria-label="${safe(player.name)}, ${safe(player.position)}, shirt ${safe(player.number)}. Drag or tap, then choose a position."><img src="${safe(player.card||player.photo)}" data-template-player="${safe(player.id)}" alt=""><span class="tactic-player-label"><b>${safe(player.name)}</b><small>${safe(player.position)} · #${safe(player.number)}${player.rating!=null?' · '+safe(player.rating):''}</small></span></div>`:`<span class="tactic-empty"><i>＋</i><small>${pos}</small></span>`}</div>`}).join('')}</div>`).join('');const other=otherTeamIds(),subs=data.squad.filter(p=>!used.includes(p.id)&&!other.includes(p.id));return `${heading('Formation board','Pick a match, then build Team A and Team B. Drag a card to the pitch or tap a card, then tap a position.',btn('Create formation poster','formation-poster'))}${matchBar()}<section class="panel formation-toolbar"><label class="field-label" for="formationSize">Squad format</label><select id="formationSize" class="select"><option value="11" ${bd.size===11?'selected':''}>11-a-side</option><option value="7" ${bd.size===7?'selected':''}>7-a-side</option></select><label class="field-label" for="formationShape">Formation</label><select id="formationShape" class="select">${shapes.map(s=>`<option ${s===n?'selected':''}>${s}</option>`).join('')}</select>${btn('Auto-fill','auto-fill','button button-secondary')}<span class="caption">Drop a player on a position to replace its player. Drag a player back to substitutes to clear the position.</span></section><section class="tactics-screen"><div class="tactics-screen-head"><div><span class="tactics-live-dot"></span><strong>TEAM MANAGEMENT</strong><span>TEAM ${data.formation.team} · ${bd.size}-A-SIDE · ${safe(n)}</span></div><span class="tactics-club-tag"><img src="assets/brand/gfc-circle.jpg" alt=""> GAMUDA FC</span></div><div class="pitch-wrap"><div class="pitch tactics-pitch" data-tactics-pitch data-lines="${layers.length}" style="--lines:${layers.length}"><div class="pitch-box"><div class="pitch-box-top"></div><div class="pitch-box-bottom"></div></div><div class="pitch-circle"></div>${lines}</div><p class="caption pitch-instruction">Drag or tap player cards to move them · Tap a player, then tap a position to assign</p></div><section class="substitutes" data-tactics-bench><div class="substitutes-head"><div><p class="eyebrow">SQUAD DECK</p><h3>Substitutes</h3></div><span>${subs.length} available</span></div><div class="substitute-deck">${subs.map(p=>`<div class="substitute-player ${pendingTacticPlayer?.id===p.id?'is-selected':''}" data-tactic-player="${p.id}" data-from-slot="" tabindex="0" role="button" aria-label="${safe(p.name)}, ${safe(p.position)}, shirt ${safe(p.number)}. Drag or tap, then choose a position."><img src="${safe(p.card||p.photo)}" data-template-player="${safe(p.id)}" alt=""><span><b>${safe(p.name)}</b><small>${safe(p.position)} · #${safe(p.number)}${p.rating!=null?' · '+safe(p.rating):''}</small></span></div>`).join('')||'<p class="caption">All available players are on the pitch.</p>'}</div></section></section>`;},
    growth:()=>{const latest=data.growth[data.growth.length-1];const metric=key=>latest?.[key]??'—';return `${heading('Club growth','Record real numbers over time to see what is working.',btn('＋ Add snapshot','add-growth'))}<section class="growth-metrics"><div class="growth-metric"><span class="growth-label">Instagram followers</span><strong class="growth-number">${metric('followers')}</strong></div><div class="growth-metric"><span class="growth-label">Active squad</span><strong class="growth-number">${metric('members')}</strong></div><div class="growth-metric"><span class="growth-label">Average attendance</span><strong class="growth-number">${metric('attendance')}</strong></div><div class="growth-metric"><span class="growth-label">Post reach</span><strong class="growth-number">${metric('reach')}</strong></div></section><section class="panel"><div class="panel-header"><div><p class="eyebrow">MEASURED BY YOU</p><h3>Growth over time</h3></div><span class="caption">Only your recorded snapshots appear here.</span></div>${data.growth.length>1?`<div class="growth-chart">${chartSvg()}</div>`:empty(data.growth.length?'Add another snapshot to see a trend':'No growth data yet','Add a monthly snapshot from your club records. Nothing is estimated.')}</section><section class="panel snapshot-list"><div class="panel-header"><h3>Snapshots</h3></div>${data.growth.length?[...data.growth].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`<div class="post-row"><div class="post-row-main"><strong>${fmtDate(g.date)}</strong><span>${g.followers??'—'} followers · ${g.members??'—'} players · ${g.attendance??'—'} attendance · reach ${g.reach??'—'}</span></div>${btn('Remove','delete-growth-'+g.id,'button button-quiet button-small')}</div>`).join(''):'<p class="caption">Your snapshots will be listed here.</p>'}</section>`;},
    instagram:()=>{const upcomingPosts=[...data.posts].sort((a,b)=>a.dateTime.localeCompare(b.dateTime));return `${heading('Instagram planner','Prepare captions and schedule reminders for @genmudafc.',btn('＋ Plan a post','add-post'))}<div class="planner-layout"><section class="panel"><div class="panel-header"><div><p class="eyebrow">CONTENT QUEUE</p><h3>Upcoming posts</h3></div><span>${upcomingPosts.filter(p=>p.status==='planned').length} planned</span></div>${upcomingPosts.length?`<div class="post-list">${upcomingPosts.map(p=>`<article class="post-row"><div class="post-thumb">${p.image?`<img src="${safe(p.image)}" alt="">`:'GFC'}</div><div class="post-row-main"><span class="meta-label">${fmtDate(p.dateTime.slice(0,10))} · ${fmtTime(p.dateTime)}</span><strong>${safe(p.title)}</strong><span>${safe(p.caption).slice(0,100)}</span><span class="status-tag ${p.status==='posted'?'is-complete':'is-planned'}">${p.status==='posted'?'Marked posted':'Planned reminder'}</span></div><div class="table-actions">${p.status==='planned'?btn('Mark posted','posted-'+p.id,'button button-secondary button-small'):''}${btn('Remove','delete-post-'+p.id,'button button-quiet button-small')}</div></article>`).join('')}</div>`:empty('Your content queue is clear','Plan matchday announcements, results, and club updates here.','add-post','Plan a post')}</section><aside class="panel"><p class="eyebrow">PUBLISHING</p><h3>Keep @genmudafc on schedule</h3><p class="caption">This planner saves locally and can prepare reminders and captions. Direct Instagram publishing needs a connected Meta business account and authorised publishing setup.</p><div class="notice"><strong>Manual publishing is ready</strong><span>Download your poster, copy the caption, then publish in Instagram. Mark it posted here afterward.</span></div><div class="poster-actions">${btn('Export calendar (.ics)','export-ics','button button-secondary')}${btn('Build a poster','goto-studio','button button-quiet')}</div></aside></div>`;}
  };
  const CARD_W=902,CARD_H=1389,PREVIEW_W=451,PREVIEW_H=694;
  const BLANK_IMG='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const cardImageCache=new Map(),loadedCardFonts=new Set(),cardUrlCache=new Map();
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
  // A player can be in one team per match, so the other team's players are not offered as substitutes here.
  const otherTeamIds=()=>Object.values(peek(boardKey(),data.formation.team==='A'?'B':'A')?.slots||{});
  const placedCount=(key,team)=>Object.keys(peek(key,team)?.slots||{}).length;
  const matchLabel=m=>`${m.opponent||'Opponent'} · ${fmtDate(m.date)}`;
  function matchBar(){
    const key=boardKey(),matches=[...data.matches].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<section class="panel match-bar"><label class="field"><span class="field-label">Match</span><select id="formationMatch" class="select"><option value="">Practice board · no match</option>${matches.map(m=>`<option value="${safe(m.id)}" ${m.id===data.formation.matchId?'selected':''}>${safe(matchLabel(m))}</option>`).join('')}</select></label><div class="team-tabs" role="tablist" aria-label="Team line-up">${['A','B'].map(t=>`<button class="team-tab ${t===data.formation.team?'is-active':''}" type="button" role="tab" aria-selected="${t===data.formation.team}" data-team="${t}">Team ${t}<small>${placedCount(key,t)} placed</small></button>`).join('')}</div></section>`;
  }
  function applyMatchToPoster(matchId){
    const m=data.matches.find(x=>x.id===matchId),st=data.studio;if(!m)return;
    Object.assign(st,{opponent:m.opponent||'',competition:m.competition||'',date:m.date||'',venue:m.venue||''});if(m.home!=null)st.home=m.home;if(m.away!=null)st.away=m.away;
    for(const [id,key] of Object.entries({posterOpponent:'opponent',posterCompetition:'competition',posterDate:'date',posterVenue:'venue',posterHome:'home',posterAway:'away'})){const el=$('#'+id);if(el)el.value=st[key]??'';}
  }
  function makeFormationPoster(){
    const key=boardKey(),a=placedCount(key,'A'),b=placedCount(key,'B');
    if(!a&&!b)return toast('Place players on the board first, then create the poster.');
    const st=data.studio;st.type='lineup';st.posterLineupMatch=data.formation.matchId;st.posterLineupTeam=placedCount(key,data.formation.team)?data.formation.team:a?'A':'B';applyMatchToPoster(st.posterLineupMatch);
    persist();setPage('studio');toast('Line-up poster ready. Change teams, fonts or format on the left.');
  }
  // ---- Fonts: one library shared by the poster studio and card templates ----
  const BUILT_IN_FONTS=['Winner GFC','Bebas GFC','Arial'],fontFaces=new Map();
  const fontChoices=()=>[...BUILT_IN_FONTS,...data.fonts.map(f=>f.name)];
  const posterFontStack=name=>`"${name||'Winner GFC'}","Winner GFC","Bebas GFC",sans-serif`;
  const fontUsage=name=>data.cardTemplates.reduce((n,t)=>n+t.layers.filter(l=>l.font===name).length,0)+(data.studio.posterFont===name?1:0);
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
    const previous={fonts:data.fonts,poster:data.studio.posterFont},changed=[];
    data.cardTemplates.forEach(t=>t.layers.forEach(l=>{if(l.font===name){changed.push(l);l.font='Winner GFC';t.rev=(t.rev||0)+1;}}));
    if(data.studio.posterFont===name)data.studio.posterFont='';
    data.fonts=data.fonts.filter(f=>f.name!==name);
    if(!await persist()){data.fonts=previous.fonts;data.studio.posterFont=previous.poster;changed.forEach(l=>{l.font=name;});return false;}
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
  async function drawPitchPanel(ctx,x,y,w,h,team,hf){
    const layers=formationLayers(team.shape),maxN=Math.max(...layers.map(l=>l.length)),cw=Math.min(w/(maxN+.6)*.82,86),chh=cw*1.5;
    ctx.save();ctx.strokeStyle='rgba(255,247,245,.92)';ctx.lineWidth=Math.max(2,w/190);
    const L=x+6,R=x+w-6,T=y+6,B=y+h-6,mx=(L+R)/2,mid=(T+B)/2;
    ctx.beginPath();ctx.moveTo(L+(R-L)*.0,B);ctx.lineTo(L,T+(B-T)*.08);ctx.lineTo(L+(R-L)*.06,T);ctx.lineTo(R-(R-L)*.06,T);ctx.lineTo(R,T+(B-T)*.08);ctx.lineTo(R,B);ctx.stroke();
    ctx.beginPath();ctx.moveTo(L,mid);ctx.lineTo(R,mid);ctx.stroke();ctx.beginPath();ctx.arc(mx,mid,(R-L)*.09,0,Math.PI*2);ctx.stroke();
    ctx.strokeRect(L+(R-L)*.2,T,(R-L)*.6,(B-T)*.14);ctx.strokeRect(L+(R-L)*.34,B-(B-T)*.075,(R-L)*.32,(B-T)*.075);ctx.strokeRect(L+(R-L)*.2,B-(B-T)*.14,(R-L)*.6,(B-T)*.14);
    for(let li=0;li<layers.length;li++){const line=layers[li];for(let i=0;i<line.length;i++){
      const cx=x+(i+1)*w/(line.length+1),cy=y+(.1+li*.78/(layers.length-1))*h,p=data.squad.find(q=>q.id===team.slots[`${li}-${i}`]),x0=cx-cw/2,y0=cy-chh/2;
      ctx.textAlign='center';
      if(p){
        const im=await posterImg(p.card);
        if(im){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=10;ctx.drawImage(im,x0,y0,cw,chh);ctx.shadowBlur=0;}
        else{const ph=await posterImg(p.photo);ctx.save();ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,y0,cw,chh,8):ctx.rect(x0,y0,cw,chh);ctx.fillStyle='#4a0a10';ctx.fill();ctx.clip();if(ph){const s=Math.max(cw/ph.width,chh*.75/ph.height);ctx.drawImage(ph,cx-ph.width*s/2,y0,ph.width*s,ph.height*s);}ctx.restore();
          ctx.fillStyle='rgba(20,4,6,.82)';ctx.fillRect(x0,y0+chh*.72,cw,chh*.28);ctx.fillStyle='#fff';ctx.textBaseline='middle';let nf=Math.min(15,cw*.2);ctx.font=`bold ${nf}px ${hf}`;const name=String(p.name).toUpperCase();while(ctx.measureText(name).width>cw-6&&nf>7){nf-=.5;ctx.font=`bold ${nf}px ${hf}`;}ctx.fillText(name,cx,y0+chh*.86);}
      }else{ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(255,247,245,.55)';ctx.lineWidth=2;ctx.strokeRect(x0,y0,cw,chh);ctx.restore();ctx.fillStyle='rgba(255,247,245,.7)';ctx.textBaseline='middle';ctx.font=`bold ${Math.max(10,cw*.24)}px ${hf}`;ctx.fillText(line[i],cx,cy);}
    }}
    ctx.restore();
  }
  async function drawLineupPoster(ctx,w,h,st,hf){
    const red=data.formation.colors.primary,key=st.posterLineupMatch||'practice',want=st.posterLineupTeam||'A';
    let teams=want==='both'?['A','B'].filter(t=>placedCount(key,t)>0):[want];if(!teams.length)teams=['A'];
    // background: crimson glow fading to near-black, with film grain
    const g=ctx.createRadialGradient(w*.5,h*.45,w*.1,w*.5,h*.5,h*.75);g.addColorStop(0,'#b5141a');g.addColorStop(.6,'#5e0a10');g.addColorStop(1,'#140306');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<1800;i++){const s=(i*9301+49297)%233280;ctx.fillRect(s%w,(s*7)%h,1.4,1.4);}
    ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='rgba(237,28,36,.9)';let hs=w*.27;ctx.font=`bold ${hs}px ${hf}`;while(ctx.measureText('FORMATION').width>w*.96&&hs>20){hs-=4;ctx.font=`bold ${hs}px ${hf}`;}ctx.fillText('FORMATION',w/2,-hs*.38);
    const sub=[st.opponent?`GFC VS ${st.opponent}`:'',st.date?fmtDate(st.date):'',st.venue].filter(Boolean).join('  ·  ').toUpperCase().slice(0,60);
    ctx.fillStyle='#fff7f5';ctx.font=`bold 17px ${hf}`;ctx.fillText(sub,w/2,hs*.58);
    const top=hs*.58+30,bot=h-112,gap=14,W=w-64,H=bot-top,single=teams.length===1;
    const boxes=single?[[32,top,W,H]]:h>1000?[[32,top,W,(H-gap)/2],[32,top+(H+gap)/2,W,(H-gap)/2]]:[[32,top,(W-gap)/2,H],[32+(W+gap)/2,top,(W-gap)/2,H]];
    for(let i=0;i<teams.length;i++){const [bx,by,bw,bh]=boxes[i],team=peek(key,teams[i])||{size:11,shape:'4-3-3',slots:{}};await drawPitchPanel(ctx,bx,by,bw,bh,team,hf);
      ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.fillStyle='#fff7f5';ctx.font=`italic bold 20px ${hf}`;ctx.fillText(team.shape,bx+4,by+bh+22);ctx.textAlign='right';ctx.fillText(`TEAM ${teams[i]}`,bx+bw-4,by+bh+22);}
    const logo=await posterImg('assets/brand/gfc-circle.jpg');if(logo&&single){ctx.save();ctx.beginPath();ctx.arc(w/2,h-70,24,0,Math.PI*2);ctx.clip();ctx.drawImage(logo,w/2-24,h-94,48,48);ctx.restore();}
    ctx.textAlign='left';ctx.textBaseline='top';
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
  function setFormation(size,shape){const f=board();f.slots=remapSlots(f.shape,f.slots,shape);f.size=size;f.shape=shape;persist();setPage('formation');}
  function autoFillFormation(){
    const layers=formationLayers(board().shape),taken=otherTeamIds(),pool=data.squad.filter(p=>!taken.includes(p.id)),slots={};
    const prefs=(role,i,n)=>role==='GK'?['GK']:role==='DEF'?(n>=4&&i===0?['LB','CB']:n>=4&&i===n-1?['RB','CB']:['CB','LB','RB']):role==='MID'?['CM','CDM','CAM']:(n>=3&&i===0?['LW','ST']:n>=3&&i===n-1?['RW','ST']:['ST','CAM','LW','RW']);
    layers.forEach((line,li)=>line.forEach((role,i)=>{
      let best=-1;for(const pos of prefs(role,i,line.length)){best=pool.findIndex(p=>p.position===pos);if(best>=0)break;}
      if(best<0)best=pool.findIndex(p=>role==='GK'?p.position==='GK':p.position!=='GK');if(best<0&&pool.length)best=0;
      if(best>=0)slots[`${li}-${i}`]=pool.splice(best,1)[0].id;
    }));
    board().slots=slots;persist();setPage('formation');toast(`Team ${data.formation.team} sorted by position. Review the line-up.`);
  }
  function chartSvg(){const keys=['followers','members','attendance','reach'];const vals=data.growth;const max=Math.max(1,...vals.flatMap(v=>keys.map(k=>Number(v[k])||0)));const pts=vals.map((v,i)=>`${30+i*620/Math.max(1,vals.length-1)},${178-(Number(v.followers)||Number(v.members)||0)/max*145}`).join(' ');return `<svg viewBox="0 0 680 220" role="img" aria-label="Growth snapshots over time"><path d="M30 180H650M30 110H650M30 40H650" class="chart-grid"/><polyline points="${pts}" class="chart-line"/>${vals.map((v,i)=>`<circle cx="${30+i*620/Math.max(1,vals.length-1)}" cy="${178-(Number(v.followers)||Number(v.members)||0)/max*145}" r="5" class="chart-dot"/><text x="${30+i*620/Math.max(1,vals.length-1)}" y="207" text-anchor="middle">${fmtDate(v.date).replace(/,? \d{4}/,'')}</text>`).join('')}</svg>`;}
  function bindView(){
  const appContent=$('#appContent');
  if(!appContent.dataset.tacticsBound){appContent.dataset.tacticsBound='true';
    const playerAt=target=>target?.closest?.('[data-tactic-player]');
    const markSelected=()=>$$('[data-tactic-player]').forEach(x=>x.classList.toggle('is-selected',x.dataset.tacticPlayer===pendingTacticPlayer?.id));
    const transferTacticPlayer=(source,targetSlot)=>{
      const slots=board().slots,from=source.slot||'',to=targetSlot||'',deckScroll=$('.substitute-deck')?.scrollLeft||0;pendingTacticPlayer=null;
      if(from!==to){
        if(from&&!to)delete slots[from];
        else if(from&&to){const displaced=slots[to]||'';if(displaced)slots[from]=displaced;else delete slots[from];slots[to]=source.id;}
        else slots[to]=source.id;
        persist();
      }
      setPage('formation');const deck=$('.substitute-deck');if(deck)deck.scrollLeft=deckScroll;
    };
    // A drop on the pitch that misses a slot snaps to the nearest slot, so a loose drop still lands.
    const dropTargetAt=(x,y)=>{
      const el=document.elementFromPoint(x,y),direct=el?.closest?.('.pitch-slot,.substitutes');if(direct)return direct;
      if(!el?.closest?.('.pitch'))return null;let best=null,bestDistance=Infinity;
      for(const slot of $$('.pitch-slot')){const r=slot.getBoundingClientRect(),d=Math.hypot(r.left+r.width/2-x,r.top+r.height/2-y);if(d<bestDistance){best=slot;bestDistance=d;}}
      return bestDistance<=90?best:null;
    };
    const endDrag=()=>{if(activeTacticDrag?.ghost)activeTacticDrag.ghost.remove();$$('.is-dragging,.drop-ready').forEach(x=>x.classList.remove('is-dragging','drop-ready'));activeTacticDrag=null;};
    appContent.addEventListener('click',e=>{if(page!=='formation'||Date.now()<suppressTacticClickUntil)return;const card=playerAt(e.target),slot=e.target.closest('.pitch-slot');if(pendingTacticPlayer&&slot&&(!card||card.dataset.tacticPlayer!==pendingTacticPlayer.id)){transferTacticPlayer(pendingTacticPlayer,slot.dataset.slot);return;}if(card){pendingTacticPlayer={id:card.dataset.tacticPlayer,slot:card.dataset.fromSlot||''};markSelected();return;}if(pendingTacticPlayer&&slot){transferTacticPlayer(pendingTacticPlayer,slot.dataset.slot);return;}if(e.target.closest('.substitutes')&&pendingTacticPlayer?.slot){transferTacticPlayer(pendingTacticPlayer,'');}});
    appContent.addEventListener('keydown',e=>{
      if(page!=='formation')return;
      if(e.key==='Escape'&&pendingTacticPlayer){pendingTacticPlayer=null;markSelected();return;}
      if(!['Enter',' '].includes(e.key))return;const targetSlot=e.target.closest('.pitch-slot');
      if(pendingTacticPlayer&&targetSlot){e.preventDefault();transferTacticPlayer(pendingTacticPlayer,targetSlot.dataset.slot);return;}
      const card=playerAt(e.target);if(card){e.preventDefault();pendingTacticPlayer={id:card.dataset.tacticPlayer,slot:card.dataset.fromSlot||''};markSelected();}
    });
    appContent.addEventListener('pointerdown',e=>{if(page!=='formation'||e.button!==0)return;const card=playerAt(e.target);if(!card)return;activeTacticDrag={id:card.dataset.tacticPlayer,slot:card.dataset.fromSlot||'',startX:e.clientX,startY:e.clientY,moved:false,ghost:null};});
    document.addEventListener('pointermove',e=>{
      if(!activeTacticDrag)return;const dx=e.clientX-activeTacticDrag.startX,dy=e.clientY-activeTacticDrag.startY;if(!activeTacticDrag.moved&&Math.hypot(dx,dy)<8)return;
      if(!activeTacticDrag.moved){activeTacticDrag.moved=true;const source=$(`[data-tactic-player="${CSS.escape(activeTacticDrag.id)}"]`,appContent);if(source){source.classList.add('is-dragging');const ghost=source.cloneNode(true);ghost.classList.add('tactics-drag-ghost');ghost.removeAttribute('data-tactic-player');document.body.append(ghost);activeTacticDrag.ghost=ghost;}}
      if(activeTacticDrag.ghost){activeTacticDrag.ghost.style.left=e.clientX+'px';activeTacticDrag.ghost.style.top=e.clientY+'px';}
      $$('.pitch-slot,.substitutes').forEach(x=>x.classList.remove('drop-ready'));dropTargetAt(e.clientX,e.clientY)?.classList.add('drop-ready');
    });
    document.addEventListener('pointerup',e=>{
      if(!activeTacticDrag)return;const drag=activeTacticDrag,target=drag.moved?dropTargetAt(e.clientX,e.clientY):null;
      if(drag.moved)suppressTacticClickUntil=Date.now()+350;endDrag();
      if(target)transferTacticPlayer({id:drag.id,slot:drag.slot},target.matches('.pitch-slot')?target.dataset.slot:'');
    });
    document.addEventListener('pointercancel',endDrag);
  }
  $$('#appContent [data-nav]').forEach(el=>el.addEventListener('click',()=>setPage(el.dataset.nav)));
  $$('#appContent [data-action]').forEach(el=>el.addEventListener('click',()=>action(el.dataset.action)));
  $$('#appContent [data-type]').forEach(el=>el.addEventListener('click',()=>{$('#posterType').value=el.dataset.type;data.studio.type=el.dataset.type;syncPosterType();updatePoster();}));
  $$('#appContent input, #appContent select, #appContent textarea').forEach(el=>el.addEventListener('input',()=>{
    if(el.dataset.pitchColor){data.formation.colors[el.dataset.pitchColor]=el.value;const pitch=$('.pitch');if(pitch)pitch.style.setProperty('--pitch-'+el.dataset.pitchColor,el.value);persistSoon();return;}
    if(el.id.startsWith('poster'))updatePoster();
  }));
  if($('#cardTemplateFile'))$('#cardTemplateFile').addEventListener('change',e=>{const file=e.target.files[0];if(file)importCardTemplate(file);e.target.value='';});
  if($('#activeCardTemplate'))$('#activeCardTemplate').addEventListener('change',()=>{data.activeCardTemplateId=$('#activeCardTemplate').value;persist();setPage('squad');});
  if($('#cardTemplateFilter'))$('#cardTemplateFilter').addEventListener('change',()=>{data.cardTemplateFilter=$('#cardTemplateFilter').value;persist();setPage('squad');});
  $$('#appContent [data-assign-template]').forEach(el=>el.addEventListener('change',()=>assignTemplate(el.dataset.assignTemplate,el.value)));
  if($('#posterPhoto'))$('#posterPhoto').addEventListener('change',readPosterPhoto);
  if($('#posterType'))$('#posterType').addEventListener('change',()=>{data.studio.type=$('#posterType').value;syncPosterType();updatePoster();});
  if($('#formationSize'))$('#formationSize').addEventListener('change',()=>{const size=Number($('#formationSize').value);setFormation(size,shapesFor(size)[0]);});
  if($('#formationMatch'))$('#formationMatch').addEventListener('change',()=>{data.formation.matchId=$('#formationMatch').value;pendingTacticPlayer=null;persist();setPage('formation');});
  $$('#appContent [data-team]').forEach(b=>b.addEventListener('click',()=>{data.formation.team=b.dataset.team;pendingTacticPlayer=null;persist();setPage('formation');}));
  if($('#formationShape'))$('#formationShape').addEventListener('change',()=>setFormation(board().size,$('#formationShape').value));
  if($('#posterCanvas')){['posterOpponent','posterCompetition','posterDate','posterVenue','posterHome','posterAway'].forEach(id=>$('#'+id)?.addEventListener('input',updatePoster));syncPosterType();updatePoster();}
}
  function addStudioControls(){
  const grid=$('.poster-form .form-grid'),anchor=$('#posterPhoto')?.closest('.field');if(!grid||!anchor)return;
  function addSelect(id,label,choices){
    const field=document.createElement('label');field.className='field';
    const caption=document.createElement('span');caption.className='field-label';caption.textContent=label;
    const select=document.createElement('select');select.className='select';select.id=id;
    choices.forEach(item=>{const opt=document.createElement('option');opt.value=item[0];opt.textContent=item[1];select.append(opt);});
    field.append(caption,select);grid.insertBefore(field,anchor);select.value=data.studio[id]||choices[0][0];
    select.addEventListener('change',()=>{data.studio[id]=select.value;updatePoster();});
  }
  function addRange(id,label,initial){
    const field=document.createElement('label');field.className='field';
    const caption=document.createElement('span');caption.className='field-label';caption.textContent=label;
    const input=document.createElement('input');input.className='input range-input';input.type='range';input.min='0';input.max='100';input.id=id;input.value=data.studio[id]??initial;
    field.append(caption,input);grid.insertBefore(field,anchor);input.addEventListener('input',()=>{data.studio[id]=Number(input.value);updatePoster();});
  }
  addSelect('posterFormat','Instagram format',[['feed','Feed portrait · 4:5'],['story','Story / Reel · 9:16']]);
  addSelect('posterFit','Photo fit',[['crop','Fill frame · crop without stretching'],['contain','Show full photo · no crop']]);
  addSelect('posterFont','Heading font',fontChoices().map(n=>[n,n]));
  addSelect('posterLineupMatch','Line-up match',[['','Practice board · no match'],...[...data.matches].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(m=>[m.id,matchLabel(m)])]);
  addSelect('posterLineupTeam','Line-up teams',[['A','Team A only'],['B','Team B only'],['both','Team A and Team B']]);
  $('#posterLineupMatch').addEventListener('change',()=>{applyMatchToPoster(data.studio.posterLineupMatch);updatePoster();});
  addRange('posterFocusX','Photo position · left to right',50);
  addRange('posterFocusY','Photo position · top to bottom',45);
  const field=document.createElement('label');field.className='field';field.id='posterPlayerField';
  const caption=document.createElement('span');caption.className='field-label';caption.textContent='Player spotlight';
  const select=document.createElement('select');select.className='select';select.id='posterPlayer';
  data.squad.forEach(p=>{const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name;select.append(opt);});
  field.append(caption,select);grid.insertBefore(field,anchor);select.value=data.studio.playerId||data.squad[0]?.id||'';
  select.addEventListener('change',()=>{data.studio.playerId=select.value;updatePoster();});
  $('#posterType').value=data.studio.type||'next';syncPosterType();
}
  function addFormationColors(){
  const toolbar=$('.formation-toolbar');if(!toolbar)return;
  [['primary','GFC red'],['base','Field base'],['line','Line colour']].forEach(([key,label])=>{
    const field=document.createElement('label');field.className='field color-field';
    const text=document.createElement('span');text.className='field-label';text.textContent=label;
    const input=document.createElement('input');input.type='color';input.className='input color-input';input.value=data.formation.colors[key];input.dataset.pitchColor=key;
    field.append(text,input);toolbar.append(field);const pitch=$('.pitch');if(pitch)pitch.style.setProperty('--pitch-'+key,data.formation.colors[key]);
  });
}
  function syncPosterType(){
  const selected=$('#posterType')?.value||data.studio.type||'next';
  $$('#appContent [data-type]').forEach(button=>{const active=button.dataset.type===selected;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
  const field=$('#posterPlayerField');if(field)field.hidden=selected!=='player';
  ['posterLineupMatch','posterLineupTeam'].forEach(id=>{const f=$('#'+id)?.closest('.field');if(f)f.hidden=selected!=='lineup';});
}
  function action(name){if(name==='quick-match'||name==='add-match')return matchDialog();if(name==='auto-fill')return autoFillFormation();if(name==='formation-poster')return makeFormationPoster();if(name==='manage-fonts')return fontManager();if(name==='goto-matches')return setPage('matches');if(name==='goto-studio')return setPage('studio');if(name==='goto-squad')return setPage('squad');if(name==='add-player')return playerDialog();if(name==='card-editor')return cardEditor();if(name==='import-template')return $('#cardTemplateFile')?.click();if(name==='edit-active-template')return templateEditor(data.activeCardTemplateId);if(name==='apply-active-template')return applyTemplateToSquad(data.activeCardTemplateId);if(name.startsWith('apply-template-'))return applyTemplateToSquad(name.slice(15));if(name.startsWith('edit-template-'))return templateEditor(name.slice(14));if(name.startsWith('duplicate-template-'))return duplicateTemplate(name.slice(19));if(name.startsWith('delete-template-'))return deleteTemplate(name.slice(16));if(name.startsWith('activate-template-')){data.activeCardTemplateId=name.slice(18);persist();return setPage('squad');}if(name.startsWith('export-player-'))return exportPlayerCard(name.slice(14));if(name==='add-growth')return growthDialog();if(name==='add-post')return postDialog();if(name==='export-poster')return exportPoster();if(name==='load-next'){const m=upcoming();if(!m)return toast('Add a fixture first.');Object.assign(data.studio,{opponent:m.opponent,competition:m.competition,date:m.date,venue:m.venue});setPage('studio');return;}if(name==='export-backup')return backup();if(name==='import-backup')return $('#backupImport').click();if(name==='toggle-menu')return $('#sidebar').classList.toggle('is-open');if(name==='export-ics')return exportICS();if(name.startsWith('edit-match-'))return matchDialog(data.matches.find(m=>m.id===name.slice(11)));if(name.startsWith('delete-match-'))return deleteItem('matches',name.slice(13),'fixture');if(name.startsWith('poster-for-')){const m=data.matches.find(x=>x.id===name.slice(11));Object.assign(data.studio,{opponent:m.opponent,competition:m.competition,date:m.date,venue:m.venue,home:m.home??0,away:m.away??0,type:m.home!=null?'score':'next'});persist();return setPage('studio');}if(name.startsWith('edit-player-'))return cardEditor(data.squad.find(p=>p.id===name.slice(12)));if(name.startsWith('delete-growth-'))return deleteItem('growth',name.slice(14),'snapshot');if(name.startsWith('delete-post-'))return deleteItem('posts',name.slice(12),'post');if(name.startsWith('posted-')){const p=data.posts.find(x=>x.id===name.slice(7));p.status='posted';persist();setPage('instagram');toast('Marked as posted.');}}
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
  function updatePoster(){
  const canvas=$('#posterCanvas');if(!canvas)return;
  const st=data.studio;
  for(const [id,key] of Object.entries({posterOpponent:'opponent',posterCompetition:'competition',posterDate:'date',posterVenue:'venue',posterHome:'home',posterAway:'away'})){const el=$('#'+id);if(el)st[key]=el.value;}
  st.type=$('#posterType')?.value||st.type||'next';st.format=$('#posterFormat')?.value||st.format||'feed';st.fit=$('#posterFit')?.value||st.fit||'crop';
  st.focusX=Number($('#posterFocusX')?.value??st.focusX??50);st.focusY=Number($('#posterFocusY')?.value??st.focusY??45);
  const story=st.format==='story';canvas.width=640;canvas.height=story?1138:800;canvas.style.aspectRatio=story?'9 / 16':'4 / 5';
  const resolution=$('#posterResolution');if(resolution)resolution.textContent=story?'Story / Reel · 9:16 · 1440 × 2560 px':'Feed · 4:5 · 2048 × 2560 px';
  const player=data.squad.find(p=>p.id===($('#posterPlayer')?.value||st.playerId));
  const photo=st.customPhoto||(st.type==='player'&&player?player.photo:st.photo);
  persistSoon();
  posterPaint=(async()=>{
    await ensureFonts();const hf=posterFontStack(st.posterFont);try{await document.fonts.load(`700 24px ${hf}`);}catch{}
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#e9dfd0';ctx.fillRect(0,0,w,h);
    let img=posterImages.get(photo);
    if(!img){img=await new Promise(resolve=>{const loaded=new Image();loaded.onload=()=>resolve(loaded);loaded.onerror=()=>resolve(null);loaded.src=photo;});if(img)posterImages.set(photo,img);}
    const red=data.formation.colors.primary||'#ed1c24';
    ctx.fillStyle='rgba(145,0,18,.94)';ctx.beginPath();ctx.arc(w*.78,h*.28,w*.54,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.22;ctx.fillStyle='#f6e8dc';ctx.beginPath();ctx.arc(w*.78,h*.28,w*.39,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.save();ctx.beginPath();ctx.rect(0,h*.32,w,h*.68);ctx.clip();if(img){if(st.fit==='contain'){const scale=Math.min(w/img.width,(h*.68)/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,(w-dw)/2,h*.32+(h*.68-dh)/2,dw,dh);}else{const scale=Math.max(w/img.width,(h*.68)/img.height),sw=w/scale,sh=(h*.68)/scale,sx=(img.width-sw)*st.focusX/100,sy=(img.height-sh)*st.focusY/100;ctx.drawImage(img,sx,sy,sw,sh,0,h*.32,w,h*.68);}}ctx.fillStyle='rgba(11,7,10,.26)';ctx.fillRect(0,h*.32,w,h*.68);ctx.restore();
    ctx.fillStyle=red;ctx.fillRect(0,0,12,h);
    let logo=posterImages.get('assets/brand/gfc-circle.jpg');
    if(!logo){logo=await new Promise(resolve=>{const loaded=new Image();loaded.onload=()=>resolve(loaded);loaded.onerror=()=>resolve(null);loaded.src='assets/brand/gfc-circle.jpg';});if(logo)posterImages.set('assets/brand/gfc-circle.jpg',logo);}
    if(logo)ctx.drawImage(logo,34,30,58,58);
    await document.fonts.ready;ctx.textBaseline='top';ctx.fillStyle='#221317';ctx.font=`bold 21px ${hf}`;ctx.fillText('GAMUDA FOOTBALL CLUB',108,48);
    const label={next:'NEXT MATCH',matchday:'MATCHDAY',score:'FULL TIME',lineup:'STARTING XI',player:'PLAYER SPOTLIGHT'}[st.type]||'GFC MATCHDAY';
    ctx.fillStyle=red;ctx.font=`bold 25px ${hf}`;ctx.fillText(label,38,h*.14);
    if(st.type==='lineup'){
      const title=(st.opponent?`GFC VS ${st.opponent}`:'GFC LINE-UP').toUpperCase();let tf=54;ctx.fillStyle='#201317';ctx.font=`bold ${tf}px ${hf}`;while(ctx.measureText(title).width>w-76&&tf>26){tf-=2;ctx.font=`bold ${tf}px ${hf}`;}ctx.fillText(title,38,h*.20);
      ctx.font=`bold 21px ${hf}`;ctx.fillText([st.competition,st.date?fmtDate(st.date):'',st.venue].filter(Boolean).join('  ·  ').toUpperCase().slice(0,56),38,h*.265);
      await drawLineupPoster(ctx,w,h,st,hf);
    }else if(st.type==='player'&&player){
      ctx.fillStyle='#201317';ctx.font=`bold 62px ${hf}`;ctx.fillText(player.name.toUpperCase(),38,h*.20);
      ctx.font=`bold 28px ${hf}`;ctx.fillText(player.position+'  ·  #'+player.number,38,h*.28);
      if(player.rating!=null)ctx.fillText(String(player.rating)+' OVR',40,h*.65);
    }else if(st.type==='score'){
      ctx.fillStyle='#201317';ctx.font=`bold 72px ${hf}`;ctx.fillText((st.home===''||st.home==null?'–':st.home)+'  —  '+(st.away===''||st.away==null?'–':st.away),38,h*.19);
      ctx.font=`bold 34px ${hf}`;ctx.fillText((st.opponent||'OPPONENT').toUpperCase(),38,h*.28);
    }else{
      ctx.fillStyle='#201317';ctx.font=`bold 58px ${hf}`;const title=(st.opponent||'OPPONENT').toUpperCase();ctx.fillText(title.length>20?title.slice(0,19)+'…':title,38,h*.19);
      ctx.font=`bold 25px ${hf}`;ctx.fillText(st.competition||'GFC · MATCHDAY',38,h*.28);
      ctx.font=`bold 22px ${hf}`;ctx.fillText(fmtDate(st.date)+'  ·  '+(st.venue||'VENUE TBC'),38,h*.33);
    }
    ctx.fillStyle='#f5eee7';ctx.fillRect(34,h*.91,w-68,2);ctx.fillStyle='#f5eee7';ctx.font=`bold 22px ${hf}`;ctx.fillText('@GENMUDAFC',38,h*.925);ctx.fillStyle=red;ctx.fillText('RED. BLACK. GFC.',w*.62,h*.925);
  })();
}
  function wrap(ctx,text,x,y,max,lineH){let line='',yy=y;for(const word of text.split(' ')){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>max&&line){ctx.fillText(line,x,yy);line=word;yy+=lineH;}else line=test;}if(line)ctx.fillText(line,x,yy);}
  function readPosterPhoto(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{data.studio.customPhoto=r.result;updatePoster();toast('Photo loaded into poster preview.');};r.readAsDataURL(f);}
  async function exportPoster(){
  updatePoster();await posterPaint;
  const canvas=$('#posterCanvas');if(!canvas)return;
  const story=data.studio.format==='story',out=document.createElement('canvas');out.width=story?1440:2048;out.height=2560;
  out.getContext('2d').drawImage(canvas,0,0,out.width,out.height);
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
  if(!blob)return toast('Could not export the poster. Please try again.');
  download(blob,'GFC-'+String(data.studio.type||'poster').toUpperCase()+'-'+(data.studio.date||today())+'.png');toast('Instagram image exported.');
}
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

