import { createPortal } from 'react-dom'
import { fmtClock } from '../../hooks/timing'

// Every timer — rest, hold, stretch — lives in this bar pinned above the
// list, so the list stays in view while it runs. It can open full screen.
const TIMER_LABELS = { rest: 'Rest', hold: 'Hold', stretch: 'Stretch', warmup: 'Warm-up' }

// The bar's color says what's happening: blue while you work, amber while
// you rest, white when it's waiting for your tap, green when you're done.
const BAR_THEMES = {
  work: {
    bar: 'bg-blue-50 border-blue-200', label: 'text-blue-900/70', big: 'text-blue-900',
    track: 'bg-blue-100', fill: 'bg-blue-600', ring: 'text-blue-600', ringTrack: 'text-blue-100', screen: 'bg-blue-50',
    primary: 'bg-blue-600 text-white active:bg-blue-700', secondary: 'bg-blue-100 text-blue-900 active:bg-blue-200',
  },
  rest: {
    bar: 'bg-amber-50 border-amber-300', label: 'text-amber-900/70', big: 'text-amber-900',
    track: 'bg-amber-100', fill: 'bg-amber-600', ring: 'text-amber-600', ringTrack: 'text-amber-100', screen: 'bg-amber-50',
    primary: 'bg-amber-600 text-white active:bg-amber-700', secondary: 'bg-amber-100 text-amber-900 active:bg-amber-200',
  },
  waiting: {
    bar: 'bg-white border-stone-200', label: 'text-stone-500', big: 'text-stone-900',
    track: 'bg-stone-100', fill: 'bg-stone-900', ring: 'text-stone-900', ringTrack: 'text-stone-200', screen: 'bg-white',
    primary: 'bg-stone-900 text-white active:bg-stone-700', secondary: 'bg-stone-100 text-stone-700 active:bg-stone-200',
  },
  done: {
    bar: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-900/70', big: 'text-emerald-900',
    track: 'bg-emerald-100', fill: 'bg-emerald-600', ring: 'text-emerald-600', ringTrack: 'text-emerald-100', screen: 'bg-emerald-50',
    primary: 'bg-emerald-600 text-white active:bg-emerald-700', secondary: 'bg-emerald-100 text-emerald-900 active:bg-emerald-200',
  },
}

