import { CARDIO_WORKOUT_MINUTES, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'

// What in each tab counts toward the This week goals, shown from ⓘ as one
// table: a row per tab, a column per goal (null: doesn't count).
const WHAT_COUNTS = [
  ['gym', ['Finish a plan or log a class', 'Finish a plan’s stretches or log a class', 'Finish a plan’s warm-up or log class cardio']],
  ['cardio', [`Log ${CARDIO_WORKOUT_MINUTES.hard} min hard or ${CARDIO_WORKOUT_MINUTES.easy} easy`, null, 'Log any walk or session']],
  ['stretch', [`Stretch ${STRETCH_WORKOUT_MINUTES}+ min`, 'Finish the routine or a cool-down, or log a session', null]],
]

// ⓘ: what counts toward each This week goal, for every tab at once. The tab
// you opened it from is highlighted; tab names run up the side so the goal
// columns get the room.
export function WhatCountsSheet({ tab, onClose }) {
  const name = id => id[0].toUpperCase() + id.slice(1)
  const side = id => (
    <td className={`w-7 py-2 text-center align-middle border-t border-stone-100 ${id === tab ? 'rounded-l-xl' : ''}`}>
      <span className={`inline-block [writing-mode:vertical-rl] rotate-180 text-xs font-semibold tracking-wide whitespace-nowrap ${id === tab ? 'text-accent-500' : 'text-stone-900'}`}>{name(id)}</span>
    </td>
  )
  const row = id => (id === tab ? 'bg-accent-50' : '')
  return (
    <SettingsSheet title="What counts" onClose={onClose}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-[13px] leading-snug">
        <thead>
          <tr className="text-xs text-stone-500">
            <th className="w-7" />
            {['Workout', 'Stretch', 'Cardio'].map(h => <th key={h} className="px-1.5 pb-1.5 text-left font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {WHAT_COUNTS.map(([id, cells]) => (
            <tr key={id} className={row(id)}>
              {side(id)}
              {cells.map((c, i) => (
                <td key={i} className={`px-1.5 py-2.5 align-top border-t border-stone-100 ${c ? (id === tab ? 'text-stone-900' : 'text-stone-500') : 'text-stone-300'} ${id === tab && i === 2 ? 'rounded-r-xl' : ''}`}>
                  {c ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          <tr className={row('rest')}>
            {side('rest')}
            <td colSpan={3} className={`px-1.5 py-2.5 align-middle border-t border-stone-100 ${tab === 'rest' ? 'text-stone-900 rounded-r-xl' : 'text-stone-400'}`}>
              Rest days don’t count toward any goal
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-stone-400">Hard cardio minutes count double.</p>
    </SettingsSheet>
  )
}
