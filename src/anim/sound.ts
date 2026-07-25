// =============================================================================
// C3 — SOUND AS PART OF THE UI (docs/CONCEPT.md §C3)
//
// Four short answers to four actions. No music, no ambience, no loops: sound
// here is feedback, and it only ever exists because the companion is alive and
// the page is made of paper.
//
// ---- HARD RULES --------------------------------------------------------------
//   • SYNTHESIS ONLY. There is no audio file anywhere in this project and there
//     must never be one. Every voice is an OscillatorNode or a noise buffer plus
//     a gain envelope, which is also why the whole layer costs ~0 bytes of
//     network and cannot block the load.
//   • OFF BY DEFAULT, and the AudioContext is NOT CONSTRUCTED until the page
//     holds a real USER ACTIVATION and sound is on. "Activation" is meant
//     strictly: a wheel is not one, and treating it as one is what made the
//     layer both silent and, later, all at once (see `activated`).
//   • prefers-reduced-motion => this module returns immediately. No context, no
//     listeners. The toggle is hidden by its own reduced-motion rule in CSS, so
//     the control's visibility never depends on this file having run.
//   • ONE gain node stands between every voice and the speakers (`master`), so
//     the ceiling is enforced in exactly one place and cannot drift per voice.
//
// ---- LEVELS ------------------------------------------------------------------
// Peaks are declared per voice as a fraction of full scale BEFORE the master,
// which then multiplies everything by MASTER (0.17, about -15.4 dBFS). Absolute
// peaks are therefore:
//
//   poke  "pof"    0.70 -> 0.119    -18.5 dBFS  the loudest thing here
//   poke  squeak   0.20 -> 0.034    -29.4 dBFS
//   page  turn     0.50 -> 0.085    -21.4 dBFS
//   hover bell     0.15 -> 0.0255   -31.9 dBFS  (two partials summed)
//   chime          0.21 -> 0.0357   -28.9 dBFS  (two partials summed)
//
// The relative balance is deliberate and survives the master change untouched:
// the hover bell stays ~13 dB under the poke, because a bell that competes with
// the companion's own voice stops being incidental and starts being a UI beep.
//
// Sounding EVERY voice in the same instant sums to 1.76 before the master, so
// the bus peaks at 1.76 * 0.17 = 0.299 — a factor of 3.3 below full scale.
// Clipping is therefore arithmetically impossible and no limiter is needed to
// make that true. Changing MASTER is the only way to change the ceiling, and
// anything up to 0.56 would still be clip-free if this is ever raised again.
// =============================================================================
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export type SoundCue = 'poke' | 'page' | 'hover' | 'chime'

/** Explicit reader choice: 'on' | 'off'. Absent = never chosen (pill eligible). */
const PREF_KEY = 'akiha:sound'
/** Set once the invitation pill has been shown, so it is offered exactly once. */
const ASKED_KEY = 'akiha:sound-asked'

/** The single ceiling for the whole layer (see LEVELS above). */
const MASTER = 0.17
/** Minimum gap between two hover bells, so a swept cursor cannot machine-gun. */
const HOVER_GAP_MS = 130
/** Minimum gap between two page turns. Reading crosses sections seconds apart,
 *  but a nav anchor jumps straight past two or three of them and would fire
 *  their first-arrival cues in the same frame — three sheets turning at once. */
const PAGE_GAP_MS = 260
/** A few milliseconds of lead on every cue. Scheduling exactly at `currentTime`
 *  races the audio thread, which may already have rendered past that instant —
 *  the attack ramp then starts in the past and the front of the sound is lost.
 *  10ms is inaudible as latency and guarantees the full envelope is heard. */
const SCHEDULE_LEAD = 0.01
/** How long the invitation pill stays before retiring itself. */
const PILL_LIFE_MS = 6500
/** Delay after the first interaction before the pill appears, so it never lands
 *  under the pointer of the click that summoned it. */
const PILL_DELAY_MS = 900

