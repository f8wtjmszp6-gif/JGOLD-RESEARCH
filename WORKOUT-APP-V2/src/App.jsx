import { useState } from 'react'
import Home from './components/Home'
import MuscleMap from './components/MuscleMap'
import WorkoutDetail from './components/WorkoutDetail'
import { useStore } from './hooks/useStore'
import { GYM_MARK, activities, WEEKLY_GOAL } from './data/workout'
import { GoalRow } from './components/Goal'
import { goalTint, goalFill } from './utils/goal'
import walkImg from './assets/workouts/walk.svg'
import restImg from './assets/workouts/rest.svg'

export default function App() {
  const [workoutId, setWorkoutId] = useState(null)
  const [sheet, setSheet] = useState(null) // 'reset' | null
  const store = useStore()

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-stone-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {workoutId ? (
        // The workout drill-in owns the full viewport and brings its own header.
        <div className="flex-1 min-h-0 overflow-hidden">
          <WorkoutDetail workoutId={workoutId} store={store} onBack={() => setWorkoutId(null)} />
        </div>
      ) : (
        <>
          <Header
            onReset={() => setSheet('reset')}
            canReset={store.hasChecks}
            week={store.week}
            stretch={store.stretchWeek}
            store={store}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <Home store={store} onOpenWorkout={setWorkoutId} />
          </div>
        </>
      )}

      {sheet === 'reset' && (
        <ResetConfirm
          onCancel={() => setSheet(null)}
          onConfirm={() => { store.resetChecks(); setSheet(null) }}
        />
      )}
    </div>
  )
}

function Header({ onReset, canReset, week, stretch, store }) {
  return (
    <div className="shrink-0 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[34px] leading-[1.05] font-bold text-stone-900 tracking-tight">Today</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* This week's body map, as a small widget beside reset. */}
          <div className="bg-white shadow-sm rounded-xl px-2 py-1">
            <MuscleMap store={store} />
          </div>
          <HeaderBtn onClick={onReset} label="Clear all checkmarks" disabled={!canReset}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 3 3 9 9 9" />
            </svg>
          </HeaderBtn>
        </div>
      </div>
      <ThisWeekCard week={week} stretch={stretch} />
    </div>
  )
}

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

// Both weekly goals in one card. It greens as the two average toward the goal.
function ThisWeekCard({ week, stretch }) {
  const workouts = week.gym + week.class
  const level = Math.floor((Math.min(workouts, WEEKLY_GOAL.max) + Math.min(stretch.total, WEEKLY_GOAL.max)) / 2)

  return (
    <div className={`mt-4 shadow-sm rounded-2xl px-4 py-3.5 border transition-colors duration-500 ${goalTint(level)}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-stone-500">This week</p>
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
    </div>
  )
}

function HeaderBtn({ onClick, label, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-500 active:bg-stone-100 transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function ResetConfirm({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-stone-900 font-bold text-lg mb-1">Clear all checkmarks?</h3>
        <p className="text-stone-500 text-sm mb-5 leading-relaxed">
          Unticks every set and stretch, and sets your class, walk and rest counts back to zero. Your weights, reps and settings stay as they are.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold active:bg-stone-700 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold active:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
