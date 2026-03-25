/**
 * ScrollPhysicsElement
 *
 * A scroll-responsive animation engine that swaps image frames based on
 * real-time scroll velocity and acceleration. Designed to be used standalone
 * or wrapped by a React hook/component.
 *
 * Usage (vanilla):
 *   const physics = new ScrollPhysicsElement(imgElement, {
 *     imagePath: '/images/myframes/',
 *     numFrames: 10,
 *     responsiveness: 0.3,
 *   });
 *   // later:
 *   physics.destroy();
 *
 * All configurable parameters can be passed in the constructor options object
 * or updated at runtime via setter methods.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ThresholdMode = 'linear' | 'exponential'

export type AnchorState = 'none' | 'upper' | 'lower' | 'following'

/** Returns the current scroll position in pixels. */
export type ScrollPositionProvider = () => number

export interface ScrollPhysicsOptions {
  // Scroll position source
  /** Custom scroll position provider. Defaults to () => window.pageYOffset. */
  getScrollPosition?: ScrollPositionProvider

  // Physics
  responsiveness?: number
  mass?: number
  accelerationWeight?: number
  velocityWeight?: number
  velocitySmoothingFactor?: number
  accelerationSmoothingFactor?: number
  /** Cap raw velocity to prevent spikes from irregular frame timing (default 15000). */
  maxVelocity?: number

  // Thresholds
  thresholdMode?: ThresholdMode
  baseForceThreshold?: number
  forceThresholdMultiplier?: number
  maxForceValue?: number
  thresholdBuffer?: number

  // Frames
  numFrames?: number
  frameEasingSpeed?: number

  // Images
  imagePath?: string

  // Anchor system
  anchorEnabled?: boolean
  anchorUpperScrollPosition?: number | null
  anchorLowerScrollPosition?: number | null
  anchorVerticalOffset?: number

  // Splat animation
  splatEnabled?: boolean
  splatSeverity?: number
  splatRecoverySpeed?: number
}

export type TunableOpts = Required<
  Omit<
    ScrollPhysicsOptions,
    | 'getScrollPosition'
    | 'anchorUpperScrollPosition'
    | 'anchorLowerScrollPosition'
    | 'imagePath'
    | 'numFrames'
  >
>

