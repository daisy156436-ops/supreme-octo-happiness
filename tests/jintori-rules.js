// 陣地の決まりが、どんな場合にも守られているかを調べる。あわせて、ルールを決めたときの対戦シミュレーションの数字も出す。
const E = require('./jintori-engine.js');
const results = [];
const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
const fail = {}, seen = [];
const bad = (k, info) => { if (!fail[k]) fail[k] = info; };
const check = (k, cond, info) => { if (!seen.includes(k)) seen.push(k); if (!cond) bad(k, info); };

// 盤とお宝マス
for (let n = 2; n <= 20; n++) for (const size of ['small', 'normal', 'large']) {
  const per = E.SIZE_PER[size], b = E.makeBoard(n, per, 1000 + n), tag = `${n}チーム ${size}`;
  check('盤のマス数', b.cells.length >= n * per, `${tag}: ${b.cells.length}`);
  check('スタート地点', new Set(b.homes).size === n && b.homes.every(h => h >= 0 && h < b.cells.length), tag);
  b.nbr.forEach((ns, i) => {
    check('となりの数', ns.length <= 6 && ns.length >= 2, `${i}: ${ns.length}`);
    ns.forEach(j => check('となりが対称', b.nbr[j].includes(i), `${i}-${j}`));
  });
  const md = Math.min(...b.homes.flatMap((h, i) => b.homes.slice(i + 1).map(k => E.hexDist(b.cells[h], b.cells[k]))));
  check('スタート地点が離れている', md >= 2, `${tag}: 最小距離${md}`);
  const k = Math.max(2, Math.round(n / 2)), gems = E.placeTreasures(b, k, 77 + n);
  check('お宝マスの数', gems.length === k && new Set(gems).size === k, `${tag}: ${gems.length}/${k}`);
  check('お宝マスはスタート地点から2マス以上はなれる', gems.every(g => b.homes.every(h => E.hexDist(b.cells[g], b.cells[h]) >= 2)), tag);
}

// ボーナスの計算（planGains）
for (let g = 0; g < 3000; g++) {
  const R = E.rng(9000 + g), n = 2 + Math.floor(R() * 19), mult = 1 + Math.floor(R() * 3);
  const correct = [...Array(n).keys()].filter(() => R() < 0.5);
  const streak = [...Array(n)].map(() => Math.floor(R() * 7)), cnt = [...Array(n)].map(() => 1 + Math.floor(R() * 20));
  const event = [null, null, 'double', 'underdog', 'risk', 'lucky'][Math.floor(R() * 6)];
  const opts = { streak: R() < 0.8, minority: R() < 0.8 };
  const p = E.planGains({ n, mult, correct, streak, counts: cnt, event, opts });
  const rk = E.ranksOf(cnt), few = opts.minority && correct.length > 0 && correct.length <= E.minorityLimit(n);
  check('少数正解の判定', p.few === few, `g${g}`);
  for (let t = 0; t < n; t++) {
    if (!correct.includes(t)) {
      check('まちがえたチームはボーナスなし', p.gains[t] === 0, `g${g} t${t}`);
      check('まちがえると連続正解は0にもどる', p.streak[t] === 0, `g${g} t${t}`);
      continue;
    }
    const s = streak[t] + 1;
    check('正解すると連続正解が1ふえる', p.streak[t] === s, `g${g} t${t}`);
    const want = mult * (event === 'double' ? 2 : 1) + (event === 'underdog' && rk[t] > n / 2 ? 2 : 0) + (few ? 1 : 0) + (opts.streak && s % E.STREAK_EVERY === 0 ? 1 : 0);
    check('正解チームのマス数（倍率・ダブル・下剋上・少数正解・連続正解）', p.gains[t] === want, `g${g} t${t} ${p.gains[t]}≠${want}`);
  }
}

