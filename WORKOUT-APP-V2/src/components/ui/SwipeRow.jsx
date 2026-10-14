import { useRef, useState } from 'react'

// A row you can swipe left to reveal Remove, like deleting an email. Without
// onRemove (the last stretch, say) it doesn't swipe. Dragging by a handle
// (data-grip) never starts a swipe, and a swipe never counts as a tap.
const SWIPE_WIDTH = 88
export function SwipeRow({ label, onRemove, children }) {
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const gesture = useRef(null) // { startX, startY, base, dir, swiped }

  function down(e) {
    if (!onRemove || e.target.closest('[data-grip]')) return
    gesture.current = { startX: e.clientX, startY: e.clientY, base: x, dir: null }
  }
  function move(e) {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.dir) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        g.dir = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      } else if (Math.abs(dy) > 8) {
        gesture.current = null
        return
      }
    }
    if (g.dir === 'x') setX(Math.max(-SWIPE_WIDTH, Math.min(0, g.base + dx)))
  }
  function up() {
    const g = gesture.current
    gesture.current = g?.dir === 'x' ? { swiped: true } : null
    if (g?.dir === 'x') setX(x < -SWIPE_WIDTH / 2 ? -SWIPE_WIDTH : 0)
    setDragging(false)
  }
  // Swallow the click that ends a swipe; a tap on a swiped-open row closes it.
  function clickCapture(e) {
    if (gesture.current?.swiped || x !== 0) {
      e.stopPropagation()
      e.preventDefault()
      if (!gesture.current?.swiped) setX(0)
    }
    gesture.current = null
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {onRemove && (
        <button
          onClick={() => { setX(0); onRemove() }}
          aria-label={`Remove ${label}`}
          tabIndex={x === 0 ? -1 : 0}
          className="absolute inset-y-0 right-0 bg-red-600 text-white text-sm font-semibold active:bg-red-700"
          // Hidden at rest, so it can't peek around the row's rounded corners.
          style={{ width: SWIPE_WIDTH, visibility: x === 0 && !dragging ? 'hidden' : 'visible' }}
        >
          Remove
        </button>
      )}
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : 'transform 200ms' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={clickCapture}
      >
        {children}
      </div>
    </div>
  )
}
