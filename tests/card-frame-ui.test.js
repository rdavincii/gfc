const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp});const page=await ctx.newPage();await page.addInitScript(()=>{new MutationObserver(()=>document.querySelectorAll('details.cc-more:not([open])').forEach(x=>x.open=true)).observe(document,{childList:true,subtree:true});});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>document.querySelector('[data-action^="cards-"]').click());await page.waitForTimeout(800);
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(1200);
await page.setInputFiles('#ccFrameFile','frame.png');await page.waitForSelector('#cutCanvas');await page.click('#cutUse');await page.waitForTimeout(2000);
let d=await idb(page);const mid=d.matches[0].id,e=d.editions[mid];
ok(e.frame?.startsWith('data:image/png')&&e.shapeImg?.startsWith('data:image/png'),'frame saved with derived outline');
await page.locator('#ccPreview').screenshot({path:`fr-${vp.width}-under.png`});
await page.check('#ccFrameTop');await page.waitForTimeout(900);d=await idb(page);ok(d.editions[mid].frameTop===true,'frame-over-photo saved');
await page.locator('#ccPreview').screenshot({path:`fr-${vp.width}-over.png`});
await page.fill('#ccStyleName','Framed');await page.click('[data-action="cc-save-style"]');await page.waitForTimeout(900);d=await idb(page);ok(d.cardStyles[0].ed.frame,'frame saved into style');
await page.click('[data-action="cc-clear-frame"]');await page.waitForTimeout(800);d=await idb(page);ok(!d.editions[mid].frame&&!d.editions[mid].shapeImg,'frame removable');
ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