export interface FrameNames {
  upward: string[]
  neutral: string
  downward: string[]
  upwardSplat: string[]
  downwardSplat: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Default configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_GET_SCROLL_POSITION: ScrollPositionProvider = () => window.scrollY

export const TUNABLE_DEFAULTS: TunableOpts = {
  // Physics
  responsiveness: 0.3,
  mass: 1.0,
  accelerationWeight: 1.0,
  velocityWeight: 0.7,
  velocitySmoothingFactor: 0.3,
  accelerationSmoothingFactor: 0.3,
  maxVelocity: 15000,

  // Thresholds
  thresholdMode: 'linear',
  baseForceThreshold: 1000,
  forceThresholdMultiplier: 2.5,
  maxForceValue: 10000,
  thresholdBuffer: 0.2,

  // Frames
  frameEasingSpeed: 0.15,

  // Anchor system
  anchorEnabled: true,
  anchorVerticalOffset: 50,

  // Splat animation
  splatEnabled: true,
  splatSeverity: 0.002,
  splatRecoverySpeed: 0.2,
}

const DEFAULTS: Required<Omit<ScrollPhysicsOptions, 'getScrollPosition'>> = {
  ...TUNABLE_DEFAULTS,
  numFrames: 10,
  imagePath: '../../public/images/physics_animation_frames/',
  anchorUpperScrollPosition: null,
  anchorLowerScrollPosition: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Class
// ─────────────────────────────────────────────────────────────────────────────

const DELTA_TIME_MIN = 0.004 // ignore frames shorter than 4 ms
const DELTA_TIME_MAX = 0.1 // discard frames longer than 100 ms
const TARGET_DT = 1 / 60 // reference frame time for smoothing

export class ScrollPhysicsElement {
  // DOM
  private element: HTMLImageElement
  private container: HTMLElement | null

  // Scroll position source
  private getScrollPosition: ScrollPositionProvider

  // Physics state
  private lastScrollTop: number
  private lastTime: number
  private smoothedVelocity: number
  private lastSmoothedVelocity: number
  private smoothedAcceleration: number
  private acceleration: number
  private netForce: number

  // Physics parameters
  private responsiveness: number
  private mass: number
  private accelerationWeight: number
  private velocityWeight: number
  private velocitySmoothingFactor: number
  private accelerationSmoothingFactor: number
  private maxVelocity: number

  // Threshold configuration
  private thresholdMode: ThresholdMode
  private baseForceThreshold: number
  private forceThresholdMultiplier: number
  private maxForceValue: number
  private thresholdBuffer: number
  private forceIntensityLevels: number[]

  // Frame animation
  private numFrames: number
  private frameEasingSpeed: number
  private targetFrame: number
  private currentDisplayFrame: number
  private lastTargetFrame: number
  private currentFramePath: string

  // Images
  private imagePath: string
  private frames: FrameNames

  // Anchor system
  private anchorEnabled: boolean
  private anchorUpperScrollPosition: number | null
  private anchorLowerScrollPosition: number | null
  private anchorVerticalOffset: number
  private anchorState: AnchorState

  // Splat animation
  private splatEnabled: boolean
  private splatSeverity: number
  private splatRecoverySpeed: number
  private splatFrame: number

  // Preloaded images (kept in memory to ensure browser caches all frames)
  // @ts-expect-error TS6133: write-only by design; the assignment holds a
  // strong reference so the browser does not garbage-collect the images.
  private _preloadedImages: HTMLImageElement[]

  // rAF handle
  private rafId: number | null

  constructor(element: HTMLImageElement, options: ScrollPhysicsOptions = {}) {
    this.element = element
    this.container = element.parentElement

    const { getScrollPosition, ...rest } = options
    const defined = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    )
    const cfg = { ...DEFAULTS, ...defined } as Required<
      Omit<ScrollPhysicsOptions, 'getScrollPosition'>
    >

    // Scroll position source
    this.getScrollPosition = getScrollPosition ?? DEFAULT_GET_SCROLL_POSITION

    // Physics state
    this.lastScrollTop = this.getScrollPosition()
    this.lastTime = performance.now()
    this.smoothedVelocity = 0
    this.lastSmoothedVelocity = 0
    this.smoothedAcceleration = 0
    this.acceleration = 0
    this.netForce = 0

    // Physics parameters
    this.responsiveness = cfg.responsiveness
    this.mass = cfg.mass
    this.accelerationWeight = cfg.accelerationWeight
    this.velocityWeight = cfg.velocityWeight
    this.velocitySmoothingFactor = cfg.velocitySmoothingFactor
    this.accelerationSmoothingFactor = cfg.accelerationSmoothingFactor
    this.maxVelocity = cfg.maxVelocity

    // Threshold configuration
    this.thresholdMode = cfg.thresholdMode
    this.baseForceThreshold = cfg.baseForceThreshold
    this.forceThresholdMultiplier = cfg.forceThresholdMultiplier
    this.maxForceValue = cfg.maxForceValue
    this.thresholdBuffer = cfg.thresholdBuffer
    this.forceIntensityLevels = []

    // Frame animation
    this.numFrames = cfg.numFrames
    this.frameEasingSpeed = cfg.frameEasingSpeed
    this.targetFrame = 0
    this.currentDisplayFrame = 0
    this.lastTargetFrame = 0
    this.currentFramePath = ''

    // Images
    this.imagePath = cfg.imagePath
    this.frames = this.generateFrameNames(this.numFrames)

    // Anchor system
    this.anchorEnabled = cfg.anchorEnabled
    this.anchorUpperScrollPosition = cfg.anchorUpperScrollPosition
    this.anchorLowerScrollPosition = cfg.anchorLowerScrollPosition
    this.anchorVerticalOffset = cfg.anchorVerticalOffset
    this.anchorState = 'none'

    // Splat animation
    this.splatEnabled = cfg.splatEnabled
    this.splatSeverity = cfg.splatSeverity
    this.splatRecoverySpeed = cfg.splatRecoverySpeed
    this.splatFrame = 0

    // Preloaded images
    this._preloadedImages = []

    // rAF handle
    this.rafId = null

    this.init()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  private init(): void {
    this.forceIntensityLevels = this.generateForceThresholds()
    this.currentFramePath = this.imageSrc(this.frames.neutral)
    this.element.src = this.currentFramePath
    this.preloadFrames()
    this.animate()
  }

  private preloadFrames(): void {
    const filenames = [
      this.frames.neutral,
      ...this.frames.upward,
      ...this.frames.downward,
      ...this.frames.upwardSplat,
      ...this.frames.downwardSplat,
    ]
    this._preloadedImages = filenames.map((filename) => {
      const img = new Image()
      img.src = this.imageSrc(filename)
      return img
    })
  }

  /** Stop the animation loop. Call this before unmounting. */
  destroy(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FRAME NAME / PATH HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateFrameNames(count: number): FrameNames {
    const upward: string[] = []
    const downward: string[] = []
    const upwardSplat: string[] = []
    const downwardSplat: string[] = []
    for (let i = 1; i <= count; i++) {
      upward.push(`upward-${i}.png`)
      downward.push(`downward-${i}.png`)
      upwardSplat.push(`up-splat-${i}.png`)
      downwardSplat.push(`down-splat-${i}.png`)
    }
    return {
      upward,
      neutral: 'neutral.png',
      downward,
      upwardSplat,
      downwardSplat,
    }
  }

  private imageSrc(filename: string): string {
    return this.imagePath + filename
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THRESHOLD GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  private generateForceThresholds(): number[] {
    const thresholds: number[] = []

    if (this.thresholdMode === 'linear') {
      const spacing = this.maxForceValue / (this.numFrames + 0.5)
      const first = spacing / 2
      for (let i = 0; i < this.numFrames; i++) {
        thresholds.push(first + i * spacing)
      }
    } else {
      for (let i = 0; i < this.numFrames; i++) {
        thresholds.push(
          this.baseForceThreshold * Math.pow(this.forceThresholdMultiplier, i),
        )
      }
    }

    return thresholds
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANCHOR HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private anchorVerticalPx(): number {
    return (this.anchorVerticalOffset / 100) * window.innerHeight
  }

  /**
   * Returns the effective upper anchor scroll position.
   */
  private effectiveUpperScrollPosition(): number {
    if (this.anchorUpperScrollPosition !== null)
      return this.anchorUpperScrollPosition
    return window.innerHeight * 0.01
  }

  /**
   * Returns the effective lower anchor scroll position.
   * When null (the default), computes dynamically: slightly more than half
   * the viewport height above the bottom of the scroll container.
   */
  private effectiveLowerScrollPosition(): number {
    if (this.anchorLowerScrollPosition !== null)
      return this.anchorLowerScrollPosition
    const scrollContainer = this.container?.parentElement
    const viewportH = window.innerHeight
    const maxScroll = scrollContainer
      ? scrollContainer.scrollHeight - scrollContainer.clientHeight
      : document.documentElement.scrollHeight - viewportH
    return maxScroll - viewportH * 0.01
  }

  private effectiveScrollTop(currentScrollTop: number): number {
    if (!this.anchorEnabled) return currentScrollTop
    if (this.anchorState === 'upper') return this.effectiveUpperScrollPosition()
    if (this.anchorState === 'lower') return this.effectiveLowerScrollPosition()
    return currentScrollTop
  }

  private isAnchored(): boolean {
    return this.anchorState === 'upper' || this.anchorState === 'lower'
  }

  private setContainerStyle(position: string, top: string): void {
    if (!this.container) return
    this.container.style.position = position
    this.container.style.top = top
    this.container.style.left = '50%'
    this.container.style.transform = 'translate(-50%, -50%)'
  }

  private determineAnchorState(scrollTop: number): AnchorState {
    if (scrollTop < this.effectiveUpperScrollPosition()) return 'upper'
    if (scrollTop >= this.effectiveLowerScrollPosition()) return 'lower'
    return 'following'
  }

  private anchorAbsoluteTop(anchorScrollPosition: number): string {
    const verticalPx = this.anchorVerticalPx()
    // When switching from fixed to absolute positioning, account for the
    // scroll container's offset from the viewport (e.g. a navbar above it).
    // Note: offsetParent is null for fixed-positioned elements, so we use
    // parentElement (the scroll container) whose getBoundingClientRect
    // works regardless of its children's positioning.
    const scrollContainer = this.container?.parentElement
    const containerOffset = scrollContainer
      ? scrollContainer.getBoundingClientRect().top
      : 0
    return anchorScrollPosition + verticalPx - containerOffset + 'px'
  }

  private updateContainerPosition(scrollTop: number): void {
    if (!this.container) return

    const newState = this.determineAnchorState(scrollTop)
    if (newState === this.anchorState) return

    if (newState === 'upper') {
      this.setContainerStyle(
        'absolute',
        this.anchorAbsoluteTop(this.effectiveUpperScrollPosition()),
      )
      if (this.splatEnabled) {
        this.splatFrame = Math.min(
          Math.round(Math.abs(this.smoothedVelocity) * this.splatSeverity),
          this.numFrames,
        )
      }
    } else if (newState === 'lower') {
      this.setContainerStyle(
        'absolute',
        this.anchorAbsoluteTop(this.effectiveLowerScrollPosition()),
      )
      if (this.splatEnabled) {
        this.splatFrame = Math.min(
          Math.round(Math.abs(this.smoothedVelocity) * this.splatSeverity),
          this.numFrames,
        )
      }
    } else {
      this.setContainerStyle('fixed', this.anchorVerticalOffset + '%')
      this.splatFrame = 0
    }

    this.anchorState = newState
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIMATION LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  private animate(): void {
    const now = performance.now()
    const scrollTop = this.getScrollPosition()
    const dt = (now - this.lastTime) / 1000

    if (this.anchorEnabled) {
      this.updateContainerPosition(scrollTop)
    }

    if (dt >= DELTA_TIME_MIN && dt < DELTA_TIME_MAX) {
      this.updatePhysics(scrollTop, dt)
      this.updateSplatDecay()
      this.updateVisuals()
    }

    this.lastScrollTop = this.effectiveScrollTop(scrollTop)
    this.lastTime = now

    this.rafId = requestAnimationFrame(() => this.animate())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS
  // ═══════════════════════════════════════════════════════════════════════════

  private updatePhysics(scrollTop: number, dt: number): void {
    const effective = this.effectiveScrollTop(scrollTop)
    const distance = effective - this.lastScrollTop

    // Frame-rate independent EMA: adjust the base factor by how long this
    // frame actually took relative to the 60 fps reference frame.
    const dtRatio = dt / TARGET_DT
    const velAlpha = 1 - Math.pow(1 - this.velocitySmoothingFactor, dtRatio)
    const accelAlpha =
      1 - Math.pow(1 - this.accelerationSmoothingFactor, dtRatio)

    const rawVel = Math.max(
      -this.maxVelocity,
      Math.min(this.maxVelocity, distance / dt),
    )
    this.smoothedVelocity += (rawVel - this.smoothedVelocity) * velAlpha

    const rawAccel = (this.smoothedVelocity - this.lastSmoothedVelocity) / dt
    this.smoothedAcceleration +=
      (rawAccel - this.smoothedAcceleration) * accelAlpha
    this.lastSmoothedVelocity = this.smoothedVelocity

    const force = this.smoothedAcceleration * this.responsiveness
    this.acceleration = force / this.mass
  }

  private updateSplatDecay(): void {
    if (this.splatFrame > 0) {
      this.splatFrame = Math.max(0, this.splatFrame - this.splatRecoverySpeed)
      if (this.splatFrame < 0.1) this.splatFrame = 0
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL / FRAME SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private updateVisuals(): void {
    // Net force
    this.netForce =
      this.acceleration * this.accelerationWeight +
      this.smoothedVelocity * this.velocityWeight

    // Target frame (with hysteresis)
    const mag = Math.abs(this.netForce)
    if (mag < this.forceIntensityLevels[0]) {
      this.targetFrame = 0
    } else {
      const level = this.intensityLevel(mag)
      this.targetFrame = this.netForce > 0 ? level : -level
    }
    this.lastTargetFrame = this.targetFrame

    // Ease toward target
    this.currentDisplayFrame +=
      (this.targetFrame - this.currentDisplayFrame) * this.frameEasingSpeed

    // Pick the image
    this.updateImage()
  }

  private intensityLevel(forceMag: number): number {
    let level = 1
    const current = Math.abs(this.lastTargetFrame)

    for (let i = 0; i < this.forceIntensityLevels.length; i++) {
      const threshold = this.forceIntensityLevels[i]
      const buffer = threshold * this.thresholdBuffer

      let effective = threshold
      if (current === i + 1) effective = threshold - buffer
      else if (current === i) effective = threshold + buffer

      if (forceMag >= effective) {
        level = i + 1
      } else {
        break
      }
    }

    return Math.min(level, this.numFrames)
  }

  private updateImage(): void {
    let newPath: string

    const splatDisplay = Math.round(this.splatFrame)
    if (this.splatEnabled && this.isAnchored() && splatDisplay > 0) {
      const frames =
        this.anchorState === 'upper'
          ? this.frames.upwardSplat
          : this.frames.downwardSplat
      const idx = Math.min(splatDisplay - 1, frames.length - 1)
      newPath = this.imageSrc(frames[idx])
    } else {
      const display = Math.round(this.currentDisplayFrame)
      if (display === 0) {
        newPath = this.imageSrc(this.frames.neutral)
      } else {
        const frames = display > 0 ? this.frames.downward : this.frames.upward
        const idx = Math.min(Math.abs(display) - 1, frames.length - 1)
        newPath = this.imageSrc(frames[idx])
      }
    }

    if (newPath !== this.currentFramePath) {
      this.currentFramePath = newPath
      this.element.src = newPath
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC SETTERS — call these to update parameters at runtime
  // ═══════════════════════════════════════════════════════════════════════════

  // Physics
  setResponsiveness(v: number): void {
    this.responsiveness = v
  }
  setMass(v: number): void {
    this.mass = v
  }
  setAccelerationWeight(v: number): void {
    this.accelerationWeight = v
  }
  setVelocityWeight(v: number): void {
    this.velocityWeight = v
  }
  setVelocitySmoothingFactor(v: number): void {
    this.velocitySmoothingFactor = v
  }
  setAccelerationSmoothingFactor(v: number): void {
    this.accelerationSmoothingFactor = Math.max(0, Math.min(1, v))
  }
  setMaxVelocity(v: number): void {
    this.maxVelocity = Math.max(0, v)
  }

  // Thresholds
  setThresholdMode(mode: ThresholdMode): void {
    this.thresholdMode = mode
    this.forceIntensityLevels = this.generateForceThresholds()
  }
  setBaseForceThreshold(v: number): void {
    this.baseForceThreshold = v
    this.forceIntensityLevels = this.generateForceThresholds()
  }
  setForceThresholdMultiplier(v: number): void {
    this.forceThresholdMultiplier = v
    this.forceIntensityLevels = this.generateForceThresholds()
  }
  setMaxForceValue(v: number): void {
    this.maxForceValue = v
    this.forceIntensityLevels = this.generateForceThresholds()
  }
  setThresholdBuffer(v: number): void {
    this.thresholdBuffer = Math.max(0, Math.min(0.5, v))
  }

  // Frames
  setNumFrames(n: number): void {
    this.numFrames = n
    this.frames = this.generateFrameNames(n)
    this.forceIntensityLevels = this.generateForceThresholds()
  }
  setFrameEasingSpeed(v: number): void {
    this.frameEasingSpeed = Math.max(0, Math.min(1, v))
  }

  // Images
  setImagePath(path: string): void {
    this.imagePath = path
    this.element.src = this.currentFramePath
  }
  setImageFrames(framesPaths: Partial<FrameNames>): void {
    this.frames = { ...this.frames, ...framesPaths }
    if (framesPaths.upward) {
      this.numFrames = framesPaths.upward.length
      this.forceIntensityLevels = this.generateForceThresholds()
    }
    this.element.src = this.imageSrc(this.frames.neutral)
  }

  // Anchor
  setAnchorEnabled(v: boolean): void {
    this.anchorEnabled = v
    if (!v && this.isAnchored()) {
      this.setContainerStyle('fixed', '50%')
      this.anchorState = 'none'
      this.splatFrame = 0
    } else if (v && this.container) {
      this.container.style.top = this.anchorVerticalOffset + '%'
    }
  }
  /** Pass null to restore the dynamic default. */
  setAnchorUpperScrollPosition(v: number | null): void {
    if (v === null) {
      this.anchorUpperScrollPosition = null
      return
    }
    this.anchorUpperScrollPosition = Math.max(0, v)
    const lower = this.effectiveLowerScrollPosition()
    if (this.anchorUpperScrollPosition >= lower) {
      this.anchorUpperScrollPosition = lower - 100
    }
  }
  /** Pass null to restore the dynamic default. */
  setAnchorLowerScrollPosition(v: number | null): void {
    if (v === null) {
      this.anchorLowerScrollPosition = null
      return
    }
    this.anchorLowerScrollPosition = Math.max(0, v)
    const upper = this.effectiveUpperScrollPosition()
    if (this.anchorLowerScrollPosition <= upper) {
      this.anchorLowerScrollPosition = upper + 100
    }
  }
  setAnchorVerticalOffset(v: number): void {
    this.anchorVerticalOffset = Math.max(0, Math.min(100, v))
    if (this.anchorEnabled && !this.isAnchored() && this.container) {
      this.container.style.top = this.anchorVerticalOffset + '%'
    }
  }

  // Scroll position source
  setGetScrollPosition(fn: ScrollPositionProvider): void {
    this.getScrollPosition = fn
  }

  // State snapshot
  getState(): {
    smoothedVelocity: number
    smoothedAcceleration: number
    netForce: number
    forceIntensityLevels: number[]
    targetFrame: number
    currentDisplayFrame: number
    anchorState: AnchorState
    splatFrame: number
  } {
    return {
      smoothedVelocity: this.smoothedVelocity,
      smoothedAcceleration: this.smoothedAcceleration,
      netForce: this.netForce,
      forceIntensityLevels: this.forceIntensityLevels,
      targetFrame: this.targetFrame,
      currentDisplayFrame: this.currentDisplayFrame,
      anchorState: this.anchorState,
      splatFrame: this.splatFrame,
    }
  }

  // Splat
  setSplatEnabled(v: boolean): void {
    this.splatEnabled = v
    if (!v) this.splatFrame = 0
  }
  setSplatSeverity(v: number): void {
    this.splatSeverity = Math.max(0, v)
  }
  setSplatRecoverySpeed(v: number): void {
    this.splatRecoverySpeed = Math.max(0.001, v)
  }
}
