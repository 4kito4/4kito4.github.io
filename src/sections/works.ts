// Works — bento grid, exactly 6 cells, tutor platform featured with a real image.
//
// C2: every cell carries `data-companion-say`, one line the corner companion says
// while the cell is hovered (fine pointers only — see src/anim/companion.ts). The
// lines are the companion's impression of the piece, never a claim about it: no
// metric, no status and no capability is asserted that the card does not already
// state in its own copy.
//
// P4C: the three pieces that have a documented write-up (docs/WORKS_FACTS.md)
// carry a 詳しく button opening their dossier panel (src/anim/dossier.ts). It is
// placed directly under the description, hard against the card's LEFT edge —
// deliberately the opposite corner from the companion's speech bubble, which is
// spoken to the left of the fixed bottom-right companion and would otherwise sit
// on top of a bottom-right affordance while the same card is hovered. The three
// cards without a fact sheet (tutor platform, chem-tools, Antigravity) get no
// button: an "open" affordance that leads to a thin panel is worse than none.
export const worksHTML = /* html */ `
  <div class="u-container">
    <div class="section__head section__head--spine">
      <span class="vlabel" aria-hidden="true">制作物</span>
      <p class="section-kicker" data-animate="reveal">SELECTED WORK</p>
      <h2 class="section-h" data-animate="split-h" style="margin-top:0.5rem;">制作物</h2>
    </div>
  </div>

  <!-- Signature scroll scene: on desktop the motion layer pins this and pans the
       6-cell track horizontally; on mobile it stays a vertical stack (reveal). -->
  <div class="works-scene" data-works-scene>
    <div class="works" data-works-track>
      <!-- 01 featured: 家庭教師マッチングプラットフォーム -->
      <article class="work work--feature" data-animate="work-feature" data-companion-say="これ、いちばん がんばってるんだ">
        <img class="work__img" src="/assets/aki_ha_tutor.jpg" alt="家庭教師マッチングプラットフォームのイメージ" width="800" height="450" loading="lazy" />
        <div class="work__body">
          <div class="work__flags">
            <span class="work__flag">いちばん力を入れています</span>
            <!-- Honest status, deliberately quiet: the service already runs and
                 is being improved, so the card says so rather than linking out
                 to it while the live site is being worked on. -->
            <span class="work__status">アップデート中</span>
          </div>
          <span class="work__en">Matching Platform</span>
          <!-- BudouX reads this compound as ONE phrase, so it inserts no
               boundary and the browser is left to choose. It happens to choose
               well, but "happens to" is not a guarantee at every width — the two
               halves are declared here so the only possible break is the right
               one. -->
          <h3 class="work__title"><span class="nb">家庭教師マッチング</span><span class="nb">プラットフォーム</span></h3>
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

      <!-- 02 履修AI — 3名の共同開発。担当と進行状況を card 側にも出す（正直に）。
           詳細（体制・二層データ構造図・GitHub）は dossier パネルへ。 -->
      <article class="work work--c2" data-animate="work-card" data-companion-say="履修、まよっちゃうもんね">
        <div class="work__flags">
          <span class="work__status">共同開発・準備中（UI担当）</span>
        </div>
        <span class="work__en">Course Navigator</span>
        <h3 class="work__title">履修AI「course-navigator」</h3>
        <p class="work__desc">
          科目のつながりをグラフで持たせ、納得して履修を選べるようにするAI。Google AI Tech Hub 発の3名共同開発で、私は <span class="nb">UI／フロントエンドを</span>担当しています。
        </p>
        <button class="work__more" type="button" data-dossier="course"
          aria-label="履修AI course-navigator の説明をひらく">
          詳しく<span class="work__more-mark" aria-hidden="true"></span>
        </button>
        <div class="work__tags">
          <span class="work__tag">FastAPI</span>
          <span class="work__tag">Neo4j</span>
          <span class="work__tag">React</span>
        </div>
      </article>

      <!-- 03 NPUローカルAI -->
      <article class="work work--c2" data-animate="work-card" data-companion-say="このパソコンの中だけで、うごくんだって">
        <span class="work__en">On-device AI</span>
        <h3 class="work__title">NPUローカルAI環境</h3>
        <p class="work__desc">
          AI PC の NPU で動くローカル音声認識環境を構築。10秒の音声を約3.2秒で文字起こしできます。
        </p>
        <button class="work__more" type="button" data-dossier="npu"
          aria-label="NPUローカルAI環境の説明をひらく">
          詳しく<span class="work__more-mark" aria-hidden="true"></span>
        </button>
        <div class="work__tags">
          <span class="work__tag">Lemonade</span>
          <span class="work__tag">Qwen3-ASR</span>
        </div>
      </article>

      <!-- 04 intro-topic-bot -->
      <article class="work work--c3" data-animate="work-card" data-companion-say="はなしのきっかけ、そっと置いてくれる子">
        <span class="work__en">Discord Bot</span>
        <h3 class="work__title">intro-topic-bot</h3>
        <p class="work__desc">
          自己紹介の投稿から興味を読み取り、その人が話しやすいお題を雑談チャンネルにそっと投下する Discord Bot。
        </p>
        <button class="work__more" type="button" data-dossier="bot"
          aria-label="intro-topic-bot の説明をひらく">
          詳しく<span class="work__more-mark" aria-hidden="true"></span>
        </button>
        <div class="work__tags">
          <span class="work__tag">Python</span>
          <span class="work__tag">Gemini API</span>
        </div>
      </article>

      <!-- 05 chem-tools -->
      <article class="work work--c3" data-animate="work-card" data-companion-say="化学の絵、かいてくれるんだよ">
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
      <article class="work work--band" data-animate="work-card" data-companion-say="いっしょに べんきょうできるやつ">
        <div class="work__row">
          <div>
            <span class="work__en">Hands-on Material</span>
            <h3 class="work__title">Antigravity <span class="nb">ハンズオン教材</span></h3>
            <!-- The old .nb pair here split 学び合い / にも, which sits inside a
                 single phrase. BudouX segments this line correctly on its own,
                 so those hand guards are gone; only the fixed compound
                 (制作・公開) still needs protecting. -->
            <p class="work__desc">
              Google の AI コーディングエージェント「Antigravity」を約2時間で学べるハンズオン資料を<span class="nb">制作・公開。</span>コミュニティでの学び合いにも使っています。
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
