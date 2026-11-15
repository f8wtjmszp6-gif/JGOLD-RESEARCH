import { NUTRIENTS, MEALS, num } from '../../utils/nutrition'

// The six numbers in a row: value over a small label. `strip`: the blue
// band a meal's totals sit in; otherwise the plain line under a food.
export function Numbers({ n, strip = false }) {
  return (
    <div className={`grid grid-cols-6 gap-1 ${strip ? 'bg-accent-50 rounded-[10px] px-2.5 py-2' : ''}`}>
      {NUTRIENTS.map(x => (
        <span key={x.key} className="flex flex-col gap-px min-w-0">
          <span className={`text-[13px] leading-tight ${strip ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>{num(n[x.key] ?? 0)}{x.unit}</span>
          <span className={`text-[10px] leading-tight ${strip ? 'text-accent-600/80' : 'text-stone-400'}`}>{x.short}</span>
        </span>
      ))}
    </div>
  )
}

// Breakfast / Lunch / Dinner / Snacks, like Gym / Cardio / Stretch on Fitness.
export function MealSwitch({ meal, onMeal, compact = false }) {
  return (
    <div className="flex-1 min-w-0 bg-stone-100 rounded-xl p-1 flex" role="tablist" aria-label="Meal">
      {MEALS.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={meal === id}
          onClick={() => onMeal(id)}
          className={`flex-1 min-w-0 ${compact ? 'py-1.5' : 'py-2'} rounded-lg text-[13px] font-semibold transition-all ${meal === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Two choices side by side (From the label | Ingredients, g | mL).
export function Toggle({ value, options, onChange, small = false }) {
  return (
    <div className={`bg-stone-100 rounded-xl p-1 flex ${small ? 'shrink-0' : ''}`} role="radiogroup">
      {options.map(([key, text]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`${small ? 'w-11 py-1' : 'flex-1 py-1.5'} rounded-lg text-[13px] font-semibold transition-all ${value === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function SectionLabel({ children }) {
  return <p className="px-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-500">{children}</p>
}

// A boxed field: a small label over what you type.
export function Field({ label, value, onChange, placeholder = '0', numeric = true }) {
  return (
    <label className="border border-stone-200 rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-semibold text-stone-600">{label}</span>
      <input
        inputMode={numeric ? 'decimal' : 'text'}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[17px] font-bold text-stone-900 placeholder:text-stone-300"
      />
    </label>
  )
}

// A boxed number with − and + (Servings, Makes).
export function BoxStepper({ label, text, onLess, onMore, lessDisabled }) {
  return (
    <div className="border border-stone-200 rounded-xl pl-3 pr-2 py-2 flex items-center justify-between gap-1.5 min-w-0">
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] font-semibold text-stone-600">{label}</span>
        <span className="text-[17px] font-bold text-stone-900 whitespace-nowrap">{text}</span>
      </span>
      <span className="flex gap-1 shrink-0">
        <button onClick={onLess} disabled={lessDisabled} aria-label={`Less ${label}`} className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 font-bold active:bg-stone-200 disabled:opacity-40">−</button>
        <button onClick={onMore} aria-label={`More ${label}`} className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 font-bold active:bg-stone-200">+</button>
      </span>
    </div>
  )
}

export function BigButton({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full h-[52px] rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 disabled:opacity-40 transition-colors">
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl bg-white shadow-sm px-4 py-3 ${className}`}>{children}</div>
}
