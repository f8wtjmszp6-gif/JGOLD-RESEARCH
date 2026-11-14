import { useState } from 'react'
import { createPortal } from 'react-dom'
import { playBeep, setVolume } from '../../utils/sound'
import { fmtClock } from '../../hooks/timing'

// Every timer — rest, hold, stretch — lives in this bar pinned above the
// list, so the list stays in view while it runs. It can open full screen.
// Each step's color on the progress line and ring.
const STEP_COLORS = {
  ready: { fill: 'bg-amber-500', ring: 'text-amber-500' },
  hold: { fill: 'bg-blue-600', ring: 'text-blue-600' },
  rest: { fill: 'bg-amber-500', ring: 'text-amber-500' },
  done: { fill: 'bg-emerald-500', ring: 'text-emerald-500' },
}
const TIMER_LABELS = { rest: 'Rest', hold: 'Hold', stretch: 'Stretch', warmup: 'Warm-up' }

// The bar's color says what's happening: white while it waits or runs,
// amber while you rest, green when you're done.
const BAR_THEMES = {
  // Running looks like waiting: white, not shaded.
  get work() { return BAR_THEMES.waiting },
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

export function TimerBar({ full, onFull, settings, onSettings, timer, next, remaining, running, onPause, onResume, onClose, onStart, onSkipRest, onGo, onBegin, onRestart, onBack, onNextSet, nextLabel }) {
  const over = timer.phase === 'over'
  const switching = timer.phase === 'switch'
  const ready = timer.phase === 'ready'
  const armed = timer.phase === 'armed' // opened, waiting for Go
  const setRest = timer.phase === 'rest' // resting between stretch sets
  const resting = timer.kind === 'rest' || setRest
  // The count-in fills too, against the get-ready time.
  const prepTotal = (settings?.prep ?? 0) * 1000
  const progress = armed ? 0 : ready ? (prepTotal ? 1 - remaining / prepTotal : 0)
    : over || switching ? 1 : 1 - remaining / (setRest ? timer.restTotal : timer.total)
  // A stretch's single hold timed per side says which side.
  const hold = timer.hold != null && timer.holdSides > 1 ? ` · ${timer.hold % 2 ? 'Right' : 'Left'}` : ''
  const sides = hold + (timer.sets > 1 ? ` · Set ${timer.set} of ${timer.sets}` : '') +
    (timer.sides > 1 ? ` · Side ${timer.side} of ${timer.sides}` : '')

  let big = fmtClock(remaining)
  let label = `${TIMER_LABELS[timer.kind]} · ${timer.title}${sides}`
  if (next && !next.complete) label += ` · Next: set ${next.set} of ${next.of}`
  if (setRest) {
    const nextSet = timer.hold != null ? Math.floor((timer.hold + 1) / timer.holdSides) + 1 : timer.set + 1
    const of = timer.hold != null ? timer.holdSets : timer.sets
    label = `Rest · ${timer.title} · Set ${nextSet} of ${of} next`
  }
  // Waiting between holds: the other side of this set, or the next set.
  const sideNext = timer.hold != null ? (timer.hold + 1) % timer.holdSides !== 0 : timer.side < timer.sides
  if (switching && sideNext) {
    big = 'Switch sides'
    label = timer.hold != null
      ? `${timer.title} · ${timer.hold % 2 ? 'Left' : 'Right'} next`
      : `${timer.title} · Side ${timer.side + 1} next${timer.sets > 1 ? ` · set ${timer.set} of ${timer.sets}` : ''}`
  } else if (switching) {
    big = 'Next set'
    label = timer.hold != null
      ? `${timer.title} · Set ${Math.floor((timer.hold + 1) / timer.holdSides) + 1} of ${timer.holdSets} next`
      : `${timer.title} · Set ${timer.set + 1} of ${timer.sets} next`
  }
  if (armed) {
    big = fmtClock(timer.total)
    label = `${TIMER_LABELS[timer.kind]} · ${timer.title}${sides}`
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
  // The bar stays white; its progress line (and the full-screen ring) takes
  // the step's color: get ready, the hold, rest, done.
  const step = ready ? 'ready' : over ? 'done' : resting ? 'rest' : 'hold'
  const theme = { ...BAR_THEMES.waiting, ...STEP_COLORS[step] }

  // The buttons, the same in the bar and full screen.
  const controls = size => (
    <>
      {armed ? (
        <>
          <BarBtn size={size} className={theme.secondary} onClick={onClose}>Cancel</BarBtn>
          <IconBtn size={size} className={theme.primary} onClick={onBegin} label="Go"><path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" /></IconBtn>
        </>
      ) : ready ? (
        <>
          <IconBtn size={size} className={theme.secondary} onClick={onClose} label="Stop"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></IconBtn>
          <IconBtn size={size} className={theme.primary} onClick={onGo} label="Go now"><path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" /></IconBtn>
        </>
      ) : <>
        {/* Mid-hold: start it again, or skip on to the next side or set. */}
        {/* Running or resting, the same row: ⏪ ↺ ⏩ ⏸ ■ (⏩ on a rest skips it). */}
        {!over && !switching && <>
          {onBack && (
            <IconBtn size={size} className={theme.secondary} onClick={onBack} label="Back">
              <path d="M21 5.5l-9 6.5 9 6.5z" fill="currentColor" /><path d="M12 5.5l-9 6.5 9 6.5z" fill="currentColor" />
            </IconBtn>
          )}
          <IconBtn size={size} className={theme.secondary} onClick={onRestart} label="Restart">
            <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
          </IconBtn>
          {(resting || onNextSet) && (
            <IconBtn size={size} className={theme.secondary} onClick={resting ? (setRest ? onSkipRest : onClose) : onNextSet} label={resting ? 'Skip rest' : nextLabel}>
              <path d="M3 5.5l9 6.5-9 6.5z" fill="currentColor" /><path d="M12 5.5l9 6.5-9 6.5z" fill="currentColor" />
            </IconBtn>
          )}
          <IconBtn size={size} className={theme.secondary} onClick={running ? onPause : onResume} label={running ? 'Pause' : 'Resume'}>
            {running
              ? <><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></>
              : <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />}
          </IconBtn>
        </>}
        {waiting ? (
          <>
            {switching && onBack && (
              <IconBtn size={size} className={theme.secondary} onClick={onBack} label="Back">
                <path d="M21 5.5l-9 6.5 9 6.5z" fill="currentColor" /><path d="M12 5.5l-9 6.5 9 6.5z" fill="currentColor" />
              </IconBtn>
            )}
            {switching && <IconBtn size={size} className={theme.secondary} onClick={onClose} label="Stop"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></IconBtn>}
            <IconBtn size={size} className={theme.primary} onClick={onStart} label="Start"><path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" /></IconBtn>
          </>
        ) : over ? (
          <BarBtn size={size} className={theme.primary} onClick={onClose}>Done</BarBtn>
        ) : (
          <IconBtn size={size} className={theme.secondary} onClick={onClose} label="Stop"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></IconBtn>
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
        {/* Its sound settings, at the bottom. */}
        {settings && <div className="px-5"><SoundChips settings={settings} onChange={onSettings} theme={theme} /></div>}
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
          {/* With the chips, full screen sits at the end of their row. */}
          {!settings && <FullBtn className={`w-7 h-7 -mr-1.5 -mt-1 ${theme.label}`} onClick={() => onFull(true)} />}
        </div>
        <div className="flex items-center gap-2.5 mt-2.5">
          <p className={`flex-1 min-w-0 text-2xl font-bold ${theme.big}`}>{big}</p>
          {controls()}
        </div>
        <div className={`h-1 rounded-full mt-2.5 overflow-hidden ${theme.track}`}>
          <div className={`h-full rounded-full ${theme.fill}`} style={{ width: `${progress * 100}%` }} />
        </div>
        {settings && <SoundChips settings={settings} onChange={onSettings} theme={theme} onFull={() => onFull(true)} />}
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

// The timer's sound settings (the same as Settings → Timers), one tap away:
// Sound flips, Volume and Ready open a slider underneath.
const ICONS = {
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  silent: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  volume: <><path d="M11 5L6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></>,
  muted: <><path d="M11 5L6 9H2v6h4l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></>,
  ready: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></>,
}
const Icon = ({ name }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{ICONS[name]}</svg>
)

// `onFull`: on the bar, full screen sits at the end of the row; full
// screen itself leaves it out, on a white ground.
function SoundChips({ settings, onChange, theme, onFull }) {
  const [open, setOpen] = useState(null) // 'volume' | 'ready' | null
  const { sound, volume, prep } = settings
  const ground = onFull ? 'bg-white/80 active:bg-white' : 'bg-stone-100 active:bg-stone-200'
  const chip = on => `h-9 shrink-0 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${on ? theme.primary : `${ground} ${theme.big}`}`
  const toggle = k => setOpen(o => (o === k ? null : k))
  const isVolume = open === 'volume'
  const value = isVolume ? volume : prep
  const shown = isVolume ? (volume === 0 ? 'Off' : `${volume}%`) : (prep === 0 ? 'Off' : `${prep}s`)
  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center justify-between gap-1">
        <button onClick={() => { setOpen(null); onChange({ sound: sound === 'music' ? 'silent' : 'music' }) }} className={chip(false)}>
          <Icon name={sound} /><span className="truncate">{sound === 'music' ? 'Over music' : 'On silent'}</span>
        </button>
        <button onClick={() => toggle('volume')} aria-expanded={isVolume} className={chip(isVolume)}>
          <Icon name={volume === 0 ? 'muted' : 'volume'} /><span className="truncate">{volume === 0 ? 'Off' : `${volume}%`}</span>
        </button>
        <button onClick={() => toggle('ready')} aria-expanded={open === 'ready'} className={chip(open === 'ready')}>
          <Icon name="ready" /><span className="truncate">{prep === 0 ? 'Ready off' : `Ready ${prep}s`}</span>
        </button>
        {onFull && <FullBtn className={`w-9 h-9 bg-white/80 active:bg-white ${theme.big}`} onClick={onFull} />}
      </div>
      {open && (
        <div className={`rounded-xl px-3 py-2.5 space-y-1 ${onFull ? 'bg-white/80' : 'bg-stone-100'}`}>
          <div className="flex items-center gap-3">
            <label htmlFor="timer-chip-slider" className="w-14 text-[13px] font-semibold text-stone-600">{isVolume ? 'Volume' : 'Ready'}</label>
            <input
              id="timer-chip-slider"
              type="range"
              min="0"
              max={isVolume ? 100 : 15}
              step={isVolume ? 5 : 1}
              value={value}
              onChange={e => onChange(isVolume ? { volume: Number(e.target.value) } : { prep: Number(e.target.value) })}
              // Letting go of Volume plays a beep at that level.
              onPointerUp={e => { if (isVolume) { setVolume(Number(e.currentTarget.value) / 100); playBeep() } }}
              className="flex-1 min-w-0 accent-accent-500"
            />
            <span className="w-10 text-right text-[13px] font-bold tabular-nums text-stone-900">{shown}</span>
          </div>
          {isVolume ? volume === 0 && <p className="text-xs text-stone-500">Beeps off. The timer still runs.</p>
            : <p className="text-xs text-stone-500">Time to get in position before each hold.</p>}
        </div>
      )}
    </div>
  )
}

function FullBtn({ className, onClick }) {
  return (
    <button onClick={onClick} aria-label="Full screen" className={`shrink-0 rounded-xl flex items-center justify-center ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>
  )
}

// A square button with just an icon, beside the bar's buttons.
function IconBtn({ size, className, onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label} className={`rounded-xl flex items-center justify-center shrink-0 transition-colors ${size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'} ${className}`}>
      <svg width={size === 'lg' ? 22 : 18} height={size === 'lg' ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
    </button>
  )
}
