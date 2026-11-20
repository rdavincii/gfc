const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const check=(page)=>page.evaluate(()=>{const m=document.getElementById('modal');if(!m.open)return {open:false};const h=m.querySelector('.dialog-header').getBoundingClientRect(),b=m.querySelector('.sheet-body,.dialog-form'),r=m.getBoundingClientRect();
  b.scrollTop=1e5;const vis=[...b.querySelectorAll('*')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height>0);const last=vis.pop().getBoundingClientRect();
  return {open:true,headerVisible:h.top>=0&&h.bottom<=innerHeight,fits:r.top>=0&&r.bottom<=innerHeight+1,dlgOverflow:m.scrollHeight>m.clientHeight+1,reachesEnd:last.bottom<=r.bottom+1,title:m.querySelector('h2').textContent};});
(async()=>{const b=await chromium.launch(),errors=[];
const page=await (await b.newContext({viewport:{width:360,height:640},hasTouch:true})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(400));
const closeM=()=>page.evaluate(()=>{const m=document.getElementById('modal');if(m.open)m.close();});
const cases=[
 ['settings',async()=>{await page.evaluate(()=>document.querySelector('[data-action="settings"]').click());}],
 ['add fixture',async()=>{await nav('matches');await page.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());}],
 ['add player',async()=>{await nav('squad');await page.evaluate(()=>document.querySelector('[data-action="add-player"]')?.click());}],
 ['player profile',async()=>{await nav('squad');await page.evaluate(()=>document.querySelector('[data-action^="profile-"],[data-profile]')?.click());}],
];
for(const [name,go] of cases){await go();await page.waitForTimeout(800);const g=await check(page);console.log(name,JSON.stringify(g));if(g.open)ok(g.headerVisible&&g.fits&&!g.dlgOverflow&&g.reachesEnd,`${name}: fits, header visible, content reachable`);else console.log('SKIP '+name+' (did not open)');await closeM();await page.waitForTimeout(200);}
// fixture-based sheets
await nav('matches');await page.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await page.waitForSelector('[name="opponent"]');await page.fill('[name="opponent"]','All FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
for(const [name,sel] of [['attendance','[data-action^="attend-"]'],['prepare','[data-action^="prepare-"]'],['result','[data-action^="result-"]']]){await page.evaluate(s=>document.querySelector(s)?.click(),sel);await page.waitForTimeout(800);const g=await check(page);console.log(name,JSON.stringify(g));if(g.open)ok(g.headerVisible&&g.fits&&!g.dlgOverflow&&g.reachesEnd,`${name}: fits, header visible, content reachable`);else console.log('SKIP '+name);await closeM();await nav('matches');}
console.log('errors',errors,'fails',fails);await b.close();})();
