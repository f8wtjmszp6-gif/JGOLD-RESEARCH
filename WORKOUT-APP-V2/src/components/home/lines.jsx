import { CLASS_AREAS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { dayLabel } from '../../utils/days'
import { TAB_DOT } from '../../utils/dayKinds'
import { cardioMinutes } from '../../utils/format'
import { InfoMark } from '../ui/InfoMark'

// "Upper · Core", or "Full body" when all three were worked.
function areasLabel(areas) {
  return areas.length === CLASS_AREAS.length
    ? 'Full body'
    : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => a.label).join(' · ')
}

// A logged item's row, kept to one line: its day, then each part with its
// tab's dot (as on the week strip). Tap it to edit it or change its day.
// At the right end, a mark you can tap for what it means (InfoMark):
//   `workout` – a dumbbell, for things that only sometimes count toward your
//     workouts: this one did. False keeps its place empty, so names line up;
//     leave it out for things that never count (walks, rest).
//   `early`   – a stop sign: it was ended before it was finished, so it
//     doesn't count.
// `end`: grey text at the right end (before the mark), as what a cardio
// session was or a full-body day's equipment.
export function LineButton({ label, day, workout, early = false, end, onEdit, children }) {
  return (
    <div className="flex items-center gap-1 -mx-1">
      <button
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="flex-1 min-w-0 flex items-center gap-2 text-[13px] text-stone-500 text-left whitespace-nowrap rounded-lg px-1 py-0.5 active:bg-stone-100"
      >
        <span className="w-8 shrink-0 text-sm font-semibold text-stone-600">{day}</span>
        <span className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">{children}</span>
        {end && <span className="shrink-0 text-stone-400">{end}</span>}
      </button>
      {early ? <InfoMark kind="early" className="-my-1" />
        : workout ? <InfoMark kind="workout" className="-my-1" />
        : workout === false && <span className="w-7 shrink-0" />}
    </div>
  )
}

// One part of a line, with its tab's dot: gym, cardio, stretch or rest.
export function Part({ kind, children }) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[kind]}`} />
      {children}
    </span>
  )
}

// One class: its day, then each thing it was.
export function ClassLine({ entry, onEdit }) {
  const day = dayLabel(entry.at)
  const strength = entry.strength && entry.areas.length > 0
  return (
    <LineButton label={`${day} class`} day={day} workout={classIsWorkout(entry)} onEdit={onEdit}>
      {entry.cardio && <Part kind="cardio">{cardioMinutes([entry])}</Part>}
      {strength && <Part kind="gym">{areasLabel(entry.areas)}</Part>}
      {entry.stretch && <Part kind="stretch">Stretch{entry.stretchMinutes ? ` ${entry.stretchMinutes} min` : ''}</Part>}
    </LineButton>
  )
}

// One cardio session: its length and effort, what it was (at the right),
// and whether it was long enough to count as a workout.
// `showWorkout` is off for walks, which never count as workouts.
export function CardioLine({ session, showWorkout = true, onEdit }) {
  const day = dayLabel(session.at)
  return (
    <LineButton
      label={`${day} ${session.type ?? (session.kind === 'walk' ? 'walk' : 'cardio')}`}
      day={day}
      workout={showWorkout ? cardioIsWorkout(session) : undefined}
      end={session.type && session.type !== 'Other' ? session.type : undefined}
      onEdit={onEdit}
    >
      <Part kind="cardio">{cardioMinutes([session])}</Part>
    </LineButton>
  )
}

// One session on your own: its length, and whether it was a workout.
// Sessions logged before lengths were asked have none.
export function StretchLine({ session, onEdit }) {
  const day = dayLabel(session.at)
  return (
    <LineButton label={`${day} stretch session`} day={day} workout={session.minutes >= STRETCH_WORKOUT_MINUTES} onEdit={onEdit}>
      <Part kind="stretch">{session.minutes !== null ? `Stretch ${session.minutes} min` : 'Stretch'}</Part>
    </LineButton>
  )
}
