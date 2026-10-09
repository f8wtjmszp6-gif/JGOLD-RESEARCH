import { workouts, MUSCLE_GROUPS } from './workout'

// Every exercise you can swap into a workout, by the muscle group Trends
// files it under. The ones the workouts start with keep their ids and
// starting numbers, so your saved weights and reps still apply; the rest are
// common lifts with a modest starting weight — set your own the first time.
//   compound – a heavy multi-joint lift: its rest timer defaults longer.

const B = (bar, value, assist) => ({ bar, value, ...(assist ? { assist: true } : {}) })

const MORE = [
  // Chest
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', sets: 3, reps: '8–10', weight: B(0, 50), group: 'chest', compound: true },
  { id: 'db-bench-press', name: 'Dumbbell Bench Press', sets: 3, reps: '8–10', weight: B(0, 60), group: 'chest', compound: true },
  { id: 'incline-bench-press', name: 'Incline Bench Press', sets: 3, reps: '6–8', weight: B(45, 95), group: 'chest', compound: true },
  { id: 'push-ups', name: 'Push-Ups', sets: 3, reps: '10–15', weight: B(0, 0, true), group: 'chest' },
  { id: 'cable-fly', name: 'Cable Fly', sets: 3, reps: '12–14', weight: B(0, 30), group: 'chest' },
  { id: 'pec-deck', name: 'Pec Deck', sets: 3, reps: '12–14', weight: B(0, 70), group: 'chest' },
  { id: 'chest-press-machine', name: 'Chest Press Machine', sets: 3, reps: '10–12', weight: B(0, 90), group: 'chest' },
  // Back
  { id: 'lat-pulldown', name: 'Lat Pulldown', sets: 3, reps: '8–10', weight: B(0, 100), group: 'back', compound: true },
  { id: 'seated-cable-row', name: 'Seated Cable Row', sets: 3, reps: '10–12', weight: B(0, 90), group: 'back' },
  { id: 'one-arm-db-row', name: 'One-Arm Dumbbell Row', sets: 3, reps: '8–10', weight: B(0, 40), group: 'back', perSide: true },
  { id: 'chest-supported-row', name: 'Chest-Supported Row', sets: 3, reps: '10–12', weight: B(0, 70), group: 'back' },
  { id: 't-bar-row', name: 'T-Bar Row', sets: 3, reps: '8–10', weight: B(0, 70), group: 'back', compound: true },
  { id: 'deadlift', name: 'Deadlift', sets: 3, reps: '5–6', weight: B(45, 155), group: 'back', compound: true },
  { id: 'chin-ups', name: 'Chin-Ups', sets: 3, reps: '6–8', weight: B(0, 35, true), group: 'back', compound: true },
  { id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', sets: 3, reps: '12–14', weight: B(0, 40), group: 'back' },
  // Shoulders
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', sets: 3, reps: '8–10', weight: B(0, 40), group: 'shoulders', compound: true },
  { id: 'arnold-press', name: 'Arnold Press', sets: 3, reps: '8–10', weight: B(0, 30), group: 'shoulders' },
  { id: 'front-raises', name: 'Front Raises', sets: 3, reps: '12–14', weight: B(0, 12), group: 'shoulders' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', sets: 3, reps: '12–14', weight: B(0, 10), group: 'shoulders' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 3, reps: '12–14', weight: B(0, 10), group: 'shoulders', perSide: true },
  { id: 'upright-row', name: 'Upright Row', sets: 3, reps: '10–12', weight: B(25, 45), group: 'shoulders' },
  // Arms
  { id: 'db-curl', name: 'Dumbbell Curl', sets: 3, reps: '10–12', weight: B(0, 20), group: 'arms' },
  { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', sets: 3, reps: '10–12', weight: B(0, 15), group: 'arms' },
  { id: 'preacher-curl', name: 'Preacher Curl', sets: 3, reps: '10–12', weight: B(15, 35), group: 'arms' },
  { id: 'cable-curl', name: 'Cable Curl', sets: 3, reps: '10–12', weight: B(0, 40), group: 'arms' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', sets: 3, reps: '10–12', weight: B(0, 50), group: 'arms' },
  { id: 'skull-crushers', name: 'Skull Crushers', sets: 3, reps: '8–10', weight: B(15, 45), group: 'arms' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', sets: 3, reps: '8–10', weight: B(45, 95), group: 'arms', compound: true },
  { id: 'tricep-kickbacks', name: 'Tricep Kickbacks', sets: 3, reps: '12–14', weight: B(0, 15), group: 'arms' },
  // Legs
  { id: 'back-squat', name: 'Back Squat', sets: 3, reps: '6–8', weight: B(45, 135), group: 'legs', compound: true },
  { id: 'goblet-squat', name: 'Goblet Squat', sets: 3, reps: '10–12', weight: B(0, 40), group: 'legs' },
  { id: 'leg-press', name: 'Leg Press', sets: 3, reps: '10–12', weight: B(0, 180), group: 'legs', compound: true },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', sets: 3, reps: '8–10', weight: B(0, 30), group: 'legs', perSide: true },
  { id: 'walking-lunges', name: 'Walking Lunges', sets: 3, reps: '10–12', weight: B(0, 30), group: 'legs', perSide: true },
  { id: 'step-ups', name: 'Step-Ups', sets: 3, reps: '10–12', weight: B(0, 25), group: 'legs', perSide: true },
  { id: 'leg-extension', name: 'Leg Extension', sets: 3, reps: '12–14', weight: B(0, 80), group: 'legs' },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', sets: 3, reps: '10–12', weight: B(0, 60), group: 'legs' },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', sets: 3, reps: '10–12', weight: B(0, 70), group: 'legs' },
  { id: 'glute-bridge', name: 'Glute Bridge', sets: 3, reps: '12–14', weight: B(0, 0, true), group: 'legs' },
  { id: 'cable-kickback', name: 'Cable Glute Kickback', sets: 3, reps: '12–14', weight: B(0, 20), group: 'legs', perSide: true },
  { id: 'single-leg-rdl', name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '8–10', weight: B(0, 25), group: 'legs', perSide: true },
  // Core
  { id: 'side-plank', name: 'Side Plank', sets: 3, reps: '30s', isTime: true, durationSeconds: 30, perSide: true, weight: B(0, 0, true), group: 'core' },
  { id: 'cable-crunch', name: 'Cable Crunch', sets: 3, reps: '12–14', weight: B(0, 50), group: 'core' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', sets: 3, reps: '8–10', weight: B(0, 0, true), group: 'core' },
  { id: 'russian-twists', name: 'Russian Twists', sets: 3, reps: '12–14', perSide: true, weight: B(0, 10), group: 'core' },
  { id: 'pallof-press', name: 'Pallof Press', sets: 3, reps: '10–12', perSide: true, weight: B(0, 20), group: 'core' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', sets: 3, reps: '12–14', perSide: true, weight: B(0, 0, true), group: 'core' },
  { id: 'farmers-carry', name: "Farmer's Carry", sets: 3, reps: '40s', isTime: true, durationSeconds: 40, weight: B(0, 50), group: 'core' },
]

// More of the usual gym floor: variations by equipment (barbell, dumbbell,
// cable, machine, bodyweight) so most programs can be built from the bank.
const EVEN_MORE = [
  // Chest
  { id: 'decline-bench-press', name: 'Decline Bench Press', sets: 3, reps: '6–8', weight: B(45, 115), group: 'chest', compound: true },
  { id: 'decline-db-press', name: 'Decline Dumbbell Press', sets: 3, reps: '8–10', weight: B(0, 50), group: 'chest' },
  { id: 'db-fly', name: 'Dumbbell Fly', sets: 3, reps: '10–12', weight: B(0, 20), group: 'chest' },
  { id: 'incline-db-fly', name: 'Incline Dumbbell Fly', sets: 3, reps: '10–12', weight: B(0, 20), group: 'chest' },
  { id: 'low-to-high-cable-fly', name: 'Low-to-High Cable Fly', sets: 3, reps: '12–14', weight: B(0, 20), group: 'chest' },
  { id: 'landmine-press', name: 'Landmine Press', sets: 3, reps: '8–10', weight: B(0, 45), group: 'chest' },
  { id: 'smith-bench-press', name: 'Smith Machine Bench Press', sets: 3, reps: '8–10', weight: B(15, 95), group: 'chest', compound: true },
  { id: 'smith-incline-press', name: 'Smith Machine Incline Press', sets: 3, reps: '8–10', weight: B(15, 85), group: 'chest', compound: true },
  { id: 'incline-chest-press-machine', name: 'Incline Chest Press Machine', sets: 3, reps: '10–12', weight: B(0, 80), group: 'chest' },
  { id: 'weighted-dips', name: 'Weighted Dips', sets: 3, reps: '6–8', weight: B(0, 25), group: 'chest', compound: true },
  { id: 'incline-push-ups', name: 'Incline Push-Ups', sets: 3, reps: '12–15', weight: B(0, 0, true), group: 'chest' },
  { id: 'db-pullover', name: 'Dumbbell Pullover', sets: 3, reps: '10–12', weight: B(0, 35), group: 'chest' },
  { id: 'svend-press', name: 'Svend Press', sets: 3, reps: '12–14', weight: B(0, 20), group: 'chest' },
  // Back
  { id: 'pendlay-row', name: 'Pendlay Row', sets: 3, reps: '6–8', weight: B(45, 115), group: 'back', compound: true },
  { id: 'rack-pull', name: 'Rack Pull', sets: 3, reps: '5–6', weight: B(45, 185), group: 'back', compound: true },
  { id: 'trap-bar-deadlift', name: 'Trap Bar Deadlift', sets: 3, reps: '5–6', weight: B(55, 185), group: 'back', compound: true },
  { id: 'inverted-row', name: 'Inverted Row', sets: 3, reps: '8–12', weight: B(0, 0, true), group: 'back' },
  { id: 'machine-row', name: 'Machine Row', sets: 3, reps: '10–12', weight: B(0, 90), group: 'back' },
  { id: 'close-grip-pulldown', name: 'Close-Grip Lat Pulldown', sets: 3, reps: '8–10', weight: B(0, 100), group: 'back' },
  { id: 'single-arm-pulldown', name: 'Single-Arm Cable Pulldown', sets: 3, reps: '10–12', weight: B(0, 40), group: 'back', perSide: true },
  { id: 'meadows-row', name: 'Meadows Row', sets: 3, reps: '8–10', weight: B(0, 45), group: 'back', perSide: true },
  { id: 'seal-row', name: 'Seal Row', sets: 3, reps: '8–10', weight: B(45, 75), group: 'back' },
  { id: 'db-shrugs', name: 'Dumbbell Shrugs', sets: 3, reps: '12–14', weight: B(0, 50), group: 'back' },
  { id: 'assisted-pull-up-machine', name: 'Assisted Pull-Up Machine', sets: 3, reps: '8–10', weight: B(0, 50, true), group: 'back' },
  { id: 'good-mornings', name: 'Good Mornings', sets: 3, reps: '8–10', weight: B(45, 65), group: 'back' },
  { id: 'superman', name: 'Superman Hold', sets: 3, reps: '30s', isTime: true, durationSeconds: 30, weight: B(0, 0, true), group: 'back' },
  { id: 'reverse-hyper', name: 'Reverse Hyperextension', sets: 3, reps: '12–14', weight: B(0, 0, true), group: 'back' },
  // Shoulders
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', sets: 3, reps: '10–12', weight: B(0, 60), group: 'shoulders' },
  { id: 'seated-db-press', name: 'Seated Dumbbell Press', sets: 3, reps: '8–10', weight: B(0, 35), group: 'shoulders', compound: true },
  { id: 'push-press', name: 'Push Press', sets: 3, reps: '5–6', weight: B(45, 75), group: 'shoulders', compound: true },
  { id: 'landmine-shoulder-press', name: 'Landmine Shoulder Press', sets: 3, reps: '8–10', weight: B(0, 35), group: 'shoulders', perSide: true },
  { id: 'cable-front-raise', name: 'Cable Front Raise', sets: 3, reps: '12–14', weight: B(0, 20), group: 'shoulders' },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', sets: 3, reps: '12–14', weight: B(0, 50), group: 'shoulders' },
  { id: 'cable-rear-delt-fly', name: 'Cable Rear Delt Fly', sets: 3, reps: '12–14', weight: B(0, 15), group: 'shoulders' },
  { id: 'y-raises', name: 'Y-Raises', sets: 3, reps: '12–14', weight: B(0, 8), group: 'shoulders' },
  { id: 'lu-raises', name: 'Lu Raises', sets: 3, reps: '12–14', weight: B(0, 8), group: 'shoulders' },
  { id: 'pike-push-ups', name: 'Pike Push-Ups', sets: 3, reps: '8–10', weight: B(0, 0, true), group: 'shoulders' },
  { id: 'external-rotation', name: 'Cable External Rotation', sets: 3, reps: '12–14', weight: B(0, 10), group: 'shoulders', perSide: true },
  // Arms
  { id: 'ez-bar-curl', name: 'EZ-Bar Curl', sets: 3, reps: '8–10', weight: B(15, 55), group: 'arms' },
  { id: 'spider-curl', name: 'Spider Curl', sets: 3, reps: '10–12', weight: B(0, 15), group: 'arms' },
  { id: 'concentration-curl', name: 'Concentration Curl', sets: 3, reps: '10–12', weight: B(0, 20), group: 'arms', perSide: true },
  { id: 'reverse-curl', name: 'Reverse Curl', sets: 3, reps: '10–12', weight: B(15, 35), group: 'arms' },
  { id: 'cable-hammer-curl', name: 'Cable Rope Hammer Curl', sets: 3, reps: '10–12', weight: B(0, 40), group: 'arms' },
  { id: 'bayesian-curl', name: 'Bayesian Cable Curl', sets: 3, reps: '10–12', weight: B(0, 20), group: 'arms', perSide: true },
  { id: 'machine-curl', name: 'Machine Bicep Curl', sets: 3, reps: '10–12', weight: B(0, 50), group: 'arms' },
  { id: 'rope-pushdown', name: 'Rope Pushdown', sets: 3, reps: '10–12', weight: B(0, 45), group: 'arms' },
  { id: 'overhead-cable-extension', name: 'Overhead Cable Extension', sets: 3, reps: '10–12', weight: B(0, 40), group: 'arms' },
  { id: 'single-arm-pushdown', name: 'Single-Arm Pushdown', sets: 3, reps: '12–14', weight: B(0, 20), group: 'arms', perSide: true },
  { id: 'dip-machine', name: 'Dip Machine', sets: 3, reps: '10–12', weight: B(0, 90), group: 'arms' },
  { id: 'bench-dips', name: 'Bench Dips', sets: 3, reps: '10–15', weight: B(0, 0, true), group: 'arms' },
  { id: 'db-skull-crushers', name: 'Dumbbell Skull Crushers', sets: 3, reps: '10–12', weight: B(0, 20), group: 'arms' },
  { id: 'jm-press', name: 'JM Press', sets: 3, reps: '8–10', weight: B(45, 75), group: 'arms' },
  { id: 'wrist-curl', name: 'Wrist Curl', sets: 3, reps: '12–15', weight: B(0, 15), group: 'arms' },
  { id: 'reverse-wrist-curl', name: 'Reverse Wrist Curl', sets: 3, reps: '12–15', weight: B(0, 10), group: 'arms' },
  // Legs
  { id: 'front-squat', name: 'Front Squat', sets: 3, reps: '6–8', weight: B(45, 95), group: 'legs', compound: true },
  { id: 'hack-squat', name: 'Hack Squat', sets: 3, reps: '8–10', weight: B(0, 90), group: 'legs', compound: true },
  { id: 'smith-squat', name: 'Smith Machine Squat', sets: 3, reps: '8–10', weight: B(15, 95), group: 'legs', compound: true },
  { id: 'box-squat', name: 'Box Squat', sets: 3, reps: '6–8', weight: B(45, 115), group: 'legs', compound: true },
  { id: 'pendulum-squat', name: 'Pendulum Squat', sets: 3, reps: '8–10', weight: B(0, 90), group: 'legs', compound: true },
  { id: 'belt-squat', name: 'Belt Squat', sets: 3, reps: '8–10', weight: B(0, 90), group: 'legs', compound: true },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift', sets: 3, reps: '5–6', weight: B(45, 155), group: 'legs', compound: true },
  { id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', sets: 3, reps: '8–10', weight: B(0, 40), group: 'legs' },
  { id: 'reverse-lunge', name: 'Reverse Lunge', sets: 3, reps: '8–10', weight: B(0, 30), group: 'legs', perSide: true },
  { id: 'lateral-lunge', name: 'Lateral Lunge', sets: 3, reps: '8–10', weight: B(0, 20), group: 'legs', perSide: true },
  { id: 'single-leg-press', name: 'Single-Leg Press', sets: 3, reps: '10–12', weight: B(0, 90), group: 'legs', perSide: true },
  { id: 'sissy-squat', name: 'Sissy Squat', sets: 3, reps: '8–12', weight: B(0, 0, true), group: 'legs' },
  { id: 'nordic-curl', name: 'Nordic Hamstring Curl', sets: 3, reps: '5–8', weight: B(0, 0, true), group: 'legs' },
  { id: 'standing-leg-curl', name: 'Standing Leg Curl', sets: 3, reps: '10–12', weight: B(0, 30), group: 'legs', perSide: true },
  { id: 'glute-ham-raise', name: 'Glute-Ham Raise', sets: 3, reps: '6–10', weight: B(0, 0, true), group: 'legs' },
  { id: 'hip-thrust-machine', name: 'Hip Thrust Machine', sets: 3, reps: '10–12', weight: B(0, 90), group: 'legs' },
  { id: 'single-leg-hip-thrust', name: 'Single-Leg Hip Thrust', sets: 3, reps: '10–12', weight: B(0, 0, true), group: 'legs', perSide: true },
  { id: 'frog-pumps', name: 'Frog Pumps', sets: 3, reps: '15–20', weight: B(0, 0, true), group: 'legs' },
  { id: 'cable-pull-through', name: 'Cable Pull-Through', sets: 3, reps: '12–14', weight: B(0, 50), group: 'legs' },
  { id: 'kettlebell-swing', name: 'Kettlebell Swing', sets: 3, reps: '15–20', weight: B(0, 35), group: 'legs' },
  { id: 'box-jumps', name: 'Box Jumps', sets: 3, reps: '6–8', weight: B(0, 0, true), group: 'legs' },
  { id: 'wall-sit', name: 'Wall Sit', sets: 3, reps: '45s', isTime: true, durationSeconds: 45, weight: B(0, 0, true), group: 'legs' },
  { id: 'donkey-calf-raise', name: 'Donkey Calf Raise', sets: 3, reps: '12–15', weight: B(0, 90), group: 'legs' },
  { id: 'leg-press-calf-raise', name: 'Leg Press Calf Raise', sets: 3, reps: '12–15', weight: B(0, 140), group: 'legs' },
  { id: 'single-leg-calf-raise', name: 'Single-Leg Calf Raise', sets: 3, reps: '12–15', weight: B(0, 0, true), group: 'legs', perSide: true },
  { id: 'tibialis-raise', name: 'Tibialis Raise', sets: 3, reps: '15–20', weight: B(0, 0, true), group: 'legs' },
  // Core
  { id: 'hollow-hold', name: 'Hollow Body Hold', sets: 3, reps: '30s', isTime: true, durationSeconds: 30, weight: B(0, 0, true), group: 'core' },
  { id: 'mountain-climbers', name: 'Mountain Climbers', sets: 3, reps: '30s', isTime: true, durationSeconds: 30, weight: B(0, 0, true), group: 'core' },
  { id: 'v-ups', name: 'V-Ups', sets: 3, reps: '10–12', weight: B(0, 0, true), group: 'core' },
  { id: 'crunches', name: 'Crunches', sets: 3, reps: '15–20', weight: B(0, 0, true), group: 'core' },
  { id: 'decline-sit-ups', name: 'Decline Sit-Ups', sets: 3, reps: '10–12', weight: B(0, 0, true), group: 'core' },
  { id: 'reverse-crunch', name: 'Reverse Crunch', sets: 3, reps: '12–15', weight: B(0, 0, true), group: 'core' },
  { id: 'captains-chair', name: "Captain's Chair Knee Raise", sets: 3, reps: '12–14', weight: B(0, 0, true), group: 'core' },
  { id: 'toes-to-bar', name: 'Toes-to-Bar', sets: 3, reps: '8–10', weight: B(0, 0, true), group: 'core' },
  { id: 'dragon-flag', name: 'Dragon Flag', sets: 3, reps: '5–8', weight: B(0, 0, true), group: 'core' },
  { id: 'bird-dog', name: 'Bird Dog', sets: 3, reps: '10–12', perSide: true, weight: B(0, 0, true), group: 'core' },
  { id: 'suitcase-carry', name: 'Suitcase Carry', sets: 3, reps: '40s', isTime: true, durationSeconds: 40, perSide: true, weight: B(0, 40), group: 'core' },
  { id: 'landmine-rotation', name: 'Landmine Rotation', sets: 3, reps: '10–12', perSide: true, weight: B(0, 25), group: 'core' },
  { id: 'ab-crunch-machine', name: 'Ab Crunch Machine', sets: 3, reps: '12–15', weight: B(0, 60), group: 'core' },
  { id: 'plank-shoulder-taps', name: 'Plank Shoulder Taps', sets: 3, reps: '20–30', weight: B(0, 0, true), group: 'core' },
  { id: 'copenhagen-plank', name: 'Copenhagen Plank', sets: 3, reps: '20s', isTime: true, durationSeconds: 20, perSide: true, weight: B(0, 0, true), group: 'core' },
]

const groupOf = id => MUSCLE_GROUPS.find(g => g.exercises.includes(id))?.id ?? 'core'
const starting = Object.values(workouts).flatMap(w => w.exercises).map(x => ({ ...x, group: groupOf(x.id) }))

export const EXERCISE_BANK = [...starting, ...MORE, ...EVEN_MORE]
export const EXERCISE_BY_ID = Object.fromEntries(EXERCISE_BANK.map(x => [x.id, x]))

// Which plans each exercise fits — what the plan is for, nothing else. An
// exercise can fit more than one plan when it trains what each is for (hip
// thrusts work glutes for both leg days). Core exercises fit no plan's main
// list; they go in a plan's Core section when that's switched on.
const PUSH = 'push', QUAD = 'legsQuad', PULL = 'pull', POST = 'legsPost'
const FITS = {
  // Chest & Shoulders: chest, front and side delts, triceps
  [PUSH]: [
    'bench-press', 'dips', 'incline-db-press', 'db-bench-press', 'incline-bench-press', 'push-ups', 'cable-fly', 'pec-deck',
    'chest-press-machine', 'decline-bench-press', 'decline-db-press', 'db-fly', 'incline-db-fly', 'low-to-high-cable-fly',
    'landmine-press', 'smith-bench-press', 'smith-incline-press', 'incline-chest-press-machine', 'weighted-dips',
    'incline-push-ups', 'db-pullover', 'svend-press',
    'overhead-press', 'lateral-raises', 'db-shoulder-press', 'arnold-press', 'front-raises', 'cable-lateral-raise',
    'upright-row', 'machine-shoulder-press', 'seated-db-press', 'push-press', 'landmine-shoulder-press',
    'cable-front-raise', 'lu-raises', 'pike-push-ups',
    'overhead-tricep-extension', 'tricep-pushdown', 'skull-crushers', 'close-grip-bench', 'tricep-kickbacks',
    'rope-pushdown', 'overhead-cable-extension', 'single-arm-pushdown', 'dip-machine', 'bench-dips',
    'db-skull-crushers', 'jm-press',
  ],
  // Quads & Glutes: quads, glutes, inner and outer thighs
  [QUAD]: [
    'cable-squat', 'back-squat', 'goblet-squat', 'leg-press', 'bulgarian-split-squat', 'walking-lunges', 'step-ups',
    'leg-extension', 'front-squat', 'hack-squat', 'smith-squat', 'box-squat', 'pendulum-squat', 'belt-squat',
    'reverse-lunge', 'lateral-lunge', 'single-leg-press', 'sissy-squat', 'wall-sit', 'box-jumps',
    'trap-bar-deadlift', 'sumo-deadlift',
    'hip-thrust', 'glute-bridge', 'hip-thrust-machine', 'single-leg-hip-thrust', 'frog-pumps', 'cable-kickback',
    'hip-abduction', 'hip-adduction',
  ],
  // Back & Biceps: lats and upper back, traps, rear delts, biceps, forearms
  [PULL]: [
    'barbell-rows', 'pull-ups', 'barbell-shrugs', 'lat-pulldown', 'seated-cable-row', 'one-arm-db-row',
    'chest-supported-row', 't-bar-row', 'chin-ups', 'straight-arm-pulldown', 'pendlay-row', 'inverted-row',
    'machine-row', 'close-grip-pulldown', 'single-arm-pulldown', 'meadows-row', 'seal-row', 'db-shrugs',
    'assisted-pull-up-machine', 'deadlift', 'rack-pull', 'upright-row',
    'face-pulls', 'rear-delt-fly', 'reverse-pec-deck', 'cable-rear-delt-fly', 'y-raises', 'external-rotation',
    'barbell-curl', 'hammer-curls', 'db-curl', 'incline-db-curl', 'preacher-curl', 'cable-curl', 'ez-bar-curl',
    'spider-curl', 'concentration-curl', 'reverse-curl', 'cable-hammer-curl', 'bayesian-curl', 'machine-curl',
    'wrist-curl', 'reverse-wrist-curl',
  ],
  // Hamstrings & Calves: hamstrings, glutes, lower back, calves
  [POST]: [
    'romanian-deadlift', 'lying-leg-curl', 'seated-leg-curl', 'standing-leg-curl', 'single-leg-rdl', 'db-rdl',
    'nordic-curl', 'glute-ham-raise', 'cable-pull-through', 'kettlebell-swing', 'good-mornings',
    'deadlift', 'rack-pull', 'trap-bar-deadlift', 'sumo-deadlift',
    'back-extensions', 'superman', 'reverse-hyper',
    'hip-thrust', 'glute-bridge', 'hip-thrust-machine', 'single-leg-hip-thrust', 'frog-pumps', 'cable-kickback',
    'standing-calf-raise', 'seated-calf-raise', 'donkey-calf-raise', 'leg-press-calf-raise', 'single-leg-calf-raise',
    'tibialis-raise',
  ],
}

// Whether an exercise belongs in a plan's main list, or in its Core section.
export function fitsPlan(exercise, planId) {
  return !!FITS[planId]?.includes(exercise.id)
}
export function isCore(exercise) {
  return exercise.group === 'core'
}

// Each plan's starting Core section — abs and obliques both covered.
export const DEFAULT_CORE = {
  push: [],
  legsQuad: ['plank', 'dead-bugs', 'side-plank'],
  pull: ['hanging-leg-raises', 'pallof-press'],
  legsPost: ['woodchoppers', 'ab-wheel'],
}

// Which plans start with their Core section on: the ones that had core work.
export const CORE_ON_BY_DEFAULT = { push: false, legsQuad: true, pull: true, legsPost: true }

// How well each exercise targets what a plan (or the Core section) is for:
//   3 – best: the most direct, effective choices for those muscles
//   2 – good: solid, effective work (anything not listed below)
//   1 – okay: works, but less directly, or mostly another muscle or skill
// Judged on how directly the exercise loads the plan's muscles, through a
// full range, with enough resistance to progress. General guidance; a 1 is
// still a fine pick if it suits you.
const BEST = {
  push: ['bench-press', 'incline-bench-press', 'incline-db-press', 'db-bench-press', 'dips', 'weighted-dips', 'cable-fly',
    'overhead-press', 'db-shoulder-press', 'seated-db-press', 'lateral-raises', 'cable-lateral-raise',
    'overhead-tricep-extension', 'overhead-cable-extension', 'skull-crushers', 'close-grip-bench'],
  legsQuad: ['back-squat', 'front-squat', 'hack-squat', 'pendulum-squat', 'leg-press', 'bulgarian-split-squat', 'hip-thrust',
    'hip-thrust-machine', 'leg-extension'],
  pull: ['pull-ups', 'chin-ups', 'lat-pulldown', 'barbell-rows', 'seated-cable-row', 'one-arm-db-row', 'chest-supported-row',
    't-bar-row', 'face-pulls', 'reverse-pec-deck', 'barbell-curl', 'incline-db-curl', 'bayesian-curl'],
  legsPost: ['romanian-deadlift', 'seated-leg-curl', 'nordic-curl', 'glute-ham-raise', 'hip-thrust', 'hip-thrust-machine',
    'standing-calf-raise', 'seated-calf-raise'],
  core: ['hanging-leg-raises', 'toes-to-bar', 'ab-wheel', 'cable-crunch'],
}
const OKAY = {
  push: ['svend-press', 'db-pullover', 'incline-push-ups', 'front-raises', 'cable-front-raise', 'upright-row', 'lu-raises',
    'bench-dips', 'tricep-kickbacks', 'landmine-press'],
  legsQuad: ['wall-sit', 'box-jumps', 'frog-pumps', 'sumo-deadlift', 'trap-bar-deadlift', 'cable-kickback'],
  pull: ['upright-row', 'deadlift', 'rack-pull', 'external-rotation', 'wrist-curl', 'reverse-wrist-curl', 'inverted-row'],
  legsPost: ['superman', 'frog-pumps', 'kettlebell-swing', 'tibialis-raise', 'trap-bar-deadlift', 'rack-pull', 'reverse-hyper'],
  core: ['crunches', 'russian-twists', 'mountain-climbers', 'plank-shoulder-taps', 'bird-dog'],
}
const RATING_LABEL = { 3: 'Best', 2: 'Good', 1: 'Okay' }

// 3, 2 or 1 for an exercise in a plan (pass 'core' for the Core section).
export function ratingFor(exercise, planId) {
  if (BEST[planId]?.includes(exercise.id)) return 3
  if (OKAY[planId]?.includes(exercise.id)) return 1
  return 2
}
export function ratingLabel(rating) {
  return RATING_LABEL[rating]
}

// Muscle groups to suggest first when adding to a workout.
export const SUGGESTED_GROUPS = {
  push: ['chest', 'shoulders', 'arms'],
  legsQuad: ['legs', 'core'],
  pull: ['back', 'arms', 'core'],
  legsPost: ['legs', 'back', 'core'],
}

// ── Coverage ───────────────────────────────────────────────────────────────
// The areas each plan (and the Core section) is meant to work. A plan covers
// an area when one of its exercises has that area as a main target.
export const PLAN_AREAS = {
  push: [['chest', 'Chest'], ['front-delts', 'Front delts'], ['side-delts', 'Side delts'], ['triceps', 'Triceps']],
  legsQuad: [['quads', 'Quads'], ['glutes', 'Glutes'], ['inner-thighs', 'Inner thighs'], ['outer-thighs', 'Outer thighs']],
  pull: [['lats', 'Lats / upper back'], ['traps', 'Traps'], ['rear-delts', 'Rear delts'], ['biceps', 'Biceps']],
  legsPost: [['hamstrings', 'Hamstrings'], ['glutes', 'Glutes'], ['lower-back', 'Lower back'], ['calves', 'Calves']],
  core: [['abs', 'Abs'], ['obliques', 'Obliques']],
}

// Each exercise's main targets only — a bench press is chest work, not your
// triceps work. Anything not listed targets a single area by its group.
const T = (areas, ...ids) => Object.fromEntries(ids.map(id => [id, areas]))
const COVERS = {
  ...T(['chest'], 'bench-press', 'incline-db-press', 'db-bench-press', 'incline-bench-press', 'push-ups', 'cable-fly', 'pec-deck',
    'chest-press-machine', 'decline-bench-press', 'decline-db-press', 'db-fly', 'incline-db-fly', 'low-to-high-cable-fly',
    'smith-bench-press', 'smith-incline-press', 'incline-chest-press-machine', 'incline-push-ups', 'db-pullover', 'svend-press'),
  ...T(['chest', 'triceps'], 'dips', 'weighted-dips'),
  ...T(['chest', 'front-delts'], 'landmine-press'),
  ...T(['triceps', 'chest'], 'close-grip-bench'),
  ...T(['front-delts'], 'overhead-press', 'db-shoulder-press', 'front-raises', 'machine-shoulder-press', 'seated-db-press', 'push-press',
    'landmine-shoulder-press', 'cable-front-raise', 'pike-push-ups'),
  ...T(['front-delts', 'side-delts'], 'arnold-press'),
  ...T(['side-delts'], 'lateral-raises', 'cable-lateral-raise', 'lu-raises'),
  ...T(['side-delts', 'traps'], 'upright-row'),
  ...T(['rear-delts'], 'face-pulls', 'rear-delt-fly', 'reverse-pec-deck', 'cable-rear-delt-fly', 'external-rotation'),
  ...T(['rear-delts', 'traps'], 'y-raises'),
  ...T(['triceps'], 'overhead-tricep-extension', 'tricep-pushdown', 'skull-crushers', 'tricep-kickbacks', 'rope-pushdown',
    'overhead-cable-extension', 'single-arm-pushdown', 'dip-machine', 'bench-dips', 'db-skull-crushers', 'jm-press'),
  ...T(['lats'], 'barbell-rows', 'pull-ups', 'lat-pulldown', 'seated-cable-row', 'one-arm-db-row', 'chest-supported-row', 't-bar-row',
    'straight-arm-pulldown', 'pendlay-row', 'inverted-row', 'machine-row', 'close-grip-pulldown', 'single-arm-pulldown',
    'meadows-row', 'seal-row', 'assisted-pull-up-machine'),
  ...T(['lats', 'biceps'], 'chin-ups'),
  ...T(['traps'], 'barbell-shrugs', 'db-shrugs'),
  ...T(['hamstrings', 'glutes', 'lower-back', 'traps'], 'deadlift'),
  ...T(['traps', 'lower-back', 'glutes'], 'rack-pull'),
  ...T(['biceps'], 'barbell-curl', 'hammer-curls', 'db-curl', 'incline-db-curl', 'preacher-curl', 'cable-curl', 'ez-bar-curl',
    'spider-curl', 'concentration-curl', 'reverse-curl', 'cable-hammer-curl', 'bayesian-curl', 'machine-curl'),
  ...T([], 'wrist-curl', 'reverse-wrist-curl', 'tibialis-raise'),
  ...T(['quads'], 'cable-squat', 'goblet-squat', 'leg-press', 'leg-extension', 'front-squat', 'hack-squat', 'smith-squat',
    'pendulum-squat', 'belt-squat', 'single-leg-press', 'sissy-squat', 'wall-sit', 'box-jumps'),
  ...T(['quads', 'glutes'], 'back-squat', 'box-squat', 'bulgarian-split-squat', 'walking-lunges', 'reverse-lunge', 'step-ups'),
  ...T(['inner-thighs', 'quads'], 'lateral-lunge'),
  ...T(['quads', 'glutes', 'hamstrings'], 'trap-bar-deadlift'),
  ...T(['glutes', 'inner-thighs', 'hamstrings'], 'sumo-deadlift'),
  ...T(['glutes'], 'hip-thrust', 'glute-bridge', 'hip-thrust-machine', 'single-leg-hip-thrust', 'frog-pumps', 'cable-kickback'),
  ...T(['outer-thighs'], 'hip-abduction'),
  ...T(['inner-thighs'], 'hip-adduction'),
  ...T(['hamstrings', 'glutes'], 'romanian-deadlift', 'single-leg-rdl', 'db-rdl', 'cable-pull-through', 'kettlebell-swing'),
  ...T(['hamstrings'], 'lying-leg-curl', 'seated-leg-curl', 'standing-leg-curl', 'nordic-curl', 'glute-ham-raise'),
  ...T(['hamstrings', 'lower-back'], 'good-mornings'),
  ...T(['lower-back'], 'back-extensions', 'superman'),
  ...T(['lower-back', 'glutes'], 'reverse-hyper'),
  ...T(['calves'], 'standing-calf-raise', 'seated-calf-raise', 'donkey-calf-raise', 'leg-press-calf-raise', 'single-leg-calf-raise'),
  ...T(['abs'], 'plank', 'dead-bugs', 'hanging-leg-raises', 'cable-crunch', 'ab-wheel', 'hollow-hold', 'mountain-climbers', 'v-ups',
    'crunches', 'decline-sit-ups', 'reverse-crunch', 'captains-chair', 'toes-to-bar', 'dragon-flag', 'bird-dog',
    'ab-crunch-machine', 'plank-shoulder-taps', 'farmers-carry'),
  ...T(['obliques'], 'woodchoppers', 'side-plank', 'russian-twists', 'pallof-press', 'suitcase-carry', 'landmine-rotation', 'copenhagen-plank'),
  ...T(['abs', 'obliques'], 'bicycle-crunch'),
}

export function coversOf(exercise) {
  return COVERS[exercise.id] ?? []
}

// Each of a list's areas, and whether one of its exercises covers it.
// `section` is the plan id, or 'core' for the Core section.
export function coverage(list, section) {
  const covered = new Set(list.flatMap(coversOf))
  return (PLAN_AREAS[section] ?? []).map(([id, label]) => ({ id, label, covered: covered.has(id) }))
}

// The areas a change would leave uncovered that are covered now.
export function gapsAfter(before, after, section) {
  const now = coverage(before, section)
  const next = coverage(after, section)
  return now.filter((a, i) => a.covered && !next[i].covered).map(a => a.label)
}

// What an exercise is done with. It decides how its weight reads: a barbell
// shows its bar and plates, a dumbbell the weight of one, an assist machine
// the help it gives (less is harder), bodyweight anything added on top.
export const EQUIPMENT = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbell', label: 'Dumbbell' },
  { id: 'cable', label: 'Cable' },
  { id: 'machine', label: 'Machine' },
  { id: 'bodyweight', label: 'Body' },
  { id: 'assisted', label: 'Assisted' },
]
const CABLE = [
  'cable-squat', 'face-pulls', 'woodchoppers', 'cable-fly', 'lat-pulldown', 'seated-cable-row',
  'straight-arm-pulldown', 'cable-lateral-raise', 'cable-curl', 'tricep-pushdown', 'low-to-high-cable-fly',
  'close-grip-pulldown', 'single-arm-pulldown', 'cable-front-raise', 'cable-rear-delt-fly', 'external-rotation',
  'cable-hammer-curl', 'bayesian-curl', 'rope-pushdown', 'overhead-cable-extension', 'single-arm-pushdown',
  'cable-kickback', 'cable-crunch', 'pallof-press', 'cable-pull-through',
]
// Machines, plus plate-loaded lifts on one end of a bar (landmine, T-bar),
// where plates-per-side math doesn't apply.
const MACHINE = [
  'hip-abduction', 'hip-adduction', 'standing-calf-raise', 'seated-calf-raise', 'pec-deck', 'chest-press-machine',
  'chest-supported-row', 'incline-chest-press-machine', 'machine-row', 'machine-shoulder-press', 'reverse-pec-deck',
  'machine-curl', 'dip-machine', 'hack-squat', 'pendulum-squat', 'belt-squat', 'leg-press', 'leg-extension',
  'lying-leg-curl', 'seated-leg-curl', 'single-leg-press', 'standing-leg-curl', 'hip-thrust-machine',
  'donkey-calf-raise', 'leg-press-calf-raise', 'ab-crunch-machine',
  't-bar-row', 'landmine-press', 'meadows-row', 'landmine-shoulder-press', 'landmine-rotation',
]
// Bodyweight with a plate or belt added.
const WEIGHTED_BODY = ['back-extensions', 'weighted-dips']

export function defaultEquipment(exercise) {
  const { bar, value, assist } = exercise.weight
  if (assist) return value > 0 ? 'assisted' : 'bodyweight'
  if (bar > 0) return 'barbell'
  if (CABLE.includes(exercise.id)) return 'cable'
  if (MACHINE.includes(exercise.id)) return 'machine'
  if (WEIGHTED_BODY.includes(exercise.id)) return 'bodyweight'
  return 'dumbbell'
}
