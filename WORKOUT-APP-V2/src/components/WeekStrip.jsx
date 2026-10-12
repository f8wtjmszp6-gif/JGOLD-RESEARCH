import { useState } from 'react'
import { TileIcon } from './Icons'
import { weekDays, sameDay } from '../utils/days'

// A dot per thing done, in these colors (the key underneath names them).
const KINDS = [
  ['plan', 'Gym', 'bg-orange-500', 'bg-orange-50'],
  ['class', 'Class', 'bg-violet-500', 'bg-violet-50'],
  ['walk', 'Walk', 'bg-emerald-500', 'bg-emerald-50'],
  ['cardio', 'Cardio', 'bg-cyan-500', 'bg-cyan-50'],
  ['stretch', 'Stretch', 'bg-pink-500', 'bg-pink-50'],
  ['rest', 'Rest', 'bg-stone-400', 'bg-stone-100'],
]
const DOT = Object.fromEntries(KINDS.map(([k, , dot]) => [k, dot]))
const TILE = Object.fromEntries(KINDS.map(([k, , , tile]) => [k, tile]))
// A class's tags, colored like the ones on its card.
const TAG = { cardio: 'bg-emerald-50 text-emerald-700', strength: 'bg-orange-50 text-orange-700', stretch: 'bg-teal-50 text-teal-700' }

// This week, Monday to Sunday: each date with a dot for everything done that
// day. Tap a day to list it; tap it again or ✕ to close.
export default function WeekStrip({ dayLog }) {
  const [picked, setPicked] = useState(null)
  const now = new Date()
  const days = weekDays(now)
  const today = days.findIndex(d => sameDay(d, now))
  const shown = picked === null ? null : days[picked]

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl shadow-sm px-1.5 py-2 grid grid-cols-7" role="tablist" aria-label="This week by day">
        {days.map((d, i) => {
          const items = dayLog[i] ?? []
          const isToday = i === today
          const future = i > today
          return (
            <button
              key={i}
              role="tab"
              aria-selected={picked === i}
              aria-label={`${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${items.length ? items.map(x => x.label).join(', ') : 'nothing logged'}`}
              onClick={() => setPicked(picked === i ? null : i)}
              className={`flex flex-col items-center gap-1 py-0.5 rounded-xl active:bg-stone-100 ${future ? 'opacity-40' : ''}`}
            >
              <span className={`text-[11px] font-semibold ${isToday ? 'text-accent-500' : 'text-stone-400'}`}>
                {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${
                isToday ? 'bg-accent-500 text-white' : picked === i ? 'ring-2 ring-accent-500 text-accent-500' : 'text-stone-900'
              }`}>
                {d.getDate()}
              </span>
              <span className="flex gap-0.5 h-1.5">
                {items.slice(0, 4).map((x, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${DOT[x.kind]}`} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
        {KINDS.map(([k, label, dot]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>

      {shown && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-500">{shown.toLocaleDateString('en-US', { weekday: 'long' })}</p>
            <button onClick={() => setPicked(null)} aria-label="Close" className="w-7 h-7 -mr-1.5 rounded-lg text-stone-400 flex items-center justify-center active:bg-stone-100">✕</button>
          </div>
          {(dayLog[picked] ?? []).length === 0 ? (
            <p className="text-sm text-stone-400">{picked > today ? 'Nothing yet' : 'Nothing logged'}</p>
          ) : (
            dayLog[picked].map((x, j) => (
              <div key={j} className="flex items-center gap-2.5 text-sm text-stone-900">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TILE[x.kind]}`}>
                  <TileIcon id={x.icon} size={18} color={x.kind === 'stretch' ? 'text-pink-600' : x.kind === 'rest' ? 'text-stone-500' : undefined} />
                </span>
                <span className="min-w-0 flex flex-wrap items-center gap-1.5">
                  {x.label}
                  {x.tags?.map(t => <span key={t.kind} className={`text-xs font-semibold px-2 py-0.5 rounded-md ${TAG[t.kind]}`}>{t.text}</span>)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
