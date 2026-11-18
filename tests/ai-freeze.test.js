const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(),page=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();let usedWorker=false;page.on('worker',()=>usedWorker=true);
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>document.querySelector('.nav-item[data-nav="squad"]').click());await page.waitForTimeout(400);
await page.evaluate(()=>document.querySelector('#appContent [data-action="card-editor"]').click());await page.waitForSelector('#playerCardPhoto');
await page.evaluate(()=>{window.__gap=0;let l=performance.now();(function f(){const n=performance.now();window.__gap=Math.max(window.__gap,n-l);l=n;requestAnimationFrame(f);})();});
await page.setInputFiles('#playerCardPhoto','ai-photo.jpg');await page.waitForSelector('#cutCanvas');
await page.waitForFunction(()=>document.querySelector('#cutStatus').hidden,null,{timeout:120000});
const gap=await page.evaluate(()=>window.__gap);console.log((usedWorker?'PASS':'FAIL')+' model runs in a worker');console.log((gap<400?'PASS':'FAIL')+' longest frozen moment '+Math.round(gap)+' ms');await b.close();process.exit(usedWorker&&gap<400?0:1);})();
