import { workouts } from '../data/workout'
import WeekCard from './WeekCard'
import { calendarWeekOf } from '../hooks/useStore'

const day = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// The calendar week a saved entry belongs to: "Sep 29 – Oct 5", or
// "Oct 6 – 12" within one month.
function weekRange(w) {
  const [y, m, d] = calendarWeekOf(w).split('-').map(Number)
  const mon = new Date(y, m - 1, d)
  const sun = new Date(y, m - 1, d + 6)
  return mon.getMonth() === sun.getMonth() ? `${day(mon)} – ${sun.getDate()}` : `${day(mon)} – ${day(sun)}`
}

// Every week you've reset, newest first, in the same card as This week.
export default function History({ store, onBack }) {
  const weeks = store.history

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Today</span>
        </button>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Past weeks</h1>
        <p className="text-stone-400 text-sm mt-1">
          {weeks.length ? `${weeks.length} ${weeks.length === 1 ? 'week' : 'weeks'} saved` : 'Saved each time you start a new week'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {weeks.length === 0 && (
          <div className="bg-white shadow-sm rounded-2xl p-5 text-center">
            <p className="font-semibold text-stone-900">No past weeks yet</p>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed">
              When you tap reset and start a new week, the week you finished is saved here.
            </p>
          </div>
        )}

        {weeks.map(w => (
          <WeekCard key={w.end} week={w.week} stretch={w.stretch} title={weekRange(w)}>
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100">
              {w.plans.map(p => <PlanBadge key={p.id} plan={p} />)}
            </div>
          </WeekCard>
        ))}
      </div>
    </div>
  )
}

// How far a plan got that week: ✓ finished, 12/21 partway, — not started.
function PlanBadge({ plan }) {
  const name = workouts[plan.id]?.short ?? plan.id
  const complete = plan.total > 0 && plan.done === plan.total
  const style = complete
    ? 'bg-orange-50 text-orange-700 border-orange-200'
    : plan.done > 0
      ? 'bg-white text-stone-700 border-stone-200'
      : 'bg-stone-50 text-stone-400 border-transparent'
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${style}`}>
      {name} {complete ? '✓' : plan.done > 0 ? `${plan.done}/${plan.total}` : '—'}
    </span>
  )
}
