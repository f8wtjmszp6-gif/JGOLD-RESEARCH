import { useEffect, useRef, useState } from 'react'
import { openDemo } from '../../data/howto'
import { StretchPicker } from './pickers'
import { AddRow, CoveragePill } from './coverage'
import { stretchAreas } from '../../utils/stretchCoverage'
import { SwipeRow } from '../ui/SwipeRow'
import { useDragReorder } from '../../hooks/useDragReorder'
import { GearIcon, InfoIcon, ClockIcon, Chevron } from '../ui/glyphs'
import { fmtSecs } from '../../utils/format'
import { SetRow } from './ExerciseCard'
import { SettingsSheet } from '../ui/Sheet'
import { StepperRow, ToggleRow } from '../ui/controls'
import { DragHandle } from '../ui/DragHandle'
import { useScope } from '../../hooks/useScope'
import { WeekTag, OffRow } from './weekDiff'
import { SlotRows } from './slots'
import { STRETCH_BY_ID } from '../../data/stretches'
import { StretchPage } from '../StretchBank'

// Seconds → "6m 30s" / "6m" / "45s"
function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

// A list's stretches: drag one by its handle to reorder, swipe it away to
// remove it (never the last), + Add stretch at the end. `diff`: how this
// week's differs from every week's (see weekDiffOf), for one you can do any
// number of times (`repeat`) this time's.
// `timing`: what its timer is timing, { stretchId, hold, total, phase }:
// that card freezes, and the hold being counted shows TIMER RUNNING.
// How long a list's stretches take with your settings: every hold, every
// set, and the rests between sets. Sits above the timer (see WorkoutDetail).
export function StretchTotal({ store, listId }) {
  const totalStretchSeconds = store.getStretches(listId).reduce(
    (sum, s) => {
      const sets = store.getStretchSets(s.id, s.sets)
      const hold = store.getCustomDuration(s.id, s.duration) * (store.getPerSide(s.id, s.perSide) ? 2 : 1)
      return sum + hold * sets + store.getStretchRest(s.id, s.rest) * (sets - 1)
    },
    0,
  )
  return (
    <div className="rounded-2xl bg-accent-50 border border-accent-100 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <ClockIcon size={18} />
        <span className="text-sm font-medium text-stone-600">Total stretching time</span>
      </div>
      <span className="text-accent-600 font-bold">{fmtDuration(totalStretchSeconds)}</span>
    </div>
  )
}

