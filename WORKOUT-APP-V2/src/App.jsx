import { useEffect, useState } from 'react'
import Home from './components/Home'
import MuscleMap from './components/MuscleMap'
import WeekCard from './components/WeekCard'
import { useTheme } from './hooks/useTheme'
import SettingsDrawer from './components/SettingsDrawer'
import TrendsScreen from './components/Trends'
import WorkoutDetail from './components/WorkoutDetail'
import { useStore, calendarWeekOf } from './hooks/useStore'
import { weekDay } from './utils/goal'
import { weekRange, weeksAgo } from './utils/days'
import { setSoundMode } from './utils/sound'

export default function App() {
  const [workoutId, setWorkoutId] = useState(null)
  const [view, setView] = useState(null) // 'trends' | null
  const [settings, setSettings] = useState(false)
  const store = useStore()
  // Light or dark, following the phone.
  useTheme()

  // The week showing, by its Monday; null is this week. A saved week shows
  // in the same screens as this one and can be changed there, unless it was
  // saved before weeks kept their details (`week` is null then).
  const [weekStart, setWeekStart] = useState(null)
  const weeks = store.weeks
  const found = weekStart ? weeks.findIndex(w => w.weekStart === weekStart && !w.live) : -1
  const at = found < 0 ? weeks.length - 1 : found
  const past = found >= 0
  const entry = past ? store.history.find(e => calendarWeekOf(e) === weekStart) : null
  const week = past ? store.weekStore(weekStart) : store

  // Timer beeps follow the Sound setting.
  useEffect(() => setSoundMode(store.timer.sound), [store.timer.sound])

  // Coming back to the app goes back to this week, unless a workout is open.
  useEffect(() => {
    if (workoutId) return
    const back = () => {
      if (document.visibilityState === 'hidden') setWeekStart(null)
    }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [workoutId])

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-stone-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {view === 'trends' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TrendsScreen store={store} onBack={() => setView(null)} />
        </div>
      ) : workoutId ? (
        // The workout drill-in owns the full viewport and brings its own header.
        <div className="flex-1 min-h-0 overflow-hidden">
          <WorkoutDetail key={`${weekStart}-${workoutId}`} workoutId={workoutId} store={week} onBack={() => setWorkoutId(null)} onSwitch={setWorkoutId} />
        </div>
      ) : (
        <>
          {past ? (
            <PastHeader weekStart={weeks[at].weekStart} entry={entry} week={week} goals={store.goals} onThisWeek={() => setWeekStart(null)} />
          ) : (
            <Header
              onSettings={() => setSettings(true)}
              onTrends={() => setView('trends')}
              week={store.week}
              stretch={store.stretchWeek}
              cardio={store.cardioWeek}
              store={store}
            />
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Home
              store={week}
              entry={entry}
              weeks={weeks}
              at={at}
              onAt={i => setWeekStart(weeks[i].live ? null : weeks[i].weekStart)}
              onOpenWorkout={setWorkoutId}
            />
          </div>
        </>
      )}

      {settings && <SettingsDrawer store={store} onClose={() => setSettings(false)} />}
      {store.newWeek && !view && !workoutId && (
        <NewWeekBar store={store} onView={() => { setWeekStart(store.newWeek.weekStart); store.dismissNewWeek() }} />
      )}
    </div>
  )
}

function Header({ onSettings, onTrends, week, stretch, cardio, store }) {
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

// A saved week: its dates, how long ago, and a way back to this week. Its card
// shows the week as it ended, with what was left to go. Weeks saved before
// their details were kept show their totals only.
function PastHeader({ weekStart, entry, week, goals, onThisWeek }) {
  return (
    <div className="shrink-0 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-[1.1] font-bold text-stone-900 tracking-tight whitespace-nowrap">{weekRange(weekStart)}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{weeksAgo(weekStart)}</p>
        </div>
        <button onClick={onThisWeek} className="shrink-0 h-9 px-3.5 rounded-full bg-accent-50 text-accent-500 text-sm font-semibold active:bg-accent-100">
          This week ›
        </button>
      </div>
      <div className="mt-4">
        {week ? (
          <WeekCard week={entry.week} stretch={entry.stretch} cardio={entry.cardio} goals={goals} figure={<MuscleMap store={week} />} live ended logged={{ class: week.classes.length, cardio: week.otherCardio.length }} />
        ) : (
          <WeekCard week={entry.week} stretch={entry.stretch} cardio={entry.cardio} goals={goals} logged={entry.classes ? { class: entry.classes.length } : undefined} title="Totals" />
        )}
      </div>
    </div>
  )
}

// A backup is due when there's never been one, or the last is a week old.
function backupDue(lastBackupAt) {
  return !lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 86400000
}

// Shown once when a new week starts: last week is a swipe back.
function NewWeekBar({ store, onView }) {
  useEffect(() => {
    const t = setTimeout(store.dismissNewWeek, 10000)
    return () => clearTimeout(t)
  }, [store.dismissNewWeek])
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto rounded-2xl bg-stone-900 shadow-lg pl-4 pr-2 py-2 flex items-center gap-3">
        <p className="flex-1 text-sm text-white">New week. Swipe back on the days to see last week.</p>
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
