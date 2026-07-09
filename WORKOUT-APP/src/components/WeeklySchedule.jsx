import { useState } from 'react'
import { schedule, DAYS } from '../data/workout'

const HERO = `${import.meta.env.BASE_URL}workout-hero-image.jpg`

const dayColors = {
  lift: 'bg-orange-100 text-orange-600',
  otf: 'bg-red-100 text-red-600',
  walk: 'bg-emerald-100 text-emerald-600',
  rest: 'bg-stone-100 text-stone-400',
}

const dayIcons = {
  lift: '🏋️',
  otf: '🔥',
  walk: '🚶',
  rest: '😴',
}

export default function WeeklySchedule({ onSelectDay, store }) {
  if (!store.startDate) {
    return <StartDateSetup onSet={store.setStartDate} />
  }

  const today = store.getTodayKey()
  const allDays = [...DAYS, 'saturday', 'sunday']

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative h-48 shrink-0 overflow-hidden">
        <img
          src={HERO}
          className="w-full h-full object-cover"
          alt=""
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 20%, #fafaf9 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Workouts</h1>
          <p className="text-stone-500 text-sm mt-0.5">Week {store.currentWeek} of 12</p>
        </div>
      </div>

      {store.pendingMissedDays && (
        <MissedDaysBanner
          week={store.pendingMissedDays}
          onRedo={store.redoWeek}
          onContinue={store.advanceWeek}
        />
      )}

      <div className="px-5 mb-3">
        <WeekBadge week={store.currentWeek} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5">
        {allDays.map(day => {
          const d = schedule[day]
          if (!d) return null
          const isToday = today === day

          if (day === 'saturday' || day === 'sunday') {
            return <WeekendCard key={day} day={day} label={d.label} isToday={isToday} store={store} />
          }
          if (d.type === 'otf') {
            return <OtfCard key={day} d={d} isToday={isToday} store={store} />
          }
          return <LiftCard key={day} day={day} d={d} isToday={isToday} store={store} onSelect={() => onSelectDay(day)} />
        })}
      </div>
    </div>
  )
}

