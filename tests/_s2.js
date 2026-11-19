const { chromium } = require('playwright');(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="matches"]').click());await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-action="add-match"],[data-action="quick-match"]').click());await p.waitForSelector('[name="opponent"]');await p.waitForTimeout(700);await p.screenshot({path:'/tmp/a-form.png'});
await p.fill('[name="opponent"]','Blue FC');await p.click('#modal [type="submit"]');await p.waitForTimeout(700);await p.screenshot({path:'/tmp/a-matches.png'});
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="squad"]').click());await p.waitForTimeout(400);await p.evaluate(()=>window.scrollTo(0,900));await p.waitForTimeout(300);await p.screenshot({path:'/tmp/a-squad.png'});
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="formation"]').click());await p.waitForTimeout(400);await p.evaluate(()=>{window.scrollTo(0,700)});await p.waitForTimeout(300);await p.screenshot({path:'/tmp/a-tactics.png'});
await b.close();})();
