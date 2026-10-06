import { useEffect, useRef, useState } from 'react'
import { playBeep, playTick, unlockAudio } from '../utils/sound'
import { useCountdown, useWakeLock, fmtClock } from '../hooks/timing'
import { workouts, STRETCH_ROUTINE, BAR_MIN, BAR_MAX, BAR_STEP } from '../data/workout'

const fmt = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// Seconds → "6m 30s" / "6m" / "45s"
function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

let timerSeq = 0

export default function WorkoutDetail({ workoutId, store, onBack }) {
  // The full-body stretch routine reuses this screen with just its stretches.
  const workout = workouts[workoutId] ?? STRETCH_ROUTINE
  const isRoutine = workout.exercises.length === 0
  const [tab, setTab] = useState(isRoutine ? 'stretches' : 'exercises')
  const [showWorkoutSettings, setShowWorkoutSettings] = useState(false)
  const warmup = store.getWarmup(workoutId)

  // The one timer on screen, shown in the bar at the bottom.
  //   kind  – 'rest' | 'hold' | 'stretch'
  //   side / sides – per-side holds and stretches run twice
  //   phase – 'running' | 'switch' (between sides) | 'over'
  const [active, setActive] = useState(null)
  const clock = useCountdown(() => {
    playBeep()
    const a = active
    if (!a) return

    // Between sides it waits for you to reposition and tap Start.
    if (a.side < a.sides) {
      setActive({ ...a, phase: 'switch' })
      return
    }

    if (a.kind === 'hold') {
      const sets = store.getLog(workoutId, a.exercise).sets
      if (!sets[a.index]?.done) store.toggleSet(workoutId, a.exercise, a.index)
      const left = sets.filter((x, i) => !x.done && i !== a.index).length
      if (startRest(a.exercise, left)) return // rolls straight into rest
    }
    if (a.kind === 'warmup') store.setWarmupDone(workoutId, true)
    if (a.kind === 'stretch' && !store.getStretchDone(workoutId, a.stretchId)) {
      store.toggleStretch(workoutId, a.stretchId)
    }

    setActive({ ...a, phase: 'over' })
    // Rest waits for you to dismiss it; a finished hold or stretch clears itself.
    if (a.kind !== 'rest') setTimeout(() => setActive(x => (x?.id === a.id ? null : x)), 1600)
  })
  useWakeLock(clock.running)

  // 3-2-1 ticks so you hear the end coming.
  const secondsLeft = Math.ceil(clock.remaining / 1000)
  const lastTick = useRef(null)
  useEffect(() => {
    if (!clock.running || secondsLeft > 3 || secondsLeft < 1 || lastTick.current === secondsLeft) return
    lastTick.current = secondsLeft
    playTick()
  }, [clock.running, secondsLeft])
  useEffect(() => { if (secondsLeft > 3) lastTick.current = null }, [secondsLeft])

  function run(timer) {
    unlockAudio()
    setActive({ id: ++timerSeq, side: 1, sides: 1, phase: 'running', ...timer })
    clock.start(timer.total)
  }

  // Starts the exercise's rest, if it has one turned on and a set is still
  // left — no rest after the last set. Returns whether it did.
  function startRest(exercise, setsLeft) {
    const setup = store.getSetup(exercise)
    if (setsLeft === 0) {
      // Finished early, mid-rest: that rest no longer applies.
      if (active?.kind === 'rest' && active.exercise?.id === exercise.id) stopTimer()
      return false
    }
    if (!setup.restOn) return false
    run({ kind: 'rest', title: exercise.name, total: setup.rest * 1000, exercise })
    return true
  }

  // Times the next hold you haven't ticked off yet, from that set's seconds.
  function startHold(exercise) {
    const sets = store.getLog(workoutId, exercise).sets
    const index = Math.max(0, sets.findIndex(x => !x.done))
    run({
      kind: 'hold',
      title: exercise.name,
      total: sets[index].reps * 1000,
      sides: store.getSetup(exercise).perSide ? 2 : 1,
      exercise,
      index,
    })
  }

  function startWarmup() {
    run({ kind: 'warmup', title: `${warmup.minutes} min`, total: warmup.minutes * 60000 })
  }

  function startStretch(stretch) {
    run({
      kind: 'stretch',
      title: stretch.name,
      total: stretch.duration * 1000,
      sides: stretch.perSide ? 2 : 1,
      stretchId: stretch.id,
    })
  }

  function stopTimer() {
    clock.stop()
    setActive(null)
  }

  // "Start" after switching sides: times the next side.
  function startNextSide() {
    unlockAudio()
    setActive(a => ({ ...a, side: a.side + 1, phase: 'running' }))
    clock.start(active.total)
  }

  // "Start" after a rest: a hold begins its next countdown; for reps it just
  // clears the bar so you can lift.
  function startNextSet() {
    const exercise = active?.exercise
    if (exercise && store.getSetup(exercise).mode === 'hold') startHold(exercise)
    else stopTimer()
  }

  // What comes after a rest, read live so ticking during the rest updates it.
  let next = null
  if (active?.kind === 'rest' && active.exercise) {
    const sets = store.getLog(workoutId, active.exercise).sets
    const index = sets.findIndex(x => !x.done)
    next = { complete: index === -1, set: index + 1, of: sets.length }
  }

  const exerciseDone = workout.exercises.filter(e => store.getLog(workoutId, e).sets.every(x => x.done)).length
  const stretchDone = workout.stretches.filter(s => store.getStretchDone(workoutId, s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Workouts</span>
        </button>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{workout.short}</h1>
          {!isRoutine && <button
            onClick={() => setShowWorkoutSettings(true)}
            aria-label={`${workout.short} settings`}
            className="w-10 h-10 rounded-xl bg-white shadow-sm text-stone-500 flex items-center justify-center active:bg-stone-100 transition-colors shrink-0"
          >
            <GearIcon />
          </button>}
        </div>
        <p className="text-stone-400 text-sm mt-1">{isRoutine ? 'For days without a gym workout' : workout.name}</p>
      </div>

      {/* Tabs */}
      {!isRoutine && <div className="px-5 mb-3 bg-stone-50 shrink-0">
        <div className="bg-stone-100 rounded-xl p-1 flex">
          <TabBtn active={tab === 'exercises'} onClick={() => setTab('exercises')}>
            Exercises {exerciseDone > 0 && <span className="ml-1 text-accent-500">({exerciseDone}/{workout.exercises.length})</span>}
          </TabBtn>
          <TabBtn active={tab === 'stretches'} onClick={() => setTab('stretches')}>
            Stretches {stretchDone > 0 && <span className="ml-1 text-accent-500">({stretchDone}/{workout.stretches.length})</span>}
          </TabBtn>
        </div>
      </div>}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto px-5 space-y-2 ${active ? 'pb-28' : 'pb-6'}`}>
        {tab === 'exercises' && warmup.on && (
          <WarmupCard
            minutes={warmup.minutes}
            done={store.getWarmupDone(workoutId)}
            onStart={startWarmup}
            onToggle={() => store.setWarmupDone(workoutId, !store.getWarmupDone(workoutId))}
          />
        )}

        {tab === 'exercises' && store.getExercises(workoutId).map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            workoutId={workoutId}
            store={store}
            onSetDone={setsLeft => startRest(exercise, setsLeft)}
            onTimer={store.getSetup(exercise).mode === 'hold' ? () => startHold(exercise) : null}
          />
        ))}

        {tab === 'stretches' && (
          <StretchesTab workout={workout} store={store} onTimer={startStretch} />
        )}
      </div>

      {showWorkoutSettings && (
        <SettingsSheet title={`${workout.short} settings`} onClose={() => setShowWorkoutSettings(false)}>
          <SheetSection title="Warm-up">
            <ToggleRow
              label="Warm-up"
              detail="A timed warm-up at the top of the workout"
              on={warmup.on}
              onChange={on => store.setWarmup(workoutId, { on })}
            />
            {warmup.on && (
              <StepperRow
                label="Length"
                value={warmup.minutes}
                step={1}
                min={1}
                max={30}
                editable
                suffix=" min"
                onChange={minutes => store.setWarmup(workoutId, { minutes })}
              />
            )}
          </SheetSection>
          <SheetSection title="Exercise order">
            <ExerciseOrder workoutId={workoutId} store={store} />
          </SheetSection>
        </SettingsSheet>
      )}

      {active && (
        <TimerBar
          timer={active}
          next={next}
          remaining={clock.remaining}
          running={clock.running}
          onPause={clock.pause}
          onResume={() => { unlockAudio(); clock.resume() }}
          onAdd={() => { clock.add(30000); setActive(a => ({ ...a, total: a.total + 30000 })) }}
          onClose={stopTimer}
          onStart={active.phase === 'switch' ? startNextSide : startNextSet}
        />
      )}
    </div>
  )
}

// Every timer — rest, hold, stretch — lives in this bar pinned to the bottom,
// so the list stays in view while it runs.
const TIMER_LABELS = { rest: 'Rest', hold: 'Hold', stretch: 'Stretch', warmup: 'Warm-up' }

function TimerBar({ timer, next, remaining, running, onPause, onResume, onAdd, onClose, onStart }) {
  const over = timer.phase === 'over'
  const switching = timer.phase === 'switch'
  const progress = over ? 1 : switching ? 1 : 1 - remaining / timer.total
  const sides = timer.sides > 1 ? ` · Side ${timer.side} of ${timer.sides}` : ''

  let big = fmtClock(remaining)
  let label = `${TIMER_LABELS[timer.kind]} · ${timer.title}${sides}`
  if (next && !next.complete) label += ` · Next: set ${next.set} of ${next.of}`
  if (switching) { big = 'Switch sides'; label = `${timer.title} · Side ${timer.side + 1} next` }
  if (over) {
    if (timer.kind !== 'rest') {
      big = 'Done ✓'
      label = timer.title
    } else if (next?.complete) {
      big = 'All sets done ✓'
      label = `${timer.title} complete — on to the next exercise`
    } else {
      big = 'Next set'
      label = next ? `Set ${next.set} of ${next.of} · ${timer.title}` : timer.title
    }
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className={`max-w-md mx-auto rounded-2xl shadow-lg px-4 py-3 transition-colors ${over ? 'bg-emerald-600' : 'bg-stone-900'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 truncate">{label}</p>
            <p className="text-2xl font-bold text-white">{big}</p>
          </div>
          {!over && !switching && (timer.kind === 'rest' ? (
            <BarBtn onClick={onAdd}>+30s</BarBtn>
          ) : (
            <BarBtn onClick={running ? onPause : onResume}>{running ? 'Pause' : 'Resume'}</BarBtn>
          ))}
          {switching || (over && timer.kind === 'rest' && next && !next.complete) ? (
            <>
              {switching && <BarBtn onClick={onClose}>Stop</BarBtn>}
              <BarBtn primary onClick={onStart}>Start</BarBtn>
            </>
          ) : (
            <BarBtn primary onClick={onClose}>
              {over ? 'Done' : timer.kind === 'rest' ? 'Skip' : 'Stop'}
            </BarBtn>
          )}
        </div>
        <div className="h-1 rounded-full bg-white/15 mt-2.5 overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function BarBtn({ primary, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-10 rounded-xl text-sm font-semibold ${
        primary ? 'bg-white text-stone-900 active:bg-stone-200' : 'bg-white/15 text-white active:bg-white/25'
      }`}
    >
      {children}
    </button>
  )
}

function StretchesTab({ workout, store, onTimer }) {
  const totalStretchSeconds = workout.stretches.reduce(
    (sum, s) => sum + store.getCustomDuration(s.id, s.duration) * (store.getPerSide(s.id, s.perSide) ? 2 : 1),
    0,
  )

  return (
    <>
      <div className="rounded-2xl bg-accent-50 border border-accent-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClockIcon size={18} />
          <span className="text-sm font-medium text-stone-600">Total stretching time</span>
        </div>
        <span className="text-accent-600 font-bold">{fmtDuration(totalStretchSeconds)}</span>
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

// Reorder a workout's exercises with ↑ / ↓ — steadier than dragging mid-set.
function ExerciseOrder({ workoutId, store }) {
  const list = store.getExercises(workoutId)
  const arrow = (d, disabled, onClick, label) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center active:bg-stone-200 disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  )
  return (
    <>
      <div className="space-y-1.5">
        {list.map((ex, i) => (
          <div key={ex.id} className="flex items-center gap-2 rounded-xl bg-stone-50 pl-3 pr-1.5 py-1.5">
            <span className="text-xs font-semibold text-stone-400 w-4">{i + 1}</span>
            <span className="flex-1 min-w-0 truncate text-sm text-stone-700">{ex.name}</span>
            {arrow('M18 15l-6-6-6 6', i === 0, () => store.moveExercise(workoutId, ex.id, -1), `Move ${ex.name} up`)}
            {arrow('M6 9l6 6 6-6', i === list.length - 1, () => store.moveExercise(workoutId, ex.id, 1), `Move ${ex.name} down`)}
          </div>
        ))}
      </div>
      {store.isCustomOrder(workoutId) && (
        <button onClick={() => store.resetOrder(workoutId)} className="text-xs font-medium text-accent-500 active:opacity-60">
          Reset to default order
        </button>
      )}
    </>
  )
}

// Optional timed warm-up, tinted blue so it stands apart from the lifts.
function WarmupCard({ minutes, done, onStart, onToggle }) {
  return (
    <div className="rounded-2xl p-4 bg-accent-50 border border-accent-200 flex items-center gap-3">
      <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform" aria-label={done ? 'Untick warm-up' : 'Tick warm-up'}>
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'border-accent-500 bg-accent-500' : 'border-accent-200 bg-white'
        }`}>
          {done && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-accent-600">{done ? 'Warm-up done' : 'Warm-up'}</p>
        <p className="text-sm text-stone-500">{minutes} min · treadmill, bike or rower</p>
      </div>
      {!done && (
        <button onClick={onStart} className="px-4 h-9 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 shrink-0">
          Start
        </button>
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

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ClockIcon({ size = 16, color = 'var(--color-accent-500)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// Bottom sheet for an exercise's or stretch's settings — the list underneath
// never moves, and the controls are big enough to hit mid-set.
function SettingsSheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md px-5 pt-3 max-h-[88dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-stone-900 font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-accent-500 text-sm font-semibold active:opacity-70">
            Done
          </button>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  )
}

// ── A −/+ row used inside the settings menu ──────────────────────────────────
function StepperRow({ label, value, step, min = 0, max = Infinity, editable, suffix = '', format = fmt, onChange }) {
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
      <span className="text-base text-stone-600">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 transition-colors"
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
            className="w-16 text-center text-xl font-bold bg-stone-100 rounded-lg px-1 py-1 text-stone-900 outline-none"
          />
        ) : (
          <button
            onClick={() => { if (editable) { setDraft(String(value)); setEditing(true) } }}
            className={`w-16 text-center text-xl font-bold text-stone-900 ${editable ? 'active:opacity-60' : ''}`}
          >
            {format(value)}{suffix && <span className="text-xs font-medium text-stone-400">{suffix}</span>}
          </button>
        )}
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── One set: remembered reps (or seconds) plus this round's tick ────────────
function SetRow({ index, value, done, hold, readOnly, onChange, onToggle }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function save() {
    setEditing(false)
    const n = parseInt(draft)
    if (!isNaN(n) && n >= 0) onChange(n)
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
      done ? 'bg-accent-100/70' : 'bg-stone-50'
    }`}>
      <span className={`text-xs font-semibold w-4 shrink-0 ${done ? 'text-accent-500' : 'text-stone-400'}`}>
        {index + 1}
      </span>

      {readOnly ? (
        <span className="flex-1 text-center">
          <span className="text-base font-bold text-stone-900">{value}</span>
          <span className="text-xs font-medium text-stone-400">s hold</span>
        </span>
      ) : (<>
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
          <span className="text-xs font-medium text-stone-400">{hold ? 's' : ' reps'}</span>
        </button>
      )}

      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 transition-colors shrink-0"
      >
        +
      </button>
      </>)}

      <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform ml-0.5">
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
function ExerciseCard({ exercise, workoutId, store, onTimer, onSetDone }) {
  const [showSettings, setShowSettings] = useState(false)
  // A finished exercise collapses to one line; tapping it reopens the card.
  const [expanded, setExpanded] = useState(false)

  const log = store.getLog(workoutId, exercise)
  const assist = store.getAssist(exercise.id, exercise.weight.assist ?? false)
  const setup = store.getSetup(exercise)
  const hold = setup.mode === 'hold'

  const allDone = log.sets.every(x => x.done)
  const someDone = log.sets.some(x => x.done)

  // Adding or unticking a set reopens the card; finishing again collapses it.
  const [prevAllDone, setPrevAllDone] = useState(allDone)
  if (allDone !== prevAllDone) {
    setPrevAllDone(allDone)
    if (!allDone) setExpanded(false)
  }
  const collapsed = allDone && !expanded
  const perSide = log.bar > 0 ? (log.weight - log.bar) / 2 : null
  const holdTime = log.sets[0]?.reps ?? 0

  let summary
  if (hold) {
    summary = log.weight > 0 ? `+${fmt(log.weight)} lbs` : 'Bodyweight'
  } else if (log.weight === 0 && log.bar === 0) {
    summary = assist ? 'Assisted' : 'Bodyweight'
  } else {
    const wp = `${fmt(log.weight)} lbs${log.bar > 0 ? ` · ${fmt(perSide)} lb/side` : ''}`
    summary = assist ? `Assisted · ${wp}` : wp
  }

  if (collapsed) {
    const done = hold
      ? `${log.sets.length} × ${log.sets[0]?.reps ?? 0}s`
      : `${log.weight > 0 ? `${fmt(log.weight)} lbs · ` : ''}${log.sets.map(x => x.reps).join(', ')}`
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-accent-50 border border-accent-200 text-left active:opacity-70"
      >
        <span className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="font-semibold text-accent-600 truncate">{exercise.name}</span>
        <span className="text-sm text-stone-500 ml-auto shrink-0">{done}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    )
  }

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      allDone ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'
    }`}>
      {/* Name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold leading-tight ${allDone ? 'text-accent-500' : 'text-stone-900'}`}>
            {exercise.name}
            {setup.perSide && <span className="text-stone-400 font-normal text-sm ml-1">(per side)</span>}
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="mt-1 flex items-center gap-1 text-left active:opacity-60"
          >
            <span className={`text-sm font-medium ${assist ? 'text-stone-400' : 'text-stone-600'}`}>
              {summary}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors mr-1.5"
          >
            <GearIcon />
          </button>
          {onTimer && (
            <button
              onClick={onTimer}
              className="w-8 h-8 rounded-xl bg-accent-100 flex items-center justify-center active:bg-accent-200 transition-colors"
            >
              <ClockIcon />
            </button>
          )}
          <button
            onClick={() => store.toggleExercise(workoutId, exercise)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-xs font-bold ${
              allDone ? 'bg-accent-500 text-white' : 'bg-stone-100 text-stone-400 active:bg-stone-200'
            }`}
            aria-label={allDone ? 'Untick all sets' : 'Tick all sets'}
          >
            {allDone ? '✓' : 'All'}
          </button>
        </div>
      </div>

      {/* Program target, for reference — the set rows hold your own numbers */}
      <div className="flex items-center gap-2 mt-1.5">
        {/* The program's target only means something in its own mode. */}
        {hold === !!exercise.isTime && (
          <p className="text-xs text-stone-400">Program target {exercise.sets} × {exercise.reps}</p>
        )}
        {setup.restOn && (
          <span className="text-xs font-medium text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded-md">Rest {fmtClock(setup.rest * 1000)}</span>
        )}
      </div>

      {/* Sets */}
      <div className="mt-2.5 space-y-1.5">
        {log.sets.map((set, i) => (
          <SetRow
            key={i}
            index={i}
            value={set.reps}
            done={set.done}
            hold={hold}
            readOnly={hold}
            onChange={reps => store.setSetReps(exercise, i, reps)}
            onToggle={() => {
              store.toggleSet(workoutId, exercise, i)
              if (!set.done) onSetDone(log.sets.filter((x, j) => !x.done && j !== i).length)
            }}
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
        {allDone && (
          <button onClick={() => setExpanded(false)} className="text-xs font-medium text-stone-400 ml-auto active:text-stone-600">
            Collapse
          </button>
        )}
        {someDone && !allDone && (
          <span className="text-xs text-stone-400 ml-auto">
            {log.sets.filter(x => x.done).length}/{log.sets.length} done
          </span>
        )}
      </div>

      {showSettings && (
        <SettingsSheet title={exercise.name} onClose={() => setShowSettings(false)}>
          <SheetSection title="Sets">
            <Segmented
              label="Counted in"
              value={setup.mode}
              options={[['reps', 'Reps'], ['hold', 'Hold']]}
              onChange={mode => store.setSetup(exercise, { mode })}
            />
            {hold ? (
              <>
                <StepperRow
                  label="Hold time"
                  value={holdTime}
                  step={5}
                  min={5}
                  editable
                  suffix="s"
                  onChange={v => store.setHoldTime(exercise, v)}
                />
                <p className="text-xs text-stone-400 -mt-1">Tap the clock on the card to time each set — it ticks the set when time’s up.</p>
              </>
            ) : (
              <p className="text-xs text-stone-400 -mt-1">Each set is a number of reps — adjust them on the card as you go.</p>
            )}
            <ToggleRow
              label="Per side"
              detail={hold ? 'Hold each side — the timer runs twice' : 'Do the reps on each side'}
              on={setup.perSide}
              onChange={perSide => store.setSetup(exercise, { perSide })}
            />
          </SheetSection>
          {hold ? (
            <SheetSection title="Load">
              <StepperRow
                label="Added weight"
                value={log.weight}
                step={0.5}
                min={0}
                editable
                onChange={v => store.setWeight(exercise, v)}
              />
              <p className="text-xs text-stone-400 -mt-1">Leave at 0 for bodyweight — add a plate once holds get easy.</p>
            </SheetSection>
          ) : (
          <SheetSection title="Load">
          <StepperRow
            label="Weight"
            value={log.weight}
            step={0.5}
            min={0}
            editable
            onChange={v => store.setWeight(exercise, v)}
          />
          <StepperRow
            label="Bar"
            value={log.bar}
            step={BAR_STEP}
            min={BAR_MIN}
            max={BAR_MAX}
            onChange={v => store.setBar(exercise, v)}
          />
          {log.bar > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-accent-50 px-3.5 py-3">
              <span className="text-sm text-stone-500">Plates per side</span>
              <span className="text-accent-600 font-bold">
                {perSide > 0 ? `${fmt(perSide)} lb each side` : 'Empty bar'}
              </span>
            </div>
          )}
          <ToggleRow
            label="Assist"
            detail="Not lifting the full load (assisted or bodyweight)"
            on={assist}
            onChange={v => store.setAssist(exercise.id, v)}
          />
          </SheetSection>
          )}
          <SheetSection title="Rest timer">
            <Segmented
              label="Between sets"
              value={setup.restOn ? 'on' : 'off'}
              options={[['off', 'Off'], ['on', 'On']]}
              onChange={v => store.setSetup(exercise, { restOn: v === 'on' })}
            />
            {setup.restOn && (
              <>
                <StepperRow
                  label="Rest length"
                  value={setup.rest}
                  step={15}
                  min={15}
                  format={s => fmtClock(s * 1000)}
                  onChange={rest => store.setSetup(exercise, { rest })}
                />
                <p className="text-xs text-stone-400 -mt-1">Starts automatically each time you tick a set.</p>
              </>
            )}
          </SheetSection>
        </SettingsSheet>
      )}
    </div>
  )
}

// ── Building blocks for the settings sheet ──────────────────────────────────
function SheetSection({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
      {children}
    </div>
  )
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base text-stone-600">{label}</span>
      <div className="bg-stone-100 rounded-xl p-1 flex">
        {options.map(([key, text]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              value === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({ label, detail, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center justify-between gap-3 w-full text-left active:opacity-70">
      <span>
        <span className="block text-base text-stone-600">{label}</span>
        {detail && <span className="block text-xs text-stone-400">{detail}</span>}
      </span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${on ? 'bg-accent-500' : 'bg-stone-300'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

// ── Stretch card ─────────────────────────────────────────────────────────────
function StretchCard({ stretch, checked, onToggle, onTimer, customDuration, onDurationChange, perSide, onPerSideChange }) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      checked ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked ? 'border-accent-500 bg-accent-500' : 'border-stone-200'
          }`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${checked ? 'text-accent-500' : 'text-stone-900'}`}>{stretch.name}</p>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1 mt-0.5 text-left active:opacity-60 min-w-0 max-w-full overflow-hidden">
            <span className="text-stone-400 text-sm whitespace-nowrap shrink-0">{customDuration}s{perSide ? ' per side' : ''}</span>
            {stretch.alt && <span className="text-stone-300 text-sm ml-1 truncate">· Alt: {stretch.alt}</span>}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors mr-1.5"
          >
            <GearIcon />
          </button>
          <button
            onClick={onTimer}
            className="w-11 h-11 rounded-xl bg-accent-100 flex items-center justify-center active:bg-accent-200 transition-colors"
          >
            <ClockIcon size={20} />
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsSheet title={stretch.name} onClose={() => setShowSettings(false)}>
          <StepperRow
            label="Duration"
            value={customDuration}
            step={5}
            min={5}
            editable
            suffix="s"
            onChange={onDurationChange}
          />
          <ToggleRow
            label="Per side"
            detail="Hold each side — the timer runs twice"
            on={perSide}
            onChange={onPerSideChange}
          />
        </SettingsSheet>
      )}
    </div>
  )
}
