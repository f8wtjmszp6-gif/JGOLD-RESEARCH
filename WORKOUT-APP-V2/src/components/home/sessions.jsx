import { FULL_BODY_BY_ID, STRETCH_ROUTINE, COOL_DOWN_BY_ID } from '../../data/workout'
import { dayLabel } from '../../utils/days'
import { LineButton, Part } from './lines'

// What shows at a line's right end: a full-body day's equipment ("Gym
// Equipment", "Dumbbells", "No Equipment"), or what a cool-down was after.
const endOf = id => (COOL_DOWN_BY_ID[id] ? COOL_DOWN_BY_ID[id].label : FULL_BODY_BY_ID[id]?.label.replace(/^With /, ''))
const nameOf = id => (COOL_DOWN_BY_ID[id] ? `Cool Down · ${COOL_DOWN_BY_ID[id].label}` : FULL_BODY_BY_ID[id] ? `Full Body · ${FULL_BODY_BY_ID[id].label}` : STRETCH_ROUTINE.name)

// A card's sessions on their own lines (see store.sessionsFor). Tapping one
// asks what to do with it (see LineMenu). One ended before it was finished
// gets the stop sign; a finished Full Body Stretch that counted, the dumbbell. A
// finished full-body day always counts and a cool-down never does, so only
// the Full Body Stretch gets the dumbbell.
export function SessionLines({ list, onMenu }) {
  if (!list.length) return null
  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
      {list.map(x => {
        const day = dayLabel(x.at)
        const routine = x.id === STRETCH_ROUTINE.id
        const stretch = routine || !!COOL_DOWN_BY_ID[x.id]
        return (
          <LineButton
            key={x.filed ? `filed-${x.index}` : x.id}
            label={`${day} ${nameOf(x.id)}`}
            day={day}
            workout={routine ? x.counts : false}
            early={stretch ? x.stretched < x.stretches : x.done < x.total}
            end={endOf(x.id)}
            onEdit={() => onMenu(x.filed ? { kind: 'session', index: x.index } : { kind: 'open', id: x.id })}
          >
            {stretch ? (
              // One ended early shows how far it got.
              <Part kind="stretch">{x.stretched < x.stretches ? `${x.stretched}/${x.stretches} stretches` : `Stretch ${x.minutes} min`}</Part>
            ) : (
              <>
                <Part kind="gym">{x.done}/{x.total} sets</Part>
                <Part kind="stretch">{x.stretched}/{x.stretches} stretches</Part>
              </>
            )}
          </LineButton>
        )
      })}
    </div>
  )
}
