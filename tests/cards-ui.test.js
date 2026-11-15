const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp,acceptDownloads:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');
for(const n of ['AAA FC','BBB FC']){await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]',n);await page.click('#modal [type="submit"]');await page.waitForTimeout(700);}
let d=await idb(page);const [m1,m2]=d.matches.map(m=>m.id);
await page.evaluate(id=>document.querySelector(`[data-action="cards-${id}"]`).click(),m1);await page.waitForTimeout(1500);
ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${vp.width}: no overflow`);
ok(await page.locator('.cc-tile').count()>0||/Nobody placed/.test(await page.locator('#appContent').innerText()),'cards page renders');
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(1500);
ok(await page.locator('.cc-tile').count()===21,'whole squad generates 21 cards');
const px=async()=>page.evaluate(()=>document.querySelector('#ccPreview').toDataURL().length+':'+document.querySelector('#ccPreview').toDataURL().slice(-60));
const a=await px();
const pick=await page.evaluate(()=>document.querySelector('[data-cc-preset]:not(.is-active)').dataset.ccPreset);await page.click(`[data-cc-preset="${pick}"]`);await page.waitForTimeout(1200);const g=await px();
ok(a!==g,'changing the look repaints the card');
d=await idb(page);ok(d.editions[m1].preset===pick,'edition saved per match');
await page.evaluate(()=>{const i=document.querySelector('[data-cc-color="c2"]');i.value='#00ff00';i.dispatchEvent(new Event('input'))});await page.waitForTimeout(900);
d=await idb(page);ok(d.editions[m1].c2==='#00ff00','custom colour saved');
await page.evaluate(id=>document.querySelector(`[data-action="cards-${id}"]`)?.click(),m2);
await nav('matches');await page.evaluate(id=>document.querySelector(`[data-action="cards-${id}"]`).click(),m2);await page.waitForTimeout(800);
d=await idb(page);ok(!d.editions[m2],'other match keeps its own auto design');
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('[data-action="cc-export-sheet"]')]);ok(/cards\.png$/.test(dl.suggestedFilename()),'sheet export');
const [d2]=await Promise.all([page.waitForEvent('download'),page.click('[data-action="cc-export-one"]')]);ok(/\.png$/.test(d2.suggestedFilename()),'single card export');
await page.screenshot({path:`cc-${vp.width}.png`,fullPage:false});
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
