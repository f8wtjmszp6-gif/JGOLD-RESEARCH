import { useEffect, useState } from 'react'

// Light or dark, following the phone's setting. index.html applies it before
// the first paint.
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

function apply(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0c0a09' : '#fafaf9')
}

export function useTheme() {
  const [dark, setDark] = useState(() => !!media?.matches)

  useEffect(() => {
    // A choice saved when the app had its own Light / Dark setting.
    try {
      localStorage.removeItem('workout-v2-theme')
    } catch {
      // Storage blocked: nothing saved to clear.
    }
    if (!media) return
    const on = e => setDark(e.matches)
    media.addEventListener('change', on)
    return () => media.removeEventListener('change', on)
  }, [])

  useEffect(() => apply(dark), [dark])
}
