// One shared audio context. iOS only lets audio start from a tap, so the
// buttons that start a timer call unlockAudio() — the sounds at the end then
// play even though no tap triggers them.
let ctx

// 'music': beeps mix in over music or a podcast, but the ringer switch mutes
// them on the speaker. 'silent': they play like a media app, so the ringer
// switch doesn't mute them, but the iPhone won't let them interrupt music.
let mode = 'music'
export function setSoundMode(m) {
  mode = m
}

export function unlockAudio() {
  try {
    // Safari 17+; ignored elsewhere.
    if (navigator.audioSession) navigator.audioSession.type = mode === 'silent' ? 'playback' : 'ambient'
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    // audio not supported
  }
}

function tone(freq, start, length, volume) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.start(start)
  osc.stop(start + length)
}

// Short blip for the last three seconds of a timer.
export function playTick() {
  try {
    unlockAudio()
    tone(660, ctx.currentTime, 0.12, 0.35)
  } catch {
    // audio not supported
  }
}

// One longer, higher note when a count-in ends and the timer starts.
export function playGo() {
  try {
    unlockAudio()
    tone(988, ctx.currentTime, 0.35, 0.6)
  } catch {
    // audio not supported
  }
}

// Three rising notes when a timer finishes.
export function playBeep() {
  try {
    unlockAudio()
    const t = ctx.currentTime
    tone(784, t, 0.25, 0.7)
    tone(988, t + 0.18, 0.25, 0.7)
    tone(1319, t + 0.36, 0.5, 0.7)
  } catch {
    // audio not supported
  }
}
