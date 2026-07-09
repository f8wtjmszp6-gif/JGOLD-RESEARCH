import { useState } from 'react'
import { twelveWeekProgram, progressionRules, coreProgression } from '../data/workout'

export default function ProgramView({ store }) {
  const { currentWeek, startDate, setWeek, setStartDate, restartProgram } = store
  const [editingDate, setEditingDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [confirmRestart, setConfirmRestart] = useState(false)

  function isMonday(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).getDay() === 1
  }

  function handleDateSave() {
    if (!newDate) { setDateError('Please pick a date.'); return }
    if (!isMonday(newDate)) { setDateError('Must be a Monday.'); return }
    setStartDate(newDate)
    setEditingDate(false)
    setDateError('')
  }

  function fmtDisplay(dateStr) {
    if (!dateStr) return '—'
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">

        {/* Start date card */}
        <div className="bg-white shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Program Start Date</p>
            <button
              onClick={() => { setEditingDate(e => !e); setNewDate(startDate ?? ''); setDateError('') }}
              className="text-orange-500 text-xs font-semibold active:opacity-70"
            >
              {editingDate ? 'Cancel' : 'Change'}
            </button>
          </div>
          {editingDate ? (
            <div className="mt-2">
              <input
                type="date"
                value={newDate}
                onChange={e => { setNewDate(e.target.value); setDateError('') }}
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ colorScheme: 'light' }}
              />
              {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
              <p className="text-stone-400 text-xs mt-1">Must be a Monday</p>
              <button
                onClick={handleDateSave}
                className="mt-3 w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold active:bg-orange-600 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-stone-900 font-semibold mt-0.5">{fmtDisplay(startDate)}</p>
          )}
        </div>

        {/* Week selector */}
        <div className="space-y-2">
          {twelveWeekProgram.map(({ week, instruction, detail }) => {
            const isCurrent = week === currentWeek
            const isPast = week < currentWeek
            return (
              <button
                key={week}
                onClick={() => setWeek(week)}
                className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-orange-50 border border-orange-200 shadow-sm'
                    : isPast
                    ? 'bg-stone-50 opacity-60'
                    : 'bg-white shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                    isCurrent
                      ? 'bg-orange-500 text-white'
                      : isPast
                      ? 'bg-stone-200 text-stone-400'
                      : 'bg-stone-100 text-stone-400'
                  }`}>
                    {week}
                  </div>
                  <div>
                    <p className={`font-semibold ${isCurrent ? 'text-orange-500' : 'text-stone-900'}`}>{instruction}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{detail}</p>
                  </div>
                  {isCurrent && (
                    <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full shrink-0 font-medium">Current</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Progression Rules */}
        <Section title="Weight Progression Rules">
          <p className="text-stone-400 text-xs mb-3">Applied at weeks 5 & 9</p>
          {progressionRules.map(r => (
            <div key={r.category} className="bg-white shadow-sm rounded-xl p-3 mb-2">
              <p className="text-stone-900 text-sm font-semibold">{r.category}</p>
              <p className="text-stone-400 text-xs mt-0.5">{r.exercises}</p>
              <p className="text-orange-500 text-sm mt-1 font-medium">{r.rule}</p>
            </div>
          ))}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mt-1">
            <p className="text-orange-600 text-xs">💡 Barbell upper body adds 2.5 lbs per side — fractional plates recommended</p>
          </div>
        </Section>

        {/* Core Progression */}
        <Section title="Core Progression">
          {coreProgression.map(c => (
            <div key={c.exercise} className="bg-white shadow-sm rounded-xl p-3 mb-2">
              <p className="text-stone-900 text-sm font-semibold">{c.exercise}</p>
              <p className="text-stone-500 text-xs mt-1">{c.rule}</p>
            </div>
          ))}
        </Section>

        {/* After Week 12 */}
        <Section title="After Week 12">
          <div className="bg-white shadow-sm rounded-xl p-4">
            <p className="text-stone-900 text-sm font-semibold mb-2">Restart the Cycle</p>
            <p className="text-stone-500 text-sm">Begin cycle 2 at the weight used in <span className="text-orange-500 font-medium">week 9 of the previous cycle</span>. That is your new starting baseline.</p>
          </div>
        </Section>

        {/* Restart */}
        <div className="border-t border-stone-100 pt-6">
          {!confirmRestart ? (
            <button
              onClick={() => setConfirmRestart(true)}
              className="w-full py-3.5 rounded-2xl border border-stone-200 text-stone-500 text-sm font-medium active:bg-stone-50 transition-colors"
            >
              Restart Program
            </button>
          ) : (
            <div className="bg-white shadow-sm rounded-2xl p-4">
              <p className="text-stone-900 font-semibold text-sm mb-1">Reset all progress?</p>
              <p className="text-stone-400 text-xs mb-4">This clears your log and sets the start date to this Monday (Week 1).</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { restartProgram(); setConfirmRestart(false) }}
                  className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold active:bg-stone-700 transition-colors"
                >
                  Yes, Restart
                </button>
                <button
                  onClick={() => setConfirmRestart(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold active:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-stone-900 font-bold text-base mb-3">{title}</h2>
      {children}
    </div>
  )
}
