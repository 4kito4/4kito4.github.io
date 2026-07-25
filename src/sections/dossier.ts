// =============================================================================
// WORKS DOSSIERS — the explanatory spreads behind three of the work cards.
//
// Source of truth: docs/WORKS_FACTS.md. Every number, port, model name and
// status line below is copied from that file. NOTHING is invented, nothing is
// rounded "up to feel better", and no capability the fact sheet does not claim
// is illustrated. Where the project is not finished, the copy says so.
//
// Why a panel and not more card: the works section is a pinned horizontal pan,
// and the cards are read at a glance while the track moves. Putting the
// pipeline diagrams inline would either shred the pan's rhythm or shrink the
// figures to decoration. A sheet laid on top keeps the scan intact and gives the
// diagrams a full reading column. See src/anim/dossier.ts for the panel itself.
//
// FIGURES. All four are inline SVG built from the design tokens (--paper /
// --ink / --maple / --line-strong), so light and dark mode are automatic and
// nothing is fetched. They are schematics, not screenshots: no fake UI, no
// invented telemetry. Each carries <title> + <desc> so a screen reader gets the
// same structure the drawing shows, and the figcaption states the takeaway in
// plain language.
// =============================================================================

export interface Dossier {
  /** Latin kicker, matches the card's own .work__en. */
  eyebrow: string
  title: string
  html: string
}

// -----------------------------------------------------------------------------
// SVG primitives. Shared so the three flow diagrams read as one drawing system:
// same corner radius, same stroke weight, same arrow head, same type scale.
// Type is 15px in viewBox units against viewBox widths of 320-360, so at the
// panel's narrowest rendered width (~280px, enforced by min-width in CSS) the
// smallest label still lands above 12px.
// -----------------------------------------------------------------------------
const STROKE = 'stroke="var(--line-strong)" stroke-width="1.5" fill="none"'

/** A downward arrow from `y0` (a box's bottom edge) to `y1` (the next box's top). */
function arrowDown(x: number, y0: number, y1: number): string {
  return `<path d="M${x} ${y0 + 3}V${y1 - 9}" ${STROKE} stroke-linecap="round" />
    <path d="M${x - 5} ${y1 - 9}h10L${x} ${y1 - 1}Z" fill="var(--line-strong)" />`
}

interface BoxOpts {
  x: number
  y: number
  w: number
  h: number
  lines: string[]
  /** Compute steps (the model does the work here) take the maple outline. */
  accent?: boolean
  size?: number
}

