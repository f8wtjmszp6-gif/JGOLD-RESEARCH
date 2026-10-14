import { STRETCH_ROUTINE, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { TileIcon } from '../ui/Icons'
import { inDayOrder } from '../../utils/days'
import { ClassLine } from './lines'

// ── Workout classes ──────────────────────────────────────────────────────────
// + opens Log a class; the card lists each class this week with its answers.
export function ClassCard({ store, activity, onAdd, onEdit }) {
  const classes = store.classes
  const n = classes.length
  return (
    <ActivityCard
      activity={activity}
      icon="class"
      count={n}
      detail={n ? `${n} ${n === 1 ? activity.one : activity.many} · ${store.getCardioMinutes('class')} min` : undefined}
      onAdd={onAdd}
      onRemove={() => store.removeActivity('class')}
    >
      {n > 0 && (
        <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
          {inDayOrder(classes).map(e => <ClassLine key={e.index} entry={e.entry} onEdit={() => onEdit(e)} />)}
        </div>
      )}
    </ActivityCard>
  )
}

export function RoutineCard({ store, onOpen }) {
  const list = store.getStretches(STRETCH_ROUTINE.id)
  const done = list.filter(x => store.getStretchDone(STRETCH_ROUTINE.id, x.id)).length
  const complete = done === list.length
  // 30+ minutes (longer holds, more sets) makes the routine a workout too.
  const workout = store.routineMinutes >= STRETCH_WORKOUT_MINUTES
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shrink-0">
            <TileIcon id="stretch" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">
              {STRETCH_ROUTINE.name}
              {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
            </p>
            {/* Like a plan card: what's in it until you start, then how far along. */}
            <p className="text-sm text-stone-400 truncate">
              {done > 0 ? `${done}/${list.length}` : list.length} stretches · {store.routineMinutes} min{workout && <span className="text-pink-700"> · workout</span>}
            </p>
          </div>
        </div>
        {/* Progress only: a bar that fills as you tick stretches, no number. */}
        <div className="shrink-0">
          <div className="w-16 h-1 bg-stone-100 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-400' : 'bg-teal-400'}`}
              style={{ width: `${(done / list.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

// Days stretched this week: finishing a gym workout's stretches, the
// full-body routine, or stretching on your own (+) each count once.
// Under the name: what's in the plan until you start it, then how far along
// you are. Both counts follow the plan as you add or remove exercises and
// stretches.
export function WorkoutCard({ workout, progress, stretches, stretchesDone, onOpen }) {
  const { done, total, exercises } = progress
  const complete = total > 0 && done === total
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const started = done > 0 || stretchesDone > 0
  const detail = started
    ? `${done}/${total} sets · ${stretchesDone}/${stretches.length} ${stretches.length === 1 ? 'stretch' : 'stretches'}`
    : `${plural(exercises, 'exercise', 'exercises')} · ${plural(stretches.length, 'stretch', 'stretches')}`

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center shrink-0">
            <TileIcon id={workout.id} />
          </div>
          <div className="min-w-0">
          <p className="font-semibold text-stone-900">
            {workout.short}
            {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
          </p>
          <p className="text-sm text-stone-400 truncate">{detail}</p>
          </div>
        </div>
        {/* Progress only: a bar that fills as you tick sets, no number. */}
        <div className="shrink-0">
          <div className="w-16 h-1 bg-stone-100 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-400' : 'bg-red-400'}`}
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

export function ActivityCard({ activity, icon, count, detail, onAdd, onRemove, children }) {
  const active = count > 0

  return (
    <div className="w-full rounded-2xl px-4 py-3.5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br ${activity.tile} flex items-center justify-center shrink-0`}>
            <TileIcon id={icon} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 truncate">{activity.name}</p>
            <p className="text-sm text-stone-400 truncate">
              {detail ?? (active ? `${count} ${count === 1 ? activity.one : activity.many}` : activity.note)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && (
            <>
              <button
                onClick={onRemove}
                aria-label={`Remove a ${activity.one}`}
                className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-100 transition-colors"
              >
                −
              </button>
              <span className="w-5 text-center text-lg font-bold text-stone-900">{count}</span>
            </>
          )}
          <button
            onClick={onAdd}
            aria-label={`Add a ${activity.one}`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-medium transition-colors ${
              active
                ? 'bg-white shadow-sm text-stone-600 active:bg-stone-100'
                : 'bg-accent-500 text-white active:bg-accent-600'
            }`}
          >
            +
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
