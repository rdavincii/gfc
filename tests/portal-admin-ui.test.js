// Admin side of the player portal. Needs static server :4173 and API :8787 (ADMIN_KEY=test-admin-key-123).
const { chromium } = require('playwright');
const B='http://localhost:8787';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const call=async(method,path,{token,body,form}={})=>{const r=await fetch(B+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:form||(body?JSON.stringify(body):undefined)});return {s:r.status,j:await r.json().catch(()=>null)};};
(async()=>{const b=await chromium.launch(),errors=[];
 for(const vp of [{width:390,height:844},{width:1280,height:800}]){
  const page=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
  await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(300);
  await page.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await page.waitForSelector('[name="opponent"]');await page.fill('[name="opponent"]','Portal FC');await page.fill('[name="date"]',new Date(Date.now()+6*864e5).toISOString().slice(0,10));await page.click('#modal [type="submit"]');await page.waitForTimeout(600);
  await page.evaluate(()=>document.querySelector('[data-action="settings"]').click());await page.waitForSelector('#setPortal');await page.click('#setPortal');await page.waitForSelector('#ptUrl');await page.waitForTimeout(600);
  await page.fill('#ptUrl',B);await page.fill('#ptKey','test-admin-key-123');await page.fill('#ptCode','GFC26');
  await page.click('[data-pt="sync"]');await page.waitForSelector('[data-pt="send"]',{timeout:20000});
  const n=(await page.$$('[data-pt="send"]')).length;ok(n>=20,`squad sent and PINs created (${n} players)`);
  ok(await page.evaluate(()=>/PIN \d{4}/.test(document.querySelector('#ptPins').innerText)),'each player has a 4-digit PIN to share');
  const stored=await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
  const pid=Object.keys(stored.portal.pins)[0],pin=stored.portal.pins[pid],m=stored.matches.find(x=>x.opponent==='Portal FC');
  ok(!!stored.portal.url&&!!stored.portal.key,'portal settings are saved on the device');
  // a player acts through the API
  const lg=await call('POST','/api/login',{body:{code:'GFC26',playerId:pid,pin}});ok(lg.s===200,'a PIN made by the admin app works for the player');
  await call('PUT','/api/me/rsvp',{token:lg.j.token,body:{matchId:m.id,status:'in',note:'Bringing a friend'}});
  const f=new FormData();f.set('amount','20');f.set('note','Fee from test');f.set('proof',new Blob([new Uint8Array([0x89,0x50,0x4e,0x47,0,0,0,0,0,0,0,0])],{type:'image/png'}),'r.png');await call('POST','/api/me/payments',{token:lg.j.token,form:f});
  await page.click('[data-pt="load"]');await page.waitForSelector('[data-pt="att"]');
  ok(await page.evaluate(()=>document.querySelector('#ptInbox').innerText.includes('Bringing a friend')),'inbox shows RSVP and note');
  ok(await page.evaluate(()=>document.querySelector('#ptInbox').innerText.includes('Fee from test')&&!!document.querySelector('[data-pt="proof"]')),'inbox shows the payment with a receipt button');
  await page.click('[data-pt="proof"]');await page.waitForSelector('.pt-pay img');ok(true,'receipt opens inside the sheet');
  await page.click('[data-pt="att"]');await page.waitForTimeout(500);
  const att=await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result.matches.find(x=>x.opponent==='Portal FC').attendance);};}));
  ok(Array.isArray(att)&&att.includes(pid),'"Use as attendance" ticks the players who said they are in');
  await page.click('[data-pt="pay"][data-st="confirmed"]');await page.waitForTimeout(800);
  ok((await call('GET','/api/me/feed',{token:lg.j.token})).j.payments.some(p=>p.note==='Fee from test'&&p.status==='confirmed'),'confirming in the app reaches the player');
  await page.fill('#ptTitle','Test notice '+vp.width);await page.fill('#ptBody','Hello team');await page.click('[data-pt="post"]');await page.waitForTimeout(800);
  ok((await call('GET','/api/me/feed',{token:lg.j.token})).j.announcements.some(a=>a.title==='Test notice '+vp.width),'announcement posted from the app reaches players');
  const g=await page.evaluate(()=>{const m=document.getElementById('modal'),r=m.getBoundingClientRect();return {fits:r.top>=0&&r.bottom<=innerHeight+1,over:m.scrollHeight>m.clientHeight+1};});ok(g.fits&&!g.over,'portal sheet fits the screen');
  await page.screenshot({path:`/tmp/portal-${vp.width}.png`});await page.close();}
 console.log('errors',errors,'fails',fails);await b.close();process.exit(fails?1:0);})();
