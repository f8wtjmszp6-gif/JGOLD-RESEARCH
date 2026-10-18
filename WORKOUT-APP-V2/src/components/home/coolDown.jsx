import { COOL_DOWNS } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { CardIcon, Counts, Of, CARD } from './cards'
import { SessionLines } from './sessions'

// A cool-down's progress this week: how many of its stretches are ticked.
function coolProgress(store, id) {
  const list = store.getStretches(id)
  const done = list.filter(x => store.getStretchDone(id, x.id)).length
  return { list, done, complete: list.length > 0 && done === list.length }
}

const IDS = COOL_DOWNS.map(c => c.id)

// Stretches for after cardio, which can be done more than once a week. The
// one under way shows on top and opens straight to it; with none under way,
// tapping asks what you just did. Each finished one gets a line with its
// day (see SessionLines).
export function CoolDownCard({ store, onOpen, onEditSession }) {
  const current = COOL_DOWNS.map(c => ({ ...c, ...coolProgress(store, c.id) })).find(c => c.done > 0 && !c.complete)
  return (
    <div className={CARD}>
      <button onClick={() => onOpen(current?.id ?? null)} aria-label={current ? `Cool Down, ${current.label} under way` : 'Cool Down'} className="w-full text-left transition-all active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <CardIcon icon="stretch" tile="from-teal-50 to-teal-100" value={current ? current.done / current.list.length : 0} fill="stroke-teal-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 truncate">Cool Down</p>
            <p className="text-sm text-stone-400 truncate">{current ? current.label : 'After a walk, run, bike, swim or row'}</p>
          </div>
          {current ? (
            <Counts>
              <p><Of n={current.done} of={current.list.length} /> stretches</p>
              <p>{store.getListMinutes(current.id)} min</p>
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

// Picks which cool-down to do: you say what you just did.
export function CoolDownSheet({ store, onPick, onClose }) {
  return (
    <SettingsSheet title="Cool Down" closeLabel="Cancel" onClose={onClose}>
      <p className="text-sm text-stone-500 -mt-1">What did you just do?</p>
      <div className="space-y-2">
        {COOL_DOWNS.map(c => {
          const { list, done, complete } = coolProgress(store, c.id)
          return (
            <button key={c.id} onClick={() => { store.startAgain(c.id); onPick(c.id) }} className="w-full flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">{c.label}</span>
                <span className="block text-sm text-stone-400">
                  {list.length} stretches · {store.getListMinutes(c.id)} min{done > 0 && !complete ? ` · ${done} done` : ''}
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
