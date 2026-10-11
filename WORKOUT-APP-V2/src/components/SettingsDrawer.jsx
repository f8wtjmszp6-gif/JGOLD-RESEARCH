import { useRef, useState } from 'react'
import { useDragToClose } from '../hooks/useDragToClose'
import { GOAL_SETTINGS } from '../data/workout'
import { Segmented } from './WorkoutDetail'
import { shareBackup, readBackup, backupAge, usesShareSheet } from '../utils/backup'

// App settings, in a panel that slides in from the right (and swipes back out
// to close): your weekly goals (with what the guidelines recommend), light
// or dark, and backups.
export default function SettingsDrawer({ store, theme, onClose }) {
  const panel = useRef(null)
  const { offset, dragging, fade } = useDragToClose(panel, onClose, 'x')
  return (
    // Dragging on the shade does nothing, and the panel's scroll stops at its
    // ends, so the page behind never moves.
    <div className="fixed inset-0 z-50 touch-none" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-[fade-in_200ms_ease-out]" style={{ opacity: fade }} />
      <aside
        ref={panel}
        role="dialog"
        aria-label="Settings"
        onClick={e => e.stopPropagation()}
        className="absolute top-0 right-0 bottom-0 w-[88%] max-w-sm bg-white shadow-xl overflow-y-auto overscroll-contain touch-pan-y animate-[drawer-in_240ms_ease-out]"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <div className="px-5 pt-5 pb-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Settings</h2>
            <button onClick={onClose} className="text-accent-500 font-semibold active:opacity-60">Done</button>
          </div>

          <Section title="Weekly goals">
            {GOAL_SETTINGS.map(g => (
              <GoalSetting key={g.id} setting={g} goal={store.goals[g.id]} onChange={patch => store.setGoal(g.id, patch)} />
            ))}
          </Section>

          <Section title="Appearance">
            <div className="rounded-2xl bg-stone-50 px-4 py-3">
              <Segmented
                label="Theme"
                value={theme.mode}
                options={[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']]}
                onChange={theme.setMode}
              />
            </div>
          </Section>

          <Section title="Backup">
            <Backup store={store} />
          </Section>
        </div>
      </aside>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium px-1">{title}</p>
      {children}
    </section>
  )
}

// One goal: its min and max. The ⓘ shows what the guidelines recommend.
function GoalSetting({ setting, goal, onChange }) {
  const { label, step, least, advice } = setting
  const [info, setInfo] = useState(false)
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-stone-900">{label}</p>
        <button
          onClick={() => setInfo(!info)}
          aria-label={`Recommended ${label.toLowerCase()}`}
          aria-expanded={info}
          className={`w-8 h-8 -mr-1.5 rounded-lg flex items-center justify-center active:bg-stone-100 ${info ? 'text-accent-500' : 'text-stone-400'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.6v.1" strokeWidth="2.4" /></svg>
        </button>
      </div>
      {info && <p className="text-xs text-stone-500 leading-relaxed">{advice}</p>}
      <div className="grid grid-cols-2 gap-3">
        <SmallStepper label="Min" value={goal.min} step={step} least={least} onChange={min => onChange({ min })} />
        <SmallStepper label="Max" value={goal.max} step={step} least={least} onChange={max => onChange({ max })} />
      </div>
    </div>
  )
}

// A compact − value + with its label above, so Min and Max fit side by side.
// Tap the number to type one.
function SmallStepper({ label, value, step, least, onChange }) {
  const [draft, setDraft] = useState(null)
  const set = v => onChange(Math.max(least, Math.round(v)))
  function save() {
    const n = parseFloat(draft)
    if (!isNaN(n)) set(n)
    setDraft(null)
  }
  const btn = 'w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 shrink-0'
  return (
    <div>
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <div className="flex items-center justify-between gap-1">
        <button onClick={() => set(value - step)} className={btn} aria-label={`${label} down`}>−</button>
        {draft !== null ? (
          <input
            type="number"
            inputMode="numeric"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="w-12 text-center text-lg font-bold bg-stone-100 rounded-lg py-0.5 text-stone-900 outline-none"
          />
        ) : (
          <button onClick={() => setDraft(String(value))} className="min-w-0 flex-1 text-center text-lg font-bold text-stone-900 active:opacity-60">
            {value}
          </button>
        )}
        <button onClick={() => set(value + step)} className={btn} aria-label={`${label} up`}>+</button>
      </div>
    </div>
  )
}

// When you last backed up, Back up now, and Restore (which asks first).
function Backup({ store }) {
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [pending, setPending] = useState(null) // a backup waiting for confirm
  const fileInput = useRef(null)
  const age = backupAge(store.lastBackupAt)

  async function backUp() {
    if (await shareBackup(store.exportData())) {
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
  if (pending) {
    return (
      <div className="rounded-2xl bg-stone-50 px-4 py-4 space-y-3">
        <p className="font-semibold text-stone-900">Restore this backup?</p>
        <p className="text-sm text-stone-500 leading-relaxed">
          From {new Date(pending.exportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          It replaces everything in the app now — weights, reps, settings and this week&rsquo;s progress.
        </p>
        <button onClick={restore} className={`${btn} bg-stone-900 text-white active:bg-stone-700`}>Restore</button>
        <button onClick={() => setPending(null)} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>Cancel</button>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-stone-600">Last backup</span>
        <span className="text-sm text-stone-400">{age ? age : 'Never'}</span>
      </div>
      <p className="text-xs text-stone-400 -mt-2">{usesShareSheet ? 'Save it to Files › iCloud Drive.' : 'Downloads to this computer.'}</p>
      <button onClick={backUp} className={`${btn} bg-accent-500 text-white active:bg-accent-600`}>Back up now</button>
      <button onClick={() => fileInput.current?.click()} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>
        Restore from a backup…
      </button>
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
      {status && <p className={`text-sm ${status.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{status.text}</p>}
    </div>
  )
}
