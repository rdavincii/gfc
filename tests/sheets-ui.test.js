const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const geo=(page)=>page.evaluate(()=>{const m=document.getElementById('modal'),h=m.querySelector('.dialog-header').getBoundingClientRect(),b=m.querySelector('.sheet-body,.dialog-form'),r=m.getBoundingClientRect();
  return {headerVisible:h.top>=0&&h.bottom<=innerHeight,fits:r.top>=0&&r.bottom<=innerHeight+1,scrolls:b.scrollHeight>b.clientHeight+1,dlgScroll:m.scrollTop,dlgOverflow:m.scrollHeight>m.clientHeight+1,body:b.className||b.tagName,reachesEnd:(()=>{b.scrollTop=1e5;const last=[...b.querySelectorAll('*')].filter(e=>e.offsetParent).pop().getBoundingClientRect();return last.bottom<=r.bottom+1;})()};});
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:390,height:844},{width:360,height:640},{width:1280,height:800}]){
const page=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await page.waitForSelector('[name="opponent"]');await page.fill('[name="opponent"]','Sheet FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>document.querySelector('[data-action^="result-"]').click());await page.waitForTimeout(800);
await page.fill('[name="home"]','0');await page.fill('[name="away"]','4');
await page.evaluate(()=>{document.querySelectorAll('#modal input[type=checkbox]').forEach(c=>{if(!c.checked)c.click();});});
await page.click('#modal [type="submit"]');await page.waitForSelector('.rs-xp');await page.waitForTimeout(900);
let g=await geo(page);console.log(vp.width,JSON.stringify(g));
ok(g.headerVisible&&g.fits&&g.scrolls&&!g.dlgOverflow&&g.dlgScroll===0&&g.reachesEnd,`Full time sheet: header visible, body scrolls to the end (${vp.width}x${vp.height})`);
await page.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
