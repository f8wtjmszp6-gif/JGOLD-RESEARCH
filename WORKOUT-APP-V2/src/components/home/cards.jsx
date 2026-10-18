import { STRETCH_ROUTINE } from '../../data/workout'
import { TileIcon } from '../ui/Icons'
import { inDayOrder } from '../../utils/days'
import { ClassLine } from './lines'
import { SessionLines } from './sessions'

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

// The Full Body Stretch, which can be done more than once a week. The one
// under way fills the ring; tapping opens it, or, once it's finished, files
// it and opens a fresh one. Each finished one gets a line with its day; 30+
// minutes counts as a workout (the dumbbell).
export function RoutineCard({ store, onOpen, onEditSession }) {
  const list = store.getStretches(STRETCH_ROUTINE.id)
  const done = list.filter(x => store.getStretchDone(STRETCH_ROUTINE.id, x.id)).length
  const under = done > 0 && done < list.length
  return (
    <div className={CARD}>
      <button onClick={() => { store.startAgain(STRETCH_ROUTINE.id); onOpen() }} aria-label={STRETCH_ROUTINE.name} className="w-full text-left transition-all active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <CardIcon icon="stretch" tile="from-teal-50 to-teal-100" value={under ? done / list.length : 0} fill="stroke-teal-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 truncate">{STRETCH_ROUTINE.name}</p>
            <p className="text-sm text-stone-400 truncate">{store.routineMinutes} min</p>
          </div>
          {/* Like a plan card: what's in it until you start, then how far along. */}
          <Counts>
            <p>{under ? <Of n={done} of={list.length} /> : list.length} stretches</p>
          </Counts>
        </div>
      </button>
      <SessionLines list={store.sessionsFor([STRETCH_ROUTINE.id])} onMenu={onEditSession} />
    </div>
  )
}

// Days stretched this week: finishing a gym workout's stretches, the
// full-body routine, or stretching on your own (+) each count once.
// A plan: a ring around its icon fills as you tick sets (green when done).
// On the right: what's in the plan until you start it, then how far along
// you are. Both counts follow the plan as you add or remove exercises and
// stretches.
// Over its name, where it stands, with a border to match: Complete, Up next
// (`upNext`: the plan to do next), In progress or Not started.
const STATUS = {
  complete: ['Complete', 'text-emerald-500', 'ring-emerald-300'],
  next: ['Up next', 'text-red-600', 'ring-red-200'],
  started: ['In progress', 'text-amber-500', 'ring-amber-300'],
  none: ['Not started', 'text-stone-400', 'ring-stone-200'],
}
export function WorkoutCard({ workout, progress, stretches, stretchesDone, upNext, onOpen }) {
  const { done, total, exercises } = progress
  const complete = total > 0 && done === total
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const started = done > 0 || stretchesDone > 0
  const [label, text, ring] = STATUS[complete ? 'complete' : upNext ? 'next' : started ? 'started' : 'none']

  return (
    <button
      onClick={onOpen}
      aria-label={`${workout.short}${complete ? ', done' : ''}`}
      className={`${CARD} transition-all active:scale-[0.98] ring-1 ${ring}`}
    >
      <div className="flex items-center gap-3">
        <CardIcon icon={workout.id} tile="from-red-50 to-red-100" value={total ? done / total : 0} done={complete} fill="stroke-red-400" />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${text}`}>{label}</p>
          <p className="font-semibold text-stone-900 truncate">{workout.short}</p>
        </div>
        {/* What's in the plan until you start it, then how far along. */}
        <Counts>
          {started ? (
            <>
              <p><Of n={done} of={total} /> sets</p>
              <p><Of n={stretchesDone} of={stretches.length} /> {stretches.length === 1 ? 'stretch' : 'stretches'}</p>
            </>
          ) : (
            <>
              <p>{plural(exercises, 'exercise', 'exercises')}</p>
              <p>{plural(stretches.length, 'stretch', 'stretches')}</p>
            </>
          )}
        </Counts>
      </div>
    </button>
  )
}

// A card's icon: round, on its tint (`tile`, gradient classes). Cards you
// open (plans, routines) pass `value` 0–1 for a ring around it that fills
// as you go in `fill` (a stroke class), green once `done`, empty until you
// start. Cards you add to leave it out: no ring, same size.
export function CardIcon({ icon, tile, value = null, done = false, fill }) {
  const r = 21
  const length = 2 * Math.PI * r
  return (
    <div className="relative w-[46px] h-[46px] shrink-0 flex items-center justify-center">
      {value !== null && (
        <svg width="46" height="46" viewBox="0 0 46 46" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="23" cy="23" r={r} fill="none" strokeWidth="3" className="stroke-stone-100" />
          {value > 0 && (
            <circle
              cx="23" cy="23" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={length}
              strokeDashoffset={length * (1 - value)}
              className={`transition-all ${done ? 'stroke-emerald-400' : fill}`}
            />
          )}
        </svg>
      )}
      <div className={`w-[34px] h-[34px] rounded-full bg-gradient-to-br ${tile} flex items-center justify-center`}>
        <TileIcon id={icon} size={22} />
      </div>
    </div>
  )
}

// Two short lines on a card's right: how far along, or what's in it.
export function Counts({ children }) {
  return <div className="shrink-0 text-right text-[13px] leading-snug text-stone-400 tabular-nums">{children}</div>
}

// "5/12" with the numbers stronger.
export const Of = ({ n, of }) => <span className="font-semibold text-stone-500">{n}/{of}</span>

// Every card's shell: 46px icon, then the rest, ~66px tall.
export const CARD = 'w-full text-left rounded-2xl px-3.5 py-2.5 bg-white shadow-sm'

export function ActivityCard({ activity, icon, count, detail, onAdd, onRemove, children }) {
  const active = count > 0

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CardIcon icon={icon} tile={activity.tile} />
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