export function StretchesTab({ workout, store, diff, repeat, onTimer, open = null, timing = null }) {
  const list = store.getStretches(workout.id)
  const [adding, setAdding] = useState(false)
  // Adding or removing one asks: just this week, or every week after?
  const [ask, scopeSheet] = useScope(store, workout.id)
  const listRef = useRef(null)
  const drag = useDragReorder(listRef, () => store.getStretches(workout.id).map(x => x.id), (id, to) => store.moveStretchTo(workout.id, id, to))
  // One open at a time; open, just it and the ones either side, greyed.
  const [openId, setOpenId] = useState(open)
  const openStretch = list.some(x => x.id === openId) ? openId : null
  const at = list.findIndex(x => x.id === openStretch)
  const shown = openStretch ? list.slice(Math.max(0, at - 1), at + 2) : list
  const areas = stretchAreas(store, workout.id, list)
  const doneCount = list.filter(x => store.getStretchDone(workout.id, x.id)).length
  const holdsOf = x => store.getStretchSets(x.id, x.sets) * (store.getPerSide(x.id, x.perSide) ? 2 : 1)

  return (
    <>
      <div className="flex items-baseline justify-between gap-3 px-1 pt-3">
        <span className="flex items-baseline gap-2">
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Stretches</p>
          <CoveragePill given={areas} noun="stretch" />
        </span>
        <span className={`text-xs font-semibold ${doneCount === list.length ? 'text-accent-500' : 'text-stone-400'}`}>{doneCount} of {list.length} Completed</span>
      </div>

      <div ref={listRef} className="space-y-2">
      {shown.map(stretch => {
        const faded = openStretch && stretch.id !== openStretch
        const card = (
          <StretchCard
            store={store}
            stretch={stretch}
            timing={timing?.stretchId === stretch.id ? timing : null}
            tag={diff?.stretches.added.includes(stretch.id) && <WeekTag repeat={repeat} />}
            grip={openStretch ? null : drag.handlers(stretch.id)}
            open={stretch.id === openStretch}
            onOpen={() => setOpenId(stretch.id)}
            onClose={() => setOpenId(null)}
            done={store.getStretchDone(workout.id, stretch.id)}
            holdsDone={store.getStretchHolds(workout.id, stretch.id, holdsOf(stretch))}
            onToggleAll={() => store.toggleStretch(workout.id, stretch.id)}
            onToggleHold={i => store.toggleStretchHold(workout.id, stretch.id, i, holdsOf(stretch))}
            customDuration={store.getCustomDuration(stretch.id, stretch.duration)}
            onDurationChange={s => store.setCustomDuration(stretch.id, s)}
            perSide={store.getPerSide(stretch.id, stretch.perSide)}
            onPerSideChange={v => store.setPerSide(stretch.id, v)}
            sets={store.getStretchSets(stretch.id, stretch.sets)}
            onSetsChange={n => store.setStretchSets(stretch.id, n)}
            rest={store.getStretchRest(stretch.id, stretch.rest)}
            onRestChange={n => store.setStretchRest(stretch.id, n)}
            onTimer={i => onTimer({
              ...stretch,
              duration: store.getCustomDuration(stretch.id, stretch.duration),
              perSide: false,
              sets: 1,
              rest: 0,
              hold: i,
              holds: holdsOf(stretch),
              // For naming each hold: "1 Left".
              holdSides: store.getPerSide(stretch.id, stretch.perSide) ? 2 : 1,
              holdSets: store.getStretchSets(stretch.id, stretch.sets),
              holdRest: store.getStretchRest(stretch.id, stretch.rest),
              baseDuration: stretch.duration,
            })}
          />
        )
        return faded ? <div key={stretch.id} className={`opacity-50 ${timing ? 'pointer-events-none' : ''}`}>{card}</div> : (
          <div key={stretch.id} data-row={stretch.id} style={drag.style(stretch.id)} className={drag.dragging === stretch.id ? 'rounded-2xl shadow-lg' : ''}>
            {openStretch ? card : (
              <SwipeRow label={stretch.name} onRemove={list.length > 1 ? () => (diff?.stretches.added.includes(stretch.id) ? store.removeStretch(workout.id, stretch.id, 'week') : ask(`Remove ${stretch.name}?`, scope => store.removeStretch(workout.id, stretch.id, scope))) : null}>{card}</SwipeRow>
            )}
          </div>
        )
      })}
      {!openStretch && diff?.stretches.dropped.map(id => <OffRow key={id} name={STRETCH_BY_ID[id].name} repeat={repeat} onUndo={() => store.putBackWeek(workout.id, 'stretches', id)} />)}
      {/* A built workout's stretches still to pick. */}
      {!openStretch && workout.id === 'targeted' && <SlotRows kind="stretch" slots={store.targeted.stretchSlots} store={store} />}
      </div>
      {!openStretch && <AddRow label="Add stretch" onClick={() => setAdding(true)} />}

      {adding && (
        <StretchPicker
          listId={workout.id}
          store={store}
          onPick={id => {
            setAdding(false)
            ask(`Add ${STRETCH_BY_ID[id].name}?`, scope => store.addStretch(workout.id, id, scope))
          }}
          onClose={() => setAdding(false)}
        />
      )}
      {scopeSheet}
    </>
  )
}

// ── Stretch card ─────────────────────────────────────────────────────────────
// Like an exercise card. Folded: its name and a dot per hold; tap to open.
// Open: name and hold, how-to, settings and close, then one row per hold
// (Left / Right when per side) with its own seconds, timer and tick.
// While a card's timer goes: its buttons fade and don't respond, but for
// the ones marked data-keep.
const FROZEN = '[&_button:not([data-keep])]:pointer-events-none [&_button:not([data-keep]):not([data-title])]:opacity-40 [&_input]:pointer-events-none'

