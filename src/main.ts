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
