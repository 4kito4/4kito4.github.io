// =============================================================================
// JAPANESE LINE BREAKING — BudouX (Google, Apache-2.0)
//
// WHY A LIBRARY AND NOT MORE CSS
// Japanese has no spaces, so the browser's only rule is "break between almost
// any two characters". `line-break: strict` and `text-wrap: pretty/balance`
// (already in global.css) narrow that down but cannot express the one thing that
// actually matters for readability: a line may only break at a 文節 (phrase)
// boundary. Every remaining complaint about the copy — a word split down the
// middle, a two-character orphan hanging on the last line, a title breaking as
// 「プラットフォ / ーム」 — is the same root cause, and hand-placing
// `white-space: nowrap` spans is a per-string patch that has to be re-verified at
// every viewport width. BudouX is Google's phrase-segmentation model for exactly
// this job: ~15 kB of model data, no network, no build step, runs synchronously.
//
// HOW IT IS APPLIED
// BudouX's `HTMLProcessor` walks a live element, segments the *rendered* text
// (across inline markup, not per text node), and inserts U+200B ZERO WIDTH SPACE
// at each phrase boundary. The containing block then gets the `bdx` class, which
// carries `word-break: keep-all; overflow-wrap: anywhere` — keep-all removes the
// browser's between-any-two-kana break opportunities, so the ZWSPs BudouX
// inserted are the ONLY places a line can break, and `anywhere` is the escape
// hatch that keeps a phrase wider than its column from overflowing instead.
//
// COEXISTENCE WITH THE EXISTING RULES (all three are kept, none is replaced)
//   • `.nb` (white-space: nowrap) — BudouX classifies a nowrap element as
//     NoBreak: its text still feeds the model as context, but it is never split,
//     and a phrase boundary landing on its edge is preserved. So every hand-tuned
//     `.nb` in the markup keeps working exactly as before.
//   • `line-break: strict` — still the authority on 禁則 for the break
//     opportunities that remain.
//   • `text-wrap: pretty / balance` — still chooses *which* of the now-restricted
//     opportunities to use, which is what removes the last-line orphans.
//
// SPLITTEXT COEXISTENCE (the one hard exclusion)
// GSAP SplitText re-writes its target into one <span> per character. Running it
// over BudouX output would produce a character span for each invisible ZWSP,
// which lands in the stagger as a phantom glyph and, worse, means the mask
// wrapper is measured against text the reader cannot see. The two never need to
// meet: every SplitText target on this page is a short display string that
// cannot wrap in the first place (the hero name is two explicit block rows, the
// section headings are 2-4 characters, the hero motto is a nowrap tategaki
// spine). So SplitText targets are excluded from BudouX outright — see
// SPLIT_TEXT_GUARD, which is enforced with `closest()` rather than by hoping the
// selector lists stay disjoint.
// =============================================================================
import { HTMLProcessingParser, jaModel } from 'budoux'

/** U+200B, the boundary marker BudouX inserts (and `phrase()` joins with). */
const ZWSP = '​'

/**
 * `className` instead of the default inline style: the wrap rules live in
 * global.css next to the rest of the line-break block, and BudouX uses the same
 * class as its own "already processed" marker, which makes re-application (a
 * dossier panel opened twice) a no-op instead of a double-segmentation.
 */
const parser = new HTMLProcessingParser(jaModel, { className: 'bdx' })

/**
 * Everything on the page that is running Japanese copy. Deliberately an explicit
 * list rather than "every element with text": short Latin labels, chips and
 * marquee items are already `white-space: nowrap` and gain nothing, and an
 * indiscriminate sweep would put ZWSPs into strings that are read back out by
 * other code (the rollover labels clone `textContent`).
 */
const TARGETS = [
  // hero
  '.hero__sub',
  // shared editorial lead (about + activity)
  '.lead',
  // about
  '.persona__title',
  '.persona__list li', // its nested .persona__note is a block, handled as its own paragraph
  '.about__aside dd',
  // activity
  '.role__title',
  '.role__desc',
  // works
  '.work__title',
  '.work__desc',
  '.work__flag',
  '.work__status',
  // works dossier panels (created on demand — see applyLineBreaks(root))
  '.dossier__lead',
  '.dossier__h',
  '.dossier__p',
  '.dossier__list li',
  '.dossier__dl dd',
  '.dossier__example',
  '.dossier__cap',
  // footer
  '.footer__big',
  '.footer__note',
  '.footer__sendoff-line',
  '.colophon dd',
].join(',')

/** Targets of GSAP SplitText — never segmented (see the header note). */
const SPLIT_TEXT_GUARD = '[data-animate="split-h"],.hero__name,.hero__vlabel'

/**
 * Segment every Japanese copy block inside `root` at 文節 boundaries.
 *
 * Idempotent (BudouX skips anything already carrying `bdx`), synchronous, and
 * called BEFORE the motion layer initialises — so it runs before first paint and
 * before SplitText/rollover read any `textContent`. No layout shift: the
 * inserted characters are zero-width and the wrap rules only change *where* a
 * line may break, never the box model.
 */
export function applyLineBreaks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
    if (el.closest(SPLIT_TEXT_GUARD)) return
    parser.applyToElement(el)
  })
}

/**
 * Segment a bare string. For text that is written into the DOM at runtime and
 * replaced again later (the companion's speech bubble), where the class-based
 * marker above would make the second line a no-op. The receiving element must
 * carry the `bdx` wrap rules itself — `.companion__bubble` does, in CSS.
 */
export function phrase(text: string): string {
  return parser.parse(text).join(ZWSP)
}