// Shared card row: colored icon tile + label/name on the left, `right` slot on the right.
function CardRow({ icon, iconColor, label, name, isToday, right }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${iconColor}`}>{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900">{label}</span>
            {isToday && (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">Today</span>
            )}
          </div>
          <span className="text-sm text-stone-400">{name}</span>
        </div>
      </div>
      {right}
    </div>
  )
}

function LiftCard({ day, d, isToday, store, onSelect }) {
  const exerciseCount = d.exercises.length
  const completed = d.exercises.filter(e => store.getChecked(day, 'exercises', e.id)).length
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl px-4 py-3.5 bg-white transition-all active:scale-[0.98] ${
        isToday ? 'ring-2 ring-orange-400 shadow-sm' : 'shadow-sm'
      }`}
    >
      <CardRow
        icon={dayIcons[d.type]}
        iconColor={dayColors[d.type]}
        label={d.label}
        name={d.name}
        isToday={isToday}
        right={exerciseCount > 0 && (
          <div className="text-right">
            <span className="text-sm font-medium text-stone-500">{completed}/{exerciseCount}</span>
            <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${exerciseCount ? (completed / exerciseCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      />
    </button>
  )
}

function WeekendCard({ day, label, isToday, store }) {
  const isWalk = store.getWeekendMode(day) === 'walk'
  return (
    <div className={`w-full rounded-2xl px-4 py-3.5 bg-white ${isToday ? 'ring-2 ring-orange-400 shadow-sm' : 'shadow-sm'}`}>
      <CardRow
        icon={isWalk ? '🚶' : '😴'}
        iconColor={isWalk ? dayColors.walk : dayColors.rest}
        label={label}
        name={isWalk ? '30-Min Walk' : 'Rest & Recovery'}
        isToday={isToday}
        right={
          <Toggle
            on={isWalk}
            onLabel="Walk"
            offLabel="Rest"
            onToggle={() => store.setWeekendMode(day, isWalk ? 'rest' : 'walk')}
          />
        }
      />
    </div>
  )
}

function OtfCard({ d, isToday, store }) {
  const done = store.getChecked('wednesday', 'otf', 'done')
  return (
    <div className={`w-full rounded-2xl px-4 py-3.5 bg-white ${isToday ? 'ring-2 ring-orange-400 shadow-sm' : 'shadow-sm'}`}>
      <CardRow
        icon={dayIcons.otf}
        iconColor={dayColors.otf}
        label={d.label}
        name={d.name}
        isToday={isToday}
        right={
          <button
            onClick={() => store.toggleChecked('wednesday', 'otf', 'done')}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <span className={`text-xs font-medium ${done ? 'text-orange-500' : 'text-stone-400'}`}>
              {done ? 'Done' : 'Mark done'}
            </span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              done ? 'border-orange-500 bg-orange-500' : 'border-stone-200'
            }`}>
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </button>
        }
      />
    </div>
  )
}

function Toggle({ on, onToggle, onLabel, offLabel }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2.5 active:opacity-70">
      <span className={`text-xs font-medium ${on ? 'text-orange-500' : 'text-stone-400'}`}>
        {on ? onLabel : offLabel}
      </span>
      <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-orange-500' : 'bg-stone-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  )
}

function MissedDaysBanner({ week, onRedo, onContinue }) {
  return (
    <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <p className="text-stone-900 font-semibold text-sm mb-0.5">You missed some workouts</p>
      <p className="text-stone-500 text-xs mb-3">
        Not all lift days were completed in week {week}. Redo the week or continue to week {week + 1}.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onRedo}
          className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold active:bg-orange-600 transition-colors"
        >
          Redo Week {week}
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold active:bg-stone-200 transition-colors"
        >
          Continue to {week + 1}
        </button>
      </div>
    </div>
  )
}

function StartDateSetup({ onSet }) {
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  function isMonday(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).getDay() === 1
  }

  function handleSubmit() {
    if (!date) { setError('Please pick a date.'); return }
    if (!isMonday(date)) { setError('Start date must be a Monday.'); return }
    onSet(date)
  }

  const today = new Date()
  const day = today.getDay()
  const daysBack = day === 0 ? 6 : day - 1
  const earliestMonday = new Date(today)
  earliestMonday.setDate(today.getDate() - daysBack - 7 * 11)

  function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative h-52 shrink-0 overflow-hidden">
        <img src={HERO} className="w-full h-full object-cover" alt="" draggable={false} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 20%, #fafaf9 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Welcome</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8">
        <p className="text-stone-400 text-sm mb-8 leading-relaxed">
          Set the Monday you started (or plan to start) your 12-week program. The app will track your week automatically.
        </p>

        <div className="bg-white shadow-sm rounded-2xl p-5">
          <label className="text-stone-400 text-xs uppercase tracking-wider mb-2 block font-medium">Program Start Date</label>
          <input
            type="date"
            value={date}
            min={fmt(earliestMonday)}
            max={fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7))}
            onChange={e => { setDate(e.target.value); setError('') }}
            className="w-full bg-stone-50 text-stone-900 border border-stone-200 rounded-xl px-4 py-3 text-base appearance-none outline-none"
            style={{ colorScheme: 'light' }}
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <p className="text-stone-400 text-xs mt-2">Must be a Monday</p>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-5 w-full py-4 rounded-2xl bg-orange-500 text-white font-semibold text-base active:bg-orange-600 transition-colors"
        >
          Start Program
        </button>
      </div>
    </div>
  )
}

function WeekBadge({ week }) {
  const instructions = {
    1: 'Low end of rep range',
    2: '+1 rep per set',
    3: '+1 rep per set',
    4: 'Hit top of rep range',
    5: 'Drop reps + add weight',
    6: '+1 rep per set',
    7: '+1 rep per set',
    8: 'Hit top of rep range',
    9: 'Drop reps + add weight',
    10: '+1 rep per set',
    11: 'Hit top of rep range',
    12: 'Deload — 2 sets, -30% weight',
  }

  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-1">This Week</p>
          <p className="text-stone-900 font-semibold">{instructions[week]}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
          <span className="text-orange-500 font-bold text-base">{week}</span>
        </div>
      </div>
    </div>
  )
}
