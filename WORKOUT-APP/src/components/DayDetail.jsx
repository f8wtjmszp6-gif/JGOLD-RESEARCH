import { useState } from 'react'
import StretchTimer from './StretchTimer'
import { getTargetReps } from '../utils/progression'

export default function DayDetail({ day, dayData, store, onBack }) {
  const [activeStretch, setActiveStretch] = useState(null)
  const [activeTimed, setActiveTimed] = useState(null)
  const [tab, setTab] = useState('exercises')

  const exerciseDone = dayData.exercises.filter(e => store.getChecked(day, 'exercises', e.id)).length
  const stretchDone = dayData.stretches.filter(s => store.getChecked(day, 'stretches', s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-orange-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Schedule</span>
        </button>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{dayData.label}</h1>
        <p className="text-stone-400 text-sm mt-1">{dayData.name}</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-3 bg-stone-50">
        <div className="bg-stone-100 rounded-xl p-1 flex">
          <TabBtn active={tab === 'exercises'} onClick={() => setTab('exercises')}>
            Exercises {exerciseDone > 0 && <span className="ml-1 text-orange-500">({exerciseDone}/{dayData.exercises.length})</span>}
          </TabBtn>
          <TabBtn active={tab === 'stretches'} onClick={() => setTab('stretches')}>
            Stretches {stretchDone > 0 && <span className="ml-1 text-orange-500">({stretchDone}/{dayData.stretches.length})</span>}
          </TabBtn>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
        {tab === 'exercises' && dayData.exercises.map(exercise => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            checked={store.getChecked(day, 'exercises', exercise.id)}
            onToggle={() => store.toggleChecked(day, 'exercises', exercise.id)}
            onTimer={exercise.isTime ? () => setActiveTimed(exercise) : null}
            currentWeek={store.currentWeek}
            barWeight={exercise.barbell ? store.getBarWeight(exercise.id, exercise.barbell.defaultBar) : null}
            onBarWeightChange={exercise.barbell ? (w) => store.setBarWeight(exercise.id, w) : null}
            customWeight={store.getCustomWeight(exercise.id)}
            onWeightChange={(val) => store.setCustomWeight(exercise.id, val)}
          />
        ))}

        {tab === 'stretches' && dayData.stretches.map(stretch => (
          <StretchCard
            key={stretch.id}
            stretch={stretch}
            checked={store.getChecked(day, 'stretches', stretch.id)}
            onToggle={() => store.toggleChecked(day, 'stretches', stretch.id)}
            onTimer={() => setActiveStretch(stretch)}
          />
        ))}
      </div>

      {/* Reset button */}
      <div className="px-5 pb-6 pt-2 bg-stone-50">
        <button
          onClick={() => store.clearDay(day)}
          className="w-full py-3 rounded-xl text-stone-400 text-sm active:text-stone-600 transition-colors"
        >
          Reset day
        </button>
      </div>

      {activeStretch && (
        <StretchTimer
          stretch={activeStretch}
          onClose={() => {
            store.toggleChecked(day, 'stretches', activeStretch.id)
            setActiveStretch(null)
          }}
        />
      )}

      {activeTimed && (
        <StretchTimer
          stretch={{ name: activeTimed.name, duration: activeTimed.durationSeconds, perSide: false }}
          onClose={() => setActiveTimed(null)}
        />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
      }`}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function ExerciseCard({ exercise, checked, onToggle, onTimer, currentWeek, barWeight, onBarWeightChange, customWeight, onWeightChange }) {
  const [editingWeight, setEditingWeight] = useState(false)
  const [draft, setDraft] = useState('')

  const target = getTargetReps(exercise.reps, currentWeek)

  // Barbell: effective plate weight (custom overrides data default)
  const effectivePlateWeight = exercise.barbell
    ? (typeof customWeight === 'number' ? customWeight - barWeight : exercise.barbell.plateWeight)
    : null
  const total = effectivePlateWeight != null && barWeight != null ? barWeight + effectivePlateWeight : null
  const perSide = effectivePlateWeight != null ? effectivePlateWeight / 2 : null
  const plateDisplay = perSide != null
    ? `2 × ${Number.isInteger(perSide) ? perSide : perSide.toFixed(1)} lb`
    : exercise.barbell?.plateDisplay

  // Non-barbell: custom string or default
  const displayWeight = !exercise.barbell
    ? (typeof customWeight === 'string' ? customWeight : exercise.weight)
    : null

  function startEdit() {
    setDraft(exercise.barbell ? String(total) : displayWeight)
    setEditingWeight(true)
  }

  function saveEdit() {
    setEditingWeight(false)
    if (exercise.barbell) {
      const newTotal = parseFloat(draft)
      if (!isNaN(newTotal) && newTotal > barWeight) {
        onWeightChange(newTotal)
      }
    } else {
      if (draft.trim()) onWeightChange(draft.trim())
    }
  }

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      checked ? 'bg-orange-50 border border-orange-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="shrink-0 mt-0.5 active:scale-95 transition-transform">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked ? 'border-orange-500 bg-orange-500' : 'border-stone-200'
          }`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold leading-tight ${checked ? 'text-orange-500 line-through' : 'text-stone-900'}`}>
              {exercise.name}
              {exercise.perSide && <span className="text-stone-400 font-normal text-sm ml-1">(per side)</span>}
            </p>
            {onTimer && (
              <button
                onClick={onTimer}
                className="shrink-0 w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center active:bg-orange-200 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <p className="text-stone-400 text-sm">{exercise.sets} sets × {exercise.reps}</p>
            {target != null && (
              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-medium">
                → {target} this week
              </span>
            )}
          </div>

          {/* Weight row */}
          {exercise.barbell ? (
            <div className="mt-2">
              <div className="flex gap-1">
                {[15, 25, 45].map(w => (
                  <button
                    key={w}
                    onClick={() => onBarWeightChange(w)}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                      barWeight === w
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-100 text-stone-500 active:bg-stone-200'
                    }`}
                  >
                    {w} lb bar
                  </button>
                ))}
              </div>
              {editingWeight ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="number"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    className="w-16 text-xs bg-stone-100 rounded-lg px-2.5 py-1 text-stone-900 outline-none"
                  />
                  <span className="text-stone-400 text-xs">lbs · {plateDisplay} per side</span>
                </div>
              ) : (
                <button onClick={startEdit} className="flex items-center gap-1.5 mt-1 group">
                  <span className="text-stone-400 text-xs">
                    {plateDisplay} plates · <span className="text-stone-600 font-medium">{total} lbs total</span>
                  </span>
                  <span className="text-stone-300 group-active:text-stone-500"><PencilIcon /></span>
                </button>
              )}
            </div>
          ) : (
            editingWeight ? (
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                autoFocus
                placeholder="e.g. 25 lbs assist"
                className="mt-1.5 w-full text-xs bg-stone-100 rounded-lg px-2.5 py-1.5 text-stone-900 outline-none"
              />
            ) : (
              <button onClick={startEdit} className="flex items-center gap-1.5 mt-1 group">
                <span className="text-stone-400 text-xs">{displayWeight}</span>
                <span className="text-stone-300 group-active:text-stone-500"><PencilIcon /></span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function StretchCard({ stretch, checked, onToggle, onTimer }) {
  return (
    <div className={`rounded-2xl p-4 transition-all ${
      checked ? 'bg-orange-50 border border-orange-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked ? 'border-orange-500 bg-orange-500' : 'border-stone-200'
          }`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
        <div className="flex-1">
          <p className={`font-semibold ${checked ? 'text-orange-500' : 'text-stone-900'}`}>{stretch.name}</p>
          <p className="text-stone-400 text-sm mt-0.5">
            {stretch.duration}s{stretch.perSide ? ' per side' : ''}
            {stretch.alt && <span className="text-stone-300"> · Alt: {stretch.alt}</span>}
          </p>
        </div>
        <button
          onClick={onTimer}
          className="shrink-0 w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center active:bg-orange-200 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
