import { useState } from 'react'
import { fmt } from '../../utils/format'

// ── A −/+ row used inside the settings menu ──────────────────────────────────
export function StepperRow({ label, value, step, min = 0, max = Infinity, editable, suffix = '', format = fmt, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const clamp = v => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  function save() {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(clamp(n))
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-stone-600">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 transition-colors"
        >
          −
        </button>
        {editing ? (
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="w-16 text-center text-xl font-bold bg-stone-100 rounded-lg px-1 py-1 text-stone-900 outline-none"
          />
        ) : (
          <button
            onClick={() => { if (editable) { setDraft(String(value)); setEditing(true) } }}
            className={`w-16 text-center text-xl font-bold text-stone-900 ${editable ? 'active:opacity-60' : ''}`}
          >
            {format(value)}{suffix && <span className="text-xs font-medium text-stone-400">{suffix}</span>}
          </button>
        )}
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── Building blocks for the settings sheet ──────────────────────────────────
export function Segmented({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base text-stone-600">{label}</span>
      <div className="bg-stone-100 rounded-xl p-1 flex">
        {options.map(([key, text]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              value === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ToggleRow({ label, detail, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center justify-between gap-3 w-full text-left active:opacity-70">
      <span>
        <span className="block text-base text-stone-600">{label}</span>
        {detail && <span className="block text-xs text-stone-400">{detail}</span>}
      </span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${on ? 'bg-accent-500' : 'bg-stone-300'}`}>
        <span className={`block w-5 h-5 rounded-full bg-[#fff] shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
