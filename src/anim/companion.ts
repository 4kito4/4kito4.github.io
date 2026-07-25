// =============================================================================
// C1 — LIVING COMPANION (常駐相棒)
//
// The concept's core (docs/CONCEPT.md §C1): a small copy of the mascot moves into
// the bottom-right corner after the hero and travels with the reader. Everything
// here exists to make "the companion is alive" credible; nothing decorative is
// added beyond that.
//
// ---- LAYER COMPOSITION -------------------------------------------------------
// The art ships as one baked body (aki_ha_body_front.png) that ALREADY has eyes
// painted on, plus separate eye plates. Overlaying the eye plates alone would be
// pointless — squashing them for a blink just reveals the identical baked eyes
// underneath. So each eye gets a "lid": a small feather-masked patch that samples
// the body image itself from the forehead directly above the eye (same fur, same
// lighting, same texture direction) and paints it over the baked eye. The baked
// eyes are therefore erased at all times, and the overlaid eye plates are the ONLY
// eyes on screen — free to blink, close and follow the cursor.
//
// All of that geometry is static, so it lives in CSS (see `.companion__*` in
// global.css), expressed in percentages of the box so the 96px desktop and 72px
// mobile sizes are pixel-identical compositions.
//
// ---- TRANSFORM OWNERSHIP (why there are three nested boxes) ------------------
// GSAP tweens on the same element fight over the same transform string, and this
// character can be breathing, startled, poked and thrown at the same time. Each
// concern therefore owns exactly one node and one property family:
//
//   .companion         x / y      Draggable + the elastic return home
//                      autoAlpha  appear / footer retreat
//   .companion__inner  scale      idle breathing (looping)
//                      rotation   startled shake, greet bow      (one at a time)
//                      yPercent   the sleeping slump
//   .companion__body   scaleX/Y   poke squash, appear pop
//   .companion__eye    scaleY     blink / sleep
//                      xPercent   cursor watch
//                      yPercent
//
// ---- DISCIPLINE --------------------------------------------------------------
//   • transform / opacity only.
//   • no `window.addEventListener('scroll')`: scroll comes from Lenis, section
//     arrivals from ScrollTrigger (taste-skill §5.D).
//   • prefers-reduced-motion: a still companion and nothing else — no breathing,
//     no watching, no dragging, no poking, no listeners at all.
//   • the root is `position: fixed` with explicit width + aspect-ratio, so the
//     layer composition can never contribute layout shift.
//   • pointer-events live on `.companion__body` only; the root and the speech
//     bubble stay transparent to the pointer so nothing under the corner is
//     blocked.
// =============================================================================
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Draggable } from 'gsap/Draggable'
import type Lenis from 'lenis'
import { phrase } from '../text/linebreak'

export interface CompanionOptions {
  /** prefers-reduced-motion — a static companion, no behaviour at all. */
  reduce: boolean
  /** The page's Lenis instance; drives `startled` and pauses while dragging. */
  lenis?: Lenis | null
}

/** Idle span before the companion falls asleep (spec: 20s). */
const SLEEP_MS = 20_000
/** Lenis velocity (px/frame) above which a scroll counts as a startle. */
const STARTLE_VELOCITY = 42
/** Minimum gap between two startles, so a long fast scroll shakes once. */
const STARTLE_COOLDOWN_MS = 1400
/** Random spacing between blinks. */
const BLINK_GAP_MS: [number, number] = [2800, 6800]
/** Cursor distance (px) at which the eyes reach full deflection. */
const WATCH_REACH = 260
/** Maximum eye deflection, in percent of the eye plate's own size. Capped low on
 *  purpose: the whole plate moves, not a pupil inside it, so anything larger
 *  reads as the eyes sliding off the face rather than as a glance. At 14% this is
 *  ~2px of travel at the 96px desktop size — enough to read, small enough to
 *  stay inside the lid patch that hides the baked eyes. */
const WATCH_X = 14
const WATCH_Y = 10

const COMPANION_MARKUP = /* html */ `
  <div class="companion__inner">
    <div class="companion__body" data-cursor="drag">
      <img class="companion__art" src="/assets/aki_ha_body_front.png" alt="" width="306" height="334" decoding="async" />
      <span class="companion__lid companion__lid--l"></span>
      <span class="companion__lid companion__lid--r"></span>
      <img class="companion__eye companion__eye--l" src="/assets/aki_ha_eye_l.png" alt="" width="96" height="101" decoding="async" />
      <img class="companion__eye companion__eye--r" src="/assets/aki_ha_eye_r.png" alt="" width="104" height="101" decoding="async" />
    </div>
  </div>
  <p class="companion__bubble"></p>
`

