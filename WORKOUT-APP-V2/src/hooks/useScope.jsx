import { useState } from 'react'
import { ScopeSheet } from '../components/ui/Sheet'
import { REPEATABLE } from '../store/state'
import { FULL_BODY_BY_ID, TARGETED } from '../data/workout'

// Asks whether a change to a plan is for just this week or this week and
// after (for `id`, one you can do any number of times: this time or every
// time), then makes it. ask(title, run, note?): `run` gets 'week' or
// 'always'. Put the returned sheet in the page. On a past week there's
// nothing after it to ask about: the change is made to that week there and
// then ('past'). Build a Workout's (full body or picked areas) are made
// fresh each time, so a change is just for that one, without asking.
export function useScope(store, id) {
  const [asking, setAsking] = useState(null)
  const fresh = !!FULL_BODY_BY_ID[id] || id === TARGETED.id
  const ask = (title, run, note) => (store.past ? run('past') : fresh ? run('week') : setAsking({ title, run, note }))
  const sheet = asking && (
    <ScopeSheet
      title={asking.title}
      note={asking.note}
      repeat={REPEATABLE.has(id)}
      onPick={scope => { asking.run(scope); setAsking(null) }}
      onClose={() => setAsking(null)}
    />
  )
  return [ask, sheet]
}
