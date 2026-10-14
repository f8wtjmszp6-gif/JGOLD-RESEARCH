import { useRef, useState } from 'react'
import { fmtClock } from '../../hooks/timing'
import { HOWTO } from '../../data/howto'
import { HowToBody } from './HowTo'
import { StretchPicker } from './pickers'
import { AddRow } from './coverage'
import { SwipeRow } from '../ui/SwipeRow'
import { useDragReorder } from '../../hooks/useDragReorder'
import { GearIcon, InfoIcon, ClockIcon } from '../ui/glyphs'
import { MoreMenu } from '../ui/MoreMenu'
import { SettingsSheet } from '../ui/Sheet'
import { StepperRow, ToggleRow } from '../ui/controls'
import { DragHandle } from '../ui/DragHandle'

// Seconds → "6m 30s" / "6m" / "45s"
function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

// A list's stretches: drag one by its handle to reorder, swipe it away to
// remove it (never the last), + Add stretch at the end.
export function StretchesTab({ workout, store, onTimer }) {
  const list = store.getStretches(workout.id)
  const [adding, setAdding] = useState(false)
  const listRef = useRef(null)
  const drag = useDragReorder(listRef, () => store.getStretches(workout.id).map(x => x.id), (id, to) => store.moveStretchTo(workout.id, id, to))
  const totalStretchSeconds = list.reduce(
    (sum, s) => {
      const sets = store.getStretchSets(s.id)
      const hold = store.getCustomDuration(s.id, s.duration) * (store.getPerSide(s.id, s.perSide) ? 2 : 1)
      return sum + hold * sets + store.getStretchRest(s.id) * (sets - 1)
    },
    0,
  )

  return (
    <>
      <div className="rounded-2xl bg-accent-50 border border-accent-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClockIcon size={18} />
          <span className="text-sm font-medium text-stone-600">Total stretching time</span>
        </div>
        <span className="text-accent-600 font-bold">{fmtDuration(totalStretchSeconds)}</span>
      </div>

      <div ref={listRef} className="space-y-2">
      {list.map(stretch => (
        <div key={stretch.id} data-row={stretch.id} style={drag.style(stretch.id)} className={drag.dragging === stretch.id ? 'rounded-2xl shadow-lg' : ''}>
        <SwipeRow label={stretch.name} onRemove={list.length > 1 ? () => store.removeStretch(workout.id, stretch.id) : null}>
        <StretchCard
          stretch={stretch}
          grip={drag.handlers(stretch.id)}
          checked={store.getStretchDone(workout.id, stretch.id)}
          onToggle={() => store.toggleStretch(workout.id, stretch.id)}
          customDuration={store.getCustomDuration(stretch.id, stretch.duration)}
          onDurationChange={s => store.setCustomDuration(stretch.id, s)}
          perSide={store.getPerSide(stretch.id, stretch.perSide)}
          onPerSideChange={v => store.setPerSide(stretch.id, v)}
          sets={store.getStretchSets(stretch.id)}
          onSetsChange={n => store.setStretchSets(stretch.id, n)}
          rest={store.getStretchRest(stretch.id)}
          onRestChange={n => store.setStretchRest(stretch.id, n)}
          onTimer={() => onTimer({
            ...stretch,
            duration: store.getCustomDuration(stretch.id, stretch.duration),
            perSide: store.getPerSide(stretch.id, stretch.perSide),
            sets: store.getStretchSets(stretch.id),
            rest: store.getStretchRest(stretch.id),
          })}
        />
        </SwipeRow>
        </div>
      ))}
      </div>
      <AddRow label="Add stretch" onClick={() => setAdding(true)} />

      {adding && (
        <StretchPicker
          listId={workout.id}
          store={store}
          onPick={id => {
            store.addStretch(workout.id, id)
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  )
}

// ── Stretch card ─────────────────────────────────────────────────────────────
// One line per stretch: tick, name, a timer that shows the hold (×2 when it
// runs per side, more with extra sets) and ••• for how-to and settings.
// Removing is a swipe.
function StretchCard({ stretch, grip, checked, onToggle, onTimer, customDuration, onDurationChange, perSide, onPerSideChange, sets, onSetsChange, rest, onRestChange }) {
  const [showSettings, setShowSettings] = useState(false)
  const [showHow, setShowHow] = useState(false)
  const runs = (perSide ? 2 : 1) * sets

  return (
    <div className={`rounded-2xl pl-4 pr-2.5 py-2 transition-all ${
      checked ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-center gap-2">
        {grip && <span className="-ml-3.5 -mr-1 -my-2 self-stretch flex"><DragHandle name={stretch.name} {...grip} /></span>}
        <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform" aria-label={checked ? `Untick ${stretch.name}` : `Tick ${stretch.name}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked ? 'border-accent-500 bg-accent-500' : 'border-stone-200'
          }`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
        <p className={`flex-1 min-w-0 text-[15px] font-semibold leading-snug ${checked ? 'text-accent-500' : 'text-stone-900'}`}>{stretch.name}</p>
        <button
          onClick={onTimer}
          aria-label={`Time ${stretch.name}, ${customDuration} seconds${runs > 1 ? `, ${runs} times` : ''}`}
          className="w-[88px] h-8 shrink-0 rounded-lg bg-accent-100 flex items-center pl-2 pr-1 active:bg-accent-200 transition-colors"
        >
          <ClockIcon size={14} />
          <span className="flex-1 text-center text-[13px] font-semibold text-accent-600 tabular-nums whitespace-nowrap">
            {customDuration}s{runs > 1 ? ` ×${runs}` : ''}
          </span>
        </button>
        <MoreMenu
          label={stretch.name}
          items={[
            HOWTO[stretch.id] && { label: 'How to do it', icon: <InfoIcon size={18} />, onClick: () => setShowHow(true) },
            { label: 'Settings', icon: <GearIcon size={18} />, onClick: () => setShowSettings(true) },
          ].filter(Boolean)}
        />
      </div>

      {showHow && (
        <SettingsSheet title={stretch.name} tall onClose={() => setShowHow(false)}>
          <HowToBody item={stretch} kind="stretch" />
        </SettingsSheet>
      )}
      {showSettings && (
        <SettingsSheet title={stretch.name} tall onClose={() => setShowSettings(false)}>
          <StepperRow
            label="Duration"
            value={customDuration}
            step={5}
            min={5}
            editable
            suffix="s"
            onChange={onDurationChange}
          />
          <StepperRow
            label="Sets"
            value={sets}
            step={1}
            min={1}
            max={4}
            editable
            onChange={n => onSetsChange(Math.round(n))}
          />
          {sets > 1 && (
            <StepperRow
              label="Rest between sets"
              value={rest}
              step={5}
              min={5}
              format={s => fmtClock(s * 1000)}
              onChange={onRestChange}
            />
          )}
          <ToggleRow
            label="Per side"
            detail="Hold each side — the timer runs twice"
            on={perSide}
            onChange={onPerSideChange}
          />
        </SettingsSheet>
      )}
    </div>
  )
}
