// 謎解き脱出.html と 陣取りクイズ.html の印刷物を、すべてPDFに書き出す（印刷用PDF/ フォルダと 印刷用PDF.zip）
// アプリを開けないパソコン（校務用など）でも印刷できるように、アプリの⑤印刷と同じものをPDFにする。
// 先生用（台本など）は最初の設定（謎解き17チーム・32分、陣取り16チーム・サンプル問題）、
// チームの番号入りの紙は20チーム分（チームの数だけ、はじめのページを印刷する）。
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path'), url = require('url'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '印刷用PDF');
const EX = 17;   // 「17チームなら」の例

// teams：チームの数、per：チームの番号入り、how：印刷のしかた（チームの数を n とする）
const JOBS = [
  ['謎解き脱出.html', '謎解き脱出', [
    { kind: 'script', name: '00_台本と進行表', teams: 17, who: '先生', how: () => '先生の人数分。5ページ目「見回りの先生用」は見回りの先生の人数分', color: '白黒でOK' },
    { kind: 'sheets', name: '01_謎の紙（チーム番号入り）', teams: 20, per: true, who: '生徒', how: n => `チームの数×3ページ（${n}チームなら1〜${n * 3}ページ）を部数1で`, color: 'カラー推奨', when: 'チーム結成タイムに裏返しで配る（白黒でも解ける）' },
    { kind: 'stage2', name: '02_第2ステージの紙（チーム番号入り）', teams: 20, per: true, who: '生徒', how: n => `チームの数×2ページ（${n}チームなら1〜${n * 2}ページ）。両面印刷なら1枚`, color: 'カラー推奨', when: '第1のとびらを開けたチームにわたす。謎9のかけらは、はさみで切る' },
    { kind: 'ex', name: '03_裏ミッションの紙（チーム番号入り）', teams: 20, per: true, who: '生徒', how: n => `1枚に2チーム分。チームの数÷2ページ（${n}チームなら1〜${Math.ceil(n / 2)}ページ）。線で切る`, color: '白黒でOK', when: '脱出したチームにわたす' },
    { kind: 'team', name: '04_チームシート', teams: 20, who: '生徒', how: n => `チームの数（${n}チームなら1〜${n}ページ）`, color: '白黒でOK', when: 'チーム結成タイム・ふりかえり' },
    { kind: 'role', name: '05_役割カード（チーム番号入り）', teams: 20, per: true, who: '生徒', how: n => `チームの数（${n}チームなら1〜${n}ページ）。1枚を6枚に切る`, color: 'カラー推奨', when: 'チーム結成タイムに1人1枚' },
    { kind: 'cert', name: '06_証明書（ひな形）', teams: 20, who: '生徒', how: n => `チームの数（${n}チームなら1〜${n}ページ）。本番のあとに、タイムと順位を手で書く（アプリから印刷すると自動で入る）`, color: 'カラー推奨', when: 'ふりかえりか後日' },
    { kind: 'check', name: '07_答え合わせカード（先生用）', teams: 17, who: '先生', how: () => '1枚（切って4枚）', color: '白黒でOK', when: '答え合わせ係の先生が持つ。生徒に見せない' },
    { kind: 'key', name: '08_答えとヒント（先生用）', teams: 17, who: '先生', how: () => '2ページ', color: '白黒でOK', when: '司会・答え合わせ係。生徒に見せない' },
    { kind: 'poster', name: '09_予告ポスター', teams: 17, who: '掲示', how: () => '1枚〜（なくてもよい）', color: 'カラー推奨', when: '数日前に教室や廊下にはる' },
    { kind: 'panel', name: '10_写真用パネル', teams: 17, who: '掲示', how: () => '3枚（なくてもよい）。厚紙だと持ちやすい', color: 'カラー推奨', when: '脱出したチームの記念写真' },
    { kind: 'sheets', name: '番号なし/謎の紙', teams: 17, per: false, who: '生徒', how: n => `3ページ。部数をチームの数（${n}）に`, color: 'カラー推奨', when: 'チームの番号を入れたくないとき用' },
    { kind: 'stage2', name: '番号なし/第2ステージの紙', teams: 17, per: false, who: '生徒', how: n => `2ページ。部数をチームの数（${n}）に`, color: 'カラー推奨' },
    { kind: 'ex', name: '番号なし/裏ミッションの紙', teams: 17, per: false, who: '生徒', how: n => `1枚に2チーム分。部数を${Math.ceil(n / 2)}に`, color: '白黒でOK' },
    { kind: 'role', name: '番号なし/役割カード', teams: 17, per: false, who: '生徒', how: n => `1枚（6枚に切る）。部数をチームの数（${n}）に`, color: 'カラー推奨' },
  ]],
  ['陣取りクイズ.html', '陣取りクイズ', [
    { kind: 'plan', name: '00_進行表とセリフ', teams: 16, who: '先生', how: () => '司会の先生の分', color: '白黒でOK' },
    { kind: 'script', name: '01_台本（問題と正解）', teams: 16, who: '先生', how: () => '司会の先生の分（サンプル問題20問＋練習1問）', color: '白黒でOK', when: '生徒に見せない' },
    { kind: 'cards', name: '02_回答カード', teams: 16, who: '生徒', how: n => `6ページ。部数をチームの数（${n}）に。厚紙だと持ちやすい`, color: 'カラー推奨', when: '1チーム1組（白黒でも形で見分けられる）' },
    { kind: 'teams', name: '03_チーム札', teams: 20, who: '生徒', how: n => `チームの数（${n}チームなら1〜${n}ページ）`, color: 'カラー推奨', when: 'チームの場所の目印' },
  ]],
];

