// ─────────────────────────────────────────────────────────────────────────────
// FrameSetConfig
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata that describes a set of animation frames.
 * These four values are intrinsically coupled: they describe the asset, not
 * the physics behaviour, and should always travel together.
 */
export interface FrameSetConfig {
  imagePath: string
  numFrames: number
  /**
   * Visual offset in pixels applied to the upper anchor indicator.
   * Nudges the rendered anchor line up so it aligns with the splat frame's
   * contact point. Scale proportionally with the displayed image size.
   * Defaults to 0.
   */
  upperAnchorVisualOffset?: number
  /**
   * Visual offset in pixels applied to the lower anchor indicator.
   * Nudges the rendered anchor line down so it aligns with the splat frame's
   * contact point. Scale proportionally with the displayed image size.
   * Defaults to 0.
   */
  lowerAnchorVisualOffset?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────────────────

export const FRAME_SETS = {
  default: {
    imagePath: '/images/physics_animation_frames/',
    numFrames: 10,
    upperAnchorVisualOffset: 82,
    lowerAnchorVisualOffset: 90,
  },
} satisfies Record<string, FrameSetConfig>
