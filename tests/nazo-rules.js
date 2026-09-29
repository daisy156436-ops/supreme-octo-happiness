// 謎が正しく1つの答えになるか、答えの確かめ方が正しいかを、謎の絵や文から計算して調べる
const E = require('./nazo-engine.js');
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
const T = E.NZ_TEACH, P = id => E.NAZO.find(p => p.id === id);

ok('先生用と生徒用で、謎の中身が同じ', E.sharedTeacher === E.sharedCard);
ok('先生用と生徒用で、謎の見た目（CSS）が同じ', E.cssTeacher === E.cssCard);
const answers = [...E.NAZO.map(p => T[p.id].answer), T.final.answer];
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

// ○の文字 → あいことば
const letters = E.NAZO.map(p => [...T[p.id].answer][p.mark - 1]).join('');
ok('○の文字を1から順にならべると「あきらめない」', letters === T.final.answer, letters);
ok('答えの文字数と箱の数が合う', E.NAZO.every(p => [...T[p.id].answer].length === p.boxes && p.mark >= 1 && p.mark <= p.boxes) && E.NZ_FINAL.boxes === [...T.final.answer].length);

// 答えの確かめ方
const variants = { 1: ['ありがとう', 'アリガトウ', 'ありがとう。', '有難う', 'あり がとう'], 2: ['きもち', 'キモチ', '気持ち'], 3: ['こあら', 'コアラ', 'ｺｱﾗ'], 4: ['ゆめ', 'ユメ', '夢'], 5: ['なかま', 'ナカマ', '仲間'], 6: ['かい', 'カイ', '会'], final: ['あきらめない', 'アキラメナイ', '諦めない', 'あきらめない！'] };
const wrong = { 1: ['ありがと', 'あがとう'], 2: ['ちねぬ', 'きもちい'], 3: ['こうら', 'らっこ'], 4: ['こたえはゆめ', 'ゆ'], 5: ['なかまたち', 'せいかい'], 6: ['かいぎ', '社'], final: ['あきらめ', 'ありがとう'] };
for (const id of Object.keys(variants)) {
  const p = id === 'final' ? E.NZ_FINAL : P(+id);
  const good = variants[id].map(v => [v, E.nzCheck(p, v)]);
  ok(`謎${id}：正しい答え（ひらがな・カタカナ・漢字）を正解にする`, good.every(([, r]) => !!r), good.filter(([, r]) => !r).map(x => x[0]).join(','));
  if (id !== 'final') ok(`謎${id}：正解したら、ひらがなの答えがわかる`, good.every(([, r]) => r === T[id].answer), good.map(x => x[1]).join(','));
  ok(`謎${id}：まちがいは正解にしない`, wrong[id].every(v => !E.nzCheck(p, v)) && !E.nzCheck(p, ''));
}
ok('ほかの謎の答えでは正解にならない', E.NAZO.every(p => E.NAZO.filter(q => q !== p).every(q => !E.nzCheck(p, T[q.id].answer))));

let f = 0;
results.forEach(r => { if (r[0] === 'FAIL') f++; console.log(r[0], r[1], r[2]); });
console.log(`\n${results.length - f}/${results.length} PASS`);
process.exit(f ? 1 : 0);