function indexHtml(list) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const table = dir => `<table><thead><tr><th>ファイル</th><th>ページ</th><th>だれに</th><th>印刷のしかた（${EX}チームの例）</th><th>色</th><th>使うとき</th></tr></thead><tbody>${
    list.filter(x => x.dir === dir).map(x => `<tr><td>${esc(x.name)}.pdf</td><td>${x.pages}</td><td>${x.who}</td><td>${esc(x.how(EX))}</td><td>${esc(x.color)}</td><td>${esc(x.when || '')}</td></tr>`).join('')}</tbody></table>`;
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
    body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",system-ui,sans-serif;color:#1d2330;font-size:3.6mm;line-height:1.55;margin:0}
    h1{font-size:7mm;margin:0 0 2mm;border-bottom:0.6mm solid #1d2330;padding-bottom:1.5mm}
    h2{font-size:4.6mm;margin:4mm 0 1.5mm;padding:0.8mm 2.5mm;background:#1d2330;color:#fff;border-radius:1.2mm}
    p{margin:1mm 0}ul{margin:1mm 0;padding-left:5mm}
    table{border-collapse:collapse;width:100%;font-size:3.2mm;line-height:1.4}
    th,td{border:0.3mm solid #9aa3b2;padding:0.9mm 1.6mm;vertical-align:top;text-align:left}
    th{background:#f0f2f6;white-space:nowrap}
    td:first-child{white-space:nowrap}td:nth-child(2){white-space:nowrap;text-align:right}td:nth-child(3),td:nth-child(5){white-space:nowrap}
    .box{border:0.5mm solid #c8102e;border-radius:2mm;padding:2mm 4mm;background:#fff5f5;margin:2mm 0}
    .note{color:#5b6475;font-size:3.2mm}
    ol.steps{margin:1mm 0;padding-left:5mm}ol.steps li{margin:0.6mm 0}
  </style></head><body>
  <h1>印刷のしかた（はじめに読む）</h1>
  <p>このフォルダのPDFは、アプリ「謎解き脱出.html」「陣取りクイズ.html」の⑤印刷と同じものです。<b>アプリを開けないパソコン（校務用など）でも、このPDFだけで印刷できます。</b></p>
  <div class="box"><b>チーム名や設定を変えたときは</b>：アプリを開けるパソコンで ⑤印刷 →「印刷する」→ プリンターを<b>「PDFとして保存」（Microsoft Print to PDF）</b>にしてPDFを作り、USBメモリなどで運んで印刷してください。このフォルダのPDFは、チーム名が「1班・2班…」、謎解き脱出は制限時間32分・縦割り活動モード、陣取りクイズはサンプル問題で作ってあります。</div>
  <h2>共通の設定</h2>
  <ul><li>用紙：<b>A4たて</b>。ふちなしで作ってあるので、プリンターの設定は「用紙に合わせる」か「実際のサイズ」のどちらでも大丈夫です</li>
  <li>「チーム番号入り」のPDFは20チーム分あります。<b>チームの数だけ、はじめのページを印刷</b>してください（ページ指定）。番号を入れたくないときは「番号なし」フォルダのPDFを、部数をチームの数にして印刷します</li>
  <li>両面印刷と書いていないものは片面で。「カラー推奨」のものも、白黒で使えます</li></ul>
  <h2>謎解き脱出（体育館からの脱出）</h2>${table('謎解き脱出')}
  <p class="note">生徒の紙は、チームの番号順に重ねて先生の机に置いておくと、配るときにまちがえません。先生用の3つ（台本・答え合わせカード・答えとヒント）は答えが入っているので、生徒に見せないでください。</p>
  <h2>陣取りクイズ</h2>${table('陣取りクイズ')}
  <h2>準備の順番（謎解き脱出）</h2>
  <ol class="steps"><li>「00_台本と進行表」を先生全員で読む（2ページ目が準備チェックリスト）</li>
  <li>生徒の紙（01〜05）をチームの数だけ印刷し、03は線で切り、05は6枚に切る</li>
  <li>先生用（07・08）と、あれば掲示用（09・10）を印刷</li>
  <li>当日は、アプリを開けるパソコンをプロジェクターにつないで④本番。本番のあと「06_証明書」を印刷（アプリから印刷するとタイムと順位が自動で入ります）</li></ol>
  </body></html>`;
}

// README.md（使い方）を、印刷用のPDFにする（見出し・箇条書き・表・太字・リンクだけの簡単な変換）
function mdToHtml(md) {
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  const out = [];
  let list = null, table = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } if (table) { out.push('</tbody></table>'); table = null; } };
  for (const line of md.split('\n')) {
    const h = line.match(/^(#{1,3}) (.*)/), li = line.match(/^- (.*)/), ol = line.match(/^\d+\. (.*)/);
    if (h) { close(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (line.startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (cells.every(c => /^-+$/.test(c))) continue;
      if (!table) { if (list) close(); table = true; out.push(`<table><thead><tr>${cells.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`); }
      else out.push(`<tr>${cells.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`);
    }
    else if (li || ol) { const k = li ? 'ul' : 'ol'; if (list !== k) { close(); list = k; out.push(`<${k}>`); } out.push(`<li>${inline((li || ol)[1])}</li>`); }
    else if (line.trim() === '') close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join('\n');
}
const GUIDE_CSS = `body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic UI","Meiryo",system-ui,sans-serif;color:#1d2330;font-size:3.6mm;line-height:1.55;margin:0}
  h1{font-size:6.5mm;margin:0 0 2mm;border-bottom:0.6mm solid #1d2330;padding-bottom:1.5mm}
  h2{font-size:4.6mm;margin:4mm 0 1.5mm;padding:0.8mm 2.5mm;background:#1d2330;color:#fff;border-radius:1.2mm}
  h3{font-size:4mm;margin:2.5mm 0 1mm}
  p{margin:1mm 0}ul,ol{margin:1mm 0;padding-left:5.5mm}li{margin:0.4mm 0}
  table{border-collapse:collapse;width:100%;font-size:3.3mm;line-height:1.4;margin:1mm 0}
  th,td{border:0.3mm solid #9aa3b2;padding:0.9mm 1.6mm;vertical-align:top;text-align:left}th{background:#f0f2f6}
  td:first-child{white-space:nowrap}code{background:#eef1f6;border-radius:0.8mm;padding:0 1mm}a{color:#174ea6}`;

(async () => {
  const b = await chromium.launch();
  const list = [];
  for (const [file, dir, items] of JOBS) {
    fs.mkdirSync(path.join(OUT, dir, '番号なし'), { recursive: true });
    const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(url.pathToFileURL(path.join(ROOT, file)).href);
    await pg.evaluate(() => { try { localStorage.clear(); } catch (e) { /* なし */ } });
    await pg.reload();
    await pg.click('button[data-tab=print]');
    for (const it of items) {
      // チームの数・番号入りかどうかを、アプリの設定に入れてから印刷画面を作る
      await pg.evaluate(({ teams, per, kind, name }) => {
        S.teams.count = teams;
        S.teams.names = [...Array(20)].map((_, i) => `${i + 1}班`);
        if (per != null) S.opts.perTeam = per;
        saveNow();
        document.querySelector(`input[name=pKind][value=${kind}]`).checked = true;
        renderPrint();
        document.title = name.split('/').pop();
      }, { teams: it.teams, per: it.per == null ? null : it.per, kind: it.kind, name: it.name });
      await pg.waitForTimeout(300);   // 絵文字のフォントの読み込みを待つ
      const pages = await pg.$$eval('#printPreview .page', x => x.length);
      const out = path.join(OUT, dir, it.name + '.pdf');
      await pg.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
      list.push(Object.assign({ dir, pages, file: path.relative(ROOT, out) }, it));
      console.log(`${path.relative(ROOT, out)}  ${pages}ページ`);
    }
    if (errs.length) { console.error(file, errs); process.exitCode = 1; }
    await pg.close();
  }
  // 印刷のしかた（はじめに読む）
  const ip = await b.newPage();
  await ip.setContent(indexHtml(list), { waitUntil: 'load' });
  await ip.pdf({ path: path.join(OUT, 'はじめに読む（印刷のしかた）.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '13mm', right: '13mm' } });
  await ip.close();
  // 使い方（README.md）
  const gp = await b.newPage();
  await gp.setContent(`<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>${GUIDE_CSS}</style></head><body>${mdToHtml(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8'))}</body></html>`, { waitUntil: 'load' });
  await gp.pdf({ path: path.join(OUT, '使い方.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '13mm', right: '13mm' } });
  await gp.close();
  await b.close();
  // README.md（GitHub で見る用）
  const md = ['# 印刷用PDF', '', 'アプリの「⑤印刷」と同じものを、アプリを開けないパソコンでも印刷できるようにPDFにしたものです。くわしくは `はじめに読む（印刷のしかた）.pdf` を見てください。ゲーム全体の使い方は `使い方.pdf`（表紙の README.md と同じ内容）にあります。', '',
    '先生用の紙は最初の設定（謎解き脱出は17チーム・32分・縦割り活動モード、陣取りクイズは16チーム・サンプル問題）、チームの番号入りの紙は20チーム分です（チームの数だけ、はじめのページを印刷）。A4たて・ふちなし。', '',
    'チームの数や名前、時間などを変えたときは、アプリの「⑤印刷」から「PDFとして保存」で作ってください（このフォルダは `node tests/export-pdf.js` で作り直せます）。', ''];
  for (const [, dir] of JOBS) {
    md.push(`## ${dir}`, '', `| ファイル | ページ | 印刷のしかた（${EX}チームの例） |`, '|---|---|---|');
    list.filter(x => x.dir === dir).forEach(x => md.push(`| ${x.name}.pdf | ${x.pages} | ${x.how(EX)} |`));
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'README.md'), md.join('\n'));
  // zip（USBメモリなどで運ぶ用）
  try { fs.rmSync(path.join(ROOT, '印刷用PDF.zip'), { force: true }); execSync('zip -q -r 印刷用PDF.zip 印刷用PDF', { cwd: ROOT }); console.log('印刷用PDF.zip を作りました'); } catch (e) { console.error('zip を作れませんでした', e.message); }
})().catch(e => { console.error(e); process.exit(1); });
