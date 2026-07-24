// Opening — full-screen signature moment. A scroll-scrubbed Canvas plays the
// "drop" sequence (mascot stands -> face-plants -> gets up -> zoom into the eye
// highlight -> final frame is pure white). The motion layer pins this above the
// hero and cross-fades a paper overlay in the last 10% so the white end-frame
// hands off to the cream hero with no colour seam.
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
    <div class="opening__paper"></div>

    <p class="opening__hint">
      <span class="opening__hint-pill">スクロールで始める</span>
    </p>
  </div>
`
