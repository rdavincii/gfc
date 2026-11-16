const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp,acceptDownloads:true});const page=await ctx.newPage();await page.addInitScript(()=>{new MutationObserver(()=>document.querySelectorAll('details.cc-more:not([open])').forEach(x=>x.open=true)).observe(document,{childList:true,subtree:true});});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
await nav('matches');await page.click('#appContent [data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','AAA FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
let d=await idb(page);const mid=d.matches[0].id;
await page.evaluate(id=>document.querySelector(`[data-action="cards-${id}"]`).click(),mid);await page.waitForTimeout(800);
await page.click('[data-cc-scope="squad"]');await page.waitForTimeout(1200);
const sig=()=>page.evaluate(()=>{const c=document.querySelector('#ccPreview');return c.toDataURL().length+c.toDataURL().slice(-80)});
let s0=await sig();
await page.click('[data-cc-shape="hex"]');await page.waitForTimeout(1000);const s1=await sig();ok(s0!==s1,'built-in shape changes the card');
d=await idb(page);ok(d.editions[mid].shape==='hex','shape saved');
await page.setInputFiles('#ccShapeFile','shape.png');await page.waitForSelector('#cutCanvas');await page.click('#cutUse');await page.waitForTimeout(1500);
d=await idb(page);ok(d.editions[mid].shapeImg?.startsWith('data:image/png')&&!d.editions[mid].shape,'imported shape saved');
const s2=await sig();ok(s2!==s1,'imported shape repaints');
await page.setInputFiles('#ccBgFile','bg.jpg');await page.waitForTimeout(1500);
d=await idb(page);ok(d.editions[mid].bg?.startsWith('data:image/jpeg'),'imported background saved');
// name moves lower when attributes are off
const nameRow=async()=>page.evaluate(()=>{const c=document.querySelector('#ccPreview'),x=c.getContext('2d'),w=c.width,h=c.height;let lo=-1;const dat=x.getImageData(0,0,w,h).data;return dat.length});
await page.uncheck('#ccStats');await page.waitForTimeout(1200);d=await idb(page);ok(d.editions[mid].stats===false,'attributes off saved');
await page.screenshot({path:`cs-${vp.width}.png`});
// save style
await page.fill('#ccStyleName','Night hex');await page.click('[data-action="cc-save-style"]');await page.waitForTimeout(900);
d=await idb(page);ok(d.cardStyles.length===1&&d.cardStyles[0].ed.bg&&d.cardStyles[0].ed.shapeImg,'style saved in app with its images');
// poster picks the style
await nav('game');await page.evaluate(()=>document.querySelector('#appContent [data-nav="packs"]').click());await page.waitForTimeout(800);
const opts=await page.$$eval('#packCardStyle option',o=>o.map(x=>x.textContent));ok(opts.some(x=>/Night hex/.test(x)),'line-up poster offers saved style');
const sty=d.cardStyles[0].id;await page.selectOption('#packCardStyle',sty);await page.waitForTimeout(600);
d=await idb(page);ok(d.packs[mid]?.cardStyle===sty,'poster style stored');
await page.evaluate(()=>{});
// delete style resets pack
await nav('game');await page.evaluate(()=>document.querySelector('#appContent [data-nav="cards"]').click());await page.waitForTimeout(800);
await page.click('[data-cc-del]');await page.waitForTimeout(800);d=await idb(page);ok(d.cardStyles.length===0&&d.packs[mid].cardStyle==='','deleting a style clears posters using it');
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
