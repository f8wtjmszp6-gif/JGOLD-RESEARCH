import { workouts, activities, PLAN_IDS, FULL_BODY_BY_ID, SPORTS, STRETCH_ROUTINE, COOL_DOWNS, COOL_DOWN_BY_ID, CLASS_AREAS, COMPOUND_LIFTS, REST_COMPOUND, REST_ACCESSORY, CARDIO_DEFAULTS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES, CLASS_DEFAULT, CLASS_LEGACY, GOAL_DEFAULTS } from '../data/workout'
import { STRETCH_BY_ID, defaultStretchIds, stretchFits } from '../data/stretches'
import { weekDays, sameDay } from '../utils/days'
import { EXERCISE_BY_ID, fitsPlan, isCore, CORE_ON_BY_DEFAULT, DEFAULT_CORE, defaultEquipment } from '../data/exercises'

// The app's state, and small functions that read or change it. useStore.js
// builds the store on top of these; weeks.js files past weeks.
//
// State is split into what you've set and what you've done:
//
//   Remembered — never cleared:
//     exerciseSettings  { [exerciseId]: { bar, weight, reps: [n, …], holds: [seconds, …] } }
//     setup             { [exerciseId]: { mode: 'reps' | 'hold', perSide, restOn, rest } }
//     warmups           { [workoutId]: { on, sets: [{ minutes, hard }, …] } }  (a ticked warm-up counts as cardio)
//     order             { [workoutId]: [exerciseId, …] }  (a plan's exercises, in order, from the bank)
//     coreLists         { [workoutId]: [exerciseId, …] }  (its Core section)
//     coreOn            { [workoutId]: bool }              (whether the Core section is on)
//     stretchLists      { [workoutId | 'routine']: [stretchId, …] }  (your stretches, from the bank)
//     equipment         { [exerciseId]: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'assisted' }
//     assist            { [exerciseId]: bool }  (kept in step with equipment; older saves only have this)
//     customDurations   { [stretchId]: seconds }
//     perSide           { [stretchId]: bool }
//     stretchSets       { [stretchId]: count }  (rounds of a stretch, default 1)
//     stretchRest       { [stretchId]: seconds } (rest between those rounds, default 20)
//     cardioSettings    { walk | other | sport: { minutes, hard, type? } }  (where the next one starts)
//     sportNames        [name, …]  (sports you typed in, offered next to SPORTS)
//     lastClass         your answers for the last class logged (its length and effort carry over)
//     lastBackupAt      ISO time of the last backup file you saved
//     history           [weekSummary, …] newest first — saved by each reset, never cleared
//     lastResetAt       ISO time of the last reset (the start of the current week)
//     goals             { workouts | stretch | cardio: { min, max } }  (your weekly goals; defaults in GOAL_DEFAULTS)
//     newWeek           { weekStart } while the "new week" note is showing
//     timer             { sound: 'music' | 'silent', prep: seconds }  (see timerOf)
//     seenNotes         [id, …]  (notifications you've seen; the bell's dot is for the rest)
//     dismissedNotes    [id, …]  (ones you cleared with ✕; they don't show again)
//
//   Checkmarks — cleared by the header reset:
//     checks            { [workoutId]: { exercises: { [id]: [bool, …] }, stretches: { [id]: bool }, warmup: bool,
//                         splits: { [id]: split }, at, stretchedAt, warmedAt, day } }  (when its first set was ticked /
//                         its last stretch / its warm-up; `day`: the day picked to log it on, if one was;
//                         a split is this week's lighter sets — see splitOf)
//     activities        { class | walk | rest: count }
//     stretchExtra      count of stretch sessions done on your own
//     stretchLog        [{ at, minutes }, …] — how long each of those was
//     cardio            [{ kind: 'walk' | 'other' | 'sport', minutes, hard, at, type? }, …] — one per session
//                       (type: what it was, as "Run" or "Pickleball")
//     classLog          [{ at, cardio, minutes, hard, strength, areas, stretch, stretchMinutes }, …] — one per class
//     restLog           [at | null, …] — the day of each rest day (null: added before days were saved)

function lowReps(repsStr) {
  const n = parseInt(String(repsStr).split('–')[0])
  return isNaN(n) ? 0 : n
}

// ── Pure state helpers ─────────────────────────────────────────────────────
// These take the raw state so both readers and writers (inside the setState
// updater) agree on derived values without a stale closure.

