import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'

// ── Washer geometry ──────────────────────────────────────────────────────────
// The washer (torus-like ring) is modelled as a flat cylinder with a hole:
// a short tube of height DEPTH, outer radius OUTER_R, inner radius INNER_R.
// SEGMENTS controls how many quad slices the ring is divided into.
const OUTER_R = 180
const INNER_R = 150
const DEPTH = 30
const SEGMENTS = 24

// Default simulated focal length for the perspective projection. Higher = less distortion.
export const DEFAULT_FOCAL_LENGTH = 700

// Face colours: top and bottom annular rings each have their own colour;
// outer and inner cylindrical walls each have their own.
const COLOR_TOP = '#90cddd'
const COLOR_BOT = '#2c6271'
const COLOR_OUTER = '#539caf'
const COLOR_INNER = '#539caf'
const STROKE = 'black'
const STROKE_W = 3

// The two canvas layers sit at these z-indices. Content placed by the parent
// at a z-index between them will appear to pass through the washer's hole.
const Z_BACK = 0
const Z_FRONT = 2

// ── Types ────────────────────────────────────────────────────────────────────
type Vec3 = [number, number, number] // x, y, z in 3-D world space
type FaceKind = 'top-ring' | 'bot-ring' | 'outer-wall' | 'inner-wall'
type Face = { verts: Vec3[]; color: string; kind: FaceKind } // a convex polygon + fill colour
// ring identifies which annular face this seam borders. At draw time, if that
// ring face is not facing the viewer, the seam is trimmed to its screen-space
// left/right extremes to prevent perspective-pushed tails from showing through.
//
// skipWhenHidden: true for seams that should be omitted entirely when their
// ring is not facing the viewer, because the adjacent wall face is also culled:
//   outer + back half  → culled back outer wall → skip
//   inner + front half → culled front inner wall → skip
type Seam = { verts: Vec3[]; ring: 'top' | 'bot'; skipWhenHidden: boolean }

// ── buildHalf ────────────────────────────────────────────────────────────────
// Pre-builds all the quad faces for one half of the washer (front or back).
// The washer's ring axis is Y; segments are arranged in the XZ plane.
// Each segment produces four quads: the top annular strip, the bottom annular
// strip, a section of the outer wall, and a section of the inner wall.
//
// Splitting into halves lets the component sandwich page content between
// two canvas layers, so content appears to pass through the washer hole.
function buildHalf(side: 'front' | 'back'): Face[] {
  const faces: Face[] = []
  const Y_TOP = -DEPTH / 2
  const Y_BOT = DEPTH / 2
  // Shorthand: angle for segment index i mapped to [0, 2π)
  const cos = (i: number) => Math.cos((i / SEGMENTS) * Math.PI * 2)
  const sin = (i: number) => Math.sin((i / SEGMENTS) * Math.PI * 2)

  for (let i = 0; i < SEGMENTS; i++) {
    const j = (i + 1) % SEGMENTS // next segment index (wraps around)

    // Classify this segment as front or back by the sign of its mid-angle's
    // sine value. Because sin maps to the Z axis, sin < 0 means the segment
    // points toward the viewer (negative Z = closer in this projection).
    const midAngle = ((i + 0.5) / SEGMENTS) * Math.PI * 2
    const isFront = Math.sin(midAngle) < 0
    if (side === 'front' ? !isFront : isFront) continue

    // Top annular strip (Y_TOP face, outer edge → inner edge)
    faces.push({
      color: COLOR_TOP,
      kind: 'top-ring',
      verts: [
        [OUTER_R * cos(i), Y_TOP, OUTER_R * sin(i)],
        [OUTER_R * cos(j), Y_TOP, OUTER_R * sin(j)],
        [INNER_R * cos(j), Y_TOP, INNER_R * sin(j)],
        [INNER_R * cos(i), Y_TOP, INNER_R * sin(i)],
      ],
    })

    // Bottom annular strip (Y_BOT face) — winding reversed so normal faces down
    faces.push({
      color: COLOR_BOT,
      kind: 'bot-ring',
      verts: [
        [OUTER_R * cos(j), Y_BOT, OUTER_R * sin(j)],
        [OUTER_R * cos(i), Y_BOT, OUTER_R * sin(i)],
        [INNER_R * cos(i), Y_BOT, INNER_R * sin(i)],
        [INNER_R * cos(j), Y_BOT, INNER_R * sin(j)],
      ],
    })

    // Outer cylindrical wall section — wound bottom→top so the outward face passes culling
    faces.push({
      color: COLOR_OUTER,
      kind: 'outer-wall',
      verts: [
        [OUTER_R * cos(i), Y_BOT, OUTER_R * sin(i)],
        [OUTER_R * cos(j), Y_BOT, OUTER_R * sin(j)],
        [OUTER_R * cos(j), Y_TOP, OUTER_R * sin(j)],
        [OUTER_R * cos(i), Y_TOP, OUTER_R * sin(i)],
      ],
    })

    // Inner cylindrical wall section — wound bottom→top so the inward face passes culling
    faces.push({
      color: COLOR_INNER,
      kind: 'inner-wall',
      verts: [
        [INNER_R * cos(j), Y_BOT, INNER_R * sin(j)],
        [INNER_R * cos(i), Y_BOT, INNER_R * sin(i)],
        [INNER_R * cos(i), Y_TOP, INNER_R * sin(i)],
        [INNER_R * cos(j), Y_TOP, INNER_R * sin(j)],
      ],
    })
  }

  return faces
}

