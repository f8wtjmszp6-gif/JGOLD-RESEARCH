export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
export const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
export const LIFT_DAYS = ['monday', 'tuesday', 'thursday', 'friday']

// Barbell exercises use { barbell: { plateWeight, plateDisplay, defaultBar } }
// instead of a weight string. Total = plateWeight + selected bar weight.
// Non-barbell exercises use { weight: '...' }.

export const schedule = {
  monday: {
    label: 'Monday',
    name: 'Chest, Shoulders & Triceps',
    type: 'lift',
    exercises: [
      {
        id: 'bench-press',
        name: 'Bench Press',
        sets: 3,
        reps: '6–8',
        barbell: { plateWeight: 80, plateDisplay: '2 × 40 lb', defaultBar: 25 },
      },
      {
        id: 'overhead-press',
        name: 'Overhead Press',
        sets: 3,
        reps: '8–10',
        barbell: { plateWeight: 30, plateDisplay: '2 × 15 lb', defaultBar: 25 },
      },
      {
        id: 'dips',
        name: 'Dips',
        sets: 3,
        reps: '8–10',
        weight: '35 lbs assist',
        bodyweight: true,
      },
      {
        id: 'lateral-raises',
        name: 'Lateral Raises',
        sets: 3,
        reps: '12–14',
        weight: '12 lb dumbbells',
      },
      {
        id: 'overhead-tricep-extension',
        name: 'Overhead Tricep Extension',
        sets: 3,
        reps: '10–12',
        weight: '40 lbs',
      },
    ],
    stretches: [
      { id: 'lateral-neck-tilts', name: 'Lateral Neck Tilts', duration: 30, perSide: true },
      { id: 'neck-rotations', name: 'Neck Rotations', duration: 30, perSide: true },
      { id: 'levator-scapulae', name: 'Levator Scapulae Stretch', duration: 30, perSide: true },
      { id: 'doorway-pec', name: 'Doorway Pec Stretch', duration: 45, perSide: true, alt: 'Wall Pec Stretch' },
      { id: 'overhead-tricep-stretch', name: 'Overhead Tricep Stretch', duration: 30, perSide: true },
    ],
  },

  tuesday: {
    label: 'Tuesday',
    name: 'Quads, Glutes, Hips & Core',
    type: 'lift',
    exercises: [
      {
        id: 'cable-squat',
        name: 'Cable-Assisted Squat',
        sets: 3,
        reps: '6–8',
        weight: '170 lbs',
      },
      {
        id: 'hip-thrust',
        name: 'Hip Thrust',
        sets: 3,
        reps: '6–8',
        barbell: { plateWeight: 120, plateDisplay: '2 × 60 lb', defaultBar: 25 },
      },
      {
        id: 'hip-abduction',
        name: 'Hip Abduction Machine',
        sets: 3,
        reps: '12–14',
        weight: '130 lbs',
      },
      {
        id: 'hip-adduction',
        name: 'Hip Adduction',
        sets: 3,
        reps: '12–14',
        weight: '185 lbs',
      },
      {
        id: 'plank',
        name: 'Plank',
        sets: 3,
        reps: '45s',
        weight: 'Bodyweight',
        bodyweight: true,
        isTime: true,
        durationSeconds: 45,
      },
      {
        id: 'dead-bugs',
        name: 'Dead Bugs',
        sets: 3,
        reps: '12–14',
        weight: 'Bodyweight',
        bodyweight: true,
        perSide: true,
      },
    ],
    stretches: [
      { id: 'hip-flexor', name: 'Kneeling Hip Flexor Stretch', duration: 60, perSide: true, alt: 'Couch Stretch' },
      { id: 'quad-stretch', name: 'Standing Quad Stretch', duration: 45, perSide: true, alt: 'Kneeling Quad Stretch' },
      { id: 'figure-4', name: 'Figure-4', duration: 60, perSide: true, alt: 'Pigeon Pose' },
      { id: '90-90', name: '90-90 Hip Stretch', duration: 60, perSide: true },
    ],
  },

  wednesday: {
    label: 'Wednesday',
    name: 'OTF',
    type: 'otf',
    exercises: [],
    stretches: [],
  },

  thursday: {
    label: 'Thursday',
    name: 'Back, Rear Delts, Biceps & Core',
    type: 'lift',
    exercises: [
      {
        id: 'barbell-rows',
        name: 'Barbell Rows',
        sets: 3,
        reps: '8–10',
        barbell: { plateWeight: 50, plateDisplay: '2 × 25 lb', defaultBar: 45 },
      },
      {
        id: 'pull-ups',
        name: 'Pull-Ups',
        sets: 3,
        reps: '8–10',
        weight: '35 lbs assist',
        bodyweight: true,
      },
      {
        id: 'barbell-shrugs',
        name: 'Barbell Shrugs',
        sets: 3,
        reps: '12–14',
        barbell: { plateWeight: 70, plateDisplay: '2 × 35 lb', defaultBar: 45 },
      },
      {
        id: 'face-pulls',
        name: 'Face Pulls',
        sets: 3,
        reps: '12–14',
        weight: '42.5 lbs',
      },
      {
        id: 'barbell-curl',
        name: 'Barbell Curl',
        sets: 3,
        reps: '8–10',
        barbell: { plateWeight: 30, plateDisplay: '2 × 15 lb', defaultBar: 15 },
      },
      {
        id: 'hammer-curls',
        name: 'Hammer Curls',
        sets: 3,
        reps: '10–12',
        weight: '20 lb dumbbells',
      },
      {
        id: 'hanging-leg-raises',
        name: 'Hanging Leg Raises',
        sets: 3,
        reps: '12–14',
        weight: 'Bodyweight',
        bodyweight: true,
      },
    ],
    stretches: [
      { id: 'cross-body-shoulder', name: 'Cross-Body Shoulder Stretch', duration: 30, perSide: true },
      { id: 'spinal-twist', name: 'Supine Spinal Twist', duration: 45, perSide: true, alt: 'Seated Spinal Twist' },
      { id: 'childs-pose', name: "Child's Pose", duration: 45, perSide: false },
      { id: 'wrist-flexor', name: 'Kneeling Wrist Flexor Stretch', duration: 30, perSide: true, alt: 'Prayer Wrist Stretch' },
    ],
  },

  friday: {
    label: 'Friday',
    name: 'Hamstrings, Calves, Posterior & Core',
    type: 'lift',
    exercises: [
      {
        id: 'romanian-deadlift',
        name: 'Romanian Deadlift',
        sets: 3,
        reps: '6–8',
        barbell: { plateWeight: 80, plateDisplay: '2 × 40 lb', defaultBar: 45 },
      },
      {
        id: 'back-extensions',
        name: 'Weighted Back Extensions',
        sets: 3,
        reps: '10–12',
        weight: '35 lbs',
      },
      {
        id: 'standing-calf-raise',
        name: 'Standing Calf Raise',
        sets: 3,
        reps: '12–14',
        weight: '180 lbs',
      },
      {
        id: 'seated-calf-raise',
        name: 'Seated Calf Raise',
        sets: 3,
        reps: '12–14',
        weight: '55 lbs',
      },
      {
        id: 'woodchoppers',
        name: 'Woodchoppers',
        sets: 2,
        reps: '12–14',
        weight: '20 lbs',
        perSide: true,
      },
    ],
    stretches: [
      { id: 'hamstring-stretch', name: 'Supine Hamstring Stretch', duration: 45, perSide: true, alt: 'Standing Hamstring Stretch' },
      { id: 'wall-calf-stretch', name: 'Standing Wall Calf Stretch', duration: 30, perSide: true },
      { id: 'bent-knee-calf', name: 'Bent-Knee Calf Stretch', duration: 30, perSide: true },
      { id: 'cobra-pose', name: 'Cobra Pose', duration: 30, perSide: false },
      { id: 'side-bend', name: 'Standing Side Bend', duration: 30, perSide: true },
    ],
  },

  saturday: {
    label: 'Saturday',
    name: '30-Min Walk',
    type: 'walk',
    exercises: [],
    stretches: [],
  },
}

