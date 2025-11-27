'use client'

import { useEffect, useState } from 'react'

/**
 * Detects when we should fall back to lightweight animations.
 */
type MotionPreferenceOptions = {
  /**
   * Respect viewport width when deciding whether to reduce motion.
   */
  respectViewport?: boolean
  /** Viewport width threshold (in px) used when `respectViewport` is true. */
  viewportThreshold?: number
  /** Consider hardware hints such as CPU cores & device memory. */
  includeDevicePerformance?: boolean
  /** Maximum CPU cores before we start reducing motion. */
  hardwareConcurrencyThreshold?: number
  /** Maximum reported device memory (in GB) before reducing motion. */
  deviceMemoryThreshold?: number
}

export function useMotionPreference(options: MotionPreferenceOptions = {}) {
  const {
    respectViewport = true,
    viewportThreshold = 900,
    includeDevicePerformance = true,
    hardwareConcurrencyThreshold = 4,
    deviceMemoryThreshold = 4,
  } = options

  const [shouldReduce, setShouldReduce] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updatePreference = () => {
      const reduceForViewport = respectViewport
        ? window.innerWidth <= viewportThreshold
        : false

      let reduceForDevice = false
      if (includeDevicePerformance) {
        const hardwareConcurrency = window.navigator.hardwareConcurrency
        if (
          typeof hardwareConcurrency === 'number' &&
          hardwareConcurrency > 0 &&
          hardwareConcurrency <= hardwareConcurrencyThreshold
        ) {
          reduceForDevice = true
        }

        if (!reduceForDevice) {
          const withMemory = window.navigator as Navigator & { deviceMemory?: number }
          const deviceMemory = withMemory.deviceMemory
          if (
            typeof deviceMemory === 'number' &&
            deviceMemory > 0 &&
            deviceMemory <= deviceMemoryThreshold
          ) {
            reduceForDevice = true
          }
        }
      }

      const prefersReducedMotion = media.matches || reduceForViewport || reduceForDevice
      setShouldReduce(prefersReducedMotion)

      if (typeof document !== 'undefined') {
        const docEl = document.documentElement
        docEl.dataset.reduceMotion = prefersReducedMotion ? 'true' : 'false'
        docEl.dataset.performanceTier = reduceForDevice ? 'low' : 'standard'
      }
    }

    updatePreference()

    media.addEventListener('change', updatePreference)
    window.addEventListener('resize', updatePreference)

    return () => {
      media.removeEventListener('change', updatePreference)
      window.removeEventListener('resize', updatePreference)
    }
  }, [
    respectViewport,
    viewportThreshold,
    includeDevicePerformance,
    hardwareConcurrencyThreshold,
    deviceMemoryThreshold,
  ])

  return shouldReduce
}
