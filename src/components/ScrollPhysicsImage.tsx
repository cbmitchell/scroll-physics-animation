import { useRef, useMemo, useEffect, type CSSProperties, type MutableRefObject, type RefObject } from 'react';
import { useScrollPhysics } from '../hooks/useScrollPhysics';
import { useIsMobile } from '../hooks/useIsMobile';
import type { ScrollPhysicsElement, ScrollPhysicsOptions } from '../lib/ScrollPhysicsElement';

export interface ScrollPhysicsImageProps extends ScrollPhysicsOptions {
  /** Pixel width/height of the <img> (default 512). */
  size?: number;
  /**
   * Ref to a scrollable container element. When provided, the physics engine
   * reads scrollTop from this element instead of window.pageYOffset.
   * This avoids mobile Safari issues where browser chrome resizing shifts
   * the window scroll position.
   */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /**
   * Physics option overrides applied when the viewport is below the mobile
   * breakpoint. These are spread over the base props, so only the values
   * you specify are overridden.
   */
  mobileOverrides?: ScrollPhysicsOptions;
  /** Extra class name on the outer wrapper. */
  className?: string;
  /** Extra inline styles on the outer wrapper. */
  style?: CSSProperties;
  /** Ref to the live ScrollPhysicsElement instance for imperative access. */
  instanceRef?: MutableRefObject<ScrollPhysicsElement | null>;
}

export function ScrollPhysicsImage({
  size = 512,
  scrollContainerRef,
  mobileOverrides,
  className,
  style,
  instanceRef: externalRef,
  ...physicsOptions
}: ScrollPhysicsImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const isMobile = useIsMobile();

  const getScrollPosition = useMemo(() => {
    if (!scrollContainerRef) return undefined;
    return () => scrollContainerRef.current?.scrollTop ?? 0;
  }, [scrollContainerRef]);

  const mergedOptions: ScrollPhysicsOptions = {
    ...physicsOptions,
    ...(isMobile ? mobileOverrides : undefined),
    getScrollPosition,
  };

  const physicsRef = useScrollPhysics(imgRef, mergedOptions);

  // Expose the instance to the parent if they passed a ref.
  // physicsRef is a stable useRef — its identity never changes, so it can't be used
  // as a dep to detect when useScrollPhysics recreates the instance. imagePath/numFrames
  // are the actual triggers for recreation (see useScrollPhysics), so depending on those
  // keeps externalRef in sync with the live instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (externalRef) {
      externalRef.current = physicsRef.current;
    }
  }, [externalRef, mergedOptions.frameSet?.imagePath, mergedOptions.frameSet?.numFrames]);

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1000,
        ...style,
      }}
    >
      <img
        ref={imgRef}
        alt="Scroll-driven physics animation"
        width={size}
        height={size}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
