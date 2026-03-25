import { useRef, useState } from 'react'
import { ScrollPhysicsImage } from './components/ScrollPhysicsImage'
import { ViewportWasher } from './components/ViewportWasher'
import { Slider, IntSlider, Toggle, Section } from './components/Controls'
import { PhysicsHUD } from './components/PhysicsHUD'
import type { ScrollPhysicsElement, ScrollPhysicsOptions, ThresholdMode } from './lib/ScrollPhysicsElement'
import './App.css'

const PAGE_HEIGHT = 500 // dvh units
const NUM_RINGS = 5

type Opts = Required<Omit<ScrollPhysicsOptions, 'getScrollPosition' | 'anchorLowerScrollPosition'>>

const DEFAULTS: Opts = {
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
