# フォーメーション帳 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホの指で場面ごとの立ち位置を置き、カウントで再生し、場面ごとに1ページの PDF を配れる Web アプリを GitHub Pages に公開する。

**Architecture:** 作品データは純粋関数だけで変える（src/model）。ステージの図は「図形の一覧」を1か所で計算し（src/render/stageShapes.ts）、画面は SVG、書き出しは Canvas で同じ一覧を描く。UI は React。保存は localStorage、持ち運びは JSON ファイル。

**Tech Stack:** Vite 8・React 19・TypeScript・vitest 4（jsdom）・vite-plugin-pwa・@fontsource-variable/noto-sans-jp・jspdf 4.2.1。版は ~/dev/hitotsume の package.json にそろえる。

**Spec:** docs/DESIGN.md（見た目の見本は docs/mockups.html の C 案）

## Global Constraints

- 画面の文言は使う人の言葉で書く。保存先・API・形式の名前を画面に出さない（グローバル規律14）
- 書体は Noto Sans JP。白が既定。ライト／ダークは手動で切り替えて保存し、端末の設定には追従しない
- アニメーションは prefers-reduced-motion で止めない
- Tab で画面の並び順に回る。シートを開いている間はシートの中だけを回り、閉じたら開く前の場所へ戻る。Esc で閉じる
- PC のコンテンツ幅は最大 1200px。スマホの下部固定ボタンは画面の角丸にかからない（safe-area-inset-bottom を足す）
- 色の面は黒い文字が読めるライトトーン。文字色はページ全体で1色
- base は `/formation/`。CSP は hitotsume と同じ形（外部への接続なし）
- localStorage のキーは `formation:` で始める

## Review Focus

1. 人が0人・場面が1つ・移動カウント0 → 再生しても落ちない。移動0は瞬時に切り替わる（Task 3 にテスト）
2. ステージを小さくして人が袖より外に出る → 設定を変えたときに袖の内側へ寄せる。取り消しで戻る（Task 2 にテスト）
3. 保存が壊れている・別のファイルを読み込んだ → 作品を消さずに「読めませんでした」と出す。壊れた保存は退避キーへ移す（Task 4 にテスト）
4. 長い名前・同じ名前 → 名前は6文字まで。丸の中は3文字を超えると文字を縮める。同じ名前でも id で区別する（Task 2・Task 5 にテスト）
5. テンポの極端な値 → 40〜240 に収める。カウントは整数 0〜64（Task 2 にテスト）

---

## ファイルの分担

| ファイル | 役目 |
|---|---|
| src/model/types.ts | Work・Member・Scene・Position・Stage の型、FORMAT_VERSION = 1、上限値 |
| src/model/work.ts | 作品を変える純粋関数（人・場面・立ち位置・設定） |
| src/model/grid.ts | 区切り線と番号、マスへの吸い付き、袖の範囲 |
| src/model/timeline.ts | カウント→場面・位置、カウント表示 |
| src/model/storage.ts | 作品一覧の保存・読み込み、ファイルの書き出し・読み込み、テーマ |
| src/render/stageShapes.ts | ステージの図形一覧を計算 |
| src/render/drawCanvas.ts | 図形一覧を Canvas に描く |
| src/export/pdf.ts・share.ts | PDF と画像を作る、共有かダウンロード |
| src/ui/*.tsx | 画面（一覧・編集・ステージ・再生バー・場面の帯・シート・設定・書き出し） |
| src/ui/useHistory.ts・usePlayback.ts | 取り消しの積み上げ、再生の時計 |

---

### Task 1: 骨組みと公開の仕組み

**Files:**
- Create: package.json・tsconfig*.json・vite.config.ts・index.html・public/theme.js・public/icon.svg・.github/workflows/deploy.yml・.gitignore・src/main.tsx・src/pwa.ts・src/styles.css・src/ui/App.tsx（仮の1画面）・README.md

- [ ] hitotsume から設定を写し、名前・base・説明文・テーマのキー（`formation:theme`）・テーマ色を差し替える。依存に jspdf を足す
- [ ] `npm install` → `npm run lint && npm test -- --passWithNoTests && npm run build` が通る
- [ ] Commit `chore: 骨組みを作る`

### Task 2: 作品の型と変える関数

**Files:** Create src/model/types.ts・src/model/work.ts・tests/work.test.ts

**Interfaces（Produces）:**
```ts
type Stage = { width: number; depth: number; sideDivisions: number; depthDivisions: number }; // m・本
type Member = { id: string; name: string; color: string };
type Scene = { id: string; memo: string; moveCounts: number; holdCounts: number };
type Position = { x: number; y: number }; // m。x はセンター0、y は客席側の端0
type Work = { version: 1; id: string; title: string; stage: Stage; countsPerPhrase: 8 | 4; tempo: number;
  members: Member[]; scenes: Scene[]; positions: Record<string /*sceneId*/, Record<string /*memberId*/, Position>>;
  updatedAt: number; exportedAt: number | null };
