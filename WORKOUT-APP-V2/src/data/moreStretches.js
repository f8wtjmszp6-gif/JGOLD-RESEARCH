// More stretches, filling out each area (see STRETCH_AREAS). Same shape as
// the stretch bank: a default hold (seconds) and whether it's done per side.
const S = (id, name, duration, perSide, area) => ({ id, name, duration, perSide, area })

export const MORE_STRETCHES = [
  // Neck
  S('chin-to-chest', 'Chin-to-Chest Stretch', 30, false, 'neck'),
  S('scalene-stretch', 'Scalene Stretch', 30, true, 'neck'),
  S('neck-extension', 'Neck Extension Stretch', 20, false, 'neck'),
  S('shoulder-rolls', 'Shoulder Rolls', 30, false, 'neck'),
  // Chest & shoulders
  S('eagle-arms', 'Eagle Arms', 30, true, 'shoulders'),
  S('floor-pec', 'Lying Pec Stretch', 45, true, 'shoulders'),
  S('reverse-prayer', 'Reverse Prayer', 30, false, 'shoulders'),
  S('wall-angels', 'Wall Angels', 45, false, 'shoulders'),
  S('cow-face-arms', 'Cow Face Arms', 30, true, 'shoulders'),
  S('overhead-reach', 'Overhead Reach', 30, false, 'shoulders'),
  // Arms & wrists
  S('finger-stretch', 'Finger Stretch', 30, true, 'arms'),
  S('thumb-stretch', 'Thumb Stretch', 20, true, 'arms'),
  S('forearm-wall', 'Wall Forearm Stretch', 30, true, 'arms'),
  S('tricep-wall', 'Tricep Wall Stretch', 30, true, 'arms'),
  // Back
  S('open-book', 'Open Book', 30, true, 'back'),
  S('knee-drops', 'Knee Drops', 45, false, 'back'),
  S('upper-back-hug', 'Upper Back Hug', 30, false, 'back'),
  S('side-childs-pose', "Side Child's Pose", 30, true, 'back'),
  S('doorway-lat', 'Doorway Lat Stretch', 30, true, 'back'),
  // Sides & core
  S('camel-pose', 'Camel Pose', 30, false, 'core'),
  S('bridge-pose', 'Bridge Pose', 30, false, 'core'),
  S('fish-pose', 'Fish Pose', 30, false, 'core'),
  S('gate-pose', 'Gate Pose', 30, true, 'core'),
  // Hips & glutes
  S('standing-figure-4', 'Standing Figure-4', 30, true, 'hips'),
  S('adductor-rock-back', 'Adductor Rock-Back', 45, true, 'hips'),
  S('low-lunge-twist', 'Low Lunge Twist', 30, true, 'hips'),
  S('cow-face-legs', 'Cow Face Legs', 45, false, 'hips'),
  S('outer-hip-cross', 'Standing Outer Hip Stretch', 30, true, 'hips'),
  // Hamstrings & quads
  S('half-split', 'Half Split', 45, true, 'legs'),
  S('doorway-hamstring', 'Doorway Hamstring Stretch', 60, true, 'legs'),
  S('heel-sit', 'Kneeling Heel Sit', 45, false, 'legs'),
  S('ragdoll', 'Ragdoll Fold', 45, false, 'legs'),
  // Calves & feet
  S('kneeling-shin', 'Kneeling Shin Stretch', 30, false, 'calves'),
  S('walking-dog', 'Pedaling Downward Dog', 45, false, 'calves'),
  S('towel-calf', 'Seated Towel Calf Stretch', 30, true, 'calves'),
  // Full body
  S('spiderman-lunge', 'Spiderman Lunge', 30, true, 'full'),
  S('reach-and-fold', 'Reach and Fold', 45, false, 'full'),
  S('dog-to-cobra', 'Downward Dog to Cobra', 45, false, 'full'),
]
