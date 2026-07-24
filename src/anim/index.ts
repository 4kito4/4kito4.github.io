// =============================================================================
// MOTION LAYER — GSAP 3.15 (all plugins bundled) + Lenis smooth scroll.
//
// Discipline (see taste-skill §5, §6):
//   • transform / opacity only. No `window.addEventListener('scroll')`; scroll is
//     driven exclusively through Lenis -> ScrollTrigger.
//   • prefers-reduced-motion disables every scene via gsap.matchMedia; content
//     stays fully visible (no from-states are ever applied).
//   • FOUC guard: main.ts adds `.is-animating` to <html> before fonts load, which
//     hides only the hero copy; the intro timeline reveals it once fonts are ready.
// =============================================================================
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import Lenis from 'lenis'
import { createScrubSequence, createLoopSequence, seqUrls, type ScrubSequenceHandle } from './sequence'

const REVEAL_EASE = 'power3.out'

// Opening -> hero handoff coordinator. The hero entrance is built paused once
// fonts are ready, then played the instant the opening scrub crosses ~0.82 — so
// the name is already rising underneath the paper fade and is mid-flight by the
// time the pin releases (no dead beat between the two moments).
const heroHandoff = {
  play: null as (() => void) | null,
  fired: false,
  fire() {
    if (this.fired) return
    this.fired = true
    this.play?.()
  },
}

