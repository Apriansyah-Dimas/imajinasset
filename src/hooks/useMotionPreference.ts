'use client'

import { useEffect, useState } from 'react'

/**
 * Detects when we should fall back to lightweight animations.
 */
type MotionPreferenceOptions = {
  /**
   * Respect viewport width when deciding whether to reduce motion.
   * Disabled by default so animations remain active on mobile unless explicitly opted in.
   */
  respectViewport?: boolean
  /** Viewport width threshold (in px) used when `respectViewport` is true. */
  viewportThreshold?: number
}

export function useMotionPreference(options: MotionPreferenceOptions = {}) {
  const {
    respectViewport = false,
    viewportThreshold = 768,
  } = options

  const [shouldReduce, setShouldReduce] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updatePreference = () => {
      const reduceForViewport = respectViewport
        ? window.innerWidth <= viewportThreshold
        : false
      setShouldReduce(media.matches || reduceForViewport)
    }

    updatePreference()

    media.addEventListener('change', updatePreference)
    if (respectViewport) {
      window.addEventListener('resize', updatePreference)
    }

    return () => {
      media.removeEventListener('change', updatePreference)
      if (respectViewport) {
        window.removeEventListener('resize', updatePreference)
      }
    }
  }, [respectViewport, viewportThreshold])

  return shouldReduce
}
