// Footer — editorial closing. Discord activity noted; no external SNS links.
import { observedISO, observedStamp } from '../realtime'

// C4: the visit is stamped once, at module evaluation — i.e. the moment the
// reader arrived. Baking it into the markup here (rather than writing it into
// the DOM after paint) is what keeps the colophon free of layout shift: the
// value is present in the very first paint, at its final width.
const VISIT = new Date()

export const footerHTML = /* html */ `
  <div class="u-container">
    <h2 class="footer__big" data-animate="reveal">
      ここまで読んでくれて<br />ありがとうございます。
    </h2>
    <p class="footer__note" data-animate="reveal">
      Discord でも<span class="nb">同じ名前で活動しています。</span>委員会や制作物の話、いつでも<span class="nb">気軽に声をかけてください。</span>
    </p>
    <div class="footer__meta">
      <span class="nb">Hasegawa Akitoshi / Aki_Ha</span>
      <span>&copy; 2026 Google AI Student Community &nbsp;/&nbsp; Discord Committee</span>
    </div>

    <!-- C2: the companion's send-off. It bows in the corner as this comes into
         view (see src/anim/companion.ts) and then steps aside, so the line is
         also here in plain text for anyone who never sees the motion. -->
    <p class="footer__sendoff" data-animate="reveal">
      <span class="footer__sendoff-who">あきは</span>
      <span class="footer__sendoff-line">また遊びに来てね</span>
    </p>

    <dl class="colophon" data-animate="reveal">
      <div>
        <dt>発行</dt>
        <dd>Aki_Ha</dd>
      </div>
      <div>
        <dt>組版</dt>
        <dd><span class="nb">Zen Kaku Gothic New</span> / <span class="nb">Outfit</span></dd>
      </div>
      <div>
        <dt>発行年</dt>
        <dd>2026</dd>
      </div>
      <!-- C4 現実同期: the sheet records when it was read. It states a fact and
           makes no claim beyond it — nothing here is "only available today". -->
      <div>
        <dt>観測日</dt>
        <dd>
          <time class="nb" datetime="${observedISO(VISIT)}">${observedStamp(VISIT)}</time>
        </dd>
      </div>
    </dl>
  </div>
  <img class="footer__deco" data-parallax="0.08" src="/assets/aki_ha_deco_lemon.png" alt="" width="132" height="132" loading="lazy" />
`
