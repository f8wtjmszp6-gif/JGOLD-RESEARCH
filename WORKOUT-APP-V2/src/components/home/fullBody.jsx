import { FULL_BODY } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { CardHead, CARD } from './cards'
import { UnderWay, InProgressLine } from './sessions'
import { Part } from './lines'
import { cardioMinutes } from '../../utils/format'

// A full-body day's progress: sets and stretches ticked, and whether it's
// under way.
function progressOf(store, id) {
  const { done, total } = store.workoutProgress(id)
  const stretches = store.getStretches(id)
  const stretched = stretches.filter(x => store.getStretchDone(id, x.id)).length
  const complete = total > 0 && done === total
  const begun = !!store.currentSession(id).checks?.openedAt || done > 0 || stretched > 0
  const w = store.getWarmup(id)
  return { done, total, stretches: stretches.length, stretched, underWay: begun && !complete, warmup: w.on ? w.sets : null }
}

// Full Body, ready to go: every muscle, from your defaults (Settings ›
// Defaults), at the gym or at home. Any day, as often as you like. Tapping
// asks where; each one under way gets an IN PROGRESS line.
export function FullBodyCard({ store, onOpen }) {
  const going = FULL_BODY.map(p => ({ ...p, ...progressOf(store, p.id) })).filter(p => p.underWay)
  return (
    <div className={CARD}>
      <CardHead icon="fullBody" tile="from-rose-50 to-rose-100" value={going[0]?.total ? going[0].done / going[0].total : 0} fill="stroke-rose-400" title="Full Body" sub="Every muscle" onClick={() => onOpen(null)} />
      <UnderWay>
        {going.map(p => (
          <InProgressLine key={p.id} label={`Full Body · ${p.label}`} onOpen={() => onOpen(p.id)}>
            <Part kind="gym">{p.done}/{p.total} sets</Part>
            {p.warmup && <Part kind="cardio">{cardioMinutes(p.warmup)}</Part>}
            <Part kind="stretch">{p.stretched}/{p.stretches} stretches</Part>
          </InProgressLine>
        ))}
      </UnderWay>
    </div>
  )
}

// Where you're working out: each full-body day with what's in it.
export function FullBodySheet({ store, onPick, onClose }) {
  return (
    <SettingsSheet title="Full Body" closeLabel="Cancel" onClose={onClose}>
      <p className="text-sm text-stone-500 -mt-1">What do you have to work with?</p>
      <div className="space-y-2">
        {FULL_BODY.map(p => {
          const { main, core } = store.getExerciseSections(p.id)
          const { done, underWay } = progressOf(store, p.id)
          return (
            <button key={p.id} onClick={() => { store.begin(p.id); onPick(p.id) }} className="w-full flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">{p.label}</span>
                <span className="block text-sm text-stone-400">
                  {main.length + core.length} exercises · {store.getStretches(p.id).length} stretches{underWay && done > 0 ? ` · ${done} sets done` : ''}
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )
        })}
      </div>
    </SettingsSheet>
  )
}
