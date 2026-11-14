import { fmtClock } from '../../hooks/timing'

// The card of the workout a timer is running for, outlined, with a line for
// what's timing: its name, the time, and pause or start. Tapping the line
// goes back into the workout. `bar`: the timer's (see useWorkoutTimer).
export function Timed({ bar, onOpen, children }) {
  if (!bar) return children
  const { timer, remaining, running } = bar
  const resting = timer.kind === 'rest' || timer.phase === 'rest'
  const tone = resting
    ? { ring: 'ring-amber-400', line: 'bg-amber-50', text: 'text-amber-900', btn: 'bg-amber-100 text-amber-900 active:bg-amber-200' }
    : { ring: 'ring-accent-500', line: 'bg-blue-50', text: 'text-blue-900', btn: 'bg-blue-100 text-blue-900 active:bg-blue-200' }
  const name = timer.kind === 'rest' ? `Rest · ${timer.title}` : timer.title
  // What shows where the time goes, and the button beside it.
  let time = fmtClock(remaining)
  let button = running
    ? { label: 'Pause', onClick: bar.onPause, icon: 'pause' }
    : { label: 'Resume', onClick: bar.onResume, icon: 'play' }
  if (timer.phase === 'armed') {
    time = fmtClock(timer.total)
    button = { label: 'Go', onClick: bar.onBegin, icon: 'play' }
  } else if (timer.phase === 'ready') {
    time = `Ready · ${Math.max(1, Math.ceil(remaining / 1000))}`
    button = { label: 'Go now', onClick: bar.onGo, icon: 'play' }
  } else if (timer.phase === 'switch') {
    time = (timer.hold != null ? (timer.hold + 1) % timer.holdSides !== 0 : timer.side < timer.sides) ? 'Switch sides' : 'Next set'
    button = { label: 'Start', onClick: bar.onStart, icon: 'play' }
  } else if (timer.phase === 'over') {
    time = timer.kind === 'rest' ? 'Next set' : 'Done ✓'
    button = { label: 'Done', onClick: bar.onClose, icon: 'check' }
  }
  return (
    // The card inside drops its own border and shadow: one card, outlined.
    <div className={`rounded-2xl bg-white shadow-sm ring-2 ${tone.ring} [&>*:first-child]:ring-0 [&>*:first-child]:shadow-none [&>*:first-child]:bg-transparent`}>
      {children}
      <div className="px-3.5 pb-3 -mt-0.5">
        <div className={`flex items-center gap-2.5 rounded-xl pl-3 pr-1.5 py-1.5 ${tone.line}`}>
          <button onClick={onOpen} className={`flex-1 min-w-0 flex items-center gap-2.5 text-left ${tone.text} active:opacity-60`}>
            <span className="flex-1 min-w-0 text-sm font-semibold truncate">{name}</span>
            <span className="text-lg font-extrabold tabular-nums whitespace-nowrap">{time}</span>
          </button>
          {button && (
            <button onClick={button.onClick} aria-label={button.label} className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${tone.btn}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" aria-hidden="true">
                {button.icon === 'pause' && <><rect x="6" y="4" width="4" height="16" rx="1" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" stroke="none" /></>}
                {button.icon === 'play' && <path d="M7 4.5v15l13-7.5z" stroke="none" />}
                {button.icon === 'check' && <path d="M5 12l5 5 9-10" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