// 1問ごとの決まり（resolveRound）
function frontier(b, owners, t) {
  const f = new Set();
  owners.forEach((o, i) => { if (o === t) b.nbr[i].forEach(j => { if (owners[j] !== t) f.add(j); }); });
  return [...f];
}
let rounds = 0, stealsSeen = 0, jumps = 0, gemsSeen = 0, lostSeen = 0;
for (let g = 0; g < 400; g++) {
  const R = E.rng(77 + g);
  const n = 2 + Math.floor(R() * 19), size = ['small', 'normal', 'large'][g % 3], steal = g % 5 !== 0;
  const b = E.makeBoard(n, E.SIZE_PER[size], g * 31 + 5);
  let owners = E.initOwners(b);
  let treasure = g % 4 === 0 ? [] : E.placeTreasures(b, Math.max(2, Math.round(n / 2)), g);
  const p = [...Array(n)].map(() => 0.2 + R() * 0.7);
  for (let q = 0; q < 24; q++) {
    const base = q === 23 ? 3 : q % 5 === 4 ? 2 : 1;
    const cor = [];
    for (let t = 0; t < n; t++) if (R() < p[t]) cor.push(t);
    // チームごとにちがうマス数（ボーナスあり）のことも、全チーム同じこともある
    const mult = R() < 0.5 ? base : [...Array(n)].map(() => base + Math.floor(R() * 3));
    const want = t => typeof mult === 'number' ? mult : mult[t];
    const penalty = R() < 0.15;
    const opts = { steal, treasure, penalty, capMult: base };
    const before = owners.slice(), c0 = E.counts(before, n), gems0 = new Set(treasure);
    const res = E.resolveRound(b, before, cor, mult, opts, g * 1000 + q);
    const res2 = E.resolveRound(b, before, cor, mult, opts, g * 1000 + q);
    rounds++;
    check('同じ条件なら同じ結果', JSON.stringify(res) === JSON.stringify(res2), `g${g} q${q}`);
    check('元の盤を書きかえない', JSON.stringify(before) === JSON.stringify(owners), `g${g}`);
    const c1 = E.counts(res.owners, n), okSet = new Set(cor);
    check('マスの持ち主が正しい', res.owners.length === b.cells.length && res.owners.every(o => o >= -1 && o < n), `g${g} q${q}`);
    b.homes.forEach((h, t) => check('★本拠地はうばわれない', res.owners[h] === t, `g${g} q${q} team${t}`));
    for (let t = 0; t < n; t++) {
      const d = c1[t] - c0[t];
      const stolen = res.changes.filter(c => c.from === t && !c.lose).length, lost = res.changes.filter(c => c.from === t && c.lose).length;
      if (okSet.has(t)) {
        const got = res.changes.filter(c => c.to === t).length, gemT = res.gems.filter(x => x.team === t).length;
        check('正解チームは減らない', d >= 0 && stolen === 0 && lost === 0, `g${g} q${q} team${t} ${d}`);
        check('正解チームがとるのは、決まった数＋お宝の数まで', got <= want(t) + gemT, `g${g} q${q} team${t} ${got}`);
        check('とれなかったチームは記録される', got - gemT >= want(t) || res.missed.includes(t), `g${g} q${q} team${t}`);
      } else {
        check('まちがえたチームは増えない', d <= 0, `g${g} q${q} team${t}`);
        check('1問でうばわれるのは上限まで', stolen <= E.LOSS_CAP * base, `g${g} q${q} team${t} ${stolen}`);
        check('ハイリスクで失うのは1マスだけ', lost <= (penalty ? 1 : 0), `g${g} q${q} team${t} ${lost}`);
        check(`${E.PROTECT}マス以下はうばわれない`, d === 0 || c0[t] > E.PROTECT, `g${g} q${q} team${t} ${c0[t]}`);
        check(`うばわれても${E.PROTECT}マスは残る`, d === 0 || c1[t] >= E.PROTECT, `g${g} q${q} team${t} ${c1[t]}`);
        if (penalty && c0[t] > E.PROTECT) check('ハイリスク：4マス以上のまちがえたチームは1マス失う', lost === 1, `g${g} q${q} team${t}`);
      }
    }
    check('うばい合いなしでは、うばわない', steal || !res.changes.some(c => c.from >= 0 && !c.lose), `g${g} q${q}`);
    // 1マスずつ再生して、失う→空きマス優先・お宝優先・となり優先を確かめる
    const cur = before.slice(), gl = new Set(gems0);
    for (const ch of res.changes) {
      check('変化の記録が正しい', cur[ch.cell] === ch.from, `g${g} q${q}`);
      if (ch.lose) {
        check('失ったマスは空きマスにもどる', ch.to === -1 && !b.homes.includes(ch.cell), `g${g} q${q}`);
        lostSeen++;
        cur[ch.cell] = -1;
        continue;
      }
      const f = frontier(b, cur, ch.to);
      const adjNeutral = f.some(i => cur[i] === -1), adjGem = f.some(i => cur[i] === -1 && gl.has(i));
      if (adjNeutral) check('となりに空きマスがあれば、そこをとる', ch.from === -1 && f.includes(ch.cell), `g${g} q${q}`);
      if (adjGem) check('となりにお宝があれば、お宝をとる', gl.has(ch.cell), `g${g} q${q}`);
      check('お宝の記録が正しい', !!ch.gem === gl.has(ch.cell), `g${g} q${q}`);
      if (ch.gem) { gl.delete(ch.cell); gemsSeen++; }
      if (!f.includes(ch.cell)) jumps++;
      if (ch.from >= 0) stealsSeen++;
      cur[ch.cell] = ch.to;
    }
    check('変化の記録と結果が一致', JSON.stringify(cur) === JSON.stringify(res.owners), `g${g} q${q}`);
    check('とったお宝は消える', JSON.stringify([...gl].sort((a, b) => a - b)) === JSON.stringify(res.treasure.slice().sort((a, b) => a - b)), `g${g} q${q}`);
    owners = res.owners;
    treasure = res.treasure;
  }
}
seen.forEach(k => ok(k, !fail[k], fail[k] || ''));
ok('うばい合い・飛び地・お宝・ハイリスクが実際に起きている', stealsSeen > 100 && jumps > 0 && gemsSeen > 100 && lostSeen > 50, `うばい${stealsSeen} 飛び地${jumps} お宝${gemsSeen} 失う${lostSeen} / ${rounds}問`);

