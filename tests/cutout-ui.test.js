const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
const alphaAt=(page,src,x,y)=>page.evaluate(([s,x,y])=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);r(g.getImageData(Math.round(x*i.width),Math.round(y*i.height),1,1).data[3]);};i.src=s;}),[src,x,y]);
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844}])for(const [file,mode] of [['cut-white.jpg','white'],['cut-black.jpg','black']]){
const ctx=await b.newContext({viewport:vp});const page=await ctx.newPage();await page.addInitScript(()=>{new MutationObserver(()=>document.querySelectorAll('details.cc-more:not([open])').forEach(x=>x.open=true)).observe(document,{childList:true,subtree:true});});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>document.querySelector('[data-action^="cards-"]').click());await page.waitForTimeout(800);
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(1000);
await page.setInputFiles('#ccFrameFile',file);await page.waitForSelector('#cutCanvas');await page.waitForTimeout(500);
await page.click(`[data-cut-mode="${mode}"]`);await page.waitForTimeout(500);
await page.screenshot({path:`cut-${vp.width}-${mode}.png`});
ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${vp.width} ${mode}: dialog no overflow`);
await page.click('#cutUse');await page.waitForTimeout(2000);
const d=await idb(page),e=Object.values(d.editions)[0];
ok(e?.frame,`${mode}: frame stored`);
ok(await alphaAt(page,e.frame,0.01,0.01)===0,`${mode}: outer background transparent`);
ok(await alphaAt(page,e.frame,0.5,0.4)>200,`${mode}: same-coloured spot inside artwork kept`);
await page.locator('#ccPreview').screenshot({path:`cutcard-${vp.width}-${mode}.png`});
await ctx.close();}
// cancel leaves nothing
const ctx=await b.newContext({viewport:{width:1280,height:1000}}),page=await ctx.newPage();
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(400);await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','X');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>document.querySelector('[data-action^="cards-"]').click());await page.waitForTimeout(800);
await page.setInputFiles('#ccFrameFile','cut-white.jpg');await page.waitForSelector('#cutCanvas');await page.click('#cutCancel');await page.waitForTimeout(700);
const d=await idb(page);ok(!Object.values(d.editions||{}).some(e=>e.frame),'cancel stores nothing');
console.log('errors',errors,'fails',fails);await b.close();})();
