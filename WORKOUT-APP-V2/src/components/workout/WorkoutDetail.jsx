import { useEffect, useRef, useState } from 'react'
import { workouts, STRETCH_ROUTINE, COOL_DOWN_BY_ID, FULL_BODY_BY_ID, TARGETED } from '../../data/workout'
import { equipmentName, MUSCLE_LABEL, TARGET_AREA_BY_ID } from '../../data/targeted'
import { gapsAfter, EXERCISE_BY_ID, isCore } from '../../data/exercises'
import { weekRange, sameDay, weekdayOf } from '../../utils/days'
import { TimerBar } from './TimerBar'
import { StretchesTab, StretchTotal } from './StretchesTab'
import { ExercisePicker } from './pickers'
import { ConfirmSheet, SettingsSheet } from '../ui/Sheet'
import { DayPicker } from '../ui/DayPicker'
import { LogButton } from '../ui/LogButton'
import { CoveragePill, AddRow } from './coverage'
import { SwipeRow } from '../ui/SwipeRow'
import { useDragReorder } from '../../hooks/useDragReorder'
import { useScope } from '../../hooks/useScope'
import { DiffBar, WeekTag, OffRow } from './weekDiff'
import { SlotRows } from './slots'
import { WarmupCard } from './WarmupCard'
import { ExerciseCard } from './ExerciseCard'