// ---- BURST SUPPRESSION (c3.1) ----------------------------------------------
// Three independent limits, because the reported symptom ("the first thing I do
// makes everything go off at once") had three separate ways of happening.
/** After sound is switched on, the confirmation chime is the ONLY thing heard
 *  for this long. Turning sound on is usually done mid-page and mid-motion, and
 *  whatever the same gesture happened to also trigger — a hover bell under the
 *  pointer, a page turn from the scroll that brought the toggle into reach — is
 *  not feedback the reader asked for. One answer to one action. */
const GRACE_MS = 800
/** Cues arriving inside this window of each other are collapsed to the single
 *  most important one (see PRIORITY). 60ms is under the ~80ms at which two
 *  transients stop reading as two events, so nothing legible is being thrown
 *  away — what is thrown away is the pile-up. */
const GATE_MS = 60
/** Hard ceiling on voices sounding at once. Not a clipping guard (the LEVELS
 *  arithmetic above already makes clipping impossible) but a density one: past
 *  this the layer stops reading as answers and starts reading as noise. */
const MAX_VOICES = 6
/** How long a cue stays worth playing while the output device is still opening.
 *  A cue is an answer to something the reader just did; past this it is an
 *  answer to something they have already moved on from, and a queue of those
 *  arriving together is exactly the burst this whole section exists to prevent.
 *  Comfortably above the ~71ms measured cold-start on Windows/WASAPI. */
const STALE_MS = 140
/** Which cue wins when several land in the same GATE_MS window. The poke is the
 *  companion answering a direct touch and must never be the one dropped; the
 *  hover bell is incidental by design and is always the first to go. */
const PRIORITY: Record<SoundCue, number> = { poke: 3, chime: 2, page: 1, hover: 0 }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let enabled = false
/** True once the reader has produced any input at all — including a wheel. Gates
 *  the invitation only: it is evidence someone is reading, not permission to
 *  make audio. */
let interacted = false
/**
 * True once the page holds a real USER ACTIVATION, which is a strictly smaller
 * set of events than "the reader did something".
 *
 * ---- THE BUG THIS EXISTS TO KILL -------------------------------------------
 * `wheel` is NOT an activation-triggering input event. The previous version
 * treated it as one, so a returning reader with sound already ON would scroll,
 * the layer would construct an AudioContext during that wheel, and Chrome would
 * hand back a context in state `suspended` whose clock is frozen at 0. Measured
 * on this machine, and the two consequences are exactly the two complaints:
 *
 *   • Nothing is audible. Every cue is scheduled against `currentTime`, which
 *     stays 0 forever, and `resume()` sits pending because there is no
 *     activation to unlock it. The reader scrolls the whole page in silence and
 *     concludes the sound is still loading.
 *   • Then it all arrives at once. The first real click resolves the resume, the
 *     clock finally starts at 0 — and every cue banked at t=0 during all that
 *     scrolling fires in the same instant.
 *
 * So the context is now built only against this flag, which is set only by
 * events that actually grant activation, in the CAPTURE phase so it is true
 * before any handler that might want to play something on the same gesture.
 */
let activated = false
/** Suppression window opened by switching sound on (see GRACE_MS). */
let graceUntil = 0
/** State of the GATE_MS collapse window. */
let lastCueAt = -Infinity
let lastCueRank = -1
/** Voices currently sounding, decremented by each node's own `ended` event.
 *  Suspending the context freezes those nodes without ending them, so the count
 *  is reset there and the decrement is clamped — otherwise a reader who switched
 *  sound off mid-cue six times would silence the layer permanently. */
let liveVoices = 0
const releaseVoice = () => {
  liveVoices = Math.max(0, liveVoices - 1)
}

function readPref(): string | null {
  try {
    return localStorage.getItem(PREF_KEY)
  } catch {
    return null // private mode / storage disabled: sound simply stays session-only
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* nothing to do, and nothing worth telling the reader about */
  }
}

