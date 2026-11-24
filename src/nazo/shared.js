// ===NAZO-START===
// 謎の中身（先生用・生徒用の両方で同じもの）。答えそのものは入れず、確かめ用の値だけを持つ。
const NZ_VERSION = '2026-10-24';   // 版。先生用・生徒用の画面に出す（変えるのはここだけ）
function nzNorm(s) {
  return (s || '').normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。，．,.・!！?？「」『』（）()ー－\-]/g, '').toLowerCase();
}
function nzHash(id, s) {
  let h = 0x811c9dc5;
  const t = 'nazo|' + id + '|' + s;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}
function nzDec(arr, key) { const k = [...key].map(c => c.codePointAt(0)); return arr.map((n, i) => String.fromCodePoint(n ^ k[i % k.length] ^ 0x5a)).join(''); }
// 答えが合っていれば、その答えのひらがなを返す（ちがえば null）
function nzCheck(p, input) {
  const v = nzNorm(input), r = p.ok[nzHash(p.id, v)];
  if (!r) return null;
  return r === 1 ? v : nzDec(r, v);
}
function nzEmo(e, n) { return `<span class="nz-emo"><span class="e">${e}</span>${n ? `<span class="n">${n}</span>` : ''}</span>`; }
const NZ_DIAL = ['ま', 'き', 'ち', 'あ', 'も', 'す', 'は', 'ね', 'く', 'ろ', 'ぬ', 'ほ'];   // 12時・1時・2時…11時の位置
function nzClock(h, m) {
  let s = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#fff" stroke="#1d2330" stroke-width="3"/>';
  NZ_DIAL.forEach((ch, k) => {
    const a = (k * 30 - 90) * Math.PI / 180;
    s += `<text x="${(60 + 44 * Math.cos(a)).toFixed(1)}" y="${(61 + 44 * Math.sin(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="bold" fill="#1d2330">${ch}</text>`;
  });
  const hand = (deg, len, w) => { const a = (deg - 90) * Math.PI / 180; return `<line x1="60" y1="60" x2="${(60 + len * Math.cos(a)).toFixed(1)}" y2="${(60 + len * Math.sin(a)).toFixed(1)}" stroke="#1d2330" stroke-width="${w}" stroke-linecap="round"/>`; };
  return s + hand((h % 12) * 30 + m * 0.5, 22, 7) + hand(m * 6, 34, 3.5) + '<circle cx="60" cy="60" r="4.5" fill="#1d2330"/></svg>';
}
function nzWadou(cls) {
  const k = (x, y, t, ex) => `<rect x="${x - 21}" y="${y - 21}" width="42" height="42" rx="6" fill="${ex ? '#fff4d6' : '#fff'}" stroke="${ex ? '#c8102e' : '#1d2330'}" stroke-width="${ex ? 3 : 2}" ${ex ? 'stroke-dasharray="6 4"' : ''}/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="26" font-weight="bold" fill="${ex ? '#c8102e' : '#1d2330'}">${t}</text>`;
  // 矢印（先を三角でかく）
  const ar = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 11, W = 7;
    const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a);
    const p = [[x2, y2], [bx + W * Math.sin(a), by - W * Math.cos(a)], [bx - W * Math.sin(a), by + W * Math.cos(a)]].map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L');
    return `<line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#1d2330" stroke-width="3.5"/><path d="M${p} Z" fill="#1d2330"/>`;
  };
  return `<svg viewBox="0 0 220 220" class="${cls || 'nz-wd'}" aria-hidden="true">` +
    k(110, 28, '社') + k(28, 110, '大') + k(192, 110, '話') + k(110, 192, '議') + k(110, 110, '？', true) +
    ar(110, 50, 110, 87) + ar(50, 110, 87, 110) + ar(133, 110, 169, 110) + ar(110, 133, 110, 169) + '</svg>';
}
function nzBoxes(n, mark, text, num, stage, labels) {
  // mark：○をつける文字の位置（0なら全部に labels の番号）、num：○につける謎の番号、stage：2なら青い○
  const t = [...(text || '')];
  let h = '<div class="nz-boxes">';
  for (let i = 0; i < n; i++) {
    const tag = mark === 0 ? (labels ? labels[i] : i + 1) : num && i + 1 === mark ? num : '';
    const mk = i + 1 === mark || mark === 0 ? (stage === 2 ? 'mk mk2' : 'mk') : '';
    h += `<span class="${mk}">${t[i] || ''}${tag ? `<i>${tag}</i>` : ''}</span>`;
  }
  return h + '</div>';
}
function nzTimetable() {
  const days = ['月', '火', '水', '木', '金'];
  const tt = [['国語', '数学', '社会', '理科', '英語'], ['数学', '英語', '家庭科', '国語', '体育'], ['理科', '体育', '数学', '社会', '国語'],
    ['英語', '国語', '音楽', '数学', '理科'], ['体育', '社会', '英語', '美術', '数学'], ['学活', '理科', '国語', '英語', '総合']];
  return `<div class="nz-tt"><table><tr><th></th>${days.map(d => `<th>${d}</th>`).join('')}</tr>${tt.map((r, i) => `<tr><th>${i + 1}</th>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
    <ol class="nz-clue"><li>「火」の反対の曜日の、2時間目</li><li>金よう日の前の日の、最後の時間</li><li>「日」と「火」のあいだの曜日の、3時間目</li></ol></div>`;
}
const NZ_GRID = [['ぬ', 'は', 'か', 'そ'], ['が', 'て', 'ほ', 'ず'], ['ろ', 'い', 'け', 'も'], ['れ', 'う', 'な', 'み']];
const NZ_HOLES = [[0, 1], [1, 3], [3, 0]];   // まどのカードの穴（うらから見た位置）
function nzWindow() {
  const grid = (f, cls) => `<div class="nz-grid ${cls}">${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => f(r, c)).join('')).join('')}</div>`;
  const hole = (r, c) => NZ_HOLES.some(h => h[0] === r && h[1] === c);
  return `<div class="nz-win"><div><div class="cap">文字の表</div>${grid((r, c) => `<span>${NZ_GRID[r][c]}</span>`, 'letters')}</div>
    <div><div class="cap">まどのカード（うら）</div>${grid((r, c) => `<span class="${hole(r, c) ? 'hole' : ''}"></span>`, 'wcard')}</div></div>`;
}
// 協力の謎：3つのかけら（道順・読む場所・地図）を、学年ごとに1枚ずつ持って、口で伝え合う
const NZ_COOP = { grid: [['★', 'ら', 'さ', 'た'], ['か', 'お', 'う', 'ね'], ['み', 'え', 'も', 'こ'], ['の', 'し', 'ん', 'は']], moves: ['→', '↓', '→', '↓', '←', '↓', '→'], read: [2, 3, 5, 7] };
function nzCoop(o) {
  const tate = !o || o.grade !== false, fold = !!(o && o.fold);
  const lab = (y, a, w) => `<span class="kh">✂ ${tate ? `${y}年生のかけら` : `かけら${a}`}<small>${w}</small></span>`;
  // fold：タブレット用。かけらを持つ人だけがタップして見る（見せ合わない）
  const piece = (cls, head, body) => fold ? `<details class="kk ${cls}"><summary>${head}</summary>${body}</details>` : `<div class="kk ${cls}">${head}${body}</div>`;
  return `${fold ? '<div class="nz-ex">かけらは、持つ人だけがタップして見る。見せ合わずに、口で伝え合おう！</div>' : ''}<div class="nz-coop">
    ${piece('g1', lab(1, 'A', '道順'), `<div class="kmv">★から ${NZ_COOP.moves.map(m => `<b>${m}</b>`).join('')}</div><div class="ks">1回で1マス進む</div>`)}
    ${piece('g2', lab(2, 'B', '読む場所'), `<div class="kst">${NZ_COOP.read.map(n => `<b>${n}</b>`).join('')}<span>歩目</span></div><div class="ks">止まったマスの文字を、この順に読む</div>`)}
    ${piece('g3', lab(3, 'C', '地図'), `<div class="kgrid">${NZ_COOP.grid.flat().map(c => `<span${c === '★' ? ' class="st"' : ''}>${c}</span>`).join('')}</div>`)}</div>`;
}

const NAZO = [
  {
    id: 1, grade: 1, title: 'えもじの暗号', level: 1, boxes: 5, mark: 1,
    q: '絵の下の数字は、名前の「何文字目か」。読むと、どんなことば？',
    html: () => `<div class="nz-ex">見本：${nzEmo('🐱', 2)} は「ねこ」の2文字目で「こ」</div><div class="nz-row">${[['🐜', 1], ['🦒', 2], ['🏫', 1], ['🍅', 3], ['🐘', 2]].map(a => nzEmo(a[0], a[1])).join('')}</div>`,
    ok: { '2adcc81a': [90, 90, 90, 90, 90], '73885c32': [22289, 42547, 80, 22331, 42751], '617dcc9a': [22289, 90, 42741, 116, 22293] },
  },
  {
    id: 2, grade: 2, title: 'ふしぎな時計', level: 2, boxes: 3, mark: 1,
    q: '見本と同じ読み方で、①②③の時計を読むと？',
    html: () => `<div class="nz-clocks"><div class="nz-clock ex">${nzClock(6, 15)}<span>見本 → 「あ」</span></div><div class="nz-clock">${nzClock(2, 5)}<span>①</span></div><div class="nz-clock">${nzClock(7, 20)}<span>②</span></div><div class="nz-clock">${nzClock(10, 10)}<span>③</span></div></div>`,
    ok: { '323e1f1b': [90, 90, 90], '1171b032': [23552, 21465, 90], '7b1ac627': [23552, 21465, 23596] },
  },
  {
    id: 3, grade: 1, title: 'つながる絵', level: 1, boxes: 3, mark: 3,
    q: '？に入る動物は？',
    html: () => `<div class="nz-row chain">${['🦊', '🐈', '?', '🎺', '🐼', '🍡', '🦍', '🦁'].map(e => e === '?' ? '<span class="nz-qbox"><span>？</span><span>？</span><span>？</span></span>' : nzEmo(e)).join('<span class="nz-arrow">→</span>')}</div>`,
    ok: { '1f94369e': [90, 90, 90], '87258062': [90, 90, 90] },   // 答えになる動物は2つ（○の文字は同じ）
  },
  {
    id: 4, grade: 2, title: 'スマホの暗号', level: 2, boxes: 2, mark: 2,
    q: '暗号を読むと、答えがわかる。',
    html: () => `<div class="nz-flick"><div class="nz-keys">${['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', '゛゜', 'わ', '、。'].map(k => `<span>${k}</span>`).join('')}</div><div class="nz-flickr"><div class="nz-ex">見本：<b>な↑</b> ＝ ぬ　<b>な・</b> ＝ な</div><div class="nz-code">${['か↓', 'た・', 'あ→', 'は・', 'や↑', 'ま→'].map(c => `<span>${c}</span>`).join('')}</div></div></div>`,
    ok: { '45964dc8': [90, 90], '404bae05': [27134, 27129] },
  },
  {
    id: 5, grade: 3, title: 'たぬきの手紙', level: 2, boxes: 3, mark: 1,
    q: '手紙が伝えたい「こたえ」は？',
    html: () => '<div class="nz-letter">たせいかたいはた、いっしたょにたがたんばたるたなかたまた</div><div class="nz-sign">🦝 たぬき より</div>',
    ok: { '75d8b54f': [90, 90, 90], '44a248bb': [32450, 42370, 32470] },
  },
  {
    id: 6, grade: 3, title: '漢字のかくれんぼ', level: 3, boxes: 2, mark: 2,
    q: '矢印の向きに読むと、どれも漢字2文字のことばになる。？の漢字の読みは？（ひらがな2文字）',
    html: () => `<div class="nz-row">${nzWadou()}</div>`,
    ok: { 'd300aca0': [90, 90], '112d5da7': [32523, 32516] },
  },
  {
    id: 7, grade: 1, stage: 2, title: '時間割のなぞ', level: 2, boxes: 3, mark: 2,
    q: '①②③の時間の教科の、最初の文字を順につなげると？',
    html: () => nzTimetable(),
    ok: { 'e065d1d5': [90, 90, 90], '7a570808': [28193, 152, 28384] },
  },
  {
    id: 8, grade: 3, stage: 2, title: 'まどの謎', level: 3, boxes: 3, mark: 2,
    q: 'まどのカードを文字の表に重ねて、あいた所の文字を、上の段から読もう。',
    html: () => nzWindow(),
    ok: { '7a4dddf3': [90, 90, 90], '51b3a9f8': [41968, 41975, 41924] },
  },
  {
    id: 9, grade: 'all', stage: 2, title: '3つのかけら', level: 2, boxes: 4, mark: 1,
    q: 'かけらを切りはなして、1人1枚ずつ持とう。<u>かけらは見せ合わずに、口で伝え合って</u>解く！ 道順のとおりに進むと……？（ひらがな4文字）',
    html: o => nzCoop(o),
    ok: { '5aae9709': [90, 90, 90, 90], 'faff60a0': [28620, 21480, 28622, 21309] },
  },
];
// 裏ミッション（脱出したチームだけ）：絵は、これまでの謎。数字は、その謎の答えの「何文字目か」
function nzMini(k) {
  if (k === 'clock') return nzClock(2, 5).replace('<svg ', '<svg class="nz-mi" ');
  if (k === 'wd') return nzWadou('nz-mi');
  if (k === 'win') {
    let s = '<svg viewBox="0 0 44 44" class="nz-mi" aria-hidden="true"><rect x="2" y="2" width="40" height="40" fill="#8c95a6" stroke="#1d2330" stroke-width="2"/>';
    NZ_HOLES.forEach(([r, c]) => { s += `<rect x="${2 + c * 10}" y="${2 + r * 10}" width="10" height="10" fill="#fff" stroke="#6b7385" stroke-width="1"/>`; });
    return s + '</svg>';
  }
  if (k === 'tt') {
    let s = '<svg viewBox="0 0 50 44" class="nz-mi" aria-hidden="true"><rect x="1" y="1" width="48" height="42" fill="#fff" stroke="#1d2330" stroke-width="2"/><rect x="1" y="1" width="48" height="10" fill="#eef1f6" stroke="#1d2330" stroke-width="2"/>';
    ['月', '火', '水', '木', '金'].forEach((d, i) => { s += `<text x="${6 + i * 9.6}" y="8.6" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#1d2330">${d}</text>`; });
    for (let i = 1; i < 5; i++) s += `<line x1="${1 + i * 9.6}" y1="11" x2="${1 + i * 9.6}" y2="43" stroke="#9aa3b2" stroke-width="1"/>`;
    for (let j = 1; j < 4; j++) s += `<line x1="1" y1="${11 + j * 8}" x2="49" y2="${11 + j * 8}" stroke="#9aa3b2" stroke-width="1"/>`;
    return s + '</svg>';
  }
  return k;
}
const NZ_EX_CODE = [['win', 3], ['🦊', 3], ['wd', 2], ['clock', 2], ['🦝', 1], ['tt', 1], ['🦝', 3]];
const NZ_EX = {
  id: 'ex', icon: '🗝️', title: '真のとびら', level: 3, boxes: 7,
  q: 'とびらのうらに、ふしぎな暗号がきざまれていた。読むと、とびらを作った人からのメッセージに……？（ひらがな7文字）',
  html: () => `<div class="nz-ex">見本：${nzEmo('🐜', 1)} は「あ」</div><div class="nz-row">${NZ_EX_CODE.map(([k, n]) => nzEmo(nzMini(k), n)).join('')}</div>`,
  ok: { 'f25b8345': 1, 'a5c6758a': 1, '4593c2ac': 1, 'e379e369': 1 },
};
const NZ_FINAL = { id: 'final', title: '第1のとびら', boxes: 6, labels: [1, 2, 3, 4, 5, 6], q: '謎1〜6の答えの ○ の文字を、1から順にならべると…？', ok: { 'e59ee854': 1, '308c5fea': 1 } };
const NZ_FINAL2 = { id: 'final2', stage: 2, title: '第2のとびら', boxes: 3, labels: [7, 8, 9], q: '謎7〜9の答えの 青い○ の文字を、7から順にならべると…？', ok: { 'c40c5f0d': 1, '351ae2dc': 1 } };
const NZ_STAGE1 = NAZO.filter(p => !p.stage), NZ_STAGE2 = NAZO.filter(p => p.stage === 2);
function nzDoor(id) { return id === 'final' || id === 'final2'; }
function nzPuzzle(id) { return id === 'final' ? NZ_FINAL : id === 'final2' ? NZ_FINAL2 : id === 'ex' ? NZ_EX : NAZO.find(p => p.id === id); }
// 縦割り活動：まずこの学年の人が考える謎
function nzGrade(p) { return p.grade === 'all' ? '<span class="nz-gr gall">全学年で協力</span>' : p.grade ? `<span class="nz-gr g${p.grade}">${p.grade}年生から</span>` : ''; }
function nzCard(p, o) {
  o = o || {};
  const door = nzDoor(p.id);
  return `<div class="nz${p.stage === 2 ? ' st2' : ''}${p.id === 'ex' ? ' exq' : ''}"><div class="nz-head"><span class="nz-no">${p.icon || (door ? '🚪' : p.id)}</span><span class="nz-title">${p.title}</span>${p.level ? `<span class="nz-lv">${'★'.repeat(p.level)}${'☆'.repeat(3 - p.level)}</span>` : ''}${o.grade === false ? '' : nzGrade(p)}</div><div class="nz-q">${p.q}</div>${p.html ? p.html(o) : ''}${o.boxes === false ? '' : nzBoxes(p.boxes, door ? 0 : p.mark, o.fill, o.num ? p.id : '', p.stage, p.labels)}</div>`;
}
// ===NAZO-END===
