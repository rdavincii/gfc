const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch(),errors=[];const page=await b.newPage({viewport:{width:900,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('console:',m.text());});
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1200);
const names=['mad','nik','af'];
for(const n of names){
const r=await page.evaluate(async n=>{
  const ld=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});
  const p=await ld(`assets/players/${n}.png`),bgi=await ld('assets/brand/match-action.jpg');
  const W=700,H=Math.round(W*p.height/p.width),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.drawImage(bgi,0,0,W,H);const pc=document.createElement('canvas');pc.width=W;pc.height=H;pc.getContext('2d').drawImage(p,0,0,W,H);
  const truth=pc.getContext('2d').getImageData(0,0,W,H).data;x.drawImage(pc,0,0);
  const t0=performance.now();const m=await GFC_BG.predict(c);const t1=performance.now();
  const img=x.getImageData(0,0,W,H),a0=GFC_BG.refine(img,m),t2=performance.now(),al=GFC_BG.curve(a0,70,0);
  const rawUp=GFC_BG.upsample(m,W,H);
  let inter=0,uni=0,interR=0,uniR=0,edgeErr=0,edgeN=0;
  for(let i=0;i<W*H;i++){const t=truth[i*4+3]>128,a=al[i]>128,rr=rawUp[i]>.5;if(t&&a)inter++;if(t||a)uni++;if(t&&rr)interR++;if(t||rr)uniR++;}
  return {iou:inter/uni,iouRaw:interR/uniR,predMs:Math.round(t1-t0),refineMs:Math.round(t2-t1)};
},n);
console.log(n,JSON.stringify(r));
ok(r.iou>0.9,`${n}: cut-out overlap with the real outline ${(r.iou*100).toFixed(1)}% (rough mask alone ${(r.iouRaw*100).toFixed(1)}%)`);
}
console.log('errors',errors,'fails',fails);await b.close();})();
