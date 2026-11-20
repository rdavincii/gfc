const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:390,height:844},{width:1280,height:900}]){
const page=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="formation"]').click());await page.waitForTimeout(500);
const labels=async()=>page.$$eval('.fc-slot',s=>s.map(x=>(x.querySelector('.fc-empty,.fc-role')||{}).textContent));
const l=await labels();ok(JSON.stringify(l.slice(0,3))===JSON.stringify(['LW','ST','RW'])&&l.includes('LB')&&l.includes('RB')&&l[l.length-1]==='GK','4-3-3 slots have EA FC roles: '+l.join(' '));
await page.selectOption('#formationShape,[name="shape"]','4-2-3-1').catch(()=>{});
await page.evaluate(()=>document.querySelector('[data-action="auto-fill"],[data-action="autofill"],[data-action="auto-formation"]').click());await page.waitForTimeout(500);
const tags=await page.$$eval('.fc-role',e=>e.map(x=>x.className.includes('fit-perfect')?'g':x.className.includes('fit-ok')?'a':'r').join(''));
console.log(vp.width,'tags',tags);ok(tags.length===11&&(tags.match(/g/g)||[]).length>=5,'auto-fill puts most players in their natural role (green)');
await page.screenshot({path:`/tmp/roles-${vp.width}.png`});
// scroll stays put after an action that re-renders
await page.evaluate(()=>window.scrollTo(0,500));const y0=await page.evaluate(()=>scrollY);
await page.evaluate(()=>document.querySelector('[data-action="auto-fill"],[data-action="autofill"],[data-action="auto-formation"]').click());await page.waitForTimeout(400);
const y1=await page.evaluate(()=>scrollY);ok(Math.abs(y1-y0)<5&&y1>100,`page keeps its scroll position after a button re-renders it (${y0} → ${y1})`);
await page.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
