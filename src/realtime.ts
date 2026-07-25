// =============================================================================
// C4 — REALITY SYNC, KEPT SMALL (docs/CONCEPT.md §C4)
//
// Two facts about the moment of the visit, stated once each:
//   • the colophon prints the observation time, like a printed sheet would;
//   • the paper takes the light of that hour.
//
// Deliberately NOT done: no "you are the Nth visitor", no countdown, no
// "only today" framing. The colophon says what time it is and the paper is a
// shade warmer at night. Anything louder would be claiming the page changes
// more than it does.
//
// ---- WHO DECIDES THE SHEET (C4.3) -------------------------------------------
// Exactly one precedence, and the operating system is not in it:
//
//     1. the reader's own choice, stored in localStorage        (highest)
//     2. the hour of the visit
//     (there is no 3. — `prefers-color-scheme` selects nothing in this project;
//      see the DESIGN TOKENS block in global.css)
//
// The OS preference says how someone likes their screens. It does not say what
// time it is where they are, and this page is a place with a time of day. A
// reader who disagrees with the clock gets a switch — two of them, in fact, the
// header indicator and the colophon chips — and that choice outranks the clock
// until they hand it back with 「観測時刻に戻す」. That escape hatch is not
// optional: a persisted override with no way out would kill the time link
// permanently, which is the one thing this whole feature exists to show.
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
// It also keeps two <meta> tags in step, because those are the two places the OS
// could otherwise still get a vote — see `paintBrowserChrome`.
//
// ---- CONTRAST ----------------------------------------------------------------
// Every band was checked against every ink token on every paper surface, in both
// themes, by mixing in OKLab exactly as color-mix() does and computing WCAG
// ratios. The amounts in global.css are the largest that keep every pair which
// passes AA at the base palette still passing AA in all four bands (the tightest
// is --maple-ink on --paper-3 in the light theme: 4.69 base -> 4.52 at night).
// =============================================================================

export type TimeBand = 'morning' | 'day' | 'evening' | 'night'

/** Where the reader's own choice is kept. Absent = follow the clock. */
const PREF_KEY = 'akiha:tod'

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

/** Chronological order. Used by the colophon chips and the header cycle. */
export const BANDS: readonly TimeBand[] = ['morning', 'day', 'evening', 'night']

/** How each band is named in the colophon, on the chips and in the header. */
export const BAND_LABEL: Record<TimeBand, string> = {
  morning: '朝',
  day: '昼',
  evening: '夕',
  night: '夜',
}

/**
 * Which sheet each band is read on (C4.2).
 *
 * Night is the dark sheet; the rest are light. This is also what the header
 * glyph draws from: the three light bands get a sun, night gets a moon. One
 * binary, drawn once, meaning the same thing in both places.
 */
export const BAND_THEME: Record<TimeBand, 'light' | 'dark'> = {
  morning: 'light',
  day: 'light',
  evening: 'light',
  night: 'dark',
}

// -----------------------------------------------------------------------------
// STORED CHOICE
// -----------------------------------------------------------------------------

/** The reader's stored band, or null for "follow the clock". Unknown values are
 *  treated as absent rather than trusted — the key is public and editable. */
export function storedBand(): TimeBand | null {
  try {
    const v = localStorage.getItem(PREF_KEY)
    return v && (BANDS as readonly string[]).includes(v) ? (v as TimeBand) : null
  } catch {
    return null // private mode / storage disabled: the clock simply keeps the wheel
  }
}

function storeBand(band: TimeBand | null) {
  try {
    if (band) localStorage.setItem(PREF_KEY, band)
    else localStorage.removeItem(PREF_KEY)
  } catch {
    /* the session still works, it just will not be remembered */
  }
}

/** The band in force right now: the stored choice if there is one, the hour if
 *  not. The single answer to "what is the page showing", used by every caller. */
export function currentBand(now: Date = new Date()): TimeBand {
  return storedBand() ?? bandFor(now.getHours())
}

// -----------------------------------------------------------------------------
// BROWSER CHROME — the last two places the OS could still get a vote
// -----------------------------------------------------------------------------

