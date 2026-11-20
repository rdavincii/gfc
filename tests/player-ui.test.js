// Needs the static server on :4173 and the API on :8787 (see api.test.js).
const { chromium } = require('playwright');
const B='http://localhost:8787',ADMIN='test-admin-key-123';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const admin=(method,path,body)=>fetch(B+path,{method,headers:{authorization:'Bearer '+ADMIN,'content-type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
(async()=>{
  const next=new Date(Date.now()+5*864e5).toISOString().slice(0,10);
  await admin('PUT','/api/admin/sync',{players:[{id:'u1',name:'ZAKI',number:'7',position:'CM'},{id:'u2',name:'ALIF',number:'5',position:'CB'}],matches:[{id:'um1',opponent:'Red FC',date:next,time:'21:00',venue:'Court 2',competition:'League'}]});
  await admin('PUT','/api/admin/pins',{pins:{u1:'4321',u2:'8765'}});
  await admin('POST','/api/admin/announcements',{title:'Bring white jersey',body:'Kick-off 9pm sharp',pinned:true});
  const b=await chromium.launch(),errors=[];
  const page=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/player.html?api='+encodeURIComponent(B)+'&code=GFC26');await page.waitForSelector('#lName:not([disabled])');
  ok(await page.$$eval('#lName option',o=>o.map(x=>x.textContent).join()).then(t=>t.includes('ZAKI')&&t.includes('ALIF')),'name list loads from the club code in the link');
  ok(!(await page.url()).includes('api='),'link parameters are removed from the address bar');
  await page.selectOption('#lName','u1');await page.fill('#lPin','0000');await page.click('#lGo');await page.waitForTimeout(500);
  ok(await page.evaluate(()=>!!document.querySelector('#lf')),'wrong PIN stays on the login screen');
  await page.fill('#lPin','4321');await page.click('#lGo');await page.waitForSelector('.tabs');
  ok(await page.evaluate(()=>document.body.innerText.includes('Bring white jersey')&&document.body.innerText.includes('PINNED')),'News shows the pinned announcement');
  await page.screenshot({path:'/tmp/pl-news.png'});
  await page.click('[data-tab="matches"]');await page.click('[data-m] .seg [data-s="in"]');await page.waitForTimeout(700);
  ok(await page.evaluate(()=>document.querySelector('[data-m] .seg [data-s="in"]').classList.contains('on')&&document.body.innerText.includes('Going: ZAKI')),'RSVP "I\'m in" saves and shows who is going');
  await page.screenshot({path:'/tmp/pl-matches.png'});
  await page.click('[data-tab="pay"]');await page.fill('#pAmt','12.5');await page.fill('#pNote','Match fee');await page.setInputFiles('#pFile','ai-photo.jpg');await page.click('#pGo');await page.waitForTimeout(1200);
  ok(await page.evaluate(()=>document.body.innerText.includes('RM 12.50')&&document.body.innerText.includes('pending')&&!!document.querySelector('[data-proof]')),'payment with receipt photo appears as pending');
  await page.click('[data-proof]');await page.waitForSelector('img.proof');ok(await page.$eval('img.proof',i=>i.complete&&i.naturalWidth>0),'owner can open their receipt');
  const n0=(await page.$$('.row')).length;await page.fill('#pAmt','3');await page.click('#pGo');await page.waitForTimeout(900);
  ok((await page.$$('.row')).length===n0+1,'payment without a photo works too');
  await page.screenshot({path:'/tmp/pl-pay.png'});
  // offline: saved feed still shows
  await page.reload();await page.waitForSelector('.tabs');await page.context().setOffline(true);await page.click('#rf');await page.waitForTimeout(800);
  ok(await page.evaluate(()=>document.body.innerText.includes('Offline')&&document.body.innerText.includes('Bring white jersey')),'offline: saved info stays visible with a banner');
  await page.context().setOffline(false);
  await page.click('[data-tab="me"]');await page.click('#so');await page.waitForSelector('#lf');ok(true,'sign out returns to login');
  console.log('errors',errors,'fails',fails);await b.close();process.exit(fails?1:0);
})();
