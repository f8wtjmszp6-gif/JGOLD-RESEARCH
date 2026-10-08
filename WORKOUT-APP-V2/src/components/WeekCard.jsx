import { GYM_MARK, CARDIO_MARK, STRETCH_MARK, activities, WEEKLY_GOAL, CARDIO_GOAL } from '../data/workout'
import { GoalRow, CardioRow } from './Goal'
import { goalTint, goalFill, cardioLevel, weekLeft, listJoin } from '../utils/goal'
import walkImg from '../assets/workouts/walk.svg'
import restImg from '../assets/workouts/rest.svg'

// Workouts toward the weekly goal: gym (orange), class (violet), and cardio
// (cyan) or stretching (pink) long enough to count. The colors are a
// validated set. Gym and class always show in the legend; the other two
// only once they've happened, so the legend fits beside the walk/rest chips.
const CLASS = activities.find(a => a.id === 'class')
const WORKOUT_KINDS = [
  { id: 'gym', label: 'Gym', mark: GYM_MARK, always: true },
  { id: 'class', label: 'Class', mark: CLASS.mark, always: true },
  { id: 'cardio', label: 'Cardio', mark: CARDIO_MARK },
  { id: 'stretchWork', label: 'Stretch', mark: STRETCH_MARK },
]

// Walks and rest days show on the card but don't count toward the goal.
const SHOWN_KINDS = [
  { id: 'walk', label: 'walks', img: walkImg, tile: activities.find(a => a.id === 'walk').tile },
  { id: 'rest', label: 'rest days', img: restImg, tile: activities.find(a => a.id === 'rest').tile },
]

// The weekly goals in one card — the live week in the header, and each saved
// week on the Past weeks screen. It greens as they average toward the goal.
// Weeks saved before cardio minutes were tracked have no cardio row.
// `figure` (the live week's body map) goes at the right of the title line;
// `live` adds what's left to do this week under the bars.
export default function WeekCard({ week, stretch, cardio, figure, live, title = 'This week', children }) {
  // Weeks saved before cardio counted have no cardio key.
  const count = id => week[id] ?? 0
  const workouts = WORKOUT_KINDS.reduce((n, k) => n + count(k.id), 0)
  const levels = [Math.min(workouts, WEEKLY_GOAL.max), Math.min(stretch.total, WEEKLY_GOAL.max)]
  if (cardio) levels.push(cardioLevel(cardio.total))
  const level = Math.floor(levels.reduce((a, b) => a + b, 0) / levels.length)

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
      {live && <WeekLeft workouts={workouts} stretches={stretch.total} cardio={cardio ? cardio.total : null} />}
      {/* Wraps when every kind is showing: the walk/rest chips drop to a
          second line, still on the right. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 text-xs">
        {WORKOUT_KINDS.filter(k => k.always || count(k.id)).map(k => (
          <div key={k.id} className={`flex items-center gap-1.5 shrink-0 ${count(k.id) ? '' : 'opacity-40'}`}>
            <span className={`w-2 h-2 rounded-full ${k.mark}`} />
            <span className="text-stone-500">{k.label}</span>
            <span className="font-semibold text-stone-900">{count(k.id)}</span>
          </div>
        ))}
        {/* Shown, not counted: walks and rest days, as their figures. */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {SHOWN_KINDS.map(k => (
            <span
              key={k.id}
              aria-label={`${week[k.id]} ${k.label} (not counted)`}
              className={`flex items-center gap-1 rounded-lg pl-0.5 pr-2 py-0.5 bg-gradient-to-br ${k.tile} ${week[k.id] ? '' : 'opacity-40'}`}
            >
              <img src={k.img} alt="" className="w-5 h-6" draggable={false} />
              <span className="font-semibold text-stone-700">{week[k.id]}</span>
            </span>
          ))}
        </div>
      </div>
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
