import { useState } from 'react'
import { ScopeSheet } from '../components/ui/Sheet'

// Asks whether a change to a plan is for just this week or this week and
// after, then makes it. ask(title, run, note?): `run` gets 'week' or
// 'always'. Put the returned sheet in the page. On a past week there's
// nothing after it to ask about, and `skip` says not to (a list that's made
// fresh each time): the change is made there and then.
export function useScope(store, skip = false) {
  const [asking, setAsking] = useState(null)
  const ask = (title, run, note) => (store.past || skip ? run('always') : setAsking({ title, run, note }))
  const sheet = asking && (
    <ScopeSheet
      title={asking.title}
      note={asking.note}
      onPick={scope => { asking.run(scope); setAsking(null) }}
      onClose={() => setAsking(null)}
    />
  )
  return [ask, sheet]
}
