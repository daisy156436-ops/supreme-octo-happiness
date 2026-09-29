// 謎解き脱出.html（先生用）と 謎解きカード.html（タブレット用）を、ブラウザで本番と同じように操作して確かめる
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path'), url = require('url');
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
const fileUrl = f => url.pathToFileURL(path.join(__dirname, '..', f)).href;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('dialog', d => d.accept());
  await pg.goto(fileUrl('謎解き脱出.html'));
  const S = () => pg.evaluate(() => JSON.parse(JSON.stringify(S)));
  const space = async () => { await pg.keyboard.press('Space'); await pg.waitForTimeout(120); };
  const ago = min => pg.evaluate(m => { S.game.startAt -= m * 60000; }, min);

  ok('はじめは①遊び方', await pg.isVisible('#tab-guide'));

  // ② 設定
  await pg.click('button[data-tab=setup]');
  ok('はじめは20チーム・25分', (await pg.$$eval('#teamList input', x => x.length)) === 20 && (await pg.inputValue('#sMin')) === '25');
  ok('ヒントの予定：7分から3分ごと', (await pg.textContent('#hintPlan')).startsWith('7分') && (await pg.textContent('#hintPlan')).includes('22分'));
  await pg.fill('#sHint0', '20'); await pg.dispatchEvent('#sHint0', 'change');
  ok('制限時間をこえるヒントを知らせる', (await pg.textContent('#hintPlan')).includes('制限時間'));
  await pg.fill('#sHint0', '7'); await pg.dispatchEvent('#sHint0', 'change');
  await pg.fill('#nClass', '3'); await pg.fill('#nPerClass', '4'); await pg.click('#nameClass');
  let st = await S();
  ok('3クラス×4班で12チーム', st.teams.count === 12 && st.teams.names[11] === '3組4班');

  // ③ 謎と答え
  await pg.click('button[data-tab=answers]');
  const ans = await pg.textContent('#answerList');
  ok('先生用に答え・ヒント・解説', ['ありがとう', 'きもち', 'こあら', 'ゆめ', 'なかま', 'かい', 'あきらめない'].every(a => ans.includes(a)) && ans.includes('ヒント') && (await pg.$$eval('#answerList .card', x => x.length)) === 7);
  ok('映さないように注意', (await pg.textContent('#tab-answers')).includes('映さないで'));

  // ⑤ 印刷
  await pg.click('button[data-tab=print]');
  ok('謎の紙は3ページ', (await pg.$$eval('#printPreview .page', x => x.length)) === 3 && (await pg.textContent('#pHint')).includes('12'));
  ok('謎の紙に6つの謎と最後のとびら', (await pg.$$eval('#printPreview .nz', x => x.length)) === 7);
  ok('謎の紙に答えはのっていない', !/ありがとう|きもち|こあら|なかま|あきらめない/.test(await pg.textContent('#printPreview')));
  await pg.emulateMedia({ media: 'print' });
  const over = await pg.$$eval('#printPreview .page', ps => ps.map(p => p.scrollHeight - p.clientHeight));
  ok('印刷で各ページに収まる', over.every(v => v <= 1), over.join(','));
  await pg.emulateMedia({ media: 'screen' });
  await pg.check('input[name=pKind][value=key]');
  ok('先生用の答えは1ページ', (await pg.$$eval('#printPreview .page', x => x.length)) === 1 && (await pg.textContent('#printPreview')).includes('あきらめない'));

  // ④ 本番
  await pg.click('button[data-tab=play]');
  ok('はじめは「続きから」なし', !(await pg.isVisible('#playResume')));
  await pg.click('#playNew');
  ok('お話の画面', await pg.isVisible('#stage') && (await pg.textContent('#stMain')).includes('体育館からの脱出') && (await pg.textContent('#stMain')).includes('25分'));
  await space();
  ok('ルールの画面', (await pg.textContent('#stMain')).includes('あいことば') && (await pg.textContent('#stPrimary')).includes('スタート'));
  await space();
  st = await S();
  ok('スタートでタイマーが動く', st.game.phase === 'play' && !!st.game.startAt && /25:00|24:5\d/.test(await pg.textContent('#bigTime')), await pg.textContent('#bigTime'));
  ok('スペースキーで勝手に終わらない', (await space(), (await S()).game.phase === 'play'));
  ok('はじめはヒントなし', (await pg.textContent('.hints')).includes('7分たつと'));
  ok('12チームのボタン', (await pg.$$eval('.tb', x => x.length)) === 12);
  await ago(7.05);
  await pg.waitForTimeout(700);
  st = await S();
  ok('7分でヒント1回目（謎1・謎3）', JSON.stringify(st.game.released) === '[0]' && (await pg.textContent('.hints')).includes('謎1') && (await pg.textContent('.hints')).includes('謎3'), JSON.stringify(st.game.released));
  await pg.click('#stPause');
  const t1 = await pg.textContent('#bigTime');
  await pg.waitForTimeout(1300);
  ok('一時停止で止まる', (await pg.textContent('#bigTime')) === t1 && (await pg.textContent('#nextHint')).includes('一時停止'));
  await ago(10);
  await pg.waitForTimeout(600);
  ok('一時停止中はヒントが出ない', (await S()).game.released.length === 1);
  await pg.click('#stPause');
  await pg.waitForTimeout(700);
  ok('再開すると、たまっていたヒントが出る', (await S()).game.released.length >= 3, JSON.stringify((await S()).game.released));
  await pg.click('#stHintNow');
  ok('ヒントを今出す', (await S()).game.released.length >= 4);
  // 脱出の記録
  await pg.click('.tb[data-t="4"]');
  await pg.waitForTimeout(200);
  st = await S();
  ok('脱出を記録', st.game.escapes[4] != null && st.game.escapes[4] % 1000 === 0 && (await pg.textContent('.tb[data-t="4"]')).includes('1位'));
  ok('脱出の知らせ', (await pg.textContent('#banner')).includes('脱出成功'));
  await pg.click('.tb[data-t="7"]'); await pg.click('.tb[data-t="9"]');
  await pg.evaluate(() => { S.game.escapes[7] = S.game.escapes[9] = S.game.escapes[4] + 60000; renderStage(); });
  ok('同じタイムは同じ順位', (await pg.textContent('.tb[data-t="7"]')).includes('2位') && (await pg.textContent('.tb[data-t="9"]')).includes('2位'));
  ok('脱出の数', (await pg.textContent('.clock .count')).includes('3'));
  await pg.click('.tb[data-t="9"]');
  ok('もう一度押すと取り消し', (await S()).game.escapes[9] == null);
  // 途中でページを閉じても続きから
  await pg.reload();
  ok('再読み込み後に「続きから」', await pg.isVisible('#playResume') && (await pg.textContent('#playStatus')).includes('謎解きの途中'));
  await pg.click('#playResume');
  ok('続きから同じ記録', Object.keys((await S()).game.escapes).length === 2 && await pg.isVisible('#bigTime'));
  // 時間切れ
  await ago(30);
  await pg.waitForTimeout(700);
  ok('時間切れで「タイムアップ」', (await S()).game.phase === 'timeup' && (await pg.textContent('#stMain')).includes('タイムアップ'));
  await pg.click('#stPlus');
  ok('＋1分で再開できる', (await S()).game.phase === 'play' && remainingOk(await pg.textContent('#bigTime')), await pg.textContent('#bigTime'));
  await pg.click('#stEnd');
  ok('「ここで終わる」', (await S()).game.phase === 'timeup');
  // 解説
  await space();
  ok('解説1問目', (await pg.textContent('.explain .answer')).includes('ありがとう') && (await pg.$$eval('.collected span.on', x => x.length)) === 1);
  for (let i = 0; i < 5; i++) await space();
  ok('解説6問目', (await pg.textContent('.explain .answer')).includes('かい') && (await pg.$$eval('.collected span.on', x => x.length)) === 6);
  await space();
  ok('最後のとびらの解説', (await pg.textContent('.explain .answer')).includes('あきらめない'));
  await pg.click('#stBack');
  ok('もどる', (await pg.textContent('.explain .answer')).includes('かい'));
  await space(); await space();
  ok('結果発表：はじめは？', (await S()).game.phase === 'result' && (await pg.$$eval('.pod .q', x => x.length)) >= 1);
  const G = await pg.evaluate(() => podiumRanks(S.game));
  ok('結果発表は2位から（1位・2位の2つ）', JSON.stringify(G) === '[1,2]' && (await pg.textContent('#stPrimary')).includes('2位'), JSON.stringify(G));
  await space(); await space();
  const r1 = await pg.textContent('.pod.r1');
  ok('1位を表示', r1.includes((await S()).game.names[4]), r1);
  ok('あと一歩のチーム', (await pg.textContent('.others')).includes('あと一歩'));
  ok('発表が終わるとボタンが消える', !(await pg.isVisible('#stPrimary')));

  // 4:3のプロジェクター・20チーム・ヒント全部
  await pg.click('#stClose');
  await pg.setViewportSize({ width: 1024, height: 768 });
  await pg.click('button[data-tab=setup]');
  await pg.fill('#sCount', '20'); await pg.dispatchEvent('#sCount', 'change');
  await pg.click('button[data-tab=play]');
  await pg.click('#playNew');
  await space(); await space();
  await ago(23);
  await pg.waitForTimeout(800);
  for (const t of [0, 5, 12, 19]) await pg.click(`.tb[data-t="${t}"]`);
  await pg.waitForTimeout(3000);
  const fit = await pg.evaluate(() => {
    const bad = [];
    document.querySelectorAll('#stMain .panel').forEach((p, i) => { if (p.scrollHeight > p.clientHeight + 1) bad.push('panel' + i); });
    const H = document.querySelector('#stMain .hints');
    if (H.scrollHeight > H.clientHeight + 1) bad.push('hints');
    const T = document.getElementById('bigTime'), P = T.closest('.panel').getBoundingClientRect(), r = T.getBoundingClientRect();
    if (T.scrollWidth > T.clientWidth + 1 || r.right > P.right) bad.push('timer');
    document.querySelectorAll('.tb').forEach(x => { const q = x.getBoundingClientRect(); if (q.height < 18) bad.push('tb' + x.dataset.t); });
    return { released: S.game.released.length, bad };
  });
  ok('4:3・20チーム・ヒント全部でもはみ出さない', fit.released === 6 && !fit.bad.length, JSON.stringify(fit));
  await pg.close();

  // タブレット
  const cp = await ctx.newPage();
  cp.on('pageerror', e => errs.push('card: ' + e.message));
  cp.on('dialog', d => d.accept());
  await cp.setViewportSize({ width: 820, height: 1180 });
  await cp.goto(fileUrl('謎解きカード.html'));
  ok('カード：はじめはチームを選ぶ', await cp.isVisible('#pick') && (await cp.$$eval('#teams button', x => x.length)) === 20);
  await cp.click('#teams button[data-t="7"]');
  ok('カード：スタートを待つ', await cp.isVisible('#wait') && (await cp.textContent('#wTeam')) === '7');
  await cp.click('#start');
  ok('カード：謎の一覧', await cp.isVisible('#list') && (await cp.$$eval('.pz', x => x.length)) === 6 && (await cp.textContent('#lCount')).includes('0 / 6'));
  const solve = async (id, text) => { await cp.click(`.pz[data-id="${id}"]`); await cp.fill('#pIn', text); await cp.click('#pForm button'); await cp.waitForTimeout(80); const r = await cp.textContent('#pRes'); await cp.click('#pBack'); return r; };
  ok('カード：まちがいは「ちがうみたい」', (await solve(2, 'ちねぬ')).includes('ちがう'));
  ok('カード：カタカナでも正解', (await solve(2, 'キモチ')).includes('正解') && (await cp.textContent('.pz[data-id="2"]')).includes('き'));
  ok('カード：漢字でも正解', (await solve(6, '会')).includes('「い」'));
  for (const [id, a] of [[1, 'ありがとう'], [3, 'こあら'], [4, '夢'], [5, 'なかま']]) await solve(id, a);
  ok('カード：6つ解くと、とびらに文字がそろう', (await cp.textContent('#doorBoxes')).replace(/\d/g, '').includes('あきらめない') && (await cp.textContent('#lCount')).includes('6 / 6'), await cp.textContent('#doorBoxes'));
  await cp.click('#toFinal');
  await cp.fill('#pIn', 'あきらめ'); await cp.click('#pForm button');
  ok('カード：最後のとびらもまちがいは通らない', (await cp.textContent('#pRes')).includes('ちがう') && await cp.isVisible('#puzzle'));
  await cp.fill('#pIn', 'あきらめない'); await cp.click('#pForm button');
  ok('カード：脱出成功の画面', await cp.isVisible('#escaped') && (await cp.textContent('#eTeam')).includes('7') && (await cp.textContent('#eTime')).includes('0:0'));
  await cp.reload();
  ok('カード：開き直しても脱出成功のまま', await cp.isVisible('#escaped'));
  await cp.click('#eBack');
  ok('カード：一覧にもどれる', await cp.isVisible('#list'));
  // 横向き
  await cp.setViewportSize({ width: 1180, height: 820 });
  await cp.click('.pz[data-id="2"]');
  const land = await cp.evaluate(() => { const s = document.querySelector('#pSheet').getBoundingClientRect(); return s.right <= innerWidth + 1 && document.querySelector('.nz-clock svg').getBoundingClientRect().width > 80; });
  ok('カード：横向きでも見える', land);
  await cp.click('#pBack');
  // 記録を消す
  await cp.evaluate(() => { C.team = 0; save(); });
  await cp.reload();
  await cp.click('#reset');
  await cp.click('#teams button[data-t="3"]');
  ok('カード：記録を消すと最初から', await cp.isVisible('#wait'));

  ok('エラーなし', errs.length === 0, errs.join(' / '));
  await b.close();
  let f = 0;
  results.forEach(x => { if (x[0] === 'FAIL') f++; console.log(x[0], x[1], x[2]); });
  console.log(`\n${results.length - f}/${results.length} PASS`);
  process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
function remainingOk(t) { const [m, s] = t.split(':').map(Number); return m * 60 + s > 0 && m * 60 + s <= 60; }
