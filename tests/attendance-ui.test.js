const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:390,height:844},{width:1280,height:900}]){
const page=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await page.waitForSelector('[name="opponent"]');
await page.fill('[name="opponent"]','Att FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(600);
ok(await page.evaluate(()=>document.body.innerText.includes('Attendance not set')),'new fixture says attendance not set');
await page.evaluate(()=>document.querySelector('[data-action^="attend-"]').click());await page.waitForSelector('#atSave');
const total=await page.$$eval('[data-att]',e=>e.length);
await page.click('#atNone');await page.evaluate(()=>{const b=[...document.querySelectorAll('[data-att]')];b.slice(0,5).forEach(x=>{x.checked=true;});b[0].dispatchEvent(new Event('change'));});
ok((await page.textContent('#atCount')).startsWith('5 of'),'count updates');
await page.click('#atSave');await page.waitForTimeout(500);
ok(await page.evaluate(()=>document.body.innerText.includes('5/')),'match card shows 5 attending');
const ids=await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result.matches.find(x=>x.opponent==='Att FC'));};}));
ok(ids.attendance.length===5,'attendance saved on the match');
// tactics: only 5 available
await page.evaluate(m=>{document.querySelector('[data-action="tactics-'+m+'"]')?.click();},ids.id);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="formation"]').click());await page.waitForTimeout(500);
await page.selectOption('#formationMatch',ids.id);await page.waitForTimeout(500);
ok(await page.$$eval('.fc-bench-card',e=>e.length)===5,'bench only offers the 5 ticked players');
await page.evaluate(()=>document.querySelector('[data-action="auto-fill"],[data-action="autofill"],[data-action="auto-formation"]')?.click());await page.waitForTimeout(400);
// untick one placed player -> removed from pitch
const placed=await page.$$eval('.fc-slot.has-player',e=>e.length);console.log('placed after autofill',placed);
await page.evaluate(()=>document.querySelector('[data-action^="attend-"]').click());await page.waitForSelector('#atSave');
await page.click('#atNone');await page.click('#atSave');await page.waitForTimeout(500);
ok(await page.$$eval('.fc-slot.has-player',e=>e.length)===0&&await page.$$eval('.fc-bench-card',e=>e.length)===0,'unticking everyone clears the pitch and bench');
await page.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
