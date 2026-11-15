const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>document.querySelector('[data-action^="cards-"]').click());await page.waitForTimeout(800);
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(1500);
ok(await page.locator('[data-cc-tpl]').count()===12,'12 templates listed');
ok(await page.evaluate(()=>[...document.querySelectorAll('canvas[data-cc-tplc]')].every(c=>c.getContext('2d').getImageData(60,100,1,1).data[3]>0)),'template thumbnails drawn');
await page.click('[data-cc-tpl="icon"]');await page.waitForTimeout(900);
let d=await idb(page);const mid=d.matches[0].id;ok(d.editions[mid].tpl==='icon'&&d.editions[mid].shape==='hex'&&d.editions[mid].label==='ICON','template applied');
await page.check('#ccAuto');await page.waitForTimeout(900);d=await idb(page);ok(d.editions[mid].autoTier===true,'tier by rating saved');
await page.uncheck('#ccShine');await page.waitForTimeout(500);d=await idb(page);ok(d.editions[mid].shine===false,'shine off saved');
await page.screenshot({path:`tp-${vp.width}.png`});
ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
