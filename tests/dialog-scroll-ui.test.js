const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];
for(const vp of [{width:390,height:844},{width:1280,height:800}]){
const page=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await page.waitForSelector('[name="opponent"]');await page.fill('[name="opponent"]','Scroll FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
await page.evaluate(()=>window.scrollTo(0,0));
await page.evaluate(()=>document.querySelector('[data-action^="result-"]').click());await page.waitForTimeout(900);
const r=await page.evaluate(()=>{const m=document.getElementById('modal'),f=m.querySelector('.dialog-form'),rect=m.getBoundingClientRect();return {dlg:m.scrollHeight>m.clientHeight+1,form:f.scrollHeight>f.clientHeight+1,inView:rect.top>=0&&rect.bottom<=innerHeight+1,nested:[...m.querySelectorAll('*')].filter(e=>e!==f&&e.scrollHeight>e.clientHeight+2&&['auto','scroll'].includes(getComputedStyle(e).overflowY)).length};});
ok(!r.dlg&&r.form&&r.nested===0,`result popup scrolls in one place only (${vp.width})`);ok(r.inView,'popup fits the screen');
const btn=await page.$eval('#modal .dialog-actions',e=>{const a=e.getBoundingClientRect();return a.bottom<=innerHeight+1&&a.top>0;});ok(btn,'Save / Cancel stay visible');
await page.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