/**
 * Build the graph. Idempotent; only the first call constructs anything.
 *
 * Everything expensive lives here — the AudioContext itself, the master gain and
 * the one-second noise buffer — so that `warmUp()` can pay for all of it inside
 * the gesture that turns sound on, instead of the first cue paying for it while
 * the reader is waiting to hear something.
 */
function ensureGraph(): AudioContext | null {
  if (ctx) return ctx
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = MASTER
  master.connect(ctx.destination)

  // One second of white noise, reused by every noise voice at different playback
  // rates and filter settings. Allocating it once keeps the poke instantaneous
  // (no buffer fill on the click).
  const len = Math.floor(ctx.sampleRate)
  noise = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return ctx
}

/**
 * WARM-UP — called synchronously from a gesture that carries user activation:
 * the header toggle, the opening chip, the invitation pill, or (for a reader
 * who already had sound on) their very first click on the page.
 *
 * Why this exists: constructing the context, filling the noise buffer and
 * actually opening the output device is not free. Measured here, cold, at
 * 96kHz: 5.5ms for the constructor, 2.9ms to fill the noise buffer, and then
 * 71ms before the audio clock starts ticking at all, plus 40ms of WASAPI output
 * latency. Doing it lazily meant the first cue paid every bit of that. Paying it
 * inside a gesture the reader has just made — and is already expecting an answer
 * to — is the difference between "turning on" and "lag".
 *
 * `announce` plays the confirmation chime. It is rendered directly rather than
 * through `play()` because it is the one cue the grace window must not suppress:
 * it IS the thing opening that window.
 */
function warmUp(announce: boolean): void {
  const ac = ensureGraph()
  if (!ac) return
  const ready = ac.state === 'running' ? Promise.resolve() : ac.resume()
  ready
    .then(() => {
      if (!enabled || !ctx || !announce) return
      render(ctx, 'chime', ctx.currentTime + SCHEDULE_LEAD)
    })
    .catch(() => {
      /* a device that refuses to start is not something to shout about */
    })
}

/**
 * Schedule a cue, resuming first if the clock is not running.
 *
 * Two bugs are fixed here at once. `resume()` used to be fired and forgotten and
 * the envelope scheduled immediately against `currentTime` — but a suspended
 * context's clock does not advance, so the ramps landed at t=0 and every cue
 * banked while the device was closed came out simultaneously the moment it
 * opened. Reading `currentTime` inside the resume callback puts each envelope in
 * its own future; the staleness check then throws away the ones whose moment has
 * already passed, so a wait can never turn into a queue.
 */
function scheduleCue(ac: AudioContext, cue: SoundCue): void {
  if (ac.state === 'running') {
    render(ac, cue, ac.currentTime + SCHEDULE_LEAD)
    return
  }
  const askedAt = performance.now()
  ac.resume()
    .then(() => {
      if (!enabled || performance.now() - askedAt > STALE_MS) return
      render(ac, cue, ac.currentTime + SCHEDULE_LEAD)
    })
    .catch(() => {})
}

/**
 * The single entry point every cue source calls. A no-op — with no side effects
 * and no context construction — for every reason sound might not be running, so
 * callers never have to ask.
 */
function play(cue: SoundCue): void {
  if (!enabled || !activated) return
  const now = performance.now()
  if (now < graceUntil) return
  // GATE: first cue in a window wins, and a more important one may still take
  // the window off it. Everything else in those 60ms is dropped rather than
  // queued, because a queue is what the reader hears as a burst.
  const rank = PRIORITY[cue]
  if (now - lastCueAt < GATE_MS && rank <= lastCueRank) return
  lastCueAt = now
  lastCueRank = rank
  const ac = ensureGraph()
  if (!ac) return
  scheduleCue(ac, cue)
}

/** Percussive envelope. Exponential ramps only — a linear decay on a short UI
 *  sound reads as a click at the tail. */
function envelope(g: GainNode, t0: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay)
}

