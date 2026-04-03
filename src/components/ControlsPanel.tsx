import { useState } from 'react'
import { Slider, Toggle, Section } from './Controls'
import type { TunableOpts, ThresholdMode } from '../lib/ScrollPhysicsElement'

interface ControlsPanelProps {
  tunableOpts: TunableOpts
  onTunableChange: <K extends keyof TunableOpts>(
    key: K,
    value: TunableOpts[K],
  ) => void
  anchorIndicatorsVisible: boolean
  onAnchorIndicatorsVisibleChange: (v: boolean) => void
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
  anchorIndicatorsVisible,
  onAnchorIndicatorsVisibleChange,
  washersVisible,
  onWashersVisibleChange,
  washerFocalLength,
  onWasherFocalLengthChange,
  stripesVisible,
  onStripesVisibleChange,
  onReset,
}: ControlsPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isInfoMode, setIsInfoMode] = useState(false)

  return (
    <>
      <aside className={`controls${isOpen ? '' : ' controls--closed'}`}>
        <div className="controls-inner">
          <div className="controls-header">
            <h2 className="controls-title">Physics Controls</h2>
            <button
              className={`controls-info-btn${isInfoMode ? ' controls-info-btn--active' : ''}`}
              onClick={() => setIsInfoMode((o) => !o)}
              aria-label="Toggle parameter descriptions"
            >?</button>
          </div>

          <Section title="Physics">
            <Slider
              label="responsiveness"
              value={tunableOpts.responsiveness}
              min={0.01}
              max={1}
              onChange={(v) => onTunableChange('responsiveness', v)}
              description="How strongly the object reacts to scroll force. Higher values mean more exaggerated deformation."
              showInfo={isInfoMode}
            />
            <Slider
              label="mass"
              value={tunableOpts.mass}
              min={0.1}
              max={2}
              onChange={(v) => onTunableChange('mass', v)}
              description="Resistance to changes in acceleration. Higher mass makes the object feel heavier and slower to respond."
              showInfo={isInfoMode}
            />
            <Slider
              label="accelerationWeight"
              value={tunableOpts.accelerationWeight}
              min={0}
              max={2}
              onChange={(v) => onTunableChange('accelerationWeight', v)}
              description="How much sudden changes in scroll speed contribute to the net force on the object."
              showInfo={isInfoMode}
            />
            <Slider
              label="velocityWeight"
              value={tunableOpts.velocityWeight}
              min={0}
              max={2}
              onChange={(v) => onTunableChange('velocityWeight', v)}
              description="How much sustained scroll speed contributes to the net force. Acts like wind resistance."
              showInfo={isInfoMode}
            />
            <Slider
              label="velocitySmoothing"
              value={tunableOpts.velocitySmoothingFactor}
              min={0.01}
              max={1}
              onChange={(v) => onTunableChange('velocitySmoothingFactor', v)}
              description="Exponential moving average applied to velocity. Higher values reduce jitter but slow the response."
              showInfo={isInfoMode}
            />
            <Slider
              label="accelSmoothing"
              value={tunableOpts.accelerationSmoothingFactor}
              min={0.01}
              max={1}
              onChange={(v) =>
                onTunableChange('accelerationSmoothingFactor', v)
              }
              description="Exponential moving average applied to acceleration. Higher values reduce jitter but slow the response."
              showInfo={isInfoMode}
            />
            <Slider
              label="maxVelocity"
              value={tunableOpts.maxVelocity}
              min={1000}
              max={20000}
              step={100}
              onChange={(v) => onTunableChange('maxVelocity', v)}
              description="Caps raw velocity to prevent spikes from irregular frame timing on mobile."
              showInfo={isInfoMode}
            />
          </Section>

          <Section title="Thresholds">
            <label className="ctrl-row">
              <span className="ctrl-label">mode</span>
              <select
                value={tunableOpts.thresholdMode}
                onChange={(e) =>
                  onTunableChange(
                    'thresholdMode',
                    e.target.value as ThresholdMode,
                  )
                }
              >
                <option value="linear">linear</option>
                <option value="exponential">exponential</option>
              </select>
            </label>
            {isInfoMode && <p className="ctrl-desc">Whether frame thresholds are evenly spaced (linear) or grow exponentially between frames.</p>}
            <Slider
              label="baseForce"
              value={tunableOpts.baseForceThreshold}
              min={100}
              max={5000}
              step={10}
              onChange={(v) => onTunableChange('baseForceThreshold', v)}
              description="The force threshold for the first deformation frame. Only used in exponential mode."
              showInfo={isInfoMode}
            />
            <Slider
              label="multiplier"
              value={tunableOpts.forceThresholdMultiplier}
              min={1}
              max={10}
              onChange={(v) => onTunableChange('forceThresholdMultiplier', v)}
              description="The ratio between successive frame thresholds. Only used in exponential mode."
              showInfo={isInfoMode}
            />
            <Slider
              label="maxForce"
              value={tunableOpts.maxForceValue}
              min={1000}
              max={50000}
              step={100}
              onChange={(v) => onTunableChange('maxForceValue', v)}
              description="The force value at which the maximum deformation frame is reached. Only used in linear mode."
              showInfo={isInfoMode}
            />
            <Slider
              label="buffer"
              value={tunableOpts.thresholdBuffer}
              min={0}
              max={0.5}
              onChange={(v) => onTunableChange('thresholdBuffer', v)}
              description="Hysteresis applied to frame transitions — prevents flickering when force hovers near a threshold."
              showInfo={isInfoMode}
            />
          </Section>

          <Section title="Frames">
            <Slider
              label="easingSpeed"
              value={tunableOpts.frameEasingSpeed}
              min={0.01}
              max={0.3}
              onChange={(v) => onTunableChange('frameEasingSpeed', v)}
              description="How quickly the displayed frame eases toward the target. Lower values create a floatier transition."
              showInfo={isInfoMode}
            />
          </Section>

          <Section title="Anchor">
            <Toggle
              label="enabled"
              value={tunableOpts.anchorEnabled}
              onChange={(v) => onTunableChange('anchorEnabled', v)}
              description="Whether the object anchors at the top and bottom of the page when scrolled to those positions."
              showInfo={isInfoMode}
            />
            <Toggle
              label="showIndicators"
              value={anchorIndicatorsVisible}
              onChange={onAnchorIndicatorsVisibleChange}
              description="Shows visual markers for the anchor positions on the page."
              showInfo={isInfoMode}
            />
          </Section>

          <Section title="Splat">
            <Toggle
              label="enabled"
              value={tunableOpts.splatEnabled}
              onChange={(v) => onTunableChange('splatEnabled', v)}
              description="Whether the object plays a splat animation when hitting an anchor point."
              showInfo={isInfoMode}
            />
            <Slider
              label="severity"
              value={tunableOpts.splatSeverity}
              min={0}
              max={1.0}
              onChange={(v) => onTunableChange('splatSeverity', v)}
              description="How intense the splat deformation is on impact."
              showInfo={isInfoMode}
            />
            <Slider
              label="recoverySpeed"
              value={tunableOpts.splatRecoverySpeed}
              min={0.001}
              max={0.5}
              onChange={(v) => onTunableChange('splatRecoverySpeed', v)}
              description="How quickly the object recovers from a splat back to its resting state."
              showInfo={isInfoMode}
            />
          </Section>

          <Section title="Washers">
            <Toggle
              label="visible"
              value={washersVisible}
              onChange={onWashersVisibleChange}
              description="Toggles the 3D ring elements in the scene."
              showInfo={isInfoMode}
            />
            <Slider
              label="focalLength"
              value={washerFocalLength}
              min={400}
              max={1400}
              step={10}
              onChange={onWasherFocalLengthChange}
              description="Perspective projection of the washers. Higher values flatten the perspective; lower values exaggerate it."
              showInfo={isInfoMode}
            />
          </Section>

          <Section title="Scene">
            <Toggle
              label="stripes"
              value={stripesVisible}
              onChange={onStripesVisibleChange}
              description="Toggles the background stripe pattern."
              showInfo={isInfoMode}
            />
          </Section>

          <button className="reset-btn" onClick={onReset}>
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

export { DEFAULT_FOCAL_LENGTH } from './ViewportWasher'