// How an exercise is set up — the same questions for every exercise:
//   mode    – sets counted in reps, or held for a number of seconds
//   perSide – done on each side (a hold's timer runs once per side)
//   restOn  – start a rest countdown after each ticked set, of `rest` seconds
//             (off until you turn it on; then it starts by itself after every set)
export function setupOf(s, exercise) {
  const saved = s.setup?.[exercise.id]
  return {
    mode: saved?.mode ?? (exercise.isTime ? 'hold' : 'reps'),
    perSide: saved?.perSide ?? !!exercise.perSide,
    restOn: saved?.restOn ?? false,
    rest: saved?.rest ?? (COMPOUND_LIFTS.has(exercise.id) || exercise.compound ? REST_COMPOUND : REST_ACCESSORY),
  }
}

// Your numbers for an exercise, falling back to the program's starting values
// until you change them. Reps and hold seconds are remembered separately, so
// switching modes never loses either; `reps` here is whichever is active.
export function settingsOf(s, exercise) {
  const saved = s.exerciseSettings?.[exercise.id]
  const hold = setupOf(s, exercise).mode === 'hold'
  const key = hold ? 'holds' : 'reps'
  const fallback = hold ? (exercise.durationSeconds ?? 30) : (exercise.isTime ? 10 : lowReps(exercise.reps))
  return {
    key,
    bar: saved?.bar ?? exercise.weight.bar,
    weight: saved?.weight ?? exercise.weight.value,
    reps: saved?.[key] ?? Array(exercise.sets).fill(fallback),
  }
}

// What an exercise is done with: your pick, else what the old Assist switch
// said (assisted with weight on it, bodyweight without), else the bank's.
export function equipmentOf(s, exercise) {
  const picked = s.equipment?.[exercise.id]
  if (picked) return picked
  const assist = s.assist?.[exercise.id]
  if (assist) return settingsOf(s, exercise).weight > 0 ? 'assisted' : 'bodyweight'
  const fallback = defaultEquipment(exercise)
  return assist === false && fallback === 'assisted' ? 'bodyweight' : fallback
}

// Which sets of an exercise are ticked — one entry per remembered set.
function ticksOf(s, workoutId, exercise) {
  const n = settingsOf(s, exercise).reps.length
  const ticked = s.checks?.[workoutId]?.exercises?.[exercise.id] ?? []
  return Array.from({ length: n }, (_, i) => !!ticked[i])
}

// This week's split of an exercise, or null: the main sets it kept (`kept`,
// by place, out of the `count` it had when split; sets added later show too)
// and lighter cards below it, each { weight, reps: [n, …], ticks: [bool, …] }.
// It lives with the week's ticks, so it's gone next week.
export function splitOf(s, workoutId, exercise) {
  return s.checks?.[workoutId]?.splits?.[exercise.id] ?? null
}

// Every set of an exercise this week: the main card's (its weight, your
// reps) then each split card's. `part` is -1 on the main card, else the split
// card's place; `index` is the set's place in its own list.
export function weekSetsOf(s, workoutId, exercise) {
  const { weight, reps } = settingsOf(s, exercise)
  const ticks = ticksOf(s, workoutId, exercise)
  const split = splitOf(s, workoutId, exercise)
  const main = reps
    .map((r, i) => ({ reps: r, done: ticks[i], weight, part: -1, index: i }))
    .filter(x => !split || x.index >= split.count || split.kept.includes(x.index))
  const parts = (split?.parts ?? []).flatMap((p, j) => p.reps.map((r, i) => ({ reps: r, done: !!p.ticks[i], weight: p.weight, part: j, index: i })))
  return [...main, ...parts]
}

export function writeSplit(s, workoutId, exercise, fn) {
  return writeChecks(s, workoutId, cur => {
    const next = fn(cur.splits?.[exercise.id] ?? null, cur)
    const splits = { ...cur.splits }
    if (next) splits[exercise.id] = next
    else delete splits[exercise.id]
    return { ...cur, splits }
  })
}

// Writes an exercise's numbers back, putting the active list under its key.
export function writeSettings(s, exercise, fn) {
  const { key, reps, ...rest } = fn(settingsOf(s, exercise))
  const saved = s.exerciseSettings?.[exercise.id] ?? {}
  return {
    ...s,
    exerciseSettings: { ...s.exerciseSettings, [exercise.id]: { ...saved, ...rest, [key]: reps } },
  }
}

