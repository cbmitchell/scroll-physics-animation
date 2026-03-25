import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { ScrollPhysicsImage } from './components/ScrollPhysicsImage'
import { ViewportWasher } from './components/ViewportWasher'
import type { ScrollPhysicsElement, ScrollPhysicsOptions, ThresholdMode } from './lib/ScrollPhysicsElement'
import './App.css'

const PAGE_HEIGHT = 500 // dvh units
const NUM_RINGS = 5

const DEFAULTS: Required<Omit<ScrollPhysicsOptions, 'getScrollPosition' | 'anchorLowerScrollPosition'>> = {
  responsiveness: 0.3,
  mass: 1.0,
  accelerationWeight: 1.0,
  velocityWeight: 0.7,
  velocitySmoothingFactor: 0.3,
  accelerationSmoothingFactor: 0.3,
  maxVelocity: 15000,
  thresholdMode: 'linear',
  baseForceThreshold: 1000,
  forceThresholdMultiplier: 2.5,
  maxForceValue: 10000,
  thresholdBuffer: 0.2,
  numFrames: 10,
  frameEasingSpeed: 0.15,
  imagePath: '/images/physics_animation_frames/',
  anchorEnabled: true,
  anchorUpperScrollPosition: 375,
  anchorVerticalOffset: 50,
  splatEnabled: true,
  splatSeverity: 0.002,
  splatRecoverySpeed: 0.2,
}

// ── Control primitives ────────────────────────────────────────────────────────

function Slider({
  label, value, min, max, step = 0.001, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctrl-value">{Number(value.toPrecision(3))}</span>
    </label>
  )
}

function IntSlider({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctrl-value">{value}</span>
    </label>
  )
}

function Toggle({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="ctrl-row ctrl-toggle">
      <span className="ctrl-label">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ctrl-section">
      <div className="ctrl-section-title">{title}</div>
      {children}
    </div>
  )
}

// ── Physics HUD ───────────────────────────────────────────────────────────────

const HUD_BAR_W = 140
const HUD_BAR_H = 8

function drawHudBar(
  ctx: CanvasRenderingContext2D,
  value: number,
  scale: number,
  marks?: number[],
) {
  const W = HUD_BAR_W
  const H = HUD_BAR_H
  const cx = W / 2

  // Background
  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, W, H)

  // Fill from center toward positive or negative side
  const ratio = Math.min(1, Math.abs(value) / Math.max(1, scale))
  const fillW = ratio * cx
  ctx.fillStyle = '#4f8ef7'
  if (value >= 0) {
    ctx.fillRect(cx, 1, fillW, H - 2)
  } else {
    ctx.fillRect(cx - fillW, 1, fillW, H - 2)
  }

  // Threshold marks (symmetric around center)
  if (marks && marks.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (const m of marks) {
      const r = Math.min(1, m / Math.max(1, scale))
      const xPos = cx + r * cx
      const xNeg = cx - r * cx
      ctx.fillRect(xPos - 0.5, 0, 1, H)
      ctx.fillRect(xNeg - 0.5, 0, 1, H)
    }
  }

  // Center divider
  ctx.fillStyle = '#2a2d3a'
  ctx.fillRect(cx - 0.5, 0, 1, H)
}

