// =============================================================================
// C4 — REALITY SYNC, KEPT SMALL (docs/CONCEPT.md §C4)
//
// Two facts about the moment of the visit, stated once each:
//   • the colophon prints the observation time, like a printed sheet would;
//   • the paper takes a few percent of the light of that hour.
//
// Deliberately NOT done: no "you are the Nth visitor", no countdown, no
// "only today" framing. The colophon says what time it is and the paper is a
// shade warmer at night. Anything louder would be claiming the page changes
// more than it does.
//
// ---- HOW IT IS APPLIED -------------------------------------------------------
// This module writes exactly TWO attributes on <html>: `data-theme` (which sheet
// the page is printed on) and `data-tod` (which light falls on it). Every band's
// tint, for both sheets, is declared as token values in global.css (search
// `--tod-`). That is what keeps the correction honest: the tint is resolved per
// theme by CSS, so changing the sheet re-derives the paper for the theme that
// actually won instead of being stuck with a colour computed in JS for the
// other one.
//
// ---- CONTRAST ----------------------------------------------------------------
// Every band was checked against every ink token on every paper surface, in both
// themes, by mixing in OKLab exactly as color-mix() does and computing WCAG
// ratios. The amounts below are the largest that keep every pair which passes
// AA at the base palette still passing AA in all four bands (the tightest is
// --maple-ink on --paper-3 in the light theme: 4.69 base -> 4.52 at night).
// =============================================================================

export type TimeBand = 'morning' | 'day' | 'evening' | 'night'

/**
 * Which light the page is being read in.
 *   morning  05:00-09:59   evening  16:00-18:59
 *   day      10:00-15:59   night    19:00-04:59
 */
export function bandFor(hour: number): TimeBand {
  if (hour >= 5 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 16) return 'day'
  if (hour >= 16 && hour < 19) return 'evening'
  return 'night'
}

/** How each band is named in the colophon and on the preview chips. */
export const BAND_LABEL: Record<TimeBand, string> = {
  morning: '朝',
  day: '昼',
  evening: '夕',
  night: '夜',
}

/**
 * Which sheet each band is read on (C4.2).
 *
 * Night is the dark sheet; the rest are light. This is the whole reason the
 * theme is no longer wired to `prefers-color-scheme`: the OS preference says
 * how the reader likes their screens, not what time it is where they are, and
 * the page is a place with a time of day. A manual override can be layered on
 * later by writing data-theme after this runs — the attribute is the only
 * switch, and nothing in the stylesheet asks the OS any more.
 */
export const BAND_THEME: Record<TimeBand, 'light' | 'dark'> = {
  morning: 'light',
  day: 'light',
  evening: 'light',
  night: 'dark',
}

/** The single write. Call before first paint so the paper is never re-tinted
 *  under the reader (and so this can never contribute a shift).
 *
 *  data-theme is ALSO set by an inline one-liner in index.html <head>, which is
 *  what keeps a night visit from painting the light sheet first. Re-applying the
 *  same value here is a deliberate no-op: this is the copy that owns the full
 *  band table, the head script only knows the night edge. */
export function applyTimeOfDay(now: Date = new Date()): TimeBand {
  const band = bandFor(now.getHours())
  const root = document.documentElement
  root.dataset.tod = band
  root.dataset.theme = BAND_THEME[band]
  initBandPreview()
  return band
}

// -----------------------------------------------------------------------------
// C4.1 — MAKING THE LINK LEGIBLE
//
// The correction is a few percent of one colour, which is exactly as loud as it
// should be — and that is also why nobody could tell what 観測日 was doing there.
// So the colophon says the sentence out loud, and offers the four bands as chips
// you can press to see the paper actually move.
//
// The preview is DELIBERATELY not persisted: it writes `data-tod` and nothing
// else, so a reload puts the sheet back to the real hour. It is a demonstration
// of the mechanism, not a theme picker — the page still only claims to follow
// the clock.
//
// Wired by delegation from `document`, because this runs before main.ts injects
// the footer markup. The chips' initial state (which one is pressed, which one
// is the live hour) is rendered in the markup by src/sections/footer.ts, so
// nothing here has to touch the DOM at load and the colophon cannot shift.
// -----------------------------------------------------------------------------
let previewWired = false
function initBandPreview() {
  if (previewWired) return
  previewWired = true
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null
    if (!target || typeof target.closest !== 'function') return
    const chip = target.closest<HTMLElement>('[data-tod-set]')
    const band = chip?.dataset.todSet as TimeBand | undefined
    if (!band || !(band in BAND_LABEL)) return

    // Theme AND tint together — pressing 夜 has to hand over the dark sheet, or
    // the chips would only ever demonstrate a fraction of what the clock does.
    // The 400ms cross-fade is CSS (see the transition on :root in global.css).
    document.documentElement.dataset.tod = band
    document.documentElement.dataset.theme = BAND_THEME[band]
    document
      .querySelectorAll<HTMLElement>('[data-tod-set]')
      .forEach((el) => el.setAttribute('aria-pressed', String(el === chip)))
    // The sentence names whatever the paper is currently showing, so it stays
    // true during a preview instead of insisting it is still the real hour.
    const name = document.querySelector<HTMLElement>('[data-tod-name]')
    if (name) name.textContent = BAND_LABEL[band]
  })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 「観測日」as printed in the colophon: YYYY.MM.DD HH:MM, local time, minute
 *  resolution. Not live-updating: it is a timestamp of the visit, not a clock. */
export function observedStamp(now: Date = new Date()): string {
  return (
    `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}

/** The same instant as a machine-readable local datetime for <time datetime>. */
export function observedISO(now: Date = new Date()): string {
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}
