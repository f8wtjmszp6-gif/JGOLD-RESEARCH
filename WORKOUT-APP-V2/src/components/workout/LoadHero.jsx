import { useState } from 'react'
import { EQUIPMENT } from '../../data/exercises'
import { fmt, stepTo } from '../../utils/format'

// What an exercise is done with, as a row of icon buttons.
const EQUIPMENT_ICON = {
  barbell: <><path d="M2 12h20" /><path d="M5 7v10M8 8v8M16 8v8M19 7v10" /></>,
  dumbbell: <><path d="M8 12h8" /><rect x="4" y="8" width="4" height="8" rx="1" /><rect x="16" y="8" width="4" height="8" rx="1" /></>,
  cable: <><path d="M12 3v11M8 3h8" /><circle cx="12" cy="17" r="3" /></>,
  machine: <><rect x="7" y="4" width="10" height="16" rx="1.5" /><path d="M7 9h10M7 13h10M7 17h10" /></>,
  bodyweight: <><circle cx="12" cy="5" r="2" /><path d="M12 7v7M8 10h8M12 14l-3 6M12 14l3 6" /></>,
  assisted: <path d="M12 20V6M7 11l5-5 5 5" />,
}
export function EquipmentPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-6 gap-1 rounded-xl bg-stone-100 p-1" role="radiogroup" aria-label="Equipment">
      {EQUIPMENT.map(e => (
        <button
          key={e.id}
          role="radio"
          aria-checked={value === e.id}
          onClick={() => onChange(e.id)}
          className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
            value === e.id ? 'bg-white text-accent-500 shadow-sm' : 'text-stone-400'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{EQUIPMENT_ICON[e.id]}</svg>
          {e.label}
        </button>
      ))}
    </div>
  )
}

// The weight, big, with − / + either side (tap the number to type it) and a
// line on what it means for the equipment. A barbell also draws its plates.
const PLATES = [45, 35, 25, 10, 5, 2.5]
const PLATE_HEIGHT = { 45: 46, 35: 40, 25: 34, 10: 26, 5: 20, 2.5: 15 }
function platesFor(perSide) {
  const plates = []
  let left = perSide
  for (const p of PLATES) {
    while (left >= p - 1e-9) {
      plates.push(p)
      left -= p
    }
  }
  return { plates, left: Math.round(left * 100) / 100 }
}
export function LoadHero({ equipment, weight, bar, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const step = equipment === 'barbell' ? 5 : 2.5
  const perSide = equipment === 'barbell' && bar > 0 ? Math.max(0, (weight - bar) / 2) : null
  const { plates, left } = platesFor(perSide ?? 0)
  const unit = { dumbbell: 'lbs each', assisted: 'lbs help' }[equipment] ?? 'lbs'
  const note = {
    barbell: bar > 0 ? `${fmt(bar)} lb bar · ${perSide > 0 ? `${fmt(perSide)} lb each side` : 'empty bar'}` : 'Set the bar weight below',
    dumbbell: 'The weight of one dumbbell',
    cable: 'The number on the stack',
    machine: 'The number on the stack or plates loaded',
    bodyweight: weight > 0 ? 'Added with a belt, vest, plate or kettlebell' : 'Your bodyweight. Add weight once it gets easy.',
    assisted: 'Help from the machine or band. Lower = harder.',
  }[equipment]

  function save() {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0) onChange(Math.round(n * 100) / 100)
  }

  const btn = 'w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 text-2xl font-medium active:bg-stone-200 transition-colors'
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="flex items-center gap-5">
        <button onClick={() => onChange(stepTo(weight, step, -1))} className={btn} aria-label="Less weight">−</button>
        {editing ? (
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="w-28 text-center text-4xl font-bold bg-stone-100 rounded-xl py-1 text-stone-900 outline-none"
          />
        ) : (
          <button onClick={() => { setDraft(String(weight)); setEditing(true) }} className="min-w-28 text-center active:opacity-60">
            <span className="text-5xl font-bold tracking-tight text-stone-900">{equipment === 'bodyweight' ? '+' : ''}{fmt(weight)}</span>
            <span className="ml-1.5 text-base font-medium text-stone-400">{unit}</span>
          </button>
        )}
        <button onClick={() => onChange(stepTo(weight, step, 1))} className={btn} aria-label="More weight">+</button>
      </div>
      {perSide > 0 && (
        <div className="flex items-center h-12" aria-hidden="true">
          {[...plates].reverse().map((p, i) => <span key={`l${i}`} className="w-2.5 rounded-sm bg-accent-500 mx-px" style={{ height: PLATE_HEIGHT[p] }} />)}
          <span className="w-24 h-2 rounded-full bg-stone-400" />
          {plates.map((p, i) => <span key={`r${i}`} className="w-2.5 rounded-sm bg-accent-500 mx-px" style={{ height: PLATE_HEIGHT[p] }} />)}
        </div>
      )}
      <p className="text-sm text-stone-500 text-center">
        {note}
        {perSide > 0 && plates.length > 0 && <span className="block text-xs text-stone-400">Each side: {plates.map(fmt).join(' + ')}{left > 0 ? ` + ${fmt(left)}` : ''}</span>}
      </p>
    </div>
  )
}
