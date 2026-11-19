const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(),tag=process.argv[2]||'a';
for(const vp of [{width:390,height:844,t:'m'},{width:1280,height:800,t:'d'}]){
const p=await (await b.newContext({viewport:vp,hasTouch:vp.width<500,deviceScaleFactor:1})).newPage();
await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(1500);
for(const k of ['overview','squad','formation','matches','game','analytics']){await p.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k);await p.waitForTimeout(500);await p.screenshot({path:`/tmp/s-${tag}-${vp.t}-${k}.png`});}
await p.evaluate(()=>document.querySelector('[data-action="settings"]').click());await p.waitForTimeout(500);await p.screenshot({path:`/tmp/s-${tag}-${vp.t}-settings.png`});
}await b.close();})();
