import { createPortal } from 'react-dom'

// A dropdown's choices, popped up in the middle of the screen: its name on
// top, then each choice (the picked one ticked). Tap one to pick it, or
// outside to leave it as it is. Long lists scroll inside.
export function ChoiceMenu({ title, value, options, onPick, onClose }) {
  const stop = e => e.stopPropagation()
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8 touch-none"
      onClick={e => { stop(e); onClose() }}
      onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onPointerCancel={stop}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fade-in_120ms_ease-out]" />
      <div
        role="listbox"
        aria-label={title}
        onClick={stop}
        className="relative w-full max-w-xs max-h-[70dvh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-[pop-in_140ms_ease-out]"
      >
        <p className="px-4 pt-3.5 pb-2 text-xs font-semibold text-stone-400">{title}</p>
        <div className="overflow-y-auto overscroll-contain touch-pan-y px-1.5 pb-1.5">
          {options.map(([id, text]) => {
            const on = id === value
            return (
              <button
                key={id}
                role="option"
                aria-selected={on}
                onClick={() => { onClose(); if (!on) onPick(id) }}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[15px] active:bg-stone-100 ${on ? 'font-semibold text-accent-600' : 'text-stone-900'}`}
              >
                <span className="flex-1 min-w-0">{text}</span>
                {on && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
