// Opening — full-screen signature moment. A scroll-scrubbed Canvas plays the
// "drop" sequence (mascot stands -> face-plants -> gets up -> zoom into the eye
// highlight -> final frame is pure white). The hero sits UNDERNEATH this overlay
// from the start; near the end the motion layer fades the WHOLE overlay's opacity
// to 0, so the white end-frame dissolves straight into the cream hero (already
// mid-entrance) — one continuous image, no paper overlay and no colour seam.
//
// Fully decorative: the section is aria-hidden and carries no essential content,
// so screen readers land straight on the hero. Under reduced motion it is
// removed via `display:none` (see global.css) and the page begins at the hero.
export const openingHTML = /* html */ `
  <div class="opening__stage">
    <!-- Frame 0 as a real <img>: instant first paint (fetchpriority high) and a
         graceful fallback if the canvas/JS never initialises. The canvas draws
         over it the moment frame 0 decodes. -->
    <img
      class="opening__poster"
      src="/assets/seq/drop/drop_000.webp"
      alt=""
      width="960"
      height="540"
      fetchpriority="high"
      decoding="async"
    />
    <canvas class="opening__canvas"></canvas>
    <!-- Colour melt: a flat --paper layer that ramps up over the canvas across
         the final drawn frames, so the sequence's white climax resolves to the
         THEME's paper colour (cream in light, sumi in dark) before the overlay
         itself fades. Without it, dark mode showed a white-to-dark colour gap. -->
    <div class="opening__melt"></div>

    <p class="opening__hint">
      <span class="opening__hint-pill">スクロールで始める</span>
    </p>
  </div>
`
