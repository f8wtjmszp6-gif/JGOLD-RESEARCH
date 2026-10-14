import { FULL_BODY } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { TileIcon } from '../ui/Icons'

// A full-body day's progress this week: sets and stretches ticked.
function fullProgress(store, id) {
  const { done, total, exercises } = store.workoutProgress(id)
  const stretches = store.getStretches(id)
  const stretched = stretches.filter(x => store.getStretchDone(id, x.id)).length
  return { done, total, exercises, stretches: stretches.length, stretched, complete: total > 0 && done === total, started: done > 0 || stretched > 0 }
}

// One card for both full-body days. Until you start one it asks gym or home;
// once one is under way it shows that one and opens straight to it.
export function FullBodyCard({ store, onOpen }) {
  const all = FULL_BODY.map(p => ({ ...p, ...fullProgress(store, p.id) }))
  const current = all.find(p => p.started && !p.complete) ?? all.find(p => p.complete)
  const inProgress = current && !current.complete
  return (
    <button onClick={() => onOpen(inProgress ? current.id : null)} className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
            <TileIcon id="fullBody" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">
              Full Body Workout
              {current?.complete && <span className="text-emerald-600 ml-1.5">✓</span>}
            </p>
            <p className="text-sm text-stone-400 truncate">
              {current
                ? `${current.label} · ${current.done}/${current.total} sets · ${current.stretched}/${current.stretches} stretches`
                : 'At the gym or at home'}
            </p>
          </div>
        </div>
        {current ? (
          <div className="shrink-0 w-16 h-1 bg-stone-100 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${current.complete ? 'bg-emerald-400' : 'bg-orange-400'}`}
              style={{ width: `${current.total ? (current.done / current.total) * 100 : 0}%` }}
            />
          </div>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
        )}
      </div>
    </button>
  )
}

// Picks which full-body day: where you're working out.
export function FullBodySheet({ store, onPick, onClose }) {
  return (
    <SettingsSheet title="Full Body Workout" closeLabel="Cancel" onClose={onClose}>
      <p className="text-sm text-stone-500 -mt-1">Where are you working out?</p>
      <div className="space-y-2">
        {FULL_BODY.map(p => {
          const { exercises, complete } = fullProgress(store, p.id)
          return (
            <button key={p.id} onClick={() => onPick(p.id)} className="w-full flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-left active:bg-stone-100">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
                <TileIcon id={p.id} size={26} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">
                  {p.label}
                  {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
                </span>
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
