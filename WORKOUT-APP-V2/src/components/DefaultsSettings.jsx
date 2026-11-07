import { useState } from 'react'
import { GROUPS, IDS, names } from '../utils/defaults'

// Each plan's default, the one every new week (or every new one) starts
// from: whether you've changed it from how the app came. Tap an edited one
// for what you added and took out, and Restore to put it back. Changing one
// happens on its own screen, with Every week.
export function DefaultsSettings({ store }) {
  // The edited one opened, and the one asking "Restore?" ('all' for every
  // one).
  const [open, setOpen] = useState(null)
  const [asking, setAsking] = useState(null)
  const edited = IDS.filter(id => store.defaultEdits(id).edited)
  function restoreAll() {
    edited.forEach(store.restoreDefault)
    setAsking(null)
  }
  const confirm = (id, onRestore) => asking === id && <Confirm onRestore={onRestore} onCancel={() => setAsking(null)} />

  return (
    <>
      <p className="px-1 text-xs text-stone-500 leading-relaxed">To change one, open it and pick Every week.</p>
      {GROUPS.map(([title, rows]) => (
        <div key={title} className="space-y-1">
          <p className="px-1 pt-1 text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
          <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
            {rows.map(([id, name]) => {
              const e = store.defaultEdits(id)
              const lists = [...e.exercises.added, ...e.stretches.added].length || [...e.exercises.dropped, ...e.stretches.dropped].length
              return (
                <Row
                  key={id}
                  name={name}
                  edited={e.edited}
                  open={open === id}
                  onToggle={() => { setOpen(o => (o === id ? null : id)); setAsking(null) }}
                  onRestore={asking === id ? null : () => setAsking(id)}
                >
                  <Changes added={[...e.exercises.added, ...e.stretches.added]} dropped={[...e.exercises.dropped, ...e.stretches.dropped]} />
                  {!lists && <p className="text-[13px] text-stone-500">Order changed</p>}
                  {confirm(id, () => { store.restoreDefault(id); setAsking(null); setOpen(null) })}
                </Row>
              )
            })}
          </div>
        </div>
      ))}
      {edited.length > 0 && (
        asking === 'all' ? (
          <Confirm all onRestore={restoreAll} onCancel={() => setAsking(null)} />
        ) : (
          <button onClick={() => setAsking('all')} className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 active:bg-orange-100 transition-colors">
            Restore all originals
          </button>
        )
      )}
    </>
  )
}

// One default: its name and Original, or Edited, which opens to what
// changed and Restore.
function Row({ name, edited, open, onToggle, onRestore, children }) {
  if (!edited) {
    return (
      <div className="py-2.5 flex items-center gap-2">
        <p className="flex-1 min-w-0 text-base text-stone-700">{name}</p>
        <span className="text-sm text-stone-400">Original</span>
      </div>
    )
  }
  return (
    <div className="py-2.5 space-y-1">
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2 text-left active:opacity-70">
        <p className="flex-1 min-w-0 text-base text-stone-700">{name}</p>
        <span className="text-sm text-red-500">Edited</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-stone-300 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {open && (
        <div className="space-y-1 pb-0.5">
          {children}
          {onRestore && <button onClick={onRestore} className="pt-1 text-sm font-semibold text-accent-500 active:opacity-70">Restore original</button>}
        </div>
      )}
    </div>
  )
}

function Changes({ added, dropped }) {
  return (
    <>
      {added.length > 0 && <p className="text-[13px] text-stone-500"><span className="font-semibold text-emerald-700">+</span> {names(added)}</p>}
      {dropped.length > 0 && <p className="text-[13px] text-stone-500"><span className="font-semibold text-red-600">−</span> {names(dropped)}</p>}
    </>
  )
}

// Asks before putting it (or all of them) back as the app came.
function Confirm({ all, onRestore, onCancel }) {
  const btn = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors'
  return (
    <div className="rounded-xl bg-white px-3 py-3 space-y-2.5 shadow-sm">
      <p className="text-sm text-stone-600 leading-relaxed">
        {all ? 'Next week, everything starts from the original.' : 'Next week starts from the original.'} This week won’t change.
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>Cancel</button>
        <button onClick={onRestore} className={`${btn} bg-orange-600 text-white active:bg-orange-700`}>Restore</button>
      </div>
    </div>
  )
}
