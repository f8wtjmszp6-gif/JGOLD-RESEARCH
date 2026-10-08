import { GYM_MARK, CARDIO_MARK, STRETCH_MARK, activities, WEEKLY_GOAL, CARDIO_GOAL } from '../data/workout'
import { GoalRow, CardioRow } from './Goal'
import { goalTint, goalFill, cardioLevel, weekLeft, listJoin } from '../utils/goal'
import gymImg from '../assets/workouts/push.svg'
import classImg from '../assets/workouts/class.svg'
import runImg from '../assets/workouts/run.svg'
import walkImg from '../assets/workouts/walk.svg'
import stretchImg from '../assets/workouts/stretch.svg'
import restImg from '../assets/workouts/rest.svg'

// Workouts toward the weekly goal: gym (orange), class (violet), and cardio
// (cyan) or stretching (pink) long enough to count. The colors are a
// validated set.
const CLASS = activities.find(a => a.id === 'class')
const WORKOUT_KINDS = [
  { id: 'gym', mark: GYM_MARK },
  { id: 'class', mark: CLASS.mark },
  { id: 'cardio', mark: CARDIO_MARK },
  { id: 'stretchWork', mark: STRETCH_MARK },
]

// One figure chip per kind of thing you did, in the colors of its Home card,
// faded at zero. Counts are everything logged — a class or run counts here
// even when it was too short to be a workout.
const tileOf = id => activities.find(a => a.id === id).tile
const CHIPS = [
  { id: 'gym', img: gymImg, tile: 'from-orange-50 to-orange-100', one: 'gym workout', many: 'gym workouts' },
  { id: 'class', img: classImg, tile: tileOf('class'), one: 'class', many: 'classes' },
  { id: 'cardio', img: runImg, tile: 'from-cyan-50 to-cyan-100', one: 'cardio session', many: 'cardio sessions' },
  { id: 'walk', img: walkImg, tile: tileOf('walk'), one: 'walk', many: 'walks' },
  { id: 'stretch', img: stretchImg, tile: 'from-teal-50 to-teal-100', one: 'stretch session', many: 'stretch sessions' },
  { id: 'rest', img: restImg, tile: tileOf('rest'), one: 'rest day', many: 'rest days' },
]

// The weekly goals in one card — the live week in the header, and each saved
// week on the Past weeks screen. It greens as they average toward the goal.
// Weeks saved before cardio minutes were tracked have no cardio row.
// `figure` (the live week's body map) goes at the right of the title line;
// `live` adds what's left to do this week under the bars. `logged` gives
// classes and cardio sessions logged (the live week knows; saved weeks fall
// back to the ones that counted as workouts).
export default function WeekCard({ week, stretch, cardio, figure, live, logged, title = 'This week', children }) {
  // Weeks saved before cardio counted have no cardio key.
  const count = id => week[id] ?? 0
  const workouts = WORKOUT_KINDS.reduce((n, k) => n + count(k.id), 0)
  const levels = [Math.min(workouts, WEEKLY_GOAL.max), Math.min(stretch.total, WEEKLY_GOAL.max)]
  if (cardio) levels.push(cardioLevel(cardio.total))
  const level = Math.floor(levels.reduce((a, b) => a + b, 0) / levels.length)
  const chipCounts = {
    gym: count('gym'),
    class: logged?.class ?? count('class'),
    cardio: logged?.cardio ?? count('cardio'),
    walk: count('walk'),
    stretch: stretch.total,
    rest: count('rest'),
  }

  return (
    <div className={`shadow-sm rounded-2xl px-4 py-3.5 border transition-colors duration-500 ${goalTint(level)}`}>
      <div className={`flex items-center justify-between gap-3 ${figure ? 'mb-2 -mt-1' : 'mb-3'}`}>
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <div className="flex items-center gap-2.5">
          <p className="text-xs text-stone-400">Goal {WEEKLY_GOAL.min}–{WEEKLY_GOAL.max}{cardio && ` · ${CARDIO_GOAL.max} min`}</p>
          {figure}
        </div>
      </div>
      <div className="space-y-2.5">
        <GoalRow label="Workouts" count={workouts} fills={WORKOUT_KINDS.flatMap(k => Array(count(k.id)).fill(k.mark))} />
        <GoalRow label="Stretching" count={stretch.total} fills={Array(stretch.total).fill(goalFill(stretch.total))} />
        {cardio && <CardioRow minutes={cardio.total} fill={goalFill(cardioLevel(cardio.total))} />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {CHIPS.map(k => {
          const n = chipCounts[k.id]
          return (
            <span
              key={k.id}
              role="img"
              aria-label={`${n} ${n === 1 ? k.one : k.many}`}
              className={`flex items-center gap-0.5 rounded-lg pl-0.5 pr-2 py-0.5 bg-gradient-to-br ${k.tile} ${n ? '' : 'opacity-40'}`}
            >
              <img src={k.img} alt="" className="w-5 h-6" draggable={false} />
              <span className="text-xs font-semibold text-stone-700">{n}</span>
            </span>
          )
        })}
      </div>
      {live && <WeekLeft workouts={workouts} stretches={stretch.total} cardio={cardio ? cardio.total : null} />}
      {children}
    </div>
  )
}

// "Thu · 4 days left — 1 more workout, 2 stretch sessions and 110 cardio min
// to go", or "All goals met this week ✓".
function WeekLeft(counts) {
  const { day, daysLeft, needs } = weekLeft(counts, { workouts: WEEKLY_GOAL.min, stretches: WEEKLY_GOAL.min, cardio: CARDIO_GOAL.min })
  return (
    <p className="mt-3 text-xs text-stone-500 leading-relaxed">
      <span className="font-semibold text-stone-700">{day} · {daysLeft === 1 ? 'last day' : `${daysLeft} days left`}</span>
      {needs.length
        ? <> — {listJoin(needs)} to go</>
        : <span className="font-semibold text-emerald-700"> — all goals met this week ✓</span>}
    </p>
  )
}