export function TimerBar({ full, onFull, timer, next, remaining, running, onPause, onResume, onAdd, onClose, onStart, onSkipRest, onGo }) {
  const over = timer.phase === 'over'
  const switching = timer.phase === 'switch'
  const ready = timer.phase === 'ready'
  const setRest = timer.phase === 'rest' // resting between stretch sets
  const resting = timer.kind === 'rest' || setRest
  const progress = ready ? 0 : over || switching ? 1 : 1 - remaining / (setRest ? timer.restTotal : timer.total)
  const sides = (timer.sets > 1 ? ` · Set ${timer.set} of ${timer.sets}` : '') +
    (timer.sides > 1 ? ` · Side ${timer.side} of ${timer.sides}` : '')

  let big = fmtClock(remaining)
  let label = `${TIMER_LABELS[timer.kind]} · ${timer.title}${sides}`
  if (next && !next.complete) label += ` · Next: set ${next.set} of ${next.of}`
  if (setRest) label = `Rest · ${timer.title} · Set ${timer.set + 1} of ${timer.sets} next`
  if (switching && timer.side < timer.sides) {
    big = 'Switch sides'
    label = `${timer.title} · Side ${timer.side + 1} next${timer.sets > 1 ? ` · set ${timer.set} of ${timer.sets}` : ''}`
  } else if (switching) {
    big = 'Next set'
    label = `${timer.title} · Set ${timer.set + 1} of ${timer.sets} next`
  }
  if (ready) {
    big = `Get ready · ${Math.max(1, Math.ceil(remaining / 1000))}`
    label = `${TIMER_LABELS[timer.kind]} · ${timer.title}${sides}`
  }
  if (over) {
    if (timer.kind !== 'rest') {
      big = 'Done ✓'
      label = timer.title
    } else if (next?.complete) {
      big = 'All sets done ✓'
      label = `${timer.title} complete — on to the next exercise`
    } else {
      big = 'Next set'
      label = next ? `Set ${next.set} of ${next.of} · ${timer.title}` : timer.title
    }
  }

  const waiting = switching || (over && timer.kind === 'rest' && next && !next.complete)
  const theme = BAR_THEMES[waiting || ready ? 'waiting' : over ? 'done' : resting ? 'rest' : 'work']

  // The buttons, the same in the bar and full screen.
  const controls = size => (
    <>
      {ready ? (
        <>
          <BarBtn size={size} className={theme.secondary} onClick={onClose}>Stop</BarBtn>
          <BarBtn size={size} className={theme.primary} onClick={onGo}>Go now</BarBtn>
        </>
      ) : <>
        {!over && !switching && (resting ? (
          <BarBtn size={size} className={theme.secondary} onClick={onAdd}>+30s</BarBtn>
        ) : (
          <BarBtn size={size} className={theme.secondary} onClick={running ? onPause : onResume}>{running ? 'Pause' : 'Resume'}</BarBtn>
        ))}
        {waiting ? (
          <>
            {switching && <BarBtn size={size} className={theme.secondary} onClick={onClose}>Stop</BarBtn>}
            <BarBtn size={size} className={theme.primary} onClick={onStart}>Start</BarBtn>
          </>
        ) : (
          <BarBtn size={size} className={theme.primary} onClick={setRest ? onSkipRest : onClose}>
            {over ? 'Done' : resting ? 'Skip' : 'Stop'}
          </BarBtn>
        )}
      </>}
    </>
  )

  // Full screen: the countdown big inside a ring, for reading from the floor
  // mid-stretch. ‹ Back to the list shrinks it to the bar again.
  if (full) {
    const R = 120
    const C = 2 * Math.PI * R
    return createPortal(
      <div
        className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${theme.screen}`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="px-5 pt-6">
          <button onClick={() => onFull(false)} className="flex items-center gap-1.5 text-accent-500 active:opacity-70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            <span className="text-sm font-medium">Back to the list</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <p className={`text-base leading-snug ${theme.label}`}>{label}</p>
          <div className="relative w-[min(72vw,300px)] aspect-square">
            <svg viewBox="0 0 280 280" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="140" cy="140" r={R} fill="none" stroke="currentColor" strokeWidth="14" className={theme.ringTrack} />
              <circle
                cx="140" cy="140" r={R} fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
                className={`${theme.ring} transition-[stroke-dashoffset] duration-300`}
              />
            </svg>
            <p className={`absolute inset-0 flex items-center justify-center px-8 font-bold tabular-nums leading-tight ${theme.big} ${big.length > 6 ? 'text-3xl' : 'text-6xl'}`}>{big}</p>
          </div>
          <div className="flex items-center gap-3">{controls('lg')}</div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className="shrink-0 px-5 pb-3">
      <div className={`rounded-2xl border shadow-sm px-4 py-3 transition-colors duration-300 ${theme.bar}`}>
        {/* What's timing on its own line (wrapping, so the side and set always
            show), with full screen at its end; the time and buttons below. */}
        <div className="flex items-start gap-2">
          <p className={`flex-1 min-w-0 text-xs leading-snug pt-0.5 ${theme.label}`}>{label}</p>
          <button
            onClick={() => onFull(true)}
            aria-label="Full screen"
            className={`w-7 h-7 -mr-1.5 -mt-1 shrink-0 rounded-lg flex items-center justify-center ${theme.label} active:opacity-60`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <p className={`flex-1 min-w-0 text-2xl font-bold ${theme.big}`}>{big}</p>
          {controls()}
        </div>
        <div className={`h-1 rounded-full mt-2.5 overflow-hidden ${theme.track}`}>
          <div className={`h-full rounded-full ${theme.fill}`} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function BarBtn({ size, className, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-xl font-semibold transition-colors ${size === 'lg' ? 'px-6 h-14 text-base' : 'px-3 h-10 text-sm'} ${className}`}>
      {children}
    </button>
  )
}
