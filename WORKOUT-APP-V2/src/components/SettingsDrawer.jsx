import { useRef, useState } from 'react'
import { useDragToClose } from '../hooks/useDragToClose'
import { GOAL_SETTINGS } from '../data/workout'
import { Segmented, StepperRow } from './WorkoutDetail'
import { shareBackup, readBackup, backupAge, usesShareSheet } from '../utils/backup'

// App settings, full screen, sliding in from the right (and swiping back out
// to close): your weekly goals (with what the guidelines recommend), timers,
// backups and reset. Light or dark follows the phone.
export default function SettingsDrawer({ store, onClose }) {
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
        className="absolute inset-0 bg-white overflow-y-auto overscroll-contain touch-pan-y animate-[drawer-in_240ms_ease-out]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <div className="px-5 pb-8 space-y-6">
          {/* The title stays at the top while the settings scroll under it. */}
          <div
            className="sticky top-0 z-10 bg-white -mx-5 px-5 pb-3 flex items-center justify-between"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
          >
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Settings</h2>
            <button onClick={onClose} className="text-accent-500 font-semibold active:opacity-60">Done</button>
          </div>

          <Section title="Weekly goals">
            {GOAL_SETTINGS.map(g => (
              <GoalSetting key={g.id} setting={g} goal={store.goals[g.id]} onChange={patch => store.setGoal(g.id, patch)} />
            ))}
          </Section>

          <Section title="Timers">
            <TimerSettings timer={store.timer} onChange={store.setTimer} />
          </Section>

          <Section title="Backup">
            <Backup store={store} />
          </Section>

          <Section title="Reset">
            <FactoryReset store={store} />
          </Section>
        </div>
      </aside>
    </div>
  )
}

// How timer beeps play, and the count-in before a hold or stretch.
const SOUND_NOTES = {
  music: 'Beeps play over your music or podcast. With the ringer switch on silent they only play through headphones.',
  silent: 'Beeps play even with the ringer switch on silent, but not while music is playing.',
}
function TimerSettings({ timer, onChange }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3 space-y-3">
      <Segmented
        label="Sound"
        value={timer.sound}
        options={[['music', 'Over music'], ['silent', 'On silent']]}
        onChange={sound => onChange({ sound })}
      />
      <p className="text-xs text-stone-500 leading-relaxed">{SOUND_NOTES[timer.sound]}</p>
      <div className="pt-3 border-t border-stone-200/70 space-y-2">
        <StepperRow
          label="Get-ready time"
          value={timer.prep}
          step={1}
          min={0}
          max={15}
          editable
          format={v => (v === 0 ? 'Off' : `${v}s`)}
          onChange={v => onChange({ prep: Math.round(v) })}
        />
        <p className="text-xs text-stone-500 leading-relaxed">A countdown before a hold or stretch starts, and before each side and set, so you can get into position.</p>
      </div>
    </div>
  )
}

// Starts the app fresh: plans back to how they came, everything logged
// cleared. Asks first, since only a backup file can bring it back.
function FactoryReset({ store }) {
  const [asking, setAsking] = useState(false)
  const btn = 'w-full py-3 rounded-xl text-sm font-semibold transition-colors'
  if (!asking) {
    return (
      <div className="rounded-2xl bg-stone-50 px-4 py-3 space-y-3">
        <p className="text-xs text-stone-400">Puts every plan back to how the app came and clears everything you’ve logged.</p>
        <button onClick={() => setAsking(true)} className={`${btn} bg-red-50 text-red-600 active:bg-red-100`}>Reset app…</button>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-red-50 px-4 py-4 space-y-3">
      <p className="font-semibold text-stone-900">Reset the app?</p>
      <p className="text-sm text-stone-600 leading-relaxed">
        Your plans go back to their original exercises, sets, reps and weights, and goals and timers to their defaults.
        Every week you’ve logged, with all its ticks, classes, walks and stretches, is deleted.
        {store.lastBackupAt ? ' Only a backup file can bring them back.' : ' You’ve never backed up, so this can’t be undone.'}
      </p>
      <button onClick={store.factoryReset} className={`${btn} bg-red-600 text-white active:bg-red-700`}>Reset app</button>
      <button onClick={() => setAsking(false)} className={`${btn} bg-white text-stone-600 active:bg-stone-100`}>Cancel</button>
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
      <p className="text-xs text-stone-400 -mt-2">{usesShareSheet ? 'Save to the same Files folder each time and tap Replace.' : 'Downloads to this computer.'}</p>
      <button onClick={backUp} className={`${btn} bg-accent-500 text-white active:bg-accent-600`}>Back up now</button>
      <button onClick={() => fileInput.current?.click()} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>
        Restore from a backup…
      </button>
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
      {status && <p className={`text-sm ${status.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{status.text}</p>}
    </div>
  )
}
