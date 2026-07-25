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
// ---- HOW THE TINT IS APPLIED -------------------------------------------------
// This module writes exactly ONE thing: `data-tod` on <html>. All four bands,
// for both themes, are declared as token values in global.css (search `--tod-`).
// That is what keeps the correction honest across theme switching: the tint is
// resolved per theme by CSS, so flipping prefers-color-scheme (or the manual
// [data-theme] override) re-derives the paper for the CURRENT theme instead of
// being stuck with a colour computed in JS for the other one.
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

/** The single write. Call before first paint so the paper is never re-tinted
 *  under the reader (and so this can never contribute a shift). */
export function applyTimeOfDay(now: Date = new Date()): TimeBand {
  const band = bandFor(now.getHours())
  document.documentElement.dataset.tod = band
  return band
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
