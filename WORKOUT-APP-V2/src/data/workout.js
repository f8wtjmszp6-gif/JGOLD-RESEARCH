// Bar weight range for the per-exercise settings menu (0 = no bar / machine).
export const BAR_MIN = 0
export const BAR_MAX = 100
export const BAR_STEP = 1

// Every exercise carries a uniform weight config:
//   weight: { bar, value, assist? }
//     bar    – weight of the bar (0 for machines / dumbbells / bodyweight).
//     value  – starting total weight lifted. Once you change your weight or
//              reps the app remembers yours instead.
//     assist – default state of the "Assist" checkbox (you aren't lifting the
//              full load, e.g. assisted pull-ups or pure bodyweight moves).

export const workouts = {
  push: {
    id: 'push',
    name: 'Chest, shoulders & triceps',
    short: 'Chest & Shoulders',
    exercises: [
      { id: 'bench-press', name: 'Bench Press', sets: 3, reps: '6–8', weight: { bar: 25, value: 105 } },
      { id: 'overhead-press', name: 'Overhead Press', sets: 3, reps: '8–10', weight: { bar: 25, value: 55 } },
      { id: 'dips', name: 'Dips', sets: 3, reps: '8–10', weight: { bar: 0, value: 35, assist: true } },
      { id: 'lateral-raises', name: 'Lateral Raises', sets: 3, reps: '12–14', weight: { bar: 0, value: 12 } },
      { id: 'overhead-tricep-extension', name: 'Overhead Tricep Extension', sets: 3, reps: '10–12', weight: { bar: 0, value: 40 } },
    ],
    // Chest, front and side shoulders, triceps, upper traps
    stretches: ['doorway-pec', 'behind-back-clasp', 'cross-body-shoulder', 'overhead-tricep-stretch', 'upper-trap'],
  },

  legsQuad: {
    id: 'legsQuad',
    name: 'Quads, glutes, inner & outer thighs, core',
    short: 'Quads & Glutes',
    exercises: [
      { id: 'cable-squat', name: 'Cable-Assisted Squat', sets: 3, reps: '6–8', weight: { bar: 0, value: 170 } },
      { id: 'hip-thrust', name: 'Hip Thrust', sets: 3, reps: '6–8', weight: { bar: 25, value: 145 } },
      { id: 'hip-abduction', name: 'Hip Abduction Machine', sets: 3, reps: '12–14', weight: { bar: 0, value: 130 } },
      { id: 'hip-adduction', name: 'Hip Adduction', sets: 3, reps: '12–14', weight: { bar: 0, value: 185 } },
      { id: 'plank', name: 'Plank', sets: 3, reps: '45s', isTime: true, durationSeconds: 45, weight: { bar: 0, value: 0, assist: true } },
      { id: 'dead-bugs', name: 'Dead Bugs', sets: 3, reps: '12–14', perSide: true, weight: { bar: 0, value: 0, assist: true } },
    ],
    // Hip flexors, quads, glutes, outer hip, inner thighs
    stretches: ['hip-flexor', 'quad-stretch', 'figure-4', '90-90', 'butterfly'],
  },

  pull: {
    id: 'pull',
    name: 'Back, traps, rear delts, biceps & core',
    short: 'Back & Biceps',
    exercises: [
      { id: 'barbell-rows', name: 'Barbell Rows', sets: 3, reps: '8–10', weight: { bar: 45, value: 95 } },
      { id: 'pull-ups', name: 'Pull-Ups', sets: 3, reps: '8–10', weight: { bar: 0, value: 35, assist: true } },
      { id: 'barbell-shrugs', name: 'Barbell Shrugs', sets: 3, reps: '12–14', weight: { bar: 45, value: 115 } },
      { id: 'face-pulls', name: 'Face Pulls', sets: 3, reps: '12–14', weight: { bar: 0, value: 43 } },
      { id: 'barbell-curl', name: 'Barbell Curl', sets: 3, reps: '8–10', weight: { bar: 15, value: 45 } },
      { id: 'hammer-curls', name: 'Hammer Curls', sets: 3, reps: '10–12', weight: { bar: 0, value: 20 } },
      { id: 'hanging-leg-raises', name: 'Hanging Leg Raises', sets: 3, reps: '12–14', weight: { bar: 0, value: 0, assist: true } },
    ],
    // Lats, upper back, rear shoulders, biceps, forearms, traps
    stretches: ['lat-stretch', 'childs-pose', 'thread-the-needle', 'bicep-wall', 'wrist-flexor', 'levator-scapulae'],
  },

  legsPost: {
    id: 'legsPost',
    name: 'Hamstrings, glutes, lower back, calves & obliques',
    short: 'Hamstrings & Calves',
    exercises: [
      { id: 'romanian-deadlift', name: 'Romanian Deadlift', sets: 3, reps: '6–8', weight: { bar: 45, value: 125 } },
      { id: 'back-extensions', name: 'Weighted Back Extensions', sets: 3, reps: '10–12', weight: { bar: 0, value: 35 } },
      { id: 'standing-calf-raise', name: 'Standing Calf Raise', sets: 3, reps: '12–14', weight: { bar: 0, value: 180 } },
      { id: 'seated-calf-raise', name: 'Seated Calf Raise', sets: 3, reps: '12–14', weight: { bar: 0, value: 55 } },
      { id: 'woodchoppers', name: 'Woodchoppers', sets: 2, reps: '12–14', perSide: true, weight: { bar: 0, value: 20 } },
    ],
    // Hamstrings, glutes, lower back, both calf muscles
    stretches: ['hamstring-stretch', 'pigeon-pose', 'knees-to-chest', 'wall-calf-stretch', 'bent-knee-calf'],
  },
}