// 順位（同点は同じ順位）
ok('順位の計算', JSON.stringify(E.ranksOf([5, 9, 9, 1, 5])) === JSON.stringify([3, 1, 1, 5, 3]));

// サンプル問題と同じ並び（ボーナス4問・ルーレット2回・最後に逆転3マス）で、ルールを決めたときのシミュレーション
const MULTS = [1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2, 3];
const ROULETTE = new Set([7, 13]);
function game(n, size, s, fun) {
  const b = E.makeBoard(n, E.SIZE_PER[size], s);
  let o = E.initOwners(b), tre = fun ? E.placeTreasures(b, Math.max(2, Math.round(n / 2)), s) : [], streak = new Array(n).fill(0);
  const R = E.rng(s * 7 + 1), p = [...Array(n)].map(() => 0.35 + R() * 0.45);
  let c15 = null, g0 = null, bonus = 0;
  MULTS.forEach((m, q) => {
    let ev = null;
    if (fun && ROULETTE.has(q)) {
      ev = ['double', 'underdog', 'risk', 'lucky'][Math.floor(R() * 4)];
      if (ev === 'lucky') { const r = E.resolveRound(b, o, [...Array(n).keys()], 1, { steal: false, treasure: tre }, s * 999 + q); o = r.owners; tre = r.treasure; }
    }
    const diff = (R() - 0.5) * 0.5, cor = [];
    for (let t = 0; t < n; t++) if (R() < p[t] + diff) cor.push(t);
    const pl = E.planGains({ n, mult: m, correct: cor, streak, counts: E.counts(o, n), event: ev, opts: { streak: fun, minority: fun } });
    streak = pl.streak;
    bonus += pl.why.filter(w => w.length).length;
    const r = E.resolveRound(b, o, cor, pl.gains, { treasure: tre, penalty: ev === 'risk', capMult: m * (ev === 'double' ? 2 : 1) }, s * 100 + q);
    o = r.owners; tre = r.treasure;
    if (g0 === null && !o.includes(-1)) g0 = q + 1;
    if (q === 14) c15 = E.counts(o, n);
  });
  const c = E.counts(o, n);
  return { c, g0, change: c15.indexOf(Math.max(...c15)) !== c.indexOf(Math.max(...c)), cells: b.cells.length, bonus };
}
console.log('対戦シミュレーション（各100回、チームの正答率は35〜80%でばらばら）');
console.log('おたのしみ チーム 地図  マス  空きがなくなる問  最後の最大 最小  15問目の1位が最後に入れかわる  ボーナスを受けた回数');
for (const fun of [false, true]) for (const n of [8, 12, 16, 20]) for (const size of ['small', 'normal', 'large']) {
  let mn = 0, mx = 0, gone = 0, goneN = 0, change = 0, minMin = 1e9, cells = 0, bonus = 0;
  const N = 100;
  for (let s = 1; s <= N; s++) {
    const r = game(n, size, s, fun);
    cells = r.cells; bonus += r.bonus;
    mn += Math.min(...r.c); mx += Math.max(...r.c); minMin = Math.min(minMin, Math.min(...r.c));
    if (r.g0) { gone += r.g0; goneN++; }
    if (r.change) change++;
  }
  console.log(`${fun ? 'あり' : 'なし'}  ${String(n).padStart(4)}  ${size.padEnd(6)} ${String(cells).padStart(4)}  ${goneN ? (gone / goneN).toFixed(1).padStart(8) : '       -'}（${goneN}%）  ${(mx / N).toFixed(1).padStart(6)} ${(mn / N).toFixed(1).padStart(4)}（いちばん少なくて${minMin}）  ${String(change).padStart(3)}%  ${(bonus / N).toFixed(1)}`);
  if (size === 'normal' && n === 16) {
    const tag = `16チーム・ふつう・おたのしみ${fun ? 'あり' : 'なし'}`;
    ok(`${tag}：いちばん少ないチームも平均3マス以上残る`, mn / N >= 3, (mn / N).toFixed(2));
    ok(`${tag}：15問目の1位が最後に入れかわることが4割以上ある`, change >= 40, change + '%');
    if (fun) ok(`${tag}：後半（13〜18問目ごろ）に空きマスがなくなる`, goneN >= 80 && gone / goneN >= 13 && gone / goneN <= 18, (gone / goneN).toFixed(1));
  }
}
console.log('');
let f = 0;
results.forEach(r => { if (r[0] === 'FAIL') f++; console.log(r[0], r[1], r[2]); });
console.log(`\n${results.length - f}/${results.length} PASS`);
process.exit(f ? 1 : 0);
