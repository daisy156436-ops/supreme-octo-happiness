# 引き継ぎメモ（このリポジトリで作業する Claude へ）

このファイルは、前のチャットからの引き継ぎです。**必ず日本語で**やりとりしてください。先生（ユーザー）は日本の中学校の先生で、プログラムの話は不要です。やさしい言葉で、結果と次にすることを短く伝えます。

## 1. 何を作ったか

中学1〜3年の**縦割り活動**（約100人・50分）で遊ぶゲーム。パソコン1台（プロジェクター）と印刷した紙で遊べる、インターネット不要の1ファイルHTMLアプリ。

| ファイル | 内容 |
|---|---|
| `謎解き脱出.html` | **メイン**。先生用。「体育館からの脱出」の設定・本番の投影画面・印刷・保存。答えが入っている |
| `謎解きカード.html` | 生徒のタブレット用。答え合わせだけ。答えはハッシュで暗号化してあり、ファイルを開いても見えない |
| `陣取りクイズ.html` / `回答カード.html` | 別のゲーム（クイズで陣地を取り合う）。完成ずみ・最近は変えていない |
| `リレー走順.html` | 前からあったもの。さわらない |
| `印刷用PDF/` | 先生が校務パソコン（HTMLを開けない）で印刷するための一式。`tests/export-pdf.js` で作る |
| `README.md` | 先生向けの「使い方」（表紙に出る。`印刷用PDF/使い方.pdf` にもなる） |
| `src/nazo/` | 謎解き2ファイルの**元ファイル**（下の 3 を見る） |
| `tests/` | 自動検査と PDF 書き出し（`tests/README.md`） |

状態：**完成版**。先生は「来年の予定はないから現状のものでいい」と言っている。頼まれていない大きな追加はしない。頼まれたら改善する。

## 2. 先生との約束（必ず守る）

1. **変更したら毎回、全部そろったセットを送る**：`謎解き脱出.html`・`謎解きカード.html`・`陣取りクイズ.html`・`回答カード.html`・`印刷用PDF.zip` の5つを SendUserFile で送る（先生は「いちばん新しいメッセージの添付だけ使う」運用）。
2. **表紙（既定のブランチ）も毎回最新に**：先生の指示「常に最新版に差し替えて」「表紙も最新版に」。手順は 5 を見る。
3. **版の日付を更新する**：`src/nazo/shared.js` の `NZ_VERSION`（先生用・生徒用の画面に「版 2026-10-24」と出る）と、`陣取りクイズ.html`・`回答カード.html` の「版 20xx-xx-xx」。検査が「版は1か所で管理」を確かめる。
4. **生徒用ファイルと生徒に配る紙に答えを書かない**（コメントにも）。検査 `nazo-rules.js` が答えの文字列を探して落とす。
5. **印刷物は PDF でも用意する**：校務パソコンでは HTML を開けないので、`印刷用PDF/` と `印刷用PDF.zip` を毎回作り直す。
6. コミットメッセージ・PR も日本語。コミット末尾の署名は、そのセッションの指示に従う。

## 3. 謎解きアプリの作り方（重要）

先生用と生徒用は、**同じ「謎の中身」ブロック**を持つ。直接 `謎解き脱出.html` を編集せず、`src/nazo/` を編集して作り直す。

```
src/nazo/shared.js    謎の中身（NAZO 配列・とびら・裏ミッション・れんしゅう用の描画・nzCheck・NZ_VERSION）
src/nazo/shared.css   謎の見た目
src/nazo/teacher.html 先生用の画面（/*NAZO_CSS*/ と //NAZO_JS の行に上の2つが入る）
src/nazo/card.html    生徒用の画面（同じ）
node src/nazo/build.js         → 謎解き脱出.html と 謎解きカード.html を書き出す
node src/nazo/build.js check   → 書き出さずに、いまの HTML と同じか確かめる
```

- 先生だけが持つもの（`teacher.html` 内）：`NZ_TEACH`（答え・ヒント・解説）、`RELAY`（伝令タイムのひみつ情報）、`HINT_PLAN`、台本などの印刷 `PR.*`。
- **答えの確かめ方**：`nzCheck(p, input)` は入力を `nzNorm`（NFKC・カタカナ→ひらがな・記号除去）してから `nzHash(id, s)`（FNV-1a of `'nazo|'+id+'|'+s`）を引き、`p.ok[hash]` が配列なら XOR（`nzDec`、鍵＝入力、`^0x5a`）で正しいひらがなの答えに戻す。とびら（final/final2/ex）は `1`。
- **答えや別解を足すとき**の計算（Node で実行して `ok` に貼る）：

