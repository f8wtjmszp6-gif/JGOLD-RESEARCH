import { useState } from 'react'

// Drag-to-reorder by a handle: the row follows your finger within its list
// while the others slide aside, and letting go calls onDrop(id, newIndex).
// Rows are found by their data-row attribute inside `container`.
export function useDragReorder(container, idsFor, onDrop) {
  const [drag, setDrag] = useState(null) // { id, ids, from, to, startY, dy, rects }
  function start(e, id) {
    const ids = idsFor(id)
    const rects = ids.map(x => container.current.querySelector(`[data-row="${x}"]`).getBoundingClientRect())
    e.currentTarget.setPointerCapture(e.pointerId)
    const from = ids.indexOf(id)
    setDrag({ id, ids, from, to: from, startY: e.clientY, dy: 0, rects })
  }
  function move(e) {
    if (!drag) return
    const dy = e.clientY - drag.startY
    const r = drag.rects[drag.from]
    const center = r.top + r.height / 2 + dy
    const to = drag.rects.filter((x, i) => i !== drag.from && x.top + x.height / 2 < center).length
    setDrag({ ...drag, dy, to })
  }
  function end() {
    if (!drag) return
    if (drag.to !== drag.from) onDrop(drag.id, drag.to)
    setDrag(null)
  }
  function style(id) {
    const i = drag ? drag.ids.indexOf(id) : -1
    if (i < 0) return undefined
    if (id === drag.id) return { transform: `translateY(${drag.dy}px)`, position: 'relative', zIndex: 10 }
    const gap = drag.rects[drag.from].height + 8
    const shift = drag.from < drag.to && i > drag.from && i <= drag.to ? -gap
      : drag.to < drag.from && i >= drag.to && i < drag.from ? gap : 0
    return { transform: `translateY(${shift}px)`, transition: 'transform 150ms' }
  }
  return {
    dragging: drag?.id,
    style,
    handlers: id => ({ onPointerDown: e => start(e, id), onPointerMove: move, onPointerUp: end, onPointerCancel: end }),
  }
}