function box({ x, y, w, h, lines, accent = false, size = 15 }: BoxOpts): string {
  const cx = x + w / 2
  const lh = size + 5
  const first = y + h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.36
  const text = lines
    .map(
      (t, i) =>
        `<text x="${cx}" y="${first + i * lh}" text-anchor="middle" font-size="${size}" font-weight="700" fill="var(--ink)">${t}</text>`,
    )
    .join('')
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"
      fill="var(--paper${accent ? '-2' : ''})"
      stroke="var(${accent ? '--maple' : '--line-strong'})" stroke-width="1.5" />${text}`
}

// -----------------------------------------------------------------------------
// FIGURE A — the NPU pipeline. Vertical on purpose: it reads at any panel width
// without a horizontal scroll, and the dashed frame around the WHOLE chain is
// the point of the drawing ("ここまで全部ローカル" covers every step, not some).
// -----------------------------------------------------------------------------
const FIG_A = /* html */ `
<svg viewBox="0 0 320 440" role="img" aria-labelledby="figA-t figA-d">
  <title id="figA-t">ローカル完結のパイプライン</title>
  <desc id="figA-d">マイク音声を Qwen3-ASR（NPU）が文字起こしし、そのテキストを Lemonade のローカル LLM が受け取って応答を返します。この5段すべてが端末の中で動きます。</desc>
  <text x="16" y="17" font-size="13" font-weight="700" fill="var(--maple-ink)">ここまで全部ローカル</text>
  <rect x="10" y="28" width="300" height="396" rx="14"
    stroke="var(--maple)" stroke-width="1.5" stroke-dasharray="5 5" fill="none" opacity="0.55" />
  ${box({ x: 44, y: 46, w: 232, h: 44, lines: ['マイク音声'] })}
  ${arrowDown(160, 90, 118)}
  ${box({ x: 44, y: 118, w: 232, h: 58, lines: ['Qwen3-ASR', '（NPU）'], accent: true })}
  ${arrowDown(160, 176, 204)}
  ${box({ x: 44, y: 204, w: 232, h: 44, lines: ['テキスト'] })}
  ${arrowDown(160, 248, 276)}
  ${box({ x: 44, y: 276, w: 232, h: 58, lines: ['Lemonade', 'ローカル LLM'], accent: true })}
  ${arrowDown(160, 334, 362)}
  ${box({ x: 44, y: 362, w: 232, h: 44, lines: ['応答'] })}
</svg>`

// -----------------------------------------------------------------------------
// FIGURE B — the measured result. Two bars, no background track: this is a
// comparison of two real durations, not a progress meter, and a filled track
// behind them would invent a "maximum" that does not exist. Bar 2 is drawn at
// exactly 3.2/10 of bar 1.
// -----------------------------------------------------------------------------
const FIG_B = /* html */ `
<svg viewBox="0 0 336 136" role="img" aria-labelledby="figB-t figB-d">
  <title id="figB-t">音声の長さと処理時間の比較</title>
  <desc id="figB-d">10秒の音声に対し、文字起こしにかかった時間は約3.2秒。リアルタイム係数は約0.32です。</desc>
  <text x="0" y="14" font-size="13" font-weight="600" fill="var(--ink-mute)">音声の長さ</text>
  <text x="336" y="14" text-anchor="end" font-size="15" font-weight="700" fill="var(--ink)">10秒</text>
  <rect x="0" y="24" width="336" height="18" rx="4" fill="var(--ink-soft)" />
  <text x="0" y="72" font-size="13" font-weight="600" fill="var(--ink-mute)">処理時間</text>
  <text x="336" y="72" text-anchor="end" font-size="15" font-weight="700" fill="var(--maple-ink)">約3.2秒</text>
  <rect x="0" y="82" width="107.5" height="18" rx="4" fill="var(--maple)" />
  <text x="0" y="126" font-size="13" font-weight="600" fill="var(--ink-mute)">リアルタイム係数 約0.32</text>
</svg>`

// -----------------------------------------------------------------------------
// FIGURE C — the stealth flow. The two chat-channel steps sit at full width
// because they are what the community actually sees; the three Bot steps are
// indented inside the dashed frame because none of them are visible from the
// posts. The drawing is the design intent.
// -----------------------------------------------------------------------------
const FIG_C = /* html */ `
<svg viewBox="0 0 320 416" role="img" aria-labelledby="figC-t figC-d">
  <title id="figC-t">お題が投下されるまでの流れ</title>
  <desc id="figC-d">自己紹介チャンネルの投稿から Gemini API で興味を読み取り、お題を生成し、雑談チャンネルが静かになるまで待ってから投下します。読み取りから待機までの3段は投稿からは見えません。</desc>
  ${box({ x: 44, y: 20, w: 232, h: 44, lines: ['#自己紹介 の投稿'] })}
  <rect x="28" y="86" width="264" height="252" rx="12"
    stroke="var(--maple)" stroke-width="1.5" stroke-dasharray="5 5" fill="none" opacity="0.55" />
  <text x="44" y="108" font-size="13" font-weight="700" fill="var(--maple-ink)">本人には見えない裏側</text>
  ${arrowDown(160, 64, 120)}
  ${box({ x: 56, y: 120, w: 208, h: 58, lines: ['Gemini API で', '興味を読み取る'], accent: true })}
  ${arrowDown(160, 178, 202)}
  ${box({ x: 56, y: 202, w: 208, h: 44, lines: ['お題を生成'], accent: true })}
  ${arrowDown(160, 246, 268)}
  ${box({ x: 56, y: 268, w: 208, h: 44, lines: ['静けさを検知して待機'], accent: true, size: 14 })}
  ${arrowDown(160, 312, 352)}
  ${box({ x: 44, y: 352, w: 232, h: 44, lines: ['#雑談 へ投下'] })}
</svg>`

// -----------------------------------------------------------------------------
// FIGURE D — the two stores and what they each answer. The Neo4j side carries
// the real prerequisite chain from the fact sheet as a miniature graph, so the
// reason there are two databases is visible rather than asserted.
// -----------------------------------------------------------------------------
const FIG_D = /* html */ `
<svg viewBox="0 0 360 316" role="img" aria-labelledby="figD-t figD-d">
  <title id="figD-t">シラバス検索と前提グラフの二層構造</title>
  <desc id="figD-d">PostgreSQL がシラバスのあいまい検索を、Neo4j が前提講義のグラフ（基礎数学から解析力学、量子化学へ）を受け持ち、両方の結果をひとつの検索結果にまとめて返します。</desc>

  <rect x="0" y="20" width="166" height="178" rx="12" fill="var(--paper-2)" stroke="var(--line-strong)" stroke-width="1.5" />
  <text x="16" y="44" font-size="13" font-weight="700" fill="var(--maple-ink)">PostgreSQL</text>
  <path d="M16 64h134M16 84h134M16 104h100" ${STROKE} stroke-linecap="round" opacity="0.5" />
  <text x="16" y="146" font-size="14" font-weight="700" fill="var(--ink)">シラバス表</text>
  <text x="16" y="172" font-size="14" font-weight="700" fill="var(--ink)">あいまい検索</text>

  <rect x="194" y="20" width="166" height="178" rx="12" fill="var(--paper-2)" stroke="var(--line-strong)" stroke-width="1.5" />
  <text x="210" y="44" font-size="13" font-weight="700" fill="var(--maple-ink)">Neo4j</text>
  ${box({ x: 210, y: 62, w: 134, h: 30, lines: ['基礎数学'], size: 14 })}
  ${arrowDown(277, 92, 112)}
  ${box({ x: 210, y: 112, w: 134, h: 30, lines: ['解析力学'], size: 14 })}
  ${arrowDown(277, 142, 162)}
  ${box({ x: 210, y: 162, w: 134, h: 30, lines: ['量子化学'], size: 14 })}

  <path d="M83 198v26h194v-26" ${STROKE} stroke-linecap="round" />
  <path d="M180 224v20" ${STROKE} stroke-linecap="round" />
  <path d="M175 244h10l-5 8Z" fill="var(--line-strong)" />
  ${box({ x: 60, y: 258, w: 240, h: 48, lines: ['ひとつの検索結果にまとめる'], accent: true, size: 14 })}
</svg>`

// -----------------------------------------------------------------------------
// CONTENT. Keyed by the `data-dossier` value on the card's 詳しく button.
// -----------------------------------------------------------------------------
export const DOSSIERS: Record<string, Dossier> = {
  npu: {
    eyebrow: 'On-device AI',
    title: 'NPUローカルAI環境',
    html: /* html */ `
      <p class="dossier__lead">
        AI PC の NPU の上で動く、ローカルAIと音声認識の環境です。NPU は CPU や GPU とは別の、推論専用のチップ。音声をクラウドに送らず、手元の端末だけで文字起こしから応答まで完結します。
      </p>

      <figure class="dossier__fig">
        ${FIG_A}
        <figcaption class="dossier__cap">マイクの音声から応答まで、この一連が端末の中だけで動きます。</figcaption>
      </figure>

      <h3 class="dossier__h">実測</h3>
      <figure class="dossier__fig dossier__fig--wide">
        ${FIG_B}
        <figcaption class="dossier__cap">10秒の音声を約3.2秒で文字起こしできました。2026年7月22日の高速化チューニング後の値です。</figcaption>
      </figure>

      <h3 class="dossier__h">構成</h3>
      <dl class="dossier__dl">
        <div>
          <dt>実行基盤</dt>
          <dd>Lemonade Server（ローカルLLM実行基盤 / port 13305）</dd>
        </div>
        <div>
          <dt>音声認識</dt>
          <dd>Qwen3-ASR（port 8081）</dd>
        </div>
      </dl>

      <h3 class="dossier__h">この構成にしている理由</h3>
      <ul class="dossier__list">
        <li>音声が端末の外に出ないので、プライバシーを気にせず使えます</li>
        <li>ネットワークが無い場所でもそのまま動きます</li>
        <li>NPU での推論なので消費電力を抑えられます</li>
      </ul>
    `,
  },

  bot: {
    eyebrow: 'Discord Bot',
    title: 'intro-topic-bot',
    html: /* html */ `
      <p class="dossier__lead">
        表向きは「定期的にお題を投下する <span class="nb">Bot」です。</span>実際には <span class="nb">#自己紹介</span> チャンネルの投稿から専攻や興味を Gemini API で読み取り、雑談チャンネルが静かなタイミングに、その人が話しやすいお題をそっと投下します。
      </p>

      <figure class="dossier__fig">
        ${FIG_C}
        <figcaption class="dossier__cap">自己紹介を読んでいる部分は、投下されたお題からは分からないようにしています。</figcaption>
      </figure>

      <h3 class="dossier__h">設計思想</h3>
      <p class="dossier__p">
        ステルスであることが要件です。自己紹介を見ていると分かってしまうと、それだけで書きにくくなってしまう。「見てるよ」という感じを出さないことを、機能より優先しています。
      </p>
      <p class="dossier__example">
        哲学専攻の自己紹介から、雑談チャンネルへ<br />
        「記憶をすべて失っても、その人は同じ人だと思いますか？」
      </p>

      <h3 class="dossier__h">実装</h3>
      <dl class="dossier__dl">
        <div>
          <dt>言語</dt>
          <dd>Python（uv で管理）</dd>
        </div>
        <div>
          <dt>Bot 権限</dt>
          <dd>View Channels / Send Messages / Read Message History の3つだけ</dd>
        </div>
        <div>
          <dt>モデル</dt>
          <dd>gemini-3-flash の無料枠</dd>
        </div>
      </dl>

      <p class="dossier__p">
        Discord特別委員会でのサーバー運営と地続きの制作物です。運営で困っていたことを、そのまま Bot にしました。
      </p>
    `,
  },

  course: {
    eyebrow: 'Course Navigator',
    title: '履修AI「course-navigator」',
    html: /* html */ `
      <p class="dossier__lead">
        大学の履修選択を支援するAIです。科目のつながり（前提関係や共通トピック）をグラフで持たせ、なんとなくではなく納得して科目を選べるようにすることを狙っています。
      </p>

      <h3 class="dossier__h">体制</h3>
      <p class="dossier__p">
        Google AI Tech Hub 発の、3名での共同開発です。私は <span class="nb">UI／フロントエンドを</span>担当しています。メンバー全員が多忙なため、いまは本格始動の前のフェーズです。
      </p>

      <figure class="dossier__fig">
        ${FIG_D}
        <figcaption class="dossier__cap">シラバスのあいまい検索は PostgreSQL、前提関係のたどりは Neo4j。両方の結果をひとつにまとめて返します。</figcaption>
      </figure>

      <h3 class="dossier__h">動いているもの</h3>
      <p class="dossier__p">ここまでは疎通テストとして実装済みです。</p>
      <ul class="dossier__list">
        <li>シラバスを登録して、あいまい検索でたどりつく</li>
        <li>前提履修のロードマップを矢印でつないで表示する</li>
        <li>共通トピックから関連する講義をサジェストする</li>
        <li>未登録の前提講義はプレースホルダーを自動で同期する</li>
      </ul>

      <h3 class="dossier__h">技術</h3>
      <dl class="dossier__dl">
        <div>
          <dt>バックエンド</dt>
          <dd>FastAPI（Python）</dd>
        </div>
        <div>
          <dt>フロントエンド</dt>
          <dd>React 19 + Vite + TypeScript</dd>
        </div>
        <div>
          <dt>データ</dt>
          <dd>PostgreSQL（シラバス・あいまい検索）+ Neo4j（前提講義グラフ、GraphRAG 構想）</dd>
        </div>
        <div>
          <dt>基盤</dt>
          <dd>Traefik / Docker Compose</dd>
        </div>
      </dl>

      <a class="dossier__link" href="https://github.com/cyanosome/course-navigator" target="_blank" rel="noopener noreferrer">
        GitHub で公開しています
        <span class="dossier__link-host">github.com/cyanosome/course-navigator</span>
      </a>
    `,
  },
}
