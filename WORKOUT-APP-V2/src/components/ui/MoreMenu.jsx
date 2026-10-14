import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ••• and its little menu. It's drawn over the page (rows clip anything that
// sticks out) under the button, or above it near the bottom of the screen.
export function MoreMenu({ label, items, size = 'w-8 h-8 rounded-lg' }) {
  const button = useRef(null)
  const [at, setAt] = useState(null) // where the open menu sits
  function open() {
    const r = button.current.getBoundingClientRect()
    const below = r.bottom + 8 + items.length * 44 < window.innerHeight - 16
    setAt({ right: window.innerWidth - r.right, ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) })
  }
  const stop = e => e.stopPropagation()
  return (
    <>
      <button
        ref={button}
        onClick={open}
        aria-label={`More for ${label}`}
        aria-haspopup="menu"
        aria-expanded={!!at}
        className={`${size} shrink-0 bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
      {at && createPortal(
        <div className="fixed inset-0 z-50" onClick={e => { stop(e); setAt(null) }} onPointerDown={stop} onPointerMove={stop} onPointerUp={stop}>
          <div role="menu" className="absolute min-w-48 whitespace-nowrap rounded-xl bg-white shadow-xl border border-stone-200 p-1 animate-[fade-in_120ms_ease-out]" style={at}>
            {items.map(x => (
              <button
                key={x.label}
                role="menuitem"
                onClick={e => { stop(e); setAt(null); x.onClick() }}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-stone-900 active:bg-stone-100"
              >
                <span className="text-stone-500">{x.icon}</span>
                {x.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
