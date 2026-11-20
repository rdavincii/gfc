const { chromium } = require('playwright');(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:360,height:640},hasTouch:true})).newPage();await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelector('.nav-item[data-nav="squad"]').click());await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('[data-action^="profile-"]').click());await p.waitForTimeout(900);
console.log(await p.evaluate(()=>{const m=document.getElementById('modal'),r=m.getBoundingClientRect();return JSON.stringify({cls:m.className,top:r.top,bottom:r.bottom,h:innerHeight,mh:getComputedStyle(m).maxHeight,disp:getComputedStyle(m).display,hdr:m.querySelector('.dialog-header').getBoundingClientRect().top,kids:[...m.children].map(e=>e.className+':'+Math.round(e.getBoundingClientRect().height))})}));
await p.screenshot({path:'/tmp/prof.png'});await b.close();})();
