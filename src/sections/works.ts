// Works — bento grid, exactly 6 cells, tutor platform featured with a real image.
export const worksHTML = /* html */ `
  <div class="u-container">
    <div class="section__head">
      <p class="section-kicker" data-animate="reveal">SELECTED WORK</p>
      <h2 class="section-h" data-animate="reveal" style="margin-top:0.5rem;">制作物</h2>
    </div>

    <div class="works">
      <!-- 01 featured: 家庭教師マッチングプラットフォーム -->
      <article class="work work--feature" data-animate="work-feature">
        <img class="work__img" src="/assets/aki_ha_tutor.jpg" alt="家庭教師マッチングプラットフォームのイメージ" width="800" height="450" loading="lazy" />
        <div class="work__body">
          <span class="work__flag">いちばん力を入れています</span>
          <span class="work__en">Matching Platform</span>
          <h3 class="work__title">家庭教師マッチングプラットフォーム</h3>
          <p class="work__desc">
            保護者と家庭教師をつなぐ Web サービスを個人開発しています。体験授業の依頼から日程調整、契約の同意、決済までを一気通貫で扱う、実運用を見据えたプロダクトです。
          </p>
          <div class="work__tags">
            <span class="work__tag">Next.js</span>
            <span class="work__tag">TypeScript</span>
            <span class="work__tag">Supabase</span>
            <span class="work__tag">Stripe</span>
          </div>
        </div>
      </article>

      <!-- 02 履修AI -->
      <article class="work work--c2" data-animate="work-card">
        <span class="work__en">Course Navigator</span>
        <h3 class="work__title">履修AI「course-navigator」</h3>
        <p class="work__desc">
          大学の履修選択を支援するAI。科目のつながりをグラフDBで持たせた GraphRAG 構成です。
        </p>
        <div class="work__tags">
          <span class="work__tag">FastAPI</span>
          <span class="work__tag">Neo4j</span>
          <span class="work__tag">React</span>
        </div>
      </article>

      <!-- 03 NPUローカルAI -->
      <article class="work work--c2" data-animate="work-card">
        <span class="work__en">On-device AI</span>
        <h3 class="work__title">NPUローカルAI環境</h3>
        <p class="work__desc">
          AI PC の NPU で動くローカル音声認識環境を構築。10秒の音声を約3.2秒で文字起こしできます。
        </p>
        <div class="work__tags">
          <span class="work__tag">Lemonade</span>
          <span class="work__tag">Qwen3-ASR</span>
        </div>
      </article>

      <!-- 04 intro-topic-bot -->
      <article class="work work--c3" data-animate="work-card">
        <span class="work__en">Discord Bot</span>
        <h3 class="work__title">intro-topic-bot</h3>
        <p class="work__desc">
          自己紹介の投稿から興味を読み取り、その人が話しやすいお題を雑談チャンネルにそっと投下する Discord Bot。
        </p>
        <div class="work__tags">
          <span class="work__tag">Python</span>
          <span class="work__tag">Gemini API</span>
        </div>
      </article>

      <!-- 05 chem-tools -->
      <article class="work work--c3" data-animate="work-card">
        <span class="work__en">Chemistry × AI</span>
        <h3 class="work__title">chem-tools</h3>
        <p class="work__desc">
          化合物名から化学構造式の画像を自動生成するツール。専攻の化学とツール開発の掛け合わせです。
        </p>
        <div class="work__tags">
          <span class="work__tag">chemfig</span>
          <span class="work__tag">LuaLaTeX</span>
        </div>
      </article>

      <!-- 06 Antigravity ハンズオン教材 (full-width band) -->
      <article class="work work--band" data-animate="work-card">
        <div class="work__row">
          <div>
            <span class="work__en">Hands-on Material</span>
            <h3 class="work__title">Antigravity ハンズオン教材</h3>
            <p class="work__desc">
              Google の AI コーディングエージェント「Antigravity」を約2時間で学べるハンズオン資料を制作・公開。コミュニティでの学び合いにも使っています。
            </p>
          </div>
          <div class="work__tags">
            <span class="work__tag">教材制作</span>
            <span class="work__tag">Antigravity</span>
          </div>
        </div>
      </article>
    </div>
  </div>
`
