import { useState } from 'react'
import { COOL_DOWNS, COOL_DOWN_BY_ID, FULL_BODY, GYM_ORDER, MUSCLE_GROUPS, STRETCH_ROUTINE, workouts } from '../data/workout'
import { STRETCH_AREAS, STRETCH_BANK, STRETCH_BY_ID } from '../data/stretches'
import { demoUrl, openDemo } from '../data/howto'
import { fmtSecs } from '../utils/format'
import { ConfirmSheet, SettingsSheet } from './ui/Sheet'
import { StepperRow, ToggleRow } from './ui/controls'
import { ArrowOut, HEAD_BTN, InfoLink, Picker, Row, Section } from './ExerciseBank'
import { ALL_MUSCLES, MUSCLES, google, muscleName } from '../utils/muscles'
import { InfoSheet } from './ui/InfoMark'
import { InfoIcon } from './ui/glyphs'

// Settings › Stretches: every stretch in the bank, to look up and add to a
// list. Search, or narrow by body area and the muscle it stretches. Tap one
// for what it reaches, how long it's held, and the lists it's in.

// Every list a stretch can go in: the gym plans, the full-body days, the
// Full Body Stretch and the cool-downs.
const LISTS = [...GYM_ORDER, ...FULL_BODY.map(p => p.id), STRETCH_ROUTINE.id, ...COOL_DOWNS.map(c => c.id)]
const listName = id => (id === STRETCH_ROUTINE.id ? STRETCH_ROUTINE.short : COOL_DOWN_BY_ID[id]?.name ?? workouts[id]?.short ?? id)
const areaName = id => STRETCH_AREAS.find(a => a.id === id)?.label ?? ''

function listsWith(store, id) {
  return LISTS.filter(l => store.getStretches(l).some(x => x.id === id))
}

