// 陣地の決まりが、どんな場合にも守られているかを調べる。あわせて、ルールを決めたときの対戦シミュレーションの数字も出す。
const E = require('./jintori-engine.js');
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
const fail = {};
const bad = (k, info) => { if (!fail[k]) fail[k] = info; };

// 盤
for (let n = 2; n <= 20; n++) for (const size of ['small', 'normal', 'large']) {
  const per = E.SIZE_PER[size], b = E.makeBoard(n, per, 1000 + n);
  if (b.cells.length < n * per) bad('盤のマス数', `${n}チーム ${size}: ${b.cells.length}`);
  if (new Set(b.homes).size !== n || b.homes.some(h => h < 0 || h >= b.cells.length)) bad('スタート地点', `${n}チーム ${size}`);
  b.nbr.forEach((ns, i) => {
    if (ns.length > 6 || ns.length < 2) bad('となりの数', `${i}: ${ns.length}`);
    ns.forEach(j => { if (!b.nbr[j].includes(i)) bad('となりが対称', `${i}-${j}`); });
  });
  const md = Math.min(...b.homes.flatMap((h, i) => b.homes.slice(i + 1).map(k => E.hexDist(b.cells[h], b.cells[k]))));
  if (md < 2) bad('スタート地点が離れている', `${n}チーム ${size}: 最小距離${md}`);
}

// 1問ごとの決まり
function frontier(b, owners, t) {
  const f = new Set();
  owners.forEach((o, i) => { if (o === t) b.nbr[i].forEach(j => { if (owners[j] !== t) f.add(j); }); });
  return [...f];
}
let rounds = 0, stealsSeen = 0, jumps = 0;
for (let g = 0; g < 400; g++) {
  const R = E.rng(77 + g);
  const n = 2 + Math.floor(R() * 19), size = ['small', 'normal', 'large'][g % 3], steal = g % 5 !== 0;
  const b = E.makeBoard(n, E.SIZE_PER[size], g * 31 + 5);
  let owners = E.initOwners(b);
  const p = [...Array(n)].map(() => 0.2 + R() * 0.7);
  for (let q = 0; q < 24; q++) {
    const mult = q === 23 ? 3 : q % 5 === 4 ? 2 : 1;
    const cor = [];
    for (let t = 0; t < n; t++) if (R() < p[t]) cor.push(t);
    const before = owners.slice(), c0 = E.counts(before, n);
    const res = E.resolveRound(b, before, cor, mult, { steal }, g * 1000 + q);
    const res2 = E.resolveRound(b, before, cor, mult, { steal }, g * 1000 + q);
    rounds++;
    if (JSON.stringify(res) !== JSON.stringify(res2)) bad('同じ条件なら同じ結果', `g${g} q${q}`);
    if (JSON.stringify(before) !== JSON.stringify(owners)) bad('元の盤を書きかえない', `g${g}`);
    const c1 = E.counts(res.owners, n), okSet = new Set(cor);
    if (res.owners.length !== b.cells.length || res.owners.some(o => o < -1 || o >= n)) bad('マスの持ち主が正しい', `g${g} q${q}`);
    b.homes.forEach((h, t) => { if (res.owners[h] !== t) bad('★本拠地はうばわれない', `g${g} q${q} team${t}`); });
    for (let t = 0; t < n; t++) {
      const d = c1[t] - c0[t];
      if (okSet.has(t)) {
        const got = res.changes.filter(c => c.to === t).length;
        if (d < 0) bad('正解チームは減らない', `g${g} q${q} team${t} ${d}`);
        if (got > mult) bad('正解チームがとるのは倍率まで', `g${g} q${q} team${t} ${got}`);
        if (got < mult && !res.missed.includes(t)) bad('とれなかったチームは記録される', `g${g} q${q} team${t}`);
      } else {
        if (d > 0) bad('まちがえたチームは増えない', `g${g} q${q} team${t}`);
        if (-d > E.LOSS_CAP * mult) bad('1問でうばわれるのは上限まで', `g${g} q${q} team${t} ${d}`);
        if (d < 0 && c0[t] <= E.PROTECT) bad(`${E.PROTECT}マス以下はうばわれない`, `g${g} q${q} team${t} ${c0[t]}`);
        if (d < 0 && c1[t] < E.PROTECT) bad(`うばわれても${E.PROTECT}マスは残る`, `g${g} q${q} team${t} ${c1[t]}`);
      }
    }
    if (!steal && res.changes.some(c => c.from >= 0)) bad('うばい合いなしでは、うばわない', `g${g} q${q}`);
    // 1マスずつ再生して、空きマス優先・となり優先を確かめる
    const cur = before.slice();
    for (const ch of res.changes) {
      const f = frontier(b, cur, ch.to);
      const adjNeutral = f.some(i => cur[i] === -1);
      if (cur[ch.cell] !== ch.from) bad('変化の記録が正しい', `g${g} q${q}`);
      if (adjNeutral && !(ch.from === -1 && f.includes(ch.cell))) bad('となりに空きマスがあれば、そこをとる', `g${g} q${q}`);
      if (!f.includes(ch.cell)) jumps++;
      if (ch.from >= 0) stealsSeen++;
      cur[ch.cell] = ch.to;
    }
    if (JSON.stringify(cur) !== JSON.stringify(res.owners)) bad('変化の記録と結果が一致', `g${g} q${q}`);
    owners = res.owners;
  }
}
const checks = ['盤のマス数', 'スタート地点', 'となりの数', 'となりが対称', 'スタート地点が離れている', '同じ条件なら同じ結果', '元の盤を書きかえない', 'マスの持ち主が正しい', '★本拠地はうばわれない',
  '正解チームは減らない', '正解チームがとるのは倍率まで', 'とれなかったチームは記録される', 'まちがえたチームは増えない', '1問でうばわれるのは上限まで',
  `${E.PROTECT}マス以下はうばわれない`, `うばわれても${E.PROTECT}マスは残る`, 'うばい合いなしでは、うばわない', '変化の記録が正しい', 'となりに空きマスがあれば、そこをとる', '変化の記録と結果が一致'];
