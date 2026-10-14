import { weekdayOf } from '../../utils/days'

// A yellow note above a sheet's button.
export function Heads({ title, children }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-2 text-sm">
      <p className="flex items-center gap-1.5 font-semibold text-amber-800">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        {title}
      </p>
      {children}
    </div>
  )
}

// A log sheet's main button. On a rest day it says so and asks whether to keep
// the rest day, as two buttons; `verb` starts each ("Add · keep rest day").
export function LogButton({ store, at, verb, disabled, onSave, children }) {
  const rest = disabled ? -1 : store.restIndexOn(at)
  const main = 'w-full px-4 truncate py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400'
  if (rest < 0) return <button onClick={onSave} disabled={disabled} className={main}>{children}</button>
  return (
    <>
      <Heads title={`${weekdayOf(at)} is a rest day`}>
        <p className="text-stone-600">Keep it as a rest day, or remove it?</p>
      </Heads>
      <button onClick={onSave} className={main}>{verb} · keep rest day</button>
      <button
        onClick={() => { onSave(); store.deleteRest(rest) }}
        className="w-full py-3.5 rounded-2xl bg-stone-100 text-stone-900 font-semibold active:bg-stone-200 transition-colors"
      >
        {verb} · remove rest day
      </button>
    </>
  )
}
