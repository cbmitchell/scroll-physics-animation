import { useRef, useState } from 'react'
import { ScrollPhysicsImage } from './components/ScrollPhysicsImage'
import { ViewportWasher } from './components/ViewportWasher'
import { ControlsPanel, DEFAULT_FOCAL_LENGTH } from './components/ControlsPanel'
import { PhysicsHUD } from './components/PhysicsHUD'
import { TUNABLE_DEFAULTS } from './lib/ScrollPhysicsElement'
import type { ScrollPhysicsElement, TunableOpts } from './lib/ScrollPhysicsElement'
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
  const [hudOpen, setHudOpen] = useState(false)
  const [washersVisible, setWashersVisible] = useState(true)
  const [stripesVisible, setStripesVisible] = useState(true)
  const [washerFocalLength, setWasherFocalLength] =
    useState(DEFAULT_FOCAL_LENGTH)

  function set<K extends keyof TunableOpts>(key: K, value: TunableOpts[K]) {
    setTunableOpts((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setTunableOpts({ ...TUNABLE_DEFAULTS })
    setWashersVisible(true)
    setWasherFocalLength(DEFAULT_FOCAL_LENGTH)
    setStripesVisible(true)
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

        <ScrollPhysicsImage
          scrollContainerRef={scrollContainerRef}
          instanceRef={physicsInstanceRef}
          imagePath={PHYSICS_IMAGE_PATH}
          numFrames={PHYSICS_NUM_FRAMES}
          {...tunableOpts}
        />
      </div>

      {/* ── Controls panel ── */}
      <ControlsPanel
        tunableOpts={tunableOpts}
        onTunableChange={set}
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
