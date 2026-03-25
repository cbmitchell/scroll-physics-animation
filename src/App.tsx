import { useRef, useState } from 'react'
import { ScrollPhysicsImage } from './components/ScrollPhysicsImage'
import { ViewportWasher } from './components/ViewportWasher'
import { Slider, Toggle, Section } from './components/Controls'
import { PhysicsHUD } from './components/PhysicsHUD'
import { TUNABLE_DEFAULTS } from './lib/ScrollPhysicsElement'
import type {
  ScrollPhysicsElement,
  TunableOpts,
  ThresholdMode,
} from './lib/ScrollPhysicsElement'
import './App.css'

const PAGE_HEIGHT = 500 // dvh units
const NUM_RINGS = 5
const PHYSICS_IMAGE_PATH = '/images/physics_animation_frames/'
const PHYSICS_NUM_FRAMES = 10

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const physicsInstanceRef = useRef<ScrollPhysicsElement | null>(null)
  const [tunableOpts, setTunableOpts] = useState<TunableOpts>({
    ...TUNABLE_DEFAULTS,
  })
  const [controlsOpen, setControlsOpen] = useState(true)
  const [hudOpen, setHudOpen] = useState(false)

  function set<K extends keyof TunableOpts>(key: K, value: TunableOpts[K]) {
    setTunableOpts((prev) => ({ ...prev, [key]: value }))
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
                top: `${(PAGE_HEIGHT / NUM_RINGS) * (i + 0.65) * 0.85}dvh`,
              }}
            />
          ))}
        </div>

        <ScrollPhysicsImage
          scrollContainerRef={scrollContainerRef}
          instanceRef={physicsInstanceRef}
          imagePath={PHYSICS_IMAGE_PATH}
          numFrames={PHYSICS_NUM_FRAMES}
          {...tunableOpts}
        />
      </div>

      {/* ── Controls panel ── */}
      <aside className={`controls${controlsOpen ? '' : ' controls--closed'}`}>
        <div className="controls-inner">
          <h2 className="controls-title">Physics Controls</h2>

          <Section title="Physics">
            <Slider
              label="responsiveness"
              value={tunableOpts.responsiveness}
              min={0.01}
              max={2}
              onChange={(v) => set('responsiveness', v)}
            />
            <Slider
              label="mass"
              value={tunableOpts.mass}
              min={0.1}
              max={5}
              onChange={(v) => set('mass', v)}
            />
            <Slider
              label="accelerationWeight"
              value={tunableOpts.accelerationWeight}
              min={0}
              max={5}
              onChange={(v) => set('accelerationWeight', v)}
            />
            <Slider
              label="velocityWeight"
              value={tunableOpts.velocityWeight}
              min={0}
              max={5}
              onChange={(v) => set('velocityWeight', v)}
            />
            <Slider
              label="velocitySmoothing"
              value={tunableOpts.velocitySmoothingFactor}
              min={0.01}
              max={1}
              onChange={(v) => set('velocitySmoothingFactor', v)}
            />
            <Slider
              label="accelSmoothing"
              value={tunableOpts.accelerationSmoothingFactor}
              min={0.01}
              max={1}
              onChange={(v) => set('accelerationSmoothingFactor', v)}
            />
            <Slider
              label="maxVelocity"
              value={tunableOpts.maxVelocity}
              min={1000}
              max={50000}
              step={100}
              onChange={(v) => set('maxVelocity', v)}
            />
          </Section>

          <Section title="Thresholds">
            <label className="ctrl-row">
              <span className="ctrl-label">mode</span>
              <select
                value={tunableOpts.thresholdMode}
                onChange={(e) =>
                  set('thresholdMode', e.target.value as ThresholdMode)
                }
              >
                <option value="linear">linear</option>
                <option value="exponential">exponential</option>
              </select>
            </label>
            <Slider
              label="baseForce"
              value={tunableOpts.baseForceThreshold}
              min={100}
              max={5000}
              step={10}
              onChange={(v) => set('baseForceThreshold', v)}
            />
            <Slider
              label="multiplier"
              value={tunableOpts.forceThresholdMultiplier}
              min={1}
              max={10}
              onChange={(v) => set('forceThresholdMultiplier', v)}
            />
            <Slider
              label="maxForce"
              value={tunableOpts.maxForceValue}
              min={1000}
              max={50000}
              step={100}
              onChange={(v) => set('maxForceValue', v)}
            />
            <Slider
              label="buffer"
              value={tunableOpts.thresholdBuffer}
              min={0}
              max={0.5}
              onChange={(v) => set('thresholdBuffer', v)}
            />
          </Section>

          <Section title="Frames">
            <Slider
              label="easingSpeed"
              value={tunableOpts.frameEasingSpeed}
              min={0.01}
              max={1}
              onChange={(v) => set('frameEasingSpeed', v)}
            />
          </Section>

          <Section title="Anchor">
            <Toggle
              label="enabled"
              value={tunableOpts.anchorEnabled}
              onChange={(v) => set('anchorEnabled', v)}
            />
            <Slider
              label="verticalOffset"
              value={tunableOpts.anchorVerticalOffset}
              min={0}
              max={100}
              step={1}
              onChange={(v) => set('anchorVerticalOffset', v)}
            />
          </Section>

          <Section title="Splat">
            <Toggle
              label="enabled"
              value={tunableOpts.splatEnabled}
              onChange={(v) => set('splatEnabled', v)}
            />
            <Slider
              label="severity"
              value={tunableOpts.splatSeverity}
              min={0}
              max={0.02}
              onChange={(v) => set('splatSeverity', v)}
            />
            <Slider
              label="recoverySpeed"
              value={tunableOpts.splatRecoverySpeed}
              min={0.001}
              max={1}
              onChange={(v) => set('splatRecoverySpeed', v)}
            />
          </Section>

          <button
            className="reset-btn"
            onClick={() => setTunableOpts({ ...TUNABLE_DEFAULTS })}
          >
            Reset to defaults
          </button>
        </div>
      </aside>

      <PhysicsHUD
        instanceRef={physicsInstanceRef}
        isOpen={hudOpen}
        opts={tunableOpts}
      />

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
