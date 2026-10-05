// Bar weight range for the per-exercise settings menu (0 = no bar / machine).
export const BAR_MIN = 0
export const BAR_MAX = 100
export const BAR_STEP = 5

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

// Display order of the gym workouts on the home screen.
export const GYM_ORDER = ['push', 'legsQuad', 'pull', 'legsPost']

// Days you didn't make it to the gym — counted, so three walks read as 3.
//   one / many  – how the count reads ("1 walk", "3 rest days").
//   short       – legend label on the week bar.
//   tile / mark – the activity's color: a light tile behind its icon, and the
//                 solid fill for its days on the week bar.
export const activities = [
  { id: 'class', name: 'Workout Class', short: 'Class', note: 'OrangeTheory or any class', icon: '🔥', one: 'class', many: 'classes', tile: 'bg-violet-100', mark: 'bg-violet-600' },
  { id: 'walk', name: 'Walking', short: 'Walk', note: 'Got a walk in instead', icon: '🚶', one: 'walk', many: 'walks', tile: 'bg-emerald-100', mark: 'bg-emerald-600' },
  { id: 'rest', name: 'Rest', short: 'Rest', note: 'Recovery day', icon: '😴', one: 'rest day', many: 'rest days', tile: 'bg-indigo-100', mark: 'bg-indigo-400' },
]

// Gym days on the week bar. The four marks, in bar order gym → class → walk →
// rest, came out of the dataviz palette validator on the white week card:
// every pair stays distinct under red-green colorblindness and every fill
// clears 3:1 on white. Gray fails as a category color and orange beside red
// fails outright, so re-run the validator before changing any of them.
export const GYM_MARK = 'bg-orange-600'

// ── Reference (the ⓘ sheet) ────────────────────────────────────────────────
// Guidance for when and how much to bump — the app never changes your
// numbers on its own.

export const progressionRules = [
  { category: 'Barbell — Upper Body', exercises: 'Bench Press, OHP, Barbell Rows, Shrugs, Barbell Curl', rule: '+5 lbs total (+2.5 lbs per side — requires fractional plates)' },
  { category: 'Barbell — Lower Body', exercises: 'Romanian Deadlift, Hip Thrust', rule: '+10 lbs total (+5 lbs per side)' },
  { category: 'Weighted Bodyweight', exercises: 'Dips, Pull-Ups', rule: '+5 lbs added weight' },
  { category: 'Dumbbell', exercises: 'Lateral Raises, Hammer Curls, Overhead Tricep Extension', rule: 'Increase to next available dumbbell increment' },
  { category: 'Cable', exercises: 'Face Pulls, Woodchoppers', rule: '+2.5–5 lbs' },
  { category: 'Machine — Lower Body', exercises: 'Cable-Assisted Squat, Hip Adduction, Hip Abduction, Standing Calf Raise', rule: '+10 lbs' },
  { category: 'Machine — Other', exercises: 'Seated Calf Raise', rule: '+5 lbs' },
]

export const coreProgression = [
  { exercise: 'Plank', rule: 'Add 5s per week. Extend range by 15s when you plateau. Add a weight plate when consistently hitting 90s.' },
  { exercise: 'Dead Bugs', rule: 'Follow rep progression (12–14). Hold a 2–5 lb dumbbell once 14 reps is easy.' },
  { exercise: 'Hanging Leg Raises', rule: 'Follow rep progression (12–14). Switch to straight legs, then ankle weights or toes-to-bar.' },
  { exercise: 'Woodchoppers', rule: 'Follow cable rule: +2.5–5 lbs when you top the range.' },
]
