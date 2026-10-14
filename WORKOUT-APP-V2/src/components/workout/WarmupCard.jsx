import { useState } from 'react'
import { warmupSetLabel } from '../../utils/format'
import { Chevron, CloseButton } from '../ui/glyphs'

// The warm-up at the top of a plan. Until it's added, a dashed "Add a
// warm-up" row. Added, a card of sets, each with its length and effort,
// run back to back by Start. Once ticked it folds to one line; tap to reopen.
export function WarmupCard({ workoutId, store, onStart }) {
  const [reopened, setReopened] = useState(false)
  const { on, sets } = store.getWarmup(workoutId)
  const done = store.getWarmupDone(workoutId)

  if (!on) {
    return (
      <button
        onClick={() => store.addWarmup(workoutId)}
        className="w-full flex items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-stone-300 px-4 py-3 text-left active:bg-stone-100"
      >
        <span className="text-accent-500 text-xl leading-none">+</span>
        <span className="font-semibold text-stone-500">Add a warm-up</span>
        <span className="ml-auto text-xs text-stone-400">counts as cardio</span>
      </button>
    )
  }

  const minutes = sets.reduce((n, x) => n + x.minutes, 0)
  const cardio = sets.reduce((n, x) => n + x.minutes * (x.hard ? 2 : 1), 0)
  const summary = sets.length === 1
    ? warmupSetLabel(sets[0])
    : `${minutes} min · ${sets.map(x => `${x.minutes} ${x.hard ? 'hard' : 'easy'}`).join(' + ')}`
  const toggle = () => {
    store.setWarmupDone(workoutId, !done)
    setReopened(false)
  }

  if (done && !reopened) {
    return (
      <button
        onClick={() => setReopened(true)}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-accent-50 border border-accent-200 text-left active:opacity-70"
      >
        <span className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        <span className="font-semibold text-accent-600">Warm-up</span>
        <span className="text-sm text-stone-500 ml-auto truncate">{summary}</span>
        <Chevron />
      </button>
    )
  }

  const effort = (x, i, hard) => (
    <button
      onClick={() => store.setWarmupSet(workoutId, i, { hard })}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${x.hard === hard ? 'bg-accent-500 text-white' : 'bg-white text-stone-500'}`}
    >
      {hard ? 'Hard' : 'Easy'}
    </button>
  )
  const step = 'w-8 h-8 rounded-lg bg-white flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 disabled:opacity-30'

  return (
    <div className="rounded-2xl p-4 bg-accent-50 border border-accent-200 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={toggle} className="shrink-0 active:scale-95 transition-transform" aria-label={done ? 'Untick warm-up' : 'Tick warm-up'}>
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${done ? 'border-accent-500 bg-accent-500' : 'border-accent-200 bg-white'}`}>
            {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-accent-600">{done ? 'Warm-up done' : 'Warm-up'}</p>
          <p className="text-sm text-stone-500">{summary} · {cardio} cardio min</p>
        </div>
        {!done && (
          <button onClick={onStart} className="px-4 h-9 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 shrink-0">
            Start
          </button>
        )}
        {done && <CloseButton label="warm-up" onClick={() => setReopened(false)} />}
      </div>

      <div className="space-y-1.5">
        {sets.map((x, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-white/60 px-2 py-1.5">
            <span className="w-4 text-xs font-semibold text-stone-400 text-center">{i + 1}</span>
            <button onClick={() => store.setWarmupSet(workoutId, i, { minutes: x.minutes - 1 })} disabled={x.minutes <= 1} className={step} aria-label={`Set ${i + 1} shorter`}>−</button>
            <span className="w-12 text-center text-sm font-bold text-stone-900">{x.minutes} min</span>
            <button onClick={() => store.setWarmupSet(workoutId, i, { minutes: x.minutes + 1 })} disabled={x.minutes >= 60} className={step} aria-label={`Set ${i + 1} longer`}>+</button>
            <span className="flex gap-1 ml-1">{effort(x, i, false)}{effort(x, i, true)}</span>
            {sets.length > 1 && (
              <button onClick={() => store.removeWarmupSet(workoutId, i)} className="ml-auto w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center active:bg-white" aria-label={`Remove set ${i + 1}`}>✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => store.addWarmupSet(workoutId)} className="text-xs font-semibold text-accent-500 active:opacity-60">+ Add set</button>
        <button onClick={() => store.removeWarmup(workoutId)} className="ml-auto text-xs font-medium text-stone-400 active:text-stone-600">Remove warm-up</button>
      </div>
    </div>
  )
}
