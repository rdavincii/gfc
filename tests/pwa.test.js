const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];
const ctx=await b.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const man=await page.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');return l?await (await fetch(l.href)).json():null;});
ok(man&&man.display==='standalone'&&man.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable')&&man.icons.some(i=>i.sizes==='192x192'),'manifest has name, standalone display and 192/512/maskable icons');
for(const i of man.icons){const r=await page.evaluate(async u=>(await fetch(u)).status,i.src);ok(r===200,`icon ${i.src} loads`);}
ok(await page.$('link[rel=apple-touch-icon]')!==null&&await page.$('meta[name=theme-color]')!==null,'iOS and theme tags present');
await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForTimeout(1500);
ok(await page.evaluate(()=>!!navigator.serviceWorker.controller)||(await page.reload(),await page.waitForTimeout(1500),await page.evaluate(()=>!!navigator.serviceWorker.controller)),'service worker controls the page');
const keys=await page.evaluate(async()=>{const c=await caches.open((await caches.keys())[0]);return (await c.keys()).length;});ok(keys>=15,`app shell cached (${keys} files)`);
await ctx.setOffline(true);await page.reload();await page.waitForTimeout(2000);
ok(await page.evaluate(()=>!!document.querySelector('#appContent')&&document.querySelector('#appContent').children.length>0),'app opens fully offline');
await page.click('[data-action="settings"]');await page.waitForSelector('#setSave');ok(/Install app/.test(await page.$eval('#modal',e=>e.textContent)),'settings explains how to install');
console.log('errors',errors,'fails',fails);await b.close();})();