// Also stamps the day, for the week strip: `at` once a set is ticked (gone
// again if every set is unticked), `stretchedAt` once every stretch is.
export function writeChecks(s, workoutId, fn) {
  const next = fn(s.checks?.[workoutId] ?? {})
  // Ticks go on the plan's picked day, if one was picked.
  const now = next.day ?? s.clockAt ?? new Date().toISOString()
  const lifted = Object.values(next.exercises ?? {}).some(t => t.some(Boolean)) ||
    Object.values(next.splits ?? {}).some(x => x.parts.some(p => p.ticks.some(Boolean)))
  const list = stretchesOf(s, workoutId)
  const stretched = list.length > 0 && list.every(x => next.stretches?.[x.id])
  const { at, stretchedAt, warmedAt, ...rest } = next
  const stamped = {
    ...rest,
    ...(lifted && { at: at ?? now }),
    ...(stretched && { stretchedAt: stretchedAt ?? now }),
    ...(next.warmup && { warmedAt: warmedAt ?? now }),
  }
  return { ...s, checks: { ...s.checks, [workoutId]: stamped } }
}

// What was done on each day of this week, Sunday to Saturday, for the week
// strip: [{ kind, icon, label, tags? }, …] per day. A class's tags say what
// it was: cardio length and effort, the areas worked, stretching. Things logged before days were
// saved have no day, so they don't show.
export function dayLogOf(s, now = new Date(s.clockAt ?? Date.now())) {
  const items = []
  const add = (at, kind, icon, label, tags) => at && items.push({ at: new Date(at), kind, icon, label, tags })
  for (const id of PLAN_IDS) {
    add(s.checks?.[id]?.at, FULL_BODY_BY_ID[id] ? 'full' : 'plan', id, workouts[id].short)
    add(s.checks?.[id]?.stretchedAt, 'stretch', 'stretch', `Stretched · ${workouts[id].short}`)
    // A ticked warm-up is cardio; ones ticked before warm-ups kept their time
    // go on the plan's day.
    const warmup = warmupOf(s, id)
    if (warmup.on && s.checks?.[id]?.warmup) {
      const minutes = warmup.sets.reduce((n, x) => n + x.minutes, 0)
      add(s.checks[id].warmedAt ?? s.checks[id].at, 'cardio', 'cardio', `Warm-up · ${workouts[id].short} · ${minutes} min`)
    }
  }
  add(s.checks?.[STRETCH_ROUTINE.id]?.stretchedAt, 'stretch', 'stretch', STRETCH_ROUTINE.name)
  for (const c of COOL_DOWNS) add(s.checks?.[c.id]?.stretchedAt, 'stretch', 'stretch', `Cool Down · ${COOL_DOWN_BY_ID[c.id].label}`)
  for (const c of classesOf(s)) {
    const areas = c.strength ? c.areas ?? [] : []
    add(c.at, 'class', 'class', 'Class', [
      c.cardio && { kind: 'cardio', text: `${c.minutes} min ${c.hard ? 'hard' : 'easy'} cardio` },
      areas.length > 0 && { kind: 'strength', text: areas.length === CLASS_AREAS.length ? 'Full body' : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => a.label).join(' · ') },
      c.stretch && { kind: 'stretch', text: `Stretch${c.stretchMinutes ? ` ${c.stretchMinutes} min` : ''}` },
    ].filter(Boolean))
  }
  for (const x of s.cardio ?? []) {
    const length = `${x.minutes} min${x.hard ? ' hard' : ''}`
    if (x.kind === 'walk') add(x.at, 'walk', 'walk', `Walk · ${x.minutes} min`)
    else if (x.kind === 'sport') add(x.at, 'sport', 'sport', `${x.type ?? 'Sport'} · ${length}`)
    else add(x.at, 'cardio', 'cardio', `${x.type && x.type !== 'Other' ? x.type : 'Cardio'} · ${length}`)
  }
  for (const x of ownStretchesOf(s)) add(x.at, 'stretch', 'stretch', x.minutes ? `Stretched · ${x.minutes} min` : 'Stretched')
  for (const at of restDaysOf(s)) add(at, 'rest', 'rest', 'Rest day')
  items.sort((a, b) => a.at - b.at)
  return weekDays(now).map(day => items.filter(x => sameDay(x.at, day)).map(({ kind, icon, label, tags }) => ({ kind, icon, label, tags })))
}

