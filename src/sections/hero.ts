// Hero — asymmetric editorial split. Name is the primary display element.
export const heroHTML = /* html */ `
  <div class="u-container hero__grid">
    <div class="hero__copy">
      <span class="hero__eyebrow" data-animate="hero-eyebrow"><span class="nb">Google AI Student Community</span> &nbsp;/&nbsp; <span class="nb">Ambassador</span></span>
      <h1 class="hero__name" data-animate="hero-title">
        <span class="hero__name-row">長谷川</span><span class="hero__name-row">耀俊</span>
      </h1>
      <p class="hero__en" data-animate="hero-title-en"><span class="nb">Hasegawa Akitoshi</span> <span class="accent nb">/ Aki_Ha</span></p>
      <p class="hero__sub" data-animate="hero-sub">
        化学工学を専攻しながら、生成AIで<span class="nb">身の回りの課題を</span><span class="nb">解いています。</span><span class="nb">「つくって、つなげる」が信条です。</span>
      </p>
      <div class="hero__cta" data-animate="hero-cta">
        <a href="#works" class="btn btn--primary"><span data-roll>制作物を見る</span> <span aria-hidden="true">&rarr;</span></a>
        <a href="#activity" class="btn btn--ghost"><span data-roll>活動を見る</span></a>
      </div>
    </div>

    <div class="hero__media" data-animate="hero-media">
      <img class="hero__deco hero__deco--leaf" data-parallax="0.12" src="/assets/aki_ha_deco_leaf_r.png" alt="" width="112" height="112" loading="eager" />
      <div class="hero__media-frame">
        <img src="/assets/aki_ha_hero.jpg" alt="Aki_Ha のマスコットキャラクター" width="360" height="450" loading="eager" />
      </div>
      <span class="hero__media-cap">MASCOT / AKI_HA</span>
    </div>
  </div>

  <!-- Vertical motto: pinned to the outer right gutter of the hero, clear of the
       mascot column. Shown only >=1040px (existing spec). -->
  <span class="hero__vlabel" aria-hidden="true">つくって、つなげる</span>
`
