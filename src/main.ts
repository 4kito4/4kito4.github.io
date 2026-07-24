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

import { heroHTML } from './sections/hero'
import { aboutHTML } from './sections/about'
import { activityHTML } from './sections/activity'
import { worksHTML } from './sections/works'
import { footerHTML } from './sections/footer'
import { initMotion } from './anim'

const sections: Record<string, string> = {
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

try {
  initMotion()
} catch (err) {
  // モーション初期化に失敗してもコンテンツは必ず見える状態に戻す
  document.documentElement.classList.remove('is-animating')
  console.error('[motion] init failed, falling back to static page', err)
}
