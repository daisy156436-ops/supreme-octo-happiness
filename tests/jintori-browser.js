// 陣取りクイズ.html と 回答カード.html を、ブラウザで先生・生徒と同じように操作して確かめる
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path'), url = require('url'), fs = require('fs'), os = require('os');
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
const fileUrl = f => url.pathToFileURL(path.join(__dirname, '..', f)).href;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('dialog', d => d.accept());
  await pg.goto(fileUrl('陣取りクイズ.html'));
  const S = () => pg.evaluate(() => JSON.parse(JSON.stringify(S)));
  const space = async () => { await pg.keyboard.press('Space'); await pg.waitForTimeout(120); };

  ok('はじめは①遊び方', await pg.isVisible('#tab-guide'));
  ok('版を表示', (await pg.textContent('#ver')).includes('2026'));

  // ② チーム
  await pg.click('button[data-tab=teams]');
  ok('はじめは16チーム', (await pg.$$eval('#teamList input', x => x.length)) === 16);
  await pg.fill('#nClass', '3'); await pg.fill('#nPerClass', '4'); await pg.click('#nameClass');
  let st = await S();
  ok('3クラス×4班で12チーム', st.teams.count === 12 && st.teams.names[0] === '1組1班' && st.teams.names[11] === '3組4班', st.teams.names.slice(0, 12).join(','));
  ok('並びは横に4チーム', st.teams.cols === 4 && (await pg.$$eval('#seatGrid .sw', x => x.length)) === 12);
  ok('人数の目安', (await pg.textContent('#tPer')).includes('8〜9'), await pg.textContent('#tPer'));
  await pg.fill('#teamList input[data-i="2"]', 'タイガース');
  await pg.waitForTimeout(400);
  ok('名前を書きかえられる', (await S()).teams.names[2] === 'タイガース');
  const cells0 = await pg.$$eval('#boardPreview g.cell', x => x.length);
  await pg.selectOption('#tSize', 'large');
  const cells1 = await pg.$$eval('#boardPreview g.cell', x => x.length);
  ok('地図の広さで盤が変わる', cells1 > cells0 && cells0 >= 120, `${cells0}→${cells1}`);
  await pg.selectOption('#tSize', 'normal');
  ok('見本の地図にスタート地点12個', (await pg.$$eval('#boardPreview g.home', x => x.length)) === 12);

  // ③ 問題
  await pg.click('button[data-tab=questions]');
  ok('サンプルは練習1＋本番20', (await pg.$$eval('.qcard', x => x.length)) === 21 && (await pg.textContent('#qSummary')).includes('本番 20問'), await pg.textContent('#qSummary'));
  ok('サンプルに直すところはない', !(await pg.textContent('#qSummary')).includes('直すところ'));
  ok('時間の目安は40〜45分', /約(3[8-9]|4[0-5])分/.test(await pg.textContent('#qSummary')), await pg.textContent('#qSummary'));
  const paste = [
    '問題\tA\tB\tC\tD\t正解\t種類\t秒\t解説',
    '校長先生の好きな食べ物は？\tカレー\tラーメン\tすし\tうどん\tウ\t2\t30\t毎週食べているそうです',
    '3の次は？\t2\t3\t4\t5\t３\t\t\t',
    '体育館のたての長さは何m？\t\t\t\t\t32m\tボーナス\t',
    'この学校は何年にできた？|1950年|1960年|1970年|1980年|1960年|練習||',
    '正解が合わない問題\tあ\tい\t\t\tE\t\t\t',
    '種類が変\tあ\tい\t\t\tA\tすごい\t\t',
    '先生とにらめっこ\t\t\t\t\t笑わなかったチーム\tボーナス・ミッション・ルーレット\t\t',
  ].join('\n');
  await pg.click('#pasteBox summary');
  await pg.fill('#qPaste', paste);
  await pg.click('#qPasteAdd');
  st = await S();
  const add = st.questions.slice(21);
  ok('貼り付けで7問追加', add.length === 7, add.length);
  ok('種類の列でミッション・ルーレット', add[6].kind === '2' && add[6].mission && add[6].roulette && add[6].answerText === '笑わなかったチーム', JSON.stringify(add[6]));
  ok('正解「ウ」→C、種類2', add[0].answer === 'C' && add[0].kind === '2' && add[0].sec === '30' && add[0].note.includes('毎週'));
  ok('正解「３」（全角）→C', add[1].answer === 'C', add[1].answer);
  ok('選択肢なし→正解は文字', add[2].answer === '' && add[2].answerText === '32m' && add[2].kind === '2');
  ok('「|」区切り・選択肢の文字で正解・練習', add[3].answer === 'B' && add[3].kind === 'p' && add[3].choices[3] === '1980年');
  const pmsg = await pg.textContent('#qPasteMsg');
  ok('見出し行をとばしたと表示', pmsg.includes('見出し'));
  ok('合わない正解を知らせる', pmsg.includes('「E」') && add[4].answer === '', pmsg);
  ok('読めない種類を知らせる', pmsg.includes('「すごい」') && add[5].kind === '1');
  ok('直すところの数を表示', (await pg.textContent('#qSummary')).includes('1問'), await pg.textContent('#qSummary'));
  ok('問題カードに赤い字', (await pg.textContent('.qcard[data-i="25"] .qwarn')).includes('正解が選ばれていません'));
  await pg.check('.qcard[data-i="25"] input[data-f=answer][value=B]');
  await pg.waitForTimeout(100);
  ok('正解を選ぶと赤い字が消える', (await pg.textContent('.qcard[data-i="25"] .qwarn')) === '');
  await pg.click('.qcard[data-i="26"] button[data-act=up]');
  ok('並びかえ', (await S()).questions[25].text === '種類が変');
  await pg.click('.qcard[data-i="25"] button[data-act=del]');
  ok('削除', (await S()).questions.length === 27);
  await pg.click('#qSample');
  ok('サンプル問題にもどす', (await S()).questions.length === 21);
  // 練習問題の時間を5秒にして、時間切れを確かめる
  await pg.fill('.qcard[data-i="0"] input[data-f=sec]', '5');
  await pg.waitForTimeout(400);
  ok('問題ごとの時間', (await S()).questions[0].sec === '5');

  // ⑤ 印刷
  await pg.click('button[data-tab=print]');
  ok('回答カードは6ページ', (await pg.$$eval('#printPreview .page', x => x.length)) === 6);
  await pg.check('input[name=pKind][value=teams]');
  ok('チーム札はチームの数', (await pg.$$eval('#printPreview .page', x => x.length)) === 12 && (await pg.textContent('#printPreview')).includes('タイガース'));
  await pg.check('input[name=pKind][value=script]');
  ok('台本に全問と正解', (await pg.$$eval('#printPreview tbody tr', x => x.length)) === 21 && (await pg.textContent('#printPreview')).includes('信濃川'));
  await pg.emulateMedia({ media: 'print' });
  ok('印刷ではタブをかくす', !(await pg.isVisible('nav')) && await pg.isVisible('#printPreview'));
  await pg.emulateMedia({ media: 'screen' });

  // ④ 本番
  const state = () => pg.evaluate(() => ({ phase: S.game.phase, qi: S.game.qi, intro: S.game.introStep, spin: !!SPIN, drum: !!DRUM, anim: !!ANIM, ev: S.game.events[S.game.qi] || null }));
  const until = async (pred, max = 80) => { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await space(); } throw new Error('進みませんでした'); };
  const cnts = () => pg.evaluate(() => counts(S.game.owners, S.game.n));
  await pg.click('button[data-tab=play]');
  ok('はじめは「続きから」なし', !(await pg.isVisible('#playResume')));
  ok('おたのしみの確認表示', /💎お宝.*🔥連続正解.*🎯少数正解.*🎰ルーレット2回.*🎭ミッション2問/.test(await pg.textContent('#playCheck')), await pg.textContent('#playCheck'));
  await pg.click('#playNew');
  ok('本番画面が出る', await pg.isVisible('#stage') && !(await pg.isVisible('nav')));
  ok('ルール説明', (await pg.textContent('#stLeft')).includes('陣取りクイズのルール'));
  ok('地図に12チームの★', (await pg.$$eval('#map g.home', x => x.length)) === 12);
  ok('地図にお宝6個', (await pg.$$eval('#map g.has-gem', x => x.length)) === 6);
  const home0 = await pg.evaluate(() => BOARD.homes.slice()), gem0 = (await S()).game.treasureAll;
  await pg.click('#stShuffle');
  ok('スタート地点を変える（お宝も）', JSON.stringify(await pg.evaluate(() => BOARD.homes.slice())) !== JSON.stringify(home0) && JSON.stringify((await S()).game.treasureAll) !== JSON.stringify(gem0));
  await space();
  const fun = await pg.textContent('#stLeft');
  ok('おたのしみルールの画面', ['お宝マス', '連続正解', '少数正解', '3チーム以下', 'チャンスタイム', 'ミッション'].every(w => fun.includes(w)), fun.slice(0, 120));
  await space();
  ok('練習問題を表示', (await pg.textContent('#stTitle')).includes('練習問題') && (await pg.textContent('#stLeft')).includes('パンダ'));
  ok('正解はまだ出ない', !(await pg.$('.choice.ok')));
  ok('タイマー5秒', (await pg.textContent('#stTimer')) === '5');
  await pg.click('#stPlus');
  ok('＋10秒（始める前）', (await pg.textContent('#stTimer')) === '15');
  await pg.evaluate(() => { S.game.timer.left = 5; renderStage(); });
  await space();
  await pg.waitForTimeout(1300);
  const tt = +(await pg.textContent('#stTimer'));
  ok('タイマーが進む', tt <= 4 && tt >= 3, tt);
  await pg.click('#stPause');
  const tp = await pg.textContent('#stTimer');
  await pg.waitForTimeout(1200);
  ok('一時停止で止まる', (await pg.textContent('#stTimer')) === tp && (await pg.getAttribute('#stTimer', 'class')) === 'paused');
  await pg.click('#stPause');
  await pg.waitForTimeout(4500);
  ok('時間切れで「せーの！」', (await S()).game.phase === 'up' && (await pg.textContent('#stLeft')).includes('せーの'));
  await space();
  ok('正解発表の前にドラムロール', (await pg.textContent('#stLeft')).includes('正解は') && !(await pg.$('.choice.ok')) && (await pg.textContent('#stPrimary')).includes('すぐ発表'));
  await pg.waitForTimeout(1700);
  ok('ドラムロールのあと正解が光る', (await S()).game.phase === 'reveal' && (await pg.textContent('.choice.ok')).includes('白'));
  ok('正解チームのボタン12個', (await pg.$$eval('.tg', x => x.length)) === 12);
  await pg.click('.tg[data-t="0"]'); await pg.click('.tg[data-t="5"]');
  ok('ボタンで○がつく', (await pg.textContent('#tgCount')) === '2' && (await pg.getAttribute('.tg[data-t="0"]', 'aria-pressed')) === 'true');
  await pg.click('.tg[data-t="5"]');
  ok('もう一度押すと外れる', (await pg.textContent('#tgCount')) === '1');
  const ownersP = (await S()).game.owners;
  await space();
  ok('練習では陣地が変わらない', JSON.stringify((await S()).game.owners) === JSON.stringify(ownersP) && (await pg.textContent('#stLeft')).includes('練習なので'));
  ok('練習では連続正解を数えない', (await S()).game.streak.every(v => v === 0));

  // 第1問：1〜5班が正解（少数正解にはならない）
  await until(s => s.phase === 'reveal' && s.qi === 1);
  ok('第1問', (await pg.textContent('#stTitle')).includes('第1問'));
  for (const t of [0, 1, 2, 3, 4]) await pg.click(`.tg[data-t="${t}"]`);
  let c0 = await cnts();
  await space();
  await pg.waitForTimeout(1800);
  st = await S();
  let cnt = await cnts();
  const gemTeams = (st.game.last.gems || []).map(x => x.team);
  ok('正解チームが1マス（お宝なら＋1）増える', cnt.every((c, t) => c - c0[t] === (t < 5 ? 1 + gemTeams.filter(x => x === t).length : 0)), cnt.join(','));
  ok('順位表に＋1', (await pg.textContent('#stRank')).includes('+1'));
  ok('連続正解を数える', st.game.streak.slice(0, 5).every(v => v === 1) && st.game.streak.slice(5).every(v => v === 0));
  const own1 = st.game.owners;
  await pg.click('#stUndo');
  cnt = await cnts();
  st = await S();
  ok('1問もどす', cnt.every(c => c === 1) && st.game.phase === 'reveal' && st.game.streak.every(v => v === 0) && st.game.treasure.length === 6);
  ok('もどしても○は残る', (await pg.textContent('#tgCount')) === '5');
  await space();
  await space(); // アニメーションをとばす
  ok('やり直すと同じ結果', JSON.stringify((await S()).game.owners) === JSON.stringify(own1));
  ok('アニメーションをとばすと次へ', (await pg.textContent('#stPrimary')).includes('次の問題'));

  // 途中でページを閉じても続きから
  await pg.reload();
  ok('再読み込み後に「続きから」', await pg.isVisible('#playResume') && (await pg.textContent('#playStatus')).includes('第1問'));
  await pg.click('#playResume');
  ok('続きから同じ陣地', JSON.stringify((await S()).game.owners) === JSON.stringify(own1) && (await pg.textContent('#stPrimary')).includes('次の問題'));

  // 第2問はとばす（連続正解は切れない）
  await space();
  await pg.click('#stSkip');
  ok('問題をとばす', (await pg.textContent('#stTitle')).includes('第3問') && (await S()).game.streak[0] === 1);

  // 第3問：1班だけ正解 → 少数正解ボーナス
  await until(s => s.phase === 'reveal' && s.qi === 3);
  await pg.click('.tg[data-t="0"]');
  c0 = await cnts();
  await space(); await space();
  st = await S();
  cnt = await cnts();
  ok('少数正解ボーナス ＋1', st.game.last.few && cnt[0] - c0[0] === 2 + (st.game.last.gems || []).length && (await pg.textContent('#stLeft')).includes('少数正解'), `${c0[0]}→${cnt[0]}`);

  // 第4問：ミッション（1班が成功 → 3問連続）
  await until(s => s.phase === 'show' && s.qi === 4);
  ok('ミッションの表示', (await pg.textContent('#stTitle')).includes('ミッション') && (await pg.textContent('#stLeft')).includes('以心伝心') && (await pg.textContent('#stLeft')).includes('できたチームが正解'));
  await until(s => s.phase === 'reveal');
  ok('ミッションの成功条件', (await pg.textContent('.answerbox')).includes('成功'));
  await pg.click('.tg[data-t="0"]'); await pg.click('.tg[data-t="6"]');
  await space(); await space();
  st = await S();
  ok('3問連続正解ボーナス', st.game.streak[0] === 3 && st.game.last.gains[0] === 2 + 1 && (await pg.textContent('#stLeft')).includes('連続正解ボーナス'), JSON.stringify(st.game.last.gains));
  ok('順位表に🔥', (await pg.textContent(`#stRank .rk[data-t="0"]`)).includes('🔥3'));
  ok('実況が出る', (await pg.$$eval('.live div', x => x.length)) >= 1, await pg.textContent('#stLeft'));

  // 第8問：ルーレット
  await until(s => s.phase === 'spin');
  st = await S();
  ok('ルーレットは第8問', st.game.qi === 8 && (await pg.textContent('#stTitle')).includes('第8問') && (await pg.textContent('#stTitle')).includes('チャンスタイム'));
  ok('ルーレットの画面', await pg.isVisible('#wheel') && (await pg.textContent('#stPrimary')).includes('ルーレットを回す'));
  // ラッキー：全チーム＋1 → 1問もどすで、回す前にもどる
  c0 = await cnts();
  await pg.evaluate(() => applyEvent('lucky', 45));
  await pg.waitForTimeout(3500);
  cnt = await cnts();
  st = await S();
  ok('ラッキー：全チームすぐ＋1', cnt.every((c, t) => c - c0[t] >= 1) && st.game.events[8] === 'lucky' && (await pg.textContent('#stLeft')).includes('ラッキー'), cnt.map((c, t) => c - c0[t]).join(','));
  await pg.click('#stUndo');
  st = await S();
  ok('ラッキーを取り消すとルーレットの前にもどる', JSON.stringify(await cnts()) === JSON.stringify(c0) && st.game.phase === 'spin' && !st.game.events[8]);
  await space();
  ok('回っている間は「すぐ止める」', (await state()).spin && (await pg.textContent('#stPrimary')).includes('すぐ止める'));
  await space();
  await pg.waitForTimeout(300);
  st = await S();
  const ev8 = st.game.events[8];
  ok('ルーレットの結果', !!ev8 && (await pg.isVisible('.evcard')) && (await pg.textContent('#stTitle')).includes(({ double: 'ダブル', underdog: '下剋上', risk: 'ハイリスク', lucky: 'ラッキー' })[ev8]), ev8);
  if (ev8 === 'lucky') await pg.waitForTimeout(3500);
  await until(s => s.phase === 'show' && !s.anim);
  ok('問題にも特別ルールが出る', ev8 === 'lucky' || (await pg.textContent('.evline')).length > 0);

  // ハイリスクを試す：全チームまちがい → 4マス以上のチームが1マス失う
  await until(s => s.phase === 'result' && s.qi === 8);
  await until(s => s.phase === 'show' || s.phase === 'spin');
  await pg.evaluate(() => { S.game.events[S.game.qi] = 'risk'; S.game.phase = 'reveal'; renderStage(); });
  c0 = await cnts();
  await space(); await space();
  cnt = await cnts();
  ok('ハイリスク：まちがえた4マス以上のチームが1マス失う', cnt.every((c, t) => c === c0[t] - (c0[t] > 3 ? 1 : 0)) && (await pg.textContent('#stLeft')).includes('ハイリスク'), c0.join(',') + ' → ' + cnt.join(','));

  // 最後まで：毎問ランダムに正解（1班はいつも正解）
  let seed = 11;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let guard = 0, maxLoss = 0, sawRank = false;
  while ((await state()).phase !== 'final' && guard++ < 300) {
    const g = await state();
    if (g.phase === 'reveal') {
      for (let t = 0; t < 12; t++) if (t === 0 || r() < 0.55) await pg.click(`.tg[data-t="${t}"]`);
      const a = await cnts();
      await space(); await space();
      const z = await cnts();
      maxLoss = Math.max(maxLoss, ...a.map((v, t) => v - z[t]));
      if (/[▲▼]/.test(await pg.textContent('#stRank'))) sawRank = true;
    } else if (g.phase === 'spin' && !g.ev && !g.spin) { await space(); await space(); await pg.waitForTimeout(g.ev === 'lucky' ? 3500 : 100); }
    else await space();
  }
  st = await S();
  ok('最後の問題は逆転チャンス', st.game.qs[st.game.qs.length - 1].kind === '3');
  ok('結果発表まで進む', st.game.phase === 'final', st.game.phase);
  ok('1問で減るのは上限まで（逆転3マス×2＋ハイリスク1）', maxLoss <= 7, maxLoss);
  ok('順位の上がり下がり（▲▼）が出る', sawRank);
  ok('ルーレットは2回とも回った', !!st.game.events[8] && !!st.game.events[14], JSON.stringify(st.game.events));
  cnt = await cnts();
  ok('マスの合計は盤と同じか少ない', cnt.reduce((a, c) => a + c, 0) <= (await pg.evaluate(() => BOARD.cells.length)));
  ok('はじめは順位をかくす', (await pg.$$eval('.pod .q', x => x.length)) >= 1 && !(await pg.isVisible('#stRank')));
  const G = await pg.evaluate(() => finalGroups(S.game));
  ok('最初は' + G[G.length - 1] + '位の発表', (await pg.textContent('#stPrimary')).includes(G[G.length - 1] + '位'));
  for (let i = 0; i < G.length; i++) await space();
  const topTeams = cnt.map((c, t) => t).filter(t => cnt[t] === Math.max(...cnt));
  const r1 = await pg.textContent('.pod.r1');
  ok('1位のチームを表示', topTeams.every(t => r1.includes(st.game.names[t])) && r1.includes(Math.max(...cnt) + 'マス'), r1);
  ok('優勝の表示', /優勝/.test(await pg.textContent('.final-wrap h2')));
  ok('発表が終わるとボタンが消える', !(await pg.isVisible('#stPrimary')));
  await pg.click('#stClose');
  ok('閉じると④にもどる', await pg.isVisible('#tab-play'));

  // 最終問題へとぶ（最終問題の予告が出る）
  await pg.click('#playNew');
  await until(s => s.phase === 'show' && s.qi === 1);
  await pg.click('#stLast');
  ok('最終問題へとぶ', (await pg.textContent('#stTitle')).includes('第20問') && (await pg.textContent('#stTitle')).includes('逆転'));
  ok('最終問題の予告', (await pg.textContent('.lastcall')).includes('最終問題'));
  await pg.click('#stClose');

  // おたのしみを切ると、ルール画面は1枚で、お宝も出ない
  await pg.click('button[data-tab=teams]');
  for (const id of ['#tGem', '#tStreak', '#tFew']) await pg.uncheck(id);
  await pg.click('button[data-tab=questions]');
  for (const i of [4, 8, 12, 14]) { const card = `.qcard[data-i="${i}"]`; for (const f of ['roulette', 'mission']) if (await pg.isChecked(`${card} input[data-f=${f}]`)) await pg.uncheck(`${card} input[data-f=${f}]`); }
  await pg.click('button[data-tab=play]');
  await pg.click('#playNew');
  ok('おたのしみなし：お宝なし', (await pg.$$eval('#map g.has-gem', x => x.length)) === 0);
  await space();
  ok('おたのしみなし：ルール画面のあと練習問題', (await pg.textContent('#stTitle')).includes('練習問題'));
  await pg.click('#stClose');
  await pg.click('button[data-tab=questions]');
  await pg.click('#qSample');
  await pg.click('button[data-tab=teams]');
  for (const id of ['#tGem', '#tStreak', '#tFew']) await pg.check(id);
  await pg.click('button[data-tab=play]');
  await pg.click('#playNew');
  await pg.click('#stClose');

  // 変更の反映
  await pg.click('button[data-tab=teams]');
  ok('本番中の注意', (await pg.textContent('#teamsGameMsg')).includes('本番の途中'));
  await pg.fill('#teamList input[data-i="0"]', 'ドラゴンズ');
  await pg.waitForTimeout(400);
  await pg.click('button[data-tab=play]');
  await pg.click('#playSync');
  ok('チーム名を本番に反映', (await S()).game.names[0] === 'ドラゴンズ');

  // ⑥ 保存
  await pg.click('button[data-tab=save]');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#sExport')]);
  const tmp = path.join(os.tmpdir(), 'jintori-test.json');
  await dl.saveAs(tmp);
  const saved = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  ok('ファイルに書き出す', saved.app === 'jintori-quiz' && saved.questions.length === 21 && saved.teams.names[0] === 'ドラゴンズ');
  saved.questions = saved.questions.slice(0, 5);
  fs.writeFileSync(tmp, JSON.stringify(saved));
  await pg.setInputFiles('#sImport', tmp);
  await pg.waitForTimeout(300);
  ok('ファイルから読み込む', (await pg.textContent('#sMsg')).includes('問題5問') && (await S()).questions.length === 5);
  fs.writeFileSync(tmp, '{"app":"other"}');
  await pg.setInputFiles('#sImport', tmp);
  await pg.waitForTimeout(300);
  ok('ちがうファイルは読まない', (await pg.textContent('#sMsg')).includes('読めませんでした') && (await S()).questions.length === 5);
  await pg.click('#sReset');
  st = await S();
  ok('すべて消す', st.questions.length === 21 && st.teams.count === 16 && !st.game);

  // 4:3のプロジェクター・20チームでも、正解発表の画面がはみ出さない
  await pg.setViewportSize({ width: 1024, height: 768 });
  await pg.click('button[data-tab=teams]');
  await pg.fill('#tCount', '20'); await pg.dispatchEvent('#tCount', 'change');
  await pg.click('button[data-tab=play]');
  await pg.click('#playNew');
  await until(s => s.phase === 'reveal' && s.qi === 1); // 第1問の正解発表
  const clip = await pg.evaluate(() => {
    const L = document.getElementById('stLeft').getBoundingClientRect(), bad = [];
    document.querySelectorAll('#stLeft .qtext, #stLeft .choice, #stLeft .tg, #stLeft .toggles-head button').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.top < L.top - 1 || r.bottom > L.bottom + 1 || r.left < L.left - 1 || r.right > L.right + 1 || r.height < 20) bad.push(e.className + ' ' + e.textContent.trim().slice(0, 8));
      if (e.scrollHeight > e.clientHeight + 2 && e.classList.contains('qtext')) bad.push('問題文が切れる');
    });
    return { n: document.querySelectorAll('#stLeft .tg').length, bad };
  });
  ok('4:3・20チームでもはみ出さない', clip.n === 20 && !clip.bad.length, JSON.stringify(clip));
  ok('4:3でも進むボタンが見える', await pg.isVisible('#stPrimary'));
  await pg.close();

  // 回答カード
  const cp = await ctx.newPage();
  cp.on('pageerror', e => errs.push('card: ' + e.message));
  await cp.setViewportSize({ width: 820, height: 1180 });
  await cp.goto(fileUrl('回答カード.html'));
  ok('カード：はじめはチームを選ぶ', await cp.isVisible('#pick') && (await cp.$$eval('#teams button', x => x.length)) === 20);
  await cp.click('#teams button[data-t="5"]');
  ok('カード：答えのボタン', await cp.isVisible('#pad') && (await cp.textContent('#tNum')) === '5' && (await cp.$$eval('.ans', x => x.length)) === 6);
  await cp.click('.ans[data-a="C"]');
  ok('カード：Cを大きく表示', await cp.isVisible('#show') && (await cp.textContent('#big')).includes('C') && (await cp.textContent('#corner')) === '5');
  await cp.click('#back');
  await cp.click('.ans[data-a="×"]');
  ok('カード：×を表示', (await cp.$$eval('#big svg path', x => x.length)) === 1);
  await cp.click('#back');
  for (const txt of ['333m', 'インドネシアとインド', 'とてもながいこたえをかいてみたらどうなるかためしてみるテストです']) {
    await cp.fill('#textIn', txt);
    await cp.click('#textForm button');
    const fit = await cp.evaluate(() => { const e = document.getElementById('big'); const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, fs: parseFloat(getComputedStyle(e).fontSize), sw: e.scrollWidth, cw: e.clientWidth, lines: Math.round(r.height / (parseFloat(getComputedStyle(e).fontSize) * 1.05)) }; });
    ok(`カード：文字「${txt.slice(0, 6)}」が画面に収まる`, fit.w <= 820 && fit.h <= 1180 && fit.sw <= fit.cw + 1 && fit.fs >= 30, JSON.stringify(fit));
    if (txt === '333m') ok('カード：短い答えは1行', fit.lines === 1, fit.lines);
    await cp.click('#back');
  }
  await cp.reload();
  ok('カード：チームを覚えている', await cp.isVisible('#pad') && (await cp.textContent('#tNum')) === '5');
  await cp.setViewportSize({ width: 1180, height: 820 });
  const land = await cp.evaluate(() => [...document.querySelectorAll('#pad .ans, #textForm button')].every(e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.height > 40; }));
  ok('カード：横向きでも全部見える', land);
  const src = fs.readFileSync(path.join(__dirname, '..', '回答カード.html'), 'utf8');
  ok('カード：問題や正解は入っていない', !/信濃川|パンダ|answer/.test(src));

  ok('エラーなし', errs.length === 0, errs.join(' / '));
  await b.close();
  let f = 0;
  results.forEach(x => { if (x[0] === 'FAIL') f++; console.log(x[0], x[1], x[2]); });
  console.log(`\n${results.length - f}/${results.length} PASS`);
  process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