/**
 * `<meta name="color-scheme">` and `<meta name="theme-color">` are the two
 * surfaces CSS cannot reach in time.
 *
 *   • color-scheme was `light dark`, which is an invitation: it tells the UA the
 *     page handles both and lets the OS PICK for everything the UA paints
 *     itself — the canvas before the stylesheet applies, scrollbars, and the
 *     default form-control palette. Arriving in the morning with an OS set to
 *     dark therefore flashed a dark canvas under a cream page. It is now written
 *     as a single resolved value, so the UA is told which one won rather than
 *     asked to choose.
 *   • theme-color was absent, which on mobile leaves the browser's own bar to
 *     follow the OS. It now tracks the paper.
 *
 * The theme-color value is read back off the page instead of being kept as a
 * table here, so it cannot drift from the CSS that actually paints the sheet.
 * Getting the VALUE right took two attempts worth recording, because both dead
 * ends look correct:
 *
 *   • Reading `document.body`'s computed backgroundColor returns the colour
 *     mid-cross-fade, not the destination — --paper is registered with
 *     @property, so it interpolates, and a read during those 400ms yields the
 *     band being faded FROM. Worse, a browser THROTTLES transitions in a
 *     background tab, so "just read it again after 450ms" can read a value that
 *     is frozen indefinitely.
 *   • Round-tripping `ctx.fillStyle` does not convert anything. --paper resolves
 *     through color-mix in OKLab, and the canvas spec preserves non-sRGB spaces,
 *     so Chrome hands back `oklab(0.18 0.003 0.012)` unchanged — which is no use
 *     in a meta tag parsed by UAs of every vintage, and shipping a colour space
 *     some of them drop is exactly how the browser bar quietly goes back to
 *     following the OS.
 *
 * So the target is rebuilt from the three inputs the CSS mixes — all three are
 * PLAIN custom properties, which are not animatable and therefore report their
 * destination value the instant the attribute changes — and that mix is resolved
 * to 8-bit sRGB by painting one pixel and reading it back. No timers, no
 * animated reads, and no colour table duplicated from the stylesheet.
 */
let swatch: CanvasRenderingContext2D | null | undefined
/** Any colour that is not one of the papers. If assigning the real value leaves
 *  fillStyle at this, the UA rejected it: invalid assignments are ignored, and
 *  an ignored one would otherwise paint the sentinel and be read back as a
 *  perfectly plausible colour. */
const SENTINEL = '#010203'

function toHex(color: string): string | null {
  if (swatch === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    swatch = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!swatch) return null
  try {
    swatch.fillStyle = SENTINEL
    swatch.fillStyle = color
    if (swatch.fillStyle === SENTINEL) return null
    swatch.fillRect(0, 0, 1, 1)
    const [r, g, b] = swatch.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return null // unavailable canvas: keep whatever the head script set
  }
}

function paintBrowserChrome(theme: 'light' | 'dark') {
  const scheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
  if (scheme) scheme.content = theme
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!themeColor) return
  // The same three inputs, in the same order, as the --paper declaration in
  // global.css. Keep them in step: this is the one place the mix is restated.
  const tokens = getComputedStyle(document.documentElement)
  const base = tokens.getPropertyValue('--paper-base').trim()
  const tint = tokens.getPropertyValue('--tod-tint').trim()
  const amount = parseFloat(tokens.getPropertyValue('--tod-amt')) || 0
  if (!base) return
  const hex = toHex(`color-mix(in oklab, ${base} ${100 - amount}%, ${tint || base})`) ?? toHex(base)
  if (hex) themeColor.content = hex
}

// -----------------------------------------------------------------------------
// APPLY + SYNC
// -----------------------------------------------------------------------------

/**
 * The single write. Everything that can change the sheet goes through here, so
 * the two attributes, the two meta tags, the header indicator and the colophon
 * can never disagree about what the page is currently showing.
 */
function applyBand(band: TimeBand, manual: boolean) {
  const theme = BAND_THEME[band]
  const root = document.documentElement
  root.dataset.tod = band
  root.dataset.theme = theme
  paintBrowserChrome(theme)
  syncControls(band, manual)
}

/** Repaint every control that states the current band. Called on every change
 *  and never at load — the initial state is rendered into the markup by
 *  index.html and src/sections/footer.ts, so the page arrives at its final
 *  geometry in the first paint and nothing shifts. */
