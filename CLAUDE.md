# CLAUDE.md

## Project Overview & Goals

The purpose of this project is to provide a demo of a React component which displays an animated element on the page which reacts to page scrolling in such a way that simulates how a real, physical object would react and change appearance in response to directional force. On-screen controls can be used to fine-tune the behavior of the physics object.

The project should work well on both desktop and mobile, adjusting any overlay UI to adapt.

The physics element should be relatively easy to extract from this project and insert into any standard React project as a component.

## Dev Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Architecture

The core design is a **vanilla JS physics engine wrapped by a thin React layer**:

1. **`src/lib/ScrollPhysicsElement.ts`** — The physics engine. No React dependencies. Manages scroll velocity/acceleration, frame selection, image preloading, and the rAF animation loop. This is the heart of the project.

2. **`src/hooks/useScrollPhysics.ts`** — React hook that wraps `ScrollPhysicsElement`. Handles lifecycle (create/destroy) and syncs option changes without recreating the instance. Note: `imagePath` and `numFrames` trigger recreation; tuning params do not.

3. **`src/components/ScrollPhysicsImage.tsx`** — React component rendering the animated image. Handles mobile detection and responsive overrides. Exposes the physics instance via ref.

4. **`src/components/ViewportWasher.tsx`** — Independent 3D canvas ring renderer. Uses perspective projection, back-face culling, and painter's algorithm. Geometry is pre-computed at module load.

5. **`src/App.tsx`** — Demo app with interactive controls UI and a real-time physics HUD.

## Physics Engine Notes

- **Frame-rate independent**: smoothing alphas are adjusted by `dtRatio = dt / TARGET_DT`
- **Force model**: `force = acceleration × responsiveness` → drives frame selection
- **EMA smoothing** on velocity and acceleration; hysteresis thresholds prevent jitter
- Delta time is clamped to avoid spikes on tab re-focus

## TypeScript Config

Strict mode is on with `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`. Keep all declarations used or remove them — the build will fail otherwise.

## Coding Conventions

- Hooks only, no class components
- `useRef` for DOM access and storing mutable instance state
- `useEffect` dependency arrays must be explicit; add a comment when intentionally omitting a dep
- Type-only imports use the `type` keyword
- Section headers in `.ts` files use repeated `=` dividers
- Validate physics parameter setters with `Math.max`/`Math.min` bounds
- Z-index layers: washers (0–2), physics image (1000), HUD (1400), controls (1500)