function PhysicsHUD({
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
      canvas.width = HUD_BAR_W * dpr
      canvas.height = HUD_BAR_H * dpr
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

        if (velCtx) drawHudBar(velCtx, state.smoothedVelocity, o.maxVelocity)
        if (accelCtx) drawHudBar(accelCtx, state.smoothedAcceleration, o.maxVelocity * 3)
        if (forceCtx) drawHudBar(forceCtx, state.netForce, forceScale, levels)

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

// ── App ───────────────────────────────────────────────────────────────────────

type Opts = Required<Omit<ScrollPhysicsOptions, 'getScrollPosition' | 'anchorLowerScrollPosition'>>

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const physicsInstanceRef = useRef<ScrollPhysicsElement | null>(null)
  const [opts, setOpts] = useState<Opts>({ ...DEFAULTS })
  const [controlsOpen, setControlsOpen] = useState(true)
  const [hudOpen, setHudOpen] = useState(false)

  function set<K extends keyof Opts>(key: K, value: Opts[K]) {
    setOpts((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="app">
      {/* ── Scrollable scene ── */}
      <div className="scene" ref={scrollContainerRef}>
        <div className="page" style={{ height: `${PAGE_HEIGHT}dvh` }}>
          {Array.from({ length: NUM_RINGS }, (_, i) => (
            <ViewportWasher
              key={i}
              zBack={999}
              zFront={1001}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: `${(PAGE_HEIGHT / NUM_RINGS) * (i + 0.5)}dvh`,
              }}
            />
          ))}
        </div>

        <ScrollPhysicsImage
          scrollContainerRef={scrollContainerRef}
          instanceRef={physicsInstanceRef}
          {...opts}
        />
      </div>

      {/* ── Controls panel ── */}
      <aside className={`controls${controlsOpen ? '' : ' controls--closed'}`}>
        <div className="controls-inner">
          <h2 className="controls-title">Physics Controls</h2>

          <Section title="Physics">
            <Slider label="responsiveness" value={opts.responsiveness} min={0.01} max={2} onChange={(v) => set('responsiveness', v)} />
            <Slider label="mass" value={opts.mass} min={0.1} max={5} onChange={(v) => set('mass', v)} />
            <Slider label="accelerationWeight" value={opts.accelerationWeight} min={0} max={5} onChange={(v) => set('accelerationWeight', v)} />
            <Slider label="velocityWeight" value={opts.velocityWeight} min={0} max={5} onChange={(v) => set('velocityWeight', v)} />
            <Slider label="velocitySmoothing" value={opts.velocitySmoothingFactor} min={0.01} max={1} onChange={(v) => set('velocitySmoothingFactor', v)} />
            <Slider label="accelSmoothing" value={opts.accelerationSmoothingFactor} min={0.01} max={1} onChange={(v) => set('accelerationSmoothingFactor', v)} />
            <Slider label="maxVelocity" value={opts.maxVelocity} min={1000} max={50000} step={100} onChange={(v) => set('maxVelocity', v)} />
          </Section>

          <Section title="Thresholds">
            <label className="ctrl-row">
              <span className="ctrl-label">mode</span>
              <select
                value={opts.thresholdMode}
                onChange={(e) => set('thresholdMode', e.target.value as ThresholdMode)}
              >
                <option value="linear">linear</option>
                <option value="exponential">exponential</option>
              </select>
            </label>
            <Slider label="baseForce" value={opts.baseForceThreshold} min={100} max={5000} step={10} onChange={(v) => set('baseForceThreshold', v)} />
            <Slider label="multiplier" value={opts.forceThresholdMultiplier} min={1} max={10} onChange={(v) => set('forceThresholdMultiplier', v)} />
            <Slider label="maxForce" value={opts.maxForceValue} min={1000} max={50000} step={100} onChange={(v) => set('maxForceValue', v)} />
            <Slider label="buffer" value={opts.thresholdBuffer} min={0} max={0.5} onChange={(v) => set('thresholdBuffer', v)} />
          </Section>

          <Section title="Frames">
            <IntSlider label="numFrames" value={opts.numFrames} min={1} max={10} onChange={(v) => set('numFrames', v)} />
            <Slider label="easingSpeed" value={opts.frameEasingSpeed} min={0.01} max={1} onChange={(v) => set('frameEasingSpeed', v)} />
          </Section>

          <Section title="Anchor">
            <Toggle label="enabled" value={opts.anchorEnabled} onChange={(v) => set('anchorEnabled', v)} />
            <Slider label="upperPosition" value={opts.anchorUpperScrollPosition} min={0} max={800} step={1} onChange={(v) => set('anchorUpperScrollPosition', v)} />
            <Slider label="verticalOffset" value={opts.anchorVerticalOffset} min={0} max={100} step={1} onChange={(v) => set('anchorVerticalOffset', v)} />
          </Section>

          <Section title="Splat">
            <Toggle label="enabled" value={opts.splatEnabled} onChange={(v) => set('splatEnabled', v)} />
            <Slider label="severity" value={opts.splatSeverity} min={0} max={0.02} onChange={(v) => set('splatSeverity', v)} />
            <Slider label="recoverySpeed" value={opts.splatRecoverySpeed} min={0.001} max={1} onChange={(v) => set('splatRecoverySpeed', v)} />
          </Section>

          <button className="reset-btn" onClick={() => setOpts({ ...DEFAULTS })}>
            Reset to defaults
          </button>
        </div>
      </aside>

      <PhysicsHUD instanceRef={physicsInstanceRef} isOpen={hudOpen} opts={opts} />

      <button
        className="hud-toggle"
        onClick={() => setHudOpen((o) => !o)}
        aria-label={hudOpen ? 'Close HUD' : 'Open HUD'}
      >
        HUD
      </button>

      <button
        className="controls-toggle"
        onClick={() => setControlsOpen((o) => !o)}
        aria-label={controlsOpen ? 'Close controls' : 'Open controls'}
      >
        {controlsOpen ? '✕' : '☰'}
      </button>
    </div>
  )
}