createWork(title: string): Work            // 8m×5m・片側4・奥行き5・8カウント・テンポ96・場面1つ・人0
addMember(w, name?): Work                  // 全場面に下手の袖（x 負側）の位置を作る。色は 8色の見本から順に
updateMember(w, id, patch: Partial<Omit<Member,'id'>>): Work
removeMember(w, id): Work                  // 全場面から立ち位置を消す
addSceneAfter(w, sceneId): { work: Work; sceneId: string } // 立ち位置を写す
updateScene(w, id, patch): Work /*最初の場面の moveCounts は常に0*/; removeScene(w, id): Work /*最後の1つは消さない*/; moveScene(w, id, dir: -1|1): Work
duplicateScene(w, id): { work: Work; sceneId: string }
setPosition(w, sceneId, memberId, p: Position): Work
updateStage(w, patch: Partial<Stage>): Work // 全立ち位置を袖の内側へ寄せる
setTempo(w, bpm): Work; setCountsPerPhrase(w, n): Work
```
定数: MAX_MEMBERS = 40・NAME_MAX = 6・TEMPO_MIN/MAX = 40/240・COUNT_MAX = 64・WING = 1.5・PALETTE（mockups の8色）。

- [ ] テスト: 人を足すと全場面に位置ができる／消すと全場面から消える／場面を足すと写される／場面を消すと位置も消える／最後の場面は消えない／名前は6文字で切られる／テンポは 40〜240、カウントは 0〜64 の整数に丸まる／ステージを 4m に縮めると x=5 の人が 3.5（=2+1.5）へ寄る／41人目は足されない
- [ ] 失敗を確かめる → 実装 → `npm test` 通過 → Commit

### Task 3: 区切りと時間

**Files:** Create src/model/grid.ts・src/model/timeline.ts・tests/grid.test.ts・tests/timeline.test.ts

**Interfaces:**
```ts
gridLines(stage): { verticals: { x: number; label: number; center: boolean }[]; horizontals: number[] }
snap(p: Position, stage, on: boolean): Position  // 刻みは 線の間隔の半分（x は width/2/sideDivisions/2、y は depth/depthDivisions/2）
bounds(stage): { minX; maxX; minY; maxY }        // 袖を含む
sceneSpans(w): { sceneId; start; holdStart; end }[] // カウント単位
totalCounts(w): number
positionsAt(w, t: number): Record<memberId, Position> // 移動中は直線で等速
sceneIndexAt(w, t): number
countLabel(t, countsPerPhrase): { phrase: number; beat: number } // t=0 → 1つ目の1
```
- [ ] テスト: 片側4・間口8 で縦線9本・ラベル 4..0..4・中央だけ center／吸い付き 0.24→0・0.26→0.5（間隔1m の半分刻み）／場面2つ（移動4・止まり4）で t=6 は中間（直線の半分）／移動0の場面は即座に切り替わる／人0人でも positionsAt が空を返す／countLabel(8, 8) = 2つ目の1
- [ ] 失敗 → 実装 → 通過 → Commit

### Task 4: 保存とファイル

**Files:** Create src/model/storage.ts・tests/storage.test.ts

**Interfaces:**
```ts
const KEY = "formation:works:v1"; const BACKUP_KEY = "formation:unreadable-backup"; const THEME_KEY = "formation:theme";
loadWorks(): { works: Work[]; recovered: boolean } // 壊れていたら BACKUP_KEY へ写して空で返す
saveWorks(works: Work[]): boolean                   // 失敗（容量）なら false
parseWork(v: unknown): Work | null                  // 型を確かめ、位置の欠けを埋める
exportWorkFile(w): { name: string; text: string }   // 名前は「題名.formation.json」
importWorkFile(text, existing: Work[]): Work | null // 新しい id・題名に「（読み込み）」・exportedAt は null
markExported(w): Work
loadTheme(): "light" | "dark"; saveTheme(t)
```
- [ ] テスト: 保存→読み込みで同じ／壊れた JSON は退避して空／別形式の JSON は null／読み込みは新しい id で足し既存を上書きしない／位置の欠けた場面は袖の位置で埋まる
- [ ] 失敗 → 実装 → 通過 → Commit

### Task 5: ステージの図形と描き方

**Files:** Create src/render/stageShapes.ts・src/render/drawCanvas.ts・src/ui/StageSvg.tsx・tests/stageShapes.test.ts

**Interfaces:**
```ts
type Shape = { kind: "rect"; x; y; w; h; fill; r? } | { kind: "line"; x1; y1; x2; y2; stroke; width; dash?: number[] }
  | { kind: "text"; x; y; text; size; weight; fill; anchor: "start"|"middle"|"end" }
  | { kind: "circle"; x; y; r; fill; stroke?; strokeWidth?; dash?: number[] }
  | { kind: "arrow"; x1; y1; x2; y2; stroke; width };
