// 謎が正しく1つの答えになるか、答えの確かめ方が正しいかを、謎の絵や文から計算して調べる
const E = require('./nazo-engine.js');
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
const T = E.NZ_TEACH, P = id => E.NAZO.find(p => p.id === id);

ok('先生用と生徒用で、謎の中身が同じ', E.sharedTeacher === E.sharedCard);
ok('先生用と生徒用で、謎の見た目（CSS）が同じ', E.cssTeacher === E.cssCard);
const answers = [...E.NAZO.map(p => T[p.id].answer), T.final.answer, T.final2.answer, T.ex.answer, '未来も仲間'];
ok('生徒用のファイルに答えが書かれていない', answers.every(a => !E.cardSource.includes(a)) && !E.cardSource.includes('NZ_TEACH'), answers.filter(a => E.cardSource.includes(a)).join(','));

// 1 えもじの暗号
const names = { '🐜': 'あり', '🦒': 'きりん', '🏫': 'がっこう', '🍅': 'とまと', '🐘': 'ぞう', '🐱': 'ねこ' };
const h1 = P(1).html();
const pairs = [...h1.matchAll(/<span class="e">(.+?)<\/span><span class="n">(\d)<\/span>/g)].map(m => [m[1], +m[2]]);
ok('謎1：見本は「ねこ」の2文字目＝こ', pairs[0][0] === '🐱' && [...names['🐱']][pairs[0][1] - 1] === 'こ');
ok('謎1：絵と数字から「ありがとう」', pairs.slice(1).map(([e, n]) => [...names[e]][n - 1]).join('') === T[1].answer, pairs.map(x => x.join('')).join(' '));

// 2 ふしぎな時計：描いた絵の長いはり・短いはりが、どの文字をさしているか
function readClock(svg) {
  const lines = [...svg.matchAll(/<line x1="60" y1="60" x2="([\d.]+)" y2="([\d.]+)"[^>]*stroke-width="([\d.]+)"/g)].map(m => ({ x: +m[1] - 60, y: +m[2] - 60, w: +m[3] }));
  const at = l => { const deg = (Math.atan2(l.x, -l.y) * 180 / Math.PI + 360) % 360; return E.NZ_DIAL[Math.round(deg / 30) % 12]; };
  const len = l => Math.hypot(l.x, l.y);
  const [a, b] = lines.sort((p, q) => len(q) - len(p));
  return { long: at(a), short: at(b), gap: Math.abs(((Math.atan2(a.x, -a.y) * 180 / Math.PI + 360) % 30) - 0) };
}
const clocks = [...P(2).html().matchAll(/<svg viewBox="0 0 120 120"[\s\S]*?<\/svg>/g)].map(m => readClock(m[0]));
ok('謎2：時計は見本＋3つ', clocks.length === 4);
ok('謎2：見本は長いはりが「あ」', clocks[0].long === 'あ' && clocks[0].short !== 'あ', JSON.stringify(clocks[0]));
ok('謎2：長いはりで読むと「きもち」', clocks.slice(1).map(c => c.long).join('') === T[2].answer, clocks.map(c => c.long).join(''));
ok('謎2：短いはりで読むと意味のないことば（ひっかけ）', clocks.slice(1).map(c => c.short).join('') !== T[2].answer, clocks.map(c => c.short).join(''));
ok('謎2：長いはりは文字の方向をまっすぐさす', [...P(2).html().matchAll(/<svg viewBox="0 0 120 120"[\s\S]*?<\/svg>/g)].every(m => {
  const l = [...m[0].matchAll(/x2="([\d.]+)" y2="([\d.]+)"[^>]*stroke-width="3.5"/g)][0];
  const deg = (Math.atan2(+l[1] - 60, -(+l[2] - 60)) * 180 / Math.PI + 360) % 30;
  return deg < 1 || deg > 29;
}));