export function initMotion() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin)

  // Reduced motion: leave everything static and visible. `.is-animating` was never
  // added under reduce, so the hero is fully painted already.
  if (reduce) return

  // ---- Lenis <-> GSAP ticker sync (official pattern) ----------------------
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  // ---- Breakpoint-aware scroll scenes -------------------------------------
  const mm = gsap.matchMedia()
  mm.add(
    {
      isDesktop: '(min-width: 768px)',
      isMobile: '(max-width: 767px)',
    },
    (ctx) => {
      const { isDesktop } = ctx.conditions as { isDesktop: boolean; isMobile: boolean }

      // Scene 2 — hero scrub exit: name lifts + shrinks, mascot lags (parallax).
      // The hero now lives INSIDE the pinned #intro stage, so it cannot trigger
      // off itself (its own 'top top' resolves during the opening pin, which would
      // run this exit while the hero is still hidden behind the overlay). Instead
      // drive it off the ABOUT boundary — an unpinned section — so the span
      // 'top bottom' -> 'top top' maps exactly onto the hero scrolling out AFTER
      // the opening has released. Transform only; opacity stays owned by the intro
      // timeline so the name can never be pinned invisible.
      const heroEl = document.querySelector('.hero')
      const aboutEl = document.querySelector('#about')
      if (heroEl && aboutEl) {
        gsap.to('.hero__name', {
          yPercent: -14,
          scale: 0.94,
          transformOrigin: 'left top',
          ease: 'none',
          scrollTrigger: { trigger: aboutEl, start: 'top bottom', end: 'top top', scrub: true },
        })
        gsap.to('.hero__media', {
          yPercent: 22, // moves slower/behind the copy -> reads as parallax lag
          ease: 'none',
          scrollTrigger: { trigger: aboutEl, start: 'top bottom', end: 'top top', scrub: true },
        })
      }

      // Scene 3a — simple reveals (fade-up, once).
      gsap.utils.toArray<HTMLElement>('[data-animate="reveal"]').forEach((el) => {
        gsap.from(el, {
          y: 30,
          autoAlpha: 0,
          duration: 0.8,
          ease: REVEAL_EASE,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        })
      })

      // Scene 3b — container-based stagger for index rows.
      const staggerGroups = ['persona-item', 'activity-row']
      staggerGroups.forEach((key) => {
        const items = gsap.utils.toArray<HTMLElement>(`[data-animate="${key}"]`)
        if (!items.length) return
        gsap.set(items, { y: 30, autoAlpha: 0 })
        ScrollTrigger.batch(items, {
          start: 'top 85%',
          once: true,
          onEnter: (batch: Element[]) =>
            gsap.to(batch, {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              stagger: 0.09,
              ease: REVEAL_EASE,
            }),
        })
      })

      // Scene 4 — Works: signature horizontal pan on desktop, vertical reveal on mobile.
      const scene = document.querySelector<HTMLElement>('[data-works-scene]')
      const track = document.querySelector<HTMLElement>('[data-works-track]')
      let cleanupWorks: (() => void) | undefined

      if (isDesktop && scene && track) {
        // Canonical horizontal-pan skeleton (taste-skill §5.B): pin the wrapper,
        // scrub the inner track, recompute distance on refresh.
        scene.classList.add('is-pan')
        track.classList.add('is-horizontal')
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: scene,
            start: 'top top',
            end: () => '+=' + distance(),
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
        cleanupWorks = () => {
          scene.classList.remove('is-pan')
          track.classList.remove('is-horizontal')
          gsap.set(track, { clearProps: 'transform' })
        }
      } else {
        // Mobile fallback: normal stacked reveal for the work cards.
        const cards = gsap.utils.toArray<HTMLElement>(
          '[data-animate="work-feature"], [data-animate="work-card"]',
        )
        if (cards.length) {
          gsap.set(cards, { y: 30, autoAlpha: 0 })
          ScrollTrigger.batch(cards, {
            start: 'top 88%',
            once: true,
            onEnter: (batch: Element[]) =>
              gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: REVEAL_EASE }),
          })
        }
      }

      // Scene 7 — parallax on decorative leaves (data-parallax speed values).
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '0')
        if (!speed) return
        gsap.fromTo(
          el,
          { y: speed * 300 },
          {
            y: -speed * 300,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })

      return () => {
        cleanupWorks?.()
      }
    },
  )

  // ---- Scene 5 — seamless marquee (JS duplicates the track) ----------------
  buildMarquee()

  // ---- Scenes 9 & 10 — scroll-scrubbed image sequences ---------------------
  // Both run at every breakpoint (canvas scales to its box), so they live outside
  // the matchMedia scenes. They are already gated by the reduced-motion return.
  initImageSequences()

  // ---- Reveal safety net (Fix D) ------------------------------------------
  // The reveal / batch scenes hide their targets (autoAlpha:0 + y:30) until a
  // ScrollTrigger fires. If a refresh races with the pin-spacer insertions
  // (opening + works are created out of document order), a target can be left
  // stuck hidden — content that never appears. This net guarantees that any
  // reveal target which is within the viewport becomes visible, independent of
  // that timing. It self-disables once nothing hidden remains, so the scroll
  // handler costs nothing after the page has fully revealed.
  const revealSelector =
    '[data-animate="reveal"],[data-animate="persona-item"],[data-animate="activity-row"],' +
    '[data-animate="work-card"],[data-animate="work-feature"]'
  // Working set: each target is dropped once it is confirmed visible, so the
  // scroll handler stops measuring it (no per-frame reflow once revealed).
  let watch = gsap.utils.toArray<HTMLElement>(revealSelector)
  const sweepReveal = () => {
    if (watch.length === 0) return
    const vh = window.innerHeight
    watch = watch.filter((el) => {
      const cs = getComputedStyle(el)
      const hidden = cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.01
      if (!hidden) return false // already shown by its own ScrollTrigger — stop watching
      const r = el.getBoundingClientRect()
      if (r.top < vh && r.bottom > 0) {
        gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.5, ease: REVEAL_EASE, overwrite: 'auto' })
        return false // revealed here — stop watching
      }
      return true // still hidden and off-screen — keep watching
    })
  }
  lenis.on('scroll', sweepReveal)
  ScrollTrigger.addEventListener('refresh', sweepReveal)

  // ---- Font-dependent scenes: hero intro (SplitText) + draggable mascot ----
  document.fonts.ready.then(() => {
    const heroTl = heroIntro() // built paused; the opening scrub triggers play
    heroHandoff.play = () => heroTl.play()
    // Play now if there is no opening scrub to drive the handoff, or if the user
    // already scrolled it past the 0.82 mark while the fonts were still loading.
    const hasOpening = !!document.querySelector('#opening .opening__canvas')
    if (!hasOpening || heroHandoff.fired) heroTl.play()

    mascotDraggable(lenis)
    ScrollTrigger.refresh()
    document.documentElement.classList.remove('is-animating')
    // Backstop after layout settles: catch anything already in view that no
    // ScrollTrigger claimed (the `refresh` above also invokes sweepReveal).
    gsap.delayedCall(0.3, sweepReveal)
  })
}

