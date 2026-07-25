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
//
// The opening is a scroll-scrubbed sequence, so the first seconds of scrolling
// are exactly when a half-loaded set shows: the engine falls back to the nearest
// decoded frame and the drop stutters. Waiting is the better trade (explicit
// product call), so the curtain holds until BOTH:
//   • the display webfonts are ready, and
//   • the first 24 drop frames have decoded — the span the reader crosses in the
//     opening beat, after which the sequential preload stays ahead of the scrub.
//
// The bar and the count report that real tally; nothing is synthesised. A 4s hard
// ceiling caps the wait, after which the page proceeds and the sequence engine's
// own nearest-loaded fallback plus the three overlay guards take over. When
// everything is already cached the curtain is removed with no animation at all.
//
// It sits above the FOUC guard rather than replacing it: `.is-animating` still
// pre-hides the hero copy underneath, and the intro timeline still owns the
// reveal. Dismissal flips <html> to `.is-loaded` and fires `akiha:loaded`, which
// is what starts the opening's teaser clock (see src/anim/index.ts).
// -----------------------------------------------------------------------------
const CURTAIN_FRAMES = 24
const CURTAIN_CEILING_MS = 4000

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

  const fill = el.querySelector<HTMLElement>('.preloader__progress-fill')
  const count = el.querySelector<HTMLElement>('.preloader__count')
  let decoded = 0
  const report = () => {
    decoded++
    if (fill) fill.style.transform = `scaleX(${decoded / CURTAIN_FRAMES})`
    if (count) count.textContent = `${decoded} / ${CURTAIN_FRAMES}`
  }

  const startedAt = performance.now()
  let dismissed = false
  const dismiss = () => {
    if (dismissed) return
    dismissed = true
    // Already-cached case: skip the animation entirely rather than inventing a
    // beat the reader has no reason to wait through.
    if (performance.now() - startedAt < 150) {
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

  const frames = Array.from({ length: CURTAIN_FRAMES }, (_, i) => {
    const url = `/assets/seq/drop/drop_${String(i).padStart(3, '0')}.webp`
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.decoding = 'async'
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        report()
        resolve()
      }
      img.onload = done
      img.onerror = done // a missing frame must not trap the curtain
      img.src = url
      if (img.complete) done()
    })
  })

  Promise.all([document.fonts.ready, ...frames]).then(dismiss, dismiss)
  window.setTimeout(dismiss, CURTAIN_CEILING_MS) // hard ceiling
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
