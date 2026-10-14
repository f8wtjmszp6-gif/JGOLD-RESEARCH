import { weekDays, sameDay } from '../../utils/days'
import { TAB_DOT, tabsOf } from '../../utils/dayKinds'

// Each day shows a dot for every tab it already has something logged in.
export function DayPicker({ now, at, dayLog, onChange }) {
  const picked = at ? new Date(at) : null
  return (
    <div className="space-y-2">
      <span className="text-base text-stone-600">Day</span>
      <div className="grid grid-cols-7 gap-1">
        {weekDays(now).map((d, i) => {
          const today = sameDay(d, now)
          const future = !today && d > now
          const on = picked && sameDay(d, picked)
          return (
            <button
              key={d.getDate()}
              disabled={future}
              onClick={() => onChange(today ? now.toISOString() : d.toISOString())}
              aria-pressed={!!on}
              aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              className={`rounded-xl py-1.5 text-center transition-colors disabled:opacity-30 ${
                on ? 'bg-accent-500 text-white' : 'bg-stone-100 text-stone-600 active:bg-stone-200'
              }`}
            >
              <span className="block text-[11px] font-medium">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
              <span className="block text-sm font-semibold">{d.getDate()}</span>
              <span className="flex justify-center gap-0.5 h-1 mt-0.5">
                {tabsOf(dayLog?.[i] ?? []).map(k => <span key={k} className={`w-1 h-1 rounded-full ${TAB_DOT[k]} ${on ? 'ring-1 ring-white' : ''}`} />)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
