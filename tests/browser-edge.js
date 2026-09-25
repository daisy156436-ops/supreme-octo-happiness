const { chromium } = (()=>{try{return require('playwright')}catch(e){return require('/opt/node22/lib/node_modules/playwright')}})();
const res=[];const ok=(n,c,i='')=>res.push([c?'合格':'不合格',n,i]);
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.goto(require('url').pathToFileURL(require('path').join(__dirname,'..','リレー走順.html')).href);
const set=async(k,v)=>{await pg.click('button[data-tab=rules]');const el=await pg.$(`[data-key=${k}]`);const t=await el.getAttribute('type');if(t==='checkbox'){v?await el.check():await el.uncheck();}else if(await el.evaluate(e=>e.tagName)==='SELECT'){await el.selectOption(String(v));}else{await el.fill(String(v));await el.dispatchEvent('change');}};
const run=async()=>{await pg.click('button[data-tab=best]');await pg.click('#bestRun');await pg.waitForTimeout(300);await pg.waitForFunction(()=>!document.getElementById('busy').classList.contains('on'),null,{timeout:60000});return (await pg.textContent('#bestMsg'))+(await pg.textContent('#bestOut'));};
// 1 名簿なし
ok('名簿なしで計算 → エラー表示', (await run()).includes('2人以上'));
// 名簿 34人
const L=[];for(let i=0;i<34;i++)L.push(`生徒${i+1}\t${i%2?'女':'男'}\t${(i%2?8.9:7.8)+((i*37)%11-5)*0.12}`);
await pg.click('button[data-tab=roster]');await pg.fill('#rosterPaste',L.join('\n'));await pg.click('#rosterReplace');
let t0=Date.now();let o=await run();ok('34人の計算時間', Date.now()-t0<10000, (Date.now()-t0)+'ms');ok('34人で結果が出る', o.includes('予想タイム'));
// 2 区間数が人数より少ない
await set('legs',30);ok('区間数<人数 → エラー', (await run()).includes('多いです'));
await set('legs','');
// 3 男女交互で男女未入力の人
await pg.click('button[data-tab=roster]');await pg.selectOption('#rosterTable tbody tr:nth-child(1) select[data-f=gender]','');await pg.waitForTimeout(100);
await set('alternate',true);ok('男女未入力＋交互 → エラー', (await run()).includes('全員の男女'));
await pg.click('button[data-tab=roster]');await pg.selectOption('#rosterTable tbody tr:nth-child(1) select[data-f=gender]','男');await pg.waitForTimeout(100);
o=await run();ok('男女交互で結果', o.includes('予想タイム'));
// 4 ばらつき0
await set('jitter',0);o=await run();ok('ばらつき0でも結果（Infinityなし）', o.includes('予想タイム')&&!o.includes('Infinity')&&!o.includes('NaN'), '');
await set('jitter',0.2);
// 5 ゾーンが短すぎる
await set('zoneLen',2);ok('ゾーン2m → エラー', (await run()).includes('ゾーン'));
await set('zoneLen',20);
// 6 固定の重複・性別違い
await pg.click('button[data-tab=roster]');
await pg.fill('#rosterTable tbody tr:nth-child(1) input[data-f=pin]','2');await pg.dispatchEvent('#rosterTable tbody tr:nth-child(1) input[data-f=pin]','change');await pg.waitForTimeout(100);
ok('男子を女子の区間に固定 → エラー', (await run()).includes('女子の区間'));
await pg.click('button[data-tab=roster]');
await pg.fill('#rosterTable tbody tr:nth-child(1) input[data-f=pin]','1');await pg.dispatchEvent('#rosterTable tbody tr:nth-child(1) input[data-f=pin]','change');await pg.waitForTimeout(100);
o=await run();const first=await pg.$eval('#bestOut .tablewrap tbody tr:nth-child(1) td:nth-child(2)',e=>e.textContent);ok('1走に固定した人が1走', first.includes('生徒1'), first);
// 7 アンカー200m：いちばん速い男子がアンカーか（交互なのでアンカーは女子/男子どちらか）
await pg.click('button[data-tab=roster]');await pg.fill('#rosterTable tbody tr:nth-child(1) input[data-f=pin]','');await pg.dispatchEvent('#rosterTable tbody tr:nth-child(1) input[data-f=pin]','change');
await set('alternate',false);await set('lastLen',200);o=await run();
const rows=await pg.$$eval('#bestOut .tablewrap tbody tr',t=>t.map(r=>[r.children[1].textContent,+r.children[3].textContent]));
const minT=Math.min(...rows.map(r=>r[1]));ok('アンカー200mには最速の人', rows[rows.length-1][1]===minT, rows[rows.length-1].join(' '));
await set('lastLen','');
// 8 助走区間10m
await set('runup',10);o=await run();ok('助走10mで結果', o.includes('予想タイム')&&!o.includes('NaN'));
// 9 100mタイム
await set('timeDist',100);await pg.click('button[data-tab=roster]');ok('100m設定で50mのタイム → エラー', (await pg.textContent('#rosterSummary')).includes('考えにくい値'));
ok('ページのエラーなし', errs.length===0, errs.join('|'));
await b.close();for(const r of res)console.log(r.join('  '));console.log(res.filter(r=>r[0]==='合格').length+'/'+res.length+' 合格');})();
