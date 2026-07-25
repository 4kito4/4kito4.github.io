// =============================================================================
// WORKS DOSSIER PANEL — a sheet of paper laid on top of the spread.
//
// The works section is a pinned horizontal pan: cards are read while the track
// moves, so anything that changes their height or their flow breaks the scan.
// This panel therefore lives entirely OUTSIDE that layout — `position: fixed`,
// appended to <body>, created once, content swapped per card. Opening it neither
// reflows the track nor touches ScrollTrigger (no refresh is ever called here),
// so the pin and the pan survive it untouched.
//
// ACCESSIBILITY (the panel is a real modal dialog, so it behaves like one)
//   • role="dialog" + aria-modal="true" + aria-labelledby -> the sheet's own <h2>
//   • focus moves to the close button on open and is RESTORED to the 詳しく
//     button that opened it on close
//   • Tab / Shift+Tab are trapped inside the sheet; the focusable set is
//     re-queried on every keystroke because the content is swapped per card
//   • Escape closes, as does the scrim and the close button
//   • the rest of the page is marked `inert` while the panel is open, so pointer,
//     tab order and the a11y tree all stop at the sheet even in a browser where
//     the JS trap misses an edge case
//
// SCROLL LOCK. Lenis owns the page scroll, so `lenis.stop()` is the lock: while
// stopped it preventDefaults wheel and touch outright. The sheet carries
// `data-lenis-prevent`, which Lenis checks BEFORE that early return, so the
// sheet itself still scrolls natively while the page behind is frozen. No
// `overflow: hidden` on <html> is needed, which is what keeps the scrollbar (and
// therefore the layout) from shifting — CLS stays at 0.
//
// MOTION. One justified move: a state transition. The sheet rises 24px and fades
// in while the scrim darkens, which is the paper being laid down; closing plays
// it back. Under reduced motion both are instant (opacity only, set directly) —
// there is no half-speed version.
// =============================================================================
import { gsap } from 'gsap'
import type Lenis from 'lenis'
import { DOSSIERS } from '../sections/dossier'
import { applyLineBreaks } from '../text/linebreak'

export interface DossierOptions {
  reduce: boolean
  lenis?: Lenis | null
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

const PANEL_MARKUP = /* html */ `
  <div class="dossier__scrim" data-dossier-close></div>
  <div class="dossier__sheet" role="dialog" aria-modal="true" aria-labelledby="dossier-title"
       tabindex="-1" data-lenis-prevent>
    <button class="dossier__close" type="button" aria-label="閉じる" data-dossier-close>
      <span class="dossier__close-mark" aria-hidden="true"></span>
    </button>
    <div class="dossier__inner">
      <header class="dossier__head">
        <p class="dossier__eyebrow"></p>
        <h2 class="dossier__title" id="dossier-title"></h2>
      </header>
      <div class="dossier__content"></div>
    </div>
  </div>
`

export function initDossier({ reduce, lenis = null }: DossierOptions): void {
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-dossier]'))
  if (!triggers.length || document.querySelector('.dossier')) return

  const root = document.createElement('div')
  root.className = 'dossier'
  root.hidden = true
  root.innerHTML = PANEL_MARKUP
  document.body.append(root)

  const scrim = root.querySelector<HTMLElement>('.dossier__scrim')!
  const sheet = root.querySelector<HTMLElement>('.dossier__sheet')!
  const closeBtn = root.querySelector<HTMLElement>('.dossier__close')!
  const eyebrowEl = root.querySelector<HTMLElement>('.dossier__eyebrow')!
  const titleEl = root.querySelector<HTMLElement>('.dossier__title')!
  const contentEl = root.querySelector<HTMLElement>('.dossier__content')!

  // Everything that must stop existing for assistive tech while the sheet is up.
  // The companion is already aria-hidden and pointer-transparent, so it is left
  // alone: taking it out would also stop its idle loop for no benefit.
  const backdropRegions = ['header.nav', 'main', 'footer'].flatMap((sel) =>
    Array.from(document.querySelectorAll<HTMLElement>(sel)),
  )

  let openKey: string | null = null
  let lastFocus: HTMLElement | null = null

  function open(key: string, source: HTMLElement) {
    const data = DOSSIERS[key]
    if (!data || openKey) return
    openKey = key
    lastFocus = source

    eyebrowEl.textContent = data.eyebrow
    titleEl.textContent = data.title
    contentEl.innerHTML = data.html
    // The panel's copy is created here, after the page-wide pass in main.ts has
    // already run — so it gets its own 文節 segmentation now that it is in the
    // document (BudouX needs live computed styles to honour .nb / nowrap).
    applyLineBreaks(contentEl)

    root.hidden = false
    backdropRegions.forEach((el) => (el.inert = true))
    lenis?.stop()

    // `opacity`, NOT `autoAlpha`: autoAlpha writes visibility:hidden at 0, and a
    // visibility-hidden element cannot take focus — the close button below would
    // silently fail and the reader would be left tabbing the page behind. The
    // panel's presence is owned by `root.hidden` (display), so visibility never
    // needs to move at all.
    if (reduce) {
      gsap.set([scrim, sheet], { opacity: 1, y: 0 })
    } else {
      gsap.killTweensOf([scrim, sheet])
      gsap.set(scrim, { opacity: 0 })
      gsap.set(sheet, { opacity: 0, y: 24 })
      gsap.to(scrim, { opacity: 1, duration: 0.28, ease: 'power2.out' })
      gsap.to(sheet, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
    }

    sheet.scrollTop = 0
    closeBtn.focus()
    document.addEventListener('keydown', onKeydown, true)
  }

  function finishClose() {
    root.hidden = true
    openKey = null
    backdropRegions.forEach((el) => (el.inert = false))
    lenis?.start()
    lastFocus?.focus()
    lastFocus = null
    // Release the figures and their SVG from the document once the sheet is gone.
    contentEl.innerHTML = ''
  }

  function close() {
    if (!openKey) return
    document.removeEventListener('keydown', onKeydown, true)
    if (reduce) {
      finishClose()
      return
    }
    gsap.killTweensOf([scrim, sheet])
    gsap.to(sheet, { opacity: 0, y: 16, duration: 0.26, ease: 'power2.in' })
    gsap.to(scrim, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: finishClose })
  }

  function onKeydown(e: KeyboardEvent) {
    if (!openKey) return
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key !== 'Tab') return
    // Re-queried per keystroke: the content (and therefore the link at the end of
    // the course-navigator sheet) changes with the card.
    const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === closeBtn,
    )
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && (active === first || active === sheet || !sheet.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  triggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.dossier
      if (key) open(key, btn)
    })
  })

  root.querySelectorAll<HTMLElement>('[data-dossier-close]').forEach((el) =>
    el.addEventListener('click', close),
  )
}
