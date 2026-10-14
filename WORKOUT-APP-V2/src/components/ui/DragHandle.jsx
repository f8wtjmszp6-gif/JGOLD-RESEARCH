// The grip at the left of a folded exercise: press and drag to reorder.
// touch-none keeps the page from scrolling while you drag it.
export function DragHandle({ name, ...handlers }) {
  return (
    <span
      data-grip
      role="button"
      aria-label={`Drag to reorder ${name}`}
      className="self-stretch flex items-center pl-2.5 pr-1.5 text-stone-300 touch-none cursor-grab active:cursor-grabbing active:text-accent-500"
      {...handlers}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
      </svg>
    </span>
  )
}
