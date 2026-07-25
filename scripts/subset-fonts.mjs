// =============================================================================
// FONT SUBSETTING (p5)
//
// WHY THIS EXISTS
// The page ships two self-hosted families. Pulled in via @fontsource's default
// per-weight CSS, that cost 601 kB of stylesheet (254 kB gzipped) — almost all of
// it `unicode-range` declarations for 100+ dynamic slices of Zen Kaku Gothic New
// — plus 462 woff2 + 462 woff files in dist. The stylesheet is render-blocking,
// so that CSS was the single largest thing standing between the reader and LCP.
//
// This script replaces the whole arrangement with one woff2 per (family, weight),
// containing only the glyphs this site can ever draw. The generated files land in
// public/fonts/ and are declared by hand in src/styles/global.css — no
// unicode-range, no slice table, no @fontsource import.
//
// HOW THE CHARACTER SET IS DERIVED
// Three sources, unioned:
//   1. index.html          — the static shell, HTML comments stripped.
//   2. src/**/*.ts         — every module that emits markup or text. JS block
//                            comments and comment-only lines are stripped first,
//                            so the prose in this codebase's (extensive) comments
//                            does not drag hundreds of kanji into the payload;
//                            what survives is code (ASCII) + string literals,
//                            which is exactly the text the page can render.
//   3. ALWAYS (below)      — the safety floor. Everything the page composes at
//                            RUNTIME rather than quotes literally: the colophon's
//                            observation stamp (any future YYYY.MM.DD HH:MM), the
//                            curtain's decode tally, and the full kana blocks so
//                            no dynamic Japanese can ever hit a missing glyph.
//
// Because (1) and (2) are the only places rendered text comes from, the union is
// a superset of what the DOM can hold — the extraction cannot silently miss a
// string. It is verified anyway: `npm run check:fonts` re-derives the set and
// fails if any generated font is stale or under-covered.
//
// THE ARROW
// U+2192 (→, the hero CTA and the works pan cursor) is NOT in Google's "japanese"
// aggregate subset that @fontsource ships as the full face, though it does appear
// in one of the numbered dynamic slices. It is therefore cut from that slice into
// its own ~1 kB face, declared with `unicode-range: U+2192` so a browser fetches
// it only when the arrow is actually drawn. This is the one place a unicode-range
// survives, and it is a glyph-availability fact, not a slicing strategy.
//
// USAGE
//   node scripts/subset-fonts.mjs            # generate
//   node scripts/subset-fonts.mjs --check    # verify only, non-zero on drift
// =============================================================================
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'fonts')
const ZEN_DIR = join(ROOT, 'node_modules', '@fontsource', 'zen-kaku-gothic-new', 'files')
const OUTFIT_DIR = join(ROOT, 'node_modules', '@fontsource', 'outfit', 'files')

const CHECK_ONLY = process.argv.includes('--check')

// -----------------------------------------------------------------------------
// TARGETS
//
// Weights are the ones the page can actually resolve to, verified against the
// live DOM (walk every text node, read its computed font-family + font-weight):
//
//   Zen Kaku Gothic New  500 body · 700 nav/labels · 900 display
//     — 400 was imported and never rendered anywhere; dropped.
//     — 600 is requested by `.chip` (a --font-en rule whose Japanese text falls
//       through Outfit to Zen Kaku); CSS font matching resolves it to 700.
//   Outfit               600 chips · 700 buttons/kickers · 800 marks
//     — 500 is requested by `.footer__meta` and has always resolved up to 600,
//       which is the appearance being preserved. Not adding a 500 face keeps it
//       byte-identical to what shipped before.
// -----------------------------------------------------------------------------
const TARGETS = [
  { out: 'zen-kaku-500.woff2', src: join(ZEN_DIR, 'zen-kaku-gothic-new-japanese-500-normal.woff2'), set: 'all' },
  { out: 'zen-kaku-700.woff2', src: join(ZEN_DIR, 'zen-kaku-gothic-new-japanese-700-normal.woff2'), set: 'all' },
  { out: 'zen-kaku-900.woff2', src: join(ZEN_DIR, 'zen-kaku-gothic-new-japanese-900-normal.woff2'), set: 'all' },
  { out: 'outfit-600.woff2', src: join(OUTFIT_DIR, 'outfit-latin-600-normal.woff2'), set: 'latin' },
  { out: 'outfit-700.woff2', src: join(OUTFIT_DIR, 'outfit-latin-700-normal.woff2'), set: 'latin' },
  { out: 'outfit-800.woff2', src: join(OUTFIT_DIR, 'outfit-latin-800-normal.woff2'), set: 'latin' },
  // The arrow, cut from the one slice that carries it. See "THE ARROW" above.
  { out: 'zen-kaku-arrow-700.woff2', src: join(ZEN_DIR, 'zen-kaku-gothic-new-107-700-normal.woff2'), set: 'arrow' },
]

