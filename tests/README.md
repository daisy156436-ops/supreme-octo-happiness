# 検査と検証実験

`リレー走順.html` の計算部分と画面を確かめるスクリプトです。Node.js と Playwright（Chromium）が必要です。

| ファイル | 内容 |
|---|---|
| `browser.js` | 名簿の貼り付け、ルール、最適な走順、いまの走順の読み込みと入れ替え提案、印刷、自動保存を、架空の33人のクラスで確かめる |
| `browser-edge.js` | 入力の間違い・極端な設定（名簿なし、区間数の不一致、男女未入力、ゾーンが短すぎる、固定区間の矛盾、アンカーだけ長い区間、助走区間など） |
| `robustness.js` | 走りのモデルの前提（後半の落ち方、加速の速さ）や50m走タイムの誤差を変えても、アプリの案がどれだけ良いままか |
| `margin.js` | 走り出しのばらつきに対して、目印を「全組一律」と「組ごと」に近くした場合の比較 |
| `engine.js` | HTML から計算部分だけを取り出して読み込むための補助 |

実行例：

```
node tests/browser.js
node tests/browser-edge.js
node tests/robustness.js
node tests/margin.js
```

名前やタイムはすべて架空です。
