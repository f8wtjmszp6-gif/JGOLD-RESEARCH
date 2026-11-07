import { useState } from 'react'
import { GROUPS, IDS, nameOf } from '../utils/defaults'
import { SettingsSheet } from './ui/Sheet'

// Each plan's default, the one every new week (or every new one) starts
// from: whether you've changed it from how the app came. Tap an edited one
// for its exercises and stretches as they are now, with what you added and
// took out, and Restore to put it back. Changing one happens on its own
// screen, with Every week.
export function DefaultsSettings({ store }) {
  // The edited one open in its pop-up, and whether Restore all is asking.
  const [open, setOpen] = useState(null)
  const [askingAll, setAskingAll] = useState(false)
  const edited = IDS.filter(id => store.defaultEdits(id).edited)
  function restoreAll() {
    edited.forEach(store.restoreDefault)
    setAskingAll(false)
  }
  const names = Object.fromEntries(GROUPS.flatMap(([, rows]) => rows))

  return (
    <>
      <p className="px-1 text-xs text-stone-500 leading-relaxed">To change one, open it and pick Every week.</p>
      {GROUPS.map(([title, rows]) => (
        <div key={title} className="space-y-1">
          <p className="px-1 pt-1 text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
          <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
            {rows.map(([id, name]) => (
              <Row key={id} name={name} edited={store.defaultEdits(id).edited} onOpen={() => setOpen(id)} />
            ))}
          </div>
        </div>
      ))}
      {edited.length > 0 && (
        askingAll ? (
          <Confirm all onRestore={restoreAll} onCancel={() => setAskingAll(false)} />
        ) : (
          <button onClick={() => setAskingAll(true)} className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 active:bg-orange-100 transition-colors">
            Restore all originals
          </button>
        )
      )}
      {open && (
        <EditsSheet
          name={names[open]}
          edits={store.defaultEdits(open)}
          onRestore={() => { store.restoreDefault(open); setOpen(null) }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

// One default: its name and Original, or Edited, which opens its pop-up.
function Row({ name, edited, onOpen }) {
  if (!edited) {
    return (
      <div className="py-2.5 flex items-center gap-2">
        <p className="flex-1 min-w-0 text-base text-stone-700">{name}</p>
        <span className="text-sm text-stone-400">Original</span>
      </div>
    )
  }
  return (
    <button onClick={onOpen} className="w-full py-2.5 flex items-center gap-2 text-left outline-none active:opacity-70">
      <p className="flex-1 min-w-0 text-base text-stone-700">{name}</p>
      <span className="text-sm text-red-500">Edited</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

// An edited default: its exercises, then its stretches, as every week has
// them, what you added or moved marked and what you took out struck
// through, and Restore (which asks first).
function EditsSheet({ name, edits, onRestore, onClose }) {
  const [asking, setAsking] = useState(false)
  const sections = [['Exercises', 'exercises'], ['Stretches', 'stretches']]
    .filter(([, k]) => edits.lists[k].length || edits[k].dropped.length)
  return (
    <SettingsSheet title={name} tall onClose={onClose}>
      {sections.map(([title, k]) => (
        <div key={k} className="space-y-1">
          <p className="px-1 text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
          <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
            {edits.lists[k].map(id => (
              <div key={id} className="py-2.5 flex items-center gap-2">
                <p className="flex-1 min-w-0 text-base text-stone-700">{nameOf(id)}</p>
                {edits[k].added.includes(id) && <span className="text-sm text-emerald-600">Added</span>}
                {edits[k].moved.includes(id) && <span className="text-sm text-stone-400">Moved</span>}
              </div>
            ))}
            {edits[k].dropped.map(id => (
              <div key={id} className="py-2.5 flex items-center gap-2">
                <p className="flex-1 min-w-0 text-base text-stone-400 line-through">{nameOf(id)}</p>
                <span className="text-sm text-red-500">Removed</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {asking ? (
        <Confirm onRestore={onRestore} onCancel={() => setAsking(false)} />
      ) : (
        <button onClick={() => setAsking(true)} className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 active:bg-orange-100 transition-colors">
          Restore original
        </button>
      )}
    </SettingsSheet>
  )
}

// Asks before putting it (or all of them) back as the app came.
function Confirm({ all, onRestore, onCancel }) {
  const btn = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors'
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-3 space-y-2.5">
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