export function initCompanion({ reduce, lenis = null }: CompanionOptions): void {
  if (document.querySelector('.companion')) return

  const root = document.createElement('div')
  root.className = 'companion'
  // Pure decoration: the companion carries no information the page does not
  // already state in text, and poking it has no outcome. Keeping it out of the
  // a11y tree and out of the tab order is the honest call — the same position the
  // custom cursor layer takes.
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = COMPANION_MARKUP
  document.body.append(root)

  const inner = root.querySelector<HTMLElement>('.companion__inner')!
  const bodyEl = root.querySelector<HTMLElement>('.companion__body')!
  const bubble = root.querySelector<HTMLElement>('.companion__bubble')!
  const eyes = Array.from(root.querySelectorAll<HTMLElement>('.companion__eye'))

  // ---------------------------------------------------------------------------
  // REDUCED MOTION — a still portrait in the corner. It still steps aside for the
  // footer (an 96px fixed square over the colophon is an overlap bug, not a
  // motion preference), via IntersectionObserver so no scroll machinery is
  // involved at all.
  // ---------------------------------------------------------------------------
  if (reduce) {
    root.classList.add('is-static')
    const footer = document.getElementById('contact')
    if (footer && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => root.classList.toggle('is-away', entries[0].isIntersecting),
        { threshold: 0 },
      )
      io.observe(footer)
    }
    return
  }

  const fine = window.matchMedia('(pointer: fine)').matches

  gsap.set(root, { autoAlpha: 0 })
  gsap.set(bubble, { autoAlpha: 0, y: 4 })
  gsap.set(eyes, { transformOrigin: '50% 50%' })
  gsap.set([inner, bodyEl], { transformOrigin: '50% 100%' })

  const state = { visible: false, asleep: false, dragging: false, atFooter: false }

  // ---- idle: breathing ------------------------------------------------------
  // Justification: this is the whole premise. A still image in the corner is a
  // sticker; a breathing one is a creature.
  const breath = gsap.to(inner, {
    scale: 1.015,
    duration: 2.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })

  // ---- idle: blinking -------------------------------------------------------
  let blinkTimer = 0
  const blink = () => {
    if (state.asleep || !state.visible) return
    gsap
      .timeline()
      .to(eyes, { scaleY: 0.1, duration: 0.07, ease: 'power2.in', overwrite: 'auto' })
      .to(eyes, { scaleY: 1, duration: 0.12, ease: 'power2.out' })
  }
  const scheduleBlink = () => {
    window.clearTimeout(blinkTimer)
    blinkTimer = window.setTimeout(() => {
      blink()
      scheduleBlink()
    }, gsap.utils.random(BLINK_GAP_MS[0], BLINK_GAP_MS[1]))
  }

  // ---- gestures that own `rotation` (mutually exclusive by nature) ----------
  let gesture: gsap.core.Timeline | null = null
  const startGesture = () => {
    gesture?.kill()
    gesture = gsap.timeline()
    return gesture
  }

  /** startled — a fast scroll jolts the companion; it shivers and rights itself. */
  const startle = () => {
    startGesture()
      .to(inner, { rotation: -8, duration: 0.07, ease: 'power2.out' })
      .to(inner, { rotation: 6, duration: 0.09 })
      .to(inner, { rotation: -3, duration: 0.09 })
      .to(inner, { rotation: 0, duration: 0.55, ease: 'elastic.out(1, 0.4)' })
    if (!state.asleep) {
      gsap
        .timeline()
        .to(eyes, { scaleY: 1.18, duration: 0.09, ease: 'power2.out', overwrite: 'auto' })
        .to(eyes, { scaleY: 1, duration: 0.4, ease: 'power2.out' })
    }
  }

  /** greet — a small bow when a new chapter arrives (C2). */
  const greet = (text?: string) => {
    if (!state.visible) return
    wake()
    startGesture()
      .to(inner, { rotation: 11, duration: 0.3, ease: 'power2.out' })
      .to(inner, { rotation: 0, duration: 0.65, ease: 'elastic.out(1, 0.5)' })
    if (text) say(text, 2800)
  }

  // ---- poked ----------------------------------------------------------------
  // Justification: feedback. The companion is the one thing on the page that
  // invites poking, so it has to answer. C3 (sound) is the next wave, so the
  // hook is published now and nothing listens to it yet.
  const poke = () => {
    wake()
    gsap
      .timeline()
      .to(bodyEl, { scaleX: 1.14, scaleY: 0.86, duration: 0.12, ease: 'power2.out' })
      .to(bodyEl, { scaleX: 0.94, scaleY: 1.08, duration: 0.16, ease: 'power1.inOut' })
      .to(bodyEl, { scaleX: 1, scaleY: 1, duration: 0.9, ease: 'elastic.out(1, 0.32)' })
    window.dispatchEvent(new CustomEvent('companion:poked'))
  }

  // ---- speech bubble --------------------------------------------------------
  let sayTimer = 0
  function say(text: string, ms: number) {
    window.clearTimeout(sayTimer)
    // The bubble is a 14rem-max box holding a full spoken sentence, so it wraps
    // more often than anything else on the page. Its text is written here at
    // runtime and replaced again on the next hover, so the class-marker pass in
    // main.ts cannot cover it — segment the string instead. `.companion__bubble`
    // carries the matching `keep-all / anywhere` rules statically in CSS.
    bubble.textContent = phrase(text)
    gsap.to(bubble, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power3.out', overwrite: 'auto' })
    if (ms > 0) sayTimer = window.setTimeout(hush, ms)
  }
  function hush() {
    window.clearTimeout(sayTimer)
    gsap.to(bubble, { autoAlpha: 0, y: 4, duration: 0.22, ease: 'power2.in', overwrite: 'auto' })
  }

  // ---- sleep / wake ---------------------------------------------------------
  let idleTimer = 0
  const sleep = () => {
    if (state.asleep || !state.visible) return
    state.asleep = true
    gsap.to(eyes, { scaleY: 0.1, duration: 0.5, ease: 'power2.inOut', overwrite: 'auto' })
    gsap.to(eyes, { xPercent: 0, yPercent: 0, duration: 0.5, ease: 'power2.inOut' })
    gsap.to(inner, { yPercent: 2.5, duration: 0.8, ease: 'power2.out' })
    breath.timeScale(0.55)
  }
  function wake() {
    if (!state.asleep) return
    state.asleep = false
    gsap.to(eyes, { scaleY: 1, duration: 0.26, ease: 'back.out(2)', overwrite: 'auto' })
    gsap.to(inner, { yPercent: 0, duration: 0.45, ease: 'power2.out' })
    breath.timeScale(1)
  }
  const bumpIdle = () => {
    wake()
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(sleep, SLEEP_MS)
  }
  // Capture phase on purpose: the watch handler below listens on `document`, which
  // in the bubble phase would run BEFORE a window listener and therefore still see
  // `asleep === true`. Capturing here wakes the companion first, so the very move
  // that wakes it is also the one its eyes follow.
  ;(['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const).forEach((type) =>
    window.addEventListener(type, bumpIdle, { passive: true, capture: true }),
  )

  // ---- watch (pointer: fine only) -------------------------------------------
  // The eyes drift toward the cursor. The companion is `position: fixed`, so its
  // centre only moves on resize or while it is being dragged — cached, not
  // measured per pointer event.
  let cx = 0
  let cy = 0
  const measure = () => {
    const r = root.getBoundingClientRect()
    cx = r.left + r.width * 0.5
    cy = r.top + r.height * 0.42 // the face sits above the box centre
  }
  measure()

  if (fine) {
    const clamp = gsap.utils.clamp(-1, 1)
    const xTo = eyes.map((el) => gsap.quickTo(el, 'xPercent', { duration: 0.45, ease: 'power3' }))
    const yTo = eyes.map((el) => gsap.quickTo(el, 'yPercent', { duration: 0.45, ease: 'power3' }))
    document.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse' || state.asleep || state.dragging || !state.visible) return
        const dx = clamp((e.clientX - cx) / WATCH_REACH) * WATCH_X
        const dy = clamp((e.clientY - cy) / WATCH_REACH) * WATCH_Y
        for (let i = 0; i < eyes.length; i++) {
          xTo[i](dx)
          yTo[i](dy)
        }
      },
      { passive: true },
    )
  }

  // ---- appear / retreat -----------------------------------------------------
  // "Moved in after the hero." The trigger is the About boundary, which is the
  // first unpinned section — the intro stage is pinned, so it cannot describe
  // when the hero has actually been read past.
  const appear = () => {
    if (state.visible) return
    state.visible = true
    gsap.to(root, { autoAlpha: 1, duration: 0.6, ease: 'power2.out', overwrite: 'auto' })
    gsap.from(bodyEl, { scale: 0.55, y: 16, duration: 0.9, ease: 'back.out(1.6)' })
    scheduleBlink()
    bumpIdle()
    measure()
  }
  const retreat = () => {
    if (!state.visible) return
    state.visible = false
    window.clearTimeout(blinkTimer)
    window.clearTimeout(idleTimer)
    hush()
    gsap.to(root, { autoAlpha: 0, duration: 0.4, ease: 'power2.in', overwrite: 'auto' })
  }

  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 80%',
    onEnter: appear,
    onLeaveBack: retreat,
  })

  // ---- greet: chapter arrivals (C2) ----------------------------------------
  // Silent bows for the middle chapters (a line at every section would be noise);
  // the footer gets the bow AND the send-off, then the companion steps aside so
  // it never covers the colophon.
  ;['#activity', '#works'].forEach((sel) => {
    if (!document.querySelector(sel)) return
    ScrollTrigger.create({ trigger: sel, start: 'top 65%', onEnter: () => greet() })
  })

  const footer = document.getElementById('contact')
  if (footer) {
    ScrollTrigger.create({
      trigger: footer,
      start: 'top 80%',
      onEnter: () => {
        state.atFooter = true
        greet('また遊びに来てね')
        gsap.to(root, { autoAlpha: 0, duration: 0.7, delay: 1.9, ease: 'power2.in' })
      },
      onLeaveBack: () => {
        state.atFooter = false
        if (state.visible) {
          gsap.to(root, { autoAlpha: 1, duration: 0.45, ease: 'power2.out', overwrite: 'auto' })
        }
      },
    })
  }

  // ---- works: one line per piece (C2) --------------------------------------
  // Hover only, so it never competes with reading on touch.
  if (fine) {
    document.querySelectorAll<HTMLElement>('[data-companion-say]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        if (!state.visible || state.atFooter || !el.dataset.companionSay) return
        wake()
        say(el.dataset.companionSay, 0)
      })
      el.addEventListener('pointerleave', hush)
    })
  }

  // ---- startled: Lenis velocity --------------------------------------------
  let lastStartle = 0
  lenis?.on('scroll', () => {
    if (!state.visible || state.dragging) return
    const now = performance.now()
    if (Math.abs(lenis.velocity) < STARTLE_VELOCITY) return
    if (now - lastStartle < STARTLE_COOLDOWN_MS) return
    lastStartle = now
    wake()
    startle()
  })

  // ---- dragged (pointer: fine only) ----------------------------------------
  // Moved off the hero mascot: the concept has ONE living body, and two grabbable
  // mascots read as two unrelated toys. Coarse pointers get tap-to-poke instead —
  // a 72px draggable square in the thumb corner would eat scroll gestures.
  if (fine) {
    const homeBounds = () => {
      const r = root.getBoundingClientRect()
      const x = gsap.getProperty(root, 'x') as number
      const y = gsap.getProperty(root, 'y') as number
      const left = r.left - x
      const top = r.top - y
      return {
        minX: 12 - left,
        maxX: window.innerWidth - 12 - r.width - left,
        minY: 12 - top,
        maxY: window.innerHeight - 12 - r.height - top,
      }
    }

    const goHome = () => {
      gsap.to(root, {
        x: 0,
        y: 0,
        duration: 1.1,
        ease: 'elastic.out(1, 0.45)',
        onUpdate: measure,
        onComplete: measure,
      })
    }

    Draggable.create(root, {
      trigger: bodyEl,
      type: 'x,y',
      inertia: true,
      edgeResistance: 0.72,
      dragClickables: false,
      bounds: homeBounds(),
      onPress() {
        state.dragging = true
        breath.pause()
        hush()
        lenis?.stop() // don't scroll the page while wrestling the companion
      },
      onDrag: measure,
      onRelease() {
        state.dragging = false
        breath.resume()
        lenis?.start()
        bumpIdle()
      },
      onThrowUpdate: measure,
      onThrowComplete: goHome,
      onClick: poke,
    })

    let resizeId = 0
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeId)
      resizeId = window.setTimeout(() => {
        measure()
        Draggable.get(root)?.applyBounds(homeBounds())
      }, 160)
    })
  } else {
    // Coarse pointer: tap to poke, nothing else.
    bodyEl.addEventListener('click', poke)
  }
}
