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
  // A bodybuilder standing front-on, for the Full Body Workout card
  fullBody: (
    <>
      <circle cx="24" cy="6.8" r="3.3" />
      <path d="M20.5 11.5c-2.6.6-5.6 1.4-7.4 3.4M27.5 11.5c2.6.6 5.6 1.4 7.4 3.4" />
      <path d="M13.1 14.9c-1.8 2.6-2.6 6.3-2.5 10.2l1 3.4M17 18.5c.3 3.3-.3 6-2 8.4l-.6 1.6" />
      <path d="M34.9 14.9c1.8 2.6 2.6 6.3 2.5 10.2l-1 3.4M31 18.5c-.3 3.3.3 6 2 8.4l.6 1.6" />
      <circle cx="12.9" cy="30.2" r="1.7" />
      <circle cx="35.1" cy="30.2" r="1.7" />
      <path d="M17 18.5c2 1.9 4.5 2.2 7 .9 2.5 1.3 5 1 7-.9" />
      <path d="M17 18.5c.4 4 1 7.2 2.6 10.3h8.8c1.6-3.1 2.2-6.3 2.6-10.3" />
      <path d="M24 19.4v9.4M21.2 22.6h5.6M21.4 25.6h5.2" />
      <path d="M19.6 28.8l-.9 3.2h10.6l-.9-3.2" />
      <path d="M18.7 32l-.9 11h3.6l2.6-9.5 2.6 9.5h3.6l-.9-11" />
    </>
  ),
  // Mountain and sun, for sports and hikes
  sport: (
    <>
      <path d="M4 39l13-19 7 9 6-7 14 17z" />
      <path d="M17 20l3 5 3-2" />
      <circle cx="36" cy="11" r="4" />
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
  push: 'text-red-600',
  legsQuad: 'text-red-600',
  pull: 'text-red-600',
  legsPost: 'text-red-600',
  fullBody: 'text-orange-600',
  gym: 'text-red-600',
  class: 'text-violet-600',
  walk: 'text-emerald-600',
  cardio: 'text-cyan-600',
  sport: 'text-lime-700',
  stretch: 'text-teal-600',
  rest: 'text-indigo-600',
}

// `size` in px. Small icons (the This week chips, the week strip) get heavier
// lines so they don't vanish. `color` overrides the tile's text color.
export function TileIcon({ id, size = 36, color }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={size < 16 ? 3.2 : size < 24 ? 2.6 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${color ?? COLORS[id]} shrink-0`}
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  )
}

// Small line icons for what a cardio session or sport was, on a 24 grid.
// A sport typed in under Other gets the dots.
const TYPE_PATHS = {
  Run: <><circle cx="15" cy="4.5" r="2" /><path d="M8 21l3-6 3 2v5M6 11l3-3h4l3 4 3 1M11 15l1-5" /></>,
  Bike: <><circle cx="6" cy="16" r="4" /><circle cx="18" cy="16" r="4" /><path d="M6 16l4-8h5l3 8M10 8l2 8h-6M14 5h3" /></>,
  Swim: <><path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><circle cx="16" cy="7" r="2" /><path d="M5 13l5-4 3 3" /></>,
  Row: <><path d="M3 18h18M5 14l14-8M17 4l4 3" /><circle cx="9" cy="9" r="2" /></>,
  Elliptical: <><ellipse cx="12" cy="15" rx="8" ry="4" /><path d="M8 11V4M16 11V4M6 4h4M14 4h4" /></>,
  Stairs: <path d="M3 20h5v-5h5v-5h5V5h3" />,
  Hike: <><path d="M2 20l7-11 4 6 3-4 6 9z" /><circle cx="18" cy="5" r="2" /></>,
  Pickleball: <><rect x="3" y="3" width="10" height="12" rx="5" /><path d="M8 15v6" /><circle cx="18" cy="17" r="2.5" /></>,
  Tennis: <><circle cx="12" cy="12" r="9" /><path d="M5.5 5.5c3 3.5 3 9.5 0 13M18.5 5.5c-3 3.5-3 9.5 0 13" /></>,
  Basketball: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M6 5.5c2.7 3.8 2.7 9.2 0 13M18 5.5c-2.7 3.8-2.7 9.2 0 13" /></>,
  Soccer: <><circle cx="12" cy="12" r="9" /><path d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 8V3.5M15.5 10.5l4.5-1.5M14.2 14.5l2.8 4M9.8 14.5L7 18.5M8.5 10.5L4 9" /></>,
  Golf: <><path d="M9 21V3l8 4-8 4" /><path d="M4 21h12" /></>,
  Ski: <><path d="M3 18l18-7M5 21l16-6" /><circle cx="14" cy="4" r="2" /><path d="M10 13l2-5 4 3" /></>,
  Volleyball: <><circle cx="12" cy="12" r="9" /><path d="M12 3c-1.5 4-.5 7.5 3 9.5M3.6 15.5c3.8-1.6 7.5-1.4 10.4 1.5M12 12C9.5 9 6 8.2 3.2 9.6" /></>,
  Other: <><circle cx="12" cy="12" r="9" /><path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="3" /></>,
}

export function TypeIcon({ name, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      {TYPE_PATHS[name] ?? TYPE_PATHS.Other}
    </svg>
  )
}

// A small red dumbbell at the end of a logged line: it counted toward your
// workouts goal. Only on things that sometimes don't (classes, cardio,
// sports, stretching).
export function WorkoutMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-red-500 shrink-0" aria-hidden="true">
      <path d="M7 8v8M4 10v4M17 8v8M20 10v4M7 12h10" />
    </svg>
  )
}
