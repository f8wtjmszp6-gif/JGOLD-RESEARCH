import { useEffect, useState } from 'react'

// Light, dark, or auto (the phone's setting), saved on this device.
// index.html applies it before the first paint.
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

  // 'light' or 'dark' sticks on this device; 'auto' follows the phone.
  function setMode(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {
      // Storage blocked — it still switches for this visit.
    }
    setChoice(mode === 'auto' ? null : mode)
  }

  return { dark, mode: choice ?? 'auto', setMode }
}