export function writeTicks(s, workoutId, exercise, fn) {
  const next = fn(ticksOf(s, workoutId, exercise))
  return writeChecks(s, workoutId, cur => ({
    ...cur,
    exercises: { ...cur.exercises, [exercise.id]: next },
  }))
}

// An activity's count. Number() also reads a true/false from the earlier
// tick-only build as 1/0.
export function countOf(s, id) {
  return Number(s.activities?.[id]) || 0
}

// How long one class or walk is, and whether it's hard (vigorous) work.
export function cardioSettingOf(s, kind) {
  return { ...CARDIO_DEFAULTS[kind], ...s.cardioSettings?.[kind] }
}

// This week's classes with what you did in each. The class count is the
// source of truth; classes it has that the log doesn't (logged before the
// questions existed) count as the default: 45 hard minutes, full body.
export function classesOf(s) {
  const n = countOf(s, 'class')
  const log = (s.classLog ?? []).slice(0, n)
  return [...log, ...Array.from({ length: n - log.length }, () => CLASS_LEGACY)]
}

function lastClassOf(s) {
  return { ...CLASS_DEFAULT, ...s.lastClass }
}

// Where the Log a class sheet starts: everything off, with the last class's
// length and effort ready for when you turn cardio on.
export function newClassOf(s) {
  const { minutes, hard, stretchMinutes } = lastClassOf(s)
  return { ...CLASS_DEFAULT, minutes, hard, stretchMinutes }
}

// Every cardio session this week: each class with cardio, plus walks and
// other cardio. A walk is logged at its length when you tap +; any the
// count has that the log doesn't count at today's length.
export function cardioSessionsOf(s) {
  const logged = s.cardio ?? []
  const out = classesOf(s).filter(c => c.cardio).map(c => ({ kind: 'class', minutes: c.minutes, hard: c.hard }))
  out.push(...logged.filter(x => x.kind === 'other' || x.kind === 'sport'))
  const walks = logged.filter(x => x.kind === 'walk').slice(0, countOf(s, 'walk'))
  const missing = countOf(s, 'walk') - walks.length
  out.push(...walks, ...Array.from({ length: missing }, () => ({ kind: 'walk', ...cardioSettingOf(s, 'walk') })))
  // A gym plan's warm-up, once it's on and ticked.
  for (const id of PLAN_IDS) {
    const w = warmupOf(s, id)
    if (w.on && s.checks?.[id]?.warmup) out.push(...w.sets.map(x => ({ kind: 'warmup', ...x })))
  }
  return out
}

// A sport you typed in joins the choices for next time.
export function rememberSport(s, name) {
  const known = [...SPORTS, ...(s.sportNames ?? [])].some(x => x.toLowerCase() === name.toLowerCase())
  return known ? s : { ...s, sportNames: [...(s.sportNames ?? []), name] }
}

// A plan's warm-up: whether it's added, and its sets back to back (5 min easy
// then 5 hard, say). Older saves kept one length and effort.
const WARMUP_SET = { minutes: 5, hard: false }
export function warmupOf(s, workoutId) {
  const saved = s.warmups?.[workoutId]
  const sets = saved?.sets?.length ? saved.sets : [{ minutes: saved?.minutes ?? WARMUP_SET.minutes, hard: !!saved?.hard }]
  return { on: saved?.on ?? false, sets }
}

// Cardio minutes as the health guidelines count them: a hard minute counts
// as two easy ones. Split by kind for history, plus the total.
export function cardioWeekOf(s) {
  const by = { class: 0, walk: 0, other: 0, warmup: 0 }
  // Sports and hikes add to `other`, so saved weeks keep the same shape.
  for (const x of cardioSessionsOf(s)) by[x.kind === 'sport' ? 'other' : x.kind] += x.minutes * (x.hard ? 2 : 1)
  return { ...by, total: by.class + by.walk + by.other + by.warmup }
}

// A kind's logged sessions, in log order: walks (counting any logged before
// lengths were saved), or other cardio.
export function sessionsOfKind(s, kind) {
  return kind === 'walk' ? cardioSessionsOf(s).filter(x => x.kind === 'walk') : (s.cardio ?? []).filter(x => x.kind === kind)
}

// Writes a kind's sessions back; walks keep their count in step.
export function writeSessions(s, kind, list) {
  const next = { ...s, cardio: [...(s.cardio ?? []).filter(x => x.kind !== kind), ...list] }
  return kind === 'walk' ? { ...next, activities: { ...s.activities, walk: list.length } } : next
}

