# フォーメーション帳

ダンスの立ち位置を場面ごとに置いて、カウントに合わせて動かして見るアプリです。場面ごとに1ページの PDF を作って、LINE などで配れます。

- 公開 URL: https://iiiitiiitiiti.github.io/formation/
- 作った作品はその端末のブラウザの中（localStorage）に保存されます。別の端末へは「ファイルに書き出す」→「ファイルを読み込む」で移します
- 一度開けば、次からはオフラインでも使えます

## iPhone で使うとき

Safari の共有ボタンから「ホーム画面に追加」をしてから使ってください。追加しないまま7日ほど開かないと、Safari が保存内容を消すことがあります。念のため、ときどき「配る」→「ファイルに書き出す」で控えを残してください。

## 使い方

1. 「新しく作る」で作品を作る
2. 下の「人を足す」で踊る人を足す（下手の袖に並ぶ）
3. 人をタップして選び、選んだ人をドラッグして立ち位置に置く。2本指で拡大できる
4. 「場面を足す」で今の立ち位置を写した次の場面を作り、動かす
5. 場面の帯をもう一度押すと、移動のカウント・止まるカウント・メモを変えられる
6. 再生ボタンでカウントの速さで動く。速さは「ステージ」のテンポで変える
7. 「配る」→「PDF を作る」→「送る」

| 操作 | キー |
|---|---|
| 人を選ぶ | Tab |
| 選んだ人を動かす | 矢印キー（Shift で4倍） |
| 取り消す・やり直す | Ctrl+Z・Ctrl+Shift+Z（Ctrl+Y） |
| 再生・停止 | Space |
| シートを閉じる | Esc |

## 開発（Mac / Windows 共通）

Node.js 22 以上が必要です。

```sh
git clone https://github.com/iiiitiiitiiti/formation.git
cd formation
npm ci
npm run dev          # http://localhost:5173/formation/
```

| コマンド | 内容 |
|---|---|
| `npm run lint` | 型検査 |
| `npm test` | 単体テスト（vitest） |
| `npm run build` | 公開用のビルド（dist） |

main へ push すると GitHub Actions が型検査・テスト・ビルドを通して GitHub Pages へ公開します。

設計は [docs/DESIGN.md](docs/DESIGN.md)、見た目の見本は [docs/mockups.html](docs/mockups.html)（C 案を採用）。
