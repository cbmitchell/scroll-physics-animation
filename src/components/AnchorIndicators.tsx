import { useState, useEffect, type RefObject } from 'react'

interface AnchorIndicatorsProps {
  visible: boolean
  scrollContainerRef: RefObject<HTMLElement | null>
  anchorUpperScrollPosition?: number | null
  anchorLowerScrollPosition?: number | null
  viewportVerticalPosition?: number
  upperAnchorVisualOffset?: number
  lowerAnchorVisualOffset?: number
}

function computePositions(
  scrollContainer: HTMLElement,
  anchorUpperScrollPosition: number | null,
  anchorLowerScrollPosition: number | null,
  viewportVerticalPosition: number,
  upperAnchorVisualOffset: number,
  lowerAnchorVisualOffset: number,
) {
  const vh = window.innerHeight
  const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight
  const verticalPx = (viewportVerticalPosition / 100) * vh

  // Mirror the logic in ScrollPhysicsElement.effectiveUpperScrollPosition /
  // effectiveLowerScrollPosition. The visual offset nudges the line away from
  // the element centre toward the contact point of the splat frame.
  const effectiveUpper = anchorUpperScrollPosition ?? vh * 0.01
  const effectiveLower = anchorLowerScrollPosition ?? maxScroll - vh * 0.01

  return {
    upper: effectiveUpper + verticalPx - upperAnchorVisualOffset,
    lower: effectiveLower + verticalPx + lowerAnchorVisualOffset,
  }
}

export function AnchorIndicators({
  visible,
  scrollContainerRef,
  anchorUpperScrollPosition = null,
  anchorLowerScrollPosition = null,
  viewportVerticalPosition = 50,
  upperAnchorVisualOffset = 0,
  lowerAnchorVisualOffset = 0,
}: AnchorIndicatorsProps) {
  const [positions, setPositions] = useState<{ upper: number; lower: number } | null>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    function update() {
      setPositions(
        computePositions(
          container,
          anchorUpperScrollPosition,
          anchorLowerScrollPosition,
          viewportVerticalPosition,
          upperAnchorVisualOffset,
          lowerAnchorVisualOffset,
        ),
      )
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(container)
    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [
    scrollContainerRef,
    anchorUpperScrollPosition,
    anchorLowerScrollPosition,
    viewportVerticalPosition,
    upperAnchorVisualOffset,
    lowerAnchorVisualOffset,
  ])

  if (!visible || !positions) return null

  const lineBase: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    pointerEvents: 'none',
    zIndex: 3,
  }

  return (
    <>
      <div style={{ ...lineBase, top: positions.upper, background: 'rgba(255, 80, 80, 0.55)' }} />
      <div style={{ ...lineBase, top: positions.lower, background: 'rgba(80, 120, 255, 0.55)' }} />
    </>
  )
}