// Pre-computed once at module load — these never change at runtime.
const FRONT_FACES = buildHalf('front')
const BACK_FACES = buildHalf('back')

// ── buildSeamHalf ─────────────────────────────────────────────────────────────
// Pre-builds the four border circles (top-outer, top-inner, bottom-outer,
// bottom-inner) for one half of the washer, as ordered polylines.
//
// Each seam is drawn as a single continuous path rather than per-quad line
// segments, which eliminates the dotted appearance that arises when adjacent
// segment endpoints are stroked independently. The two halves share their
// endpoints at the exact left/right extremes of the ring (i = 0, SEGMENTS/2),
// so the full circle is seamlessly covered across both canvas layers.
//
// Requires SEGMENTS to be even so the front/back split lands on integer indices.
function buildSeamHalf(side: 'front' | 'back'): Seam[] {
  const cos = (i: number) => Math.cos((i / SEGMENTS) * Math.PI * 2)
  const sin = (i: number) => Math.sin((i / SEGMENTS) * Math.PI * 2)
  const Y_TOP = -DEPTH / 2
  const Y_BOT = DEPTH / 2

  // Back half: indices 0 → SEGMENTS/2, where sin(midAngle) ≥ 0 (farther from viewer).
  // Front half: indices SEGMENTS/2 → SEGMENTS (≡ 0), where sin(midAngle) < 0 (closer).
  const half = SEGMENTS / 2
  const start = side === 'back' ? 0 : half
  const end = side === 'back' ? half : SEGMENTS

  // skipWhenHidden: outer seams on the back half and inner seams on the front
  // half should be omitted entirely when their ring is non-visible, because
  // the adjacent wall face is also culled (back outer wall / front inner wall).
  const outerSkip = side === 'back'
  const innerSkip = side === 'front'

  return (
    [
      [OUTER_R, Y_TOP, 'top', outerSkip],
      [INNER_R, Y_TOP, 'top', innerSkip],
      [OUTER_R, Y_BOT, 'bot', outerSkip],
      [INNER_R, Y_BOT, 'bot', innerSkip],
    ] as [number, number, 'top' | 'bot', boolean][]
  ).map(([r, y, ring, skipWhenHidden]) => {
    const verts: Vec3[] = []
    for (let i = start; i <= end; i++) {
      verts.push([r * cos(i), y, r * sin(i)])
    }
    return { verts, ring, skipWhenHidden }
  })
}

const FRONT_SEAMS = buildSeamHalf('front')
const BACK_SEAMS = buildSeamHalf('back')

