import { useEffect, useRef, useState } from 'react'

// Drag a pop-up away to close it: a bottom sheet down (axis 'y'), the
// settings panel right ('x'). It follows your finger, and letting go past a
// third of its size, or with a quick flick, closes it; otherwise it springs
// back. A sheet only starts coming down once its own list is scrolled to the
// top, so scrolling inside it works as usual. Typing fields and drag handles
// never start it.
//
// Returns the panel's `offset` (px), whether it's `dragging`, and `fade`
// (1 → 0) for the shade behind it.
export function useDragToClose(ref, onClose, axis = 'y') {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [size, setSize] = useState(1)
  // The latest onClose, so the listeners below aren't re-attached mid-drag.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let g = null // the gesture in progress
    const point = e => (e.touches ? e.touches[0] : e)
    const along = p => (axis === 'y' ? p.clientY : p.clientX)

    function start(e) {
      if (e.type === 'mousedown' && e.button !== 0) return
      if (e.target.closest('input, textarea, select, [data-grip]')) return
      const p = point(e)
      g = { x: p.clientX, y: p.clientY, last: along(p), lastT: e.timeStamp, v: 0, d: 0, on: false, inner: e.target.closest('[data-scroll]') }
    }
    function move(e) {
      if (!g) return
      const p = point(e)
      const d = axis === 'y' ? p.clientY - g.y : p.clientX - g.x
      const across = axis === 'y' ? p.clientX - g.x : p.clientY - g.y
      if (!g.on) {
        if (Math.abs(d) < 8 && Math.abs(across) < 8) return
        // Only a pull toward closing starts it, and for a sheet only from
        // the top of its list.
        // (or of the part that scrolls, in a sheet with a fixed top).
        const atTop = axis === 'x' || (el.scrollTop <= 0 && !(g.inner?.scrollTop > 0))
        if (d <= 0 || Math.abs(across) > Math.abs(d) || !atTop) {
          g = null
          return
        }
        g.on = true
        g.size = axis === 'y' ? el.offsetHeight : el.offsetWidth
        setSize(g.size)
        setDragging(true)
      }
      if (e.cancelable) e.preventDefault()
      const now = along(p)
      g.v = (now - g.last) / Math.max(1, e.timeStamp - g.lastT)
      g.last = now
      g.lastT = e.timeStamp
      g.d = Math.max(0, d)
      setOffset(g.d)
    }
    function end() {
      const was = g
      g = null
      if (!was?.on) return
      setDragging(false)
      // A mouse drag ends in a click; don't let it press whatever is under it.
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
      if (was.d > was.size / 3 || was.v > 0.6) {
        setOffset(was.size)
        setTimeout(() => close.current(), 180)
      } else {
        setOffset(0)
      }
    }
    function swallow(e) {
      e.stopPropagation()
      e.preventDefault()
    }

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    el.addEventListener('mousedown', start)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
      el.removeEventListener('mousedown', start)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
    }
  }, [ref, axis])

  return { offset, dragging, fade: Math.max(0, 1 - offset / size) }
}