```js
function nzNorm(s){return (s||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s、。，．,.・!！?？「」『』（）()ー－\-]/g,'').toLowerCase();}
function nzHash(id,s){let h=0x811c9dc5;const t='nazo|'+id+'|'+s;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return ('0000000'+h.toString(16)).slice(-8);}
function nzEnc(text,key){const k=[...key].map(c=>c.codePointAt(0));return [...text].map((c,i)=>c.codePointAt(0)^k[i%k.length]^0x5a);}
// 例：謎3に「コブラ」を足す → ok[nzHash(3, nzNorm('コブラ'))] = nzEnc('こぶら', nzNorm('コブラ'))
```

- 謎の答え（先生用にしかない情報。ここに書いてよいが、生徒用には絶対に入れない）：
  1 ありがとう（○1文字目 あ）／2 きもち（き）／3 こあら・こぶら（3文字目 ら）／4 ゆめ（2文字目 め）／5 なかま（な）／6 かい（2文字目 い）→ 第1のとびら「あきらめない」。
  7 かえり（2文字目 え）／8 かがみ（2文字目 が）／9 おうえん（1文字目 お）→ 第2のとびら「えがお」。
  裏ミッション「みらいもなかま」。れんしゅうの謎・予告ポスター「とびら」（🐯🏥🍜の1文字目）。
- 謎9「3つのかけら」は全学年の協力の謎（1年＝道順、2年＝読む場所、3年＝地図。タブレットでは `fold:true` で1つずつタップして見る）。

## 4. 検査と PDF（変更したら必ず全部通す）

```
node tests/nazo-rules.js      # 謎の論理・答えの確かめ方・答えもれ（87件）
node tests/nazo-browser.js    # 先生用・生徒用の画面と印刷（208件・3〜4分）
node tests/jintori-rules.js   # 陣取り（40件）
node tests/jintori-browser.js # 陣取りの画面（119件）
node tests/export-pdf.js      # 印刷用PDF/ と 印刷用PDF.zip を作り直す（zip は git に入れない）
```

- Playwright は `/opt/node22/lib/node_modules/playwright`（Chromium 入り）。`playwright install` は不要。
- 印刷物は A4 に収まること（検査が `.page` のはみ出しを見る）。4:3 のプロジェクター（1024×768）でも投影画面がはみ出さないことも検査している。
- 検査を変えたら `tests/README.md` の表も直す。

## 5. GitHub の手順（表紙を最新にする）

- **表紙＝既定のブランチ `claude/hopeful-euler-0x2mth`**。前のチャットの作業ブランチは `claude/sharp-thompson-pjzs1w`（表紙と同じ内容）。新しいセッションは、割り当てられた自分のブランチで作業してよい。
- 手順：作業ブランチにコミット → push → **表紙への PR を作って merge** → 作業ブランチを表紙にそろえる（`git fetch origin claude/hopeful-euler-0x2mth && git checkout -B <作業ブランチ> origin/claude/hopeful-euler-0x2mth && git push -u origin <作業ブランチ>`）。
- この環境では `gh` は **`gh api`（REST）だけ**使える（`gh pr` などは使えない）。例：
  - PR 作成：`gh api repos/daisy156436-ops/supreme-octo-happiness/pulls -f title=… -f head=<作業ブランチ> -f base=claude/hopeful-euler-0x2mth -f body=…`
  - merge：`gh api -X PUT repos/daisy156436-ops/supreme-octo-happiness/pulls/<番号>/merge -f merge_method=merge -f commit_title=…`
  - 既定のブランチの変更（PATCH）は前のチャットでは許可されなかった。既定は変えず、PR で反映する。
- リポジトリは公開。先生向けの説明は `README.md`（表紙）に書く。

## 6. 決めたこと（むし返さない）

- 謎の難しさは中学生向け。先生方で試し解きをすすめてある（生徒ではまだ試していない）。
- **探索（体育館を歩いて手がかりを探す）は入れない**：100人が動くと危険。
- **来年用の謎セットBは作らない**（来年の予定がない）。
- タブレットの答えを先生の画面に自動で集めるのは、ネットなしではできないので入れない。
- 謎9は「天びんの謎」から「3つのかけら」に差し替えずみ。🏢→🏥（読み方を1つに）。コブラも正解。
- 縦割りの役割：3年＝リーダー（答えを言わずに導く）、2年＝記録係、1年＝伝令（伝令タイムの主役）。
- 縦割り活動のしかけ：チーム結成タイム、役割カード、協力の謎、伝令タイム、SOSカード、裏ミッション、全員で開ける最後のとびら（先輩からの手紙）、特別賞、証明書、ふりかえり。

## 7. 前のチャットの反省

- 元ファイルを一時フォルダ（scratchpad）にだけ置いていたら消えた。**元ファイルは必ずリポジトリに入れる**（今は `src/nazo/` にある）。
- `hidden` 属性が `display:flex` に負けて、かくすべきものが見えていたことがあった。4つのアプリに `[hidden]{display:none!important}` を入れてある。新しい画面でも同じ落とし穴に注意。
- 文章の点検は、画面と印刷物の文字を全部書き出して読み直すと見つかる（dump して読む）。
