import { useRef, useState } from 'react'
import { ScrollPhysicsImage } from './components/ScrollPhysicsImage'
import { ViewportWasher } from './components/ViewportWasher'
import { ControlsPanel, DEFAULT_FOCAL_LENGTH } from './components/ControlsPanel'
import { PhysicsHUD } from './components/PhysicsHUD'
import { AnchorIndicators } from './components/AnchorIndicators'
import { TUNABLE_DEFAULTS, MOBILE_TUNABLE_OVERRIDES, isTouchPrimary } from './lib/ScrollPhysicsElement'
import type { ScrollPhysicsElement, TunableOpts } from './lib/ScrollPhysicsElement'
import { FRAME_SETS } from './lib/frameSets'
import './App.css'

const PAGE_HEIGHT = 500 // dvh units
const NUM_RINGS = 5

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const physicsInstanceRef = useRef<ScrollPhysicsElement | null>(null)
  const effectiveDefaults: TunableOpts = isTouchPrimary()
    ? { ...TUNABLE_DEFAULTS, ...MOBILE_TUNABLE_OVERRIDES }
    : TUNABLE_DEFAULTS
  const [tunableOpts, setTunableOpts] = useState<TunableOpts>(effectiveDefaults)
  const [hudOpen, setHudOpen] = useState(false)
  const [washersVisible, setWashersVisible] = useState(true)
  const [stripesVisible, setStripesVisible] = useState(true)
  const [anchorIndicatorsVisible, setAnchorIndicatorsVisible] = useState(false)
  const [washerFocalLength, setWasherFocalLength] =
    useState(DEFAULT_FOCAL_LENGTH)

  function set<K extends keyof TunableOpts>(key: K, value: TunableOpts[K]) {
    setTunableOpts((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setTunableOpts(effectiveDefaults)
    setWashersVisible(true)
    setWasherFocalLength(DEFAULT_FOCAL_LENGTH)
    setStripesVisible(true)
    setAnchorIndicatorsVisible(false)
  }

  return (
    <div className="app">
      {/* ── Scrollable scene ── */}
      <div className="scene" ref={scrollContainerRef}>
        <div className={`page${stripesVisible ? ' page--stripes' : ''}`} style={{ height: `${PAGE_HEIGHT}dvh` }}>
          {washersVisible &&
            Array.from({ length: NUM_RINGS }, (_, i) => (
              <ViewportWasher
                key={i}
                zBack={999}
                zFront={1001}
                focalLength={washerFocalLength}
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: `${(PAGE_HEIGHT / NUM_RINGS) * (i + 0.65) * 0.85}dvh`,
                }}
              />
            ))}
        </div>

        <AnchorIndicators
          visible={anchorIndicatorsVisible}
          scrollContainerRef={scrollContainerRef}
          upperAnchorVisualOffset={FRAME_SETS.default.upperAnchorVisualOffset}
          lowerAnchorVisualOffset={FRAME_SETS.default.lowerAnchorVisualOffset}
        />

        <ScrollPhysicsImage
          scrollContainerRef={scrollContainerRef}
          instanceRef={physicsInstanceRef}
          frameSet={FRAME_SETS.default}
          {...tunableOpts}
        />
      </div>

      {/* ── Controls panel ── */}
      <ControlsPanel
        tunableOpts={tunableOpts}
        onTunableChange={set}
        anchorIndicatorsVisible={anchorIndicatorsVisible}
        onAnchorIndicatorsVisibleChange={setAnchorIndicatorsVisible}
        washersVisible={washersVisible}
        onWashersVisibleChange={setWashersVisible}
        washerFocalLength={washerFocalLength}
        onWasherFocalLengthChange={setWasherFocalLength}
        stripesVisible={stripesVisible}
        onStripesVisibleChange={setStripesVisible}
        onReset={handleReset}
      />

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
    </div>
  )
}
