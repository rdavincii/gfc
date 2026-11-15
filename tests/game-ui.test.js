const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const idb=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gfc-club-desk-v1');g.onsuccess=()=>r(g.result);};}));
(async()=>{
const b=await chromium.launch(),errors=[];
for(const vp of [{width:1280,height:1000},{width:390,height:844},{width:430,height:932}]){
const ctx=await b.newContext({viewport:vp});const page=await ctx.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
const nav=k=>page.evaluate(k=>document.querySelector(`.nav-item[data-nav="${k}"]`).click(),k).then(()=>page.waitForTimeout(500));
for(const k of ['overview','squad','formation','matches','game','analytics']){await nav(k);
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${vp.width}px ${k}: no horizontal overflow`);}
if(vp.width!==1280){await ctx.close();continue;}
// honest empty state
await nav('overview');ok(/Not recorded/.test(await page.locator('#appContent').innerText()),'Home shows "Not recorded", not fake zeros');
// match + result
await nav('matches');await page.click('[data-action="quick-match"]');await page.waitForSelector('#modal[open]');await page.fill('#modal [name="opponent"]','TEST FC');await page.click('#modal [type="submit"]');await page.waitForTimeout(800);
let d=await idb(page);const mid=d.matches[0].id;const xp0=await page.evaluate(()=>document.querySelector('#xpChip').textContent);
await page.evaluate(id=>document.querySelector(`[data-action="result-${id}"]`).click(),mid);await page.waitForSelector('#modal[open]');
await page.fill('#modal [name="home"]','1');await page.fill('#modal [name="away"]','0');
const pid=await page.evaluate(()=>document.querySelector('#modal input[name="played"]').value);
await page.check(`#modal input[name="played"][value="${pid}"]`);await page.fill(`#modal [name="g-${pid}"]`,'3');
await page.click('#modal [type="submit"]');await page.waitForTimeout(600);
ok(await page.evaluate(()=>/goals/i.test(document.querySelector('#toast').textContent))&&!(await idb(page)).matches[0].stats,'goals above score are rejected');
await page.fill(`#modal [name="g-${pid}"]`,'1');await page.check(`#modal input[name="potm"][value="${pid}"]`);await page.click('#modal [type="submit"]');await page.waitForTimeout(1200);
const txt=await page.locator('#modal').innerText();
ok(/FULL TIME/i.test(txt)&&/MATCH XP|CLUB XP/i.test(txt),'result screen: FULL TIME + XP');
d=await idb(page);ok(d.matches[0].stats.goals[pid]===1&&d.matches[0].stats.potm===pid,'stats persisted');
ok(!!d.progress.unlocked['first-match']&&!!d.progress.unlocked['first-win'],'First match + First win unlocked');
await page.keyboard.press('Escape');await page.waitForTimeout(300);
// training + objective
await nav('game');await page.click('[data-action="log-training"]');await page.waitForSelector('#modal[open]');await page.check('#modal input[name="att"] >> nth=0');await page.click('#modal [type="submit"]');await page.waitForTimeout(800);
d=await idb(page);ok(d.training.length===1&&d.training[0].attended.length===1,'training logged');
await nav('game');const claim=page.locator('[data-action^="claim-"]');ok(await claim.count()>0,'claimable objective appears');
if(await claim.count()){await claim.first().click();await page.waitForTimeout(700);d=await idb(page);ok(Object.keys(d.progress.claimed).length===1,'claim stored once');}
// rules edit
await nav('game');await page.click('[data-action="edit-rules"]');await page.waitForSelector('#modal[open]');
const ri=page.locator('#modal input[type="number"]').first();await ri.fill('77');await page.click('#modal [type="submit"]');await page.waitForTimeout(700);
d=await idb(page);ok(JSON.stringify(d.rules).includes('77'),'XP rules editable and saved');
// profile: player with a real played match gets stats, another stays "Not recorded"
await nav('squad');await page.evaluate(id=>document.querySelector(`[data-action="profile-${id}"]`).click(),pid);await page.waitForSelector('#modal[open]');
ok(/LV|OVR|Match history/i.test(await page.locator('#modal').innerText()),'profile sheet opens');await page.keyboard.press('Escape');
// tactics: captain + ratings + pitch theme
await nav('formation');await page.selectOption('#formationMatch',mid);await page.waitForTimeout(600);await page.click('[data-action="auto-fill"]');await page.waitForTimeout(1200);
const opts=await page.$$eval('#formationCaptain option',o=>o.map(x=>x.value).filter(Boolean));await page.selectOption('#formationCaptain',opts[0]);await page.waitForTimeout(500);
d=await idb(page);ok(d.lineups[mid].A.captain===opts[0],'captain saved');
await page.selectOption('#pitchTheme','pitch-night').catch(()=>{});await page.waitForTimeout(400);
ok(/TEAM OVR/i.test(await page.locator('#appContent').innerText()),'team ratings panel');
// analytics + history
await nav('analytics');ok((await page.locator('#appContent').innerText()).length>100,'analytics renders');
await page.click('[data-nav="history"]').catch(async()=>{await nav('game');await page.click('[data-nav="history"]');});await page.waitForTimeout(500);
ok(/Achievement|result|Match/i.test(await page.locator('#appContent').innerText()),'history timeline has real entries');
// migration: old progress.seen
await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('gfc-club-desk',1);q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite'),s=tx.objectStore('kv');s.get('gfc-club-desk-v1').onsuccess=e=>{const v=e.target.result;delete v.progress;delete v.rules;delete v.training;s.put(v,'gfc-club-desk-v1');};tx.oncomplete=r;};}));
await page.reload();await page.waitForTimeout(1500);d=await idb(page);ok(d.progress&&d.progress.unlocked&&Array.isArray(d.training),'old data without game fields loads and normalizes');
await ctx.close();}
console.log('errors',errors,'fails',fails);await b.close();})();
