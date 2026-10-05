import { useState } from 'react'
import Home from './components/Home'
import WorkoutDetail from './components/WorkoutDetail'
import InfoSheet from './components/InfoSheet'
import { useStore } from './hooks/useStore'
import { GYM_MARK, activities } from './data/workout'

export default function App() {
  const [workoutId, setWorkoutId] = useState(null)
  const [sheet, setSheet] = useState(null) // 'info' | 'reset' | null
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
            onInfo={() => setSheet('info')}
            onReset={() => setSheet('reset')}
            canReset={store.hasChecks}
            week={store.week}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <Home store={store} onOpenWorkout={setWorkoutId} />
          </div>
        </>
      )}

      {sheet === 'info' && <InfoSheet onClose={() => setSheet(null)} />}
      {sheet === 'reset' && (
        <ResetConfirm
          onCancel={() => setSheet(null)}
          onConfirm={() => { store.resetChecks(); setSheet(null) }}
        />
      )}
    </div>
  )
}

function Header({ onInfo, onReset, canReset, week }) {
  return (
    <div className="shrink-0 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Workouts</h1>
        <div className="flex items-center gap-2 shrink-0">
          <HeaderBtn onClick={onInfo} label="Progression rules">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
            </svg>
          </HeaderBtn>
          <HeaderBtn onClick={onReset} label="Clear all checkmarks" disabled={!canReset}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 3 3 9 9 9" />
            </svg>
          </HeaderBtn>
        </div>
      </div>
      <WeekCard week={week} />
    </div>
  )
}

// Bar and legend order match the list below: gym, then each activity.
const WEEK_KINDS = [
  { id: 'gym', label: 'Gym', mark: GYM_MARK },
  ...activities.map(a => ({ id: a.id, label: a.short, mark: a.mark })),
]

// The week as a stacked bar: one segment per day, colored by what you did.
// Anything past 7 (you forgot to reset) just reads as a full week.
function WeekCard({ week }) {
  const segments = WEEK_KINDS.flatMap(k => Array(week[k.id]).fill(k.mark)).slice(0, 7)
  const filled = segments.length
  const summary = WEEK_KINDS.map(k => `${week[k.id]} ${k.label.toLowerCase()}`).join(', ')

  return (
    <div className="mt-4 bg-white shadow-sm rounded-2xl px-4 py-3.5">
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="text-sm font-medium text-stone-500">This week</p>
        <p className="text-stone-900">
          {filled === 7 && <span className="text-stone-500 mr-1">✓</span>}
          <span className="text-lg font-semibold">{filled}</span>
          <span className="text-sm text-stone-400"> / 7</span>
        </p>
      </div>
      <div className="flex gap-0.5" role="img" aria-label={`${filled} of 7 days: ${summary}`}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={`flex-1 h-2.5 rounded transition-colors ${segments[i] ?? 'bg-stone-200'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        {WEEK_KINDS.map(k => (
          <div key={k.id} className={`flex items-center gap-1.5 text-xs ${week[k.id] ? '' : 'opacity-40'}`}>
            <span className={`w-2 h-2 rounded-full ${k.mark}`} />
            <span className="text-stone-500">{k.label}</span>
            <span className="font-semibold text-stone-900">{week[k.id]}</span>
          </div>
        ))}
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
