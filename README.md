# Scroll Physics Animation

A React demo of an animated element that reacts to page scrolling with simulated physical behavior — frame selection, velocity/acceleration smoothing, anchor snapping, and splat deformation.

## Demo Features

- Scroll-driven frame animation with EMA-smoothed velocity and acceleration
- Anchor system: snap the element to upper/lower positions on the page
- Splat animation: element deforms when hitting an anchor
- Real-time physics HUD showing live internal state
- Interactive controls panel to tune all physics parameters
- 3D viewport washer rings rendered via a custom canvas renderer
- Mobile-responsive with per-breakpoint physics overrides

## Dev Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Using the Physics Component

The `ScrollPhysicsImage` component is designed to be extracted and dropped into any React project. At minimum, it just needs a couple other files to work properly, as shown below.

### Minimal Usage

```tsx
import { ScrollPhysicsImage } from './components/ScrollPhysicsImage';
import { FRAME_SETS } from './lib/frameSets';

<ScrollPhysicsImage frameSet={FRAME_SETS.default} />
```

### Providing Custom Settings

The `ScrollPhysicsImage` component takes any of the props defined in the Physics Options section below. For loading the frames, please note that frames must be PNGs, and they must have the correct prefixing in order to be picked up correctly. At time of writing, [the required prefixes are as follows](https://github.com/cbmitchell/scroll-physics-animation/blob/cb8cdb2adbe932743d2332fbffa283dd709603ed/src/lib/ScrollPhysicsElement.ts#L342-L364):
- `upward-i.png`
- `downward-i.png`
- `up-splat-i.png`
- `down-splat-i.png`

Providing props to the component would look something like this:

```tsx
<ScrollPhysicsImage
  frameSet={{
    imagePath: '/images/my-frames/',
    numFrames: 10,
  }}
  responsiveness={0.4}
  anchorEnabled={true}
  splatEnabled={true}
/>
```

### Scrollable Container (mobile Safari)

Pass a `scrollContainerRef` to read `scrollTop` from a container element instead of `window.scrollY`, which avoids issues with mobile Safari's dynamic browser chrome:

```tsx
const containerRef = useRef<HTMLDivElement>(null);

<div ref={containerRef} style={{ overflowY: 'scroll', height: '100dvh' }}>
  <ScrollPhysicsImage scrollContainerRef={containerRef} frameSet={FRAME_SETS.default} />
</div>
```

### Mobile Overrides
You can set overrides for the setting defaults which will take effect when the project is being viewed on mobile devices (or, more specifically, touch-enabled devices). This can be useful since mobile browsers behave differently than desktop browsers, resulting in the need for some fine-tuning.

```tsx
<ScrollPhysicsImage
  frameSet={FRAME_SETS.default}
  responsiveness={0.3}
  mobileOverrides={{ responsiveness: 0.5 }}
/>
```

## Physics Options

| Option | Type | Description |
|---|---|---|
| `frameSet` | `FrameSetConfig` | Image path, frame count, and anchor visual offsets |
| `responsiveness` | `number` | How strongly scroll force drives frame selection |
| `mass` | `number` | Resistance to force changes |
| `velocityWeight` | `number` | Contribution of velocity to the force signal |
| `accelerationWeight` | `number` | Contribution of acceleration to the force signal |
| `velocitySmoothingFactor` | `number` | EMA alpha for velocity smoothing |
| `accelerationSmoothingFactor` | `number` | EMA alpha for acceleration smoothing |
| `thresholdMode` | `'linear' \| 'exponential'` | Frame threshold distribution |
| `baseForceThreshold` | `number` | Minimum force needed to leave the neutral frame |
| `maxForceValue` | `number` | Force value that maps to the last frame |
| `anchorEnabled` | `boolean` | Enable upper/lower scroll anchors |
| `anchorUpperScrollPosition` | `number \| null` | Scroll Y for the upper anchor |
| `anchorLowerScrollPosition` | `number \| null` | Scroll Y for the lower anchor |
| `viewportVerticalPosition` | `number` | Viewport % for element position while following (default 50) |
| `splatEnabled` | `boolean` | Enable splat deformation on anchor impact |
| `splatSeverity` | `number` | How hard the splat hits |
| `splatRecoverySpeed` | `number` | How quickly the element recovers from a splat |

## Architecture

```
src/
  lib/
    ScrollPhysicsElement.ts   # Vanilla JS physics engine (no React)
    frameSets.ts              # Frame set catalog
  hooks/
    useScrollPhysics.ts       # React lifecycle wrapper for the engine
  components/
    ScrollPhysicsImage.tsx    # Drop-in React component
    ViewportWasher.tsx        # 3D canvas ring renderer
    ControlsPanel.tsx         # Interactive tuning UI
    PhysicsHUD.tsx            # Real-time debug overlay
    AnchorIndicators.tsx      # Visual anchor position indicators
  App.tsx                     # Demo app
```

The physics engine (`ScrollPhysicsElement`) has no React dependencies and can be used standalone:

```ts
import { ScrollPhysicsElement } from './lib/ScrollPhysicsElement';

const physics = new ScrollPhysicsElement(imgElement, {
  frameSet: { imagePath: '/frames/', numFrames: 10 },
  responsiveness: 0.3,
});

// later:
physics.destroy();
```

## Stack

- React 19
- TypeScript (strict)
- Vite