// ── project ──────────────────────────────────────────────────────────────────
// Maps a 3-D world point to a 2-D canvas pixel using perspective projection.
//
// (cx, cy) is the canvas centre. (ox, oy) offsets the vanishing point —
// when the washer is off-centre on screen, the vanishing point shifts so the
// viewer appears to be looking from the viewport centre, not the washer centre.
//
// Formula derivation: the vanishing point is at (cx + ox, cy + oy).
// A point at world-x maps to:  vanishingX + (world_x - ox) * scale
//                            = cx + ox + (v[0] - ox) * scale
// which simplifies to the expression below.
function project(
  v: Vec3,
  ox: number,
  oy: number,
  cx: number,
  cy: number,
  perspective: number,
): [number, number] {
  // scale < 1 for points behind centre (positive Z), > 1 for points in front (negative Z)
  const scale = perspective / (perspective + v[2])
  return [cx + (v[0] - ox) * scale + ox, cy + (v[1] - oy) * scale + oy]
}

// Average Z of a face's vertices — used as its depth for sorting.
function avgZ(verts: Vec3[]): number {
  return verts.reduce((s, v) => s + v[2], 0) / verts.length
}

// ── drawFaces ────────────────────────────────────────────────────────────────
// Clears the canvas and redraws the given face list with perspective projection.
//
// Uses two classic real-time 3-D techniques:
//  1. Back-face culling  — skip faces whose projected normal points away from
//     the camera, so we never draw the "inside" of a surface.
//  2. Painter's algorithm — draw surviving faces back-to-front by average Z,
//     so closer faces naturally paint over farther ones.
function drawFaces(
  ctx: CanvasRenderingContext2D,
  faces: Face[],
  seams: Seam[],
  ox: number,
  oy: number,
  drawFlatEdges = false,
  colorTop?: string,
  colorBot?: string,
  perspective = DEFAULT_FOCAL_LENGTH,
) {
  const cx = ctx.canvas.width / 2
  const cy = ctx.canvas.height / 2

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const visible = faces
    .map((face) => {
      const proj = face.verts.map((v) => project(v, ox, oy, cx, cy, perspective)) as [
        number,
        number,
      ][]

      // Compute the Z component of the 2-D cross product of the first two edges.
      // This is the screen-space normal: negative means the face winds clockwise
      // in canvas coordinates, i.e. it faces toward the viewer.
      const [ax, ay] = [proj[1][0] - proj[0][0], proj[1][1] - proj[0][1]]
      const [bx, by] = [proj[2][0] - proj[0][0], proj[2][1] - proj[0][1]]
      const nz = ax * by - ay * bx

      return { face, proj, nz, depth: avgZ(face.verts) }
    })
    .filter((f) => f.nz < 0) // back-face cull
    .sort((a, b) => b.depth - a.depth) // back-to-front (painter's)

  ctx.lineWidth = STROKE_W

  for (const { face, proj } of visible) {
    const color =
      colorTop && face.kind === 'top-ring'
        ? colorTop
        : colorBot && face.kind === 'bot-ring'
          ? colorBot
          : face.color

    // Fill the quad
    ctx.beginPath()
    ctx.moveTo(proj[0][0], proj[0][1])
    for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i][0], proj[i][1])
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()

    // Stroke edges 1→2 and 3→0 in the face colour — the angular cuts between
    // adjacent quads of the same macro face. A colour-matched stroke fills any
    // sub-pixel gaps between neighbouring quads without introducing a visible seam.
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(proj[1][0], proj[1][1])
    ctx.lineTo(proj[2][0], proj[2][1])
    ctx.moveTo(proj[3][0], proj[3][1])
    ctx.lineTo(proj[0][0], proj[0][1])
    ctx.stroke()
  }

  // Determine whether the top and bottom annular ring faces are currently
  // visible (facing the viewer) by back-face-culling a representative quad
  // from each ring. Seams that border a hidden ring face need to be trimmed
  // to their screen-space left/right extremes so that perspective-pushed tails
  // don't peek out from behind geometry. Seams bordering a visible ring face
  // must be drawn in full — their ring face acts as a cover and the seam runs
  // along a visible edge.
  const a1 = (1 / SEGMENTS) * Math.PI * 2
  const c1 = Math.cos(a1),
    s1 = Math.sin(a1)
  const Y_T = -DEPTH / 2,
    Y_B = DEPTH / 2
  const nzOf = (v0: Vec3, v1: Vec3, v2: Vec3) => {
    const p0 = project(v0, ox, oy, cx, cy, perspective)
    const p1 = project(v1, ox, oy, cx, cy, perspective)
    const p2 = project(v2, ox, oy, cx, cy, perspective)
    return (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0])
  }
  // Top ring winding: outer-i, outer-j, inner-j (matches buildHalf top strip)
  const topRingFacing =
    nzOf(
      [OUTER_R, Y_T, 0],
      [OUTER_R * c1, Y_T, OUTER_R * s1],
      [INNER_R * c1, Y_T, INNER_R * s1],
    ) < 0
  // Bottom ring winding reversed (matches buildHalf bottom strip)
  const botRingFacing =
    nzOf(
      [OUTER_R * c1, Y_B, OUTER_R * s1],
      [OUTER_R, Y_B, 0],
      [INNER_R, Y_B, 0],
    ) < 0

  ctx.strokeStyle = STROKE
  ctx.lineWidth = STROKE_W

  // Flat edge accumulators: outer seam extremes used to draw the left/right
  // silhouette lines after the seam loop (front canvas only).
  let topExtremes: { left: [number, number]; right: [number, number] } | null =
    null
  let botExtremes: { left: [number, number]; right: [number, number] } | null =
    null

  for (const seam of seams) {
    const ringFacing = seam.ring === 'top' ? topRingFacing : botRingFacing

    // When the adjacent ring is not facing the viewer, skip seams whose
    // neighbouring wall face is also culled — nothing on either side to show.
    if (!ringFacing && seam.skipWhenHidden) continue

    const proj = seam.verts.map((v) => project(v, ox, oy, cx, cy, perspective))

    // For flat edge drawing: scan the outer seams (identified by !skipWhenHidden
    // on the front canvas) for their screen-space left/right extremes.
    if (drawFlatEdges && !seam.skipWhenHidden) {
      let iL = 0,
        iR = 0
      for (let i = 1; i < proj.length; i++) {
        if (proj[i][0] < proj[iL][0]) iL = i
        if (proj[i][0] > proj[iR][0]) iR = i
      }
      const extremes = {
        left: proj[iL] as [number, number],
        right: proj[iR] as [number, number],
      }
      if (seam.ring === 'top') topExtremes = extremes
      else botExtremes = extremes
    }

    let iStart = 0,
      iEnd = proj.length - 1
    if (!ringFacing) {
      // Ring faces away from viewer: trim the arc to its screen-space left/right
      // extremes so the tails that curl back behind the geometry are not drawn.
      let iLeft = 0,
        iRight = 0
      for (let i = 1; i < proj.length; i++) {
        if (proj[i][0] < proj[iLeft][0]) iLeft = i
        if (proj[i][0] > proj[iRight][0]) iRight = i
      }
      iStart = Math.min(iLeft, iRight)
      iEnd = Math.max(iLeft, iRight)
    }

    ctx.beginPath()
    ctx.moveTo(proj[iStart][0], proj[iStart][1])
    for (let i = iStart + 1; i <= iEnd; i++) ctx.lineTo(proj[i][0], proj[i][1])
    ctx.stroke()
  }

  // Draw the left and right flat silhouette edges.
  if (drawFlatEdges && topExtremes && botExtremes) {
    ctx.beginPath()
    ctx.moveTo(topExtremes.left[0], topExtremes.left[1])
    ctx.lineTo(botExtremes.left[0], botExtremes.left[1])
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(topExtremes.right[0], topExtremes.right[1])
    ctx.lineTo(botExtremes.right[0], botExtremes.right[1])
    ctx.stroke()
  }
}

