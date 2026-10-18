import { workouts, activities, PLAN_IDS, FULL_BODY, FULL_BODY_BY_ID, SPORTS, STRETCH_ROUTINE, COOL_DOWNS, COOL_DOWN_BY_ID, CLASS_AREAS, COMPOUND_LIFTS, REST_COMPOUND, REST_ACCESSORY, CARDIO_DEFAULTS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES, CLASS_DEFAULT, CLASS_LEGACY, GOAL_DEFAULTS } from '../data/workout'
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
//     timer             { sound: 'music' | 'silent', prep: seconds, volume: 0–100 }  (see timerOf)
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
//     sessionLog        [{ id, at, done, total, stretched, stretches, warmup, minutes?, checks }, …] — finished
//                       full-body days, Full Body Stretches and cool-downs filed away to do them again, each
//                       with its ticks as they were (`checks`) so it can be opened again (see fileSession)

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
  const add = (at, item) => at && items.push({ at: new Date(at), tags: [], ...item })
  const effort = sets => (sets.every(x => x.hard) ? ' hard' : sets.every(x => !x.hard) ? ' easy' : '')
  for (const id of PLAN_IDS) {
    const c = s.checks?.[id]
    let done = 0, total = 0
    for (const ex of exercisesOf(s, id)) {
      const sets = weekSetsOf(s, id, ex)
      total += sets.length
      done += sets.filter(x => x.done).length
    }
    add(c?.at, { kind: FULL_BODY_BY_ID[id] ? 'full' : 'plan', plan: id, icon: FULL_BODY_BY_ID[id] ? 'fullBody' : id, label: workouts[id].short, detail: `${done}/${total} sets${total && done >= total ? ' · finished' : ''}` })
    // Its stretches and warm-up go under it on its day (see below). A warm-up
    // ticked before warm-ups kept their time goes on the plan's day.
    const n = stretchesOf(s, id).length
    add(c?.stretchedAt, { kind: 'stretch', icon: 'stretch', label: 'Stretches', detail: workouts[id].short, of: id, tag: { kind: 'stretch', text: `Stretches · ${n}/${n}` } })
    const warmup = warmupOf(s, id)
    if (warmup.on && c?.warmup) {
      const minutes = warmup.sets.reduce((m, x) => m + x.minutes, 0)
      add(c.warmedAt ?? c.at, { kind: 'cardio', icon: 'cardio', label: 'Warm-up', detail: `${minutes} min · ${workouts[id].short}`, of: id, tag: { kind: 'cardio', text: `Warm-up · ${minutes} min${effort(warmup.sets)}` } })
    }
  }
  add(s.checks?.[STRETCH_ROUTINE.id]?.stretchedAt, { kind: 'stretch', icon: 'stretch', label: STRETCH_ROUTINE.name, detail: `${stretchesOf(s, STRETCH_ROUTINE.id).length} stretches` })
  // Sessions filed to do them again, each on its own day with what it had.
  for (const x of sessionsOf(s)) {
    if (x.id === STRETCH_ROUTINE.id || COOL_DOWN_BY_ID[x.id]) {
      add(x.at, { kind: 'stretch', icon: 'stretch', label: COOL_DOWN_BY_ID[x.id] ? `Cool Down · ${COOL_DOWN_BY_ID[x.id].label}` : STRETCH_ROUTINE.name, detail: x.stretched < x.stretches ? `${x.stretched}/${x.stretches} stretches` : `${x.stretches} stretches` })
      continue
    }
    const minutes = (x.warmup ?? []).reduce((m, w) => m + w.minutes, 0)
    add(x.at, { kind: 'full', icon: 'fullBody', label: workouts[x.id].short, detail: `${x.done}/${x.total} sets${sessionCounts(x) ? ' · finished' : ''}`, tags: [
      x.stretches > 0 && x.stretched === x.stretches && { kind: 'stretch', text: `Stretches · ${x.stretched}/${x.stretches}` },
      minutes > 0 && { kind: 'cardio', text: `Warm-up · ${minutes} min${effort(x.warmup)}` },
    ].filter(Boolean) })
  }
  for (const c of COOL_DOWNS) add(s.checks?.[c.id]?.stretchedAt, { kind: 'stretch', icon: 'stretch', label: `Cool Down · ${COOL_DOWN_BY_ID[c.id].label}`, detail: `${stretchesOf(s, c.id).length} stretches` })
  // A class lists what it was, a short line for each part.
  for (const c of classesOf(s)) {
    const areas = c.strength ? c.areas ?? [] : []
    add(c.at, { kind: 'class', icon: 'class', label: 'Class', tags: [
      c.cardio && { kind: 'cardio', text: `Cardio · ${c.minutes} min ${c.hard ? 'hard' : 'easy'}` },
      areas.length > 0 && { kind: 'strength', text: `Strength · ${areas.length === CLASS_AREAS.length ? 'full body' : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => (a.id === 'core' ? 'core' : `${a.label.toLowerCase()} body`)).join(' & ')}` },
      c.stretch && { kind: 'stretch', text: `Stretch${c.stretchMinutes ? ` · ${c.stretchMinutes} min` : ''}` },
    ].filter(Boolean) })
  }
  for (const x of s.cardio ?? []) {
    const length = `${x.minutes} min${x.hard ? ' hard' : ''}`
    if (x.kind === 'walk') add(x.at, { kind: 'walk', icon: 'walk', label: 'Walk', detail: length })
    else if (x.kind === 'sport') add(x.at, { kind: 'sport', icon: 'sport', label: x.type ?? 'Sport', detail: length })
    else add(x.at, { kind: 'cardio', icon: 'cardio', label: x.type && x.type !== 'Other' ? x.type : 'Cardio', detail: length })
  }
  for (const x of ownStretchesOf(s)) add(x.at, { kind: 'stretch', icon: 'stretch', label: 'Stretching', detail: x.minutes ? `${x.minutes} min` : undefined })
  for (const at of restDaysOf(s)) add(at, { kind: 'rest', icon: 'rest', label: 'Rest day' })
  items.sort((a, b) => a.at - b.at)
  return weekDays(now).map(day => {
    const list = items.filter(x => sameDay(x.at, day))
    // A plan's warm-up and stretches sit under it when it's the same day.
    const kept = list.filter(x => {
      const plan = x.of && list.find(p => p.plan === x.of)
      if (plan) plan.tags = [...plan.tags, x.tag]
      return !plan
    })
    return kept.map(({ kind, icon, label, detail, tags }) => ({ kind, icon, label, detail, tags }))
  })
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
  for (const x of sessionsOf(s)) out.push(...(x.warmup ?? []).map(w => ({ kind: 'warmup', ...w })))
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
    gym: PLAN_IDS.filter(id => workoutComplete(s, id)).length + sessionsOf(s).filter(x => !stretchList(x.id) && sessionCounts(x)).length,
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
  const filed = sessionsOf(s).filter(x => x.id === STRETCH_ROUTINE.id && sessionCounts(x)).length
  return routine + filed + ownStretchesOf(s).filter(x => x.minutes !== null && longEnough(x.minutes)).length
}

