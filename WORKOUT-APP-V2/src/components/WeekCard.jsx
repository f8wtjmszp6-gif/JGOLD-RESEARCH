import { GYM_MARK, activities, WEEKLY_GOAL } from '../data/workout'
import { GoalRow } from './Goal'
import { goalTint, goalFill } from '../utils/goal'
import walkImg from '../assets/workouts/walk.svg'
import restImg from '../assets/workouts/rest.svg'

// Workouts toward the weekly goal: gym (orange) and class (violet) only.
// The two colors are a validated pair; they stay put while the goal changes.
const CLASS = activities.find(a => a.id === 'class')
const WORKOUT_KINDS = [
  { id: 'gym', label: 'Gym', mark: GYM_MARK },
  { id: 'class', label: 'Class', mark: CLASS.mark },
]

// Walks and rest days show on the card but don't count toward the goal.
const SHOWN_KINDS = [
  { id: 'walk', label: 'walks', img: walkImg, tile: activities.find(a => a.id === 'walk').tile },
  { id: 'rest', label: 'rest days', img: restImg, tile: activities.find(a => a.id === 'rest').tile },
]

// Both weekly goals in one card — the live week in the header, and each saved
// week on the Past weeks screen. It greens as the two average toward the goal.
export default function WeekCard({ week, stretch, title = 'This week', children }) {
  const workouts = week.gym + week.class
  const level = Math.floor((Math.min(workouts, WEEKLY_GOAL.max) + Math.min(stretch.total, WEEKLY_GOAL.max)) / 2)

  return (
    <div className={`shadow-sm rounded-2xl px-4 py-3.5 border transition-colors duration-500 ${goalTint(level)}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <p className="text-xs text-stone-400">Goal {WEEKLY_GOAL.min}–{WEEKLY_GOAL.max}</p>
      </div>
      <div className="space-y-2.5">
        <GoalRow label="Workouts" count={workouts} fills={WORKOUT_KINDS.flatMap(k => Array(week[k.id]).fill(k.mark))} />
        <GoalRow label="Stretching" count={stretch.total} fills={Array(stretch.total).fill(goalFill(stretch.total))} />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs">
        {WORKOUT_KINDS.map(k => (
          <div key={k.id} className={`flex items-center gap-1.5 ${week[k.id] ? '' : 'opacity-40'}`}>
            <span className={`w-2 h-2 rounded-full ${k.mark}`} />
            <span className="text-stone-500">{k.label}</span>
            <span className="font-semibold text-stone-900">{week[k.id]}</span>
          </div>
        ))}
        {/* Shown, not counted: walks and rest days, as their figures. */}
        <div className="ml-auto flex items-center gap-1.5">
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