// Default rest between sets when an exercise's timer is set to Rest: longer
// for the heavy compound lifts, shorter for accessory work.
export const COMPOUND_LIFTS = new Set([
  'bench-press', 'overhead-press', 'dips', 'cable-squat', 'hip-thrust',
  'barbell-rows', 'pull-ups', 'romanian-deadlift',
])
export const REST_COMPOUND = 150
export const REST_ACCESSORY = 90

// A standalone full-body routine for days without a gym workout: a second
// weekly dose for every major area, plus neck and posture. Ids from the
// stretch bank (data/stretches.js).
export const STRETCH_ROUTINE = {
  id: 'routine',
  name: 'Full Body Stretch',
  short: 'Full Body Stretch',
  exercises: [],
  stretches: [
    'cat-cow', 'worlds-greatest', 'downward-dog', 'hip-flexor', 'pigeon-pose', 'hamstring-stretch', 'butterfly',
    'doorway-pec', 'thread-the-needle', 'childs-pose', 'spinal-twist', 'chin-tucks', 'lateral-neck-tilts',
  ],
}

// Short stretch lists for after cardio, one per activity; you pick which you
// just did. Each aims at what that activity works: calves and hips for walks
// and runs, bent-over hips and chest for a ride, shoulders for a swim, back
// and hamstrings for rowing.
export const COOL_DOWNS = [
  { id: 'coolWalk', label: 'Walk', stretches: ['wall-calf-stretch', 'quad-stretch', 'standing-hamstring', 'hip-flexor', 'figure-4'] },
  { id: 'coolRun', label: 'Run', stretches: ['wall-calf-stretch', 'bent-knee-calf', 'quad-stretch', 'hip-flexor', 'figure-4', 'standing-hamstring'] },
  { id: 'coolBike', label: 'Bike', stretches: ['couch-stretch', 'kneeling-quad', 'pigeon-pose', 'doorway-pec', 'cat-cow', 'knees-to-chest'] },
  { id: 'coolSwim', label: 'Swim', stretches: ['lat-stretch', 'doorway-pec', 'sleeper-stretch', 'overhead-tricep-stretch', 'thread-the-needle', 'lateral-neck-tilts'] },
  { id: 'coolRow', label: 'Row / Elliptical', chip: 'Row', stretches: ['childs-pose', 'lat-stretch', 'seated-forward-fold', 'figure-4', 'cat-cow'] },
].map(c => ({ ...c, chip: c.chip ?? c.label, name: `Cool Down · ${c.label}`, short: 'Cool Down', exercises: [] }))
export const COOL_DOWN_BY_ID = Object.fromEntries(COOL_DOWNS.map(c => [c.id, c]))

// Weekly goal for both home cards — workouts and stretching: 3 a week
// meets it, 4 is the stretch target.
const WEEKLY_GOAL = { min: 3, max: 4 }

// Weekly cardio, in minutes, from the health guidelines: 150 is the minimum
// for most of the benefit, 300 the ideal. A hard minute counts as two.
const CARDIO_GOAL = { min: 150, max: 300 }

