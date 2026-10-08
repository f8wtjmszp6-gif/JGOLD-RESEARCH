import { workouts, STRETCH_ROUTINE } from './workout'

const S = (id, name, duration, perSide, area) => ({ id, name, duration, perSide, area })

// Every stretch you can put in a list, grouped by body area, each with a
// sensible default hold (seconds) — change any of them in its settings.

export const STRETCH_AREAS = [
  { id: 'neck', label: 'Neck' },
  { id: 'shoulders', label: 'Chest & shoulders' },
  { id: 'arms', label: 'Arms & wrists' },
  { id: 'back', label: 'Back' },
  { id: 'core', label: 'Sides & core' },
  { id: 'hips', label: 'Hips & glutes' },
  { id: 'legs', label: 'Hamstrings & quads' },
  { id: 'calves', label: 'Calves & feet' },
  { id: 'full', label: 'Full body' },
]

// The stretches the app first shipped with (ids kept, so saved hold times
// still apply).
const ORIGINAL = [
  S('lateral-neck-tilts', 'Lateral Neck Tilts', 30, true, 'neck'),
  S('neck-rotations', 'Neck Rotations', 30, true, 'neck'),
  S('levator-scapulae', 'Levator Scapulae Stretch', 30, true, 'neck'),
  S('doorway-pec', 'Doorway Pec Stretch', 45, true, 'shoulders'),
  S('overhead-tricep-stretch', 'Overhead Tricep Stretch', 30, true, 'arms'),
  S('hip-flexor', 'Kneeling Hip Flexor Stretch', 60, true, 'hips'),
  S('quad-stretch', 'Standing Quad Stretch', 45, true, 'legs'),
  S('figure-4', 'Figure-4', 60, true, 'hips'),
  S('90-90', '90-90 Hip Stretch', 60, true, 'hips'),
  S('cross-body-shoulder', 'Cross-Body Shoulder Stretch', 30, true, 'shoulders'),
  S('spinal-twist', 'Supine Spinal Twist', 45, true, 'back'),
  S('childs-pose', "Child's Pose", 45, false, 'back'),
  S('wrist-flexor', 'Kneeling Wrist Flexor Stretch', 30, true, 'arms'),
  S('hamstring-stretch', 'Supine Hamstring Stretch', 45, true, 'legs'),
  S('wall-calf-stretch', 'Standing Wall Calf Stretch', 30, true, 'calves'),
  S('bent-knee-calf', 'Bent-Knee Calf Stretch', 30, true, 'calves'),
  S('cobra-pose', 'Cobra Pose', 30, false, 'back'),
  S('side-bend', 'Standing Side Bend', 30, true, 'core'),
]

