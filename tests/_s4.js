const { chromium } = require('playwright');(async()=>{const b=await chromium.launch();
for(const vp of [{width:390,height:844},{width:1280,height:800}]){const p=await (await b.newContext({viewport:vp,hasTouch:vp.width<500})).newPage();await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await p.waitForSelector('[name="opponent"]');await p.fill('[name="opponent"]','Blue FC');await p.click('#modal [type="submit"]');await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector('[data-action^="result-"]').click());await p.waitForTimeout(900);
console.log(vp.width,await p.evaluate(()=>{const m=document.getElementById('modal');return JSON.stringify({dlgScrolls:m.scrollHeight>m.clientHeight+1,formScrolls:(f=>f.scrollHeight>f.clientHeight+1)(m.querySelector('.dialog-form')),nested:[...m.querySelectorAll('*')].filter(e=>e!==m.querySelector('.dialog-form')&&e.scrollHeight>e.clientHeight+2&&['auto','scroll'].includes(getComputedStyle(e).overflowY)).length})}));
await p.screenshot({path:`/tmp/r2-${vp.width}.png`});}await b.close();})();
