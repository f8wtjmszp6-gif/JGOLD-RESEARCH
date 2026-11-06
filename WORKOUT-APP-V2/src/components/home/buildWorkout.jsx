import { useState } from 'react'
import { FULL_BODY, TARGETED } from '../../data/workout'
import { TARGET_AREAS, TARGET_EQUIPMENT, perArea, stretchesPerArea, targetName, equipmentName } from '../../data/targeted'
import { SettingsSheet } from '../ui/Sheet'
import { BodyFigure } from '../week/MuscleMap'
import { CardIcon, Counts, Of, CARD } from './cards'
import { SessionLines } from './sessions'

// A full-body day's or targeted workout's progress this week: sets and
// stretches ticked.
function progressOf(store, id) {
  const { done, total, exercises } = store.workoutProgress(id)
  const stretches = store.getStretches(id)
  const stretched = stretches.filter(x => store.getStretchDone(id, x.id)).length
  return { done, total, exercises, stretches: stretches.length, stretched, complete: total > 0 && done === total, started: done > 0 || stretched > 0 }
}

const IDS = [...FULL_BODY.map(p => p.id), TARGETED.id]
// Full body with each kind of equipment is one of the full-body days.
const FULL_FOR = { gym: 'fullGym', db: 'fullHomeDb', none: 'fullHome' }

// One card for working out any day, as often as you like: a full-body day,
// or just the areas you pick. The one under way shows on top and opens
// straight to it; with none under way, tapping asks what to hit. Each
// finished one gets a line with its day (see SessionLines).
export function BuildCard({ store, onOpen, onEditSession }) {
  const current = IDS.map(id => ({ id, ...progressOf(store, id) })).find(p => p.started && !p.complete)
  const label = current && (current.id === TARGETED.id
    ? `${store.planName(TARGETED.id)} · ${equipmentName(store.targeted.eq)}`
    : FULL_BODY.find(p => p.id === current.id).short)
  return (
    <div className={CARD}>
      <button onClick={() => onOpen(current?.id ?? null)} aria-label={current ? `Build a Workout, ${label} under way` : 'Build a Workout'} className="w-full text-left transition-all active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <CardIcon icon="fullBody" tile="from-orange-50 to-orange-100" value={current?.total ? current.done / current.total : 0} fill="stroke-orange-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 truncate">Build a Workout</p>
            <p className="text-sm text-stone-400 truncate">{current ? label : 'Full body or just the areas you pick'}</p>
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

// What a tile shows: the body, front or back, with its area filled in.
const FIGURE_FILL = '#ff8904'
const ALL_REGIONS = ['shoulders', 'chest', 'arms', 'core', 'hips', 'thighs', 'calves']

// Picking what to work: Full body across the top, then the areas (any
// number), and what you have to work with. It opens on your last picks.
// Full body starts that equipment's full-body day; areas build a targeted
// workout (see startTargeted).
export function BuildSheet({ store, onPick, onClose }) {
  const last = store.targeted
  const [full, setFull] = useState(false)
  const [areas, setAreas] = useState(last.areas)
  const [eq, setEq] = useState(last.eq)
  const toggle = id => { setFull(false); setAreas(a => (a.includes(id) ? a.filter(x => x !== id) : [...a, id])) }
  const ready = full || areas.length > 0
  const name = full ? 'Full Body' : targetName(areas)

  const per = perArea(areas.length)
  const exercises = full ? progressOf(store, FULL_FOR[eq]).exercises : per * areas.length
  const stretches = full ? store.getStretches(FULL_FOR[eq]).length : stretchesPerArea(areas.length) * areas.length

  function start() {
    if (full) {
      store.startAgain(FULL_FOR[eq])
      onPick(FULL_FOR[eq])
    } else {
      store.startTargeted(areas, eq)
      onPick(TARGETED.id)
    }
  }

  // A tile per choice, the picked ones outlined in the card's color.
  const tile = on => `flex flex-col items-center gap-1 rounded-xl px-1 pt-2 pb-2 border-[1.5px] text-[11.5px] font-semibold transition-colors min-w-0 ${
    on ? 'bg-orange-50 text-orange-800 border-orange-500' : 'bg-stone-100 text-stone-500 border-transparent active:bg-stone-200'
  }`
  return (
    <SettingsSheet title="Build a Workout" closeLabel="Cancel" onClose={onClose}>
      <div className="space-y-2">
        <span className="text-base text-stone-600">What do you want to hit?</span>
        <button onClick={() => { setFull(!full); setAreas([]) }} aria-pressed={full} className={`${tile(full)} w-full !flex-row justify-center gap-2 !text-sm py-2.5`}>
          <BodyFigure view="front" fills={Object.fromEntries(ALL_REGIONS.map(r => [r, FIGURE_FILL]))} className="w-[22px] h-[28px]" />
          Full body
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          {TARGET_AREAS.map(a => (
            <button key={a.id} onClick={() => toggle(a.id)} aria-pressed={areas.includes(a.id)} className={tile(areas.includes(a.id))}>
              <BodyFigure view={a.view} fills={Object.fromEntries(a.regions.map(r => [r, FIGURE_FILL]))} className="w-[30px] h-[38px]" />
              <span className="w-full truncate text-center">{a.label}</span>
            </button>
          ))}
        </div>
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
        {ready ? `Start ${name}` : 'Pick what to hit'}
      </button>
    </SettingsSheet>
  )
}