type StageView = { minX; minY; width; height }; // 画面座標（m、y は下向き）
buildStageShapes(w, args: { positions; previous?: Record<string, Position>; selectedId?: string; showPaths: boolean;
  palette: StagePalette; labels: boolean }): { view: StageView; shapes: Shape[]; people: { id; cx; cy; r }[] }
drawShapes(ctx: CanvasRenderingContext2D, shapes: Shape[], view, pxPerM: number, offset?: {x;y}): void
```
見た目は mockups.html の C 案。上手は客席から見て右（x 正・画面の右）、下手は左。テストに入れる（センター線と番号タグを濃く、番号は角丸の札、上手・下手・客席の文字）。ライト／ダークの StagePalette を2つ用意し、書き出しは常にライト。

- [ ] テスト: 線と番号の数が gridLines と合う／previous があると動いた人だけ矢印が出る（0.3m 未満は出さない）／名前が4文字以上なら文字の大きさが縮む／people の座標が客席を下にした向きになっている
- [ ] StageSvg は shapes を SVG 要素に置き換えるだけの部品にする
- [ ] 通過 → Commit

### Task 6: 編集画面

**Files:** Create src/ui/Editor.tsx・StageEditor.tsx・PlayBar.tsx・SceneBands.tsx・MemberSheet.tsx・SceneSheet.tsx・Sheet.tsx・useHistory.ts・usePlayback.ts、Modify src/ui/App.tsx・src/styles.css

**Interfaces:**
```ts
useHistory(initial: Work): { work; set(next: Work): void; undo(); redo(); canUndo; canRedo } // 作品全体の写しを最大100件
usePlayback(w): { t: number; playing: boolean; play(); pause(); seek(t: number) } // requestAnimationFrame。末尾で止まる
```
- ステージ: タップで選ぶ → 選んだ人だけをドラッグ（Pointer Events・setPointerCapture・touch-action:none）。ドラッグ中は指の 70px 上に半径 48px の拡大表示。離したら snap。2本指で拡大（1〜3倍）と移動。何も無い所のタップで選択解除
- 2本目の指が触れたらドラッグを捨てて元の位置へ戻し、拡大へ移る。履歴に積むのは1本指で動かして離したときだけ
- 人を足すボタン・吸い付きの切替・動線の切替を置く
- キーボード: 人は button 相当（tabIndex=0・aria-label「さき 場面3」）。矢印で刻み1つ、Shift+矢印で刻み4つ動く
- 再生中や場面の途中で止めた状態でステージに触れたら、その時刻を含む場面の止まりの始まりへ seek してから編集する
- 再生バー: 再生／一時停止・場面の頭へ・「3つ目の8 / 5」・つまみで seek・テンポ表示
- 場面の帯: C 案の色の帯（番号・名前・目盛り・カウント）。選んでいる帯をもう一度押すと SceneSheet。末尾に「場面を足す」
- シート: 下から出す。開いている間はフォーカスをシート内に閉じ込め、閉じたら開く前の場所へ戻す。Esc で閉じる
- 横向き（幅 > 高さ かつ 高さ < 600px）: ステージを左、帯と操作を右に並べる
- 上部: 戻る・題名・取り消し・やり直し・メニュー（ステージの設定・書き出し・テーマ）
- [ ] 内蔵ブラウザ 375×812 で、人を3人足す → 動かす → 場面を足す → 動かす → 再生して動くことを目で確かめる
- [ ] Tab で一巡し、シートの閉じ込めと戻り先を確かめる
- [ ] Commit

### Task 7: 作品一覧・ステージの設定・テーマ・保存の案内

**Files:** Create src/ui/WorkList.tsx・StageSettings.tsx・InstallHint.tsx・useWorks.ts

- 一覧: 作品カード（題名・人数・場面数・更新日・「最後に書き出した日」）。新しく作る・開く・複製・消す（8秒「元に戻す」トースト）・ファイルを読み込む
- 書き出していない作品の更新が7日以上前なら、カードに「ファイルに書き出しておくと安心です」
- InstallHint: iPhone の Safari でホーム画面から開いていないとき（navigator.standalone が false）だけ、一覧の上に1回出す。閉じたら `formation:install-hint-closed` に覚える
- 起動時に navigator.storage?.persist?.() を呼ぶ
- 設定: 間口・奥行き（1〜30m、0.5刻み）・片側の区切り（1〜10）・奥行きの区切り（1〜10）・カウントの区切り（8/4）・テンポ
- 作品の変更は 300ms まとめて保存し、pagehide では即座に保存する。保存に失敗したらトースト「保存できませんでした。ファイルに書き出してください」
- [ ] 内蔵ブラウザで作る → 再読み込みで残る → 書き出し → 読み込みで「（読み込み）」が足される を確かめる → Commit

### Task 8: PDF と画像

**Files:** Create src/export/pdf.ts・src/export/share.ts・src/ui/ExportSheet.tsx

**Interfaces:**
```ts
renderScenePage(w, sceneIndex, opts: { pxWidth: number }): Promise<HTMLCanvasElement> // A4 横の比率。題名・場面番号・カウント範囲・メモ・ステージ（前の場面からの矢印）・人の一覧
makeScenesPdf(w): Promise<Blob>   // 各ページ JPEG（品質0.9・2倍）。document.fonts.load(font, 描く文字すべて) を待つ（第2引数を省くと日本語の分割ファイルが読まれない）
makeSceneImage(w, i): Promise<Blob> // PNG
deliver(file: File): Promise<"shared" | "downloaded" | "cancelled">
```
- 書き出しシートに「この場面を画像で保存」と「ファイルに書き出す」も置く
- 書き出しシート: 「PDF を作る」→ 作っている間は進み具合 → できたら「送る」ボタン（ここで navigator.share。canShare({files}) が偽ならダウンロード）
- [ ] 内蔵ブラウザで3場面の作品から PDF を作り、ページ数と1ページ目の見た目をダウンロードした PDF で確かめる → Commit

### Task 9: 仕上げと公開

- [ ] README（使い方・iPhone はホーム画面に追加・開発コマンド）と docs/DESIGN.md の更新
- [ ] `npm run lint && npm test && npm run build`
- [ ] 内蔵ブラウザ 375×812 と 1280×800 と横向き 812×375 で通しの操作。Tab 一巡
- [ ] `gh repo create iiiitiiitiiti/formation --public`・push・Pages を Actions に設定・公開 URL を開いて表示を確かめる
- [ ] メインへ名前・URL・リポを知らせる

## プランレビュー

- レビュアー: fable-advisor（2026-11-06）
- 主な指摘と反映: フォント待ちに描く文字を渡す／吸い付きテストの期待値（0.5 刻み）／縮小テストが寄せを起こさない値だった／上手と下手が見本で左右逆（見本とテストを直した）／人を足す・吸い付き・動線の切替・画像保存・ファイル書き出しの置き場／2本目の指でドラッグを捨てる／pagehide で即保存／最初の場面の移動0を強制／「場面の頭へ」
- 見送り: なし
