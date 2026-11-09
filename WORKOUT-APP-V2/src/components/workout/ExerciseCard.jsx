import { useState } from 'react'
import { BAR_MIN, BAR_MAX, BAR_STEP } from '../../data/workout'
import { openDemo } from '../../data/howto'
import { fmt, fmtSecs, secsParts, stepTo, loadSummary } from '../../utils/format'
import { GearIcon, InfoIcon, CheckIcon, ClockIcon, Chevron, CloseButton } from '../ui/glyphs'
import { SettingsSheet } from '../ui/Sheet'
import { StepperRow, Segmented, ToggleRow } from '../ui/controls'
import { DragHandle } from '../ui/DragHandle'
import { EquipmentPicker, LoadHero } from './LoadHero'

// Whether these settings get a chart in Trends: only reps with weight on
// them, not assisted (see Trends), and if not, why.
function TrendsNote({ hold, assist, weight }) {
  const why = hold ? 'Timed sets aren’t tracked in Trends' : assist ? 'Assisted sets aren’t tracked in Trends' : weight > 0 ? null : 'Add weight to track it in Trends'
  return (
    <p className={`flex items-center justify-center gap-1.5 text-sm ${why ? 'text-stone-400' : 'font-medium text-emerald-700'}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
      {why ?? 'Tracked in Trends'}
    </p>
  )
}

// ── One set: remembered reps (or seconds) plus this round's tick ────────────
// A hold's seconds go up and down 5 at a time, never under 5, and it has
// its own timer (onTimer) before the tick.
function SetRow({ index, value, done, hold, onChange, onToggle, onTimer }) {
  const step = hold ? 5 : 1, least = hold ? 5 : 0
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function save() {
    setEditing(false)
    const n = parseInt(draft)
    if (!isNaN(n) && n >= least) onChange(n)
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
      done ? 'bg-accent-100/70' : 'bg-stone-50'
    }`}>
      <span className={`text-xs font-semibold w-4 shrink-0 ${done ? 'text-accent-500' : 'text-stone-400'}`}>
        {index + 1}
      </span>

      <button
        onClick={() => onChange(Math.max(least, value - step))}
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
          <span className="text-base font-bold text-stone-900">{hold ? secsParts(value)[0] : value}</span>
          <span className="text-xs font-medium text-stone-400">{hold ? secsParts(value)[1] : ' reps'}</span>
        </button>
      )}

      <button
        onClick={() => onChange(value + step)}
        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 transition-colors shrink-0"
      >
        +
      </button>

      {onTimer && (
        <button
          onClick={onTimer}
          aria-label={`Time set ${index + 1}, ${value} seconds`}
          className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center active:bg-accent-200 transition-colors shrink-0"
        >
          <ClockIcon size={15} />
        </button>
      )}

      <button onClick={onToggle} aria-label={`${done ? 'Untick' : 'Tick'} set ${index + 1}`} className="shrink-0 active:scale-95 transition-transform ml-0.5">
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'border-accent-500 bg-accent-500' : 'border-stone-200 bg-white'
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
// Open, it's the full card with its sets; ⌃ or its name closes it. Folded,
// it's one line ending in ⌄: finished exercises tinted with a tick, the rest
// with a dot per set. Tap to open. `tag`: by its name, when it's in just
// for this week.
export function ExerciseCard({ exercise, workoutId, store, grip, open, onOpen, onClose, onTimer, onSetDone, tag }) {
  const [showSettings, setShowSettings] = useState(false)

  const log = store.getLog(workoutId, exercise)
  const equipment = store.getEquipment(exercise)
  const assist = equipment === 'assisted'
  const setup = store.getSetup(exercise)
  const hold = setup.mode === 'hold'

  // Done means every set, split cards included.
  const allDone = log.all.every(x => x.done)
  const mainDone = log.sets.every(x => x.done)
  const someDone = log.sets.some(x => x.done)
  // A split starts one step lighter (more help, when assisted).
  // (Never under the bar.)
  const lighter = w => Math.max(equipment === 'barbell' ? log.bar : 0, stepTo(w, equipment === 'barbell' ? 5 : 2.5, assist ? 1 : -1))
  const tickSet = (set, toggle) => {
    toggle()
    if (!set.done) onSetDone(log.all.filter(x => !x.done && x !== set).length)
  }

  const summary = loadSummary(equipment, log)

  if (!open && !allDone) {
    return (
      <div className="flex items-center rounded-2xl bg-white shadow-sm">
        <DragHandle name={exercise.name} {...grip} />
        <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 pr-4 py-3 text-left active:opacity-70">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-stone-900 leading-snug">{exercise.name}{tag}</span>
          </span>
          <span className="flex gap-1 shrink-0" role="img" aria-label={`${log.all.filter(x => x.done).length} of ${log.all.length} sets done`}>
            {log.all.map((x, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${x.done ? 'bg-accent-500' : 'bg-stone-200'}`} />
            ))}
          </span>
          <Chevron />
        </button>
      </div>
    )
  }

  if (!open) {
    // Done: its name and every dot filled, like an unfinished row.
    return (
      <div className="flex items-center rounded-2xl bg-accent-50 border border-accent-200">
        <DragHandle name={exercise.name} {...grip} />
        <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 pr-4 py-3 text-left active:opacity-70">
          <span className="min-w-0 flex-1 block font-semibold text-accent-600 leading-snug">{exercise.name}{tag}</span>
          <span className="flex gap-1 shrink-0" role="img" aria-label={`All ${log.all.length} sets done`}>
            {log.all.map((_, i) => <span key={i} className="w-2 h-2 rounded-full bg-accent-500" />)}
          </span>
          <Chevron />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
    <div className={`rounded-2xl p-4 transition-all ${
      allDone ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'
    }`}>
      {/* Name with its buttons; under it the weight, per side and rest. */}
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="flex-1 min-w-0 text-left active:opacity-70">
          <p className={`font-semibold leading-tight ${allDone ? 'text-accent-500' : 'text-stone-900'}`}>
            {exercise.name}
            {tag}
          </p>
        </button>
        {/* How-to, settings and ticking every set, then collapse. */}
        <div className="flex items-center gap-1 shrink-0">
          <IconBtn label={`How to do ${exercise.name}`} onClick={() => openDemo(exercise.name, 'exercise')}><InfoIcon size={14} /></IconBtn>
          <IconBtn label={`${exercise.name} settings`} onClick={() => setShowSettings(true)}><GearIcon size={14} /></IconBtn>
          <IconBtn
            label={allDone ? 'Untick all sets' : 'Mark all sets done'}
            on={allDone}
            onClick={() => { store.toggleExercise(workoutId, exercise); if (!allDone) onClose() }}
          >
            <CheckIcon size={14} />
          </IconBtn>
          <CloseButton small label={exercise.name} onClick={onClose} />
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className={`min-w-0 text-sm font-medium ${assist ? 'text-stone-400' : 'text-stone-600'}`}>
          {[summary, setup.perSide && 'Per side', setup.restOn && `Rest ${fmtSecs(setup.rest)}`].filter(Boolean).join(' · ')}
        </p>
      </div>


      {/* Sets */}
      <div className="mt-2.5 space-y-1.5">
        {log.sets.map((set, i) => (
          <SetRow
            key={set.index}
            index={i}
            value={set.reps}
            done={set.done}
            hold={hold}
            onChange={reps => store.setSetReps(exercise, set.index, reps)}
            onToggle={() => tickSet(set, () => store.toggleSet(workoutId, exercise, set.index))}
            onTimer={onTimer && (() => onTimer(set))}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => store.addSet(exercise)}
          className="text-xs font-semibold text-accent-500 active:opacity-60"
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
        {/* Once some sets are ticked, the rest can move to a lighter card. */}
        {someDone && !mainDone && (
          <SplitButton onClick={() => store.splitSets(workoutId, exercise, -1, lighter(log.weight))} />
        )}
        {someDone && !mainDone && (
          <span className="text-xs text-stone-400 ml-auto">
            {log.sets.filter(x => x.done).length}/{log.sets.length} done
          </span>
        )}
      </div>

      {showSettings && (
        <SettingsSheet title={exercise.name} tall onClose={() => setShowSettings(false)}>
          {/* How the sets go: reps or timed, per side, and the rest between them. */}
          <div className="rounded-2xl bg-stone-50 divide-y divide-stone-200/70 overflow-hidden">
            <div className="px-4 py-2.5">
              <Segmented
                label="Sets are"
                value={setup.mode}
                options={[['reps', 'Reps'], ['hold', 'Timed']]}
                onChange={mode => store.setSetup(exercise, { mode })}
              />
            </div>
            <div className="px-4 py-3">
              <ToggleRow
                label="Per side"
                detail={hold ? 'Hold each side — the timer runs twice' : 'Do the reps on each side'}
                on={setup.perSide}
                onChange={perSide => store.setSetup(exercise, { perSide })}
              />
            </div>
            <div className="px-4 py-3">
              <ToggleRow
                label="Rest between sets"
                detail="A timer after each set"
                on={setup.restOn}
                onChange={restOn => store.setSetup(exercise, { restOn })}
              />
            </div>
            {setup.restOn && (
              <div className="px-4 py-2.5">
                <StepperRow
                  label="Rest length"
                  value={setup.rest}
                  step={15}
                  min={15}
                  seconds
                  onChange={rest => store.setSetup(exercise, { rest })}
                />
              </div>
            )}
          </div>
          <TrendsNote hold={hold} assist={assist} weight={log.weight} />
          <EquipmentPicker value={equipment} onChange={v => store.setEquipment(exercise, v)} />
          <LoadHero equipment={equipment} weight={log.weight} bar={log.bar} onChange={v => store.setWeight(exercise, v)} />
          {/* A barbell's own weight. */}
          {equipment === 'barbell' && (
            <div className="rounded-2xl bg-stone-50 px-4 py-2.5">
              <StepperRow
                label="Bar"
                value={log.bar}
                step={BAR_STEP}
                min={BAR_MIN}
                max={BAR_MAX}
                editable
                suffix=" lbs"
                onChange={v => store.setBar(exercise, v)}
              />
            </div>
          )}
        </SettingsSheet>
      )}
    </div>

      {log.parts.map((p, j) => (
        <SplitCard
          key={j}
          name={exercise.name}
          first={log.sets.length + log.parts.slice(0, j).reduce((n, q) => n + q.sets.length, 0)}
          part={p}
          equipment={equipment}
          bar={log.bar}
          hold={hold}
          onTimer={onTimer}
          onWeight={w => store.setPartWeight(workoutId, exercise, j, w)}
          onReps={(i, reps) => store.setPartReps(workoutId, exercise, j, i, reps)}
          onToggle={set => tickSet(set, () => store.togglePartSet(workoutId, exercise, j, set.index))}
          onAdd={() => store.addPartSet(workoutId, exercise, j)}
          onRemove={() => store.removePartSet(workoutId, exercise, j)}
          onSplit={() => store.splitSets(workoutId, exercise, j, lighter(p.weight))}
          onClose={() => store.unsplit(workoutId, exercise, j)}
        />
      ))}
    </div>
  )
}

function SplitButton({ label = 'Split', onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-orange-600 active:opacity-60">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v6a6 6 0 0 0 6 6h0a6 6 0 0 1 6 6M6 21V3" />
      </svg>
      {label}
    </button>
  )
}

// A split card: this week's lighter sets of an exercise, under its main card.
// Its weight is its own; everything else follows the exercise's settings.
// `first` is how many sets come before it, so its sets carry on the count.
function SplitCard({ name, first, part, equipment, bar, hold, onTimer, onWeight, onReps, onToggle, onAdd, onRemove, onSplit, onClose }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const step = equipment === 'barbell' ? 5 : 2.5
  // A barbell never weighs less than the bar on it.
  const least = equipment === 'barbell' ? bar : 0
  const setWeight = v => onWeight(Math.max(least, v))
  const unit = { dumbbell: 'lbs each', assisted: 'lbs help' }[equipment] ?? 'lbs'
  const done = part.sets.filter(x => x.done).length
  const all = done === part.sets.length

  function save() {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0) setWeight(Math.round(n * 100) / 100)
  }

  const btn = 'w-9 h-9 rounded-xl bg-white flex items-center justify-center text-stone-600 text-lg font-medium shadow-sm active:bg-stone-100'
  return (
    <div className="relative ml-3">
      {/* The elbow joining it to the card above. */}
      <span className="absolute -left-3 -top-2 w-2.5 h-8 border-l-2 border-b-2 border-orange-200 rounded-bl-lg" aria-hidden="true" />
      <div className={`rounded-2xl p-4 border-[1.5px] ${all ? 'bg-accent-50 border-accent-200' : 'bg-white border-orange-200'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-stone-900">
              {name}
              <span className="ml-1.5 align-[2px] text-[10.5px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-md">Split</span>
            </p>
            <p className="mt-1 text-sm text-stone-500">
              This week only{equipment === 'barbell' && bar > 0 && part.weight > bar ? ` · ${fmt((part.weight - bar) / 2)} lb/side` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label={`Remove this split of ${name}`} className="w-10 h-10 shrink-0 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200">✕</button>
        </div>

        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-orange-50 px-2 py-1.5">
          <button onClick={() => setWeight(stepTo(part.weight, step, -1))} disabled={part.weight <= least} className={`${btn} disabled:opacity-30`} aria-label="Less weight">−</button>
          {editing ? (
            <input
              type="number"
              inputMode="decimal"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              autoFocus
              className="w-24 text-center text-xl font-bold bg-white rounded-lg py-0.5 text-stone-900 outline-none"
            />
          ) : (
            <button onClick={() => { setDraft(String(part.weight)); setEditing(true) }} className="text-center active:opacity-60">
              <span className="text-xl font-bold text-orange-700">{equipment === 'bodyweight' ? '+' : ''}{fmt(part.weight)}</span>
              <span className="ml-1 text-xs font-medium text-stone-400">{unit}</span>
            </button>
          )}
          <button onClick={() => setWeight(stepTo(part.weight, step, 1))} className={btn} aria-label="More weight">+</button>
        </div>

        <div className="mt-2 space-y-1.5">
          {part.sets.map(set => (
            <SetRow
              key={set.index}
              index={first + set.index}
              value={set.reps}
              done={set.done}
              hold={hold}
              onChange={reps => onReps(set.index, reps)}
              onToggle={() => onToggle(set)}
              onTimer={onTimer && (() => onTimer(set))}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button onClick={onAdd} className="text-xs font-semibold text-accent-500 active:opacity-60">+ Add set</button>
          {part.sets.length > 1 && (
            <button onClick={onRemove} className="text-xs font-medium text-stone-400 active:text-stone-600">− Remove set</button>
          )}
          {done > 0 && !all && <SplitButton label="Split again" onClick={onSplit} />}
          {done > 0 && !all && <span className="text-xs text-stone-400 ml-auto">{done}/{part.sets.length} done</span>}
        </div>
      </div>
    </div>
  )
}

// A small square icon button for the open card's header.
function IconBtn({ label, on, onClick, children }) {
  return (
    <button onClick={onClick} aria-label={label}
      className={`w-7 h-7 rounded-md flex items-center justify-center active:bg-stone-200 transition-colors ${on ? 'bg-accent-100 text-accent-600' : 'bg-stone-100 text-stone-500'}`}>
      {children}
    </button>
  )
}
