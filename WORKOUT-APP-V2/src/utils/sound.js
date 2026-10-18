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

// How loud the beeps are, 0–1 (Settings → Timers → Volume), on top of the
// phone's own volume.
let level = 1
export function setVolume(v) {
  level = v
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

// A beep can't go past full scale, so loudness comes from the sound itself:
// a square wave (brighter, so it carries over music and gym noise) with its
// harshest top end filtered off, peaking near full scale at 100%.
function tone(freq, start, length, volume) {
  const osc = ctx.createOscillator()
  const soften = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  osc.connect(soften)
  soften.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'square'
  soften.type = 'lowpass'
  soften.frequency.setValueAtTime(4000, start)
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(volume * level, 0.0001), start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.start(start)
  osc.stop(start + length)
}

// Short blip for the last three seconds of a timer.
export function playTick() {
  try {
    unlockAudio()
    tone(660, ctx.currentTime, 0.12, 0.5)
  } catch {
    // audio not supported
  }
}

// One longer, higher note when a count-in ends and the timer starts.
export function playGo() {
  try {
    unlockAudio()
    tone(988, ctx.currentTime, 0.35, 0.8)
  } catch {
    // audio not supported
  }
}

// Three rising notes when a timer finishes.
export function playBeep() {
  try {
    unlockAudio()
    const t = ctx.currentTime
    tone(784, t, 0.25, 0.9)
    tone(988, t + 0.18, 0.25, 0.9)
    tone(1319, t + 0.36, 0.5, 0.9)
  } catch {
    // audio not supported
  }
}
