import { useEffect, useState } from 'react'
import { CLASS_AREAS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { dayLabel } from '../../utils/days'
import { TAB_DOT } from '../../utils/dayKinds'
import { WorkoutMark } from '../ui/Icons'

// "Upper · Core", or "Full body" when all three were worked.
function areasLabel(areas) {
  return areas.length === CLASS_AREAS.length
    ? 'Full body'
    : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => a.label).join(' · ')
}

// A logged item's row, kept to one line: its day, then each part with its
// tab's dot (as on the week strip). Tap it to edit it or change its day.
// At the right end, a mark you can tap for what it means:
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
      {early ? <Badge label="Ended early" text="Ended early, so it doesn’t count" tint="active:bg-amber-50"><EarlyMark /></Badge>
        : workout ? <Badge label="Qualifies as a workout" text="This qualifies as a workout" tint="active:bg-red-50"><WorkoutMark /></Badge>
        : workout === false && <span className="w-7 shrink-0" />}
    </div>
  )
}

// A mark at a line's end: tap it and a bubble says what it means.
function Badge({ label, text, tint, children }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setShown(false), 2500)
    return () => clearTimeout(t)
  }, [shown])
  return (
    <span className="relative shrink-0">
      <button
        onClick={() => setShown(v => !v)}
        aria-label={label}
        aria-expanded={shown}
        className={`w-7 h-7 -my-1 rounded-lg flex items-center justify-center ${tint}`}
      >
        {children}
      </button>
      {shown && (
        <span role="status" className="absolute right-0 bottom-full mb-1.5 z-20 whitespace-nowrap rounded-lg bg-stone-800 text-white text-xs font-medium px-2.5 py-1.5 shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}

// A small amber stop sign: ended before it was finished.
function EarlyMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" className="text-amber-500 shrink-0" aria-hidden="true">
      <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z" />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
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
      {entry.cardio && <Part kind="cardio">{entry.minutes} min {entry.hard ? 'hard' : 'easy'}</Part>}
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
      <Part kind="cardio">{session.minutes} min {session.hard ? 'hard' : 'easy'}</Part>
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
