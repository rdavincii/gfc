const { chromium } = require('playwright');(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await p.waitForSelector('[name="opponent"]');await p.fill('[name="opponent"]','Blue FC');await p.click('#modal [type="submit"]');await p.waitForTimeout(700);
await p.evaluate(()=>document.querySelector('[data-action^="result-"]').click());await p.waitForTimeout(900);
console.log(await p.evaluate(()=>{const m=document.getElementById('modal'),r=m.getBoundingClientRect();return JSON.stringify({top:r.top,h:r.height,sh:m.scrollHeight,ch:m.clientHeight,cls:m.className,bodyScroll:[...m.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+2&&getComputedStyle(e).overflowY!=='visible').map(e=>e.className)})}));
await p.screenshot({path:'/tmp/r1.png'});await b.close();})();
