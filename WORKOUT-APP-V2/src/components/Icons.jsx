// Line icons for the plan and activity tiles: the gear each plan uses, and an
// everyday object for the rest. Drawn on a 48 grid in the tile's own color.
const PATHS = {
  // Bench and bar
  push: (
    <>
      <path d="M10 33h28M14 33v7M34 33v7" />
      <path d="M6 21h36" />
      <rect x="8" y="14" width="4" height="14" rx="1.5" />
      <rect x="36" y="14" width="4" height="14" rx="1.5" />
    </>
  ),
  // Squat rack
  legsQuad: (
    <>
      <path d="M13 42V7M35 42V7M9 42h8M31 42h8" />
      <path d="M6 17h36" />
      <rect x="8" y="11" width="4" height="12" rx="1.5" />
      <rect x="36" y="11" width="4" height="12" rx="1.5" />
      <path d="M13 21h3M35 21h-3" />
    </>
  ),
  // Cable rope handle
  pull: (
    <>
      <circle cx="24" cy="7" r="3" />
      <path d="M24 10v8M24 18l-7 16M24 18l7 16" />
      <circle cx="16" cy="37" r="3.2" />
      <circle cx="32" cy="37" r="3.2" />
    </>
  ),
  // Trap bar
  legsPost: (
    <>
      <path d="M17 14h14l7 10-7 10H17l-7-10z" />
      <path d="M20 20v8M28 20v8" />
      <path d="M3 24h7M38 24h7" />
      <rect x="2" y="18" width="4" height="12" rx="1.5" />
      <rect x="42" y="18" width="4" height="12" rx="1.5" />
    </>
  ),
  // Two people
  class: (
    <>
      <circle cx="17" cy="15" r="5" />
      <circle cx="32" cy="17" r="4" />
      <path d="M7 38c0-7 4-12 10-12s10 5 10 12" />
      <path d="M29 27c6 0 11 4 11 11" />
    </>
  ),
  // Sneaker
  walk: (
    <>
      <path d="M6 33v-6c0-2 1.5-3 3.5-3H16l4.5-7.5c.8-1.4 2.6-1.6 3.8-.6l7.2 6.1c2.6 2.2 5.6 3.5 9 3.9 1 .1 1.5.9 1.5 1.8V33z" />
      <path d="M6 38h36" />
      <path d="M22 21l3 2M20 24l3 2" />
    </>
  ),
  // Heart and pulse
  cardio: (
    <>
      <path d="M24 40S8 31 8 19a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 12-16 21-16 21z" />
      <path d="M12 24h7l3-5 4 9 3-4h7" />
    </>
  ),
  // Mat rolling out
  stretch: (
    <>
      <path d="M4 34h30" />
      <circle cx="38" cy="28" r="6" />
      <circle cx="38" cy="28" r="2" />
      <path d="M4 34v-4h28" />
    </>
  ),
  // Moon
  rest: (
    <>
      <path d="M31 8a14 14 0 1 0 9 22A12 12 0 0 1 31 8z" />
      <path d="M34 12h5l-5 6h5" />
    </>
  ),
}
PATHS.gym = PATHS.push

const COLORS = {
  push: 'text-orange-600',
  legsQuad: 'text-orange-600',
  pull: 'text-orange-600',
  legsPost: 'text-orange-600',
  gym: 'text-orange-600',
  class: 'text-violet-600',
  walk: 'text-emerald-600',
  cardio: 'text-cyan-600',
  stretch: 'text-teal-600',
  rest: 'text-indigo-600',
}

// `size` in px. Small icons (the This week chips) get heavier lines so they
// don't vanish.
export function TileIcon({ id, size = 36 }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={size < 24 ? 3.2 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${COLORS[id]} shrink-0`}
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  )
}
