// 謎解き脱出.html（先生用）と 謎解きカード.html（生徒用）を、この src/nazo の元ファイルから作る
//   shared.js  … 謎の中身（両方のファイルで同じにする部分。// ===NAZO-START=== 〜 // ===NAZO-END===）
//   shared.css … 謎の見た目（/* ===NAZO-CSS-START=== */ 〜 /* ===NAZO-CSS-END=== */）
//   teacher.html / card.html … それぞれの画面。/*NAZO_CSS*/ と //NAZO_JS の行に上の2つが入る
// 使い方：node src/nazo/build.js（リポジトリの直下に 謎解き脱出.html と 謎解きカード.html が書き出される）
//   node src/nazo/build.js check → 書き出さずに、いまのHTMLと同じになるかだけ確かめる
const fs = require('fs'), path = require('path');
const SRC = __dirname, ROOT = path.join(__dirname, '..', '..');
const css = fs.readFileSync(path.join(SRC, 'shared.css'), 'utf8').trimEnd();
const js = fs.readFileSync(path.join(SRC, 'shared.js'), 'utf8').trimEnd();
let ok = true;
for (const [src, dst] of [['teacher.html', '謎解き脱出.html'], ['card.html', '謎解きカード.html']]) {
  let t = fs.readFileSync(path.join(SRC, src), 'utf8');
  if (!t.includes('/*NAZO_CSS*/') || !t.includes('//NAZO_JS')) throw new Error(src + ' に /*NAZO_CSS*/ か //NAZO_JS がない');
  t = t.replace('/*NAZO_CSS*/', () => css).replace('//NAZO_JS', () => js);
  const out = path.join(ROOT, dst);
  if (process.argv[2] === 'check') {
    const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === t;
    console.log(same ? 'same ' : 'DIFF ', dst); ok = ok && same;
  } else { fs.writeFileSync(out, t); console.log('wrote', dst); }
}
if (!ok) process.exit(1);