// Stretch days: each gym workout whose stretches are all ticked, the
// full-body routine and each cool-down once all ticked, a class with
// stretching, and stretches done on your own. The goal counts days, so more
// than one on a day counts once (`total`); the rest say what each one was.
// Something with no day (saved before days were kept) counts on its own.
export function stretchWeekOf(s) {
  const all = id => { const list = stretchesOf(s, id); return list.length > 0 && list.every(x => s.checks?.[id]?.stretches?.[x.id]) }
  const at = id => s.checks?.[id]?.stretchedAt ?? s.checks?.[id]?.at
  const filed = sessionsOf(s).filter(x => x.stretches > 0 && x.stretched === x.stretches)
  const done = {
    gym: [...PLAN_IDS.filter(all).map(at), ...filed.filter(x => !stretchList(x.id)).map(x => x.at)],
    routine: [...(all(STRETCH_ROUTINE.id) ? [at(STRETCH_ROUTINE.id)] : []), ...filed.filter(x => x.id === STRETCH_ROUTINE.id).map(x => x.at)],
    cool: [...COOL_DOWNS.filter(c => all(c.id)).map(c => at(c.id)), ...filed.filter(x => COOL_DOWN_BY_ID[x.id]).map(x => x.at)],
    class: classesOf(s).filter(c => c.stretch).map(c => c.at),
    extra: ownStretchesOf(s).map(x => x.at),
  }
  const ats = Object.values(done).flat()
  const days = new Set(ats.filter(Boolean).map(x => new Date(x).toDateString()))
  return { ...Object.fromEntries(Object.entries(done).map(([k, v]) => [k, v.length])), total: days.size + ats.filter(x => !x).length }
}

// How timers sound and count in. `sound`: 'music' mixes beeps over other
// audio (but the ringer switch mutes them on the speaker); 'silent' plays
// through the ringer switch but can't play over music. `prep`: seconds to get
// into position before a hold or stretch starts (0: none).
const TIMER_DEFAULTS = { sound: 'music', prep: 3, volume: 100 }

export function timerOf(s) {
  return { ...TIMER_DEFAULTS, ...s.timer }
}

// Your weekly goals, falling back to the defaults.
export function goalsOf(s) {
  return Object.fromEntries(Object.entries(GOAL_DEFAULTS).map(([k, d]) => [k, { ...d, ...s.goals?.[k] }]))
}

