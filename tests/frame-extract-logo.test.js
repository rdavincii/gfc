const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
const alphaAt=(page,src,x,y)=>page.evaluate(([s,x,y])=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);r(g.getImageData(Math.round(x*i.width),Math.round(y*i.height),1,1).data[3]);};i.src=s;}),[src,x,y]);
(async()=>{const b=await chromium.launch(),errors=[],reqs=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp});const page=await ctx.newPage();await page.addInitScript(()=>{new MutationObserver(()=>document.querySelectorAll('details.cc-more:not([open])').forEach(x=>x.open=true)).observe(document,{childList:true,subtree:true});});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)reqs.push(r.url())});
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
ok(await page.evaluate(()=>document.querySelector('.brand img').src.includes('gfc-logo.png')&&document.querySelector('link[rel=icon]').href.includes('gfc-logo.png')),'top bar + favicon use the new logo');
await page.screenshot({path:`logo-${vp.width}.png`});
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>document.querySelector('[data-action^="cards-"]').click());await page.waitForTimeout(800);
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(1000);
await page.setInputFiles('#ccFrameFile','cut-white.jpg');await page.waitForSelector('#cutCanvas');
ok(await page.locator('#cutFrame').count()===1,'extract-frame option shown for frames');
await page.click('[data-cut-mode="white"]');await page.check('#cutFrame');await page.waitForTimeout(600);
await page.screenshot({path:`extract-${vp.width}.png`});
await page.click('#cutUse');await page.waitForTimeout(2000);
const d=await idb(page),e=Object.values(d.editions)[0];
ok(e.frame&&e.frameTop===true,'frame stored and set to sit over the photo');
ok(await alphaAt(page,e.frame,0.5,0.4)===0,'middle hollowed out');
ok(await alphaAt(page,e.frame,0.5,0.015)>200,'border kept');
ok(await alphaAt(page,e.frame,0.01,0.01)===0,'outside transparent');
await page.locator('#ccPreview').screenshot({path:`extcard-${vp.width}.png`});
ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
// migration of an old logo path
await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite'),s=tx.objectStore('kv');s.get('gfc-club-desk-v1').onsuccess=ev=>{const v=ev.target.result;v.cardTemplates.forEach(t=>(t.layers||[]).forEach(l=>{if(l.type==='logo')l.src='assets/brand/gfc-crest.png';}));s.put(v,'gfc-club-desk-v1');};tx.oncomplete=r;};}));
await page.reload();await page.waitForTimeout(1500);const d2=await idb(page);
ok(!JSON.stringify(d2.cardTemplates).includes('gfc-crest'),'old logo paths migrated');
await ctx.close();}
console.log('failed requests',reqs,'errors',errors,'fails',fails);await b.close();})();
