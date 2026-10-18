import { FULL_BODY } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { CardIcon, Counts, Of, CARD } from './cards'
import { SessionLines } from './sessions'

// A full-body day's progress this week: sets and stretches ticked.
function fullProgress(store, id) {
  const { done, total, exercises } = store.workoutProgress(id)
  const stretches = store.getStretches(id)
  const stretched = stretches.filter(x => store.getStretchDone(id, x.id)).length
  return { done, total, exercises, stretches: stretches.length, stretched, complete: total > 0 && done === total, started: done > 0 || stretched > 0 }
}

const IDS = FULL_BODY.map(p => p.id)

// One card for the full-body days, which can be done more than once a week.
// The one under way shows on top and opens straight to it; with none under
// way, tapping asks gym or home. Each finished one gets a line with its day
// (see SessionLines).
export function FullBodyCard({ store, onOpen, onEditSession }) {
  const current = FULL_BODY.map(p => ({ ...p, ...fullProgress(store, p.id) })).find(p => p.started && !p.complete)
  return (
    <div className={CARD}>
      <button onClick={() => onOpen(current?.id ?? null)} aria-label={current ? `Full Body Workout, ${current.label} under way` : 'Full Body Workout'} className="w-full text-left transition-all active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <CardIcon icon="fullBody" tile="from-orange-50 to-orange-100" value={current?.total ? current.done / current.total : 0} fill="stroke-orange-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 truncate">Full Body Workout</p>
            <p className="text-sm text-stone-400 truncate">{current ? current.label : 'At the gym or at home'}</p>
          </div>
          {current ? (
            <Counts>
              <p><Of n={current.done} of={current.total} /> sets</p>
              <p><Of n={current.stretched} of={current.stretches} /> stretches</p>
            </Counts>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          )}
        </div>
      </button>
      <SessionLines list={store.sessionsFor(IDS)} onMenu={onEditSession} />
    </div>
  )
}

// Picks which full-body day: what you're working out with. Any can be picked
// again; a finished one is filed and a fresh one starts.
export function FullBodySheet({ store, onPick, onClose }) {
  return (
    <SettingsSheet title="Full Body Workout" closeLabel="Cancel" onClose={onClose}>
      <div className="space-y-2">
        {FULL_BODY.map(p => {
          const { exercises } = fullProgress(store, p.id)
          return (
            <button key={p.id} onClick={() => { store.startAgain(p.id); onPick(p.id) }} className="w-full flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">{p.label}</span>
                <span className="block text-sm text-stone-400">{exercises} exercises</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )
        })}
      </div>
    </SettingsSheet>
  )
}
