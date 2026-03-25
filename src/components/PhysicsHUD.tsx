import { useEffect, useRef, type MutableRefObject } from 'react'
import type { ScrollPhysicsElement, ScrollPhysicsOptions } from '../lib/ScrollPhysicsElement'

type Opts = Required<Omit<ScrollPhysicsOptions, 'getScrollPosition' | 'anchorLowerScrollPosition'>>

const BAR_W = 140
const BAR_H = 8

function drawBar(
  ctx: CanvasRenderingContext2D,
  value: number,
  scale: number,
  marks?: number[],
) {
  const cx = BAR_W / 2

  // Background
  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, BAR_W, BAR_H)

  // Fill from center toward positive or negative side
  const ratio = Math.min(1, Math.abs(value) / Math.max(1, scale))
  const fillW = ratio * cx
  ctx.fillStyle = '#4f8ef7'
  if (value >= 0) {
    ctx.fillRect(cx, 1, fillW, BAR_H - 2)
  } else {
    ctx.fillRect(cx - fillW, 1, fillW, BAR_H - 2)
  }

  // Threshold marks (symmetric around center)
  if (marks && marks.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (const m of marks) {
      const r = Math.min(1, m / Math.max(1, scale))
      const xPos = cx + r * cx
      const xNeg = cx - r * cx
      ctx.fillRect(xPos - 0.5, 0, 1, BAR_H)
      ctx.fillRect(xNeg - 0.5, 0, 1, BAR_H)
    }
  }

  // Center divider
  ctx.fillStyle = '#2a2d3a'
  ctx.fillRect(cx - 0.5, 0, 1, BAR_H)
}

export function PhysicsHUD({
  instanceRef,
  isOpen,
  opts,
}: {
  instanceRef: MutableRefObject<ScrollPhysicsElement | null>
  isOpen: boolean
  opts: Opts
}) {
  // Keep opts accessible inside the rAF loop without re-running the effect
  const optsRef = useRef(opts)
  optsRef.current = opts

  const velCanvasRef = useRef<HTMLCanvasElement>(null)
  const accelCanvasRef = useRef<HTMLCanvasElement>(null)
  const forceCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLSpanElement>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const splatRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const dpr = window.devicePixelRatio || 1

    function initCanvas(canvas: HTMLCanvasElement | null) {
      if (!canvas) return null
      canvas.width = BAR_W * dpr
      canvas.height = BAR_H * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      return ctx
    }

    const velCtx = initCanvas(velCanvasRef.current)
    const accelCtx = initCanvas(accelCanvasRef.current)
    const forceCtx = initCanvas(forceCanvasRef.current)

    let rafId: number
    function draw() {
      const state = instanceRef.current?.getState()
      if (state) {
        const o = optsRef.current
        const levels = state.forceIntensityLevels
        const lastLevel = levels[levels.length - 1] ?? o.maxForceValue
        // Give 20% headroom so the last mark sits at ~83% of the half-bar
        const forceScale = lastLevel * 1.2

        if (velCtx) drawBar(velCtx, state.smoothedVelocity, o.maxVelocity)
        if (accelCtx) drawBar(accelCtx, state.smoothedAcceleration, o.maxVelocity * 3)
        if (forceCtx) drawBar(forceCtx, state.netForce, forceScale, levels)

        if (frameRef.current) frameRef.current.textContent = `${state.currentDisplayFrame.toFixed(1)} → ${state.targetFrame}`
        if (anchorRef.current) anchorRef.current.textContent = state.anchorState
        if (splatRef.current) splatRef.current.textContent = state.splatFrame.toFixed(1)
      }
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [isOpen, instanceRef])

  if (!isOpen) return null

  return (
    <div className="hud">
      <div className="hud-bar-row">
        <span className="hud-label">velocity</span>
        <canvas className="hud-bar" ref={velCanvasRef} />
      </div>
      <div className="hud-bar-row">
        <span className="hud-label">accel</span>
        <canvas className="hud-bar" ref={accelCanvasRef} />
      </div>
      <div className="hud-bar-row">
        <span className="hud-label">netForce</span>
        <canvas className="hud-bar" ref={forceCanvasRef} />
      </div>
      <div className="hud-row"><span className="hud-label">frame</span><span className="hud-value" ref={frameRef}>0.0 → 0</span></div>
      <div className="hud-row"><span className="hud-label">anchor</span><span className="hud-value" ref={anchorRef}>none</span></div>
      <div className="hud-row"><span className="hud-label">splat</span><span className="hud-value" ref={splatRef}>0.0</span></div>
    </div>
  )
}
