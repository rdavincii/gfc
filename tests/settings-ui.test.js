const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
const dim=async dl=>{const b=require('fs').readFileSync(await dl.path());return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)};};
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:900},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp,acceptDownloads:true,hasTouch:vp.width<500});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const g=await page.$eval('[data-action="settings"]',e=>{const r=e.getBoundingClientRect();return {r:r.right,t:r.top,vw:innerWidth,vis:r.width>0}});
ok(g.vis&&g.r>=g.vw-48&&g.t<80,`gear sits at the top right (${Math.round(g.r)}/${g.vw})`);
await page.click('[data-action="settings"]');await page.waitForSelector('#setSave');
const txt=await page.$eval('#modal',e=>e.textContent);ok(/Save data/.test(txt)&&/Manage fonts/.test(txt)&&/Restore data/.test(txt)&&/Export size/.test(txt),'settings lists data, fonts and export options');
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#setSave')]);ok(/backup\.json$/.test(dl.suggestedFilename()),'Save backup downloads a file');
await page.click('#setFonts');await page.waitForSelector('#fontList');ok(true,'Manage fonts opens from settings');await page.click('.dialog-close').catch(()=>{});await page.waitForTimeout(300);
await page.click('[data-action="settings"]');await page.waitForSelector('#setScale');await page.selectOption('#setScale','3');await page.waitForTimeout(400);
let d=await idb(page);ok(d.settings.exportScale===3,'export size saved from settings');
await page.keyboard.press('Escape');await page.waitForTimeout(300);
// card export at 3x
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(400);
await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
d=await idb(page);const mid=d.matches[0].id;await page.evaluate(id=>document.querySelector(`[data-action="cards-${id}"]`).click(),mid);await page.waitForSelector('#ccScale');await page.waitForTimeout(1200);
ok(await page.$eval('#ccScale',e=>e.value)==='3','cards page shows the same size');
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(500);const pid=d.squad[0].id;await page.evaluate(id=>{const t=document.querySelector(`[data-cc-pick="${id}"]`)||document.querySelector('[data-cc-pick]');t&&t.click();},pid).catch(()=>{});await page.waitForTimeout(400);
const [cd]=await Promise.all([page.waitForEvent('download'),page.click('[data-action="cc-export-one"]')]);const sz=await dim(cd);ok(sz.w===2172,`single card exports at 3x (${sz.w}x${sz.h}, ${cd.suggestedFilename()})`);
await page.click('[data-action="settings"]');await page.waitForSelector('#setReset');await page.click('#setReset');await page.waitForTimeout(1200);
d=await idb(page);ok(d.matches.length===0&&d.squad.length>0,`erase data returns to the starting squad (${d.squad.length} players)`);
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