// The weekly goals until you set your own in Settings, with what the health
// guidelines say for each (shown under its setting).
export const GOAL_DEFAULTS = { workouts: WEEKLY_GOAL, stretch: WEEKLY_GOAL, cardio: CARDIO_GOAL }
export const GOAL_SETTINGS = [
  { id: 'workouts', label: 'Workouts', step: 1, least: 1, advice: 'The American Heart Association recommends moderate- to high-intensity strength training (weights or resistance) at least 2 days a week, working all the major muscle groups, on top of cardio.' },
  { id: 'stretch', label: 'Stretching', step: 1, least: 1, advice: 'The American College of Sports Medicine recommends stretching at least 2–3 days a week, holding each stretch 10–30 seconds and repeating it 2–4 times, about 60 seconds per stretch in all.' },
  { id: 'cardio', label: 'Cardio', step: 10, least: 10, advice: 'The American Heart Association recommends 150–300 minutes a week of moderate activity, like brisk walking, or 75–150 minutes of vigorous activity, like running, spread through the week. Hard minutes count double here.' },
]

// One walk (or other cardio), until you change it. Gym workouts are
// strength training and don't add cardio minutes.
// A run, ride or other cardio session counts as a workout once it's long
// enough: 30 minutes hard or 45 easy. Shorter ones still add cardio minutes.
export const CARDIO_WORKOUT_MINUTES = { hard: 30, easy: 45 }
export function cardioIsWorkout(session) {
  return session.minutes >= CARDIO_WORKOUT_MINUTES[session.hard ? 'hard' : 'easy']
}

export const CARDIO_DEFAULTS = {
  walk: { minutes: 30, hard: false },
  other: { minutes: 30, hard: false },
  sport: { minutes: 60, hard: false },
}

// What a cardio session was: picked when you log it, shown on the card, the
// week strip and past weeks. Sessions logged before this have none.
export const CARDIO_TYPES = ['Run', 'Bike', 'Swim', 'Row', 'Elliptical', 'Stairs', 'Other']
// Sports and hikes; a name typed under Other joins this list for next time.
export const SPORTS = ['Hike', 'Pickleball', 'Tennis', 'Basketball', 'Soccer', 'Golf', 'Ski', 'Volleyball']

// Which body regions each workout trains, per view, for the home screen's
// Muscles this week figure. Pushing works the front of the upper body and
// the triceps; pulling the back and biceps; the two leg days split front
// (quads) and back (hamstrings, calves), with glutes and core shared.
export const MUSCLE_MAP = {
  push: { front: ['shoulders', 'chest'], back: ['arms'] },
  legsQuad: { front: ['thighs', 'hips', 'core'], back: ['hips'] },
  pull: { front: ['arms', 'core'], back: ['back', 'shoulders'] },
  legsPost: { front: ['core'], back: ['thighs', 'calves', 'hips', 'back'] },
  fullGym: { front: ['shoulders', 'chest', 'thighs', 'core'], back: ['back', 'hips', 'thighs'] },
  fullHomeDb: { front: ['shoulders', 'chest', 'thighs', 'core'], back: ['back', 'hips', 'thighs'] },
  fullHome: { front: ['shoulders', 'chest', 'thighs', 'core'], back: ['back', 'hips', 'thighs'] },
}

// Trends groups exercises by the muscles they mainly work — not by which
// workout they're in — so, say, the plank sits under Core.
export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', exercises: ['bench-press', 'dips'] },
  { id: 'back', label: 'Back', exercises: ['barbell-rows', 'pull-ups', 'barbell-shrugs', 'back-extensions'] },
  { id: 'shoulders', label: 'Shoulders', exercises: ['overhead-press', 'lateral-raises', 'face-pulls'] },
  { id: 'arms', label: 'Arms', exercises: ['overhead-tricep-extension', 'barbell-curl', 'hammer-curls'] },
  { id: 'legs', label: 'Legs', exercises: ['cable-squat', 'hip-thrust', 'hip-abduction', 'hip-adduction', 'romanian-deadlift', 'standing-calf-raise', 'seated-calf-raise'] },
  { id: 'core', label: 'Core', exercises: ['plank', 'dead-bugs', 'hanging-leg-raises', 'woodchoppers'] },
]

// A workout class, as the Log a class sheet asks about it: cardio (how long,
// how hard), strength (which areas), and whether it was stretching (yoga,
// mobility) and for how long. The sheet opens with everything off; turning
// cardio or stretching on fills in your last class's times.
export const CLASS_DEFAULT = {
  cardio: false, minutes: 45, hard: true,
  strength: false, areas: [],
  stretch: false, stretchMinutes: 30,
}