const MORE = [
  // Neck
  { id: 'chin-tucks', name: 'Chin Tucks', duration: 30, perSide: false, area: 'neck' },
  { id: 'upper-trap', name: 'Upper Trap Stretch', duration: 30, perSide: true, area: 'neck' },
  // Chest & shoulders
  { id: 'wall-pec', name: 'Wall Pec Stretch', duration: 45, perSide: true, area: 'shoulders' },
  { id: 'behind-back-clasp', name: 'Behind-the-Back Clasp', duration: 30, perSide: false, area: 'shoulders' },
  { id: 'sleeper-stretch', name: 'Sleeper Stretch', duration: 30, perSide: true, area: 'shoulders' },
  { id: 'thread-the-needle', name: 'Thread the Needle', duration: 30, perSide: true, area: 'shoulders' },
  { id: 'puppy-pose', name: 'Puppy Pose', duration: 45, perSide: false, area: 'shoulders' },
  // Arms & wrists
  { id: 'wrist-extensor', name: 'Wrist Extensor Stretch', duration: 30, perSide: true, area: 'arms' },
  { id: 'prayer-wrist', name: 'Prayer Wrist Stretch', duration: 30, perSide: false, area: 'arms' },
  { id: 'bicep-wall', name: 'Bicep Wall Stretch', duration: 30, perSide: true, area: 'arms' },
  // Back
  { id: 'cat-cow', name: 'Cat-Cow', duration: 45, perSide: false, area: 'back' },
  { id: 'seated-twist', name: 'Seated Spinal Twist', duration: 30, perSide: true, area: 'back' },
  { id: 'knees-to-chest', name: 'Knees-to-Chest', duration: 45, perSide: false, area: 'back' },
  { id: 'sphinx-pose', name: 'Sphinx Pose', duration: 45, perSide: false, area: 'back' },
  { id: 'upward-dog', name: 'Upward Dog', duration: 30, perSide: false, area: 'back' },
  { id: 'lat-stretch', name: 'Kneeling Lat Stretch', duration: 30, perSide: true, area: 'back' },
  // Sides & core
  { id: 'seated-side-bend', name: 'Seated Side Bend', duration: 30, perSide: true, area: 'core' },
  { id: 'banana-stretch', name: 'Banana Stretch', duration: 30, perSide: true, area: 'core' },
  // Hips & glutes
  { id: 'pigeon-pose', name: 'Pigeon Pose', duration: 60, perSide: true, area: 'hips' },
  { id: 'couch-stretch', name: 'Couch Stretch', duration: 60, perSide: true, area: 'hips' },
  { id: 'butterfly', name: 'Butterfly Stretch', duration: 45, perSide: false, area: 'hips' },
  { id: 'frog-stretch', name: 'Frog Stretch', duration: 45, perSide: false, area: 'hips' },
  { id: 'lizard-pose', name: 'Lizard Pose', duration: 45, perSide: true, area: 'hips' },
  { id: 'happy-baby', name: 'Happy Baby', duration: 45, perSide: false, area: 'hips' },
  { id: 'seated-glute', name: 'Seated Glute Stretch', duration: 45, perSide: true, area: 'hips' },
  { id: 'lunge-hip-flexor', name: 'Standing Hip Flexor Lunge', duration: 45, perSide: true, area: 'hips' },
  // Hamstrings & quads
  { id: 'standing-hamstring', name: 'Standing Hamstring Stretch', duration: 45, perSide: true, area: 'legs' },
  { id: 'seated-forward-fold', name: 'Seated Forward Fold', duration: 45, perSide: false, area: 'legs' },
  { id: 'standing-forward-fold', name: 'Standing Forward Fold', duration: 45, perSide: false, area: 'legs' },
  { id: 'pyramid-pose', name: 'Pyramid Pose', duration: 30, perSide: true, area: 'legs' },
  { id: 'wide-leg-fold', name: 'Wide-Leg Forward Fold', duration: 45, perSide: false, area: 'legs' },
  { id: 'side-lunge', name: 'Side Lunge Stretch', duration: 30, perSide: true, area: 'legs' },
  { id: 'kneeling-quad', name: 'Kneeling Quad Stretch', duration: 45, perSide: true, area: 'legs' },
  { id: 'side-lying-quad', name: 'Side-Lying Quad Stretch', duration: 45, perSide: true, area: 'legs' },
  // Calves & feet
  { id: 'downward-dog', name: 'Downward Dog', duration: 45, perSide: false, area: 'calves' },
  { id: 'step-calf-drop', name: 'Step Calf Drop', duration: 30, perSide: true, area: 'calves' },
  { id: 'plantar-fascia', name: 'Toe & Plantar Fascia Stretch', duration: 30, perSide: true, area: 'calves' },
  { id: 'ankle-circles', name: 'Ankle Circles', duration: 30, perSide: true, area: 'calves' },
  // Full body
  { id: 'worlds-greatest', name: "World's Greatest Stretch", duration: 30, perSide: true, area: 'full' },
  { id: 'inchworm', name: 'Inchworm', duration: 45, perSide: false, area: 'full' },
  { id: 'deep-squat-hold', name: 'Deep Squat Hold', duration: 45, perSide: false, area: 'full' },
  { id: 'sun-salutation', name: 'Sun Salutation', duration: 60, perSide: false, area: 'full' },
]

export const STRETCH_BANK = [...ORIGINAL, ...MORE]
export const STRETCH_BY_ID = Object.fromEntries(STRETCH_BANK.map(x => [x.id, x]))

// A list's starting stretches: each gym workout's own, or the Full-Body Stretch.
export function defaultStretchIds(listId) {
  return workouts[listId]?.stretches ?? (listId === STRETCH_ROUTINE.id ? STRETCH_ROUTINE.stretches : [])
}

// Body areas to suggest first when adding to a list.
export const SUGGESTED_AREAS = {
  push: ['shoulders', 'arms', 'neck'],
  legsQuad: ['hips', 'legs'],
  pull: ['back', 'shoulders', 'arms', 'neck'],
  legsPost: ['legs', 'hips', 'calves', 'back'],
  routine: ['full', 'hips', 'back'],
}

