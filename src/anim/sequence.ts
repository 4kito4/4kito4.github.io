// =============================================================================
// SCROLL-SCRUBBED IMAGE SEQUENCE ENGINE
//
// createScrubSequence maps a ScrollTrigger's 0->1 progress onto an array of
// frame URLs and paints the resolved frame to a <canvas> (cover-fit, DPR-aware).
//
// Discipline (taste-skill §5.B, §5.D, §6):
//   • Scroll is driven exclusively by GSAP ScrollTrigger — never a raw
//     `scroll` listener. Smoothing comes from `scrub`.
//   • Only the *latest* wanted frame is drawn, inside a single rAF, so a fast
//     scrub never queues a backlog of draws.
//   • Frames load asynchronously (Promise-based). Until a frame is decoded the
//     engine draws the nearest ALREADY-loaded frame, so the scrub never stalls.
//   • decode() failures are logged (not swallowed) and fall back to onload /
//     nearest-loaded, so one bad frame can never blank the canvas.
// =============================================================================
import { gsap } from 'gsap'

/** The ScrollTrigger vars the engine understands. Kept explicit (rather than
 *  leaking gsap's `any`-typed plugin module) so callers get real type checks. */
export interface ScrubTriggerVars {
  trigger: Element | string
  start?: string
  end?: string | (() => string)
  pin?: boolean
  scrub?: boolean | number
  anticipatePin?: number
  invalidateOnRefresh?: boolean
}

export interface ScrubSequenceOptions {
  /** Frame URLs in display order (index 0 = progress 0). */
  urls: string[]
  canvas: HTMLCanvasElement
  scrollTrigger: ScrubTriggerVars
  /** 'immediate' preloads frames 1..N right away; 'onEnter' waits until the
   *  trigger first scrolls into view. Frame 0 is always fetched up front. */
  preload?: 'immediate' | 'onEnter'
  fit?: 'cover' | 'contain'
  /** Called on every scrub tick (and refresh) with progress 0..1 and the
   *  resolved frame index. Used e.g. to fade a paper overlay near the end. */
  onUpdate?: (progress: number, frame: number) => void
}

export interface ScrubSequenceHandle {
  destroy(): void
}

export function createScrubSequence(opts: ScrubSequenceOptions): ScrubSequenceHandle {
  const { urls, canvas, fit = 'cover' } = opts
  const count = urls.length
  const ctx = canvas.getContext('2d')

  // Hard failure (no 2D context / empty list): return an inert handle rather
  // than throwing, so the page never dies on a canvas quirk.
  if (!ctx || count === 0) {
    return { destroy() {} }
  }

  const images: (HTMLImageElement | undefined)[] = new Array(count)
  const loaded: boolean[] = new Array(count).fill(false)
  const inflight: (Promise<void> | undefined)[] = new Array(count)

  let wantedFrame = 0
  let rafId = 0

  // ---- drawing -------------------------------------------------------------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap at 2x for perf
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width * dpr))
    const h = Math.max(1, Math.round(rect.height * dpr))
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
  }

  function drawImage(img: HTMLImageElement) {
    const cw = canvas.width
    const ch = canvas.height
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    if (!iw || !ih) return
    const scale = fit === 'cover' ? Math.max(cw / iw, ch / ih) : Math.min(cw / iw, ch / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx!.clearRect(0, 0, cw, ch)
    ctx!.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
  }

  /** Nearest ALREADY-loaded frame to `f` (searching outward), or -1 if none. */
  function resolveFrame(f: number): number {
    if (loaded[f]) return f
    for (let d = 1; d < count; d++) {
      if (f - d >= 0 && loaded[f - d]) return f - d
      if (f + d < count && loaded[f + d]) return f + d
    }
    return -1
  }

  function scheduleDraw() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      const f = resolveFrame(wantedFrame)
      if (f < 0) return
      drawImage(images[f]!)
    })
  }

  // ---- loading -------------------------------------------------------------
  function loadFrame(i: number): Promise<void> {
    const existing = inflight[i]
    if (existing) return existing
    const img = new Image()
    img.decoding = 'async'
    const settle = new Promise<void>((resolve) => {
      const ok = () => {
        if (loaded[i]) return resolve()
        images[i] = img
        loaded[i] = true
        // If this is the frame we're currently trying to show, upgrade from the
        // nearest-loaded fallback to the real frame.
        if (i === wantedFrame) scheduleDraw()
        resolve()
      }
      img.onload = ok
      img.onerror = () => {
        console.warn('[sequence] frame failed to load:', urls[i])
        resolve()
      }
      img.src = urls[i]
      // Prefer decode() for jank-free first paint; on rejection do NOT swallow —
      // log and lean on onload / nearest-loaded instead.
      img.decode?.().then(ok).catch((err) => {
        if (img.complete && img.naturalWidth > 0) ok()
        else console.warn('[sequence] decode rejected, awaiting load:', urls[i], err)
      })
    })
    inflight[i] = settle
    return settle
  }

  /** Fire-and-forget sequential preload so early frames are ready first without
   *  blocking the main thread (each await yields between decodes). */
  async function preloadFrom(startIndex: number) {
    for (let i = startIndex; i < count; i++) {
      if (!loaded[i]) await loadFrame(i)
    }
  }

  // ---- scrub driver --------------------------------------------------------
  function render(p: number) {
    wantedFrame = Math.min(count - 1, Math.max(0, Math.round(p * (count - 1))))
    scheduleDraw()
    opts.onUpdate?.(p, wantedFrame)
  }

  let preloadStarted = false
  const drive = { p: 0 }

  const stVars: Record<string, unknown> = {
    scrub: true,
    ...opts.scrollTrigger,
    onUpdate: () => render(drive.p),
    onRefresh: () => {
      resize()
      scheduleDraw()
    },
  }
  if (opts.preload === 'onEnter') {
    stVars.onEnter = () => {
      if (preloadStarted) return
      preloadStarted = true
      void preloadFrom(1)
    }
  }

  const tween = gsap.to(drive, { p: 1, ease: 'none', scrollTrigger: stVars })

  // Redraw when the canvas box changes size (pin spacer insert, orientation…).
  const ro = new ResizeObserver(() => {
    resize()
    scheduleDraw()
  })
  ro.observe(canvas)

  // Initial paint: size the canvas, then get frame 0 up as fast as possible.
  resize()
  loadFrame(0).then(() => scheduleDraw())
  if (opts.preload !== 'onEnter') void preloadFrom(1)

  return {
    destroy() {
      ro.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
      const st = (tween as unknown as { scrollTrigger?: { kill(): void } }).scrollTrigger
      st?.kill()
      tween.kill()
    },
  }
}

/** Build a zero-padded frame URL list, e.g. seqUrls('/seq/drop/drop_', 120). */
export function seqUrls(prefix: string, count: number, ext = 'webp', pad = 3): string[] {
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(i).padStart(pad, '0')}.${ext}`,
  )
}
