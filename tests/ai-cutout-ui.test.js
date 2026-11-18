const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:390,height:844},{width:1280,height:900}]){
const ctx=await b.newContext({viewport:vp,hasTouch:vp.width<500});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="squad"]').click());await page.waitForTimeout(500);
await page.evaluate(()=>document.querySelector('#appContent [data-action="card-editor"]').click());await page.waitForSelector('#playerCardPhoto');
await page.fill('#cardName','Test Guy');await page.fill('[name="cardNumber"]','9');
await page.setInputFiles('#playerCardPhoto','ai-photo.jpg');await page.waitForSelector('#cutCanvas');
ok(await page.$eval('[data-cut-mode="ai"]',e=>e.classList.contains('is-active')),'AI cut-out is the default for a new player photo');
await page.waitForFunction(()=>document.querySelector('#cutStatus').hidden,null,{timeout:120000});await page.waitForTimeout(500);
const px=await page.$eval('#cutCanvas',c=>{const x=c.getContext('2d'),g=(fx,fy)=>x.getImageData(Math.floor(c.width*fx),Math.floor(c.height*fy),1,1).data[3];return {corner:g(.97,.5),corner2:g(.03,.97),centre:g(.45,.3)};});
ok(px.corner<20&&px.centre>240,`background removed, player kept (corner alpha ${px.corner}, face alpha ${px.centre})`);
// brush erase a spot in the middle of the player, then restore it
const before=px.centre;await page.click('[data-cut-brush="erase"]');const cb=await (await page.$('#cutCanvas')).boundingBox();
await page.mouse.move(cb.x+cb.width*.45,cb.y+cb.height*.3);await page.mouse.down();await page.mouse.move(cb.x+cb.width*.46,cb.y+cb.height*.31,{steps:3});await page.mouse.up();await page.waitForTimeout(300);
const er=await page.$eval('#cutCanvas',c=>c.getContext('2d').getImageData(Math.floor(c.width*.45),Math.floor(c.height*.3),1,1).data[3]);ok(er===0,'erase brush clears pixels');
await page.click('#cutUndo');await page.waitForTimeout(200);const un=await page.$eval('#cutCanvas',c=>c.getContext('2d').getImageData(Math.floor(c.width*.45),Math.floor(c.height*.3),1,1).data[3]);ok(un>240,'undo brings them back');
await page.screenshot({path:`cut-${vp.width}.png`});await page.click('#cutUse');await page.waitForSelector('#playerCardPhoto');await page.waitForTimeout(800);ok((await page.$eval('#cardName',e=>e.value))==='Test Guy','typed name kept after the cut-out screen');
// drag the card preview to move the photo
await page.click('#cardZoomIn');await page.click('#cardZoomIn');await page.click('#cardZoomIn');await page.waitForTimeout(200);const f0=await page.$eval('#cardFocusX',e=>e.value)+'/'+await page.$eval('#cardFocusY',e=>e.value);
const pb=await (await page.$('#playerCardPreview')).boundingBox();
await page.mouse.move(pb.x+pb.width*.5,pb.y+pb.height*.4);await page.mouse.down();await page.mouse.move(pb.x+pb.width*.3,pb.y+pb.height*.45,{steps:5});await page.mouse.up();
await page.waitForTimeout(300);
const f1=await page.$eval('#cardFocusX',e=>e.value)+'/'+await page.$eval('#cardFocusY',e=>e.value);
ok(f0!==f1,`dragging and zooming the preview moves the photo (${f0} → ${f1})`);
ok(!(await page.$eval('#cardZoom',e=>e.closest('label').offsetParent!==null)),'old position sliders are hidden');
await page.click('#modal [type="submit"]');await page.waitForTimeout(1500);
const d=await idb(page);const p=d.squad.find(x=>x.name==='TEST GUY');
ok(p&&p.photo.startsWith('data:image/png'),'new player saved with the transparent PNG');
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
