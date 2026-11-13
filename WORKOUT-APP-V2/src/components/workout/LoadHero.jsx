import { EQUIPMENT } from '../../data/exercises'
import { fmt } from '../../utils/format'
import { BAR_MIN, BAR_MAX, BAR_STEP } from '../../data/workout'
import { StepperRow } from '../ui/controls'

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

// The weight, as a row like the bar's (tap the number to type it), and a
// line on what it means for the equipment.
export function LoadHero({ equipment, weight, bar, onChange, onBar, onEquipment }) {
  const step = equipment === 'barbell' ? 5 : 2.5
  // A barbell never weighs less than the bar on it.
  const least = equipment === 'barbell' ? bar : 0
  const perSide = equipment === 'barbell' && bar > 0 ? Math.max(0, (weight - bar) / 2) : null
  const note = {
    barbell: null,
    dumbbell: 'The weight of each dumbbell',
    cable: 'The weight of the stack',
    machine: 'The weight of the stack or plates loaded',
    bodyweight: weight > 0 ? 'Added with a belt, vest, plate or kettlebell' : 'Your bodyweight. Add weight once it gets easy.',
    assisted: <>Help from the machine or band.<br />Lower = harder</>,
  }[equipment]

  return (
    <div className="rounded-2xl bg-stone-50 divide-y divide-stone-200/70 overflow-hidden">
      {/* What it's done with, on top. */}
      <div className="p-2">
        <EquipmentPicker value={equipment} onChange={onEquipment} />
      </div>
      <div className="px-4 py-2.5">
      <StepperRow
        label="Weight"
        value={weight}
        step={step}
        min={least}
        editable
        suffix=" lbs"
        onChange={onChange}
      />
      </div>
      {note && <p className="px-4 py-3 text-sm text-stone-400">{note}</p>}
      {/* A barbell: the bar's own weight, then what goes on each side. */}
      {equipment === 'barbell' && (
        <div className="px-4 py-2.5">
          <StepperRow label="Bar" value={bar} step={BAR_STEP} min={BAR_MIN} max={BAR_MAX} editable suffix=" lbs" onChange={onBar} />
        </div>
      )}
      {perSide !== null && (
        <div className="px-4 py-3.5 flex items-center justify-between">
          <span className="text-base text-stone-600">Weight per side (plates)</span>
          <span className="text-base font-semibold text-stone-900">{perSide > 0 ? `${fmt(perSide)} lbs` : 'Empty bar'}</span>
        </div>
      )}
    </div>
  )
}