// 3 つながる絵（しりとり）
const chainNames = { '🦊': 'きつね', '🐈': 'ねこ', '🎺': 'らっぱ', '🐼': 'ぱんだ', '🍡': 'だんご', '🦍': 'ごりら', '🦁': 'らいおん' };
const seq = [...P(3).html().matchAll(/<span class="e">(.+?)<\/span>|nz-qbox/g)].map(m => m[1] ? chainNames[m[1]] : T[3].answer);
ok('謎3：？にこあらを入れると、しりとりがつながる', seq.length === 8 && seq.every((w, i) => i === 0 || [...seq[i - 1]].pop() === [...w][0]), seq.join('→'));
ok('謎3：？の箱は3つ', (P(3).html().match(/<span>？<\/span>/g) || []).length === 3 && [...T[3].answer].length === 3);

// 4 スマホの暗号（フリック入力：そのまま・左・上・右・下＝あ・い・う・え・お段）
const F = { 'あ': 'あいうえお', 'か': 'かきくけこ', 'さ': 'さしすせそ', 'た': 'たちつてと', 'な': 'なにぬねの', 'は': 'はひふへほ', 'ま': 'まみむめも', 'や': 'や（ゆ）よ', 'ら': 'らりるれろ', 'わ': 'わをんー' };
const dir = { '・': 0, '←': 1, '↑': 2, '→': 3, '↓': 4 };
const flick = code => F[code[0]][dir[code[1]]];
ok('謎4：見本 な↑＝ぬ、な・＝な', flick('な↑') === 'ぬ' && flick('な・') === 'な');
const codes = [...P(4).html().matchAll(/<div class="nz-code">(.*?)<\/div>/g)][0][1].match(/<span>(.+?)<\/span>/g).map(s => s.replace(/<\/?span>/g, ''));
const decoded = codes.map(flick).join('');
ok('謎4：暗号を読むと「こたえは ゆめ」', decoded === 'こたえは' + T[4].answer, decoded);

// 5 たぬきの手紙
const letter = P(5).html().match(/<div class="nz-letter">(.*?)<\/div>/)[1];
const plain = letter.replace(/た/g, '');
ok('謎5：「た」をぬくと、こたえは「なかま」', plain === 'せいかいは、いっしょにがんばる' + T[5].answer, plain);
ok('謎5：「た」をぬく前の文には答えがそのまま出ていない', !letter.includes(T[5].answer));

