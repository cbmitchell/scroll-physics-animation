import { useState } from 'react'
import { Slider, Toggle, Section } from './Controls'
import type { TunableOpts, ThresholdMode } from '../lib/ScrollPhysicsElement'

const DEFAULT_FOCAL_LENGTH = 700

interface ControlsPanelProps {
  tunableOpts: TunableOpts
  onTunableChange: <K extends keyof TunableOpts>(key: K, value: TunableOpts[K]) => void
  washersVisible: boolean
  onWashersVisibleChange: (v: boolean) => void
  washerFocalLength: number
  onWasherFocalLengthChange: (v: number) => void
  stripesVisible: boolean
  onStripesVisibleChange: (v: boolean) => void
  onReset: () => void
}

export function ControlsPanel({
  tunableOpts,
  onTunableChange,
  washersVisible,
  onWashersVisibleChange,
  washerFocalLength,
  onWasherFocalLengthChange,
  stripesVisible,
  onStripesVisibleChange,
  onReset,
}: ControlsPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      <aside className={`controls${isOpen ? '' : ' controls--closed'}`}>
        <div className="controls-inner">
          <h2 className="controls-title">Physics Controls</h2>

          <Section title="Physics">
            <Slider
              label="responsiveness"
              value={tunableOpts.responsiveness}
              min={0.01}
              max={2}
              onChange={(v) => onTunableChange('responsiveness', v)}
            />
            <Slider
              label="mass"
              value={tunableOpts.mass}
              min={0.1}
              max={5}
              onChange={(v) => onTunableChange('mass', v)}
            />
            <Slider
              label="accelerationWeight"
              value={tunableOpts.accelerationWeight}
              min={0}
              max={5}
              onChange={(v) => onTunableChange('accelerationWeight', v)}
            />
            <Slider
              label="velocityWeight"
              value={tunableOpts.velocityWeight}
              min={0}
              max={5}
              onChange={(v) => onTunableChange('velocityWeight', v)}
            />
            <Slider
              label="velocitySmoothing"
              value={tunableOpts.velocitySmoothingFactor}
              min={0.01}
              max={1}
              onChange={(v) => onTunableChange('velocitySmoothingFactor', v)}
            />
            <Slider
              label="accelSmoothing"
              value={tunableOpts.accelerationSmoothingFactor}
              min={0.01}
              max={1}
              onChange={(v) => onTunableChange('accelerationSmoothingFactor', v)}
            />
            <Slider
              label="maxVelocity"
              value={tunableOpts.maxVelocity}
              min={1000}
              max={50000}
              step={100}
              onChange={(v) => onTunableChange('maxVelocity', v)}
            />
          </Section>

          <Section title="Thresholds">
            <label className="ctrl-row">
              <span className="ctrl-label">mode</span>
              <select
                value={tunableOpts.thresholdMode}
                onChange={(e) =>
                  onTunableChange('thresholdMode', e.target.value as ThresholdMode)
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
              onChange={(v) => onTunableChange('baseForceThreshold', v)}
            />
            <Slider
              label="multiplier"
              value={tunableOpts.forceThresholdMultiplier}
              min={1}
              max={10}
              onChange={(v) => onTunableChange('forceThresholdMultiplier', v)}
            />
            <Slider
              label="maxForce"
              value={tunableOpts.maxForceValue}
              min={1000}
              max={50000}
              step={100}
              onChange={(v) => onTunableChange('maxForceValue', v)}
            />
            <Slider
              label="buffer"
              value={tunableOpts.thresholdBuffer}
              min={0}
              max={0.5}
              onChange={(v) => onTunableChange('thresholdBuffer', v)}
            />
          </Section>

          <Section title="Frames">
            <Slider
              label="easingSpeed"
              value={tunableOpts.frameEasingSpeed}
              min={0.01}
              max={1}
              onChange={(v) => onTunableChange('frameEasingSpeed', v)}
            />
          </Section>

          <Section title="Anchor">
            <Toggle
              label="enabled"
              value={tunableOpts.anchorEnabled}
              onChange={(v) => onTunableChange('anchorEnabled', v)}
            />
          </Section>

          <Section title="Splat">
            <Toggle
              label="enabled"
              value={tunableOpts.splatEnabled}
              onChange={(v) => onTunableChange('splatEnabled', v)}
            />
            <Slider
              label="severity"
              value={tunableOpts.splatSeverity}
              min={0}
              max={0.02}
              onChange={(v) => onTunableChange('splatSeverity', v)}
            />
            <Slider
              label="recoverySpeed"
              value={tunableOpts.splatRecoverySpeed}
              min={0.001}
              max={1}
              onChange={(v) => onTunableChange('splatRecoverySpeed', v)}
            />
          </Section>

          <Section title="Washers">
            <Toggle
              label="visible"
              value={washersVisible}
              onChange={onWashersVisibleChange}
            />
            <Slider
              label="focalLength"
              value={washerFocalLength}
              min={400}
              max={2000}
              step={10}
              onChange={onWasherFocalLengthChange}
            />
          </Section>

          <Section title="Scene">
            <Toggle
              label="stripes"
              value={stripesVisible}
              onChange={onStripesVisibleChange}
            />
          </Section>

          <button
            className="reset-btn"
            onClick={onReset}
          >
            Reset to defaults
          </button>
        </div>
      </aside>

      <button
        className="controls-toggle"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close controls' : 'Open controls'}
      >
        {isOpen ? '✕' : '☰'}
      </button>
    </>
  )
}

export { DEFAULT_FOCAL_LENGTH }
