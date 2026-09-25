const { chromium } = (()=>{try{return require('playwright')}catch(e){return require('/opt/node22/lib/node_modules/playwright')}})();
const results=[]; const ok=(name,cond,info='')=>{results.push([cond?'PASS':'FAIL',name,info]);};
(async()=>{
 const b=await chromium.launch({}).catch(()=>chromium.launch());
 const pg=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 pg.on('dialog',d=>d.accept('3年・体育祭'));
 await pg.goto(require('url').pathToFileURL(require('path').join(__dirname,'..','リレー走順.html')).href);
 ok('opens on rules tab', await pg.isVisible('#tab-rules'));
 ok('version shown', (await pg.textContent('#ver')).includes('2026'));
 // roster: 17 boys, 16 girls (33 people) -> 34 legs alternate => 1 girl runs twice
 const sei=['青木','石田','上野','江口','大野','加藤','木村','工藤','小松','斉藤','島田','須藤','瀬川','田村','千葉','土屋','中村','西川','野口','浜田','平野','福田','本田','前田','三浦','村上','森','安田','山口','横山','吉田','渡辺','和田'];
 const mei_m=['まこと','健太','翔','大輝','蓮','拓海','悠斗','陽太','颯','湊','樹','律','蒼','陸','奏太','海斗','大和'];
 const mei_f=['花子','さくら','葵','結衣','陽菜','凛','美咲','芽依','莉子','杏','心春','彩','紬','詩','琴音','楓'];
 let lines=['番号\t氏名\t性別\t50m']; let seed=7; const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const people=[];
 for(let i=0;i<33;i++){const m=i<17;const name=sei[i]+' '+(m?mei_m[i]:mei_f[i-17]);const t=(m?7.8:8.9)+(r()-0.5)*2.2; people.push({name,m,t});}
 people.forEach((p,i)=>{let ts=p.t.toFixed(1); if(i===3) ts=ts.replace('.','"'); if(i===5) ts=ts.replace('.','秒'); if(i===7) ts=String(Math.round(p.t*10)); if(i===9) ts=''; if(i===11) ts=ts+'秒';
   lines.push(`${i+1}\t${p.name}\t${p.m?'男':'女'}\t${ts}`);});
 lines.push('※タイムは4月の体力テストのもの');
 await pg.click('button[data-tab=roster]');
 await pg.fill('#rosterPaste',lines.join('\n'));
 await pg.click('#rosterReplace');
 const rows=await pg.$$eval('#rosterTable tbody tr',t=>t.length);
 ok('roster 33 rows', rows===33, rows); ok('まこと kept', (await pg.$eval('#rosterTable tbody tr:nth-child(1) input[data-f=name]',e=>e.value))==='青木 まこと'); ok('7.6秒 parsed', (await pg.$eval('#rosterTable tbody tr:nth-child(12) input[data-f=time]',e=>e.value))!=='');
 const pm=await pg.textContent('#rosterParseMsg');
 ok('scaled int time reported', pm.includes('10で割って'), pm.slice(0,200));
 ok('note line skipped', pm.includes('注意書き'));
 ok('missing time reported', pm.includes('タイムが読み取れなかった人'));
 const t3=await pg.$eval('#rosterTable tbody tr:nth-child(4) input[data-f=time]',e=>e.value);
 ok('7"6 style parsed', t3!=='' , t3);
 // rules
 await pg.click('button[data-tab=rules]');
 await pg.fill('[data-key=legs]','34'); await pg.dispatchEvent('[data-key=legs]','change');
 await pg.check('[data-key=alternate]');
 await pg.check('[data-key=useGenderCounts]');
 await pg.fill('[data-key=maleLegs]','17'); await pg.dispatchEvent('[data-key=maleLegs]','change');
 await pg.fill('[data-key=femaleLegs]','17'); await pg.dispatchEvent('[data-key=femaleLegs]','change');
 const rm=await pg.textContent('#rulesMsg');
 ok('rules ok message', rm.includes('計算できます'), rm);
 await pg.click('#presetSave');
 ok('preset saved', (await pg.textContent('#presetSel')).includes('3年'));
 // roster summary: one girl repeats (fastest girl)
 await pg.click('button[data-tab=roster]');
 const sum=await pg.textContent('#rosterSummary');
 const girls=people.filter(p=>!p.m&&true).map(p=>p); 
 ok('repeater chosen', sum.includes('2回走る人'), sum);
 // best
 await pg.click('button[data-tab=best]');
 const t0=Date.now(); await pg.click('#bestRun'); await pg.waitForSelector('#bestOut table',{timeout:30000});
 const dt=Date.now()-t0;
 ok('best computed in <8s', dt<8000, dt+'ms');
 const bestRows=await pg.$$eval('#bestOut .tablewrap table tbody tr',t=>t.map(r=>[...r.children].map(c=>c.textContent)));
 ok('34 legs listed', bestRows.length===34, bestRows.length);
 const alt=bestRows.every((r,i)=>r[2]===(i%2===0?'男':'女'));
 ok('alternates starting 男', alt);
 const names=bestRows.map(r=>r[1].replace(/[12]回目/,'').trim());
 const dup=names.filter((n,i)=>names.indexOf(n)!==i);
 ok('exactly one repeater, gap >= 12', dup.length===1 && (names.lastIndexOf(dup[0])-names.indexOf(dup[0])-1)>=12, dup.join(',')+' gap '+(names.lastIndexOf(dup[0])-names.indexOf(dup[0])-1));
 const statTxt=await pg.textContent('#bestOut .stats');
 ok('risk table shown', (await pg.textContent('#bestOut')).includes('走り出しがばらついたとき'));
 ok('faster than random', /この案で約 \d+\.\d秒 速い/.test(statTxt), statTxt);
 // pattern: boys fast-then... check alternation of speed: neighbor time diff sum large
 await pg.screenshot({path:require('path').join(require('os').tmpdir(),'best.png'),fullPage:false});
 // current order: two-column format, partial surname, note line
 const cur=[]; const ord=[...people.keys()]; // original roster order, but alternate genders
 const boys=people.filter(p=>p.m), gs=people.filter(p=>!p.m);
 const seq=[];for(let i=0;i<17;i++){seq.push(boys[i]);seq.push(gs[i%16]);}
 for(let i=0;i<34;i+=2){ const a=seq[i].name, c=seq[i+1].name; cur.push(`${i+1}\t${i===0?a.split(' ')[0]+a.split(' ')[1]:a}\t${i+2}\t${i===2?c.split(' ')[0]:c}`);}
 cur.push('※走順は変更になることがあります。欠席者が出た場合は担任が調整すること');
 await pg.click('button[data-tab=current]');
 await pg.fill('#currentPaste',cur.join('\n'));
 await pg.click('#currentRead');
 await pg.waitForSelector('#currentEval .stats',{timeout:20000});
 const cm=await pg.textContent('#currentParseMsg');
 ok('current read 34 legs', cm.includes('34区間'), cm.slice(0,300));
 ok('surname-only flagged unsure', cm.includes('名前の一部'), '');
 const ce=await pg.textContent('#currentEval');
 ok('swap suggestions shown', ce.includes('入れ替え'), ce.slice(0,300));
 const before=(ce.match(/いまの走順の予想タイム([\d.]+)秒/)||[])[1];
 const btn=await pg.$$('#currentEval button[data-apply]');
 if(btn.length){ await btn[btn.length-1].click(); await pg.waitForTimeout(500);
   const ce2=await pg.textContent('#currentEval'); const after=(ce2.match(/いまの走順の予想タイム([\d.]+)秒/)||[])[1];
   ok('applying swaps makes it faster', +after < +before, before+' -> '+after); }
 else ok('swap buttons exist', false);
 // print
 await pg.click('button[data-tab=print]');
 ok('print shows order', (await pg.$$('#printOut table')).length>=2);
 await pg.pdf({path:require('path').join(require('os').tmpdir(),'print.pdf')}).catch(e=>errs.push('pdf '+e.message));
 // autosave: reload keeps state
 await pg.waitForTimeout(1200);
 await pg.reload(); await pg.waitForTimeout(300);
 await pg.click('button[data-tab=roster]');
 ok('persisted after reload', (await pg.$$eval('#rosterTable tbody tr',t=>t.length))===33);
 await pg.click('button[data-tab=best]');
 await pg.waitForSelector('#bestOut .tablewrap',{timeout:30000}).catch(()=>{});
 ok('再読み込み後も④の案が自動で出る', (await pg.$$('#bestOut .tablewrap tbody tr')).length===34);
 await pg.reload(); await pg.waitForTimeout(300);
 await pg.click('button[data-tab=print]');
 await pg.waitForSelector('#printOut table',{timeout:30000}).catch(()=>{});
 ok('再読み込み直後の印刷でも④の案が出る', (await pg.$$('#printOut table')).length>=2);
 await pg.click('button[data-tab=save]');
 ok('generations listed', (await pg.$$('#genList button[data-gen]')).length>=1);
 // rule change later: zone 30, runup 10, recompute
 await pg.click('button[data-tab=rules]');
 await pg.fill('[data-key=zoneLen]','30'); await pg.dispatchEvent('[data-key=zoneLen]','change');
 await pg.fill('[data-key=zoneBefore]','20'); await pg.dispatchEvent('[data-key=zoneBefore]','change');
 await pg.fill('[data-key=runup]','10'); await pg.dispatchEvent('[data-key=runup]','change');
 await pg.click('button[data-tab=best]'); await pg.click('#bestRun'); await pg.waitForSelector('#bestOut table',{timeout:30000});
 const txt=await pg.textContent('#bestOut table');
 ok('runup positions appear (手前)', txt.includes('手前'), '');
 // error: legs mismatch
 await pg.click('button[data-tab=rules]');
 await pg.fill('[data-key=maleLegs]','20'); await pg.dispatchEvent('[data-key=maleLegs]','change');
 ok('mismatch error shown', (await pg.textContent('#rulesMsg')).includes('合いません'));
 await pg.click('#presetLoad');
 ok('preset restores', (await pg.textContent('#rulesMsg')).includes('計算できます'));
 // mobile width no horizontal overflow of body
 await pg.setViewportSize({width:390,height:800});
 const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 ok('no page-level horizontal scroll on phone', ov<=1, ov);
 ok('no console errors', errs.length===0, errs.join(' | '));
 await b.close();
 for(const r of results) console.log(r.join('  '));
 console.log(results.filter(r=>r[0]==='PASS').length+'/'+results.length+' passed');
})();
