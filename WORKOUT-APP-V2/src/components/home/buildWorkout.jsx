import { useState } from 'react'
import { FULL_BODY, TARGETED } from '../../data/workout'
import { TARGET_AREAS, TARGET_EQUIPMENT, MUSCLE_LABEL, equipmentName } from '../../data/targeted'
import { SettingsSheet } from '../ui/Sheet'
import { BodyFigure } from '../week/MuscleMap'
import { CardHead, CARD } from './cards'
import { Part } from './lines'
import { cardioMinutes } from '../../utils/format'
import { UnderWay, InProgressLine } from './sessions'

// A full-body day's or targeted workout's progress this week: sets and
// stretches ticked, and whether it's under way (begun from here, or ticked).
function progressOf(store, id) {
  const { done, total, exercises } = store.workoutProgress(id)
  const stretches = store.getStretches(id)
  const stretched = stretches.filter(x => store.getStretchDone(id, x.id)).length
  const complete = total > 0 && done === total
  const begun = !!store.currentSession(id).checks?.openedAt || done > 0 || stretched > 0
  const w = store.getWarmup(id)
  // A built one's stretches still to pick count too.
  const toPick = id === TARGETED.id ? store.targeted.stretchSlots.length : 0
  return { done, total, exercises, stretches: stretches.length + toPick, stretched, complete, underWay: begun && !complete, warmup: w.on ? w.sets : null }
}

// The built one (Full Body has its own card).
const IDS = [TARGETED.id]
// The ready-made full-body plan for each kind of equipment.
const FULL_BODY_FOR = { gym: 'fullGym', db: 'fullHomeDb', none: 'fullHome' }

// One card for working out any day, as often as you like: a full-body day,
// or just the areas you pick. Tapping it asks what to hit. Underneath, each
// one under way, from the moment it's started (tap to carry on), then each
// finished one with its day (see SessionLines).
export function BuildCard({ store, onOpen }) {
  const going = IDS.map(id => ({ id, ...progressOf(store, id) })).filter(p => p.underWay)
  const nameOf = p => (p.id === TARGETED.id
    ? `${store.planName(TARGETED.id)} · ${equipmentName(store.targeted.eq)}`
    : `Full Body · ${FULL_BODY.find(x => x.id === p.id).label}`)
  return (
    <div className={CARD}>
      <CardHead icon="fullBody" tile="from-orange-50 to-orange-100" value={going[0]?.total ? going[0].done / going[0].total : 0} fill="stroke-orange-400" title="Build a Workout" sub="Pick your areas and equipment" onClick={() => onOpen(null)} />
      <UnderWay>
        {going.map(p => (
          <InProgressLine key={p.id} label={nameOf(p)} onOpen={() => onOpen(p.id)}>
            <Part kind="gym">{p.done}/{p.total} sets</Part>
            {p.warmup && <Part kind="cardio">{cardioMinutes(p.warmup)}</Part>}
            <Part kind="stretch">{p.stretched}/{p.stretches} stretches</Part>
          </InProgressLine>
        ))}
      </UnderWay>
    </div>
  )
}

// What a tile shows: the body, front or back, with its area filled in.
const FIGURE_FILL = '#ff8904'

// A tile per choice, the picked ones outlined in the card's color.
const tile = on => `flex flex-col items-center gap-1 rounded-xl px-1 pt-2 pb-2 border-[1.5px] text-[11.5px] font-semibold transition-colors min-w-0 ${
  on ? 'bg-orange-50 text-orange-800 border-orange-500' : 'bg-stone-100 text-stone-500 border-transparent active:bg-stone-200'
}`

// The areas, three to a row, each with its part of the body filled in.
// `picks`: the muscles picked in each; one with some but not all says how
// many.
function AreaTiles({ list, picks, onTap }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {list.map(a => {
        const n = picks[a.id]?.length ?? 0
        return (
          <button key={a.id} onClick={() => onTap(a)} aria-pressed={n > 0} className={tile(n > 0)}>
            <BodyFigure view={a.view} fills={Object.fromEntries(a.regions.map(r => [r, FIGURE_FILL]))} className="w-[30px] h-[38px]" />
            <span className="w-full truncate text-center">{a.label}{n > 0 && n < a.tags.length ? ` · ${n}/${a.tags.length}` : ''}</span>
          </button>
        )
      })}
    </div>
  )
}

