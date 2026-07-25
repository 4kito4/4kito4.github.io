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
import { initCompanion } from './companion'

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

// Re-checked after layout settles: the browser can apply scroll restoration
// asynchronously, so the position at init is not final. Set by the opening scene.
const openingLifecycle = {
  guardScrollPosition: null as (() => void) | null,
}

/** Run an optional scene without letting its failure take the page down with it. */
function safely(fn: () => void) {
  try {
    fn()
  } catch (err) {
    console.error('[motion] scene failed', err)
  }
}

export function initMotion() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin)

  // Reduced motion: leave everything static and visible. `.is-animating` was never
  // added under reduce, so the hero is fully painted already. The companion is
  // still built — the concept's resident character is content, not motion — but
  // as a still portrait with no behaviour at all (see initCompanion).
  if (reduce) {
    safely(() => initCompanion({ reduce: true }))
    return
  }

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
        // Tell the custom cursor this region reads horizontally.
        scene.dataset.cursor = 'pan'
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
          delete scene.dataset.cursor
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
    sweepHeadings()
  }
  lenis.on('scroll', sweepReveal)
  ScrollTrigger.addEventListener('refresh', sweepReveal)

  // ---- Pointer-driven scenes (no font dependency) --------------------------
  initRollover()
  initMagnetic()
  initCustomCursor()

  // ---- C1 — the resident companion (see src/anim/companion.ts) -------------
  // Isolated behind `safely` because it is the newest and most stateful scene on
  // the page: if it ever throws, the rest of the motion layer (and therefore the
  // whole document) must still come up.
  safely(() => initCompanion({ reduce: false, lenis }))

  // ---- Font-dependent scenes: hero intro (SplitText) + hero mascot sway ----
  document.fonts.ready.then(() => {
    const heroTl = heroIntro() // built paused; the opening scrub triggers play
    heroHandoff.play = () => heroTl.play()
    // Play now if there is no opening scrub to drive the handoff, or if the user
    // already scrolled it past the 0.82 mark while the fonts were still loading.
    const hasOpening = !!document.querySelector('#opening .opening__canvas')
    if (!hasOpening || heroHandoff.fired) heroTl.play()

    // SplitText measures glyph boxes, so both of these must wait for the webfonts.
    splitHeadings()
    mottoGlow()

    heroMascotSway()
    ScrollTrigger.refresh()
    document.documentElement.classList.remove('is-animating')
    // Backstop after layout settles: catch anything already in view that no
    // ScrollTrigger claimed (the `refresh` above also invokes sweepReveal), and
    // re-check the opening against the (possibly restored) scroll position.
    gsap.delayedCall(0.3, () => {
      sweepReveal()
      openingLifecycle.guardScrollPosition?.()
    })
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
    const guide = opening.querySelector<HTMLElement>('.opening__guide')
    const prompt = opening.querySelector<HTMLElement>('.guide__prompt')
    const bar = opening.querySelector<HTMLElement>('.guide__bar')
    const barFill = opening.querySelector<HTMLElement>('.guide__bar-fill')
    const melt = opening.querySelector<HTMLElement>('.opening__melt')

    // ---- OVERLAY LIFECYCLE (p3.9) ------------------------------------------
    // HARD RULE: the overlay must never be able to sit on top of the page. It is
    // a decorative curtain over the real hero, so a stuck overlay hides the whole
    // site (a near-black sheet in dark mode, a dim veil at partial opacity).
    // Disappearance is therefore guaranteed by guards that do NOT depend on the
    // image sequence loading at all — correctness beats the pretty melt.
    let retired = false
    let watchdogId = 0
    let lastDrawn = -1

    const clearWatchdog = () => {
      if (watchdogId) {
        clearTimeout(watchdogId)
        watchdogId = 0
      }
    }

    /** Paint the overlay for a given drawn frame (the normal, pretty path). */
    const applyForFrame = (drawn: number) => {
      if (melt) {
        melt.style.opacity = String(
          clamp01((drawn - HANDOFF.meltStart) / (HANDOFF.meltEnd - HANDOFF.meltStart)),
        )
      }
      opening.style.opacity = String(
        1 - clamp01((drawn - HANDOFF.meltEnd) / (HANDOFF.fadeEnd - HANDOFF.meltEnd)),
      )
    }

    /** Retire the overlay for good (until an explicit re-arm). Fades within
     *  `durationMs`, then takes it out of the layer entirely.
     *
     *  Deliberately driven by a CSS transition + setTimeout rather than gsap:
     *  this is the safety net, so it must not depend on the very animation loop
     *  that may itself be stalled (a paused/throttled rAF, a ticker starved by a
     *  background tab, or a gsap failure). CSS + timers keep working regardless. */
    const retireOverlay = (durationMs = 350) => {
      if (retired) return
      retired = true
      clearWatchdog()
      // Melt to flat paper first, so when the frames DID arrive the fade is still
      // paper-over-paper. When they didn't, a brief blink beats a stuck sheet.
      if (melt) melt.style.opacity = '1'
      gsap.killTweensOf(opening)
      opening.style.transition = durationMs > 0 ? `opacity ${durationMs}ms ease-out` : ''
      opening.style.opacity = '0'
      window.setTimeout(() => {
        if (!retired) return
        opening.style.visibility = 'hidden'
        opening.style.transition = ''
      }, durationMs + 60)
    }

    /** Re-arm when the user scrolls back UP into the sequence. Only ever called
     *  from onEnterBack, so a retired overlay can never resurrect on its own. */
    const rearmOverlay = () => {
      if (!retired) return
      retired = false
      gsap.killTweensOf(opening)
      opening.style.transition = ''
      opening.style.visibility = ''
      if (lastDrawn >= 0) applyForFrame(lastDrawn)
      else {
        if (melt) melt.style.opacity = '0'
        opening.style.opacity = '1'
      }
    }

    // Guard (c) — scroll restoration. If the browser restores a mid-page scroll
    // position, the pin may never run its update cycle, so nothing would ever
    // fade the overlay out. Past the intro's scroll span there is no sequence
    // left to show: retire it instantly, with no fade.
    const introScrollSpan = () => window.innerHeight * 1.9
    const guardScrollPosition = () => {
      if (!retired && window.scrollY > introScrollSpan()) retireOverlay(0)
    }
    guardScrollPosition()
    openingLifecycle.guardScrollPosition = guardScrollPosition

    // ---- SCROLL GUIDANCE (p4a, reworked p4b) --------------------------------
    // The intro is a pinned scrub: nothing happens until the reader scrolls, and
    // a still first frame gives them no reason to believe scrolling is the point.
    // Cues, escalating, all retired on the first real scroll:
    //   t+0.0s  the arrow + instruction are already on screen
    //   t+1.2s  a TEASER: the sequence plays frames 0 -> 10 -> 0 as one smooth
    //           sine move (~1.6s). This is the strongest cue by far, because it
    //           demonstrates the thing rather than describing it. Repeats every
    //           4s of continued inactivity.
    //   t+3.0s  the prompt takes a soft emphasis pulse
    // A hairline bar tracks progress through the pinned span, because the pin
    // hides what the native scrollbar would otherwise say about how long this is.
    //
    // p4b: the first version oscillated frames 0-6 continuously, which read as a
    // twitch rather than a playback. A single clean out-and-back over a wider
    // frame range is legible as motion, and the pause between repeats keeps it
    // from becoming ambient noise.
    const TEASER = { delayMs: 1200, repeatMs: 4000, toFrame: 10, halfDur: 0.8 }
    let started = false
    let teaser: gsap.core.Timeline | null = null
    let nudgeTimer = 0
    let repeatTimer = 0
    let urgeTimer = 0
    const idleDrive = { f: 0 }

    const stopGuidance = () => {
      if (started) return
      started = true
      window.clearTimeout(nudgeTimer)
      window.clearTimeout(repeatTimer)
      window.clearTimeout(urgeTimer)
      teaser?.kill()
      teaser = null
      // Leave the canvas on frame 0 so the scrub starts from the true first frame.
      dropHandle?.setFrame?.(0)
      prompt?.classList.remove('is-urging')
      guide?.classList.add('is-started')
      window.removeEventListener('wheel', stopGuidance)
      window.removeEventListener('touchstart', stopGuidance)
      window.removeEventListener('keydown', stopGuidance)
    }
    // Direct input listeners as a belt for the progress check below (they are
    // input events, not scroll events — the scroll ban in §5.D still holds).
    window.addEventListener('wheel', stopGuidance, { passive: true, once: true })
    window.addEventListener('touchstart', stopGuidance, { passive: true, once: true })
    window.addEventListener('keydown', stopGuidance, { once: true })

    const playTeaser = () => {
      if (started) return
      teaser?.kill()
      const draw = () => dropHandle?.setFrame?.(idleDrive.f)
      teaser = gsap
        .timeline({
          onComplete: () => {
            if (started) return
            repeatTimer = window.setTimeout(playTeaser, TEASER.repeatMs)
          },
        })
        .to(idleDrive, { f: TEASER.toFrame, duration: TEASER.halfDur, ease: 'sine.inOut', onUpdate: draw })
        .to(idleDrive, { f: 0, duration: TEASER.halfDur, ease: 'sine.inOut', onUpdate: draw })
    }

    const armGuidance = () => {
      if (started || window.scrollY > 4) return
      nudgeTimer = window.setTimeout(playTeaser, TEASER.delayMs)
      urgeTimer = window.setTimeout(() => {
        if (!started) prompt?.classList.add('is-urging')
      }, 3000)
    }
    if (document.documentElement.classList.contains('is-loaded')) armGuidance()
    else window.addEventListener('akiha:loaded', armGuidance, { once: true })

    const dropHandle = createScrubSequence({
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
        // Guard (a) — the pin has been passed. Whatever the sequence managed to
        // load, the curtain is done: retire it. This is the single most
        // important guarantee, and it is entirely independent of image loading.
        onLeave: () => retireOverlay(300),
        // Scrolling back up into the sequence brings the curtain back.
        onEnterBack: () => rearmOverlay(),
      },
      // FRAME-KEYED HANDOFF (p3.8). The fade is driven by `drawn` — the frame
      // actually painted on the canvas — never by scroll progress. Under scrub
      // smoothing and load latency the progress runs ahead of the pixels, so a
      // progress-keyed fade began while a DARK iris frame was still on screen,
      // producing the muddy half-transparent overlap. Keying to drawn pixels
      // makes the handoff correct at any scroll speed.
      onUpdate: (p, _wanted, drawn) => {
        lastDrawn = drawn

        // First real movement retires every pre-scroll cue (idle micro-motion,
        // urge pulse, listeners) — the reader has understood the interaction.
        if (p > 0.002) stopGuidance()

        // The prompt leaves as soon as scrolling has clearly begun; the progress
        // bar stays for the whole pinned span (it is a position readout, not a
        // prompt) and only fades out over the final beats.
        // Cosmetic and monotonic in p — safe to keep progress-keyed.
        if (prompt) prompt.style.opacity = String(clamp01((0.08 - p) / 0.06))
        if (barFill) barFill.style.transform = `scaleX(${clamp01(p)})`
        if (bar) bar.style.opacity = String(clamp01((1 - p) / 0.1))

        // Hero entrance leads the handoff: whichever comes first, the climax
        // frames being on screen or the scroll passing 0.82. Progress-keyed as
        // well as frame-keyed, so a stalled download can never withhold the hero.
        if (drawn >= HANDOFF.heroFrame || p >= HANDOFF.heroProgress) heroHandoff.fire()

        if (retired) return

        // Guard (b) — stall watchdog. Once the scroll is essentially through the
        // sequence, the overlay has a strict deadline: if the drawn frame has not
        // reached the end of the fade within 600ms (slow connection, frames still
        // downloading), retire it anyway. Unlike the old p>=0.995 check this does
        // NOT require further scrolling — it fires on a timer, so stopping
        // mid-scroll can no longer leave the curtain up.
        if (p >= HANDOFF.watchdogProgress) {
          if (!watchdogId && drawn < HANDOFF.fadeEnd) {
            watchdogId = window.setTimeout(() => {
              watchdogId = 0
              if (lastDrawn < HANDOFF.fadeEnd) retireOverlay(400)
            }, HANDOFF.watchdogMs)
          }
        } else {
          // Scrolled back out of the danger zone — cancel the deadline.
          clearWatchdog()
        }

        // Normal (pretty) path: two-stage melt keyed to the drawn frame.
        if (drawn >= 0) applyForFrame(drawn)
      },
    })
    handles.push(dropHandle)
  }

  // Scene 10 — About turntable: autoplaying 2x-speed loop (20fps over a 10fps
  // extraction = 5s/rev), driven by gsap.ticker and only spinning while the
  // turntable is on-screen. Scrubbing was replaced because scrolling past it too
  // fast meant the rotation was never seen.
  const about = document.querySelector<HTMLElement>('#about')
  const turnCanvas = about?.querySelector<HTMLCanvasElement>('.about__turntable-canvas')
  if (about && turnCanvas) {
    handles.push(
      createLoopSequence({
        urls: seqUrls('/assets/seq/turn/turn_', 100),
        canvas: turnCanvas,
        // Gate on the SECTION, not the figure: the turntable is now sticky inside
        // the About spread, so its own static offset no longer describes how long
        // it is actually on screen. #about does.
        trigger: about,
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
// Handoff thresholds (p3.8) — all keyed to the DRAWN frame index (0..119) except
// where noted. The drop sequence ends on pure white; frames ~90-104 are still the
// dark iris zoom, ~105+ is the blow-out to white.
//   meltStart 105 : white has taken over -> begin ramping the --paper melt layer
//   meltEnd   115 : melt fully opaque; the overlay is now flat theme paper
//   fadeEnd   119 : overlay opacity reaches 0 (paper-over-paper cross-fade)
//   heroFrame  96 : hero entrance leads the melt so the name is already rising
//   heroProgress / releaseProgress are scroll progress, not frames.
const HANDOFF = {
  meltStart: 105,
  meltEnd: 115,
  fadeEnd: 119,
  heroFrame: 96,
  heroProgress: 0.82,
  /** Scroll progress at which the overlay's retirement deadline starts ticking. */
  watchdogProgress: 0.95,
  /** Grace period (ms) for the frames to catch up before the overlay is retired
   *  regardless of what has loaded. */
  watchdogMs: 600,
} as const

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
// KINETIC TYPOGRAPHY (p4a)
//
// Section headings get the SAME vocabulary as the hero name — SplitText chars
// rising out of a per-line mask — so the page has one typographic gesture rather
// than a hero move plus a generic fade for everything else. Justification: this
// is hierarchy, it marks "a new chapter of the document has begun".
//
// The tweens are built PAUSED (so the from-state renders and the heading is
// pre-hidden) and played by a ScrollTrigger. Because a heading can be created
// out of document order relative to two pin spacers, each one is also registered
// with the same self-healing net that protects the fade reveals: if a heading is
// in the viewport and its tween never started, the net plays it.
// -----------------------------------------------------------------------------
interface PendingHeading {
  el: HTMLElement
  play: () => void
}
let pendingHeadings: PendingHeading[] = []

function splitHeadings() {
  gsap.utils.toArray<HTMLElement>('[data-animate="split-h"]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines,chars', mask: 'lines' })
    if (!split.chars.length) return
    const tl = gsap.from(split.chars, {
      yPercent: 115,
      duration: 0.85,
      stagger: 0.032,
      ease: 'power4.out',
      paused: true,
    })
    let done = false
    const play = () => {
      if (done) return
      done = true
      tl.play()
    }
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: play })
    pendingHeadings.push({ el, play })
  })
  sweepHeadings()
}

