const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:390,height:844},{width:1280,height:900}]){
const page=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(400);
await page.evaluate(()=>document.querySelector('[data-action="quick-match"],[data-action="add-match"],[data-action="new-match"]').click());await page.waitForSelector('#oppLogoFile');
await page.fill('[name="opponent"]','Blue FC');
await page.setInputFiles('#oppLogoFile','opp-logo.png');await page.waitForSelector('#cutCanvas');
await page.waitForFunction(()=>document.querySelector('#cutStatus').hidden,null,{timeout:120000});await page.click('[data-cut-mode="white"]');await page.waitForTimeout(500);
await page.click('#cutUse');await page.waitForSelector('#oppEdit');
ok(await page.$eval('[name="opponent"]',e=>e.value)==='Blue FC','typed opponent name kept after cut-out');
await page.click('#modal [type="submit"]');await page.waitForTimeout(800);
const m=await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result.matches.find(x=>x.opponent==='Blue FC'));};}));
ok(m&&m.oppLogo?.startsWith('data:image/png')&&m.oppLogoOrig,'fixture saved with transparent logo and original');
ok(await page.evaluate(()=>!!document.querySelector('.opp-img')),'fixture list shows the logo');
// poster
await page.evaluate(()=>document.querySelector('[data-nav="game"]').click());await page.waitForTimeout(800);
await page.evaluate(()=>document.querySelector('[data-nav="packs"]').click());await page.waitForTimeout(800);await page.selectOption('#packMatch',m.id);await page.waitForTimeout(1500);
const px=await page.evaluate(()=>{const c=document.querySelector('#packCanvas'),x=c.getContext('2d'),W=c.width,H=c.height;return Array.from(x.getImageData(Math.round(W*.565),Math.round(H*.92),1,1).data);});
ok(px[0]>200&&px[1]>150&&px[2]<90,'opponent crest is drawn on the poster ('+px.join(',')+')');
await (await page.$('#packCanvas')).screenshot({path:`opp-${vp.width}.png`});await page.evaluate(()=>document.querySelector('[data-pack-kind="rosterA"]')?.click());await page.waitForTimeout(1200);await (await page.$('#packCanvas')).screenshot({path:`opp-lineup-${vp.width}.png`});
await page.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