checks.forEach(k => ok(k, !fail[k], fail[k] || ''));
Object.keys(fail).filter(k => !checks.includes(k)).forEach(k => ok(k, false, fail[k]));
ok('うばい合いと飛び地が実際に起きている', stealsSeen > 100 && jumps > 0, `うばい${stealsSeen} 飛び地${jumps} / ${rounds}問`);

// 順位（同点は同じ順位）
ok('順位の計算', JSON.stringify(E.ranksOf([5, 9, 9, 1, 5])) === JSON.stringify([3, 1, 1, 5, 3]));

// サンプル問題と同じ並び（ボーナス4問・最後に逆転3マス）で、ルールを決めたときのシミュレーション
const MULTS = [1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2, 3];
console.log('対戦シミュレーション（各100回、チームの正答率は35〜80%でばらばら）');
console.log('チーム 地図  マス  空きがなくなる問  最後の最大 最小  15問目の1位が最後に入れかわる');
for (const n of [8, 12, 16, 20]) for (const size of ['small', 'normal', 'large']) {
  let mn = 0, mx = 0, gone = 0, goneN = 0, change = 0, minMin = 1e9, cells = 0;
  const N = 100;
  for (let s = 1; s <= N; s++) {
    const b = E.makeBoard(n, E.SIZE_PER[size], s);
    cells = b.cells.length;
    let o = E.initOwners(b);
    const R = E.rng(s * 7 + 1), p = [...Array(n)].map(() => 0.35 + R() * 0.45);
    let c15 = null, g0 = null;
    MULTS.forEach((m, q) => {
      const diff = (R() - 0.5) * 0.5, cor = [];
      for (let t = 0; t < n; t++) if (R() < p[t] + diff) cor.push(t);
      o = E.resolveRound(b, o, cor, m, {}, s * 100 + q).owners;
      if (g0 === null && !o.includes(-1)) g0 = q + 1;
      if (q === 14) c15 = E.counts(o, n);
    });
    const c = E.counts(o, n);
    mn += Math.min(...c); mx += Math.max(...c); minMin = Math.min(minMin, Math.min(...c));
    if (g0) { gone += g0; goneN++; }
    if (c15.indexOf(Math.max(...c15)) !== c.indexOf(Math.max(...c))) change++;
  }
  console.log(`${String(n).padStart(4)}  ${size.padEnd(6)} ${String(cells).padStart(4)}  ${goneN ? (gone / goneN).toFixed(1).padStart(8) : '       -'}（${goneN}%）  ${(mx / N).toFixed(1).padStart(6)} ${(mn / N).toFixed(1).padStart(4)}（いちばん少なくて${minMin}）  ${change}%`);
  if (size === 'normal' && n === 16) {
    ok('16チーム・ふつう：いちばん少ないチームも平均3マス以上残る', mn / N >= 3, (mn / N).toFixed(2));
    ok('16チーム・ふつう：15問目の1位が最後に入れかわることが4割以上ある', change >= 40, change + '%');
    ok('16チーム・ふつう：15問目ごろに空きマスがなくなる', goneN >= 50 && gone / goneN >= 13 && gone / goneN <= 19, (gone / goneN).toFixed(1));
  }
}
console.log('');
let f = 0;
results.forEach(r => { if (r[0] === 'FAIL') f++; console.log(r[0], r[1], r[2]); });
console.log(`\n${results.length - f}/${results.length} PASS`);
process.exit(f ? 1 : 0);
