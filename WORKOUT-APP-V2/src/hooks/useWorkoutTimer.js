import { useCallback, useEffect, useRef, useState } from 'react'
import { playBeep, playGo, playTick, unlockAudio } from '../utils/sound'
import { useCountdown, useWakeLock } from './timing'
import { warmupSetLabel } from '../utils/format'

let timerSeq = 0

// The one timer, kept by the app so it keeps going while you move around:
// back home, into another workout, into Settings. It remembers the workout
// (and week) it belongs to, and ticks off that hold or stretch when it ends.
//   kind  – 'rest' | 'hold' | 'stretch' | 'warmup'
//   side / sides – per-side holds and stretches run twice
//   phase – 'armed' (opened, waiting for Go, so you can change its
//           settings first) | 'ready' (count-in) | 'running' | 'switch'
//           (between sides) | 'rest' (between stretch sets) | 'over'
// `storeFor(weekStart)`: the store for that week (null: this week).
export function useWorkoutTimer(storeFor) {
  const [active, setActive] = useState(null)
  // Opened full screen (it goes back to the bar when it ends).
  const [full, setFull] = useState(false)
  const stores = useRef(storeFor)
  useEffect(() => { stores.current = storeFor })
  const storeOf = a => stores.current(a.weekStart)
  // The open workout's way to fold an exercise's card once its last hold is done.
  const fold = useRef(null)
  const onFold = useCallback(fn => { fold.current = fn }, [])

  const clock = useCountdown(({ start }) => {
    const a = active
    if (!a) return
    const store = storeOf(a)
    const { workoutId } = a
    // Get-ready over: the timer itself starts now.
    if (a.phase === 'ready') {
      playGo()
      setActive({ ...a, phase: 'running' })
      start(a.total)
      return
    }
    playBeep()

    // A warm-up goes straight into its next set; the beep says change pace.
    if (a.kind === 'warmup' && a.set < a.sets) {
      const part = a.parts[a.set]
      setActive({ ...a, set: a.set + 1, title: warmupSetLabel(part), total: part.minutes * 60000 })
      start(part.minutes * 60000)
      return
    }
    // A rest between stretch sets ends by waiting for Start, like a side switch.
    if (a.phase === 'rest') {
      setActive({ ...a, phase: 'switch' })
      return
    }
    // A stretch timed hold by hold: tick this one; more to go waits for
    // Start (switch sides), or rests first when a set ends.
    if (a.kind === 'stretch' && a.hold != null && a.hold + 1 < a.holds) {
      if (!store.getStretchHolds(workoutId, a.stretchId, a.holds)[a.hold]) store.toggleStretchHold(workoutId, a.stretchId, a.hold, a.holds)
      if ((a.hold + 1) % a.holdSides === 0 && a.holdRest > 0) {
        setActive({ ...a, phase: 'rest', restTotal: a.holdRest * 1000 })
        start(a.holdRest * 1000)
      } else {
        setActive({ ...a, phase: 'switch' })
      }
      return
    }
    // Between sides it waits for you to reposition and tap Start.
    if (a.side < a.sides) {
      setActive({ ...a, phase: 'switch' })
      return
    }
    // Between sets: rest first (if set), then wait for Start.
    if (a.set < a.sets) {
      if (a.rest > 0) {
        setActive({ ...a, phase: 'rest', restTotal: a.rest * 1000 })
        start(a.rest * 1000)
      } else {
        setActive({ ...a, phase: 'switch' })
      }
      return
    }

    if (a.kind === 'hold') {
      const all = store.getLog(workoutId, a.exercise).all
      const set = all.find(x => x.part === a.part && x.index === a.index)
      if (set && !set.done) {
        if (a.part < 0) store.toggleSet(workoutId, a.exercise, a.index)
        else store.togglePartSet(workoutId, a.exercise, a.part, a.index)
      }
      const left = all.filter(x => !x.done && x !== set).length
      if (startRest(a, a.exercise, left)) return // rolls straight into rest
      // The last hold done: fold its card, as ticking the last set does.
      if (left === 0) fold.current?.(workoutId, a.exercise.id)
    }
    if (a.kind === 'warmup') store.setWarmupDone(workoutId, true)
    if (a.kind === 'stretch') {
      // One hold timed from its row ticks just that hold.
      if (a.hold != null) {
        if (!store.getStretchHolds(workoutId, a.stretchId, a.holds)[a.hold]) store.toggleStretchHold(workoutId, a.stretchId, a.hold, a.holds)
      } else if (!store.getStretchDone(workoutId, a.stretchId)) store.toggleStretch(workoutId, a.stretchId)
    }

    // Finished: it stays, saying so, until you tap Done.
    setActive({ ...a, phase: 'over' })
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

  // Holds, stretches and warm-ups count you in first (Settings › Get-ready
  // time); a rest starts right away.
  const prepMs = () => stores.current(null).timer.prep * 1000
  // `at`: { workoutId, weekStart } the timer belongs to. A rest starts at
  // once; anything else waits for Go (see begin), unless `now`.
  function run(at, timer, now = timer.kind === 'rest') {
    unlockAudio()
    clock.stop()
    setActive({ id: ++timerSeq, side: 1, sides: 1, set: 1, sets: 1, phase: 'armed', workoutId: at.workoutId, weekStart: at.weekStart, ...timer })
    if (now) begin(timer)
  }

  // Go: the count-in first (Settings › Get-ready time), then the timer.
  function begin(timer = active) {
    unlockAudio()
    const ready = timer.kind !== 'rest' && prepMs() > 0
    setActive(a => ({ ...a, phase: ready ? 'ready' : 'running' }))
    clock.start(ready ? prepMs() : timer.total)
  }

  function stop() {
    clock.stop()
    setActive(null)
    setFull(false)
  }

  // Starts the exercise's rest, if it has one turned on and a set is still
  // left — no rest after the last set. Returns whether it did.
  function startRest(at, exercise, setsLeft) {
    const setup = storeOf(at).getSetup(exercise)
    if (setsLeft === 0) {
      // Finished early, mid-rest: that rest no longer applies.
      if (active?.kind === 'rest' && active.workoutId === at.workoutId && active.exercise?.id === exercise.id) stop()
      return false
    }
    if (!setup.restOn) return false
    run(at, { kind: 'rest', title: exercise.name, total: setup.rest * 1000, exercise })
    return true
  }

  // Times `picked` (a set's own clock), or the next hold not done (split
  // cards included), from that set's seconds.
  function startHold(at, exercise, picked, now = false) {
    const store = storeOf(at)
    const all = store.getLog(at.workoutId, exercise).all
    const set = picked ?? all.find(x => !x.done) ?? all[0]
    run(at, {
      kind: 'hold',
      title: exercise.name,
      total: set.reps * 1000,
      sides: store.getSetup(exercise).perSide ? 2 : 1,
      exercise,
      part: set.part,
      index: set.index,
    }, now)
  }

  // Runs the warm-up's sets back to back (see the countdown's end above).
  function startWarmup(at, parts) {
    run(at, { kind: 'warmup', title: warmupSetLabel(parts[0]), total: parts[0].minutes * 60000, sets: parts.length, parts })
  }

  function startStretch(at, stretch) {
    run(at, {
      kind: 'stretch',
      title: stretch.name,
      total: stretch.duration * 1000,
      sides: stretch.perSide ? 2 : 1,
      sets: stretch.sets,
      rest: stretch.rest,
      stretchId: stretch.id,
      hold: stretch.hold,
      holds: stretch.holds,
      holdSides: stretch.holdSides,
      holdSets: stretch.holdSets,
      holdRest: stretch.holdRest,
      baseDuration: stretch.baseDuration,
    })
  }

  // Skips the rest of the count-in.
  function goNow() {
    playGo()
    setActive(a => ({ ...a, phase: 'running' }))
    clock.start(active.total)
  }

  // "Start" between rounds: the next side, or side 1 of the next set, after
  // the same count-in.
  function startNextSide() {
    unlockAudio()
    const phase = prepMs() > 0 ? 'ready' : 'running'
    const total = freshTotal(active)
    setActive(a => (a.hold != null ? { ...a, hold: a.hold + 1, phase, total }
      : a.side < a.sides ? { ...a, side: a.side + 1, phase, total }
        : { ...a, set: a.set + 1, side: 1, phase, total }))
    clock.start(prepMs() > 0 ? prepMs() : total)
  }

  // A stretch's hold time as it is now, so changing the next hold while
  // this one runs is what it gets.
  function freshTotal(a) {
    if (a.kind !== 'stretch' || !a.stretchId) return a.total
    return storeOf(a).getCustomDuration(a.stretchId, a.baseDuration ?? a.total / 1000) * 1000
  }

  // Back to the start of this hold or side, running.
  // Back to the start of this hold or side (or this rest), running.
  function restart() {
    unlockAudio()
    if (active.phase === 'rest') return clock.start(active.restTotal)
    setActive(a => ({ ...a, phase: 'running' }))
    clock.start(active.total)
  }

  // Whether there's another side of this set, or another set (or warm-up
  // part) after this one.
  // ⏪ while waiting for the next side or set: do the one just finished again.
  // Going back to a stretch's hold takes its tick off, since it's being
  // done again.
  function untick(a, hold) {
    if (a.kind !== 'stretch' || hold == null) return
    const store = storeOf(a)
    if (store.getStretchHolds(a.workoutId, a.stretchId, a.holds)[hold]) store.toggleStretchHold(a.workoutId, a.stretchId, hold, a.holds)
  }

  function redo() {
    unlockAudio()
    untick(active, active.hold)
    const ready = prepMs() > 0
    const total = freshTotal(active)
    setActive(a => ({ ...a, phase: ready ? 'ready' : 'running', total }))
    clock.start(ready ? prepMs() : total)
  }

  // ⏪ Back: the hold before this one (side, set, or warm-up part), from
  // its count-in. Ticks stay as they are.
  const hasPrev = !!active && active.kind !== 'rest' && (active.hold != null ? active.hold > 0 : active.side > 1 || active.set > 1)
  function goBack() {
    unlockAudio()
    const a = active
    if (a.kind === 'warmup') {
      const part = a.parts[a.set - 2]
      setActive({ ...a, set: a.set - 1, title: warmupSetLabel(part), total: part.minutes * 60000, phase: 'running' })
      clock.start(part.minutes * 60000)
      return
    }
    const ready = prepMs() > 0
    const phase = ready ? 'ready' : 'running'
    const total = freshTotal(a)
    if (a.hold != null) untick(a, a.hold - 1)
    setActive(a.hold != null ? { ...a, hold: a.hold - 1, phase, total }
      : a.side > 1 ? { ...a, side: a.side - 1, phase, total }
        : { ...a, set: a.set - 1, side: a.sides, phase, total })
    clock.start(ready ? prepMs() : total)
  }

  // ⏩ Done: this hold counts as finished, and it moves straight on to
  // what comes next (the other side, the rest between sets, the next set),
  // or ends as if the time ran out.
  function completeNow() {
    const a = active
    const store = storeOf(a)
    // A stretch's single hold, timed from its row: tick it, then the next row.
    if (a.kind === 'stretch' && a.hold != null) {
      if (!store.getStretchHolds(a.workoutId, a.stretchId, a.holds)[a.hold]) store.toggleStretchHold(a.workoutId, a.stretchId, a.hold, a.holds)
      if (a.hold + 1 >= a.holds) return finishNow()
      // Into a new set: its rest first, then Start.
      if ((a.hold + 1) % a.holdSides === 0 && a.holdRest > 0) {
        setActive({ ...a, phase: 'rest', restTotal: a.holdRest * 1000 })
        clock.start(a.holdRest * 1000)
        return
      }
      return startNextSide()
    }
    if (a.kind === 'warmup' && a.set < a.sets) {
      const part = a.parts[a.set]
      setActive({ ...a, set: a.set + 1, title: warmupSetLabel(part), total: part.minutes * 60000, phase: 'running' })
      clock.start(part.minutes * 60000)
      return
    }
    if (a.side < a.sides) return startNextSide()
    if (a.set < a.sets) {
      if (a.rest > 0) {
        setActive({ ...a, phase: 'rest', restTotal: a.rest * 1000 })
        clock.start(a.rest * 1000)
        return
      }
      return startNextSide()
    }
    finishNow()
  }
  // The last of it: let the time run out now, so it ticks off as usual.
  function finishNow() {
    setActive(x => ({ ...x, phase: 'running' }))
    clock.start(0)
  }

  // "Start" after a rest: a hold begins its next countdown; for reps it just
  // clears the bar so you can lift.
  function startNextSet() {
    const exercise = active?.exercise
    if (exercise && storeOf(active).getSetup(exercise).mode === 'hold') startHold(active, exercise, null, true)
    else stop()
  }

  // What comes after a rest, read live so ticking during the rest updates it.
  let next = null
  if (active?.kind === 'rest' && active.exercise) {
    const sets = storeOf(active).getLog(active.workoutId, active.exercise).all
    const index = sets.findIndex(x => !x.done)
    next = { complete: index === -1, set: index + 1, of: sets.length }
  }

  // Everything the bar needs (see TimerBar).
  const bar = active && {
    full,
    onFull: setFull,
    timer: active,
    next,
    remaining: clock.remaining,
    running: clock.running,
    onPause: clock.pause,
    onResume: () => { unlockAudio(); clock.resume() },
    onAdd: () => {
      clock.add(30000)
      setActive(a => (a.phase === 'rest' ? { ...a, restTotal: a.restTotal + 30000 } : { ...a, total: a.total + 30000 }))
    },
    onSkipRest: () => { clock.stop(); setActive(a => ({ ...a, phase: 'switch' })) },
    onGo: goNow,
    onBegin: () => begin(),
    onRestart: restart,
    // ⏩: the other side if there is one, else the next set.
    // ⏪ waiting or resting between holds: the one just done again.
    onBack: ['switch', 'rest'].includes(active.phase) ? redo : hasPrev ? goBack : null,
    onNextSet: completeNow,
    nextLabel: 'Done, next',
    onClose: stop,
    onStart: active.phase === 'switch' ? startNextSide : startNextSet,
  }

  return { active, bar, onFold, stop, startRest, startHold, startWarmup, startStretch }
}