// Which stretches fit each plan — the muscles it trains, nothing else. The
// Full-Body Stretch takes any stretch.
const STRETCH_FITS = {
  // Chest, front and side shoulders, triceps, upper traps and neck
  push: ['doorway-pec', 'wall-pec', 'behind-back-clasp', 'cross-body-shoulder', 'puppy-pose', 'sleeper-stretch',
    'overhead-tricep-stretch', 'upper-trap', 'levator-scapulae', 'lateral-neck-tilts', 'neck-rotations', 'chin-tucks'],
  // Hip flexors, quads, glutes, inner and outer thighs
  legsQuad: ['hip-flexor', 'couch-stretch', 'lunge-hip-flexor', 'quad-stretch', 'kneeling-quad', 'side-lying-quad',
    'figure-4', 'pigeon-pose', '90-90', 'seated-glute', 'lizard-pose', 'butterfly', 'frog-stretch', 'side-lunge',
    'happy-baby', 'deep-squat-hold', 'worlds-greatest'],
  // Lats, upper and mid back, traps, rear shoulders, biceps, forearms
  pull: ['lat-stretch', 'childs-pose', 'puppy-pose', 'thread-the-needle', 'cross-body-shoulder', 'cat-cow',
    'spinal-twist', 'seated-twist', 'bicep-wall', 'wrist-flexor', 'wrist-extensor', 'prayer-wrist',
    'levator-scapulae', 'upper-trap', 'downward-dog'],
  // Hamstrings, glutes, lower back, calves and feet
  legsPost: ['hamstring-stretch', 'standing-hamstring', 'seated-forward-fold', 'standing-forward-fold', 'pyramid-pose',
    'wide-leg-fold', 'pigeon-pose', 'figure-4', 'seated-glute', 'happy-baby', 'knees-to-chest', 'childs-pose',
    'cat-cow', 'spinal-twist', 'wall-calf-stretch', 'bent-knee-calf', 'step-calf-drop', 'downward-dog',
    'plantar-fascia', 'ankle-circles'],
}

export function stretchFits(stretch, listId) {
  return listId === STRETCH_ROUTINE.id || !!STRETCH_FITS[listId]?.includes(stretch.id)
}

// How well a stretch suits a list: 3 best, 2 good (anything not listed), 1
// okay. For the plans, how directly it stretches what that plan trained; for
// the Full-Body Stretch, how much of the body it reaches.
const STRETCH_BEST = {
  push: ['doorway-pec', 'wall-pec', 'behind-back-clasp', 'cross-body-shoulder', 'overhead-tricep-stretch'],
  legsQuad: ['hip-flexor', 'couch-stretch', 'quad-stretch', 'kneeling-quad', 'figure-4', 'pigeon-pose', '90-90', 'butterfly'],
  pull: ['lat-stretch', 'childs-pose', 'thread-the-needle', 'cross-body-shoulder', 'bicep-wall'],
  legsPost: ['hamstring-stretch', 'standing-hamstring', 'pyramid-pose', 'pigeon-pose', 'figure-4', 'knees-to-chest',
    'wall-calf-stretch', 'bent-knee-calf', 'step-calf-drop'],
  routine: ['worlds-greatest', 'downward-dog', 'sun-salutation', 'inchworm', 'cat-cow', 'hip-flexor', 'pigeon-pose',
    'hamstring-stretch', 'childs-pose', 'spinal-twist', 'doorway-pec', 'deep-squat-hold'],
}
const STRETCH_OKAY = {
  push: ['sleeper-stretch', 'neck-rotations', 'chin-tucks', 'lateral-neck-tilts', 'puppy-pose'],
  legsQuad: ['happy-baby', 'deep-squat-hold', 'worlds-greatest', 'frog-stretch'],
  pull: ['cat-cow', 'spinal-twist', 'seated-twist', 'prayer-wrist', 'downward-dog', 'upper-trap'],
  legsPost: ['plantar-fascia', 'ankle-circles', 'happy-baby', 'wide-leg-fold', 'standing-forward-fold', 'cat-cow'],
  routine: ['ankle-circles', 'plantar-fascia', 'prayer-wrist', 'wrist-extensor', 'wrist-flexor', 'neck-rotations', 'sleeper-stretch'],
}

export function stretchRating(stretch, listId) {
  if (STRETCH_BEST[listId]?.includes(stretch.id)) return 3
  if (STRETCH_OKAY[listId]?.includes(stretch.id)) return 1
  return 2
}
