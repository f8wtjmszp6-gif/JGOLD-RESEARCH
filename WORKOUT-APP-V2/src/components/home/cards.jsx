import { useState } from 'react'
import { STRETCH_ROUTINE, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { TileIcon } from '../ui/Icons'
import { SettingsSheet } from '../ui/Sheet'
import { Part } from './lines'
import { UnderWay, InProgressLine } from './sessions'

// ── Workout classes ──────────────────────────────────────────────────────────
export function ClassCard({ activity, onAdd }) {
  return <LogCard activity={activity} icon="class" sub="Log what the class covered" onAdd={onAdd} />
}

// A card you log things on, as a class or a walk: tapping it logs one.
// What you've logged is on the Activities screen.
export function LogCard({ activity, icon, sub, onAdd }) {
  return (
    <div className={CARD}>
      <CardHead icon={icon} tile={activity.tile} title={activity.name} sub={sub} label={`Log a ${activity.one}`} onClick={onAdd} />
    </div>
  )
}

// The top of a card you tap: its icon (with a ring that fills when `value`
// is given), its name (and `sub` under it) and ›.
export function CardHead({ icon, tile, value, fill, title, sub, label = title, onClick }) {
  return (
    <button onClick={onClick} aria-label={label} className="w-full text-left transition-all active:scale-[0.98]">
      <div className="flex items-center gap-3">
        <CardIcon icon={icon} tile={tile} value={value} fill={fill} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900 truncate">{title}</p>
          {sub && <p className="text-sm text-stone-400 truncate">{sub}</p>}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
      </div>
    </button>
  )
}

// The Full Body Stretch, which can be done more than once a week. Tapping
// opens the one under way, or, once it's finished, files it and opens a
// fresh one. The one under way gets an IN PROGRESS line and fills the ring.
// `onAsk`: starting a fresh one asks how long first (see RoutineSheet).
export function RoutineCard({ store, onOpen, onAsk }) {
  const id = STRETCH_ROUTINE.id
  const list = store.getStretches(id)
  const done = list.filter(x => store.getStretchDone(id, x.id)).length
  // Under way from when it's started (see begin), not just once one's ticked.
  const under = (done > 0 || !!store.currentSession(id).checks?.openedAt) && done < list.length
  return (
    <div className={CARD}>
      <CardHead icon="stretch" tile="from-teal-50 to-teal-100" value={under ? done / list.length : 0} fill="stroke-teal-400" title={STRETCH_ROUTINE.name} sub={`${STRETCH_WORKOUT_MINUTES}+ min counts as a workout`} onClick={() => (under ? onOpen() : onAsk())} />
      <UnderWay>
        {under && (
          <InProgressLine label={STRETCH_ROUTINE.name} onOpen={onOpen}>
            <Part kind="stretch">{done}/{list.length} stretches</Part>
          </InProgressLine>
        )}
      </UnderWay>
    </div>
  )
}

// Days stretched this week: finishing a gym workout's stretches, the
// full-body routine, or stretching on your own (+) each count once.
// A plan: a ring around its icon fills as you tick sets (green when done).
// On the right: what's in the plan until you start it, then how far along
// you are. Both counts follow the plan as you add or remove exercises and
// stretches.
// Over its name, where it stands, with a border to match: Complete, Up next
// (`upNext`: the plan to do next), In progress or Not started.
const STATUS = {
  complete: ['Complete', 'text-emerald-500', 'ring-emerald-300'],
  next: ['Up next', 'text-red-600', 'ring-red-200'],
  started: ['In progress', 'text-amber-500', 'ring-amber-300'],
  ended: ['Unfinished', 'text-amber-500', 'ring-amber-300'],
  none: ['Not started', 'text-stone-400', 'ring-stone-200'],
}
export function WorkoutCard({ workout, progress, stretches, stretchesDone, upNext, ended, onOpen }) {
  const { done, total, exercises } = progress
  const complete = total > 0 && done === total
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const started = done > 0 || stretchesDone > 0
  const [label, text, ring] = STATUS[complete ? 'complete' : ended ? 'ended' : upNext ? 'next' : started ? 'started' : 'none']

  return (
    <button
      onClick={onOpen}
      aria-label={`${workout.short}${complete ? ', done' : ''}`}
      className={`${CARD} transition-all active:scale-[0.98] ring-1 ${ring}`}
    >
      <div className="flex items-center gap-3">
        <CardIcon icon={workout.id} tile="from-red-50 to-red-100" value={total ? done / total : 0} done={complete} fill="stroke-red-400" />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${text}`}>{label}</p>
          <p className="font-semibold text-stone-900 truncate">{workout.short}</p>
        </div>
        {/* What's in the plan until you start it, then how far along. */}
        <Counts>
          {started ? (
            <>
              <p><Of n={done} of={total} /> sets</p>
              <p><Of n={stretchesDone} of={stretches.length} /> {stretches.length === 1 ? 'stretch' : 'stretches'}</p>
            </>
          ) : (
            <>
              <p>{plural(exercises, 'exercise', 'exercises')}</p>
              <p>{plural(stretches.length, 'stretch', 'stretches')}</p>
            </>
          )}
        </Counts>
      </div>
    </button>
  )
}

// A card's icon: round, on its tint (`tile`, gradient classes). Cards you
// open (plans, routines) pass `value` 0–1 for a ring around it that fills
// as you go in `fill` (a stroke class), green once `done`, empty until you
// start. Cards you add to leave it out: no ring, same size.
export function CardIcon({ icon, tile, value = null, done = false, fill }) {
  const r = 21
  const length = 2 * Math.PI * r
  return (
    <div className="relative w-[46px] h-[46px] shrink-0 flex items-center justify-center">
      {value !== null && (
        <svg width="46" height="46" viewBox="0 0 46 46" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="23" cy="23" r={r} fill="none" strokeWidth="3" className="stroke-stone-100" />
          {value > 0 && (
            <circle
              cx="23" cy="23" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={length}
              strokeDashoffset={length * (1 - value)}
              className={`transition-all ${done ? 'stroke-emerald-400' : fill}`}
            />
          )}
        </svg>
      )}
      <div className={`w-[34px] h-[34px] rounded-full bg-gradient-to-br ${tile} flex items-center justify-center`}>
        <TileIcon id={icon} size={22} />
      </div>
    </div>
  )
}

// Two short lines on a card's right: how far along, or what's in it.
export function Counts({ children }) {
  return <div className="shrink-0 text-right text-[13px] leading-snug text-stone-400 tabular-nums">{children}</div>
}

// "5/12" with the numbers stronger.
export const Of = ({ n, of }) => <span className="font-semibold text-stone-500">{n}/{of}</span>

// Every card's shell: 46px icon, then the rest, ~66px tall.
export const CARD = 'w-full text-left rounded-2xl px-3.5 py-2.5 bg-white shadow-sm'


// Before a fresh Full Body Stretch: how long, then Start.
export function RoutineSheet({ store, onStart, onClose }) {
  // Nothing is picked for you; tap a length to start.
  const [len, setLen] = useState(null)
  return (
    <SettingsSheet title={STRETCH_ROUTINE.name} closeLabel="Cancel" onClose={onClose}>
      <p className="text-base text-stone-600">How long?</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How long">
        {Object.keys(STRETCH_ROUTINE.lengths).map(Number).map(m => (
          <button key={m} role="radio" aria-checked={len === m} onClick={() => setLen(m)}
            className={`py-3 rounded-xl text-base font-semibold border-[1.5px] transition-colors ${len === m ? 'bg-teal-50 text-teal-800 border-teal-500' : 'bg-stone-100 text-stone-500 border-transparent'}`}>
            {m} min
          </button>
        ))}
      </div>
      <p className="text-sm text-stone-500">{len >= STRETCH_WORKOUT_MINUTES ? `✓ ${STRETCH_WORKOUT_MINUTES}+ min counts as a workout` : `Counts as a stretch day; ${STRETCH_WORKOUT_MINUTES}+ min also counts as a workout`}</p>
      <button disabled={!len} onClick={() => { store.setRoutineLength(len); store.startAgain(STRETCH_ROUTINE.id); store.begin(STRETCH_ROUTINE.id); onStart() }}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400">
        {len ? 'Start' : 'Pick a length'}
      </button>
    </SettingsSheet>
  )
}
