import { COOL_DOWNS } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { CardHead, CARD } from './cards'
import { UnderWay, InProgressLine } from './sessions'
import { Part } from './lines'

// A cool-down's progress this week: how many of its stretches are ticked.
function coolProgress(store, id) {
  const list = store.getStretches(id)
  const done = list.filter(x => store.getStretchDone(id, x.id)).length
  return { list, done, complete: list.length > 0 && done === list.length }
}

// Stretches for after cardio, which can be done more than once a week.
// Tapping asks what you just did. Each one under way gets an IN PROGRESS
// line (tap it to carry on).
export function CoolDownCard({ store, onOpen }) {
  // Under way from when it's opened (see begin), not just once one's ticked.
  const going = COOL_DOWNS.map(c => ({ ...c, ...coolProgress(store, c.id) })).filter(c => (c.done > 0 || !!store.currentSession(c.id).checks?.openedAt) && !c.complete)
  return (
    <div className={CARD}>
      <CardHead icon="stretch" tile="from-teal-50 to-teal-100" value={going[0] ? going[0].done / going[0].list.length : 0} fill="stroke-teal-400" title="Cool Down" sub="After a walk, run, bike, swim, row or elliptical" onClick={() => onOpen(null)} />
      <UnderWay>
        {going.map(c => (
          <InProgressLine key={c.id} label={`Cool Down · ${c.label}`} onOpen={() => onOpen(c.id)}>
            <Part kind="stretch">{c.done}/{c.list.length} stretches</Part>
          </InProgressLine>
        ))}
      </UnderWay>
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