// ── Doing it again ─────────────────────────────────────────────────────────
// A full-body day, the Full Body Stretch or a cool-down can be done more than
// once a week.
// The one under way keeps its ticks in `checks`, like a plan. Starting it
// again once it's finished files that one in `sessionLog` as it stood and
// clears its ticks; your weights and lists stay as they are.
export const REPEATABLE = new Set([...FULL_BODY.map(p => p.id), STRETCH_ROUTINE.id, ...COOL_DOWNS.map(c => c.id)])

// The Full Body Stretch and the cool-downs: lists of stretches, no sets.
const stretchList = id => id === STRETCH_ROUTINE.id || !!COOL_DOWN_BY_ID[id]

export function sessionsOf(s) {
  return s.sessionLog ?? []
}

// Whether a filed session counted as a workout: a full-body day with every
// set done, or a Full Body Stretch of 30+ minutes. A cool-down never does.
export function sessionCounts(x) {
  if (COOL_DOWN_BY_ID[x.id]) return false
  return x.id === STRETCH_ROUTINE.id ? x.stretched === x.stretches && longEnough(x.minutes ?? 0) : x.total > 0 && x.done >= x.total
}

// Whether the one under way is finished: every set ticked (a full-body day)
// or every stretch (the Full Body Stretch, a cool-down).
export function finishedOf(s, id) {
  if (!stretchList(id)) return workoutComplete(s, id)
  const list = stretchesOf(s, id)
  return list.length > 0 && list.every(x => s.checks?.[id]?.stretches?.[x.id])
}

// The one under way, as it would be filed.
export function sessionOf(s, id) {
  const c = s.checks?.[id] ?? {}
  const list = stretchesOf(s, id)
  const stretched = list.filter(x => c.stretches?.[x.id]).length
  if (stretchList(id)) {
    return { id, at: c.stretchedAt ?? s.clockAt ?? new Date().toISOString(), stretched, stretches: list.length, minutes: Math.round(routineSecondsOf(s, id) / 60), checks: c }
  }
  let done = 0, total = 0
  for (const ex of exercisesOf(s, id)) {
    const sets = weekSetsOf(s, id, ex)
    total += sets.length
    done += sets.filter(x => x.done).length
  }
  const w = warmupOf(s, id)
  return { id, at: c.at ?? s.clockAt ?? new Date().toISOString(), done, total, stretched, stretches: list.length, warmup: w.on && c.warmup ? w.sets : null, checks: c }
}

// Files the finished one away and clears its ticks for the next. Anything
// not finished is left as it is.
export function fileSession(s, id) {
  if (!REPEATABLE.has(id) || !finishedOf(s, id)) return s
  const checks = { ...s.checks }
  delete checks[id]
  return { ...s, sessionLog: [...sessionsOf(s), sessionOf(s, id)], checks }
}

// Ends the one under way before it's finished: it's filed as it stands, on
// its day, and a fresh one starts. It counts only as far as it got (see
// sessionCounts). Nothing ticked yet: nothing to end.
export function endSession(s, id) {
  if (!REPEATABLE.has(id)) return s
  const x = sessionOf(s, id)
  if (!((x.done ?? 0) > 0 || x.stretched > 0)) return s
  const checks = { ...s.checks }
  delete checks[id]
  return { ...s, sessionLog: [...sessionsOf(s), x], checks }
}

// Whether a filed session can be opened again: 'ok', or 'busy' while
// another of the same is under way and not finished.
export function reopenOf(s, index) {
  const x = sessionsOf(s)[index]
  if (!x) return 'busy'
  const now = sessionOf(s, x.id)
  const started = (now.done ?? 0) > 0 || now.stretched > 0
  return started && !finishedOf(s, x.id) ? 'busy' : 'ok'
}

// A filed session's ticks: as they were, or, for one filed before sessions
// kept them, worked out from its counts (every set, since it was finished,
// and that many stretches from the top of the list).
function ticksOfSession(s, x) {
  if (x.checks) return x.checks
  const stretches = Object.fromEntries(stretchesOf(s, x.id).slice(0, x.stretched).map(y => [y.id, true]))
  if (stretchList(x.id)) return { stretches, stretchedAt: x.at }
  const exercises = Object.fromEntries(exercisesOf(s, x.id).map(ex => [ex.id, settingsOf(s, ex).reps.map(() => true)]))
  return { exercises, stretches, at: x.at, ...(x.stretched === x.stretches && x.stretches > 0 && { stretchedAt: x.at }) }
}

// Opens a filed session again with its ticks as they were. A finished one
// of the same in its place is filed first, so nothing is lost.
export function reopenSession(s, index) {
  if (reopenOf(s, index) !== 'ok') return s
  const x = sessionsOf(s)[index]
  const filed = fileSession(s, x.id)
  return {
    ...filed,
    sessionLog: sessionsOf(filed).filter((_, i) => i !== index),
    checks: { ...filed.checks, [x.id]: ticksOfSession(s, x) },
  }
}
