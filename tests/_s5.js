const { chromium } = require('playwright');(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:430,height:900},hasTouch:true,deviceScaleFactor:2})).newPage();await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="formation"]').click());await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('[data-action="auto-fill"]').click());await p.waitForTimeout(600);
// make one player out of position: swap first two slot players via data
await (await p.$('.fc-pitch,.fc-board,.pitch')).screenshot({path:'/tmp/pitch.png'});await b.close();})();