/** Net for the split headings — mirrors sweepReveal, self-disabling. */
function sweepHeadings() {
  if (!pendingHeadings.length) return
  const vh = window.innerHeight
  pendingHeadings = pendingHeadings.filter(({ el, play }) => {
    const r = el.getBoundingClientRect()
    if (r.top < vh && r.bottom > 0) {
      play()
      return false
    }
    return true
  })
}

/**
 * The vertical motto in the hero gutter lights up one character at a time as the
 * reader scrolls out of the hero. Justification: storytelling — it turns a static
 * label into a line that is being *written* as you leave, and it is the only
 * scrub-driven type on the page besides the sequence itself.
 */
function mottoGlow() {
  const el = document.querySelector<HTMLElement>('.hero__vlabel')
  const aboutEl = document.querySelector('#about')
  // Only exists >=1040px (see .hero__vlabel); splitting a display:none element
  // would produce measurements that are wrong the moment it appears.
  if (!el || !aboutEl || !window.matchMedia('(min-width: 1040px)').matches) return
  const split = SplitText.create(el, { type: 'chars' })
  if (!split.chars.length) return
  // Floor is 0.55, not near-zero: the motto is the hero's own line and has to
  // stay legible for the whole time the hero is the view. The scrub lifts it to
  // full as the reader leaves, which is the "lighting up" gesture; starting from
  // near-invisible made it unreadable for the entire opening instead.
  gsap.fromTo(
    split.chars,
    { opacity: 0.55 },
    {
      opacity: 1,
      ease: 'none',
      stagger: { each: 0.6, from: 'start' },
      scrollTrigger: { trigger: aboutEl, start: 'top bottom', end: 'top 60%', scrub: true },
    },
  )
}