const ARROW = '→'

// -----------------------------------------------------------------------------
// SAFETY FLOOR — characters the page can compose at runtime and therefore never
// spells out in any source file. Cheap in bytes, and the difference between a
// stable page and one that drops a glyph on 2027.11.03 at 07:05.
// -----------------------------------------------------------------------------
function alwaysChars() {
  const out = []
  const range = (a, b) => { for (let c = a; c <= b; c++) out.push(String.fromCodePoint(c)) }

  range(0x20, 0x7e)   // ASCII printable — digits, ':', '.', '/', '-' for the stamp
  range(0x3041, 0x309f) // hiragana (full block)
  range(0x30a0, 0x30ff) // katakana (full block, incl. ー and ・)
  range(0x3000, 0x303f) // CJK punctuation: 、。「」『』（）〜 …
  range(0xff01, 0xff5e) // fullwidth forms: ！？（）：／ and ０-９

  // Symbols the design uses or may use, plus the units a colophon reaches for.
  out.push(...'©®°×÷±–—…‥•·※→←↑↓')
  // Date/time words, in case the stamp format ever moves to Japanese units.
  out.push(...'年月日時分秒曜午前後西暦令和')

  return out
}

// -----------------------------------------------------------------------------
// EXTRACTION
// -----------------------------------------------------------------------------
function walkTs(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkTs(p, acc)
    else if (name.endsWith('.ts')) acc.push(p)
  }
  return acc
}

/** Strip what is definitely commentary, and nothing that could be content. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')  // JS block comments (incl. the /* html */ tag)
    .replace(/^\s*\/\/.*$/gm, ' ')      // comment-ONLY lines; a trailing // after
                                        // code is left alone so a URL in a string
                                        // can never be truncated
    .replace(/<!--[\s\S]*?-->/g, ' ')   // HTML comments inside template literals
}

export function buildCharset() {
  const chars = new Set(alwaysChars())

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, ' ')
  for (const c of html) chars.add(c)

  for (const file of walkTs(join(ROOT, 'src'))) {
    for (const c of stripComments(readFileSync(file, 'utf8'))) chars.add(c)
  }

  chars.delete('\n'); chars.delete('\r'); chars.delete('\t')
  chars.delete('​') // BudouX's zero-width boundary: never drawn
  chars.delete(' ')
  chars.add(' ')         // ...but a real space glyph is wanted

  return Array.from(chars).filter((c) => c.codePointAt(0) >= 0x20).sort().join('')
}

// -----------------------------------------------------------------------------
// RUN
// -----------------------------------------------------------------------------
const ALL = buildCharset()
// Outfit is a latin family; asking harfbuzz for 6 000 kanji it does not have is
// harmless but the intent is clearer stated than inferred.
const LATIN = Array.from(ALL).filter((c) => c.codePointAt(0) < 0x2600).join('')

const SETS = { all: ALL, latin: LATIN, arrow: ARROW }

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const rows = []
let drift = false

for (const t of TARGETS) {
  const source = readFileSync(t.src)
  const subset = await subsetFont(source, SETS[t.set], { targetFormat: 'woff2' })
  const dest = join(OUT_DIR, t.out)

  const prior = existsSync(dest) ? readFileSync(dest) : null
  // woff2 encoding is deterministic for a fixed input, so a byte compare is a
  // sound staleness check.
  const same = prior !== null && prior.equals(subset)

  if (CHECK_ONLY) {
    if (!same) {
      drift = true
      console.error(`[subset-fonts] STALE: ${t.out} (run \`npm run fonts\`)`)
    }
  } else if (!same) {
    writeFileSync(dest, subset)
  }

  rows.push({
    file: t.out,
    source: `${(source.length / 1024).toFixed(1)} kB`,
    subset: `${(subset.length / 1024).toFixed(1)} kB`,
    saved: `${(100 - (subset.length / source.length) * 100).toFixed(1)} %`,
  })
}

if (CHECK_ONLY) {
  if (drift) process.exit(1)
  console.log(`[subset-fonts] up to date (${Array.from(ALL).length} glyphs requested)`)
} else {
  console.log(`[subset-fonts] charset: ${Array.from(ALL).length} characters`)
  console.table(rows)
  console.log(`[subset-fonts] wrote ${relative(ROOT, OUT_DIR)}`)
}
