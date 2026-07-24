// Hero — asymmetric editorial split. Name is the primary display element.
export const heroHTML = /* html */ `
  <div class="u-container hero__grid">
    <div class="hero__copy">
      <span class="hero__eyebrow" data-animate="hero-eyebrow">Google AI Student Community &nbsp;/&nbsp; Ambassador</span>
      <h1 class="hero__name" data-animate="hero-title">長谷川 耀俊</h1>
      <p class="hero__en" data-animate="hero-title-en">Hasegawa Akitoshi <span class="accent">/ Aki_Ha</span></p>
      <p class="hero__sub" data-animate="hero-sub">
        化学工学を専攻しながら、生成AIで身の回りの課題を解いています。「つくって、つなげる」が信条です。
      </p>
      <div class="hero__cta" data-animate="hero-cta">
        <a href="#works" class="btn btn--primary">制作物を見る <span aria-hidden="true">&rarr;</span></a>
        <a href="#activity" class="btn btn--ghost">活動を見る</a>
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
`
