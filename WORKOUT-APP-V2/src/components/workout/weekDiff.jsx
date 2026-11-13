// How this week's version of a plan differs from every week's (see
// weekDiffOf). For one you can do any number of times (`repeat`), it's this
// time.
const when = repeat => (repeat ? 'this time' : 'this week')

// Over the list while it differs, with Reset to go back to every week's.
export function DiffBar({ repeat, onReset }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-accent-50 px-4 py-2.5">
      <span className="flex-1 min-w-0 text-sm font-semibold text-accent-600">{repeat ? 'This time' : 'This week'} differs from your default</span>
      <button onClick={onReset} className="text-sm font-semibold text-accent-500 active:opacity-70">Reset</button>
    </div>
  )
}

// By the name of one added just for now.
export function WeekTag({ repeat }) {
  return <span className="ml-1.5 align-[1px] whitespace-nowrap rounded-full bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold text-accent-600">{repeat ? 'This time' : 'This week'}</span>
}

// One taken out just for now, struck through where it would be, with Undo
// to put it back.
export function OffRow({ name, repeat, onUndo }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-stone-100/70 pl-4 pr-2 py-1.5">
      <span className="flex-1 min-w-0 truncate font-semibold text-stone-400 line-through">{name}</span>
      <span className="shrink-0 text-[11px] font-bold text-stone-400">Off {when(repeat)}</span>
      <button onClick={onUndo} aria-label="Undo" className="shrink-0 rounded-lg px-2.5 py-1 text-lg leading-none font-bold text-accent-500 active:bg-stone-200">↺</button>
    </div>
  )
}
