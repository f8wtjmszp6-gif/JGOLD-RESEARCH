import upper from './upper'
import lower from './lower'
import stretches from './stretches'
import more from './more'
import moreStretches from './moreStretches'

// How to do every exercise and stretch in the banks, by id:
// { setup, steps: [...], tip, mistake }. Kept for later: for now "How to do
// it" goes straight to a video demo (see openDemo).
export const HOWTO = { ...upper, ...lower, ...stretches, ...more, ...moreStretches }

// A YouTube search for a form demo (opens outside the app; needs internet).
export function demoUrl(name, kind) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to do ${name} ${kind === 'stretch' ? 'stretch' : 'exercise'} proper form`)}`
}

// "How to do it": opens a video demo of it. On iPhone/iPad a web link to
// YouTube hands off to the YouTube app but leaves a blank white page behind,
// so go straight to the app; only if it doesn't open, fall back to the web.
export function openDemo(name, kind) {
  const url = demoUrl(name, kind)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!ios) { window.open(url, '_blank', 'noopener'); return }
  let left = false
  const onHide = () => { if (document.hidden) left = true }
  document.addEventListener('visibilitychange', onHide)
  window.location.href = url.replace('https://', 'youtube://')
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onHide)
    if (!left && !document.hidden) window.open(url, '_blank', 'noopener')
  }, 1200)
}
