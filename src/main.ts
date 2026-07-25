import './styles/global.css'

// Self-hosted fonts (no Google Fonts <link>). JP display = Zen Kaku Gothic New,
// EN display = Outfit. Only the weights the design system actually uses.
import '@fontsource/zen-kaku-gothic-new/400.css'
import '@fontsource/zen-kaku-gothic-new/500.css'
import '@fontsource/zen-kaku-gothic-new/700.css'
import '@fontsource/zen-kaku-gothic-new/900.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'

import { openingHTML } from './sections/opening'
import { heroHTML } from './sections/hero'
import { aboutHTML } from './sections/about'
import { activityHTML } from './sections/activity'
import { worksHTML } from './sections/works'
import { footerHTML } from './sections/footer'
import { initMotion } from './anim'

const sections: Record<string, string> = {
  opening: openingHTML,
  hero: heroHTML,
  about: aboutHTML,
  activity: activityHTML,
  works: worksHTML,
  contact: footerHTML,
}

for (const [id, html] of Object.entries(sections)) {
  const el = document.getElementById(id)
  if (el) el.innerHTML = html
}

// FOUC guard: hide only the hero copy before fonts load, but never under
// reduced motion (there, everything stays painted and static).
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (!prefersReduced) document.documentElement.classList.add('is-animating')

// -----------------------------------------------------------------------------
// FIRST-LOAD CURTAIN
// The opening scene only works if its first frame and the display webfonts are
// there when the curtain lifts — otherwise the reader's first impression is a
// blank canvas plus a font swap. So the curtain waits on those two REAL signals
// (no synthetic progress), with a hard 1.5s ceiling so a slow connection can
// never hold the page hostage, and no fade at all when both were already cached.
//
// It sits above the FOUC guard rather than replacing it: `.is-animating` still
// pre-hides the hero copy underneath, and the intro timeline still owns the
// reveal. Dismissal flips <html> to `.is-loaded` and fires `akiha:loaded`, which
// is what starts the opening's idle-nudge clock (see src/anim/index.ts).
// -----------------------------------------------------------------------------
;(function firstLoadCurtain() {
  const el = document.getElementById('preloader')
  const finish = () => {
    document.documentElement.classList.add('is-loaded')
    window.dispatchEvent(new Event('akiha:loaded'))
  }
  if (!el) {
    finish()
    return
  }
  if (prefersReduced) {
    el.remove()
    finish()
    return
  }

  const startedAt = performance.now()
  let dismissed = false
  const dismiss = () => {
    if (dismissed) return
    dismissed = true
    // Already-cached case: skip the animation entirely rather than inventing a
    // beat the reader has no reason to wait through.
    const instant = performance.now() - startedAt < 150
    if (instant) {
      el.remove()
      finish()
      return
    }
    el.classList.add('is-done')
    window.setTimeout(() => {
      el.remove()
      finish()
    }, 460)
  }

  const frameZero = new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // a missing frame must not trap the curtain
    img.src = '/assets/seq/drop/drop_000.webp'
    if (img.complete) resolve()
  })

  Promise.all([document.fonts.ready, frameZero]).then(dismiss, dismiss)
  window.setTimeout(dismiss, 1500) // hard ceiling
})()

try {
  initMotion()
} catch (err) {
  // モーション初期化に失敗してもコンテンツは必ず見える状態に戻す。
  // opening はヒーローに被さる absolute オーバーレイなので、スクラブが動かない
  // 以上そのままだとヒーローを恒久的に隠してしまう。フォールバックでは opening を
  // 消してヒーローを露出させる（reduced-motion と同じ「ヒーローから始まる」挙動）。
  document.documentElement.classList.remove('is-animating')
  const opening = document.getElementById('opening')
  if (opening) opening.style.display = 'none'
  console.error('[motion] init failed, falling back to static page', err)
}
