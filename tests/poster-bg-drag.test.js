const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await nav('game');await page.evaluate(()=>document.querySelector('#appContent [data-nav="packs"]').click());await page.waitForSelector('#packBg');
await page.setInputFiles('#packBg','ai-photo.jpg');await page.waitForTimeout(2500);
ok(await page.$('input[data-pack-range="fx"]')===null,'old position sliders are gone');
const mid=(await idb(page)).matches[0].id;let d=await idb(page);const fx0=d.packs[mid].fx,fy0=d.packs[mid].fy;
await page.evaluate(()=>document.querySelector('#packCanvas').scrollIntoView({block:'center'}));await page.waitForTimeout(300);const cb=await (await page.$('#packCanvas')).boundingBox();
// drag on an empty corner of the poster (bottom left, no text there)
await page.mouse.move(cb.x+cb.width*.2,cb.y+cb.height*.6);await page.mouse.down();await page.mouse.move(cb.x+cb.width*.2,cb.y+cb.height*.45,{steps:6});await page.mouse.up();await page.waitForTimeout(700);
d=await idb(page);ok(d.packs[mid].fy!==fy0,`dragging the poster moves the photo (fy ${fy0} → ${d.packs[mid].fy})`);
await page.mouse.move(cb.x+cb.width*.2,cb.y+cb.height*.6);await page.mouse.wheel(0,-300);await page.waitForTimeout(900);
d=await idb(page);ok(d.packs[mid].bgZoom>100,`scrolling zooms the photo (${Math.round(d.packs[mid].bgZoom)}%)`);
console.log('errors',errors,'fails',fails);await b.close();})();
