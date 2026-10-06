import { useEffect, useRef, useState } from 'react'

// A countdown that keeps time against the clock rather than counting ticks.
// iOS pauses timers when the screen locks or you switch apps; because this
// stores when the countdown ends, it's still right the moment you come back.
// onFinish gets { start } so it can chain another countdown (e.g. side 2).
export function useCountdown(onFinish, initialMs = 0) {
  const [endAt, setEndAt] = useState(null) // set while running
  const [left, setLeft] = useState(initialMs) // remaining while paused
  const [now, setNow] = useState(() => Date.now())
  const finish = useRef(onFinish)
  useEffect(() => { finish.current = onFinish })

  useEffect(() => {
    if (endAt === null) return
    const id = setInterval(() => {
      const t = Date.now()
      if (t >= endAt) {
        clearInterval(id)
        setEndAt(null)
        setLeft(0)
        finish.current?.({
          start(ms) { const n = Date.now(); setNow(n); setLeft(ms); setEndAt(n + ms) },
        })
      } else {
        setNow(t)
      }
    }, 250)
    return () => clearInterval(id)
  }, [endAt])

  const running = endAt !== null
  return {
    running,
    remaining: running ? Math.max(0, endAt - now) : left,
    start(ms) { const t = Date.now(); setNow(t); setLeft(ms); setEndAt(t + ms) },
    resume() { const t = Date.now(); setNow(t); setEndAt(t + left) },
    pause() { if (running) { setLeft(Math.max(0, endAt - Date.now())); setEndAt(null) } },
    add(ms) { if (running) setEndAt(e => e + ms); else setLeft(l => l + ms) },
    stop() { setEndAt(null); setLeft(0) },
  }
}

// Keeps the screen on while `active`, so a running timer can still beep.
// Quietly does nothing where the browser doesn't support it.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return
    let lock
    let cancelled = false
    navigator.wakeLock.request('screen')
      .then(l => { if (cancelled) l.release(); else lock = l })
      .catch(() => {})
    return () => {
      cancelled = true
      lock?.release().catch(() => {})
    }
  }, [active])
}

// "2:30" / "0:45"
export function fmtClock(ms) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
