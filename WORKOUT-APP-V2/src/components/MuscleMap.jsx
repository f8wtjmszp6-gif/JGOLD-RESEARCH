import { useId } from 'react'
import { workouts, GYM_ORDER, MUSCLE_MAP, CLASS_AREAS } from '../data/workout'

// Same silhouette as the workout body maps; regions are bands clipped to it.
const SILHOUETTE = (
  <>
    <circle cx="32" cy="8.5" r="6" />
    <rect x="29" y="13" width="6" height="6" rx="2" />
    <path d="M19 19 C24 17 40 17 45 19 C48 20 48.5 24 47.5 28 L43.5 44 C43.2 47 44 50 44 52 L20 52 C20 50 20.8 47 20.5 44 L16.5 28 C15.5 24 16 20 19 19 Z" />
    <rect x="11.5" y="20.5" width="6" height="27" rx="3" transform="rotate(9 14.5 20.5)" />
    <rect x="46.5" y="20.5" width="6" height="27" rx="3" transform="rotate(-9 49.5 20.5)" />
    <path d="M20.5 51 L31.3 51 L30.2 75.5 C30 78 25.6 78 25.4 75.5 Z" />
    <path d="M32.7 51 L43.5 51 L38.6 75.5 C38.4 78 34 78 33.8 75.5 Z" />
  </>
)
const REGIONS = {
  shoulders: [[0, 16, 64, 7.5]],
  chest: [[17, 23.5, 30, 9]],
  arms: [[0, 23.5, 17.6, 30], [46.4, 23.5, 17.6, 30]],
  back: [[17, 23.5, 30, 21]],
  core: [[17, 32.5, 30, 12]],
  hips: [[17, 44.5, 30, 10]],
  thighs: [[17, 54.5, 30, 12]],
  calves: [[17, 66.5, 30, 13]],
}
// How hard each region was worked this week: a finished workout that trains
// it adds 1, a started one ½, and a class adds 1 to the areas its strength
// work covered (upper, lower, core).
function regionScores(status, classes, view) {
  const scores = {}
  for (const r of Object.keys(REGIONS)) scores[r] = 0
  for (const c of classes) {
    if (!c.strength) continue
    for (const a of CLASS_AREAS) if (c.areas.includes(a.id)) for (const r of a[view]) scores[r] += 1
  }
  for (const id of GYM_ORDER) {
    for (const r of MUSCLE_MAP[id][view]) scores[r] += status[id] === 2 ? 1 : status[id] === 1 ? 0.5 : 0
  }
  return scores
}

// More work, deeper orange: started-only, then 1, 2, 3, 4+ times this week
// (Tailwind orange-100, 300, 400, 500, 600).
const RAMP = ['#ffedd4', '#ffb86a', '#ff8904', '#ff6900', '#f54900']
function fillFor(score) {
  if (score <= 0) return null
  if (score < 1) return RAMP[0]
  return RAMP[Math.min(Math.floor(score), RAMP.length - 1)]
}

function Figure({ status, classes, view }) {
  // Keep the id safe inside an SVG url(#…) reference.
  const clip = 'body' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const scores = regionScores(status, classes, view)
  // Back view: the back panel replaces chest + core, and gets a spine line.
  const shown = view === 'back'
    ? ['shoulders', 'arms', 'back', 'hips', 'thighs', 'calves']
    : ['shoulders', 'arms', 'chest', 'core', 'hips', 'thighs', 'calves']
  return (
    <svg viewBox="0 0 64 80" className="w-[30px] h-[38px]">
      <defs>
        <clipPath id={clip}>{SILHOUETTE}</clipPath>
      </defs>
      <g fill="var(--color-stone-200)">{SILHOUETTE}</g>
      <g clipPath={`url(#${clip})`}>
        {shown.filter(r => fillFor(scores[r])).map(r => REGIONS[r].map(([x, y, w, h], i) => (
          <rect key={r + i} x={x} y={y} width={w} height={h} fill={fillFor(scores[r])} stroke={fillFor(scores[r])} strokeWidth="0.8" />
        )))}
      </g>
      <g fill="none" stroke="var(--surface)" strokeWidth="1.2" strokeLinecap="round" opacity=".85">
        {view === 'back'
          ? <><path d="M32 21 V48" /><path d="M24 25 Q26 30 30 29M40 25 Q38 30 34 29" /></>
          : <><path d="M24 31 Q32 33.5 40 31" /><path d="M32 33 V43" /></>}
      </g>
    </svg>
  )
}

// Front and back figures, sized to sit beside the Today title.
export default function MuscleMap({ store }) {
  // Finished = every set ticked (same rule as the weekly goal); started = any.
  const status = {}
  for (const id of GYM_ORDER) {
    const { done, total } = store.workoutProgress(id)
    status[id] = total > 0 && done === total ? 2 : done > 0 ? 1 : 0
  }
  const classes = store.classes
  const done = GYM_ORDER.filter(id => status[id] === 2).map(id => workouts[id].short)

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Muscles this week: ${done.length ? done.join(', ') + ' done' : 'no plans finished yet'}${classes.length ? `, ${classes.length} ${classes.length === 1 ? 'class' : 'classes'}` : ''}`}
    >
      <Figure status={status} classes={classes} view="front" />
      <Figure status={status} classes={classes} view="back" />
    </div>
  )
}