// ── Viewport-origin scheduler ─────────────────────────────────────────────────
// A single module-level requestAnimationFrame loop shared across all
// ViewportWasher instances. Each washer registers one element for position
// measurement; both its canvas layers share the result. This gives one
// getBoundingClientRect() call per washer per frame instead of two (one per
// canvas), and one RAF loop total instead of 2N for N washers.
//
// Effect: as each washer scrolls off-centre, its 3-D projection shifts so it
// always appears to be viewed from the viewport centre.

// Maximum world-space offset applied at the viewport edge.
const MAX_OX = 300
const MAX_OY = 200

type PositionCallback = (ox: number, oy: number) => void

interface WasherRegistration {
  callbacks: Set<PositionCallback>
  prevOx: number
  prevOy: number
}

const _registrations = new Map<HTMLElement, WasherRegistration>()
let _schedulerRafId: number | null = null

function _schedulerTick(): void {
  for (const [el, reg] of _registrations) {
    const rect = el.getBoundingClientRect()
    // Normalised offset: 0 when centred, ±1 at the viewport edge.
    const normX =
      (rect.left + rect.width / 2 - window.innerWidth / 2) /
      (window.innerWidth / 2)
    const normY =
      (rect.top + rect.height / 2 - window.innerHeight / 2) /
      (window.innerHeight / 2)
    // Negate: element to the right → shift vanishing point left so the
    // projection looks as if the viewer is centred on the viewport.
    const ox = -normX * MAX_OX
    const oy = -normY * MAX_OY
    if (ox !== reg.prevOx || oy !== reg.prevOy) {
      reg.prevOx = ox
      reg.prevOy = oy
      for (const cb of reg.callbacks) cb(ox, oy)
    }
  }
  _schedulerRafId = requestAnimationFrame(_schedulerTick)
}

