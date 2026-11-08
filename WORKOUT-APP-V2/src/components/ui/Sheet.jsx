import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDragToClose } from '../../hooks/useDragToClose'

// A yes/no question in a sheet: Cancel, or do it anyway.
export function ConfirmSheet({ title, body, confirmLabel, onConfirm, onClose }) {
  return (
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
      <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
      <button
        onClick={onConfirm}
        className="w-full py-3 rounded-2xl bg-orange-50 text-orange-700 text-sm font-semibold active:bg-orange-100 transition-colors"
      >
        {confirmLabel}
      </button>
    </SettingsSheet>
  )
}

// A change to what's in a plan: for just this week, or this week and every
// week after. One you can do any number of times (`repeat`) asks about this
// time and every time instead. `note`: anything to know first (an area it
// leaves uncovered).
export function ScopeSheet({ title, note, repeat, onPick, onClose }) {
  return (
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
      {note && <p className="text-sm text-stone-600 leading-relaxed">{note}</p>}
      <div className="space-y-2">
        <button onClick={() => onPick('week')} className="w-full py-3.5 rounded-2xl bg-stone-100 text-stone-800 font-semibold active:bg-stone-200 transition-colors">
          {repeat ? 'Just this time' : 'Just this week'}
        </button>
        <button onClick={() => onPick('always')} className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors">
          {repeat ? 'Every time' : 'Every week'}
        </button>
      </div>
    </SettingsSheet>
  )
}

// Bottom sheet for an exercise's or stretch's settings — the list underneath
// never moves, and the controls are big enough to hit mid-set.
// A sheet that slides up over the page; pull it down to close it. Dragging
// on the shade does nothing (touch-none), and scrolling the sheet stops at
// its ends (overscroll-contain), so the page behind never moves. It's drawn
// at the top of the page (a portal), so a row that slides or drags can't
// trap it.
// Sheets come in two sizes. `tall` ones (pickers, how-tos, settings with
// rows that come and go) always open to the same height and scroll inside,
// so nothing jumps while you use them. The rest (short questions and quick
// logs that never change while open) fit what's in them. `split` ones are
// tall with a fixed top: only the part marked data-scroll scrolls, and
// the top takes no scrolling at all (touch-none), so a pull there only
// moves the sheet. `full` ones (with split) take the whole screen. `bare`:
// no title row (what's in it brings its own, and its own way to close).
export function SettingsSheet({ title, bare = false, subtitle, closeLabel = 'Done', tall = false, split = false, full = false, onClose, children }) {
  const panel = useRef(null)
  const { offset, dragging, fade } = useDragToClose(panel, onClose)
  // React still passes events up to the component that opened the sheet (a
  // swipeable row, say); stop them here so touching the sheet can't move it.
  const stop = e => e.stopPropagation()
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center touch-none"
      onClick={e => { stop(e); onClose() }}
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" style={{ opacity: fade }} />
      <div
        ref={panel}
        className={`relative bg-white w-full px-5 ${full ? '' : 'max-w-md rounded-t-3xl'} ${split ? `${full ? 'h-dvh' : 'h-[88dvh]'} flex flex-col overflow-hidden touch-none` : `${tall ? 'h-[88dvh]' : 'max-h-[88dvh]'} overflow-y-auto overscroll-contain touch-pan-y`}`}
        style={{
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          transform: `translateY(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* The handle and title stay put while what's under them scrolls. */}
        <div
          className={`sticky top-0 z-10 bg-white -mx-5 px-5 ${bare ? 'pb-1' : 'pb-5'} ${full ? '' : 'rounded-t-3xl pt-3'}`}
          style={full ? { paddingTop: 'calc(1rem + env(safe-area-inset-top))' } : undefined}
        >
          {!full && <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-4" />}
          {!bare && (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-stone-900 font-bold text-lg">{title}</h3>
                {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="text-accent-500 text-sm font-semibold active:opacity-70">
                {closeLabel}
              </button>
            </div>
          )}
        </div>
        {/* `split`: what's in it stays put but for the part marked
            data-scroll, which fills the rest and scrolls. */}
        <div className={split ? 'flex-1 min-h-0 flex flex-col gap-4' : 'space-y-6'}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