// -----------------------------------------------------------------------------
// Scenes 9 & 10 — scroll-scrubbed Canvas image sequences (see src/anim/sequence).
//   9 (drop): full-screen opening, pinned above the hero (taste-skill §5.B). The
//     final drop frame is pure white, so a `--paper` overlay fades in over the
//     last 10% and hands the colour off to the cream hero seamlessly. All 120
//     frames preload immediately but off the critical path (frame 0 paints first).
//   10 (turn): About-section turntable, scrubbed while About crosses the viewport
//     (no pin). Frames preload only on approach; a frame-0 poster shows until then.
// -----------------------------------------------------------------------------
function initImageSequences(): ScrubSequenceHandle[] {
  const handles: ScrubSequenceHandle[] = []

  // Scene 9 — drop opening. Pins the WHOLE intro stage (hero + opening overlay)
  // and scrubs the drop sequence over the overlay; the overlay's opacity fades to
  // 0 across the final beats so the white end-frame dissolves into the hero
  // underneath (see #intro in index.html / .intro in global.css).
  const intro = document.querySelector<HTMLElement>('#intro')
  const opening = document.querySelector<HTMLElement>('#opening')
  const openingCanvas = opening?.querySelector<HTMLCanvasElement>('.opening__canvas')
  if (intro && opening && openingCanvas) {
    const hint = opening.querySelector<HTMLElement>('.opening__hint')
    handles.push(
      createScrubSequence({
        urls: seqUrls('/assets/seq/drop/drop_', 120),
        canvas: openingCanvas,
        preload: 'immediate',
        // Narrative pacing (Fix A): give the collision (frames ~35-50), the
        // recovery (~55-75) and the eye-zoom-to-white climax (~90-119) more of
        // the scroll distance than a flat mapping would, so the story reads.
        // Piecewise-linear control points map scroll progress -> frame progress.
        progressMap: makeBeatMap(DROP_BEATS),
        scrollTrigger: {
          trigger: intro,
          start: 'top top',
          // Restored to ~190% (Fix A): with the beat map the distance now feels
          // measured rather than rushed. `scrub: 1` keeps the smoothing.
          end: '+=190%',
          // Pin the intro STAGE, not just the opening — the hero must stay put
          // underneath so the fading overlay reveals it in place.
          pin: intro,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // This is the TOPMOST pin but it is created AFTER the Works pan pin
          // (which lives inside the matchMedia scenes above). A higher
          // refreshPriority forces this spacer to be inserted first on refresh,
          // so the Works pin measures its start with this spacer already in
          // place — without it the two pins race and the Works pin can end up
          // with a stale/zero start and never pin.
          refreshPriority: 1,
        },
        onUpdate: (p) => {
          // Seamless handoff (Fix C): fade the whole opening overlay out across
          // the final beats. By p=1 the overlay is fully transparent, so the
          // white climax has dissolved into the cream hero rising underneath —
          // the pin then releases on a continuous image. Held at 1 until 0.85 so
          // the eye-zoom-to-white climax (frames ~104-119) is never covered.
          opening.style.opacity = String(1 - clamp01((p - 0.85) / 0.15))
          // Hint pill fades out once the user has clearly started scrolling.
          if (hint) hint.style.opacity = String(clamp01((0.08 - p) / 0.06))
          // Hand off to the hero entrance during the fade, so the name is already
          // rising underneath as the overlay clears — not after the pin releases.
          if (p >= 0.82) heroHandoff.fire()
        },
      }),
    )
  }

  // Scene 10 — About turntable: autoplaying 2x-speed loop (20fps over a 10fps
  // extraction = 5s/rev), driven by gsap.ticker and only spinning while the
  // turntable is on-screen. Scrubbing was replaced because scrolling past it too
  // fast meant the rotation was never seen.
  const about = document.querySelector<HTMLElement>('#about')
  const turnCanvas = about?.querySelector<HTMLCanvasElement>('.about__turntable-canvas')
  if (about && turnCanvas) {
    const turntable = turnCanvas.closest<HTMLElement>('.about__turntable') ?? about
    handles.push(
      createLoopSequence({
        urls: seqUrls('/assets/seq/turn/turn_', 100),
        canvas: turnCanvas,
        trigger: turntable,
        fps: 20,
      }),
    )
  }

  return handles
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

// -----------------------------------------------------------------------------
// Beat map (Fix A) — narrative pacing for the drop sequence. Each control point
// is [scrollProgress, frameProgress]; makeBeatMap returns a monotonic piecewise-
// linear remap of scroll progress -> frame progress. Key story beats are given a
// WIDER scroll span than their frame count would linearly earn, so the collision,
// the recovery and the eye-zoom-to-white climax all get room to read. Both axes
// must be sorted ascending and span [0,1].
//
// Frames (0..119): 0-35 stand -> fall, 35-50 collision (dwell), 50-55 settle,
// 55-75 getting up (dwell), 75-90 rise into zoom, 90-119 eye zoom -> pure white.
type BeatPoint = readonly [scroll: number, frame: number]
const DROP_BEATS: readonly BeatPoint[] = [
  [0.0, 0.0],
  [0.12, 35 / 119], // brisk stand -> approach
  [0.3, 50 / 119], // collision: 15 frames over 18% of scroll — dwell on impact
  [0.37, 55 / 119], // quick settle
  [0.6, 75 / 119], // getting up: 20 frames over 23% — dwell on recovery
  [0.72, 90 / 119], // rise into the zoom
  [1.0, 1.0], // eye zoom -> white climax: 29 frames over 28% — most room
]

function makeBeatMap(points: readonly BeatPoint[]): (p: number) => number {
  return (p: number): number => {
    const x = clamp01(p)
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]
      const [x1, y1] = points[i]
      if (x <= x1) {
        const span = x1 - x0
        const t = span > 0 ? (x - x0) / span : 0
        return y0 + (y1 - y0) * t
      }
    }
    return 1
  }
}

