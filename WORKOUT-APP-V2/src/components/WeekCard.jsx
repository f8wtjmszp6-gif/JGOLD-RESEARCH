import { activities } from '../data/workout'
import { GoalRow, CardioRow } from './Goal'
import { TileIcon } from './Icons'
import { goalFill, goalLevel, weekDay } from '../utils/goal'

// What counts toward the weekly workout goal: gym workouts, classes, and
// cardio or stretching long enough to count. The bar is one color, like the
// others; the chips below say how many of each kind you did.
const WORKOUT_KINDS = ['gym', 'class', 'cardio', 'stretchWork']

// One figure chip per kind of thing you did, in the colors of its Home card,
// faded at zero. Counts are everything logged — a class or run counts here
// even when it was too short to be a workout.
const tileOf = id => activities.find(a => a.id === id).tile
const CHIPS = [
  { id: 'gym', icon: 'gym', tile: 'from-orange-50 to-orange-100', one: 'gym workout', many: 'gym workouts' },
  { id: 'class', icon: 'class', tile: tileOf('class'), one: 'class', many: 'classes' },
  { id: 'cardio', icon: 'cardio', tile: 'from-cyan-50 to-cyan-100', one: 'cardio session', many: 'cardio sessions' },
  { id: 'walk', icon: 'walk', tile: tileOf('walk'), one: 'walk', many: 'walks' },
  { id: 'stretch', icon: 'stretch', tile: 'from-teal-50 to-teal-100', one: 'stretch session', many: 'stretch sessions' },
  { id: 'rest', icon: 'rest', tile: tileOf('rest'), one: 'rest day', many: 'rest days' },
]

// The weekly goals in one card — the live week in the header, and each saved
// week on the Past weeks screen. The card stays white; each bar deepens as
// it nears its goal.
// Weeks saved before cardio minutes were tracked have no cardio row.
// `figure` (the live week's body map) goes at the right of the title line;
// `live` adds what's left to do this week under the bars. `logged` gives
// classes and cardio sessions logged (the live week knows; saved weeks fall
// back to the ones that counted as workouts).
export default function WeekCard({ week, stretch, cardio, goals, figure, live, logged, title = 'This week', children }) {
  // Weeks saved before cardio counted have no cardio key.
  const count = id => week[id] ?? 0
  const workouts = WORKOUT_KINDS.reduce((n, id) => n + count(id), 0)
  const chipCounts = {
    gym: count('gym'),
    class: logged?.class ?? count('class'),
    cardio: logged?.cardio ?? count('cardio'),
    walk: count('walk'),
    stretch: stretch.total,
    rest: count('rest'),
  }

  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3">
      {/* The live week's title is the day and how many are left; a saved
          week's is its dates. */}
      <div className={`flex items-center justify-between gap-3 ${figure ? 'mb-1.5 -mt-1' : 'mb-2.5'}`}>
        {live ? <DaysLeft /> : <p className="text-sm font-medium text-stone-500">{title}</p>}
        {figure}
      </div>
      <div className="space-y-2">
        <GoalRow label="Workouts" count={workouts} goal={goals.workouts} fills={Array(workouts).fill(goalFill(goalLevel(workouts, goals.workouts)))} />
        <GoalRow label="Stretching" count={stretch.total} goal={goals.stretch} fills={Array(stretch.total).fill(goalFill(goalLevel(stretch.total, goals.stretch)))} />
        {cardio && <CardioRow minutes={cardio.total} goal={goals.cardio} fill={goalFill(goalLevel(cardio.total, goals.cardio))} />}
      </div>

      <div className="flex flex-wrap items-center gap-1 mt-2.5">
        {CHIPS.map(k => {
          const n = chipCounts[k.id]
          return (
            <span
              key={k.id}
              role="img"
              aria-label={`${n} ${n === 1 ? k.one : k.many}`}
              className={`flex items-center gap-0.5 rounded-md pl-0.5 pr-1.5 bg-gradient-to-br ${k.tile} ${n ? '' : 'opacity-40'}`}
            >
              <span className="w-5 h-5 flex items-center justify-center"><TileIcon id={k.icon} size={14} /></span>
              <span className="text-xs font-semibold text-stone-700">{n}</span>
            </span>
          )
        })}
        {live && <ToGo workouts={workouts} stretches={stretch.total} cardio={cardio ? cardio.total : null} goals={goals} />}
      </div>
      {children}
    </div>
  )
}

// The live week's title: "Sat · 2 days left" (or "last day").
function DaysLeft() {
  const { day, daysLeft } = weekDay()
  return (
    <p className="text-sm text-stone-500">
      <span className="font-semibold text-stone-800">{day}</span> · {daysLeft === 1 ? 'last day' : `${daysLeft} days left`}
    </p>
  )
}

// What's still needed to reach each minimum, short enough to sit beside the
// icons: "1 workout, 3 stretches to go", or "All goals met ✓".
function ToGo({ goals, workouts, stretches, cardio }) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const needs = []
  if (workouts < goals.workouts.min) needs.push(plural(goals.workouts.min - workouts, 'workout', 'workouts'))
  if (stretches < goals.stretch.min) needs.push(plural(goals.stretch.min - stretches, 'stretch', 'stretches'))
  if (cardio !== null && cardio < goals.cardio.min) needs.push(`${goals.cardio.min - cardio} cardio min`)
  return needs.length
    ? <span className="ml-auto text-xs text-stone-500">{needs.join(', ')} to go</span>
    : <span className="ml-auto text-xs font-semibold text-emerald-700">All goals met ✓</span>
}
