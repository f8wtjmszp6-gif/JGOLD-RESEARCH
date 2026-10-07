import { workouts, GYM_ORDER, activities, STRETCH_ROUTINE } from '../data/workout'
import pushImg from '../assets/workouts/push.svg'
import legsQuadImg from '../assets/workouts/legsQuad.svg'
import pullImg from '../assets/workouts/pull.svg'
import legsPostImg from '../assets/workouts/legsPost.svg'
import classImg from '../assets/workouts/class.svg'
import walkImg from '../assets/workouts/walk.svg'
import restImg from '../assets/workouts/rest.svg'
import stretchImg from '../assets/workouts/stretch.svg'

// A body map per workout: the muscles it trains, lit in orange. Pull and
// Hams & Calves are drawn from behind (spine and shoulder blades) so they
// read differently from Push and Quads & Glutes.
const workoutImages = {
  push: pushImg,
  legsQuad: legsQuadImg,
  pull: pullImg,
  legsPost: legsPostImg,
}

// Same figure, posed: arms up for a class, mid-stride for a walk, lying down
// for rest — each in its week-bar color.
const activityImages = {
  class: classImg,
  walk: walkImg,
  rest: restImg,
}

export default function Home({ store, onOpenWorkout }) {
  const byId = id => activities.find(a => a.id === id)
  const activityCard = a => (
    <ActivityCard
      key={a.id}
      activity={a}
      image={activityImages[a.id]}
      count={store.getActivityCount(a.id)}
      onAdd={() => store.addActivity(a.id)}
      onRemove={() => store.removeActivity(a.id)}
    />
  )

  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <Section title="Workout plans">
        {GYM_ORDER.map(id => (
          <WorkoutCard
            key={id}
            workout={workouts[id]}
            progress={store.workoutProgress(id)}
            onOpen={() => onOpenWorkout(id)}
          />
        ))}
      </Section>

      <Section title="Gym class">{activityCard(byId('class'))}</Section>

      <Section title="Walk and rest">
        {activityCard(byId('walk'))}
        {activityCard(byId('rest'))}
      </Section>

      <Section title="Stretching">
        <RoutineCard store={store} onOpen={() => onOpenWorkout(STRETCH_ROUTINE.id)} />
        <ActivityCard
          activity={OWN_STRETCH}
          image={stretchImg}
          count={store.stretchWeek.extra}
          onAdd={() => store.addStretchExtra(1)}
          onRemove={() => store.addStretchExtra(-1)}
        />
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2 px-1">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

// Stretching done outside the app's lists — after a class, at home.
const OWN_STRETCH = {
  id: 'ownStretch',
  name: 'On my own',
  note: 'Stretched after a class or at home',
  one: 'session',
  many: 'sessions',
  tile: 'from-teal-50 to-teal-100',
}

// Seconds → "11 min"
const minutes = s => `${Math.round(s / 60)} min`

function RoutineCard({ store, onOpen }) {
  const list = STRETCH_ROUTINE.stretches
  const done = list.filter(x => store.getStretchDone(STRETCH_ROUTINE.id, x.id)).length
  const complete = done === list.length
  const seconds = list.reduce(
    (sum, x) => {
      const sets = store.getStretchSets(x.id)
      const hold = store.getCustomDuration(x.id, x.duration) * (store.getPerSide(x.id, x.perSide) ? 2 : 1)
      return sum + hold * sets + store.getStretchRest(x.id) * (sets - 1)
    },
    0,
  )
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shrink-0">
            <img src={stretchImg} alt="" className="w-10 h-[50px]" draggable={false} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">
              {STRETCH_ROUTINE.name}
              {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
            </p>
            <p className="text-sm text-stone-400 truncate">{list.length} stretches · {minutes(seconds)}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-stone-500">{done}/{list.length}</span>
          <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
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
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
            <img src={workoutImages[workout.id]} alt="" className="w-10 h-[50px]" draggable={false} />
          </div>
          <div className="min-w-0">
          <p className="font-semibold text-stone-900">
            {workout.short}
            {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
          </p>
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

function ActivityCard({ activity, image, count, onAdd, onRemove }) {
  const active = count > 0

  return (
    <div className="w-full rounded-2xl px-4 py-3.5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br ${activity.tile} flex items-center justify-center shrink-0`}>
            <img src={image} alt="" className="w-10 h-[50px]" draggable={false} />
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
                : 'bg-accent-500 text-white active:bg-accent-600'
            }`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
