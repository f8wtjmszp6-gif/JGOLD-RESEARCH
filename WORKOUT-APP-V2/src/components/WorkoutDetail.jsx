import { useState } from 'react'
import StretchTimer from './StretchTimer'
import { workouts, BAR_MIN, BAR_MAX, BAR_STEP } from '../data/workout'

const fmt = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// Seconds → "6m 30s" / "6m" / "45s"
function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

export default function WorkoutDetail({ workoutId, store, onBack }) {
  const workout = workouts[workoutId]
  const [activeStretch, setActiveStretch] = useState(null)
  const [activeTimed, setActiveTimed] = useState(null)
  const [tab, setTab] = useState('exercises')

  const exerciseDone = workout.exercises.filter(e => store.getLog(workoutId, e).sets.every(x => x.done)).length
  const stretchDone = workout.stretches.filter(s => store.getStretchDone(workoutId, s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-orange-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Workouts</span>
        </button>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{workout.short}</h1>
        <p className="text-stone-400 text-sm mt-1">{workout.name}</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-3 bg-stone-50 shrink-0">
        <div className="bg-stone-100 rounded-xl p-1 flex">
          <TabBtn active={tab === 'exercises'} onClick={() => setTab('exercises')}>
            Exercises {exerciseDone > 0 && <span className="ml-1 text-orange-500">({exerciseDone}/{workout.exercises.length})</span>}
          </TabBtn>
          <TabBtn active={tab === 'stretches'} onClick={() => setTab('stretches')}>
            Stretches {stretchDone > 0 && <span className="ml-1 text-orange-500">({stretchDone}/{workout.stretches.length})</span>}
          </TabBtn>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        {tab === 'exercises' && workout.exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            workoutId={workoutId}
            store={store}
            onTimer={exercise.isTime ? () => {
              // Time the next hold you haven't ticked off yet.
              const sets = store.getLog(workoutId, exercise).sets
              const next = sets.find(x => !x.done) ?? sets[0]
              setActiveTimed({ name: exercise.name, duration: next.reps })
            } : null}
          />
        ))}

        {tab === 'stretches' && (
          <StretchesTab workout={workout} store={store} onTimer={setActiveStretch} />
        )}
      </div>

      {activeStretch && (
        <StretchTimer
          stretch={activeStretch}
          onClose={() => {
            if (!store.getStretchDone(workoutId, activeStretch.id)) {
              store.toggleStretch(workoutId, activeStretch.id)
            }
            setActiveStretch(null)
          }}
        />
      )}

      {activeTimed && (
        <StretchTimer
          stretch={{ name: activeTimed.name, duration: activeTimed.duration, perSide: false }}
          onClose={() => setActiveTimed(null)}
        />
      )}
    </div>
  )
}