export const twelveWeekProgram = [
  { week: 1, instruction: 'Low end of rep range', detail: 'Use the minimum reps listed for each exercise.' },
  { week: 2, instruction: '+1 rep per set', detail: 'Add one rep to every set compared to last week.' },
  { week: 3, instruction: '+1 rep per set', detail: 'Add one more rep to every set.' },
  { week: 4, instruction: 'Hit top of rep range', detail: 'Push to the maximum reps listed for each exercise.' },
  { week: 5, instruction: 'Drop reps + add weight', detail: 'Reset to low reps. Add +5 lbs total (upper) / +10 lbs total (lower). See progression rules.' },
  { week: 6, instruction: '+1 rep per set', detail: 'Add one rep to every set at the new weight.' },
  { week: 7, instruction: '+1 rep per set', detail: 'Add one more rep to every set.' },
  { week: 8, instruction: 'Hit top of rep range', detail: 'Push to the maximum reps at the new weight.' },
  { week: 9, instruction: 'Drop reps + add weight', detail: 'Reset to low reps. Add +5 lbs total (upper) / +10 lbs total (lower). See progression rules.' },
  { week: 10, instruction: '+1 rep per set', detail: 'Add one rep to every set at the new weight.' },
  { week: 11, instruction: 'Hit top of rep range', detail: 'Push to the maximum reps at the new weight.' },
  { week: 12, instruction: 'Deload', detail: 'Drop to 2 sets per exercise. Reduce weight by 30%. Low end of rep range.' },
]

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
  { exercise: 'Plank', rule: 'Add 5s per week. At weeks 5 & 9, extend range by 15s. Add a weight plate when consistently hitting 90s.' },
  { exercise: 'Dead Bugs', rule: 'Follow rep progression (12–14). At weeks 5 & 9, hold a 2–5 lb dumbbell.' },
  { exercise: 'Hanging Leg Raises', rule: 'Follow rep progression (12–14). Week 5: switch to straight legs. Week 9: add ankle weights or progress to toes-to-bar.' },
  { exercise: 'Woodchoppers', rule: 'Follow cable rule: +2.5–5 lbs at weeks 5 & 9.' },
]