// -----------------------------------------------------------------------------
// ROLLOVER LABELS (p4a) — nav links and CTAs swap their own text on hover.
// A duplicate of the label is stacked one line below and the pair is translated
// by -100% inside an overflow clip. Built in JS so it exists only when motion is
// on (under reduced motion initMotion returns early and the plain span stays).
// The duplicate is aria-hidden so nothing is announced twice.
// -----------------------------------------------------------------------------
function initRollover() {
  document.querySelectorAll<HTMLElement>('[data-roll]').forEach((el) => {
    const text = el.textContent?.trim()
    if (!text || el.classList.contains('roll')) return
    el.textContent = ''
    el.classList.add('roll')
    const inner = document.createElement('span')
    inner.className = 'roll__i'
    const a = document.createElement('span')
    a.className = 'roll__t'
    a.textContent = text
    const b = document.createElement('span')
    b.className = 'roll__t'
    b.setAttribute('aria-hidden', 'true')
    b.textContent = text
    inner.append(a, b)
    el.append(inner)
  })
}

// -----------------------------------------------------------------------------
// MAGNETIC HOVER + PRESS (p4a) — buttons and chips lean toward the cursor.
// Justification: feedback. It makes the hit target feel physical before the click.
//
// Discipline: pointer:fine only (a coarse pointer has no hover to lean into),
// driven by gsap.quickTo so the value never round-trips through a framework or a
// re-render, and clamped so the control cannot wander off its own layout box.
// The press scale is done here rather than in CSS because the inline transform
// GSAP writes would otherwise beat the `:active` rule.
// -----------------------------------------------------------------------------
function initMagnetic() {
  if (!window.matchMedia('(pointer: fine)').matches) return
  const clamp = gsap.utils.clamp(-1, 1)

  document.querySelectorAll<HTMLElement>('.btn, .chip').forEach((el) => {
    const pull = el.classList.contains('btn') ? 16 : 8
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      xTo(clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * pull)
      yTo(clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * pull)
    })
    el.addEventListener('pointerleave', () => {
      xTo(0)
      yTo(0)
      gsap.to(el, { scale: 1, duration: 0.3, ease: 'power2.out' })
    })
    el.addEventListener('pointerdown', () => {
      gsap.to(el, { scale: 0.95, duration: 0.12, ease: 'power2.out' })
    })
    el.addEventListener('pointerup', () => {
      gsap.to(el, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' })
    })
  })
}

