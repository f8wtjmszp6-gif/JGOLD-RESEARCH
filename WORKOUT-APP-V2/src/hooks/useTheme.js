import { useEffect, useState } from 'react'

// Light or dark, saved on this device. Until you choose, it follows the
// phone's setting (index.html applies it before the first paint).
const KEY = 'workout-v2-theme'
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

function saved() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function apply(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0c0a09' : '#fafaf9')
}

export function useTheme() {
  const [choice, setChoice] = useState(saved)
  const [system, setSystem] = useState(() => !!media?.matches)
  const dark = choice ? choice === 'dark' : system

  // Follow the phone while you haven't picked.
  useEffect(() => {
    if (!media) return
    const on = e => setSystem(e.matches)
    media.addEventListener('change', on)
    return () => media.removeEventListener('change', on)
  }, [])

  useEffect(() => apply(dark), [dark])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage blocked — it still switches for this visit.
    }
    setChoice(next)
  }

  return { dark, toggle }
}
