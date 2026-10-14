import { COOL_DOWNS } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { TileIcon } from '../ui/Icons'

// A cool-down's progress this week: how many of its stretches are ticked.
function coolProgress(store, id) {
  const list = store.getStretches(id)
  const done = list.filter(x => store.getStretchDone(id, x.id)).length
  return { list, done, complete: list.length > 0 && done === list.length }
}

// Stretches for after cardio. Until you start one it lists the choices and
// tapping asks what you did; once one is under way it shows that one and
// opens straight to it.
export function CoolDownCard({ store, onOpen }) {
  const all = COOL_DOWNS.map(c => ({ ...c, ...coolProgress(store, c.id) }))
  const current = all.find(c => c.done > 0 && !c.complete) ?? all.find(c => c.complete)
  const inProgress = current && !current.complete
  return (
    <button onClick={() => onOpen(inProgress ? current.id : null)} className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shrink-0">
            <TileIcon id="stretch" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">
              Cool Down
              {current?.complete && <span className="text-emerald-600 ml-1.5">✓</span>}
            </p>
            <p className="text-sm text-stone-400 truncate">
              {current
                ? `${current.label} · ${current.list.length} stretches · ${store.getListMinutes(current.id)} min`
                : 'After a walk, run, bike, swim or row'}
            </p>
          </div>
        </div>
        {current ? (
          <div className="text-right shrink-0">
            <span className="text-sm font-medium text-stone-500">{current.done}/{current.list.length}</span>
            <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${current.complete ? 'bg-emerald-400' : 'bg-teal-400'}`}
                style={{ width: `${(current.done / current.list.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
        )}
      </div>
    </button>
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
            <button key={c.id} onClick={() => onPick(c.id)} className="w-full flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">
                  {c.label}
                  {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
                </span>
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