// Drops the latest logged session of a kind.
export function dropLastCardio(list, kind) {
  const i = list.findLastIndex(x => x.kind === kind)
  return i < 0 ? list : list.filter((_, j) => j !== i)
}

// A gym workout counts toward the week only once every set of every exercise
// is ticked. (The warm-up and stretches aren't required.)
function workoutComplete(s, workoutId) {
  const list = exercisesOf(s, workoutId)
  return list.length > 0 && list.every(ex => weekSetsOf(s, workoutId, ex).every(x => x.done))
}

// A plan's exercises come in two lists, each picked from the exercise bank:
//   main – what the plan is for; only exercises that fit it (see fitsPlan)
//   core – its Core section at the end, shown while that's switched on
// Saved under `order` and `coreLists`. Earlier saves kept core exercises in
// `order`; they're read as the Core section until it's edited.
const LIST_KEY = { main: 'order', core: 'coreLists' }

function defaultIds(workoutId) {
  return (workouts[workoutId]?.exercises ?? []).map(e => e.id)
}

export function listIds(s, workoutId, section) {
  const saved = section === 'core'
    ? s.coreLists?.[workoutId] ?? (s.order?.[workoutId]?.some(id => EXERCISE_BY_ID[id] && isCore(EXERCISE_BY_ID[id])) ? s.order[workoutId] : DEFAULT_CORE[workoutId] ?? [])
    : s.order?.[workoutId] ?? defaultIds(workoutId)
  const keep = id => {
    const ex = EXERCISE_BY_ID[id]
    return ex && (section === 'core' ? isCore(ex) : fitsPlan(ex, workoutId))
  }
  const ids = saved.filter(keep)
  return section === 'main' && ids.length === 0 ? defaultIds(workoutId).filter(keep) : ids
}

export function coreOnOf(s, workoutId) {
  return s.coreOn?.[workoutId] ?? CORE_ON_BY_DEFAULT[workoutId] ?? false
}

// The plan's exercises as you do them: the main list, then Core if it's on.
function exerciseIdsOf(s, workoutId) {
  return [...listIds(s, workoutId, 'main'), ...(coreOnOf(s, workoutId) ? listIds(s, workoutId, 'core') : [])]
}

export function exercisesOf(s, workoutId) {
  return exerciseIdsOf(s, workoutId).map(id => EXERCISE_BY_ID[id])
}

// Which list an exercise in a plan sits in.
export function sectionOf(exercise) {
  return isCore(exercise) ? 'core' : 'main'
}

// Drops ticks on exercises that are no longer in either of a plan's lists.
function pruneTicks(s, workoutId) {
  const inPlan = new Set([...listIds(s, workoutId, 'main'), ...listIds(s, workoutId, 'core')])
  const ticks = s.checks?.[workoutId]?.exercises ?? {}
  const kept = Object.fromEntries(Object.entries(ticks).filter(([id]) => inPlan.has(id)))
  const splits = Object.fromEntries(Object.entries(s.checks?.[workoutId]?.splits ?? {}).filter(([id]) => inPlan.has(id)))
  return writeChecks(s, workoutId, cur => ({ ...cur, exercises: kept, splits }))
}

// Writing the main list also pins the Core section as it is, so Core isn't
// read from the new main list (where older saves kept it).
export function writeList(s, workoutId, section, ids) {
  const key = LIST_KEY[section]
  const pinned = section === 'main' && !s.coreLists?.[workoutId]
    ? { coreLists: { ...s.coreLists, [workoutId]: listIds(s, workoutId, 'core') } }
    : {}
  return pruneTicks({ ...s, ...pinned, [key]: { ...s[key], [workoutId]: ids } }, workoutId)
}

// What a week is made of: finished gym workouts, classes that count as
// workouts (see classIsWorkout), each walk and rest logged, and other cardio
// sessions long enough to count as workouts.
export function weekOf(s) {
  return {
    gym: PLAN_IDS.filter(id => workoutComplete(s, id)).length,
    ...Object.fromEntries(activities.map(a => [a.id, countOf(s, a.id)])),
    class: classesOf(s).filter(classIsWorkout).length,
    cardio: (s.cardio ?? []).filter(x => (x.kind === 'other' || x.kind === 'sport') && cardioIsWorkout(x)).length,
    stretchWork: stretchWorkoutsOf(s),
  }
}

