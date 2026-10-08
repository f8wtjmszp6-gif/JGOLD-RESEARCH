import upper from './upper'
import lower from './lower'
import stretches from './stretches'

// How to do every exercise and stretch in the banks, by id:
// { setup, steps: [...], tip, mistake }.
export const HOWTO = { ...upper, ...lower, ...stretches }

// A YouTube search for a form demo (opens outside the app; needs internet).
export function demoUrl(name, kind) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to do ${name} ${kind === 'stretch' ? 'stretch' : 'exercise'} proper form`)}`
}
