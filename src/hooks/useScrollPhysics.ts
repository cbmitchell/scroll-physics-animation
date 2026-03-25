import { useEffect, useRef, type RefObject, type MutableRefObject } from 'react';
import { ScrollPhysicsElement, type ScrollPhysicsOptions } from '../lib/ScrollPhysicsElement';

/**
 * React hook that creates and manages a ScrollPhysicsElement instance.
 *
 * The instance is recreated when `imagePath` or `numFrames` change.
 * All other parameters are updated in-place without restarting the animation loop.
 *
 * @param imgRef  – ref to the <img> element
 * @param options – all ScrollPhysicsElement options (see ScrollPhysicsOptions)
 * @returns ref to the live instance (for imperative access)
 */
export function useScrollPhysics(
  imgRef: RefObject<HTMLImageElement | null>,
  options: ScrollPhysicsOptions = {},
): MutableRefObject<ScrollPhysicsElement | null> {
  const instanceRef = useRef<ScrollPhysicsElement | null>(null);

  // ── Create / recreate the instance when identity-changing props change ──
  useEffect(() => {
    if (!imgRef.current) return;

    const physics = new ScrollPhysicsElement(imgRef.current, options);
    instanceRef.current = physics;

    return () => {
      physics.destroy();
      instanceRef.current = null;
    };
    // Recreate only when the image source folder or frame count changes,
    // since those require rebuilding internal frame-name arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgRef, options.imagePath, options.numFrames]);

  // ── Sync all tunable parameters without recreating the instance ────────
  useEffect(() => {
    const p = instanceRef.current;
    if (!p) return;

    // Physics
    if (options.responsiveness != null)              p.setResponsiveness(options.responsiveness);
    if (options.mass != null)                        p.setMass(options.mass);
    if (options.accelerationWeight != null)           p.setAccelerationWeight(options.accelerationWeight);
    if (options.velocityWeight != null)               p.setVelocityWeight(options.velocityWeight);
    if (options.velocitySmoothingFactor != null)      p.setVelocitySmoothingFactor(options.velocitySmoothingFactor);
    if (options.accelerationSmoothingFactor != null)  p.setAccelerationSmoothingFactor(options.accelerationSmoothingFactor);
    if (options.maxVelocity != null)                  p.setMaxVelocity(options.maxVelocity);

    // Thresholds
    if (options.thresholdMode != null)               p.setThresholdMode(options.thresholdMode);
    if (options.baseForceThreshold != null)           p.setBaseForceThreshold(options.baseForceThreshold);
    if (options.forceThresholdMultiplier != null)     p.setForceThresholdMultiplier(options.forceThresholdMultiplier);
    if (options.maxForceValue != null)                p.setMaxForceValue(options.maxForceValue);
    if (options.thresholdBuffer != null)              p.setThresholdBuffer(options.thresholdBuffer);

    // Frames
    if (options.frameEasingSpeed != null)             p.setFrameEasingSpeed(options.frameEasingSpeed);

    // Anchor
    if (options.anchorEnabled != null)                p.setAnchorEnabled(options.anchorEnabled);
    if (options.anchorUpperScrollPosition != null)     p.setAnchorUpperScrollPosition(options.anchorUpperScrollPosition);
    if (options.anchorLowerScrollPosition != null)     p.setAnchorLowerScrollPosition(options.anchorLowerScrollPosition);
    if (options.anchorVerticalOffset != null)          p.setAnchorVerticalOffset(options.anchorVerticalOffset);

    // Splat
    if (options.splatEnabled != null)                 p.setSplatEnabled(options.splatEnabled);
    if (options.splatSeverity != null)                p.setSplatSeverity(options.splatSeverity);
    if (options.splatRecoverySpeed != null)            p.setSplatRecoverySpeed(options.splatRecoverySpeed);

    // Scroll position source
    if (options.getScrollPosition != null)             p.setGetScrollPosition(options.getScrollPosition);
  }, [
    options.responsiveness,
    options.mass,
    options.accelerationWeight,
    options.velocityWeight,
    options.velocitySmoothingFactor,
    options.accelerationSmoothingFactor,
    options.maxVelocity,
    options.thresholdMode,
    options.baseForceThreshold,
    options.forceThresholdMultiplier,
    options.maxForceValue,
    options.thresholdBuffer,
    options.frameEasingSpeed,
    options.anchorEnabled,
    options.anchorUpperScrollPosition,
    options.anchorLowerScrollPosition,
    options.anchorVerticalOffset,
    options.splatEnabled,
    options.splatSeverity,
    options.splatRecoverySpeed,
    options.getScrollPosition,
  ]);

  return instanceRef;
}
