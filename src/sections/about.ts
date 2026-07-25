// About — one magazine spread instead of two stacked blocks.
//
// Layout judgement (P4a): the old composition put the lead + chips in a wide left
// column and the turntable + attribute list in a short right column, then dropped
// the four persona cards underneath as a separate slab. The left column had
// nothing below the chips, so the spread read as a hole with a plate floating
// beside it.
//
// Now the section is a single two-column spread:
//   • reading column (left)  : lead -> chips -> the four persona entries, flowed
//                              two-up, so the column has real editorial weight;
//   • plate column (right)   : the turntable and the attribute list, made STICKY
//                              so the mascot stays alongside the whole read
//                              instead of scrolling away and leaving a void.
// The plate spans both rows of the grid, which is what lets it stick; on <1000px
// the grid collapses to lead -> plate -> persona in a single column.
export const aboutHTML = /* html */ `
  <div class="u-container">
    <div class="section__head">
      <h2 class="section-h" data-animate="split-h">自己紹介</h2>
    </div>

    <div class="about__grid">
      <div class="about__lead">
        <p class="lead" data-animate="reveal">
          はじめまして、長谷川耀俊（Aki_Ha）です。関西大学で化学工学を学びながら、生成AIを使った開発とコミュニティづくりに打ち込んでいます。「専攻の知識 × AI」で身の回りの課題を解くのが好きで、講義のスキマ時間もだいたい何かをつくっています。
        </p>
        <div class="about__chips" data-animate="reveal">
          <span class="chip chip--accent">関西大学</span>
          <span class="chip">環境都市工学部</span>
          <span class="chip">エネルギー環境・化学工学科</span>
          <span class="chip">学部3年</span>
          <span class="chip">大阪</span>
        </div>
      </div>

      <aside class="about__side" data-animate="reveal">
        <!-- Turntable: the "turn" sequence autoplays while About is on screen, so
             the mascot keeps rotating beside the read. Frame 0 poster shows
             statically until the motion layer preloads on approach (and under
             reduced motion the poster is all that ever renders). -->
        <figure class="about__turntable">
          <img
            class="about__turntable-poster"
            src="/assets/seq/turn/turn_000.webp"
            alt="Aki_Ha のマスコットが360度回転するターンテーブル"
            width="640"
            height="360"
            loading="lazy"
            decoding="async"
          />
          <canvas class="about__turntable-canvas" aria-hidden="true"></canvas>
          <figcaption class="about__turntable-cap">MASCOT / 360°</figcaption>
        </figure>

        <dl class="about__aside">
          <dt>UNIVERSITY</dt>
          <dd>関西大学 環境都市工学部</dd>
          <dt>MAJOR</dt>
          <dd>エネルギー環境・化学工学科</dd>
          <dt>YEAR</dt>
          <dd>学部3年（B3）</dd>
          <dt>BASE</dt>
          <dd>大阪</dd>
        </dl>
      </aside>

      <!-- Persona index: numberless entries, each opened by a short maple rule
           that acts as the index marker (the old 01-04 stamps were section
           numbering for its own sake). -->
      <div class="persona">
        <article class="persona__item" data-animate="persona-item">
          <span class="persona__rule" aria-hidden="true"></span>
          <h3 class="persona__title">得意・好きなこと</h3>
          <ul class="persona__list">
            <li>ピアノとドラムを習っていました</li>
            <li>マリンバのソロで大阪府大会に出場</li>
            <li>ギターはたまに練習中</li>
            <li>服とオーディオはすっかり沼</li>
          </ul>
        </article>

        <article class="persona__item" data-animate="persona-item">
          <span class="persona__rule" aria-hidden="true"></span>
          <h3 class="persona__title">大切にしてること</h3>
          <div class="persona__tags">
            <span class="persona__tag">考動</span>
            <span class="persona__tag">品格</span>
            <span class="persona__tag">謙虚</span>
            <span class="persona__tag">Just Do It</span>
          </div>
          <ul class="persona__list">
            <li>どんな人でもリスペクトできるところを探す</li>
            <li>「だって」と「でも」を使わない</li>
            <li>毎日をポジティブに過ごす</li>
          </ul>
        </article>

        <article class="persona__item" data-animate="persona-item">
          <span class="persona__rule" aria-hidden="true"></span>
          <h3 class="persona__title">苦手</h3>
          <ul class="persona__list">
            <li>早寝早起き</li>
            <li>コツコツゆっくり進めること
              <span class="persona__note">夏休みの宿題は休みに入る前に終わらせるタイプ。終わらなければ試験の素点でどうにかしていました。</span>
            </li>
            <li>シャトルラン</li>
          </ul>
        </article>

        <article class="persona__item" data-animate="persona-item">
          <span class="persona__rule" aria-hidden="true"></span>
          <h3 class="persona__title">頑張りたいこと</h3>
          <ul class="persona__list">
            <li>日記を続けること。コツコツが苦手なので、まずはここから。</li>
          </ul>
        </article>
      </div>
    </div>
  </div>
`
