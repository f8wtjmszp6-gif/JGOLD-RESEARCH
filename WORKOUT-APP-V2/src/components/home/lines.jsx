import { CLASS_AREAS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { dayLabel } from '../../utils/days'

// "Upper · Core", or "Full body" when all three were worked.
function areasLabel(areas) {
  return areas.length === CLASS_AREAS.length
    ? 'Full body'
    : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => a.label).join(' · ')
}

const TAG = 'text-xs font-semibold px-2 py-0.5 rounded-md'

// A logged item's row: tap it to edit it or change its day.
export function LineButton({ label, onEdit, children }) {
  return (
    <button onClick={onEdit} aria-label={`Edit ${label}`} className="w-full flex items-center gap-1.5 text-sm text-left rounded-lg -mx-1 px-1 py-0.5 active:bg-stone-100">
      <span className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">{children}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

// One class: its day, then a tag for each thing it was.
export function ClassLine({ entry, onEdit }) {
  const day = dayLabel(entry.at)
  const strength = entry.strength && entry.areas.length > 0
  return (
    <LineButton label={`${day} class`} onEdit={onEdit}>
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {entry.cardio && <span className={`${TAG} bg-emerald-50 text-emerald-700`}>{entry.minutes} min {entry.hard ? 'hard' : 'easy'} cardio</span>}
      {strength && <span className={`${TAG} bg-orange-50 text-orange-700`}>{areasLabel(entry.areas)}</span>}
      {entry.stretch && <span className={`${TAG} bg-teal-50 text-teal-700`}>Stretch{entry.stretchMinutes ? ` ${entry.stretchMinutes} min` : ''}</span>}
      {!classIsWorkout(entry) && <span className="text-xs text-stone-400">Not a workout</span>}
    </LineButton>
  )
}

// One other-cardio session: its day, length and effort, and whether it was
// long enough to count as a workout.
// `showWorkout` is off for walks, which never count as workouts.
export function CardioLine({ session, showWorkout = true, onEdit }) {
  const day = dayLabel(session.at)
  return (
    <LineButton label={`${day} ${session.type ?? (session.kind === 'walk' ? 'walk' : 'cardio')}`} onEdit={onEdit}>
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {session.type && session.type !== 'Other' && (
        <span className={`${TAG} ${session.kind === 'sport' ? 'bg-lime-50 text-lime-800' : 'bg-cyan-50 text-cyan-700'}`}>{session.type}</span>
      )}
      <span className={`${TAG} bg-emerald-50 text-emerald-700`}>{session.minutes} min {session.hard ? 'hard' : 'easy'}</span>
      {showWorkout && cardioIsWorkout(session) && <span className={`${TAG} bg-cyan-50 text-cyan-700`}>Workout</span>}
    </LineButton>
  )
}

// One session on your own: its day, length, and whether it was a workout.
export function StretchLine({ session, onEdit }) {
  const day = dayLabel(session.at)
  return (
    <LineButton label={`${day} stretch session`} onEdit={onEdit}>
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {session.minutes !== null && <span className={`${TAG} bg-teal-50 text-teal-700`}>{session.minutes} min</span>}
      {session.minutes >= STRETCH_WORKOUT_MINUTES && <span className={`${TAG} bg-pink-50 text-pink-700`}>Workout</span>}
    </LineButton>
  )
}
