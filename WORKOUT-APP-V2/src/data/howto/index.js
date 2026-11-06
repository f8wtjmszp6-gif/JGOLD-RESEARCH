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

// "How to do it": opens a video demo of it.
export function openDemo(name, kind) {
  window.open(demoUrl(name, kind), '_blank', 'noopener')
}