function syncControls(band: TimeBand, manual: boolean) {
  // Colophon chips: `aria-pressed` marks what is SELECTED, which is not
  // necessarily the live hour — `.is-now` marks that, and it is baked into the
  // markup because the real hour does not change while the page is open.
  document
    .querySelectorAll<HTMLElement>('[data-tod-set]')
    .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.todSet === band)))

  // The sentence names whatever the paper is currently showing, so it stays true
  // during an override instead of insisting it is still the real hour.
  const name = document.querySelector<HTMLElement>('[data-tod-name]')
  if (name) name.textContent = BAND_LABEL[band]
  const manualMark = document.querySelector<HTMLElement>('[data-tod-manual]')
  if (manualMark) manualMark.hidden = !manual
  // The way back. Hidden while the clock is still in charge, because there is
  // nothing to return from.
  const reset = document.querySelector<HTMLElement>('[data-tod-auto]')
  if (reset) reset.hidden = !manual

  // The header indicator draws its band character and its sun/moon from the root
  // attributes in CSS, so there is nothing visual to write here — only the name,
  // which is the one part CSS cannot carry and the one part that also has to say
  // whether the clock is still in charge.
  const header = document.querySelector<HTMLElement>('[data-tod-cycle]')
  if (header) {
    const label = headerLabel(band, manual)
    header.setAttribute('aria-label', label)
    header.setAttribute('title', label)
  }
}

/** What the header button is called right now. It is a five-stop cycle, not a
 *  toggle, so the accessible name has to carry the current value: `aria-pressed`
 *  could only say "on" or "off" about a control with five states. */
export function headerLabel(band: TimeBand, manual: boolean): string {
  return `紙の色: ${BAND_LABEL[band]}（${manual ? '手動' : '観測時刻と連動'}）`
}

/** Take the choice. Persisted, and outranks the clock from here on. */
function chooseBand(band: TimeBand) {
  storeBand(band)
  applyBand(band, true)
}

/** Hand it back to the hour. */
function releaseToClock() {
  storeBand(null)
  applyBand(bandFor(new Date().getHours()), false)
}

/**
 * The header cycle: the four bands in order, then back to the clock.
 *
 * The brief asked for the four bands. The fifth stop is here because the header
 * is the control most readers will find first, and leaving the only way back to
 * the live hour at the bottom of the page would mean a reader who pressed this
 * once in the nav has silently switched the clock off for good.
 */
const CYCLE: readonly (TimeBand | null)[] = [...BANDS, null]

function cycle() {
  const at = CYCLE.indexOf(storedBand())
  const next = CYCLE[(at + 1) % CYCLE.length]
  if (next) chooseBand(next)
  else releaseToClock()
}

/**
 * The single write at load. Call before first paint so the paper is never
 * re-tinted under the reader (and so this can never contribute a shift).
 *
 * data-theme AND data-tod are ALSO set by an inline script in index.html <head>,
 * which is what keeps a night visit — or a stored choice — from painting the
 * wrong sheet first. Re-applying the same values here is a deliberate no-op.
 */
export function applyTimeOfDay(now: Date = new Date()): TimeBand {
  const stored = storedBand()
  const band = stored ?? bandFor(now.getHours())
  applyBand(band, stored !== null)
  wireControls()
  return band
}

// -----------------------------------------------------------------------------
// C4.1/C4.3 — MAKING THE LINK LEGIBLE
//
// The correction is a colour shift, which is exactly as loud as it should be —
// and that is also why nobody could tell what 観測日 was doing there. So there
// are now two places that say it out loud, sharing this module as their one
// source of truth:
//
//   • the header indicator, present from the first paint next to the sound
//     toggle, which names the current band and cycles on press. This is the one
//     that makes the feature discoverable at all: it is on screen before the
//     reader has scrolled anywhere.
//   • the colophon, which states the rule in a sentence and offers the four
//     bands as chips, plus the way back when a choice is in force.
//
// Wired by delegation from `document`, because this runs before main.ts injects
// the footer markup.
// -----------------------------------------------------------------------------
let wired = false
function wireControls() {
  if (wired) return
  wired = true
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null
    if (!target || typeof target.closest !== 'function') return

    // Native <button> throughout: Enter and Space already work, and the focus
    // ring comes from CSS. Nothing here needs a keydown handler.
    if (target.closest('[data-tod-cycle]')) {
      cycle()
      return
    }
    if (target.closest('[data-tod-auto]')) {
      releaseToClock()
      return
    }
    const chip = target.closest<HTMLElement>('[data-tod-set]')
    const band = chip?.dataset.todSet as TimeBand | undefined
    if (band && band in BAND_LABEL) chooseBand(band)
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