// 6 漢字のかくれんぼ：社□ 大□ □話 □議 がどれもことばになる漢字
const svg6 = E.nzWadou();
ok('謎6：まわりの漢字は 社・大・話・議', ['社', '大', '話', '議'].every(k => svg6.includes(`>${k}</text>`)));
const words = ['社会', '大会', '会話', '会議'];
ok('謎6：会を入れると 社会・大会・会話・会議（読みは かい）', words.every(w => w.includes('会')) && T[6].answer === 'かい');
ok('謎6：矢印は4本（社→？ 大→？ ？→話 ？→議）', (svg6.match(/<path d="M/g) || []).length === 4);

// 7 時間割のなぞ：時間割の表となぞなぞから
const days = ['月', '火', '水', '木', '金'];
const tt = E.nzTimetable();
const rows = [...tt.matchAll(/<tr><th>(\d)<\/th>(.*?)<\/tr>/g)].map(m => [...m[2].matchAll(/<td>(.+?)<\/td>/g)].map(x => x[1]));
const yomi = { 国語: 'こくご', 数学: 'すうがく', 社会: 'しゃかい', 理科: 'りか', 英語: 'えいご', 家庭科: 'かていか', 体育: 'たいいく', 音楽: 'おんがく', 美術: 'びじゅつ', 学活: 'がっかつ', 総合: 'そうごう' };
const clues = [...tt.matchAll(/<li>(.+?)<\/li>/g)].map(m => m[1]);
// なぞなぞの答え：「火」の反対＝水、金よう日の前の日＝木（最後＝6時間目）、「日」と「火」のあいだ＝月
const slots = [['水', 2], ['木', rows.length], ['月', 3]];
ok('謎7：時間割は月〜金×6時間、なぞなぞは3つ', rows.length === 6 && rows.every(r => r.length === 5) && clues.length === 3 && clues[0].includes('火') && clues[1].includes('最後') && clues[2].includes('3時間目'));
const p7 = slots.map(([d, n]) => rows[n - 1][days.indexOf(d)]);
ok('謎7：水2・木6・月3の教科の最初の文字で「かえり」', p7.map(x => yomi[x][0]).join('') === T[7].answer, p7.join('・'));
ok('謎7：表の教科はどれも読み方がわかる', rows.flat().every(x => yomi[x]));

// 8 まどの謎：まどのカードを重ねたとき
const holesOnPage = [...E.nzWindow().matchAll(/<span class="(hole)?"><\/span>/g)].map((m, i) => m[1] ? [Math.floor(i / 4), i % 4] : null).filter(Boolean);
const read8 = hs => hs.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([r, c]) => E.NZ_GRID[r][c]).join('');
ok('謎8：絵のまどの穴は3つ', holesOnPage.length === 3 && JSON.stringify(holesOnPage) === JSON.stringify(E.NZ_HOLES));
ok('謎8：そのまま重ねると「はずれ」', read8(holesOnPage) === 'はずれ', read8(holesOnPage));
ok('謎8：左右を反対にすると「かがみ」', read8(holesOnPage.map(([r, c]) => [r, 3 - c])) === T[8].answer);
const others = { 上下反対: ([r, c]) => [3 - r, c], '180度': ([r, c]) => [3 - r, 3 - c], '90度': ([r, c]) => [c, 3 - r], '270度': ([r, c]) => [3 - c, r] };
ok('謎8：ほかの重ね方では答えにならない', Object.values(others).every(f => read8(holesOnPage.map(f)) !== T[8].answer), Object.entries(others).map(([k, f]) => k + ':' + read8(holesOnPage.map(f))).join(' '));

// 9 天びんの謎
const bal = [...E.NAZO.find(p => p.id === 9).html().matchAll(/<svg viewBox="0 0 200 92"[\s\S]*?<\/svg>/g)].map(m => [...m[0].matchAll(/<text x="\d+" y="30"[^>]*>(.+?)<\/text>/g)].map(x => [...x[1]]));
const w = { '🍎': 1 };
// 1つ目：🍌＝🍎🍎、2つ目：🍉＝🍌🍌🍎 から重さを決める
const solve = ([l, r]) => { const u = l.filter(e => w[e] == null); if (u.length === 1 && r.every(e => w[e] != null)) w[u[0]] = r.reduce((a, e) => a + w[e], 0) / l.length; };
bal.forEach(solve);
ok('謎9：🍌は🍎2個、🍉は🍎5個', w['🍌'] === 2 && w['🍉'] === 5, JSON.stringify(w));
ok('謎9：🍉2個は🍎10個 → 「とお」', 2 * w['🍉'] === 10 && T[9].answer === 'とお');

// ○の文字 → あいことば
const letters = E.NZ_STAGE1.map(p => [...T[p.id].answer][p.mark - 1]).join('');
ok('○の文字を1から順にならべると「あきらめない」', letters === T.final.answer, letters);
const letters2 = E.NZ_STAGE2.map(p => [...T[p.id].answer][p.mark - 1]).join('');
ok('青い○の文字を7から順にならべると「えがお」', letters2 === T.final2.answer, letters2);
ok('答えの文字数と箱の数が合う', E.NAZO.every(p => [...T[p.id].answer].length === p.boxes && p.mark >= 1 && p.mark <= p.boxes) && E.NZ_FINAL.boxes === [...T.final.answer].length && E.NZ_FINAL2.boxes === [...T.final2.answer].length);
ok('縦割り：どの学年も3つずつ担当（第1ステージに2つ、第2ステージに1つ）', [1, 2, 3].every(y => E.NZ_STAGE1.filter(p => p.grade === y).length === 2 && E.NZ_STAGE2.filter(p => p.grade === y).length === 1), E.NAZO.map(p => p.id + ':' + p.grade).join(' '));
ok('縦割り：1年生の担当は★1〜2の謎', E.NAZO.filter(p => p.grade === 1).every(p => p.level <= 2));
ok('縦割り：謎に学年マークが出る', E.NAZO.every(p => E.nzCard(p).includes(`${p.grade}年生から`)) && !E.nzCard(E.NAZO[0], { grade: false }).includes('年生から'));
ok('謎1〜6は第1ステージ、謎7〜9は第2ステージ', E.NZ_STAGE1.map(p => p.id).join() === '1,2,3,4,5,6' && E.NZ_STAGE2.map(p => p.id).join() === '7,8,9');

// 答えの確かめ方
const variants = { 1: ['ありがとう', 'アリガトウ', 'ありがとう。', '有難う', 'あり がとう'], 2: ['きもち', 'キモチ', '気持ち'], 3: ['こあら', 'コアラ', 'ｺｱﾗ'], 4: ['ゆめ', 'ユメ', '夢'], 5: ['なかま', 'ナカマ', '仲間'], 6: ['かい', 'カイ', '会'],
  7: ['かえり', 'カエリ', '帰り'], 8: ['かがみ', 'カガミ', '鏡'], 9: ['とお', 'とう', 'トオ', '10', '１０', '十'], final: ['あきらめない', 'アキラメナイ', '諦めない', 'あきらめない！'], final2: ['えがお', 'エガオ', '笑顔'] };
const wrong = { 1: ['ありがと', 'あがとう'], 2: ['ちねぬ', 'きもちい'], 3: ['こうら', 'らっこ'], 4: ['こたえはゆめ', 'ゆ'], 5: ['なかまたち', 'せいかい'], 6: ['かいぎ', '社'],
  7: ['かえ', 'りかえ', 'かすり'], 8: ['はずれ', 'ぬもう', 'かがみみ'], 9: ['5', 'ご', 'じゅう', 'いつつ'], final: ['あきらめ', 'ありがとう'], final2: ['えが', 'かがみ', 'あきらめない'] };
for (const id of Object.keys(variants)) {
  const p = id === 'final' ? E.NZ_FINAL : id === 'final2' ? E.NZ_FINAL2 : P(+id);
  const good = variants[id].map(v => [v, E.nzCheck(p, v)]);
  ok(`謎${id}：正しい答え（ひらがな・カタカナ・漢字）を正解にする`, good.every(([, r]) => !!r), good.filter(([, r]) => !r).map(x => x[0]).join(','));
  if (!E.nzDoor(id)) ok(`謎${id}：正解したら、ひらがなの答えがわかる`, good.every(([, r]) => r === T[id].answer), good.map(x => x[1]).join(','));
  ok(`謎${id}：まちがいは正解にしない`, wrong[id].every(v => !E.nzCheck(p, v)) && !E.nzCheck(p, ''));
}
ok('ほかの謎の答えでは正解にならない', [...E.NAZO, E.NZ_FINAL, E.NZ_FINAL2].every(p => [...E.NAZO, E.NZ_FINAL, E.NZ_FINAL2].filter(q => q !== p).every(q => !E.nzCheck(p, T[q.id].answer))));

// 裏ミッション（真のとびら）：絵は、これまでの謎。数字は、その謎の答えの何文字目か
const exHtml = E.NZ_EX.html();
const refOf = { win: 8, '🦊': 3, wd: 6, clock: 2, '🦝': 5, tt: 7, '🐜': 1 };
const letterOf = (k, n) => [...T[refOf[k]].answer][n - 1];
ok('裏ミッション：暗号は7つ、箱も7つ', E.NZ_EX_CODE.length === 7 && E.NZ_EX.boxes === 7 && [...T.ex.answer].length === 7 && (E.nzCard(E.NZ_EX).match(/<span class=""><\/span>/g) || []).length === 7);
ok('裏ミッション：謎の答えから読むと「みらいもなかま」', E.NZ_EX_CODE.map(([k, n]) => letterOf(k, n)).join('') === T.ex.answer, E.NZ_EX_CODE.map(([k, n]) => letterOf(k, n)).join(''));
ok('裏ミッション：見本の🐜①は、謎1の答えでも「あり」の名前でも「あ」', exHtml.includes('<span class="e">🐜</span><span class="n">1</span>') && letterOf('🐜', 1) === 'あ' && [...names['🐜']][0] === 'あ');
const exNames = { '🦊': 'きつね', '🦝': 'たぬき' };
const naive = E.NZ_EX_CODE.map(([k, n]) => exNames[k] ? [...exNames[k]][n - 1] : '？').join('');
ok('裏ミッション：絵の名前で読むと、意味のないことば（ひっかけ）', naive !== T.ex.answer && naive.includes('？'), naive);
ok('裏ミッション：絵は、謎の絵と同じもの', exHtml.includes('🦊') && E.nzMini('win').includes('<rect') && E.nzMini('wd').includes('>社</text>') && E.nzMini('clock').includes('viewBox="0 0 120 120"') && E.nzMini('tt').includes('>月</text>') && E.NAZO.find(p => p.id === 3).html().includes('🦊') && E.NAZO.find(p => p.id === 5).html().includes('🦝'));
ok('裏ミッション：まどの小さな絵の穴は、謎8のカードと同じ', JSON.stringify([...E.nzMini('win').matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="10"/g)].map(m => [(+m[2] - 2) / 10, (+m[1] - 2) / 10])) === JSON.stringify(E.NZ_HOLES));
ok('裏ミッション：答えの確かめ方（ひらがな・カタカナ・漢字）', ['みらいもなかま', 'ミライモナカマ', '未来も仲間', '未来もなかま', 'みらいも仲間', 'みらい も なかま！'].every(v => E.nzCheck(E.NZ_EX, v)));
ok('裏ミッション：まちがいは正解にしない', ['みらいもえがお', 'ねこたきぬき', 'なかま', 'あきらめない', 'えがお', ''].every(v => !E.nzCheck(E.NZ_EX, v)));
ok('裏ミッション：ほかの謎では、真のあいことばは正解にならない', [...E.NAZO, E.NZ_FINAL, E.NZ_FINAL2].every(p => !E.nzCheck(p, T.ex.answer)));
ok('nzPuzzle で謎・とびら・裏ミッションが取り出せる', E.nzPuzzle(3).id === 3 && E.nzPuzzle('final') === E.NZ_FINAL && E.nzPuzzle('final2') === E.NZ_FINAL2 && E.nzPuzzle('ex') === E.NZ_EX);

// 伝令タイムのひみつ情報が、謎の答えと合っている
const R1 = E.RELAY[0].items.join(' '), R2 = E.RELAY[1].items.join(' ');
const markOf = id => [...T[id].answer][P(id).mark - 1];
ok('伝令タイム1回目：謎4・謎6の ○ の文字が正しい', R1.includes(`謎4の ○ の文字は「${markOf(4)}」`) && R1.includes(`謎6の ○ の文字は「${markOf(6)}」`), R1);
ok('伝令タイム1回目：謎2は長いはり', R1.includes('長いはり') && clocks.slice(1).map(c => c.long).join('') === T[2].answer);
ok('伝令タイム2回目：謎7・謎8・謎9の情報が正しい', R2.includes('「火」の反対は「水」') && slots[0][0] === '水' && R2.includes('うら返して') && R2.includes('🍉1個は 🍎5個分') && w['🍉'] === 5, R2);
ok('伝令タイム：答えそのものは出さない（とびらのあいことばも）', [...E.RELAY].every(r => r.items.every(x => !Object.values(T).some(a => a.answer.length > 1 && x.includes(a.answer)))));

let f = 0;
results.forEach(r => { if (r[0] === 'FAIL') f++; console.log(r[0], r[1], r[2]); });
console.log(`\n${results.length - f}/${results.length} PASS`);
process.exit(f ? 1 : 0);