/** A filtered burst of the shared noise buffer. */
function burst(
  ac: AudioContext,
  t0: number,
  opts: {
    type: BiquadFilterType
    from: number
    to: number
    q: number
    peak: number
    attack: number
    decay: number
    rate?: number
  },
) {
  if (!noise || !master || liveVoices >= MAX_VOICES) return
  liveVoices++
  const src = ac.createBufferSource()
  src.onended = releaseVoice
  src.buffer = noise
  src.playbackRate.value = opts.rate ?? 1
  const filter = ac.createBiquadFilter()
  filter.type = opts.type
  filter.Q.value = opts.q
  filter.frequency.setValueAtTime(opts.from, t0)
  filter.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.attack + opts.decay)
  const g = ac.createGain()
  envelope(g, t0, opts.peak, opts.attack, opts.decay)
  src.connect(filter).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + opts.attack + opts.decay + 0.05)
}

/** A single sine partial. */
function tone(
  ac: AudioContext,
  t0: number,
  opts: { freq: number; bend?: [number, number][]; peak: number; attack: number; decay: number },
) {
  if (!master || liveVoices >= MAX_VOICES) return
  liveVoices++
  const osc = ac.createOscillator()
  osc.onended = releaseVoice
  osc.type = 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  for (const [hz, at] of opts.bend ?? []) osc.frequency.exponentialRampToValueAtTime(hz, t0 + at)
  const g = ac.createGain()
  envelope(g, t0, opts.peak, opts.attack, opts.decay)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + opts.attack + opts.decay + 0.05)
}

/** Lay one cue's nodes onto the graph at absolute time `t`. */
function render(ac: AudioContext, cue: SoundCue, t: number): void {
  switch (cue) {
    // ぬいぐるみの「ポフッ」 + かわいい squeak. The pof is a lowpassed noise
    // thud (soft body, no attack transient); the squeak is a short sine that
    // bends up and settles, which is the toy-voice gesture.
    case 'poke':
      burst(ac, t, { type: 'lowpass', from: 420, to: 170, q: 0.7, peak: 0.7, attack: 0.004, decay: 0.14, rate: 0.8 })
      tone(ac, t + 0.03, {
        freq: 880,
        bend: [
          [1580, 0.07],
          [1120, 0.17],
        ],
        peak: 0.2,
        attack: 0.02,
        decay: 0.18,
      })
      break

    // 紙をめくる微かなノイズ: a bandpass sweeping up through the paper band and
    // falling back, which is the sound of a sheet passing its own fold.
    case 'page':
      burst(ac, t, { type: 'bandpass', from: 900, to: 2600, q: 0.8, peak: 0.5, attack: 0.05, decay: 0.32 })
      break

    // ごく微かな鈴. Two inharmonic partials (1 : 2.76) is the classic bell ratio;
    // the base is jittered a few percent so repeated hovers never sound sampled.
    case 'hover': {
      const base = 2100 * gsap.utils.random(0.97, 1.03)
      tone(ac, t, { freq: base, peak: 0.1, attack: 0.004, decay: 0.3 })
      tone(ac, t, { freq: base * 2.76, peak: 0.05, attack: 0.004, decay: 0.2 })
      break
    }

    // やわらかいチャイム1音 — D5 with a quiet octave for body, long decay. One
    // note, not a phrase: the opening has landed, and that is all it says.
    case 'chime':
      tone(ac, t, { freq: 587.33, peak: 0.16, attack: 0.02, decay: 1.3 })
      tone(ac, t + 0.01, { freq: 1174.66, peak: 0.05, attack: 0.03, decay: 0.7 })
      break
  }
}