function StretchesTab({ workout, store, onTimer }) {
  const totalStretchSeconds = workout.stretches.reduce(
    (sum, s) => sum + store.getCustomDuration(s.id, s.duration) * (store.getPerSide(s.id, s.perSide) ? 2 : 1),
    0,
  )

  return (
    <>
      <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClockIcon size={18} />
          <span className="text-sm font-medium text-stone-600">Total stretching time</span>
        </div>
        <span className="text-orange-600 font-bold">{fmtDuration(totalStretchSeconds)}</span>
      </div>

      {workout.stretches.map(stretch => (
        <StretchCard
          key={stretch.id}
          stretch={stretch}
          checked={store.getStretchDone(workout.id, stretch.id)}
          onToggle={() => store.toggleStretch(workout.id, stretch.id)}
          customDuration={store.getCustomDuration(stretch.id, stretch.duration)}
          onDurationChange={s => store.setCustomDuration(stretch.id, s)}
          perSide={store.getPerSide(stretch.id, stretch.perSide)}
          onPerSideChange={v => store.setPerSide(stretch.id, v)}
          onTimer={() => onTimer({
            ...stretch,
            duration: store.getCustomDuration(stretch.id, stretch.duration),
            perSide: store.getPerSide(stretch.id, stretch.perSide),
          })}
        />
      ))}
    </>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
      }`}
    >
      {children}
    </button>
  )
}

function ClockIcon({ size = 16, color = '#f97316' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ── A −/+ row used inside the settings menu ──────────────────────────────────
function StepperRow({ label, value, step, min = 0, max = Infinity, editable, suffix = '', onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const clamp = v => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  function save() {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(clamp(n))
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-500">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-100 transition-colors"
        >
          −
        </button>
        {editing ? (
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="w-14 text-center text-base font-bold bg-white rounded-lg px-1 py-1 text-stone-900 outline-none shadow-sm"
          />
        ) : (
          <button
            onClick={() => { if (editable) { setDraft(String(value)); setEditing(true) } }}
            className={`w-14 text-center text-base font-bold text-stone-900 ${editable ? 'active:opacity-60' : ''}`}
          >
            {fmt(value)}{suffix && <span className="text-xs font-medium text-stone-400">{suffix}</span>}
          </button>
        )}
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-100 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── One set: remembered reps (or seconds) plus this round's tick ────────────
function SetRow({ index, value, done, isTime, onChange, onToggle }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function save() {
    setEditing(false)
    const n = parseInt(draft)
    if (!isNaN(n) && n >= 0) onChange(n)
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
      done ? 'bg-orange-100/70' : 'bg-stone-50'
    }`}>
      <span className={`text-xs font-semibold w-4 shrink-0 ${done ? 'text-orange-500' : 'text-stone-400'}`}>
        {index + 1}
      </span>

      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 transition-colors shrink-0"
      >
        −
      </button>

      {editing ? (
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
          className="flex-1 min-w-0 text-center text-base font-bold bg-white rounded-lg px-1 py-0.5 text-stone-900 outline-none shadow-sm"
        />
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true) }}
          className="flex-1 text-center active:opacity-60"
        >
          <span className="text-base font-bold text-stone-900">{value}</span>
          <span className="text-xs font-medium text-stone-400">{isTime ? 's' : ' reps'}</span>
        </button>
      )}

      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 transition-colors shrink-0"
      >
        +
      </button>

      <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform ml-0.5">
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'border-orange-500 bg-orange-500' : 'border-stone-200 bg-white'
        }`}>
          {done && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>
    </div>
  )
}

// ── Exercise card ────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, workoutId, store, onTimer }) {
  const [showSettings, setShowSettings] = useState(false)

  const log = store.getLog(workoutId, exercise)
  const assist = store.getAssist(exercise.id, exercise.weight.assist ?? false)

  const allDone = log.sets.every(x => x.done)
  const someDone = log.sets.some(x => x.done)
  const perSide = log.bar > 0 ? (log.weight - log.bar) / 2 : null

  let summary
  if (log.weight === 0 && log.bar === 0) {
    summary = assist ? 'Assisted' : 'Bodyweight'
  } else {
    const wp = `${fmt(log.weight)} lbs${log.bar > 0 ? ` · ${fmt(perSide)} lb/side` : ''}`
    summary = assist ? `Assisted · ${wp}` : wp
  }

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      allDone ? 'bg-orange-50 border border-orange-200' : 'bg-white shadow-sm'
    }`}>
      {/* Name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold leading-tight ${allDone ? 'text-orange-500' : 'text-stone-900'}`}>
            {exercise.name}
            {exercise.perSide && <span className="text-stone-400 font-normal text-sm ml-1">(per side)</span>}
          </p>
          <button
            onClick={() => setShowSettings(v => !v)}
            className="mt-1 text-left active:opacity-60"
          >
            <span className={`text-sm font-medium ${assist ? 'text-stone-400' : 'text-stone-600'}`}>
              {summary}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onTimer && (
            <button
              onClick={onTimer}
              className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center active:bg-orange-200 transition-colors"
            >
              <ClockIcon />
            </button>
          )}
          <button
            onClick={() => store.toggleExercise(workoutId, exercise)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-xs font-bold ${
              allDone ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-400 active:bg-stone-200'
            }`}
            aria-label={allDone ? 'Untick all sets' : 'Tick all sets'}
          >
            {allDone ? '✓' : 'All'}
          </button>
          <button
            onClick={() => setShowSettings(v => !v)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              showSettings ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-400 active:bg-stone-200'
            }`}
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Program target, for reference — the set rows hold your own numbers */}
      <p className="text-xs text-stone-400 mt-1.5">
        Program target {exercise.sets} × {exercise.reps}
      </p>

      {/* Sets */}
      <div className="mt-2.5 space-y-1.5">
        {log.sets.map((set, i) => (
          <SetRow
            key={i}
            index={i}
            value={set.reps}
            done={set.done}
            isTime={exercise.isTime}
            onChange={reps => store.setSetReps(exercise, i, reps)}
            onToggle={() => store.toggleSet(workoutId, exercise, i)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => store.addSet(exercise)}
          className="text-xs font-semibold text-orange-500 active:opacity-60"
        >
          + Add set
        </button>
        {log.sets.length > 1 && (
          <button
            onClick={() => store.removeSet(exercise)}
            className="text-xs font-medium text-stone-400 active:text-stone-600"
          >
            − Remove set
          </button>
        )}
        {someDone && !allDone && (
          <span className="text-xs text-stone-400 ml-auto">
            {log.sets.filter(x => x.done).length}/{log.sets.length} done
          </span>
        )}
      </div>

      {/* Settings menu */}
      {showSettings && (
        <div className="mt-2.5 rounded-xl bg-stone-50 p-3.5 space-y-3">
          <StepperRow
            label="Bar"
            value={log.bar}
            step={BAR_STEP}
            min={BAR_MIN}
            max={BAR_MAX}
            onChange={v => store.setBar(exercise, v)}
          />
          <StepperRow
            label="Weight"
            value={log.weight}
            step={2.5}
            min={0}
            editable
            onChange={v => store.setWeight(exercise, v)}
          />
          {log.bar > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400">Plates per side</span>
              <span className="text-stone-600 font-semibold">
                {perSide > 0 ? `${fmt(perSide)} lb each side` : 'Empty bar'}
              </span>
            </div>
          )}
          <button
            onClick={() => store.setAssist(exercise.id, !assist)}
            className="flex items-center gap-2.5 w-full pt-0.5 active:opacity-70"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              assist ? 'border-orange-500 bg-orange-500' : 'border-stone-300'
            }`}>
              {assist && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-sm text-stone-600">Assist — not lifting the full load</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Stretch card ─────────────────────────────────────────────────────────────
function StretchCard({ stretch, checked, onToggle, onTimer, customDuration, onDurationChange, perSide, onPerSideChange }) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      checked ? 'bg-orange-50 border border-orange-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked ? 'border-orange-500 bg-orange-500' : 'border-stone-200'
          }`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${checked ? 'text-orange-500' : 'text-stone-900'}`}>{stretch.name}</p>
          <button onClick={() => setShowSettings(v => !v)} className="flex items-center mt-0.5 text-left active:opacity-60">
            <span className="text-stone-400 text-sm">{customDuration}s{perSide ? ' per side' : ''}</span>
            {stretch.alt && <span className="text-stone-300 text-sm ml-1">· Alt: {stretch.alt}</span>}
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(v => !v)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              showSettings ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-400 active:bg-stone-200'
            }`}
          >
            <GearIcon />
          </button>
          <button
            onClick={onTimer}
            className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center active:bg-orange-200 transition-colors"
          >
            <ClockIcon size={20} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-2.5 rounded-xl bg-stone-50 p-3.5 space-y-3">
          <StepperRow
            label="Duration"
            value={customDuration}
            step={5}
            min={5}
            editable
            suffix="s"
            onChange={onDurationChange}
          />
          <button
            onClick={() => onPerSideChange(!perSide)}
            className="flex items-center gap-2.5 w-full active:opacity-70"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              perSide ? 'border-orange-500 bg-orange-500' : 'border-stone-300'
            }`}>
              {perSide && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-sm text-stone-600">Per side — hold each side (counts 2×)</span>
          </button>
        </div>
      )}
    </div>
  )
}
