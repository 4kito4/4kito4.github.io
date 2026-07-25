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
//   • OFF BY DEFAULT, and the AudioContext is NOT CONSTRUCTED until the reader
//     has both interacted with the page and turned sound on. A context created
//     at load would start `suspended` under every autoplay policy anyway, so
//     building one early buys nothing and spends an audio thread on a reader who
//     never asked for it.
//   • prefers-reduced-motion => this module returns immediately. No context, no
//     listeners, no toggle. (The toggle's slot is reserved in CSS regardless, so
//     its absence can never shift the nav — see `.nav__sound` in global.css.)
//   • ONE gain node stands between every voice and the speakers (`master`), so
//     the ceiling is enforced in exactly one place and cannot drift per voice.
//
// ---- LEVELS ------------------------------------------------------------------
// Peaks are declared per voice as a fraction of full scale BEFORE the master,
// which then multiplies everything by MASTER (0.05, about -26 dBFS). Absolute
// peaks are therefore:
//
//   poke  "pof"    0.70 -> 0.035   the loudest thing here, and still very quiet
//   poke  squeak   0.20 -> 0.010
//   page  turn     0.50 -> 0.025
//   hover bell     0.15 -> 0.0075  (two partials summed)
//   chime          0.21 -> 0.0105  (two partials summed)
//
// Even with every voice sounding at once the bus stays near 0.09 absolute, so
// clipping is arithmetically impossible and no limiter is needed to make that
// true. Changing MASTER is the only way to change the ceiling.
// =============================================================================
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export type SoundCue = 'poke' | 'page' | 'hover' | 'chime'

/** Explicit reader choice: 'on' | 'off'. Absent = never chosen (pill eligible). */
const PREF_KEY = 'akiha:sound'
/** Set once the invitation pill has been shown, so it is offered exactly once. */
const ASKED_KEY = 'akiha:sound-asked'

/** The single ceiling for the whole layer (see LEVELS above). */
const MASTER = 0.05
/** Minimum gap between two hover bells, so a swept cursor cannot machine-gun. */
const HOVER_GAP_MS = 130
/** Minimum gap between two page turns. Reading crosses sections seconds apart,
 *  but a nav anchor jumps straight past two or three of them and would fire
 *  their first-arrival cues in the same frame — three sheets turning at once. */
const PAGE_GAP_MS = 260
/** How long the invitation pill stays before retiring itself. */
const PILL_LIFE_MS = 6500
/** Delay after the first interaction before the pill appears, so it never lands
 *  under the pointer of the click that summoned it. */
const PILL_DELAY_MS = 900

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let enabled = false
/** True once the reader has produced a real input event. The audio context is
 *  never constructed before this — autoplay compliance, stated as a gate rather
 *  than discovered as an exception. */
let gestured = false

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

/** Build the graph on first real need. Returns null until sound is both on and
 *  a gesture has happened, which is what keeps the constructor off the load path. */
function audio(): AudioContext | null {
  if (!enabled || !gestured) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = MASTER
    master.connect(ctx.destination)

    // One second of white noise, reused by every noise voice at different
    // playback rates and filter settings. Allocating it once keeps the poke
    // instantaneous (no buffer fill on the click).
    const len = Math.floor(ctx.sampleRate)
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
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
  if (!noise || !master) return
  const src = ac.createBufferSource()
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
  if (!master) return
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  for (const [hz, at] of opts.bend ?? []) osc.frequency.exponentialRampToValueAtTime(hz, t0 + at)
  const g = ac.createGain()
  envelope(g, t0, opts.peak, opts.attack, opts.decay)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + opts.attack + opts.decay + 0.05)
}

/**
 * Play a cue. A no-op — with no side effects and no context construction — for
 * every reason sound might not be running, so callers never have to ask.
 */
export function play(cue: SoundCue): void {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime

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
  // Reduced motion: silence, and no machinery at all. The toggle keeps its
  // reserved slot in the nav but is never made visible, so there is no control
  // on screen promising something this mode will not do.
  if (reduce) return

  const toggle = document.querySelector<HTMLButtonElement>('[data-sound-toggle]')
  if (!toggle) return
  // `.nav__end` — the pill hangs off the same anchor the toggle sits in, so it
  // lands under the control it is talking about and next to it in tab order.
  const pillHost = toggle.parentElement

  const pref = readPref()
  enabled = pref === 'on'
  toggle.setAttribute('aria-pressed', String(enabled))
  toggle.classList.add('is-ready')

  const setEnabled = (next: boolean, announce: boolean) => {
    enabled = next
    toggle.setAttribute('aria-pressed', String(next))
    writePref(PREF_KEY, next ? 'on' : 'off')
    // Turning sound ON is itself an action that deserves an answer, and the
    // chime is the layer's gentlest voice — so the control demonstrates what it
    // just did instead of describing it.
    if (next && announce) play('chime')
    if (!next && ctx) void ctx.suspend()
  }

  // Native <button>: Enter and Space already work, focus ring comes from CSS.
  toggle.addEventListener('click', () => {
    retirePill()
    setEnabled(!enabled, true)
  })

  // ---- invitation pill ------------------------------------------------------
  // Offered once, only to a reader who has never chosen, and only after they
  // have done something — before that there is no gesture to build audio on and
  // no evidence they are reading rather than passing through.
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
      setEnabled(true, true)
    })
    // Two frames: the element must be laid out at its from-state before the
    // class that transitions it is added, or it snaps in with no move at all.
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')))
    pillTimer = window.setTimeout(retirePill, PILL_LIFE_MS)
  }

  // ---- first gesture --------------------------------------------------------
  const onFirstGesture = () => {
    if (gestured) return
    gestured = true
    window.setTimeout(offerPill, PILL_DELAY_MS)
  }
  ;(['pointerdown', 'keydown', 'wheel', 'touchstart'] as const).forEach((type) =>
    window.addEventListener(type, onFirstGesture, { passive: true, once: true }),
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
  ;['#about', '#activity', '#works', '#contact'].forEach((sel) => {
    if (!document.querySelector(sel)) return
    ScrollTrigger.create({ trigger: sel, start: 'top 60%', once: true, onEnter: turnPage })
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
