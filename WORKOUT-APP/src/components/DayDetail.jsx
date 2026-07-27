import { useState } from 'react'
import StretchTimer from './StretchTimer'
import { getTargetReps } from '../utils/progression'
import { BAR_MIN, BAR_MAX, BAR_STEP } from '../data/workout'

const fmt = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// Seconds → "6m 30s" / "6m" / "45s"
function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

export default function DayDetail({ day, dayData, store, onBack }) {
  const [activeStretch, setActiveStretch] = useState(null)
  const [activeTimed, setActiveTimed] = useState(null)
  const [tab, setTab] = useState('exercises')

  const exerciseDone = dayData.exercises.filter(e => store.getChecked(day, 'exercises', e.id)).length
  const stretchDone = dayData.stretches.filter(s => store.getChecked(day, 'stretches', s.id)).length

  // Total stretching time for the day: each stretch's configured duration,
  // counting per-side stretches twice (you hold each side).
  const totalStretchSeconds = dayData.stretches.reduce(
    (sum, s) => sum + store.getCustomDuration(s.id, s.duration) * (store.getPerSide(s.id, s.perSide) ? 2 : 1),
    0,
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-orange-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Schedule</span>
        </button>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{dayData.label}</h1>
        <p className="text-stone-400 text-sm mt-1">{dayData.name}</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-3 bg-stone-50">
        <div className="bg-stone-100 rounded-xl p-1 flex">
          <TabBtn active={tab === 'exercises'} onClick={() => setTab('exercises')}>
            Exercises {exerciseDone > 0 && <span className="ml-1 text-orange-500">({exerciseDone}/{dayData.exercises.length})</span>}
          </TabBtn>
          <TabBtn active={tab === 'stretches'} onClick={() => setTab('stretches')}>
            Stretches {stretchDone > 0 && <span className="ml-1 text-orange-500">({stretchDone}/{dayData.stretches.length})</span>}
          </TabBtn>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
        {tab === 'exercises' && dayData.exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            store={store}
            checked={store.getChecked(day, 'exercises', exercise.id)}
            onToggle={() => store.toggleChecked(day, 'exercises', exercise.id)}
            onTimer={exercise.isTime ? () => setActiveTimed({
              ...exercise,
              durationSeconds: store.getCustomDuration(exercise.id, exercise.durationSeconds),
            }) : null}
          />
        ))}

        {tab === 'stretches' && (
          <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-sm font-medium text-stone-600">Total stretching time</span>
            </div>
            <span className="text-orange-600 font-bold">{fmtDuration(totalStretchSeconds)}</span>
          </div>
        )}

        {tab === 'stretches' && dayData.stretches.map(stretch => (
          <StretchCard
            key={stretch.id}
            stretch={stretch}
            checked={store.getChecked(day, 'stretches', stretch.id)}
            onToggle={() => store.toggleChecked(day, 'stretches', stretch.id)}
            customDuration={store.getCustomDuration(stretch.id, stretch.duration)}
            onDurationChange={(s) => store.setCustomDuration(stretch.id, s)}
            perSide={store.getPerSide(stretch.id, stretch.perSide)}
            onPerSideChange={(v) => store.setPerSide(stretch.id, v)}
            onTimer={() => setActiveStretch({
              ...stretch,
              duration: store.getCustomDuration(stretch.id, stretch.duration),
              perSide: store.getPerSide(stretch.id, stretch.perSide),
            })}
          />
        ))}
      </div>

      {/* Reset button */}
      <div className="px-5 pb-6 pt-2 bg-stone-50">
        <button
          onClick={() => store.clearDay(day)}
          className="w-full py-3 rounded-xl text-stone-400 text-sm active:text-stone-600 transition-colors"
        >
          Reset day
        </button>
      </div>

      {activeStretch && (
        <StretchTimer
          stretch={activeStretch}
          onClose={() => {
            store.toggleChecked(day, 'stretches', activeStretch.id)
            setActiveStretch(null)
          }}
        />
      )}

      {activeTimed && (
        <StretchTimer
          stretch={{ name: activeTimed.name, duration: activeTimed.durationSeconds, perSide: false }}
          onClose={() => setActiveTimed(null)}
        />
      )}
    </div>
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

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  const dec = () => onChange(clamp(value - step))
  const inc = () => onChange(clamp(value + step))

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
          onClick={dec}
          className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-100 transition-colors"
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
          onClick={inc}
          className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-100 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── Exercise card ────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, store, checked, onToggle, onTimer }) {
  const [showSettings, setShowSettings] = useState(false)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationDraft, setDurationDraft] = useState('')

  const target = getTargetReps(exercise.reps, store.currentWeek)

  const w = exercise.weight ?? { bar: 0, value: 0 }
  const bar = store.getBar(exercise.id, w.bar)
  const value = store.getValue(exercise.id, w.value)
  const assist = store.getAssist(exercise.id, w.assist ?? false)
  const perSide = bar > 0 ? (value - bar) / 2 : null

  // Collapsed summary of the weight setup
  let summary
  if (value === 0 && bar === 0) {
    summary = assist ? 'Assisted' : 'Bodyweight'
  } else {
    const wp = `${fmt(value)} lbs${bar > 0 ? ` · ${fmt(perSide)} lb/side` : ''}`
    summary = assist ? `Assisted · ${wp}` : wp
  }

  const customDuration = exercise.isTime
    ? store.getCustomDuration(exercise.id, exercise.durationSeconds)
    : null

  function startEditDuration() {
    setDurationDraft(String(customDuration))
    setEditingDuration(true)
  }

  function saveDuration() {
    setEditingDuration(false)
    const s = parseInt(durationDraft)
    if (!isNaN(s) && s > 0) store.setCustomDuration(exercise.id, s)
  }

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      checked ? 'bg-orange-50 border border-orange-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button onClick={onToggle} className="shrink-0 mt-0.5 active:scale-95 transition-transform">
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
          {/* Name + actions */}
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold leading-tight ${checked ? 'text-orange-500 line-through' : 'text-stone-900'}`}>
              {exercise.name}
              {exercise.perSide && <span className="text-stone-400 font-normal text-sm ml-1">(per side)</span>}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {onTimer && (
                <button
                  onClick={onTimer}
                  className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center active:bg-orange-200 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </button>
              )}
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

          {/* Sets × reps / duration */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {exercise.isTime ? (
              <div className="flex items-center gap-1.5">
                <span className="text-stone-400 text-sm">{exercise.sets} sets ×</span>
                {editingDuration ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={durationDraft}
                    onChange={e => setDurationDraft(e.target.value)}
                    onBlur={saveDuration}
                    onKeyDown={e => e.key === 'Enter' && saveDuration()}
                    autoFocus
                    className="w-14 text-sm bg-stone-100 rounded-lg px-2 py-0.5 text-stone-900 outline-none text-center"
                  />
                ) : (
                  <button onClick={startEditDuration} className="flex items-center gap-1 group">
                    <span className="text-stone-600 text-sm font-medium">{customDuration}s</span>
                    <span className="text-stone-300 group-active:text-stone-500"><PencilIcon /></span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-stone-400 text-sm">{exercise.sets} sets × {exercise.reps}</p>
                {target != null && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-medium">
                    → {target} this week
                  </span>
                )}
              </>
            )}
          </div>

          {/* Weight summary (tap to open settings) */}
          <button
            onClick={() => setShowSettings(v => !v)}
            className="mt-1.5 text-left active:opacity-60"
          >
            <span className={`text-sm font-medium ${assist ? 'text-stone-400' : 'text-stone-600'}`}>
              {summary}
            </span>
          </button>

          {/* Settings menu */}
          {showSettings && (
            <div className="mt-2.5 rounded-xl bg-stone-50 p-3.5 space-y-3">
              <StepperRow
                label="Bar"
                value={bar}
                step={BAR_STEP}
                min={BAR_MIN}
                max={BAR_MAX}
                onChange={(v) => store.setBar(exercise.id, v)}
              />
              <StepperRow
                label="Weight"
                value={value}
                step={1}
                min={0}
                editable
                onChange={(v) => store.setValue(exercise.id, v)}
              />
              {bar > 0 && (
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
      </div>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
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