/** Register a callback to receive (ox, oy) updates each frame. Returns cleanup. */
function _registerPosition(el: HTMLElement, cb: PositionCallback): () => void {
  if (!_registrations.has(el)) {
    _registrations.set(el, { callbacks: new Set(), prevOx: NaN, prevOy: NaN })
  }
  _registrations.get(el)!.callbacks.add(cb)
  if (_schedulerRafId === null) {
    _schedulerRafId = requestAnimationFrame(_schedulerTick)
  }
  return () => {
    const reg = _registrations.get(el)
    if (reg) {
      reg.callbacks.delete(cb)
      if (reg.callbacks.size === 0) _registrations.delete(el)
    }
    if (_registrations.size === 0 && _schedulerRafId !== null) {
      cancelAnimationFrame(_schedulerRafId)
      _schedulerRafId = null
    }
  }
}

// ── WasherCanvas ─────────────────────────────────────────────────────────────
// Internal component: a canvas that fills its parent (position absolute, inset 0)
// and draws the given face list. The parent drives redraws by calling
// drawCallbackRef.current(ox, oy) from the shared position scheduler.
function WasherCanvas({
  faces,
  seams,
  zIndex,
  drawFlatEdges = false,
  colorTop,
  colorBot,
  focalLength = DEFAULT_FOCAL_LENGTH,
  drawCallbackRef,
}: {
  faces: Face[]
  seams: Seam[]
  zIndex: number
  drawFlatEdges?: boolean
  colorTop?: string
  colorBot?: string
  focalLength?: number
  drawCallbackRef: RefObject<PositionCallback | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ ox: 0, oy: 0 })
  const focalLengthRef = useRef(focalLength)

  // Expose the draw function to the parent via drawCallbackRef.
  // useLayoutEffect (no deps) re-runs after every render, before regular effects,
  // which ensures the ref is restored after React StrictMode's cleanup/re-run cycle.
  useLayoutEffect(() => {
    drawCallbackRef.current = (ox, oy) => {
      posRef.current = { ox, oy }
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawFaces(ctx, faces, seams, ox, oy, drawFlatEdges, colorTop, colorBot, focalLengthRef.current)
    }
  })
  // Clear on unmount so the parent never calls a stale reference.
  useEffect(() => () => { drawCallbackRef.current = null }, [drawCallbackRef])

  // Redraw when focalLength changes.
  useEffect(() => {
    focalLengthRef.current = focalLength
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { ox, oy } = posRef.current
    drawFaces(ctx, faces, seams, ox, oy, drawFlatEdges, colorTop, colorBot, focalLength)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focalLength]) // intentionally omitting faces/seams/drawFlatEdges/colorTop/colorBot — module-level constants or stable props

  // Keep canvas pixel dimensions in sync with the wrapper's layout size and
  // redraw immediately after resize to avoid a blank-canvas flash.
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const wrapper = wrapperRef.current
      if (!canvas || !wrapper) return
      canvas.width = wrapper.clientWidth
      canvas.height = wrapper.clientHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const { ox, oy } = posRef.current
        drawFaces(ctx, faces, seams, ox, oy, drawFlatEdges, colorTop, colorBot, focalLengthRef.current)
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally omitting faces/seams/drawFlatEdges/colorTop/colorBot — module-level constants or stable props

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'absolute', inset: 0, zIndex, pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}