export default function WorkoutDetail({ workoutId, weekStart = null, focus: asked, backLabel, store, timer, onBack }) {
  // Opened while its timer is going, it opens on the card being timed, however
  // you got here.
  const live = timer.active?.workoutId === workoutId && timer.active?.weekStart === weekStart ? timer.active : null
  const focus = asked ?? (live && (live.stretchId ? { tab: 'stretches', id: live.stretchId } : { tab: 'exercises', id: live.exercise?.id ?? null }))
  // The full-body stretch routine and the cool-downs reuse this screen with
  // just their stretches.
  const cool = COOL_DOWN_BY_ID[workoutId]
  const workout = workouts[workoutId] ?? cool ?? STRETCH_ROUTINE
  // The Full Body Stretch and the cool-downs: stretches only.
  const isRoutine = !workouts[workoutId]
  const targeted = workoutId === TARGETED.id
  const [tab, setTab] = useState(isRoutine ? 'stretches' : focus?.tab ?? 'exercises')
  const [adding, setAdding] = useState(null) // 'main' | 'core': the exercise bank is open
  // The first set ticked (or warm-up, or last stretch) on a rest day asks whether it's
  // still a rest day, once. A plan already ticked when you open it doesn't ask.
  const stamps = store.stampsOf(workoutId)
  // Ones you can do more than once a week, and how far the one under way got.
  const repeatable = !!FULL_BODY_BY_ID[workoutId] || targeted || workoutId === STRETCH_ROUTINE.id || !!COOL_DOWN_BY_ID[workoutId]
  const current = repeatable ? store.currentSession(workoutId) : null
  const started = !!current && ((current.done ?? 0) > 0 || current.stretched > 0)
  const [ending, setEnding] = useState(false)
  const [pickingDay, setPickingDay] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  // What it's for, in a pop-up: a plan's muscles, or what you picked for a
  // built one.
  const infoBtn = (
    <HeadBtn label={targeted ? 'What you picked' : cool ? 'What this cool-down is for' : `What ${workout.short} works`} onClick={() => setShowInfo(true)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
    </HeadBtn>
  )
  // Picks the day it goes on (see PlanDaySheet).
  const calendarBtn = (
    <HeadBtn label="Pick the day" onClick={() => setPickingDay(true)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
    </HeadBtn>
  )
  // Anything ticked in it this week (sets, stretches or the warm-up).
  const anyTicked = store.workoutProgress(workoutId).done > 0 || store.getStretches(workoutId).some(x => store.getStretchDone(workoutId, x.id)) || store.getWarmupDone(workoutId)
  const warmup = store.getWarmup(workoutId)
  // Every exercise starts folded; tapping one opens it (and folds any other).
  // Finishing it folds it again.
  const [openId, setOpenId] = useState(focus?.tab === 'exercises' ? focus.id : null)
  const exercises = store.getExercises(workoutId)
  const openExercise = exercises.some(x => x.id === openId) ? openId : null

  // Drag an exercise by its handle within its own list (main or Core).
  const listRef = useRef(null)
  const exerciseDrag = useDragReorder(
    listRef,
    id => {
      const { main, core } = store.getExerciseSections(workoutId)
      return (main.some(x => x.id === id) ? main : core).map(x => x.id)
    },
    (id, to) => store.moveExerciseTo(workoutId, id, to),
  )

  // Adding or removing an exercise, or adding Core, asks: just this week, or
  // every week after? (Or, for one you can do any number of times, this
  // time or every time.)
  const [ask, scopeSheet] = useScope(store, workoutId)
  // What's different from every week's version: tagged, struck through, and
  // a bar to reset it. Build a Workout's are made fresh each time, so they
  // have none.
  const diff = !targeted && !store.past ? store.weekDiff(workoutId) : null

  // Swiping an exercise away, saying so if it's the only one for an area.
  // One added just this week goes without asking.
  function removeExercise(ex) {
    const { main, core } = store.getExerciseSections(workoutId)
    const inCore = core.some(x => x.id === ex.id)
    const list = inCore ? core : main
    // Added just this week: nothing to ask, it just goes.
    if (diff?.exercises.added.includes(ex.id)) return store.removeExercise(workoutId, ex.id, 'week')
    const gaps = gapsAfter(list, list.filter(x => x.id !== ex.id), inCore ? 'core' : workoutId)
    ask(
      `Remove ${ex.name}?`,
      scope => store.removeExercise(workoutId, ex.id, scope),
      gaps.length ? `It’s the only exercise here for ${gaps.join(' and ')}, so that will be left uncovered.` : null,
    )
  }

  // The timer is the app's (see useWorkoutTimer), so it keeps going when
  // you leave; started from here, it belongs to this workout and week.
  const at = { workoutId, weekStart }
  const mine = timer.active?.workoutId === workoutId && timer.active?.weekStart === weekStart
  // What its timer is timing, from the moment it opens until Done or ■:
  // that whole card, and the rest of the plan, can't be changed.
  const going = mine ? timer.active : null
  const timingStretch = going?.kind === 'stretch' ? going : null
  const timingHold = going?.kind === 'hold' ? going : null
  const startRest = (exercise, setsLeft) => timer.startRest(at, exercise, setsLeft)
  const startHold = (exercise, set) => timer.startHold(at, exercise, set)
  const startWarmup = () => timer.startWarmup(at, warmup.sets)
  const startStretch = stretch => timer.startStretch(at, stretch)
  // A hold timed to the end folds its card, as ticking the last set does.
  const { onFold } = timer
  useEffect(() => {
    onFold((w, id) => { if (w === workoutId) setOpenId(o => (o === id ? null : o)) })
    return () => onFold(null)
  }, [onFold, workoutId])

  // One exercise in the list: dragged by its handle, swiped to remove.
  const sections = store.getExerciseSections(workoutId)
  const finished = x => store.getLog(workoutId, x).all.every(set => set.done)
  // A built workout's empty slots (main or Core) count as still to do.
  // (A built workout keeps core in its main list, so all its slots are there.)
  const slotsIn = core => (targeted && !core ? store.targeted.slots.length : 0)
  const partDone = (list, core) => list.length > 0 && !slotsIn(core) && list.every(finished)
  const partProgress = (list, core) => `${list.filter(finished).length} of ${list.length + slotsIn(core)} Completed`
  // One exercise open: just it, under the warm-up and its part's heading.
  const focused = tab === 'exercises' && !!openExercise
  const focusCore = focused && !sections.main.some(x => x.id === openExercise)
  // The open one between the ones just before and after it, greyed out.
  const stacked = list => {
    const i = list.findIndex(x => x.id === openExercise)
    if (i < 0) return null
    return (
      <div key="stack" className="space-y-2">
        {i > 0 && <div className={`opacity-50 ${going ? 'pointer-events-none' : ''}`}>{exerciseCard(list[i - 1], true)}</div>}
        {exerciseCard(list[i])}
        {i < list.length - 1 && <div className={`opacity-50 ${going ? 'pointer-events-none' : ''}`}>{exerciseCard(list[i + 1], true)}</div>}
      </div>
    )
  }
  // `faded`: one shown beside the open one, which can't be dragged.
  const exerciseCard = (exercise, faded) => {
    const open = exercise.id === openExercise
    const card = (
      <ExerciseCard
        exercise={exercise}
        workoutId={workoutId}
        store={store}
        grip={faded ? null : exerciseDrag.handlers(exercise.id)}
        open={open}
        onOpen={() => setOpenId(exercise.id)}
        onClose={() => setOpenId(null)}
        onSetDone={setsLeft => {
          startRest(exercise, setsLeft)
          if (setsLeft === 0) setOpenId(null)
        }}
        onTimer={store.getSetup(exercise).mode === 'hold' ? set => startHold(exercise, set) : null}
        tag={diff?.exercises.added.includes(exercise.id) && <WeekTag repeat={repeatable} />}
        timing={timingHold?.exercise.id === exercise.id ? timingHold : null}
      />
    )
    // Folded or open, swipe it left to remove it.
    return (
      <div key={exercise.id} data-row={exercise.id} style={exerciseDrag.style(exercise.id)} className={exerciseDrag.dragging === exercise.id ? 'rounded-2xl shadow-lg' : ''}>
        <SwipeRow label={exercise.name} onRemove={() => removeExercise(exercise)}>{card}</SwipeRow>
      </div>
    )
  }

  // Taken out just for now, in their own list (main or Core).
  const offRows = core => (diff?.exercises.dropped ?? [])
    .filter(id => (isCore(EXERCISE_BY_ID[id]) && !sections.coreInMain) === core)
    .map(id => <OffRow key={id} name={EXERCISE_BY_ID[id].name} repeat={repeatable} onUndo={() => store.putBackWeek(workoutId, 'exercises', id)} />)

  const exerciseList = store.getExercises(workoutId)
  const exerciseDone = exerciseList.filter(e => store.getLog(workoutId, e).all.every(x => x.done)).length
  const stretchList = store.getStretches(workout.id)
  const stretchDone = stretchList.filter(s => store.getStretchDone(workoutId, s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 active:opacity-70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {/* Back to where you came from: Activities, a saved week, or Workouts. */}
            <span className="text-sm font-medium">{backLabel ?? (store.past ? weekRange(store.weekStart) : 'Workouts')}</span>
          </button>
          {/* Full-body days, the Full Body Stretch and cool-downs go on the day
              they're done (each moves from its line on the card); one you
              can't finish is ended here and still logged. */}
          {/* One built with nothing done yet can be called off, as if it
              never happened. */}
          {(targeted || FULL_BODY_BY_ID[workoutId] || workoutId === STRETCH_ROUTINE.id || cool) && !store.past && !started && !store.getWarmupDone(workoutId) ? (
            <div className="flex items-center gap-2">
              {(targeted || cool) && infoBtn}
              {calendarBtn}
              <HeadBtn label="Cancel" onClick={() => { store.discard(workoutId); onBack() }}><CrossIcon /></HeadBtn>
            </div>
          ) : repeatable ? (
            started && !current.finished && (
              <div className="flex items-center gap-2">
              {(targeted || cool) && infoBtn}
              <button onClick={() => setEnding(true)} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-sm font-medium active:bg-stone-200">
                End
              </button>
              </div>
            )
          ) : !store.past && (
            // A plan: pick its day, or cancel it (clearing what's ticked,
            // after asking). A past week's day changes from Activities.
            <div className="flex items-center gap-2">
              {infoBtn}
              {calendarBtn}
              <HeadBtn label="Cancel this workout" onClick={() => (anyTicked ? setCancelling(true) : onBack())}><CrossIcon /></HeadBtn>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{FULL_BODY_BY_ID[workoutId] ? 'Full Body' : targeted ? 'Build a Workout' : workout.short}</h1>
        </div>
        {FULL_BODY_BY_ID[workoutId] ? (
          // Its equipment was picked before starting (Build a Workout), so it
          // just says which.
          <p className="text-stone-400 text-sm mt-1">{FULL_BODY_BY_ID[workoutId].label}</p>
        ) : targeted ? (
          <p className="text-stone-400 text-sm mt-1">{equipmentName(store.targeted.eq)}</p>
        ) : null}
      </div>

      {/* Tabs */}
      {!isRoutine && <div className="px-5 mb-3 bg-stone-50 shrink-0">
        <div className="bg-stone-100 rounded-xl p-1 flex">
          {/* While a timer goes, you stay on its tab. */}
          <TabBtn active={tab === 'exercises'} disabled={!!going && tab !== 'exercises'} onClick={() => setTab('exercises')}>
            Exercises {exerciseDone > 0 && <span className="ml-1 text-accent-500">({exerciseDone}/{exerciseList.length})</span>}
          </TabBtn>
          <TabBtn active={tab === 'stretches'} disabled={!!going && tab !== 'stretches'} onClick={() => setTab('stretches')}>
            Stretches {stretchDone > 0 && <span className="ml-1 text-accent-500">({stretchDone}/{stretchList.length})</span>}
          </TabBtn>
        </div>
      </div>}

      {/* On Stretches, their total time sits above the timer. */}
      {tab === 'stretches' && <div className="shrink-0 px-5 pb-3"><StretchTotal store={store} listId={workout.id} /></div>}

      {/* The running timer, pinned above the list so it never covers it. */}
      {mine && <TimerBar {...timer.bar} settings={store.timer} onSettings={store.setTimer} />}

      {/* Content */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 space-y-2 pb-6">
        {diff?.differs && !(tab === 'exercises' && openExercise) && <DiffBar repeat={repeatable} onReset={() => store.resetWeek(workoutId)} />}
        {/* The plan in three parts: an optional warm-up, the main workout,
            and an optional Core section (the gym plans have core in the
            main workout instead). */}
        {tab === 'exercises' && (
          <>
            <PartHead title="Warm-up" right={store.getWarmup(workoutId).on && store.getWarmupDone(workoutId) ? 'Done ✓' : null} done />
            {/* While another timer goes, the warm-up can't be opened. */}
            <div className={going && going.kind !== 'warmup' ? 'pointer-events-none opacity-50' : ''}>
              <WarmupCard workoutId={workoutId} store={store} onStart={startWarmup} />
            </div>

            <PartHead
              title="Main workout"
              pill={<CoveragePill list={sections.main} area={workoutId} />}
              right={partProgress(sections.main, false)}
              done={partDone(sections.main, false)}
            />
            {/* With one open, it's the only exercise shown. */}
            {focusCore ? null : focused ? stacked(sections.main) : sections.main.map(x => exerciseCard(x))}
            {!focused && <>
            {offRows(false)}
            {targeted && <SlotRows kind="exercise" slots={store.targeted.slots} store={store} />}
            <AddRow label="Add exercise" onClick={() => setAdding('main')} />
            </>}
            {focusCore && (
              <>
                <PartHead title="Core" />
                {stacked(sections.core)}
              </>
            )}

            {focused || sections.coreInMain ? null : sections.coreOn ? (
              <>
                <PartHead
                  title="Core"
                  pill={<CoveragePill list={sections.core} area="core" />}
                  right={sections.core.length + slotsIn(true) ? partProgress(sections.core, true) : null}
                  done={partDone(sections.core, true)}
                />
                {sections.core.map(x => exerciseCard(x))}
                {offRows(true)}
                {targeted && <SlotRows kind="exercise" slots={store.targeted.slots} show={x => x.area === 'core'} store={store} />}
                <AddRow label="Add core exercise" onClick={() => setAdding('core')} />
              </>
            ) : (
              <>
                <PartHead title="Core" />
                {offRows(true)}
                <AddRow
                  label="Add core"
                  note="abs & obliques"
                  onClick={() => {
                    // No core exercises yet (Chest & Shoulders starts with
                    // none): pick one, and adding it turns Core on.
                    if (sections.core.length === 0) setAdding('core')
                    else ask('Add Core?', scope => store.setCoreOn(workoutId, true, scope))
                  }}
                />
              </>
            )}

          </>
        )}

        {tab === 'stretches' && (
          <StretchesTab workout={workout} store={store} diff={diff} repeat={repeatable} onTimer={startStretch} open={focus?.tab === 'stretches' ? focus.id : null} timing={timingStretch} />
        )}
      </div>

      {adding && (
        <ExercisePicker
          workoutId={workoutId}
          store={store}
          section={adding}
          onPick={id => {
            setAdding(null)
            ask(`Add ${EXERCISE_BY_ID[id].name}?`, scope => store.addExercise(workoutId, id, scope))
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {scopeSheet}
      {ending && (
        <ConfirmSheet
          title="End now?"
          body={FULL_BODY_BY_ID[workoutId] || targeted
            ? `It’s logged as it is: ${current.done}/${current.total} sets and ${current.stretched}/${current.stretches} stretches. It counts as a workout only when every set is done.`
            : `It’s logged as it is: ${current.stretched}/${current.stretches} stretches. It counts as a stretch day only when every stretch is done.`}
          confirmLabel="End"
          onConfirm={() => { store.endEarly(workoutId); setEnding(false); onBack() }}
          onClose={() => setEnding(false)}
        />
      )}
      {showInfo && (
        <SettingsSheet title={targeted ? 'Build a Workout' : cool ? cool.name : workout.short} closeLabel="Done" onClose={() => setShowInfo(false)}>
          {targeted ? (
            // Each area picked, with its muscles.
            <div className="rounded-2xl bg-stone-50 divide-y divide-stone-200/70">
              {store.targeted.areas.map(a => (
                <div key={a} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="text-base text-stone-800">{TARGET_AREA_BY_ID[a]?.label ?? a}</span>
                  <span className="text-sm text-stone-500 text-right">{(store.targeted.muscles?.[a] ?? []).map(m => MUSCLE_LABEL[m]).join(', ')}</span>
                </div>
              ))}
            </div>
          ) : cool ? null : <>
            <p className="text-sm text-stone-500 -mt-1">Works</p>
            <p className="text-base text-stone-800">{workout.name}</p>
          </>}
        </SettingsSheet>
      )}
      {cancelling && (
        <ConfirmSheet
          title={`Cancel ${workout.short}?`}
          body="This clears this week's ticked sets, stretches and warm-up for it."
          confirmLabel="Cancel workout"
          onConfirm={() => { if (mine) timer.stop(); store.clearSession(workoutId); setCancelling(false); onBack() }}
          onClose={() => setCancelling(false)}
        />
      )}
      {pickingDay && (
        <PlanDaySheet
          store={store}
          stamps={stamps}
          onPick={at => store.setPlanDay(workoutId, at)}
          onClose={() => setPickingDay(false)}
        />
      )}
    </div>
  )
}

// A part's heading in a plan: its name, and on the right its progress (blue
// once it's all done).
function PartHead({ title, pill, right, done }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pt-3 first:pt-0">
      <span className="flex items-baseline gap-2">
        <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
        {pill}
      </span>
      {right && <span className={`text-xs font-semibold ${done ? 'text-accent-500' : 'text-stone-400'}`}>{right}</span>}
    </div>
  )
}

// The day a plan goes on, top right: Today until you pick another day, then
// that day in blue; once something's ticked, the day it was logged. Tap to
// pick or change it.
// A round icon button in the workout's header.
function HeadBtn({ label, onClick, children }) {
  return (
    <button onClick={onClick} aria-label={label} className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center active:bg-stone-200">
      {children}
    </button>
  )
}
const CrossIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
)

// Which day a plan goes on. Before anything's ticked it sets the day ticks
// land on; after, it moves the whole session (sets, warm-up, stretches).
function PlanDaySheet({ store, stamps, onPick, onClose }) {
  const logged = stamps.at ?? stamps.warmedAt ?? stamps.stretchedAt
  const [at, setAt] = useState(logged ?? stamps.day ?? store.today.toISOString())
  const today = sameDay(new Date(at), store.today)
  return (
    <SettingsSheet title="Which day?" closeLabel="Cancel" onClose={onClose}>
      <p className="text-stone-500">
        {logged ? 'Move this session (sets, warm-up and stretches) to another day.' : 'Everything you tick in this plan goes on this day.'}
      </p>
      <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />
      <LogButton onSave={() => { onPick(at); onClose() }}>
        {logged ? (today ? 'Move to today' : `Move to ${weekdayOf(at)}`) : today ? 'Log today' : `Log on ${weekdayOf(at)}`}
      </LogButton>
    </SettingsSheet>
  )
}

function TabBtn({ active, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 ${
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
      }`}
    >
      {children}
    </button>
  )
}
