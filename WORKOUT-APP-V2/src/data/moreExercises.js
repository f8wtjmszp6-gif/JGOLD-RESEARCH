// More exercises, mostly ones you can do at home: with no equipment, or with
// a pair of dumbbells. Each lists what it mainly works (`covers`, as in
// coversOf) and, for cables and machines, what it's done with (`equipment`;
// otherwise it's read from its weight, as in defaultEquipment).
//   gear – done without weights, but it needs something a home doesn't have
//          (a bar to hang from, a bench made for it); left out of home
//          workouts.

const B = (bar, value, assist) => ({ bar, value, ...(assist ? { assist: true } : {}) })
const BODY = B(0, 0, true)
const X = (id, name, reps, weight, group, covers, more = {}) => ({ id, name, sets: 3, reps, weight, group, covers, ...more })
const HOLD = s => ({ isTime: true, durationSeconds: s })

export const MORE_EXERCISES = [
  // ── Chest ────────────────────────────────────────────────────────────────
  X('wide-push-ups', 'Wide Push-Ups', '10–15', BODY, 'chest', ['chest']),
  X('decline-push-ups', 'Decline Push-Ups', '8–12', BODY, 'chest', ['chest', 'front-delts']),
  X('archer-push-ups', 'Archer Push-Ups', '6–8', BODY, 'chest', ['chest'], { perSide: true }),
  X('knee-push-ups', 'Knee Push-Ups', '12–15', BODY, 'chest', ['chest']),
  X('hand-release-push-ups', 'Hand-Release Push-Ups', '8–12', BODY, 'chest', ['chest']),
  X('db-floor-press', 'Dumbbell Floor Press', '8–10', B(0, 50), 'chest', ['chest', 'triceps'], { compound: true }),
  X('db-squeeze-press', 'Dumbbell Squeeze Press', '10–12', B(0, 35), 'chest', ['chest']),
  X('single-arm-db-press', 'Single-Arm Dumbbell Bench Press', '8–10', B(0, 45), 'chest', ['chest'], { perSide: true }),
  X('high-to-low-cable-fly', 'High-to-Low Cable Fly', '12–14', B(0, 20), 'chest', ['chest'], { equipment: 'cable' }),
  X('single-arm-cable-press', 'Single-Arm Cable Chest Press', '10–12', B(0, 25), 'chest', ['chest'], { equipment: 'cable', perSide: true }),

  // ── Back ─────────────────────────────────────────────────────────────────
  X('reverse-snow-angels', 'Reverse Snow Angels', '10–12', BODY, 'back', ['rear-delts', 'traps']),
  X('prone-ytw', 'Prone Y-T-W Raises', '8–10', BODY, 'back', ['traps', 'rear-delts']),
  X('towel-door-row', 'Towel Door Row', '10–12', BODY, 'back', ['lats', 'biceps']),
  X('table-row', 'Table Row', '8–12', BODY, 'back', ['lats']),
  X('superman-pull', 'Superman Lat Pull', '10–12', BODY, 'back', ['lats', 'lower-back']),
  X('renegade-row', 'Renegade Row', '8–10', B(0, 25), 'back', ['lats', 'abs'], { perSide: true }),
  X('db-bent-over-row', 'Dumbbell Bent-Over Row', '8–10', B(0, 40), 'back', ['lats'], { compound: true }),
  X('incline-db-row', 'Incline Dumbbell Row', '10–12', B(0, 35), 'back', ['lats', 'rear-delts']),
  X('db-high-pull', 'Dumbbell High Pull', '10–12', B(0, 25), 'back', ['traps', 'rear-delts']),
  X('neutral-grip-pulldown', 'Neutral-Grip Lat Pulldown', '8–10', B(0, 100), 'back', ['lats'], { equipment: 'cable' }),
  X('cable-shrug', 'Cable Shrug', '12–14', B(0, 70), 'back', ['traps'], { equipment: 'cable' }),
  X('machine-pullover', 'Machine Pullover', '10–12', B(0, 80), 'back', ['lats'], { equipment: 'machine' }),

  // ── Shoulders ────────────────────────────────────────────────────────────
  X('decline-pike-push-ups', 'Decline Pike Push-Ups', '6–10', BODY, 'shoulders', ['front-delts', 'triceps']),
  X('wall-handstand-hold', 'Wall Handstand Hold', '20s', BODY, 'shoulders', ['front-delts'], HOLD(20)),
  X('arm-circles', 'Arm Circles', '40s', BODY, 'shoulders', ['side-delts'], HOLD(40)),
  X('prone-t-raise', 'Prone T-Raise', '12–15', BODY, 'shoulders', ['rear-delts']),
  X('wall-slides', 'Wall Slides', '10–12', BODY, 'shoulders', ['rear-delts', 'traps']),
  X('cuban-press', 'Cuban Press', '10–12', B(0, 10), 'shoulders', ['rear-delts', 'side-delts']),
  X('leaning-lateral-raise', 'Leaning Lateral Raise', '12–14', B(0, 15), 'shoulders', ['side-delts'], { perSide: true }),
  X('db-z-press', 'Dumbbell Z Press', '8–10', B(0, 30), 'shoulders', ['front-delts']),
  X('db-upright-row', 'Dumbbell Upright Row', '10–12', B(0, 20), 'shoulders', ['side-delts', 'traps']),
  X('db-push-press', 'Dumbbell Push Press', '6–8', B(0, 40), 'shoulders', ['front-delts'], { compound: true }),
  X('machine-lateral-raise', 'Machine Lateral Raise', '12–14', B(0, 50), 'shoulders', ['side-delts'], { equipment: 'machine' }),
  X('cable-y-raise', 'Cable Y-Raise', '12–14', B(0, 10), 'shoulders', ['side-delts', 'rear-delts'], { equipment: 'cable' }),
  X('smith-shoulder-press', 'Smith Machine Shoulder Press', '8–10', B(15, 65), 'shoulders', ['front-delts'], { compound: true }),

  // ── Arms ─────────────────────────────────────────────────────────────────
  X('diamond-push-ups', 'Diamond Push-Ups', '8–12', BODY, 'arms', ['triceps', 'chest']),
  X('bodyweight-tricep-extension', 'Bodyweight Tricep Extension', '8–12', BODY, 'arms', ['triceps']),
  X('towel-curl', 'Towel Curl', '10–12', BODY, 'arms', ['biceps']),
  X('door-frame-curl', 'Door Frame Curl', '10–12', BODY, 'arms', ['biceps'], { perSide: true }),
  X('zottman-curl', 'Zottman Curl', '10–12', B(0, 20), 'arms', ['biceps']),
  X('cross-body-hammer-curl', 'Cross-Body Hammer Curl', '10–12', B(0, 25), 'arms', ['biceps'], { perSide: true }),
  X('db-drag-curl', 'Dumbbell Drag Curl', '10–12', B(0, 20), 'arms', ['biceps']),
  X('tate-press', 'Tate Press', '10–12', B(0, 20), 'arms', ['triceps']),
  X('db-close-grip-press', 'Dumbbell Close-Grip Press', '10–12', B(0, 35), 'arms', ['triceps', 'chest']),
  X('single-arm-overhead-extension', 'Single-Arm Overhead Extension', '10–12', B(0, 15), 'arms', ['triceps'], { perSide: true }),
  X('high-cable-curl', 'High Cable Curl', '12–14', B(0, 20), 'arms', ['biceps'], { equipment: 'cable' }),
  X('cable-tricep-kickback', 'Cable Tricep Kickback', '12–14', B(0, 15), 'arms', ['triceps'], { equipment: 'cable', perSide: true }),

  // ── Quads ────────────────────────────────────────────────────────────────
  X('jump-squats', 'Jump Squats', '10–12', BODY, 'legs', ['quads', 'glutes']),
  X('skater-squat', 'Skater Squat', '6–8', BODY, 'legs', ['quads', 'glutes'], { perSide: true }),
  X('pistol-squat', 'Box Pistol Squat', '5–8', BODY, 'legs', ['quads', 'glutes'], { perSide: true }),
  X('cossack-squat', 'Cossack Squat', '6–8', BODY, 'legs', ['quads', 'inner-thighs'], { perSide: true }),
  X('bodyweight-lunge', 'Bodyweight Lunge', '10–12', BODY, 'legs', ['quads', 'glutes'], { perSide: true }),
  X('db-front-squat', 'Dumbbell Front Squat', '10–12', B(0, 30), 'legs', ['quads'], { compound: true }),
  X('heel-elevated-goblet-squat', 'Heel-Elevated Goblet Squat', '10–12', B(0, 35), 'legs', ['quads']),
  X('db-split-squat', 'Dumbbell Split Squat', '8–10', B(0, 25), 'legs', ['quads', 'glutes'], { perSide: true }),
  X('smith-split-squat', 'Smith Machine Split Squat', '8–10', B(15, 65), 'legs', ['quads', 'glutes'], { perSide: true }),
  X('cable-goblet-squat', 'Cable Goblet Squat', '10–12', B(0, 60), 'legs', ['quads'], { equipment: 'cable' }),

  // ── Glutes ───────────────────────────────────────────────────────────────
  X('donkey-kicks', 'Donkey Kicks', '12–15', BODY, 'legs', ['glutes'], { perSide: true }),
  X('fire-hydrants', 'Fire Hydrants', '12–15', BODY, 'legs', ['outer-thighs', 'glutes'], { perSide: true }),
  X('clamshells', 'Clamshells', '15–20', BODY, 'legs', ['outer-thighs'], { perSide: true }),
  X('single-leg-glute-bridge', 'Single-Leg Glute Bridge', '10–12', BODY, 'legs', ['glutes'], { perSide: true }),
  X('side-lying-leg-raise', 'Side-Lying Leg Raise', '12–15', BODY, 'legs', ['outer-thighs'], { perSide: true }),
  X('curtsy-lunge', 'Curtsy Lunge', '10–12', BODY, 'legs', ['glutes', 'outer-thighs'], { perSide: true }),
  X('db-hip-thrust', 'Dumbbell Hip Thrust', '10–12', B(0, 50), 'legs', ['glutes']),
  X('db-sumo-squat', 'Dumbbell Sumo Squat', '10–12', B(0, 45), 'legs', ['glutes', 'inner-thighs']),
  X('b-stance-rdl', 'B-Stance Romanian Deadlift', '8–10', B(0, 35), 'legs', ['glutes', 'hamstrings'], { perSide: true }),
  X('db-curtsy-lunge', 'Dumbbell Curtsy Lunge', '8–10', B(0, 20), 'legs', ['glutes', 'outer-thighs'], { perSide: true }),
  X('smith-hip-thrust', 'Smith Machine Hip Thrust', '8–10', B(15, 95), 'legs', ['glutes'], { compound: true }),
  X('cable-hip-abduction', 'Cable Hip Abduction', '12–15', B(0, 15), 'legs', ['outer-thighs', 'glutes'], { equipment: 'cable', perSide: true }),
  X('glute-kickback-machine', 'Glute Kickback Machine', '12–14', B(0, 60), 'legs', ['glutes'], { equipment: 'machine', perSide: true }),

  // ── Hamstrings ───────────────────────────────────────────────────────────
  X('sliding-leg-curl', 'Sliding Leg Curl', '8–12', BODY, 'legs', ['hamstrings']),
  X('hamstring-walkouts', 'Hamstring Walkouts', '8–10', BODY, 'legs', ['hamstrings', 'glutes']),
  X('bodyweight-good-morning', 'Bodyweight Good Morning', '12–15', BODY, 'legs', ['hamstrings', 'lower-back']),
  X('elevated-hamstring-bridge', 'Elevated Hamstring Bridge', '10–12', BODY, 'legs', ['hamstrings', 'glutes']),
  X('bodyweight-single-leg-rdl', 'Bodyweight Single-Leg Deadlift', '10–12', BODY, 'legs', ['hamstrings', 'glutes'], { perSide: true }),
  X('db-stiff-leg-deadlift', 'Dumbbell Stiff-Leg Deadlift', '8–10', B(0, 40), 'legs', ['hamstrings']),
  X('db-leg-curl', 'Dumbbell Leg Curl', '10–12', B(0, 15), 'legs', ['hamstrings']),
  X('db-deadlift', 'Dumbbell Deadlift', '8–10', B(0, 50), 'legs', ['hamstrings', 'glutes', 'lower-back'], { compound: true }),
  X('cable-leg-curl', 'Cable Leg Curl', '10–12', B(0, 20), 'legs', ['hamstrings'], { equipment: 'cable', perSide: true }),

  // ── Calves ───────────────────────────────────────────────────────────────
  X('bodyweight-calf-raise', 'Bodyweight Calf Raise', '15–20', BODY, 'legs', ['calves']),
  X('bent-knee-calf-raise', 'Bent-Knee Calf Raise', '15–20', BODY, 'legs', ['calves']),
  X('pogo-hops', 'Pogo Hops', '30s', BODY, 'legs', ['calves'], HOLD(30)),
  X('db-calf-raise', 'Dumbbell Calf Raise', '12–15', B(0, 40), 'legs', ['calves']),
  X('seated-db-calf-raise', 'Seated Dumbbell Calf Raise', '15–20', B(0, 40), 'legs', ['calves']),
  X('smith-calf-raise', 'Smith Machine Calf Raise', '12–15', B(15, 95), 'legs', ['calves']),

  // ── Core ─────────────────────────────────────────────────────────────────
  X('flutter-kicks', 'Flutter Kicks', '30s', BODY, 'core', ['abs'], HOLD(30)),
  X('heel-taps', 'Heel Taps', '20–30', BODY, 'core', ['obliques']),
  X('plank-up-downs', 'Plank Up-Downs', '10–12', BODY, 'core', ['abs', 'triceps']),
  X('side-plank-dips', 'Side Plank Hip Dips', '10–12', BODY, 'core', ['obliques'], { perSide: true }),
  X('bear-crawl-hold', 'Bear Crawl Hold', '30s', BODY, 'core', ['abs'], HOLD(30)),
  X('db-side-bend', 'Dumbbell Side Bend', '12–14', B(0, 35), 'core', ['obliques'], { perSide: true }),
  X('db-woodchop', 'Dumbbell Woodchop', '10–12', B(0, 15), 'core', ['obliques'], { perSide: true }),
  X('weighted-crunch', 'Weighted Crunch', '12–15', B(0, 15), 'core', ['abs']),
  X('cable-oblique-crunch', 'Cable Side Crunch', '12–14', B(0, 30), 'core', ['obliques'], { equipment: 'cable', perSide: true }),
]
