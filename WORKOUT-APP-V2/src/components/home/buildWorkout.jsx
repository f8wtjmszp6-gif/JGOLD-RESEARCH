import { useState } from 'react'
import { FULL_BODY, TARGETED } from '../../data/workout'
import { TARGET_AREAS, TARGET_EQUIPMENT, exerciseTotal, stretchTotal, share, equipmentName } from '../../data/targeted'
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

// Full-body days are built like the rest now (every area); one begun
// before that still shows here until it's done.
const IDS = [...FULL_BODY.map(p => p.id), TARGETED.id]
const ALL = TARGET_AREAS.map(a => a.id)

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
const ALL_REGIONS = ['shoulders', 'chest', 'arms', 'core', 'hips', 'thighs', 'calves']

// A tile per choice, the picked ones outlined in the card's color.
const tile = on => `flex flex-col items-center gap-1 rounded-xl px-1 pt-2 pb-2 border-[1.5px] text-[11.5px] font-semibold transition-colors min-w-0 ${
  on ? 'bg-orange-50 text-orange-800 border-orange-500' : 'bg-stone-100 text-stone-500 border-transparent active:bg-stone-200'
}`

// The areas, three to a row, each with its part of the body filled in.
function AreaTiles({ list, picked, onToggle }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {list.map(a => (
        <button key={a.id} onClick={() => onToggle(a.id)} aria-pressed={picked.includes(a.id)} className={tile(picked.includes(a.id))}>
          <BodyFigure view={a.view} fills={Object.fromEntries(a.regions.map(r => [r, FIGURE_FILL]))} className="w-[30px] h-[38px]" />
          <span className="w-full truncate text-center">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

// Picking what to work: Full body across the top, then the areas (any
// number), and what you have to work with. It opens with nothing picked,
// on the equipment you used last.
// Start opens the workout empty, with a slot for each exercise and stretch
// to pick (full body is every area; see startTargeted).
export function BuildSheet({ store, onPick, onClose }) {
  // Every area picked is Full body.
  const all = list => list.length === TARGET_AREAS.length
  const [full, setFull] = useState(false)
  const [areas, setAreas] = useState([])
  const [eq, setEq] = useState(store.targeted.eq)
  function toggle(id) {
    const next = areas.includes(id) ? areas.filter(x => x !== id) : [...areas, id]
    setFull(all(next))
    setAreas(all(next) ? [] : next)
  }
  const ready = full || areas.length > 0

  const exercises = exerciseTotal(full ? ALL.length : areas.length)
  const stretches = stretchTotal(full ? ALL.length : areas.length)

  function start() {
    store.startTargeted(full ? ALL : areas, eq)
    onPick(TARGETED.id)
  }

  return (
    <SettingsSheet title="Build a Workout" closeLabel="Cancel" onClose={onClose}>
      <div className="space-y-2">
        <span className="text-base text-stone-600">What do you want to hit?</span>
        <button onClick={() => { setFull(!full); setAreas([]) }} aria-pressed={full} className={`${tile(full)} w-full !flex-row justify-center gap-2 !text-sm py-2.5`}>
          <BodyFigure view="front" fills={Object.fromEntries(ALL_REGIONS.map(r => [r, FIGURE_FILL]))} className="w-[22px] h-[28px]" />
          Full body
        </button>
        <AreaTiles list={TARGET_AREAS} picked={areas} onToggle={toggle} />
      </div>
      {/* Its own full-width row, so "Gym Equipment" fits on one line. */}
      <div className="space-y-2">
        <span className="text-base text-stone-600">With</span>
        <div className="bg-stone-100 rounded-xl p-1 flex">
          {TARGET_EQUIPMENT.map(x => (
            <button
              key={x.id}
              onClick={() => setEq(x.id)}
              aria-pressed={eq === x.id}
              className={`flex-auto px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${eq === x.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      {ready ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout once every set is done</p>
          <p className="text-sm text-stone-500">
            {exercises} exercises · {stretches} stretches · {equipmentName(eq)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Pick one area or more. Fewer areas get more exercises each.</p>
      )}
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

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// More areas for a built workout under way: the ones it doesn't have yet.
// Theirs go at the end, and the name grows to match (see addTargetedAreas).
export function AddAreaSheet({ store, onClose }) {
  const have = store.targeted.areas
  const [areas, setAreas] = useState([])
  const toggle = id => setAreas(a => (a.includes(id) ? a.filter(x => x !== id) : [...a, id]))
  // What the new ones get: their share of a workout with every area.
  const among = [...have, ...areas]
  const added = total => Object.entries(share(total, among)).filter(([id]) => areas.includes(id)).reduce((n, [, k]) => n + k, 0)
  return (
    <SettingsSheet title="Add an area" closeLabel="Cancel" onClose={onClose}>
      <AreaTiles list={TARGET_AREAS.filter(a => !have.includes(a.id))} picked={areas} onToggle={toggle} />
      {areas.length > 0 && (
        <p className="text-sm text-stone-500">
          {count(added(exerciseTotal(among.length)), 'exercise')} · {count(added(stretchTotal(among.length)), 'stretch', 'stretches')} added at the end
        </p>
      )}
      <button
        onClick={() => { store.addAreas(areas); onClose() }}
        disabled={!areas.length}
        className="w-full px-4 py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400"
      >
        Add
      </button>
    </SettingsSheet>
  )
}
