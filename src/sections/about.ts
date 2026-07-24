// About — editorial lead + attribute aside, then a 2x2 persona index.
export const aboutHTML = /* html */ `
  <div class="u-container">
    <div class="section__head">
      <h2 class="section-h" data-animate="reveal">自己紹介</h2>
    </div>

    <div class="about__intro">
      <div>
        <p class="lead" data-animate="reveal">
          はじめまして、長谷川耀俊（Aki_Ha）です。関西大学で化学工学を学びながら、生成AIを使った開発とコミュニティづくりに打ち込んでいます。「専攻の知識 × AI」で身の回りの課題を解くのが好きで、講義のスキマ時間もだいたい何かをつくっています。
        </p>
        <div class="about__chips" data-animate="reveal">
          <span class="chip chip--accent">関西大学</span>
          <span class="chip">環境都市工学部</span>
          <span class="chip">エネルギー環境・化学工学科</span>
          <span class="chip">学部3年</span>
          <span class="chip">西日本</span>
        </div>
      </div>

      <dl class="about__aside" data-animate="reveal">
        <dt>UNIVERSITY</dt>
        <dd>関西大学 環境都市工学部</dd>
        <dt>MAJOR</dt>
        <dd>エネルギー環境・化学工学科</dd>
        <dt>YEAR</dt>
        <dd>学部3年（B3）</dd>
        <dt>BASE</dt>
        <dd>西日本</dd>
      </dl>
    </div>

    <div class="persona">
      <div class="persona__item" data-animate="persona-item">
        <span class="persona__no">01</span>
        <h3 class="persona__title">得意・好きなこと</h3>
        <ul class="persona__list">
          <li>ピアノとドラムを習っていました</li>
          <li>マリンバのソロで大阪府大会に出場</li>
          <li>ギターはたまに練習中</li>
          <li>服とオーディオはすっかり沼</li>
        </ul>
      </div>

      <div class="persona__item" data-animate="persona-item">
        <span class="persona__no">02</span>
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
      </div>

      <div class="persona__item" data-animate="persona-item">
        <span class="persona__no">03</span>
        <h3 class="persona__title">苦手</h3>
        <ul class="persona__list">
          <li>早寝早起き</li>
          <li>コツコツゆっくり進めること
            <span class="persona__note">夏休みの宿題は休みに入る前に終わらせるタイプ。終わらなければ試験の素点でどうにかしていました。</span>
          </li>
          <li>シャトルラン</li>
        </ul>
      </div>

      <div class="persona__item" data-animate="persona-item">
        <span class="persona__no">04</span>
        <h3 class="persona__title">頑張りたいこと</h3>
        <ul class="persona__list">
          <li>日記を続けること。コツコツが苦手なので、まずはここから。</li>
        </ul>
      </div>
    </div>
  </div>
`
