import { useEffect, useRef, useState } from 'react'
import Home from './components/Home'
import MuscleMap from './components/MuscleMap'
import WeekCard from './components/WeekCard'
import { useTheme } from './hooks/useTheme'
import History from './components/History'
import TrendsScreen from './components/Trends'
import WorkoutDetail from './components/WorkoutDetail'
import { useStore } from './hooks/useStore'
import { shareBackup, readBackup, backupAge, usesShareSheet } from './utils/backup'

export default function App() {
  const [workoutId, setWorkoutId] = useState(null)
  const [view, setView] = useState(null) // 'history' | 'trends' | null
  const [sheet, setSheet] = useState(null) // 'reset' | null
  const store = useStore()

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
          <WorkoutDetail workoutId={workoutId} store={store} onBack={() => setWorkoutId(null)} />
        </div>
      ) : (
        <>
          <Header
            onReset={() => setSheet('reset')}
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

      {sheet === 'reset' && <WeekSheet store={store} onClose={() => setSheet(null)} />}
      {store.canUndoReset && <UndoBar store={store} />}
    </div>
  )
}

function Header({ onReset, onHistory, onTrends, week, stretch, cardio, store }) {
  return (
    <div className="shrink-0 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[34px] leading-[1.05] font-bold text-stone-900 tracking-tight">Today</h1>
          <p className="text-sm text-stone-500 mt-0.5 whitespace-nowrap">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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
          <HeaderBtn onClick={onReset} label="New week and backups">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 3 3 9 9 9" />
            </svg>
          </HeaderBtn>
          <ThemeButton />
        </div>
      </div>
      <div className="mt-4">
        {/* This week's body map sits in the card's title line. */}
        <WeekCard week={week} stretch={stretch} cardio={cardio} figure={<MuscleMap store={store} />} live />
      </div>
    </div>
  )
}

// After clearing the week: a few seconds to take it back.
function UndoBar({ store }) {
  useEffect(() => {
    const t = setTimeout(store.dismissUndo, 8000)
    return () => clearTimeout(t)
  }, [store.dismissUndo])
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 px-4" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto rounded-2xl bg-stone-900 shadow-lg pl-4 pr-2 py-2 flex items-center gap-3">
        <p className="flex-1 text-sm text-white">Week cleared and saved to Past weeks</p>
        <button onClick={store.undoReset} className="px-3.5 h-9 rounded-xl bg-white text-stone-900 text-sm font-semibold active:bg-stone-200">
          Undo
        </button>
      </div>
    </div>
  )
}

// Sun in dark mode (tap for light), moon in light mode (tap for dark).
function ThemeButton() {
  const { dark, toggle } = useTheme()
  return (
    <HeaderBtn onClick={toggle} label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
        </svg>
      )}
    </HeaderBtn>
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

// The weekly check-in: back up, then start a fresh week. Restore lives here
// too, so it's always reachable from the header.
function WeekSheet({ store, onClose }) {
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [pending, setPending] = useState(null) // a backup waiting for confirm
  const fileInput = useRef(null)
  const age = backupAge(store.lastBackupAt)

  async function backUp() {
    const saved = await shareBackup(store.exportData())
    if (saved) {
      store.markBackedUp()
      setStatus({ kind: 'ok', text: 'Backup saved.' })
    }
  }

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending(await readBackup(file))
      setStatus(null)
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  function restore() {
    store.restoreData(pending.data, pending.exportedAt)
    setPending(null)
    setStatus({ kind: 'ok', text: 'Restored.' })
  }

  const btn = 'w-full py-3 rounded-xl text-sm font-semibold transition-colors'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        {pending ? (
          <>
            <h3 className="text-stone-900 font-bold text-lg mb-1">Restore this backup?</h3>
            <p className="text-stone-500 text-sm mb-5 leading-relaxed">
              From {new Date(pending.exportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              It replaces everything in the app now — weights, reps, settings and this week&rsquo;s progress.
            </p>
            <div className="space-y-2">
              <button onClick={restore} className={`${btn} bg-stone-900 text-white active:bg-stone-700`}>Restore</button>
              <button onClick={() => setPending(null)} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-stone-900 font-bold text-lg mb-1">Start a new week?</h3>
            <p className="text-stone-500 text-sm mb-4 leading-relaxed">
              Unticks every set and stretch, and sets your class, walk and rest counts back to zero. Your weights, reps and settings stay as they are.
            </p>

            <div className="rounded-2xl bg-accent-50 px-3.5 py-3 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Back up first</p>
                  <p className="text-xs text-stone-500">{age ? `Last backed up ${age}` : 'Not backed up yet'} · {usesShareSheet ? 'save to Files › iCloud Drive' : 'downloads to this computer'}</p>
                </div>
                <button onClick={backUp} className="px-3.5 h-9 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 shrink-0">
                  Back up
                </button>
              </div>
            </div>

            {status && (
              <p className={`text-sm mb-3 ${status.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{status.text}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { store.resetChecks(); onClose() }}
                disabled={!store.hasChecks}
                className="flex-1 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold active:bg-stone-700 transition-colors disabled:opacity-40"
              >
                Clear this week
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold active:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>

            <button onClick={() => fileInput.current?.click()} className="w-full mt-4 text-xs font-medium text-accent-500 active:opacity-60">
              Restore from a backup…
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
          </>
        )}
      </div>
    </div>
  )
}