// Your stretch sessions on your own this week. The count is the source of
// truth; sessions logged before lengths were asked have no minutes.
// This week's rest days, oldest first: each one's day, or null for ones
// added before rest days had days.
export function restDaysOf(s) {
  const n = countOf(s, 'rest')
  const log = (s.restLog ?? []).slice(-n)
  return [...Array(Math.max(0, n - log.length)).fill(null), ...log]
}

export function ownStretchesOf(s) {
  const n = Number(s.stretchExtra) || 0
  const log = (s.stretchLog ?? []).slice(0, n)
  return [...log, ...Array.from({ length: n - log.length }, () => ({ minutes: null }))]
}

// A list's stretches — a gym workout's or the Full Body Stretch — as you've
// set them up from the stretch bank, or its starting stretches.
// Only stretches that fit the list count (see stretchFits); if none of a saved
// list does, it falls back to the starting stretches.
export function stretchesOf(s, listId) {
  const pick = ids => ids.map(id => STRETCH_BY_ID[id]).filter(x => x && stretchFits(x, listId))
  const saved = pick(s.stretchLists?.[listId] ?? [])
  return saved.length ? saved : pick(defaultStretchIds(listId))
}

// Writes a list's stretch ids, dropping the tick of any stretch that left it.
export function writeStretchList(s, listId, ids) {
  const ticks = s.checks?.[listId]?.stretches ?? {}
  const kept = Object.fromEntries(Object.entries(ticks).filter(([id]) => ids.includes(id)))
  return writeChecks({ ...s, stretchLists: { ...s.stretchLists, [listId]: ids } }, listId, cur => ({ ...cur, stretches: kept }))
}

// How long a stretch list takes with your settings: every hold (both sides
// where it's per side), every set, and the rests between sets.
export function routineSecondsOf(s, listId = STRETCH_ROUTINE.id) {
  return stretchesOf(s, listId).reduce((sum, x) => {
    const sets = s.stretchSets?.[x.id] ?? 1
    const hold = (s.customDurations?.[x.id] ?? x.duration) * ((s.perSide?.[x.id] ?? x.perSide) ? 2 : 1)
    return sum + hold * sets + (s.stretchRest?.[x.id] ?? 20) * (sets - 1)
  }, 0)
}

const longEnough = minutes => minutes >= STRETCH_WORKOUT_MINUTES

// Stretching that counts as a workout: the Full Body Stretch, finished, if
// it runs 30+ minutes, and each 30+ minute session on your own.
function stretchWorkoutsOf(s) {
  const routineDone = stretchesOf(s, STRETCH_ROUTINE.id).every(x => s.checks?.[STRETCH_ROUTINE.id]?.stretches?.[x.id])
  const routine = routineDone && longEnough(Math.round(routineSecondsOf(s) / 60)) ? 1 : 0
  return routine + ownStretchesOf(s).filter(x => x.minutes !== null && longEnough(x.minutes)).length
}

// Stretch days: each gym workout whose stretches are all ticked, the
// full-body routine and each cool-down once all ticked, and stretches done
// on your own.
export function stretchWeekOf(s) {
  const all = (id, list) => list.length > 0 && list.every(x => s.checks?.[id]?.stretches?.[x.id])
  const st = {
    gym: PLAN_IDS.filter(id => all(id, stretchesOf(s, id))).length,
    routine: all(STRETCH_ROUTINE.id, stretchesOf(s, STRETCH_ROUTINE.id)) ? 1 : 0,
    cool: COOL_DOWNS.filter(c => all(c.id, stretchesOf(s, c.id))).length,
    class: classesOf(s).filter(c => c.stretch).length,
    extra: Number(s.stretchExtra) || 0,
  }
  return { ...st, total: st.gym + st.routine + st.cool + st.class + st.extra }
}

// How timers sound and count in. `sound`: 'music' mixes beeps over other
// audio (but the ringer switch mutes them on the speaker); 'silent' plays
// through the ringer switch but can't play over music. `prep`: seconds to get
// into position before a hold or stretch starts (0: none).
const TIMER_DEFAULTS = { sound: 'music', prep: 3 }

export function timerOf(s) {
  return { ...TIMER_DEFAULTS, ...s.timer }
}

// Your weekly goals, falling back to the defaults.
export function goalsOf(s) {
  return Object.fromEntries(Object.entries(GOAL_DEFAULTS).map(([k, d]) => [k, { ...d, ...s.goals?.[k] }]))
}
