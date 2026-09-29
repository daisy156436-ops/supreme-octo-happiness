// 謎解き脱出.html／謎解きカード.html から、謎の中身（共通部分）と先生用の答えを取り出して読み込む
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const block = (src, a, b) => src.split(a)[1].split(b)[0];
const teacher = read('謎解き脱出.html'), card = read('謎解きカード.html');
const shared = block(teacher, '// ===NAZO-START===', '// ===NAZO-END===');
const E = new Function(shared + ';return {nzNorm,nzHash,nzCheck,nzClock,nzWadou,nzBoxes,nzCard,NAZO,NZ_FINAL,NZ_DIAL};')();
const teach = teacher.split('const NZ_TEACH = ')[1].split('\n};\n')[0] + '\n}';
E.NZ_TEACH = new Function('return ' + teach)();
E.sharedTeacher = shared;
E.sharedCard = block(card, '// ===NAZO-START===', '// ===NAZO-END===');
E.cssTeacher = block(teacher, '/* ===NAZO-CSS-START=== */', '/* ===NAZO-CSS-END=== */');
E.cssCard = block(card, '/* ===NAZO-CSS-START=== */', '/* ===NAZO-CSS-END=== */');
E.cardSource = card;
module.exports = E;