// -----------------------------------------------------------------------------
// Scene 1 — entrance timeline. SplitText splits the name into chars behind a line
// mask; letters rise (yPercent 110 -> 0, power4.out). Order per brief:
// eyebrow -> name -> romaji -> sub -> CTA -> mascot.
// -----------------------------------------------------------------------------
function heroIntro(): gsap.core.Timeline {
  const nameEl = document.querySelector<HTMLElement>('.hero__name')
  // The hero lives *below* the pinned opening sequence, so it is off-screen at
  // load. Built paused and played by the opening->hero handoff at scrub ~0.82
  // (see heroHandoff) so the entrance overlaps the paper fade instead of firing
  // only after the pin releases. The `.from` states render at creation
  // (immediateRender), so the hero copy stays correctly hidden until play — the
  // FOUC guard can safely lift as soon as fonts are ready.
  const tl = gsap.timeline({
    defaults: { ease: 'power4.out' },
    paused: true,
  })

  let chars: Element[] = []
  if (nameEl) {
    // mask:'lines' wraps each rendered line in an overflow-clip mask.
    // aria:'auto' (default) keeps the original text on an aria-label for SR.
    const split = SplitText.create(nameEl, { type: 'lines,chars', mask: 'lines' })
    chars = split.chars
  }

  // Reveal the containers whose *children* (not the element itself) get animated.
  tl.set(['.hero__name', '.hero__cta'], { autoAlpha: 1 }, 0)
    .from('.hero__eyebrow', { y: 16, autoAlpha: 0, duration: 0.7 }, 0)

  if (chars.length) {
    tl.from(chars, { yPercent: 110, duration: 0.9, stagger: 0.028 }, 0.12)
  }

  tl.from('.hero__en', { y: 22, autoAlpha: 0, duration: 0.7 }, '-=0.45')
    .from('.hero__sub', { y: 22, autoAlpha: 0, duration: 0.7 }, '-=0.45')
    .from('.hero__cta > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, '-=0.4')
    .from('.hero__media', { y: 44, scale: 0.96, autoAlpha: 0, duration: 1, ease: 'power3.out' }, '-=0.75')

  return tl
}

// -----------------------------------------------------------------------------
// Scene 6 — mascot is grab-and-throwable (Draggable + InertiaPlugin); on release
// it springs elastically home. Idle micro-sway + grab cursor hint interactivity.
// -----------------------------------------------------------------------------
function mascotDraggable(lenis: Lenis) {
  const frame = document.querySelector<HTMLElement>('.hero__media-frame')
  const heroEl = document.querySelector<HTMLElement>('.hero')
  if (!frame || !heroEl) return

  frame.classList.add('is-draggable')

  const sway = gsap.to(frame, {
    rotation: 1.6,
    duration: 2.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    transformOrigin: '50% 90%',
  })

  const goHome = () => {
    gsap.to(frame, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 1.1,
      ease: 'elastic.out(1, 0.45)',
      onComplete: () => sway.restart(true),
    })
  }

  Draggable.create(frame, {
    type: 'x,y',
    bounds: heroEl,
    edgeResistance: 0.72,
    inertia: true,
    dragClickables: false,
    onPress: () => {
      sway.pause()
      lenis.stop() // don't let the page scroll while wrestling the mascot
    },
    onRelease: () => lenis.start(),
    onThrowComplete: goHome,
  })
}

// -----------------------------------------------------------------------------
// Scene 5 — marquee. Duplicate the track once so xPercent:-50 loops seamlessly.
// -----------------------------------------------------------------------------
function buildMarquee() {
  const track = document.querySelector<HTMLElement>('[data-animate="marquee"]')
  if (!track) return
  track.classList.add('is-marquee')
  track.innerHTML = track.innerHTML + track.innerHTML // duplicate set
  gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 })
}