// An area's muscles to pick from (any number; none takes the area off).
function MuscleSheet({ area, picked, onChange, onClose }) {
  return (
    <SettingsSheet title={area.label} onClose={onClose}>
      <p className="text-sm text-stone-500">Which muscles?</p>
      <div className="rounded-2xl bg-stone-50 divide-y divide-stone-200/70 overflow-hidden">
        {area.tags.map(m => {
          const on = picked.includes(m)
          return (
            <button key={m} onClick={() => onChange(on ? picked.filter(x => x !== m) : area.tags.filter(x => x === m || picked.includes(x)))}
              aria-pressed={on} className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-stone-100">
              <span className={`text-base ${on ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>{MUSCLE_LABEL[m]}</span>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${on ? 'border-orange-500 bg-orange-500' : 'border-stone-300'}`}>
                {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
            </button>
          )
        })}
      </div>
    </SettingsSheet>
  )
}

// Picking what to work: full body (its ready-made plan for the equipment)
// or not, what you have to work with, then the areas and their muscles
// (one exercise each). It opens on the equipment you used last. Built ones start
// empty, with a slot for each exercise and stretch to pick (see
// startTargeted).
export function BuildSheet({ store, onPick, onClose }) {
  const [full, setFull] = useState(false)
  // The muscles picked in each area: one with a single muscle toggles, one
  // with more opens a pop-up to pick them (none ticked to start).
  const [picks, setPicks] = useState({})
  const [choosing, setChoosing] = useState(null) // the area whose muscles show
  const areas = TARGET_AREAS.filter(a => picks[a.id]?.length).map(a => a.id)
  const [eq, setEq] = useState(store.targeted.eq)
  const setArea = (id, muscles) => setPicks(p => ({ ...p, [id]: muscles }))
  function tap(a) {
    if (a.tags.length === 1) return setArea(a.id, picks[a.id]?.length ? [] : a.tags)
    setChoosing(a)
  }
  // Full body: the ready-made plan for what you have (see FULL_BODY).
  const plan = FULL_BODY.find(p => p.id === FULL_BODY_FOR[eq])
  const planSize = full ? store.getExerciseSections(plan.id).main.length : 0
  // One exercise per muscle picked.
  const ready = full || areas.length > 0
  const exercises = full ? planSize : Object.values(picks).reduce((n, m) => n + m.length, 0)
  // And one stretch per muscle.
  const stretches = full ? store.getStretches(plan.id).length : exercises

  function start() {
    if (full) {
      store.begin(plan.id)
      onPick(plan.id)
      return
    }
    store.startTargeted(areas, eq, picks)
    onPick(TARGETED.id)
  }

  return (
    <SettingsSheet title="Build a Workout" closeLabel="Cancel" onClose={onClose}>
      {/* Full body uses its ready-made plan, so no count or areas to pick. */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-base text-stone-600">Full body workout?</span>
        <div className="bg-stone-100 rounded-xl p-1 flex" role="radiogroup" aria-label="Full body workout">
          {[[true, 'Yes'], [false, 'No']].map(([v, t]) => (
            <button key={t} role="radio" aria-checked={full === v} onClick={() => setFull(v)}
              className={`w-14 py-1.5 rounded-lg text-sm font-semibold transition-colors ${full === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* What you have, one row on its own. */}
      <div>
        <div className="bg-stone-100 rounded-xl p-1 flex">
          {TARGET_EQUIPMENT.map(x => (
            <button
              key={x.id}
              onClick={() => setEq(x.id)}
              aria-pressed={eq === x.id}
              className={`flex-1 basis-0 px-2 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${eq === x.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      {!full && (
        <div className="space-y-2">
          <span className="text-base text-stone-600">What do you want to hit?</span>
          <AreaTiles list={TARGET_AREAS} picks={picks} onTap={tap} />
        </div>
      )}
      {ready ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout once every set is done</p>
          <p className="text-sm text-stone-500">
            {full ? `${plan.short} · ` : ''}{exercises} exercises · {stretches} stretches{full ? '' : ` · ${equipmentName(eq)}`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Pick at least one area.
        </p>
      )}
      {choosing && <MuscleSheet area={choosing} picked={picks[choosing.id] ?? []} onChange={m => setArea(choosing.id, m)} onClose={() => setChoosing(null)} />}
      <button
        onClick={start}
        disabled={!ready}
        className="w-full px-4 truncate py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400"
      >
        Start
      </button>
    </SettingsSheet>
  )
}
