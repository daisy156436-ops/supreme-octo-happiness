// 謎解き脱出.html と 陣取りクイズ.html の印刷物を、すべてPDFに書き出す（印刷用PDF/ フォルダ）
// アプリの⑤印刷と同じ画面を、最初の設定（謎解き17チーム・陣取り16チーム）のままPDFにする
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path'), url = require('url');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '印刷用PDF');

const JOBS = [
  ['謎解き脱出.html', '謎解き脱出', [
    ['script', '00_台本と進行表'],
    ['sheets', '01_謎の紙（第1ステージ）'],
    ['stage2', '02_第2ステージの紙'],
    ['ex', '03_裏ミッションの紙'],
    ['team', '04_チームシート'],
    ['role', '04b_役割カード'],
    ['cert', '04c_証明書（本番のあとに印刷）'],
    ['check', '05_答え合わせカード（先生用）'],
    ['key', '06_答えとヒント（先生用）'],
    ['poster', '07_予告ポスター'],
    ['panel', '08_写真用パネル'],
  ]],
  ['陣取りクイズ.html', '陣取りクイズ', [
    ['plan', '00_進行表とセリフ'],
    ['script', '01_台本（問題と正解）'],
    ['cards', '02_回答カード'],
    ['teams', '03_チーム札'],
  ]],
];

(async () => {
  const b = await chromium.launch();
  const list = [];
  for (const [file, dir, kinds] of JOBS) {
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
    const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(url.pathToFileURL(path.join(ROOT, file)).href);
    await pg.evaluate(() => { try { localStorage.clear(); } catch (e) { /* なし */ } });
    await pg.reload();
    await pg.click('button[data-tab=print]');
    for (const [kind, name] of kinds) {
      await pg.check(`input[name=pKind][value=${kind}]`);
      await pg.evaluate(t => { document.title = t; }, name);
      await pg.waitForTimeout(300);   // 絵文字のフォントの読み込みを待つ
      const pages = await pg.$$eval('#printPreview .page', x => x.length);
      const hint = await pg.textContent('#pHint');
      const out = path.join(OUT, dir, name + '.pdf');
      await pg.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
      list.push({ file: path.relative(ROOT, out), pages, hint });
      console.log(`${path.relative(ROOT, out)}  ${pages}ページ`);
    }
    if (errs.length) { console.error(file, errs); process.exitCode = 1; }
    await pg.close();
  }
  // 一覧（README.md）
  const md = ['# 印刷用PDF', '', 'アプリの「⑤印刷」と同じものを、最初の設定（謎解き脱出は17チーム・32分・縦割り活動モード、陣取りクイズは16チーム・サンプル問題）でPDFにしたものです。A4たて・ふちなしで作っています（プリンターの設定で「用紙に合わせる」にしても大丈夫です）。', '',
    'チームの数や名前、時間などを変えたときは、アプリの「⑤印刷」から印刷してください（このPDFは `node tests/export-pdf.js` で作り直せます）。', ''];
  for (const [, dir] of JOBS) {
    md.push(`## ${dir}`, '', '| ファイル | ページ | 印刷のしかた |', '|---|---|---|');
    list.filter(x => x.file.includes(`/${dir}/`)).forEach(x => md.push(`| ${path.basename(x.file)} | ${x.pages} | ${x.hint} |`));
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'README.md'), md.join('\n'));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