export function initSound({ reduce }: { reduce: boolean }): void {
  // Reduced motion: silence, and no machinery at all. The toggle is hidden by a
  // reduced-motion rule in CSS rather than by anything here, so there is never a
  // control on screen promising something this mode will not do — and, unlike
  // the old `.is-ready` gate, no JS has to run for it to appear in the mode
  // where it does work.
  if (reduce) return

  const toggle = document.querySelector<HTMLButtonElement>('[data-sound-toggle]')
  if (!toggle) return
  // `.nav__end` — the pill hangs off the same anchor the toggle sits in, so it
  // lands under the control it is talking about and next to it in tab order.
  const pillHost = toggle.parentElement
  // The opening's invitation (see src/sections/opening.ts). Present in the very
  // first paint so a reader learns the page has a sound layer at the same moment
  // they learn it has a scroll — rather than several seconds later, from a pill.
  const chip = document.querySelector<HTMLButtonElement>('[data-sound-invite]')

  const pref = readPref()
  enabled = pref === 'on'

  /** Speaker-with-slash or speaker-with-equaliser, said out loud. `aria-pressed`
   *  carries the toggle semantics; the label names the state the icon is drawing,
   *  so the two can never disagree. */
  const paintToggle = () => {
    toggle.setAttribute('aria-pressed', String(enabled))
    toggle.setAttribute('aria-label', enabled ? '効果音 オン' : '効果音 オフ')
  }
  paintToggle()

  // A reader who has already chosen, either way, does not get asked again: the
  // chip retires before first paint, so it never flashes. The always-visible nav
  // toggle is the standing offer from here on.
  if (pref !== null) chip?.remove()

  const setEnabled = (next: boolean) => {
    enabled = next
    paintToggle()
    writePref(PREF_KEY, next ? 'on' : 'off')
    if (next) {
      // ONE answer to this action, and nothing else for GRACE_MS. Whatever the
      // same gesture also happened to trigger — the hover bell under the pointer
      // that just pressed the button, a page turn from the scroll that brought
      // it into reach — is not something the reader asked to hear.
      graceUntil = performance.now() + GRACE_MS
      warmUp(true)
    } else if (ctx) {
      // Frozen nodes never fire `ended`, so the counter is squared up here.
      liveVoices = 0
      void ctx.suspend()
    }
  }

  // Native <button>: Enter and Space already work, focus ring comes from CSS.
  toggle.addEventListener('click', () => {
    retirePill()
    chip?.remove()
    setEnabled(!enabled)
  })

  // ---- opening chip ---------------------------------------------------------
  // "♪ 音ありでたのしむ", beside the scroll instruction. Same gesture, same
  // grace window, same chime as the toggle — it is the toggle, said out loud at
  // the one moment the reader is deciding how to take this page.
  chip?.addEventListener('click', () => {
    chip.remove()
    setEnabled(true)
  })

  // ---- invitation pill ------------------------------------------------------
  // The SECOND half of one offer, not a second offer: it exists only for a reader
  // who scrolled past the opening chip without answering it. `offerPill` refuses
  // outright once a preference exists, so using the chip is what retires it.
  let pill: HTMLButtonElement | null = null
  let pillTimer = 0
  function retirePill() {
    if (!pill) return
    window.clearTimeout(pillTimer)
    const el = pill
    pill = null
    el.classList.remove('is-in')
    window.setTimeout(() => el.remove(), 400)
  }
  function alreadyAsked(): boolean {
    try {
      return localStorage.getItem(ASKED_KEY) === '1'
    } catch {
      return false
    }
  }
  function offerPill() {
    if (readPref() !== null || alreadyAsked()) return
    writePref(ASKED_KEY, '1')
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'soundpill'
    el.textContent = '音を出す？'
    // Placed next to the toggle rather than at the end of <body>, so Tab reaches
    // it where it visually belongs instead of after the whole page.
    if (!pillHost) return
    pillHost.append(el)
    pill = el
    el.addEventListener('click', () => {
      retirePill()
      setEnabled(true)
    })
    // Two frames: the element must be laid out at its from-state before the
    // class that transitions it is added, or it snaps in with no move at all.
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')))
    pillTimer = window.setTimeout(retirePill, PILL_LIFE_MS)
  }

  // ---- when the offer is made ----------------------------------------------
  // With a chip on screen, the pill waits for the opening to hand off to the
  // hero: that is the moment the reader has demonstrably left the chip behind,
  // and re-asking any earlier would be two invitations for one question. Without
  // a chip there is nothing to wait for, so the first sign of a reader will do.
  if (chip) {
    window.addEventListener('akiha:handoff', () => window.setTimeout(offerPill, PILL_DELAY_MS), {
      once: true,
    })
  } else {
    const onFirstInteraction = () => {
      if (interacted) return
      interacted = true
      window.setTimeout(offerPill, PILL_DELAY_MS)
    }
    ;(['pointerdown', 'keydown', 'wheel', 'touchstart'] as const).forEach((type) =>
      window.addEventListener(type, onFirstInteraction, { passive: true, once: true }),
    )
  }

  // ---- user activation ------------------------------------------------------
  // The gate that decides whether an AudioContext may exist at all. Only events
  // that actually grant activation are listed — `wheel` is deliberately absent,
  // and see the `activated` declaration for the two bugs its presence caused.
  // CAPTURE phase so the flag is already true for any handler on the same
  // gesture that wants to play something (the companion's poke, most of all).
  const onActivate = () => {
    if (activated) return
    activated = true
    // A reader who left sound ON is owed a device that is already open by the
    // time their first cue fires. No chime: they did not just ask for anything,
    // and an unannounced page answering a click with a bell would be a fright.
    if (enabled) warmUp(false)
  }
  ;(['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'] as const).forEach((type) =>
    window.addEventListener(type, onActivate, { capture: true, passive: true, once: true }),
  )

  // ---- cue sources ----------------------------------------------------------

  // The companion answers a poke. companion.ts publishes the hook and knows
  // nothing about sound; this is the only side that knows both.
  window.addEventListener('companion:poked', () => play('poke'))

  // The opening has handed off to the hero — one chime, then the page is yours.
  window.addEventListener('akiha:handoff', () => play('chime'), { once: true })

  // A new chapter of the document arrives: one page turn per section, the first
  // time it is reached. `once` is what keeps scrubbing back and forth silent;
  // the gap is what keeps a nav anchor from turning three sheets in one frame.
  let lastPage = 0
  const turnPage = () => {
    const now = performance.now()
    if (now - lastPage < PAGE_GAP_MS) return
    lastPage = now
    play('page')
  }
  // ARRIVAL, NOT ATTENDANCE (c3.1). A section already sitting at or above the
  // start line when this runs — a reload restored mid-page, a deep link, a
  // back-navigation — has not been *arrived at*; the reader is simply already
  // there. Its page turn is spent, so no trigger is created for it and it can
  // never sound retroactively. Without this the initial ScrollTrigger refresh
  // fires every passed section's onEnter inside one frame, and a reload halfway
  // down the page opened with a stack of sheets turning at once.
  const START_FRACTION = 0.6 // matches `start: 'top 60%'`
  ;['#about', '#activity', '#works', '#contact'].forEach((sel) => {
    const el = document.querySelector(sel)
    if (!el) return
    if (el.getBoundingClientRect().top < window.innerHeight * START_FRACTION) return
    ScrollTrigger.create({ trigger: el, start: 'top 60%', once: true, onEnter: turnPage })
  })

  // Hover bells: fine pointers only (a coarse pointer has no hover to answer),
  // throttled in time AND by element so re-entering from a child never repeats.
  if (window.matchMedia('(pointer: fine)').matches) {
    let lastEl: Element | null = null
    let lastAt = 0
    document.addEventListener(
      'pointerover',
      (e) => {
        if (!enabled) return
        const target = e.target as Element | null
        if (!target || typeof target.closest !== 'function') return
        const hit = target.closest('a[href], button, .btn, .chip')
        if (!hit || hit === lastEl) return
        const now = performance.now()
        if (now - lastAt < HOVER_GAP_MS) return
        lastEl = hit
        lastAt = now
        play('hover')
      },
      { passive: true },
    )
    document.addEventListener(
      'pointerout',
      (e) => {
        const related = (e as PointerEvent).relatedTarget as Element | null
        if (lastEl && (!related || !lastEl.contains(related))) lastEl = null
      },
      { passive: true },
    )
  }
}
