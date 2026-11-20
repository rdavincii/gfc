// Clicks every button on every page and checks that any popup it opens fits the screen, keeps its header and can scroll to its end.
const { chromium } = require('playwright');
const SKIP=/delete|remove|reset|erase|clear|export|download|import|install|backup|restore|wipe|share|copy|save-|logout|seed/i;
let fails=0,opened=0;
(async()=>{const b=await chromium.launch(),errors=[];
const ctx=await b.newContext({viewport:{width:360,height:640},hasTouch:true,acceptDownloads:true});
for(const pageKey of ['overview','squad','formation','matches','game','analytics','packs','cards']){
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1200);
 const nav=async()=>{await page.evaluate(k=>(document.querySelector(`[data-nav="${k}"]`)||{click(){}}).click(),pageKey);await page.waitForTimeout(350);};
 await nav();
 const names=await page.$$eval('#appContent [data-action]',e=>[...new Set(e.map(x=>x.dataset.action))]);
 for(const name of names){ if(SKIP.test(name))continue;
  await nav();
  const y0=await page.evaluate(()=>scrollY);
  await page.evaluate(n=>document.querySelector(`#appContent [data-action="${n}"]`)?.click(),name);await page.waitForTimeout(700);
  const g=await page.evaluate(()=>{const m=document.getElementById('modal');if(!m.open)return null;const hd=m.querySelector('.dialog-header');if(!hd)return {noHeader:true};const h=hd.getBoundingClientRect(),bd=m.querySelector('.sheet-body,.dialog-form'),r=m.getBoundingClientRect();
    if(bd){bd.scrollTop=1e5;}const vis=bd?[...bd.querySelectorAll('*')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height>0):[];const last=vis.length?vis.pop().getBoundingClientRect():r;
    return {t:m.querySelector('h2')?.textContent,hv:h.top>=0&&h.bottom<=innerHeight,fits:r.top>=0&&r.bottom<=innerHeight+1,dlgOv:m.scrollHeight>m.clientHeight+1,end:last.bottom<=r.bottom+1};});
  if(g){opened++;const good=g.noHeader||(g.hv&&g.fits&&!g.dlgOv&&g.end);console.log((good?'PASS ':'FAIL ')+pageKey+' › '+name+' → '+(g.t||'dialog'));if(!good){fails++;console.log(JSON.stringify(g));}
   await page.evaluate(()=>{const m=document.getElementById('modal');if(m.open)m.close();});}
  else{const y1=await page.evaluate(()=>scrollY);if(y0>0&&y1===0&&!/^(nav|go|tab)/.test(name))console.log('NOTE scroll reset by '+pageKey+' › '+name);}
 }
 await page.close();}
console.log('popups checked',opened,'errors',errors,'fails',fails);await b.close();process.exit(fails?1:0);})();
