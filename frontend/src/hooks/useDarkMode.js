import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'sokogate_theme'

/**
 * useDarkMode — manages dark/light theme with localStorage persistence
 * and system preference detection.
 *
 * Returns [isDark, toggle]
 */
export default function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // 1. Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored === 'dark'

    // 2. Fall back to system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    return false
  })

  // Sync the `dark` class on <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  // Listen for system preference changes (only when no stored preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setIsDark(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = useCallback(() => setIsDark((prev) => !prev), [])

  return [isDark, toggle]
}