// Stretching on its own — the Full Body Stretch, a session on your own —
// counts as a workout from 30 minutes. (Any stretching is a stretch day.)
export const STRETCH_WORKOUT_MINUTES = 30

// A class counts as a workout if it had cardio or strength. Stretching alone
// counts only from this many minutes; any stretching is still a stretch day.
export const CLASS_STRETCH_WORKOUT_MINUTES = STRETCH_WORKOUT_MINUTES
export function classIsWorkout(c) {
  return c.cardio || (c.strength && c.areas.length > 0) ||
    (c.stretch && (c.stretchMinutes ?? CLASS_DEFAULT.stretchMinutes) >= CLASS_STRETCH_WORKOUT_MINUTES)
}

// Classes logged before the sheet asked anything: 45 hard minutes, full body.
export const CLASS_LEGACY = {
  cardio: true, minutes: 45, hard: true,
  strength: true, areas: ['upper', 'lower', 'core'],
  stretch: false,
}

// The body areas a class's strength work can cover, and the body-map
// regions each lights up, per view.
export const CLASS_AREAS = [
  { id: 'upper', label: 'Upper', front: ['shoulders', 'chest', 'arms'], back: ['shoulders', 'arms', 'back'] },
  { id: 'lower', label: 'Lower', front: ['hips', 'thighs', 'calves'], back: ['hips', 'thighs', 'calves'] },
  { id: 'core', label: 'Core', front: ['core'], back: [] },
]

// Display order of the gym workouts on the home screen.

export const GYM_ORDER = ['push', 'legsQuad', 'pull', 'legsPost']

// Full-body days, for weeks the four plans won't fit: one session that trains
// every area, at the gym or at home with or without dumbbells. Picked from one card,
// like a cool-down. Each is a plan like the four (its own lists, stretches
// and Trends) and counts as a gym workout once finished. Exercises come from
// the bank, so only their ids are listed.
export const FULL_BODY = [
  {
    id: 'fullGym',
    name: 'Full body at the gym',
    short: 'Full Body · Gym',
    label: 'At the gym',
    where: 'At the gym',
    chip: 'All equipment',
    exercises: ['goblet-squat', 'db-rdl', 'db-bench-press', 'lat-pulldown', 'db-shoulder-press'].map(id => ({ id })),
    stretches: ['worlds-greatest', 'hip-flexor', 'hamstring-stretch', 'doorway-pec', 'lat-stretch'],
  },
  {
    id: 'fullHomeDb',
    name: 'Full body at home with dumbbells',
    short: 'Full Body · At Home · Equipment',
    label: 'At home with dumbbells',
    where: 'At home',
    chip: 'Dumbbells',
    exercises: ['goblet-squat', 'db-rdl', 'push-ups', 'one-arm-db-row', 'db-shoulder-press'].map(id => ({ id })),
    stretches: ['worlds-greatest', 'hip-flexor', 'hamstring-stretch', 'doorway-pec', 'childs-pose'],
  },
  {
    id: 'fullHome',
    name: 'Full body at home, no equipment',
    short: 'Full Body · At Home · No Equipment',
    label: 'At home, no equipment',
    where: 'At home',
    chip: 'Bodyweight',
    exercises: ['bodyweight-split-squat', 'single-leg-hip-thrust', 'push-ups', 'pike-push-ups', 'superman'].map(id => ({ id })),
    stretches: ['downward-dog', 'pigeon-pose', 'childs-pose', 'cat-cow', 'hip-flexor'],
  },
]
export const FULL_BODY_BY_ID = Object.fromEntries(FULL_BODY.map(p => [p.id, p]))
for (const p of FULL_BODY) workouts[p.id] = p
// Every plan you tick sets in: the four, then the full-body days.
export const PLAN_IDS = [...GYM_ORDER, ...FULL_BODY.map(p => p.id)]

// Days you didn't make it to the gym — counted, so three walks read as 3.
//   note        – what its card says before you log one.
//   one / many  – how the count reads ("1 walk", "3 rest days").
//   tile        – the light gradient tile behind its icon.
export const activities = [
  { id: 'class', name: 'Workout Class', note: 'HIIT, spin, bootcamp, yoga', one: 'class', many: 'classes', tile: 'from-violet-50 to-violet-100' },
  { id: 'walk', name: 'Walking', note: 'Got a walk in instead', one: 'walk', many: 'walks', tile: 'from-emerald-50 to-emerald-100' },
  { id: 'rest', name: 'Rest', note: 'Recovery day', one: 'rest day', many: 'rest days', tile: 'from-indigo-50 to-indigo-100' },
]
