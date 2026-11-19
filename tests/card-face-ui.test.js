const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:900},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp,hasTouch:vp.width<500});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
let d=await idb(page);const mid=d.matches[0].id;
await page.evaluate(id=>document.querySelector(`[data-action="cards-${id}"]`).click(),mid);await page.waitForTimeout(800);
await page.click('#appContent [data-action="studio-new"]');await page.waitForSelector('#studio');await page.waitForTimeout(1200);
const sig=()=>page.evaluate(()=>{const c=document.querySelector('#stCanvas');return c.toDataURL().length+c.toDataURL().slice(-60)});
const bb=await (await page.$('#stCanvas')).boundingBox();
// gradient
await page.click('[data-st-sel="fade"]');const g1=await sig();await page.uncheck('#stFo');await page.waitForTimeout(300);const g2=await sig();ok(g1!==g2,'bottom gradient changes the card');await page.check('#stFo');
// drag face guide
await page.click('[data-st-sel="face"]');const f0=await sig();
await page.mouse.move(bb.x+bb.width*.5,bb.y+bb.height*.3);await page.mouse.down();await page.mouse.move(bb.x+bb.width*.6,bb.y+bb.height*.36,{steps:5});await page.mouse.up();await page.waitForTimeout(300);
const f1=await sig();ok(f0!==f1,'dragging the face guide moves the photo with it');
// per-player face from the studio
const before=await sig();
await page.click('#stFaceSet');await page.waitForSelector('#fgCanvas');await page.waitForTimeout(700);
const cb=await (await page.$('#fgCanvas')).boundingBox();await page.mouse.click(cb.x+cb.width*.3,cb.y+cb.height*.4);await page.fill('#fgSize','50').catch(()=>{});await page.$eval('#fgSize',e=>{e.value=50;e.dispatchEvent(new Event('input'))});await page.click('#fgSave');await page.waitForTimeout(1200);
const after=await sig();ok(before!==after,'saving a player face re-fits the photo');
await page.screenshot({path:`face-${vp.width}.png`});
await page.fill('#stName','Face card');await page.click('#stSave');await page.waitForTimeout(1200);
d=await idb(page);const dz=d.cardDesigns[0],pf=d.squad.filter(p=>p.face);
ok(dz.face.on&&Math.abs(dz.face.x-.6)<.06&&dz.fade.on&&dz.fade.amount>0,'template stores face guide and gradient');
ok(pf.length===1&&Math.abs(pf[0].face.x-.3)<.06&&Math.abs(pf[0].face.s-.5)<.02,'player face stored on the squad');
// squad list
await nav('squad');await page.waitForTimeout(600);
ok(await page.$(`[data-action="face-${pf[0].id}"]`)!==null,'squad list has a Face button');
const lab=await page.$eval(`[data-action="face-${pf[0].id}"]`,e=>e.textContent);ok(/✓/.test(lab),'squad list shows face is set');
await page.click(`[data-action="face-${pf[0].id}"]`);await page.waitForSelector('#fgPrev');ok(true,'live card preview shown in the face dialog');const nb=await page.$('#fgNext');ok(!!nb,'save and next player offered');const pid0=await page.$eval('#modalTitle',e=>e.textContent);await page.click('#fgNext');await page.waitForTimeout(900);const pid1=await page.$eval('#modalTitle',e=>e.textContent);ok(pid0!==pid1,'next player opens');await page.click('#fgCancel');
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
