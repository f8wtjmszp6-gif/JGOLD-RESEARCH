import { useEffect, useState } from 'react'
import Home from './components/Home'
import MuscleMap from './components/MuscleMap'
import WeekCard from './components/WeekCard'
import { useTheme } from './hooks/useTheme'
import SettingsDrawer from './components/SettingsDrawer'
import History from './components/History'
import TrendsScreen from './components/Trends'
import WorkoutDetail from './components/WorkoutDetail'
import { useStore } from './hooks/useStore'
import { weekDay } from './utils/goal'

export default function App() {
  const [workoutId, setWorkoutId] = useState(null)
  const [view, setView] = useState(null) // 'history' | 'trends' | null
  const [settings, setSettings] = useState(false)
  const store = useStore()
  // Applies the theme and follows the phone in Auto, whether or not
  // Settings is open.
  const theme = useTheme()

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-stone-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {view === 'history' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <History store={store} onBack={() => setView(null)} />
        </div>
      ) : view === 'trends' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TrendsScreen store={store} onBack={() => setView(null)} />
        </div>
      ) : workoutId ? (
        // The workout drill-in owns the full viewport and brings its own header.
        <div className="flex-1 min-h-0 overflow-hidden">
          <WorkoutDetail key={workoutId} workoutId={workoutId} store={store} onBack={() => setWorkoutId(null)} onSwitch={setWorkoutId} />
        </div>
      ) : (
        <>
          <Header
            onSettings={() => setSettings(true)}
            onHistory={() => setView('history')}
            onTrends={() => setView('trends')}
            week={store.week}
            stretch={store.stretchWeek}
            cardio={store.cardioWeek}
            store={store}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <Home store={store} onOpenWorkout={setWorkoutId} />
          </div>
        </>
      )}

      {settings && <SettingsDrawer store={store} theme={theme} onClose={() => setSettings(false)} />}
      {store.newWeek && !view && !workoutId && (
        <NewWeekBar store={store} onView={() => { store.dismissNewWeek(); setView('history') }} />
      )}
    </div>
  )
}

function Header({ onSettings, onHistory, onTrends, week, stretch, cardio, store }) {
  const logged = { class: store.classes.length, cardio: store.otherCardio.length }
  return (
    <div className="shrink-0 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[34px] leading-[1.05] font-bold text-stone-900 tracking-tight">Today</h1>
          <p className="text-sm text-stone-500 mt-0.5 whitespace-nowrap">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}
            {weekDay().daysLeft === 1 ? 'last day' : `${weekDay().daysLeft} days left`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HeaderBtn onClick={onTrends} label="Trends">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19h16" />
              <polyline points="5 15 10 10 13 13 19 7" />
              <polyline points="15 7 19 7 19 11" />
            </svg>
          </HeaderBtn>
          <HeaderBtn onClick={onHistory} label="Past weeks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2.5" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          </HeaderBtn>
          <HeaderBtn onClick={onSettings} label={backupDue(store.lastBackupAt) ? 'Settings (time to back up)' : 'Settings'} dot={backupDue(store.lastBackupAt)}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </HeaderBtn>
        </div>
      </div>
      <div className="mt-4">
        {/* This week's body map sits in the card's title line. */}
        <WeekCard week={week} stretch={stretch} cardio={cardio} goals={store.goals} figure={<MuscleMap store={store} />} live logged={logged} />
      </div>
    </div>
  )
}

// A backup is due when there's never been one, or the last is a week old.
function backupDue(lastBackupAt) {
  return !lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 86400000
}

// Shown once when a new week starts: last week went to Past weeks.
function NewWeekBar({ store, onView }) {
  useEffect(() => {
    const t = setTimeout(store.dismissNewWeek, 10000)
    return () => clearTimeout(t)
  }, [store.dismissNewWeek])
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto rounded-2xl bg-stone-900 shadow-lg pl-4 pr-2 py-2 flex items-center gap-3">
        <p className="flex-1 text-sm text-white">New week. Last week is saved in Past weeks.</p>
        <button onClick={onView} className="px-3.5 h-9 rounded-xl bg-white text-stone-900 text-sm font-semibold active:bg-stone-200">
          View
        </button>
      </div>
    </div>
  )
}

function HeaderBtn({ onClick, label, disabled, dot, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="relative w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-500 active:bg-stone-100 transition-colors disabled:opacity-40"
    >
      {children}
      {dot && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />}
    </button>
  )
}
