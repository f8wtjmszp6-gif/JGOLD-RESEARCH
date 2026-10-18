import { useRef, useState } from 'react'
import { useDragToClose } from '../hooks/useDragToClose'
import { GOAL_SETTINGS } from '../data/workout'
import { Segmented, StepperRow } from './ui/controls'
import { shareBackup, readBackup, backupAge, usesShareSheet } from '../utils/backup'
import { playBeep, setVolume } from '../utils/sound'

// App settings, full screen, sliding in from the right (and swiping back out
// to close): your weekly goals (with what the guidelines recommend), timers,
// backups and reset, each a row that opens in place with what it's set to
// underneath. Light or dark follows the phone.
export default function SettingsDrawer({ store, onClose }) {
  const panel = useRef(null)
  const { offset, dragging, fade } = useDragToClose(panel, onClose, 'x')
  // One section open at a time; tap it again to close it.
  const [open, setOpen] = useState(null)
  const toggle = id => setOpen(o => (o === id ? null : id))
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

          <div className="space-y-3">
            <Section id="goals" title="Weekly goals" summary={goalsSummary(store.goals)} tile="bg-green-600" icon={ICONS.goals} open={open} onToggle={toggle}>
              <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
                {GOAL_SETTINGS.map(g => (
                  <GoalSetting key={g.id} setting={g} goal={store.goals[g.id]} onChange={patch => store.setGoal(g.id, patch)} />
                ))}
              </div>
            </Section>
            <Section id="timers" title="Timers" summary={timerSummary(store.timer)} tile="bg-amber-500" icon={ICONS.timers} open={open} onToggle={toggle}>
              <TimerSettings timer={store.timer} onChange={store.setTimer} />
            </Section>
            <Section id="backup" title="Backup" summary={backupSummary(store.lastBackupAt)} tile="bg-blue-600" icon={ICONS.backup} open={open} onToggle={toggle}>
              <Backup store={store} />
            </Section>
            <Section id="reset" title="Reset the app" red tile="bg-stone-500" icon={ICONS.reset} open={open} onToggle={toggle}>
              <FactoryReset store={store} />
            </Section>
          </div>
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
      {/* How loud the beeps are; Test plays the finish beep at that level. */}
      <div className="pt-3 border-t border-stone-200/70 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="timer-volume" className="text-base text-stone-600">Volume</label>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-stone-900 tabular-nums w-11 text-right">{timer.volume === 0 ? 'Off' : `${timer.volume}%`}</span>
            <button
              onClick={() => { setVolume(timer.volume / 100); playBeep() }}
              className="px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-accent-500 shadow-sm active:bg-stone-100"
            >
              Test
            </button>
          </div>
        </div>
        <input
          id="timer-volume"
          type="range"
          min="0"
          max="100"
          step="5"
          value={timer.volume}
          onChange={e => onChange({ volume: Number(e.target.value) })}
          className="w-full accent-accent-500"
        />
        <p className="text-xs text-stone-500 leading-relaxed">On top of your phone’s volume, so turn the phone up too if it’s quiet.</p>
      </div>
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

// A section's row: its icon, its name, and while it's closed what it's set
// to. Tap to open its settings underneath.
function Section({ id, title, summary, tile, icon, red, open, onToggle, children }) {
  const shown = open === id
  return (
    <section className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
      <button onClick={() => onToggle(id)} aria-expanded={shown} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-stone-50">
        <span className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0 ${tile}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-base font-medium ${red ? 'text-red-600' : 'text-stone-900'}`}>{title}</span>
          {!shown && summary && <span className={`block text-[13px] leading-snug ${summary.warn ? 'text-amber-700' : 'text-stone-400'}`}>{summary.text}</span>}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-stone-300 shrink-0 transition-transform ${shown ? 'rotate-90' : ''}`} aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {shown && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </section>
  )
}

const ICONS = {
  goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  timers: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M10 2h4" /></>,
  backup: <><path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" /><path d="M12 11v6M9.5 13.5 12 11l2.5 2.5" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></>,
}

// What each section is set to, for its closed row.
const range = (g, unit) => `${g.min === g.max ? g.min : `${g.min}–${g.max}`} ${unit}`
const goalsSummary = goals => ({ text: [range(goals.workouts, 'workouts'), range(goals.stretch, 'stretches'), range(goals.cardio, 'min')].join(' · ') })
const timerSummary = t => ({ text: [t.sound === 'music' ? 'Over music' : 'On silent', t.volume === 0 ? 'Muted' : `${t.volume}%`, t.prep === 0 ? 'No get-ready' : `${t.prep} s get-ready`].join(' · ') })
// Amber once it's been a week or more, or never.
function backupSummary(at) {
  if (!at) return { text: 'Never backed up', warn: true }
  const days = (Date.now() - new Date(at).getTime()) / 86400000
  return { text: `Last backup ${backupAge(at)}`, warn: days >= 7 }
}

// One goal on one line: its range with − and +, which move both ends
// together (3–4 becomes 4–5). Tap the range to set the min and max apart.
// What the guidelines recommend is written underneath.
function GoalSetting({ setting, goal, onChange }) {
  const { label, step, least, advice } = setting
  const [apart, setApart] = useState(false)
  const shift = d => {
    if (goal.min + d < least) return
    onChange({ min: goal.min + d, max: goal.max + d })
  }
  const btn = 'w-9 h-9 rounded-xl bg-white flex items-center justify-center text-stone-600 text-lg font-medium shadow-sm active:bg-stone-100 shrink-0 disabled:opacity-30'
  return (
    <div className="py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 text-base text-stone-700 whitespace-nowrap">{label}{setting.id === 'cardio' && ' min'}</p>
        <button onClick={() => shift(-step)} disabled={goal.min - step < least} className={btn} aria-label={`${label} down`}>−</button>
        <button onClick={() => setApart(!apart)} aria-expanded={apart} aria-label={`${label}: ${goal.min} to ${goal.max}. Set min and max`} className="min-w-[4.5rem] text-center text-lg font-bold text-stone-900 tabular-nums active:opacity-60">
          {goal.min === goal.max ? goal.min : `${goal.min}–${goal.max}`}
        </button>
        <button onClick={() => shift(step)} className={btn} aria-label={`${label} up`}>+</button>
      </div>
      {apart && (
        <div className="grid grid-cols-2 gap-3 pb-1">
          <SmallStepper label="Min" value={goal.min} step={step} least={least} onChange={min => onChange({ min })} />
          <SmallStepper label="Max" value={goal.max} step={step} least={least} onChange={max => onChange({ max })} />
        </div>
      )}
      <p className="text-xs text-stone-500 leading-relaxed">{advice}</p>
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
