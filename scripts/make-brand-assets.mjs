// =============================================================================
// BRAND ASSETS (p5) — og:image + favicons
//
// Both are generated from assets this project already owns, so there is no second
// source of truth for what the page looks like: the mascot art comes from
// public/assets, and the type is set in the site's own faces (Zen Kaku Gothic New
// / Outfit) read straight out of the @fontsource sources.
//
// Type is converted to OUTLINES with fontkit rather than handed to librsvg as
// <text>. librsvg resolves fonts through fontconfig, which on any machine that
// builds this would fall back to whatever system Japanese face exists (Yu Gothic
// on Windows, Hiragino on macOS, something else in CI) — the card would be set in
// a different typeface depending on who ran the script. Outlines make the output
// byte-identical everywhere and let the card use the real display face, which is
// the whole point of a card that has the name on it.
//
//   node scripts/make-brand-assets.mjs
//
// Writes:
//   public/og.jpg            1200x630  OGP / Twitter summary_large_image
//   public/favicon-32.png      32x32   browser tab
//   public/apple-touch-icon.png 180x180 iOS home screen
//   public/icon-512.png       512x512  Android / PWA / high-DPI
// =============================================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as fontkit from 'fontkit'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUB = join(ROOT, 'public')
const ASSETS = join(PUB, 'assets')

const ZEN = fontkit.openSync(
  join(ROOT, 'node_modules/@fontsource/zen-kaku-gothic-new/files/zen-kaku-gothic-new-japanese-900-normal.woff2'),
)
const ZEN_700 = fontkit.openSync(
  join(ROOT, 'node_modules/@fontsource/zen-kaku-gothic-new/files/zen-kaku-gothic-new-japanese-700-normal.woff2'),
)
const OUTFIT_700 = fontkit.openSync(
  join(ROOT, 'node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff2'),
)

// Palette — the light-theme tokens from src/styles/global.css, day band.
const PAPER = '#f4eee1'
const INK = '#211b13'
const INK_SOFT = '#4f4535'
const MAPLE = '#c7461c'
const MAPLE_INK = '#a5380f'
const LINE = '#d7c9ac'

/**
 * One line of text as SVG <path> outlines.
 * `x`/`y` are the pen origin and the BASELINE, matching how type is actually set.
 * `tracking` is in em, the same unit the stylesheet uses for letter-spacing.
 */
function textPaths(font, text, { x, y, size, fill, tracking = 0 }) {
  const s = size / font.unitsPerEm
  const run = font.layout(text)
  const out = []
  let pen = 0
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i]
    const d = glyph.path.toSVG()
    if (d) {
      const gx = x + (pen + (pos.xOffset || 0)) * s
      const gy = y - (pos.yOffset || 0) * s
      out.push(`<path d="${d}" fill="${fill}" transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${s.toFixed(6)} ${(-s).toFixed(6)})"/>`)
    }
    pen += pos.xAdvance + tracking * font.unitsPerEm
  })
  return { svg: out.join(''), width: pen * s }
}

function measure(font, text, size, tracking = 0) {
  const run = font.layout(text)
  let pen = 0
  run.positions.forEach((p) => { pen += p.xAdvance + tracking * font.unitsPerEm })
  return (pen * size) / font.unitsPerEm
}

// -----------------------------------------------------------------------------
// OG IMAGE — 1200x630
//
// Same editorial split as the hero: copy on the left, mascot on the right, one
// maple rule. It is read at ~500px wide in a Discord embed and as a thumbnail in
// a search result, so there are exactly four things on it and the name is the
// biggest by a wide margin.
// -----------------------------------------------------------------------------
async function buildOG() {
  const W = 1200
  const H = 630
  const PAD = 88

  const eyebrow = 'GOOGLE AI STUDENT COMMUNITY / AMBASSADOR'
  const parts = []

  parts.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`)
  // Maple bar down the left edge — the page's single accent, used once.
  parts.push(`<rect x="0" y="0" width="14" height="${H}" fill="${MAPLE}"/>`)

  parts.push(textPaths(OUTFIT_700, eyebrow, {
    x: PAD, y: 150, size: 21, fill: MAPLE_INK, tracking: 0.1,
  }).svg)

  parts.push(textPaths(ZEN, '長谷川耀俊', { x: PAD - 6, y: 292, size: 116, fill: INK, tracking: 0.01 }).svg)

  const en = textPaths(OUTFIT_700, 'Hasegawa Akitoshi ', { x: PAD, y: 356, size: 36, fill: INK_SOFT, tracking: -0.01 })
  parts.push(en.svg)
  parts.push(textPaths(OUTFIT_700, '/ Aki_Ha', { x: PAD + en.width, y: 356, size: 36, fill: MAPLE_INK, tracking: -0.01 }).svg)

  parts.push(`<rect x="${PAD}" y="404" width="120" height="3" fill="${LINE}"/>`)

  parts.push(textPaths(ZEN_700, '化学工学 × 生成AI', { x: PAD, y: 476, size: 34, fill: INK_SOFT, tracking: 0.02 }).svg)
  parts.push(textPaths(ZEN_700, 'つくって、つなげる', { x: PAD, y: 528, size: 34, fill: INK_SOFT, tracking: 0.02 }).svg)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`

  // The mascot alone. The star charm was tried alongside it and read as a second
  // head-star floating in the margin — the character already wears one.
  const mascot = await sharp(join(ASSETS, 'aki_ha_body_front.png')).resize({ height: 452 }).toBuffer()
  const mascotMeta = await sharp(mascot).metadata()

  await sharp(Buffer.from(svg))
    .composite([
      { input: mascot, left: W - 118 - mascotMeta.width, top: H - 84 - mascotMeta.height },
    ])
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(join(PUB, 'og.jpg'))
}

// -----------------------------------------------------------------------------
// FAVICONS
//
// The mascot, not the star charm: at 32px the star loses its outline against a
// light tab bar, while the round yellow body with two large star-eyes keeps a
// silhouette that is still readable. Cream plate behind it (the page's own paper)
// rather than transparency, so the icon does not dissolve into a dark tab strip.
// -----------------------------------------------------------------------------
async function buildIcons() {
  const src = join(ASSETS, 'aki_ha_body_front.png')

  const make = async (size, out, { radius = 0, inset = 0.1 } = {}) => {
    const inner = Math.round(size * (1 - inset * 2))
    const art = await sharp(src)
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()
    const plate = radius
      ? Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${PAPER}"/></svg>`,
        )
      : Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${PAPER}"/></svg>`,
        )
    await sharp(plate)
      .composite([{ input: art, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
      .png({ palette: true, quality: 95, effort: 10 })
      .toFile(join(PUB, out))
  }

  // 32px: almost no inset, every pixel of silhouette counts.
  await make(32, 'favicon-32.png', { inset: 0.04 })
  // iOS draws its own rounded mask and does not like transparency; a flat plate
  // with the platform's usual breathing room.
  await make(180, 'apple-touch-icon.png', { inset: 0.11 })
  await make(512, 'icon-512.png', { inset: 0.11, radius: 96 })
}

if (!existsSync(join(ASSETS, 'aki_ha_body_front.png'))) {
  throw new Error('missing source asset: aki_ha_body_front.png')
}

await buildOG()
await buildIcons()

const report = ['og.jpg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png'].map((f) => {
  const b = readFileSync(join(PUB, f))
  return { file: f, bytes: b.length, kB: (b.length / 1024).toFixed(1) }
})
console.table(report)
