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
    name: 'Chest, Shoulders & Triceps',
    short: 'Push',
    exercises: [
      { id: 'bench-press', name: 'Bench Press', sets: 3, reps: '6–8', weight: { bar: 25, value: 105 } },
      { id: 'overhead-press', name: 'Overhead Press', sets: 3, reps: '8–10', weight: { bar: 25, value: 55 } },
      { id: 'dips', name: 'Dips', sets: 3, reps: '8–10', weight: { bar: 0, value: 35, assist: true } },
      { id: 'lateral-raises', name: 'Lateral Raises', sets: 3, reps: '12–14', weight: { bar: 0, value: 12 } },
      { id: 'overhead-tricep-extension', name: 'Overhead Tricep Extension', sets: 3, reps: '10–12', weight: { bar: 0, value: 40 } },
    ],
    stretches: [
      { id: 'lateral-neck-tilts', name: 'Lateral Neck Tilts', duration: 30, perSide: true },
      { id: 'neck-rotations', name: 'Neck Rotations', duration: 30, perSide: true },
      { id: 'levator-scapulae', name: 'Levator Scapulae Stretch', duration: 30, perSide: true },
      { id: 'doorway-pec', name: 'Doorway Pec Stretch', duration: 45, perSide: true, alt: 'Wall Pec Stretch' },
      { id: 'overhead-tricep-stretch', name: 'Overhead Tricep Stretch', duration: 30, perSide: true },
    ],
  },

  legsQuad: {
    id: 'legsQuad',
    name: 'Quads, Glutes, Hips & Core',
    short: 'Quads & Glutes',
    exercises: [
      { id: 'cable-squat', name: 'Cable-Assisted Squat', sets: 3, reps: '6–8', weight: { bar: 0, value: 170 } },
      { id: 'hip-thrust', name: 'Hip Thrust', sets: 3, reps: '6–8', weight: { bar: 25, value: 145 } },
      { id: 'hip-abduction', name: 'Hip Abduction Machine', sets: 3, reps: '12–14', weight: { bar: 0, value: 130 } },
      { id: 'hip-adduction', name: 'Hip Adduction', sets: 3, reps: '12–14', weight: { bar: 0, value: 185 } },
      { id: 'plank', name: 'Plank', sets: 3, reps: '45s', isTime: true, durationSeconds: 45, weight: { bar: 0, value: 0, assist: true } },
      { id: 'dead-bugs', name: 'Dead Bugs', sets: 3, reps: '12–14', perSide: true, weight: { bar: 0, value: 0, assist: true } },
    ],
    stretches: [
      { id: 'hip-flexor', name: 'Kneeling Hip Flexor Stretch', duration: 60, perSide: true, alt: 'Couch Stretch' },
      { id: 'quad-stretch', name: 'Standing Quad Stretch', duration: 45, perSide: true, alt: 'Kneeling Quad Stretch' },
      { id: 'figure-4', name: 'Figure-4', duration: 60, perSide: true, alt: 'Pigeon Pose' },
      { id: '90-90', name: '90-90 Hip Stretch', duration: 60, perSide: true },
    ],
  },

  pull: {
    id: 'pull',
    name: 'Back, Rear Delts, Biceps & Core',
    short: 'Pull',
    exercises: [
      { id: 'barbell-rows', name: 'Barbell Rows', sets: 3, reps: '8–10', weight: { bar: 45, value: 95 } },
      { id: 'pull-ups', name: 'Pull-Ups', sets: 3, reps: '8–10', weight: { bar: 0, value: 35, assist: true } },
      { id: 'barbell-shrugs', name: 'Barbell Shrugs', sets: 3, reps: '12–14', weight: { bar: 45, value: 115 } },
      { id: 'face-pulls', name: 'Face Pulls', sets: 3, reps: '12–14', weight: { bar: 0, value: 43 } },
      { id: 'barbell-curl', name: 'Barbell Curl', sets: 3, reps: '8–10', weight: { bar: 15, value: 45 } },
      { id: 'hammer-curls', name: 'Hammer Curls', sets: 3, reps: '10–12', weight: { bar: 0, value: 20 } },
      { id: 'hanging-leg-raises', name: 'Hanging Leg Raises', sets: 3, reps: '12–14', weight: { bar: 0, value: 0, assist: true } },
    ],
    stretches: [
      { id: 'cross-body-shoulder', name: 'Cross-Body Shoulder Stretch', duration: 30, perSide: true },
      { id: 'spinal-twist', name: 'Supine Spinal Twist', duration: 45, perSide: true, alt: 'Seated Spinal Twist' },
      { id: 'childs-pose', name: "Child's Pose", duration: 45, perSide: false },
      { id: 'wrist-flexor', name: 'Kneeling Wrist Flexor Stretch', duration: 30, perSide: true, alt: 'Prayer Wrist Stretch' },
    ],
  },

  legsPost: {
    id: 'legsPost',
    name: 'Hamstrings, Calves, Posterior & Core',
    short: 'Hams & Calves',
    exercises: [
      { id: 'romanian-deadlift', name: 'Romanian Deadlift', sets: 3, reps: '6–8', weight: { bar: 45, value: 125 } },
      { id: 'back-extensions', name: 'Weighted Back Extensions', sets: 3, reps: '10–12', weight: { bar: 0, value: 35 } },
      { id: 'standing-calf-raise', name: 'Standing Calf Raise', sets: 3, reps: '12–14', weight: { bar: 0, value: 180 } },
      { id: 'seated-calf-raise', name: 'Seated Calf Raise', sets: 3, reps: '12–14', weight: { bar: 0, value: 55 } },
      { id: 'woodchoppers', name: 'Woodchoppers', sets: 2, reps: '12–14', perSide: true, weight: { bar: 0, value: 20 } },
    ],
    stretches: [
      { id: 'hamstring-stretch', name: 'Supine Hamstring Stretch', duration: 45, perSide: true, alt: 'Standing Hamstring Stretch' },
      { id: 'wall-calf-stretch', name: 'Standing Wall Calf Stretch', duration: 30, perSide: true },
      { id: 'bent-knee-calf', name: 'Bent-Knee Calf Stretch', duration: 30, perSide: true },
      { id: 'cobra-pose', name: 'Cobra Pose', duration: 30, perSide: false },
      { id: 'side-bend', name: 'Standing Side Bend', duration: 30, perSide: true },
    ],
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

// A standalone full-body routine for days without a gym workout, built from
// the gym days' own stretches so durations and per-side settings carry over.
const ROUTINE_STRETCHES = [
  'hip-flexor', 'hamstring-stretch', 'doorway-pec', 'cross-body-shoulder',
  'spinal-twist', 'figure-4', 'wall-calf-stretch', 'childs-pose',
]
export const STRETCH_ROUTINE = {
  id: 'routine',
  name: 'Full-Body Stretch',
  short: 'Full-Body Stretch',
  exercises: [],
}

// Weekly goal for both home cards — workouts and stretching: 3 a week
// meets it, 4 is the stretch target.
export const WEEKLY_GOAL = { min: 3, max: 4 }

// Which body regions each workout trains, per view, for the home screen's
// Muscles this week figure. Pushing works the front of the upper body and
// the triceps; pulling the back and biceps; the two leg days split front
// (quads) and back (hamstrings, calves), with glutes and core shared.
export const MUSCLE_MAP = {
  push: { front: ['shoulders', 'chest'], back: ['arms'] },
  legsQuad: { front: ['thighs', 'hips', 'core'], back: ['hips'] },
  pull: { front: ['arms', 'core'], back: ['back', 'shoulders'] },
  legsPost: { front: ['core'], back: ['thighs', 'calves', 'hips', 'back'] },
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

// Display order of the gym workouts on the home screen.
{
  const all = Object.values(workouts).flatMap(x => x.stretches)
  STRETCH_ROUTINE.stretches = ROUTINE_STRETCHES.map(id => all.find(x => x.id === id))
}

export const GYM_ORDER = ['push', 'legsQuad', 'pull', 'legsPost']

// Days you didn't make it to the gym — counted, so three walks read as 3.
//   one / many  – how the count reads ("1 walk", "3 rest days").
//   short       – legend label on the week bar.
//   tile / mark – the activity's color: a light gradient tile behind its figure, and the
//                 solid fill for its days on the week bar.
export const activities = [
  { id: 'class', name: 'Workout Class', short: 'Class', note: 'OrangeTheory or any class', icon: '🔥', one: 'class', many: 'classes', tile: 'from-violet-50 to-violet-100', mark: 'bg-violet-600' },
  { id: 'walk', name: 'Walking', short: 'Walk', note: 'Got a walk in instead', icon: '🚶', one: 'walk', many: 'walks', tile: 'from-emerald-50 to-emerald-100', mark: 'bg-emerald-600' },
  { id: 'rest', name: 'Rest', short: 'Rest', note: 'Recovery day', icon: '😴', one: 'rest day', many: 'rest days', tile: 'from-indigo-50 to-indigo-100', mark: 'bg-indigo-400' },
]

// Gym days on the week bar. The four marks, in bar order gym → class → walk →
// rest, came out of the dataviz palette validator on the white week card:
// every pair stays distinct under red-green colorblindness and every fill
// clears 3:1 on white. Gray fails as a category color and orange beside red
// fails outright, so re-run the validator before changing any of them.
export const GYM_MARK = 'bg-orange-600'
