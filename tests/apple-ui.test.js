const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];
const page=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
ok(await page.evaluate(()=>getComputedStyle(document.body).fontFamily.includes('apple-system')),'system font is used');
ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.primary-nav')).position==='fixed'&&getComputedStyle(document.querySelector('.primary-nav')).backdropFilter.includes('blur')),'tab bar is a fixed translucent blur');
const press=await page.evaluate(()=>{const b=document.querySelector('.button-primary');return getComputedStyle(b).borderRadius;});ok(parseInt(press)>=100,'buttons are capsules');
await page.evaluate(()=>document.querySelector('[data-action="settings"]').click());await page.waitForTimeout(700);
const h=await (await page.$('#modal .dialog-header')).boundingBox();
// slow drag: should spring back
await page.mouse.move(h.x+100,h.y+20);await page.mouse.down();await page.mouse.move(h.x+100,h.y+90,{steps:6});
ok(await page.evaluate(()=>document.getElementById('modal').style.transform.includes('translateY(')),'sheet follows the finger');
await page.waitForTimeout(500);await page.mouse.up();await page.waitForTimeout(700);
ok(await page.evaluate(()=>document.getElementById('modal').open),'small drag springs back');
// big drag: dismisses
const h2=await (await page.$('#modal .dialog-header')).boundingBox();
await page.mouse.move(h2.x+100,h2.y+20);await page.mouse.down();await page.mouse.move(h2.x+100,h2.y+520,{steps:8});await page.mouse.up();await page.waitForTimeout(700);
ok(await page.evaluate(()=>!document.getElementById('modal').open),'long drag dismisses the sheet');
console.log('errors',errors,'fails',fails);await b.close();})();
