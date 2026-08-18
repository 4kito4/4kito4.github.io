# 4kito4.github.io

## 概要
自己紹介ポートフォリオサイト「**あきはと旅するポートフォリオ**」。
マスコット（あきは）が画面に常駐する相棒コンセプトの1ページ構成サイト。
エントリポイントは `index.html` + `src/main.ts`。ライブ: https://4kito4.github.io/

## 位置づけ・目的
Google AI 学生コミュニティ Discord特別委員会メンバーとしての自己紹介サイト。
主要訪問者は Discord から来る仲間なので、温かく遊び心のある見た目を保ちつつ、
制作物（化学工学 × AI）の中身は真面目に読ませる。

**仕様の正本は次の2ファイル。AGENTS.md に内容を複製しないこと:**
- `docs/CONCEPT.md` — コンセプト仕様。常駐相棒の行動表（C1）、章別演出（C2）、音（C3）、時刻同期（C4）、
  **やらないことリスト**。すべてのギミックは「相棒が生きている」ことに奉仕する、が判断基準
- `docs/WORKS_FACTS.md` — 制作物ファクトシート。**ここに無い数値・機能を創作しない**

進捗: P5 完了（フォントサブセット化、デスクトップ Lighthouse 100）。
残りは **P6 = 委員長への URL 提出のみ（ユーザーの手作業。コード変更ではない）**。
以降は保守フェーズなので、機能追加より既存の回帰を壊さないことを優先する。

関連リポ: `C:\Users\haseg\Projects\discord-special-committee`（自己紹介ページ v1 の置き場。現在は保守のみ）

## 技術スタック・前提環境
- Vite 8 + TypeScript 6 + Tailwind CSS v4（`@tailwindcss/vite`）
- アニメーション: GSAP 3（ScrollTrigger / SplitText / Draggable）+ Lenis（スムーススクロール）
- 日本語改行制御: BudouX / フォント: Zen Kaku Gothic New + Outfit（`scripts/subset-fonts.mjs` でサブセット化）
- 画像最適化: sharp（`scripts/optimize-images.mjs`）
- Node 20（CI と同じ）/ 開発環境は Windows 11 / PowerShell 7
- デプロイ: `main` への push で GitHub Actions（`.github/workflows/deploy.yml`）が `npm run build` → Pages へ公開

## よく使うコマンド

| 用途 | コマンド |
|---|---|
| 依存インストール | `npm ci` |
| 開発サーバ | `npm run dev` |
| 本番ビルド（型チェック込み） | `npm run build` |
| ビルド結果の確認 | `npm run preview` |
| フォントサブセット再生成 | `npm run fonts` |
| フォントサブセットの検証 | `npm run check:fonts` |
| 画像最適化 | `npm run optimize:images` |

`npm run build` は `prebuild` で `subset-fonts.mjs` が走る。フォント関連を触ったら本番ビルドまで通すこと。

## 規約
- 新しいギミックを足す前に `docs/CONCEPT.md` の「やらないこと」を確認する。相棒に奉仕しない演出は追加しない
- `prefers-reduced-motion` を必ず尊重する（相棒は静止、スクラブ・音はすべて無効）
- 音は既定 OFF。ユーザー操作（user activation）を伴うイベント以外で AudioContext を起こさない
- テーマは訪問時刻駆動。`prefers-color-scheme` には戻さない。手動選択は localStorage 永続で最優先
- ファイル分割を守る: `src/sections/*` = 章ごとの実装、`src/anim/*` = 横断的な演出（相棒・音・シーケンス）、
  `src/text/*` = 文字組み。章をまたぐロジックを `sections/` に書かない
- 変更後は本番ビルド（`npm run build`）まで通す。ScrollTrigger のピン競合・ハンドオフは回帰しやすい
- ブランチは `main` 直行で可（push = 即公開なので、ビルドを通してから push する）
- 制作物の記述を変えるときは `docs/WORKS_FACTS.md` を先に更新し、そこから引く

### 検証時の既知ノイズ
プレビューペインは rAF 凍結 + 幅変動が起きるため、スクロール連動演出の動的検証は当てにならない。
「先頭で reveal 要素が hidden」は正常な未表示状態と区別できない。判定は実ブラウザで行うこと。

## 生成物の扱い
`.gitignore` 済みでコミットしないもの:
- `dist/` — `npm run build` の出力。Pages へは Actions が直接アップロードするのでコミット不要
- `node_modules/` / `*.log`

意図的に**未追跡のまま**置いているもの（.gitignore には入れていない）:
- `public/assets/seq/leaf/` — 不採用になった葉のシーケンス画像 120 枚。素材として温存しているだけでサイトからは参照していない
- `.claude/launch.json` — ローカルのプレビュー起動設定

コミットするもの: `public/fonts/*.woff2`（サブセット済みフォント。`npm run fonts` で再生成できるが追跡対象）と
`public/assets/seq/drop`・`turn`（本番で使うシーケンス画像）。