function StretchCard({ store, stretch, timing, tag, grip, open, onOpen, onClose, done, holdsDone, onToggleAll, onToggleHold, onTimer, customDuration, onDurationChange, perSide, onPerSideChange, sets, onSetsChange, rest, onRestChange }) {
  const [showSettings, setShowSettings] = useState(false)
  const [showPage, setShowPage] = useState(false) // its page in the Stretches bank
  // Finished while open (the timer ticking the last hold, say): it folds.
  const wasDone = useRef(done)
  useEffect(() => {
    if (done && !wasDone.current && open) onClose()
    wasDone.current = done
  }, [done, open, onClose])
  const sides = perSide ? 2 : 1
  const holds = holdsDone.map((d, i) => ({
    i,
    done: d,
    set: Math.floor(i / sides),
    side: i % sides,
  }))
  const next = holds.find(h => !h.done)
  const label = h => (!perSide ? null : h.side ? 'Right' : 'Left')
  const total = customDuration * holds.length + rest * (sets - 1)

  if (!open) {
    return (
      <div className={`flex items-center rounded-2xl ${done ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'}`}>
        {grip ? <DragHandle name={stretch.name} {...grip} /> : <span className="w-4 shrink-0" />}
        <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 pr-4 py-3 text-left active:opacity-70">
          <span className={`min-w-0 flex-1 block font-semibold leading-snug ${done ? 'text-accent-600' : 'text-stone-900'}`}>{stretch.name}{tag}</span>
          <span className="flex gap-1 shrink-0" role="img" aria-label={`${holdsDone.filter(Boolean).length} of ${holdsDone.length} holds done`}>
            {holdsDone.map((d, i) => <span key={i} className={`w-2 h-2 rounded-full ${d ? 'bg-accent-500' : 'bg-stone-200'}`} />)}
          </span>
          <Chevron />
        </button>
      </div>
    )
  }

  const btn = 'w-9 h-9 shrink-0 rounded-[10px] bg-stone-100 flex items-center justify-center text-stone-500 active:bg-stone-200'
  return (
    // While its timer goes, nothing on it can be changed or closed (how-to still works).
    <div className={`rounded-2xl p-4 ${done ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'} ${timing ? FROZEN : ''}`}>
      <div className="flex items-start gap-1.5">
        <button data-title onClick={onClose} className="flex-1 min-w-0 mr-1.5 text-left active:opacity-70">
          <p className={`text-lg font-bold leading-tight text-balance ${done ? 'text-accent-500' : 'text-stone-900'}`}>{stretch.name}{tag}</p>
          <p className="mt-0.5 text-sm text-stone-500">{[`${fmtSecs(customDuration)} hold`, perSide && 'per side'].filter(Boolean).join(' · ')}</p>
        </button>
        {/* Times the next hold not done (from the first once all are). */}
        <button onClick={() => onTimer((next ?? holds[0]).i)} disabled={!!timing} aria-label={`Time ${stretch.name}`} className="w-9 h-9 shrink-0 rounded-[10px] bg-accent-100 text-accent-500 flex items-center justify-center active:bg-accent-200 disabled:opacity-40"><ClockIcon size={16} /></button>
        <button data-keep onClick={() => openDemo(stretch.name, 'stretch')} aria-label={`How to do ${stretch.name}`} className={btn}><InfoIcon size={16} /></button>
        <button onClick={() => setShowSettings(true)} aria-label={`${stretch.name} settings`} className={btn}><GearIcon size={16} /></button>
        <button onClick={onClose} aria-label={`Close ${stretch.name}`} className={btn}><Chevron up size={16} /></button>
      </div>

      {/* Today's holds and how long they take, in one strip. */}
      <div className="mt-3 flex rounded-xl border border-stone-200 divide-x divide-stone-200">
        {[['Today', `${holds.length} × ${fmtSecs(customDuration)}`], ['Time', fmtSecs(total)]].map(([k, v]) => (
          <div key={k} className="flex-1 min-w-0 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">{k}</p>
            <p className="truncate text-[15px] font-bold text-stone-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1">
        {holds.map(h => (
          <div key={h.i} className="space-y-1">
            {/* Between holds: switch sides, or the rest between sets. */}
            {h.i > 0 && (h.side > 0 || rest > 0) && (
              <div className="flex items-center gap-2 px-3">
                <span className="flex-1 h-px bg-stone-200" />
                <span className="text-[11px] font-semibold text-stone-400">{h.side > 0 ? 'switch sides' : `${fmtSecs(rest)} rest`}</span>
                <span className="flex-1 h-px bg-stone-200" />
              </div>
            )}
            <SetRow
              index={perSide ? h.i : h.set}
              label={label(h)}
              value={timing?.hold === h.i ? timing.total / 1000 : customDuration}
              done={h.done}
              next={h === next}
              hold
              locked={timing?.hold === h.i && ['ready', 'running'].includes(timing.phase)}
              onChange={onDurationChange}
              onToggle={() => { onToggleHold(h.i); if (!h.done && holds.every(x => x.done || x === h)) onClose() }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        {sets < 4 && <button onClick={() => onSetsChange(sets + 1)} className="text-xs font-semibold text-accent-500 active:opacity-60">+ Add set</button>}
        {sets > 1 && <button onClick={() => onSetsChange(sets - 1)} className="text-xs font-medium text-stone-400 active:text-stone-600">− Remove set</button>}
        <button onClick={() => { onToggleAll(); if (!done) onClose() }} className="ml-auto text-xs font-semibold text-accent-500 active:opacity-60">
          {done ? 'Untick all' : 'Complete all'}
        </button>
      </div>

      {showSettings && (
        <SettingsSheet title={stretch.name} tall onClose={() => setShowSettings(false)}>
          {/* Its page in the Stretches bank: stretch group and targets. */}
          <button onClick={() => setShowPage(true)} className="w-full rounded-2xl bg-stone-50 px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-100">
            <span className="text-base text-stone-800">Additional details</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <StepperRow label="Duration" value={customDuration} step={5} min={5} editable seconds onChange={onDurationChange} />
          <StepperRow label="Sets" value={sets} step={1} min={1} max={4} editable onChange={n => onSetsChange(Math.round(n))} />
          {sets > 1 && <StepperRow label="Rest between sets" value={rest} step={5} min={5} seconds onChange={onRestChange} />}
          <ToggleRow label="Per side" detail="Hold each side — the timer runs twice" on={perSide} onChange={onPerSideChange} />
          {showPage && <StretchPage store={store} popup stretch={STRETCH_BY_ID[stretch.id] ?? stretch} onClose={() => setShowPage(false)} />}
        </SettingsSheet>
      )}
    </div>
  )
}
