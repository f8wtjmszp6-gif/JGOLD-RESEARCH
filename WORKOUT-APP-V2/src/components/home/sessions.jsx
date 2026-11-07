// What's under way on a card: an IN PROGRESS line for each, under a rule.
// (Finished ones are on the Activities screen, where they can be changed.)
export function UnderWay({ children }) {
  const lines = [children].flat().filter(Boolean)
  if (!lines.length) return null
  return <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">{lines}</div>
}

// One under way: IN PROGRESS, then how far along (Parts). Tap it to carry on.
export function InProgressLine({ label, onOpen, children }) {
  return (
    <button
      onClick={onOpen}
      aria-label={`${label}, in progress`}
      className="w-full -mx-1 px-1 py-0.5 flex items-center gap-2 text-[13px] text-left whitespace-nowrap rounded-lg active:bg-stone-100"
    >
      <span className="shrink-0 text-[11px] font-bold tracking-wider text-orange-600">IN PROGRESS</span>
      <span className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden text-stone-500 tabular-nums">{children}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}
