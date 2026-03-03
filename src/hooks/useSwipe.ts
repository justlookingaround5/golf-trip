import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useSwipe(handlers: SwipeHandlers, threshold = 50) {
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && handlers.onSwipeRight) {
        handlers.onSwipeRight()
      } else if (deltaX < 0 && handlers.onSwipeLeft) {
        handlers.onSwipeLeft()
      }
    }
  }, [handlers, threshold])

  return { onTouchStart, onTouchEnd }
}