// Natural size of the washer element: diameter of the outer ring plus one DEPTH of breathing room on each side.
const SIZE = (OUTER_R + DEPTH) * 2

// ── ViewportWasher ───────────────────────────────────────────────────────────
// Renders two transparent canvas layers that together draw a 3-D washer ring.
//
// Each half lives in its own positioned wrapper (same pattern as
// ViewportPerspectiveBox) so that positioning styles like `transform` don't
// accidentally create a shared stacking context that would prevent content from
// being sandwiched between the two layers. The `style` prop is applied to both
// wrappers; zBack/zFront are then set on each individually.
//
// Usage: position the washer via `style` (e.g. `position:'absolute', top:…`).
// Any content you want to appear "through" the hole needs a z-index between
// zBack and zFront (default: 1, between 0 and 2).
export interface ViewportWasherProps {
  style?: CSSProperties
  /** Z-index for the back canvas layer (default: 0). Content should sit at zIndex + 1. */
  zBack?: number
  /** Z-index for the front canvas layer (default: zBack + 2). */
  zFront?: number
  /** Override color for the top annular ring face. */
  colorTop?: string
  /** Override color for the bottom annular ring face. */
  colorBot?: string
  /** Simulated focal length for perspective projection. Higher = less distortion (default: 700). */
  focalLength?: number
}

export function ViewportWasher({
  style,
  zBack = Z_BACK,
  zFront = Z_FRONT,
  colorTop,
  colorBot,
  focalLength,
}: ViewportWasherProps = {}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const backDrawRef = useRef<PositionCallback | null>(null)
  const frontDrawRef = useRef<PositionCallback | null>(null)

  // Register one position measurement for this washer. Both canvas layers
  // share the result — one getBoundingClientRect() per washer per frame.
  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    return _registerPosition(el, (ox, oy) => {
      backDrawRef.current?.(ox, oy)
      frontDrawRef.current?.(ox, oy)
    })
  }, []) // intentionally omits backDrawRef/frontDrawRef — refs are stable and callbacks are always current

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    pointerEvents: 'none',
    ...style,
  }

  return (
    <>
      <div ref={measureRef} style={{ ...wrapperStyle, zIndex: zBack }}>
        <WasherCanvas
          faces={BACK_FACES}
          seams={BACK_SEAMS}
          zIndex={0}
          colorTop={colorTop}
          colorBot={colorBot}
          focalLength={focalLength}
          drawCallbackRef={backDrawRef}
        />
      </div>
      <div style={{ ...wrapperStyle, zIndex: zFront }}>
        <WasherCanvas
          faces={FRONT_FACES}
          seams={FRONT_SEAMS}
          drawFlatEdges
          zIndex={0}
          colorTop={colorTop}
          colorBot={colorBot}
          focalLength={focalLength}
          drawCallbackRef={frontDrawRef}
        />
      </div>
    </>
  )
}