// -----------------------------------------------------------------------------
// CUSTOM CURSOR (p4a) — explicitly requested, built with restraint.
//
// A small dot that tracks tightly plus a ring that lags, both in
// mix-blend-mode: difference so they read on cream paper and on sumi alike. It
// carries a context label where the page affords something non-obvious: DRAG on
// the mascot, an arrow over the horizontally-panning works track, a wider ring
// over links.
//
// Accessibility position: the NATIVE cursor is deliberately left visible. This
// layer is decoration on top of it (pointer-events:none, aria-hidden), never a
// replacement — so pointer precision, high-contrast modes and OS cursor settings
// all keep working. It is never constructed on coarse pointers or under reduced
// motion (initMotion returns before this).
// -----------------------------------------------------------------------------
function initCustomCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return

  const root = document.createElement('div')
  root.className = 'cursor'
  root.setAttribute('aria-hidden', 'true')
  const ring = document.createElement('div')
  ring.className = 'cursor__ring'
  const label = document.createElement('span')
  label.className = 'cursor__label'
  ring.append(label)
  const dot = document.createElement('div')
  dot.className = 'cursor__dot'
  root.append(ring, dot)
  document.body.append(root)

  // Parked well off-screen until the first real pointer move, so the layer can
  // never contribute a stray box at the top-left corner.
  gsap.set([ring, dot], { xPercent: -50, yPercent: -50, x: -200, y: -200 })
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' })
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' })
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' })
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' })

  let shown = false
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    if (!shown) {
      shown = true
      gsap.set([ring, dot], { x: e.clientX, y: e.clientY })
      root.classList.add('is-visible')
    }
    dotX(e.clientX)
    dotY(e.clientY)
    ringX(e.clientX)
    ringY(e.clientY)
  })
  document.addEventListener('pointerleave', () => root.classList.remove('is-visible'))
  document.addEventListener('pointerenter', () => {
    if (shown) root.classList.add('is-visible')
  })

  const LABELS: Record<string, string> = { drag: 'DRAG', pan: '→' }
  let state = ''
  const setState = (next: string) => {
    if (next === state) return
    state = next
    root.dataset.state = next
    label.textContent = LABELS[next] ?? ''
  }

  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element | null
    if (!t || typeof t.closest !== 'function') return
    const ctx = t.closest<HTMLElement>('[data-cursor]')
    if (ctx?.dataset.cursor) {
      setState(ctx.dataset.cursor)
      return
    }
    setState(t.closest('a, button, .btn') ? 'link' : '')
  })
}

// -----------------------------------------------------------------------------
// Scene 6 — hero mascot plate.
//
// C1 CHANGE: this used to be the page's Draggable + poke target. Both moved to
// the companion (src/anim/companion.ts). Reason: the concept has exactly ONE
// living body, and two grabbable mascots read as two unrelated toys — the reader
// learns the affordance on the hero, then finds the corner copy inert, which
// actively contradicts "the companion is alive". The grab cursor and the DRAG
// cursor label moved with it, so the page now offers the affordance in exactly
// one place.
//
// What stays is the slow sway. Justification: storytelling — the hero plate is
// the portrait the corner companion later steps out of, so it has to be
// breathing when you meet it. It is transform-only, seven seconds of travel, and
// never invites a click it cannot honour.
// -----------------------------------------------------------------------------
function heroMascotSway() {
  const frame = document.querySelector<HTMLElement>('.hero__media-frame')
  if (!frame) return

  gsap.to(frame, {
    rotation: 1.6,
    duration: 2.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    transformOrigin: '50% 90%',
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
