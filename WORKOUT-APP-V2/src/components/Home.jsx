import { workouts, GYM_ORDER, activities } from '../data/workout'

export default function Home({ store, onOpenWorkout }) {
  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2 px-1">Gym</p>
      <div className="space-y-2.5">
        {GYM_ORDER.map(id => (
          <WorkoutCard
            key={id}
            workout={workouts[id]}
            progress={store.workoutProgress(id)}
            onOpen={() => onOpenWorkout(id)}
          />
        ))}
      </div>

      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-6 mb-2 px-1">Other</p>
      <div className="space-y-2.5">
        {activities.map(a => (
          <ActivityCard
            key={a.id}
            activity={a}
            count={store.getActivityCount(a.id)}
            onAdd={() => store.addActivity(a.id)}
            onRemove={() => store.removeActivity(a.id)}
          />
        ))}
      </div>
    </div>
  )
}

function WorkoutCard({ workout, progress, onOpen }) {
  const { done, total } = progress
  const complete = total > 0 && done === total

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
            complete ? 'bg-emerald-100 text-emerald-600 font-bold' : 'bg-orange-100'
          }`}>
            {complete ? '✓' : '🏋️'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">{workout.short}</p>
            <p className="text-sm text-stone-400 truncate">{workout.name}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-stone-500">{done}/{total}</span>
          <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-400' : 'bg-orange-400'}`}
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

function ActivityCard({ activity, count, onAdd, onRemove }) {
  const active = count > 0

  return (
    <div className="w-full rounded-2xl px-4 py-3.5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${activity.tile}`}>
            {activity.icon}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">{activity.name}</p>
            <p className="text-sm text-stone-400 truncate">
              {active ? `${count} ${count === 1 ? activity.one : activity.many}` : activity.note}
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
                : 'bg-orange-500 text-white active:bg-orange-600'
            }`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