export function StretchBank({ store, onClose }) {
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [muscle, setMuscle] = useState('')
  const [open, setOpen] = useState(null)
  const [planned, setPlanned] = useState(null) // null: all
  const [fresh, setFresh] = useState(null)
  function addNew() {
    const id = store.addCustomStretch()
    setFresh(id)
    setOpen(id)
  }
  const q = query.trim().toLowerCase()
  const inArea = area ? STRETCH_BANK.filter(x => x.area === area) : STRETCH_BANK
  const muscles = ALL_MUSCLES.filter(m => inArea.some(x => x.muscles.includes(m)))
  const shownList = (q ? STRETCH_BANK.filter(x => x.name.toLowerCase().includes(q)) : inArea)
    .filter(x => q || !muscle || x.muscles.includes(muscle))
  const used = new Set(LISTS.flatMap(l => store.getStretches(l).map(x => x.id)))
  const inPlan = shownList.filter(x => used.has(x.id))
  const shown = planned === null ? shownList : planned ? inPlan : shownList.filter(x => !used.has(x.id))

  return (
    <SettingsSheet title="Stretches" bare split full onClose={onClose}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Stretches</h2>
        <button onClick={addNew} aria-label="Add a stretch" className={`${HEAD_BTN} w-9 px-0 flex items-center justify-center`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button onClick={onClose} className={HEAD_BTN}>Done</button>
      </div>
      <label className="flex items-center gap-2 rounded-xl bg-stone-100 px-3.5 py-2.5 text-stone-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${STRETCH_BANK.length} stretches`}
          className="flex-1 min-w-0 bg-transparent text-base text-stone-900 placeholder:text-stone-400 outline-none select-text"
        />
      </label>
      {!q && (
        <div className="grid grid-cols-2 gap-1.5">
          <Picker label="Area" sheet value={area} onChange={v => { setArea(v); setMuscle('') }}
            options={[['', `All (${STRETCH_BANK.length})`], ...STRETCH_AREAS.map(a => [a.id, `${a.label} (${STRETCH_BANK.filter(x => x.area === a.id).length})`])]}
            shown={area ? areaName(area) : 'All'} />
          <Picker label="Stretches" sheet value={muscle} onChange={setMuscle}
            options={[['', 'Any'], ...muscles.map(m => [m, muscleName(m)])]} shown={muscle ? muscleName(muscle) : 'Any'} />
        </div>
      )}
      <div className="flex rounded-xl bg-stone-100 p-1" role="radiogroup" aria-label="In a plan or not">
        {[[null, 'All', shownList.length], [true, 'In a plan', inPlan.length], [false, 'Not in a plan', shownList.length - inPlan.length]].map(([v, text, n]) => (
          <button key={text} role="radio" aria-checked={planned === v} onClick={() => setPlanned(v)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${planned === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>
            {text} <span className="font-medium text-stone-400">{n}</span>
          </button>
        ))}
      </div>
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5">
        <div className="divide-y divide-stone-100">
          {shown.map(x => (
            <button key={x.id} onClick={() => setOpen(x.id)} className="w-full flex items-center gap-2.5 py-3 text-left active:bg-stone-50">
              <span className="flex-1 min-w-0 text-base text-stone-900">{x.name}</span>
              {x.custom && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500 shrink-0" role="img" aria-label="Added by you"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
        {!shown.length && <p className="py-3 text-sm text-stone-400">{shownList.length ? (planned ? 'None of these are in a plan.' : 'All of these are in a plan.') : 'Nothing matches.'}</p>}
      </div>
      {open && STRETCH_BY_ID[open] && (
        <StretchPage store={store} stretch={STRETCH_BY_ID[open]} fresh={fresh === open}
          onSaved={() => setFresh(null)} onClose={() => { setOpen(null); setFresh(null) }} />
      )}
    </SettingsSheet>
  )
}

// One stretch: its area and the muscles it reaches, and how it's held.
// Edit turns them into controls.
export function StretchPage({ store, stretch: x, fresh, popup = false, onSaved = () => {}, onClose }) {
  const [editing, setEditing] = useState(() => (fresh ? {} : null))
  const [blank, setBlank] = useState(() => (fresh ? ['area'] : []))
  const [deleting, setDeleting] = useState(false)
  const hold = store.getCustomDuration(x.id, x.duration)
  const perSide = store.getPerSide(x.id, x.perSide)
  const sets = store.getStretchSets(x.id)
  const rest = store.getStretchRest(x.id)
  const inLists = listsWith(store, x.id)
  const taken = x.custom && nameTaken(x)
  const ready = !x.custom || (x.name.trim() && !taken && !blank.length)

  function cancel() {
    if (fresh) {
      store.deleteCustomStretch(x.id)
      onClose()
    } else {
      store.restoreStretch(x.id, editing)
      setEditing(null)
    }
  }
  function save() {
    if (!ready) return
    if (fresh) {
      store.saveCustomStretch(x.id)
      onSaved()
    }
    setEditing(null)
  }
  return (
    <SettingsSheet title={x.name} bare split full={!popup} onClose={onClose}>
      <div className="flex items-center gap-2">
        <h3 className="flex-1 min-w-0 truncate text-lg font-bold text-stone-900">{x.name || 'New stretch'}</h3>
        {editing ? (
          <>
            <button onClick={cancel} className={HEAD_BTN}>Cancel</button>
            <button onClick={save} disabled={!ready} className={`${HEAD_BTN} disabled:text-stone-300`}>Save</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(store.stretchSnapshot(x.id))} className={HEAD_BTN}>Edit</button>
            <button onClick={onClose} className={HEAD_BTN}>Back</button>
          </>
        )}
      </div>
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2 space-y-6">
        {editing ? (
          <StretchEditor store={store} stretch={x} blank={blank} picked={f => setBlank(b => b.filter(v => v !== f))} />
        ) : (
          <Section title="Details">
            <Row label="Stretch group" value={areaName(x.area)} />
            <a href={demoUrl(x.name, 'stretch')} target="_blank" rel="noopener noreferrer" onClick={e => { e.preventDefault(); openDemo(x.name, 'stretch') }} className="flex items-center justify-between py-2.5 active:opacity-60">
              <span className="text-[15px] text-stone-600">How to do it</span>
              <span className="flex items-center gap-1 text-[15px] font-semibold text-accent-500">YouTube<ArrowOut /></span>
            </a>
          </Section>
        )}
        {!editing && x.muscles.length > 0 && (
          <Section title="Targets">
            <div className="py-1.5 text-[15px]">
              {x.muscles.map((m, i) => (
                <div key={m} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 min-w-0 truncate text-stone-900">{muscleName(m)}</span>
                  <span className="shrink-0 font-semibold text-stone-900">Rank {i + 1}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
        <Section title="Hold">
          {editing ? (
            <div className="py-3 space-y-4">
              <StepperRow label="Duration" value={hold} step={5} min={5} editable seconds onChange={v => store.setCustomDuration(x.id, v)} />
              <StepperRow label="Sets" value={sets} step={1} min={1} max={4} editable onChange={n => store.setStretchSets(x.id, Math.round(n))} />
              {sets > 1 && <StepperRow label="Rest between sets" value={rest} step={5} min={5} seconds onChange={v => store.setStretchRest(x.id, v)} />}
              <ToggleRow label="Per side" on={perSide} onChange={v => store.setPerSide(x.id, v)} />
            </div>
          ) : (
            <>
              <Row label="Duration" value={fmtSecs(hold)} />
              <Row label="Sets" value={String(sets)} />
              {sets > 1 && <Row label="Rest" value={fmtSecs(rest)} />}
              <Row label="Per side" value={perSide ? 'Yes' : 'No'} />
            </>
          )}
        </Section>
        {x.custom && !fresh && (
          <button onClick={() => setDeleting(true)} className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-[15px] font-semibold active:bg-red-100">
            Delete stretch
          </button>
        )}
      </div>

      {deleting && (
        <ConfirmSheet
          title={`Delete ${x.name}?`}
          body={(
            <>
              {[
                inLists.length ? `It comes out of ${inLists.map(listName).join(', ')}, this week and every week.` : "It's not in any plan.",
                'Its hold, sets and details are deleted.',
              ].map(t => <span key={t} className="block pl-3 -indent-3">• {t}</span>)}
            </>
          )}
          confirmLabel="Delete"
          onConfirm={() => { store.deleteCustomStretch(x.id); onClose() }}
          onClose={() => setDeleting(false)}
        />
      )}
    </SettingsSheet>
  )
}

// Details as controls: name (yours), area, and up to three muscles it
// stretches, the one it stretches most first.
function StretchEditor({ store, stretch: x, blank, picked }) {
  const [open, setOpen] = useState(false)
  const [rankInfo, setRankInfo] = useState(false)
  const muscles = x.muscles
  const edit = patch => store.setStretchEdit(x.id, patch)
  // Each rank goes to one muscle: picking a taken rank swaps with this
  // muscle's own (or takes it over), tapping its own rank clears it. Ranks
  // fill in order, so 3 waits for 2.
  function rank(m, r) {
    const next = [...muscles]
    const at = next.indexOf(m)
    if (at === r - 1) next.splice(at, 1)
    else if (at >= 0) { next[at] = next[r - 1]; next[r - 1] = m }
    else if (r - 1 < next.length) next[r - 1] = m
    else next.push(m)
    edit({ muscles: next })
  }
  const noArea = blank.includes('area')
  return (
    <div className="space-y-2">
      {x.custom && (
        <label className="block space-y-1.5 pb-3">
          <span className="block px-1 text-xs uppercase tracking-wider font-semibold text-stone-500">Name</span>
          <input
            value={x.name}
            onChange={e => store.renameCustomStretch(x.id, e.target.value)}
            placeholder="Stretch name"
            autoFocus={!x.name}
            className="w-full rounded-xl bg-stone-100 px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 outline-none select-text"
          />
          {nameTaken(x) && <span className="block px-1 text-sm text-red-600">There's already a stretch called that.</span>}
        </label>
      )}
      <p className="px-1 text-xs uppercase tracking-wider font-semibold text-stone-500">Details</p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <Picker label="Stretch group" value={x.area} blank={noArea} shown={areaName(x.area)}
          options={STRETCH_AREAS.map(a => [a.id, a.label])}
          info={<InfoLink href={google(`if you had to pick one: ${x.name} stretch body area: ${STRETCH_AREAS.map(a => a.label.toLowerCase()).join(', ')}`)} what={`What area ${x.name} stretches`} />}
          onChange={v => { picked('area'); edit({ area: v }) }} />
        <Picker label="Targets" blank={!muscles.length} blankText="Pick up to 3" shown="See table below" locked={noArea}
          info={<InfoLink href={google(`${x.name} top 3 muscles stretched (fewer if there aren't 3), most first, from: ${ALL_MUSCLES.map(m => muscleName(m).toLowerCase()).join(', ')}`)} what={`What muscles ${x.name} stretches`} />} onOpen={() => setOpen(true)} />
        {muscles.length > 0 && !noArea && (
          <div className="min-w-0 rounded-xl border border-stone-200 bg-white pl-2.5 pr-2 py-1.5">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-400">Stretches most first</p>
            <div className="text-[15px]">
              {muscles.map((m, i) => (
                <div key={m} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-5 h-5 shrink-0 rounded-md bg-stone-900 flex items-center justify-center text-[11px] font-bold text-white">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate text-stone-900">{muscleName(m)}</span>
                  <span className="shrink-0 text-sm text-stone-400">{MUSCLE_GROUPS.find(g => MUSCLES[g.id].includes(m))?.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {open && (
          <SettingsSheet title="Targets" closeLabel="Done" onClose={() => setOpen(false)}>
            <div className="rounded-xl bg-stone-50 pb-1">
              {MUSCLE_GROUPS.map(g => (
                <div key={g.id}>
                  <p className="px-2.5 pt-2.5 pb-0.5 text-[11px] uppercase tracking-wider font-semibold text-stone-400">{g.label}</p>
                  {MUSCLES[g.id].map(m => {
                    const at = muscles.indexOf(m)
                    return (
                      <div key={m} className="flex items-center gap-2 px-2.5 py-1.5">
                        <span className={`flex-1 min-w-0 truncate text-[15px] ${at >= 0 ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>{muscleName(m)}</span>
                        <span className="shrink-0 text-[11px] uppercase tracking-wider font-semibold text-stone-400" aria-hidden="true">Rank</span>
                        <div className="shrink-0 flex rounded-lg bg-stone-200/60 p-0.5" role="radiogroup" aria-label={`${muscleName(m)} rank`}>
                          {[1, 2, 3].map(r => (
                            <button key={r} role="radio" aria-checked={at === r - 1} onClick={() => rank(m, r)}
                              disabled={r > (at >= 0 ? muscles.length : muscles.length + 1)}
                              className={`w-8 py-1 rounded-md text-xs font-bold disabled:opacity-30 ${at === r - 1 ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setRankInfo(true)} aria-label="What rank means" className="w-7 h-7 -mr-1 shrink-0 flex items-center justify-center text-stone-400 active:text-stone-600"><InfoIcon size={16} /></button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </SettingsSheet>
        )}
        {rankInfo && (
          <InfoSheet title="Rank" text="Rank up to three muscles this stretch reaches." onClose={() => setRankInfo(false)}>
            <ul className="mt-3 space-y-2 text-sm text-stone-600 leading-relaxed">
              {[
                '1 is the muscle it stretches most.',
                'Each rank goes to one muscle.',
              ].map(t => <li key={t} className="pl-3 -indent-3">• {t}</li>)}
            </ul>
          </InfoSheet>
        )}
      </div>
    </div>
  )
}

const nameTaken = x => {
  const name = x.name.trim().toLowerCase()
  return !!name && STRETCH_BANK.some(e => e.id !== x.id && e.name.trim().toLowerCase() === name)
}
