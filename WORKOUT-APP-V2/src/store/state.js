import { workouts, GYM_ORDER, activities, PLAN_IDS, FULL_BODY, FULL_BODY_BY_ID, TARGETED, SPORTS, STRETCH_ROUTINE, COOL_DOWNS, COOL_DOWN_BY_ID, CLASS_AREAS, REST_DEFAULT, CARDIO_DEFAULTS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES, CLASS_DEFAULT, CLASS_LEGACY, GOAL_DEFAULTS, GOAL_SETTINGS } from '../data/workout'
import { STRETCH_BY_ID, defaultStretchIds } from '../data/stretches'
import { weekDays, sameDay } from '../utils/days'
import { cardioMinutes } from '../utils/format'
import { EXERCISE_BY_ID, fitsPlan, isCore, CORE_ON_BY_DEFAULT, DEFAULT_CORE, PLAN_EXTRAS, defaultEquipment } from '../data/exercises'
import { buildTargeted, targetName } from '../data/targeted'

// The app's state, and small functions that read or change it. useStore.js
// builds the store on top of these; weeks.js files past weeks.
//
// State is split into what you've set and what you've done:
//
//   Remembered — never cleared:
//     exerciseSettings  { [exerciseId]: { bar, weight, reps: [n, …], holds: [seconds, …] } }
//     setup             { [exerciseId]: { mode: 'reps' | 'hold', perSide, restOn, rest } }
//     warmups           { [workoutId]: { on, sets: [{ minutes, hard }, …] } }  (a ticked warm-up counts as cardio; cleared each week)
//     order             { [workoutId]: [exerciseId, …] }  (a plan's exercises, in order, from the bank)
//     coreLists         { [workoutId]: [exerciseId, …] }  (its Core section)
//     coreOn            { [workoutId]: bool }              (whether the Core section is on)
//     stretchLists      { [workoutId | 'routine']: [stretchId, …] }  (your stretches, from the bank)
//     equipment         { [exerciseId]: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'assisted' }
//     assist            { [exerciseId]: bool }  (kept in step with equipment; older saves only have this)
//     customDurations   { [stretchId]: seconds }
//     perSide           { [stretchId]: bool }
//     stretchSets       { [stretchId]: count }  (rounds of a stretch, default 1 or its list's)
//     stretchRest       { [stretchId]: seconds } (rest between those rounds, default 20 or its list's)
//     cardioSettings    { walk | other | sport: { minutes, hard, type? } }  (where the next one starts)
//     sportNames        [name, …]  (sports you typed in, offered next to SPORTS)
//     lastClass         your answers for the last class logged (its length and effort carry over)
//     lastBackupAt      ISO time of the last backup file you saved
//     history           [weekSummary, …] newest first — saved by each reset, never cleared
//     lastResetAt       ISO time of the last reset (the start of the current week)
//     restFilledTo      "YYYY-MM-DD" of the last day checked for a rest day (see fillRestDays)
//     targeted          { areas: [areaId, …], eq: 'gym' | 'db' | 'none' } — the targeted workout picked last
//                       (its exercises and stretches are its lists, like a plan's; see startTargeted)
//     goals             { workouts | stretch | cardio: { min, max } }  (your weekly goals; defaults in GOAL_DEFAULTS)
//     newWeek           { weekStart } while the "new week" note is showing
//     timer             { sound: 'music' | 'silent', prep: seconds, volume: 0–100 }  (see timerOf)
//     seenNotes         [id, …]  (notifications you've seen; the bell's dot is for the rest)
//     dismissedNotes    [id, …]  (ones you cleared with ✕; they don't show again)
//
//   Checkmarks — cleared by the header reset:
//     checks            { [workoutId]: { exercises: { [id]: [bool, …] }, stretches: { [id]: bool }, warmup: bool,
//                         splits: { [id]: split }, at, stretchStartAt, stretchedAt, warmedAt, openedAt, day } }
//                         (when its first set was ticked / its first stretch / its last stretch / its warm-up /
//                         it was begun from Build a Workout; `day`: the day picked to log it on, if one was;
//                         a split is this week's lighter sets — see splitOf)
//     activities        { class | walk | rest: count }
//     stretchExtra      count of stretch sessions done on your own
//     stretchLog        [{ at, minutes }, …] — how long each of those was
//     cardio            [{ kind: 'walk' | 'other' | 'sport', minutes, hard, at, type? }, …] — one per session
//                       (type: what it was, as "Run" or "Pickleball")
//     classLog          [{ at, cardio, minutes, hard, strength, areas, stretch, stretchMinutes }, …] — one per class
//     restLog           [at | null, …] — the day of each rest day (null: added before days were saved)
//     weekOnly          { order | coreLists | coreOn | stretchLists: { [workoutId]: … } } — a plan's
//                       lists and Core as changed for just this week, read over the remembered ones
//                       (see planOf)
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
    rest: saved?.rest ?? REST_DEFAULT,
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
// again if every set is unticked), `stretchStartAt` once a stretch is,
// `stretchedAt` once every stretch is, `warmedAt` once the warm-up is (all on
// the workout's day once it has one).
export function writeChecks(s, workoutId, fn) {
  const next = fn(s.checks?.[workoutId] ?? {})
  // Ticks go on the plan's picked day, if one was picked.
  const now = next.day ?? s.clockAt ?? new Date().toISOString()
  const lifted = Object.values(next.exercises ?? {}).some(t => t.some(Boolean)) ||
    Object.values(next.splits ?? {}).some(x => x.parts.some(p => p.ticks.some(Boolean)))
  const list = stretchesOf(s, workoutId)
  const stretched = list.length > 0 && list.every(x => next.stretches?.[x.id])
  const begun = list.some(x => next.stretches?.[x.id])
  const { at, stretchedAt, stretchStartAt, warmedAt, ...rest } = next
  // A plan's stretches and warm-up go on its workout's day, even if done
  // another day.
  const day = lifted ? at ?? now : null
  const stamped = {
    ...rest,
    ...(lifted && { at: day }),
    ...(begun && { stretchStartAt: day ?? stretchStartAt ?? now }),
    ...(stretched && { stretchedAt: day ?? stretchedAt ?? now }),
    ...(next.warmup && { warmedAt: day ?? warmedAt ?? now }),
  }
  return { ...s, checks: { ...s.checks, [workoutId]: stamped } }
}

// What was done on each day of this week, Sunday to Saturday, for the week
// strip: [{ kind, icon, label, tags? }, …] per day. A class's tags say what
// it was: cardio length and effort, the areas worked, stretching. Things logged before days were
// saved have no day, so they don't show.
// What a plan, or a filed session of one, is called: a targeted workout by
// the areas it worked ("Chest & Glutes").
export function planName(s, id, session) {
  if (id !== TARGETED.id) return workouts[id].short
  const areas = (session?.targeted ?? s.targeted)?.areas ?? []
  return areas.length ? targetName(areas) : TARGETED.short
}

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
    const anyDay = FULL_BODY_BY_ID[id] || id === TARGETED.id
    add(c?.at, { kind: anyDay ? 'full' : 'plan', plan: id, icon: anyDay ? 'fullBody' : id, label: planName(s, id), detail: `${done}/${total} sets${total && done >= total ? ' · finished' : ''}` })
    // Its stretches and warm-up go under it on its day (see below). A warm-up
    // ticked before warm-ups kept their time goes on the plan's day.
    const n = stretchesOf(s, id).length
    add(c?.stretchedAt, { kind: 'stretch', icon: 'stretch', label: 'Stretches', detail: planName(s, id), of: id, tag: { kind: 'stretch', text: `Stretches · ${n}/${n}` } })
    const warmup = warmupOf(s, id)
    if (warmup.on && c?.warmup) {
      const minutes = warmup.sets.reduce((m, x) => m + x.minutes, 0)
      add(c.warmedAt ?? c.at, { kind: 'cardio', icon: 'cardio', label: 'Warm-up', detail: `${minutes} min · ${planName(s, id)}`, of: id, tag: { kind: 'cardio', text: `Warm-up · ${minutes} min${effort(warmup.sets)}` } })
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
    add(x.at, { kind: 'full', icon: 'fullBody', label: planName(s, x.id, x), detail: `${x.done}/${x.total} sets${sessionCounts(x) ? ' · finished' : ''}`, tags: [
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

// A day by tab, for the day pop-up: { gym, stretch, cardio, rest }, each a
// list of lines { name, right, status, workout, at }. `status` is 'done',
// 'early' (ended before it was finished) or 'open' (started, not finished);
// `workout` marks what counted toward your workouts goal (a class's goes on
// its strength line, or else its cardio or stretch). A plan's or a session's
// stretches and warm-up go in their own tabs, named after it.
export function dayLinesOf(s, now = new Date(s.clockAt ?? Date.now())) {
  const lines = { gym: [], stretch: [], cardio: [], rest: [] }
  const add = (tab, at, line) => at && lines[tab].push({ at: new Date(at), workout: false, ...line })
  // Cardio gives its time, and what it counts as when any was hard.
  // `edit`: what tapping the line does, { open: workoutId } or { menu: kind,
  // index } (see Home).
  const cardio = (at, name, list, workout = false, edit) => {
    const minutes = list.reduce((m, x) => m + x.minutes, 0)
    const counted = list.reduce((m, x) => m + x.minutes * (x.hard ? 2 : 1), 0)
    if (minutes > 0) add('cardio', at, { name, right: cardioMinutes(list), status: 'done', minutes, counted, workout, edit })
  }
  const warmup = (at, name, sets, edit) => cardio(at, `${name} · Warm-up`, sets, false, edit)
  // A list's stretches: done once all are ticked, in progress from the first.
  const stretching = (id, name, more = {}) => {
    const c = s.checks?.[id]
    const list = stretchesOf(s, id)
    const k = list.filter(x => c?.stretches?.[x.id]).length
    add('stretch', c?.stretchedAt ?? c?.stretchStartAt, { name, right: `${k}/${list.length}`, status: c?.stretchedAt ? 'done' : beforeToday(s, c?.stretchStartAt) ? 'early' : 'open', edit: { open: id }, ...(c?.stretchedAt && more) })
  }
  const FULL = 'Full Body Workout'
  for (const id of PLAN_IDS) {
    const c = s.checks?.[id]
    const name = FULL_BODY_BY_ID[id] ? FULL : planName(s, id)
    let done = 0, total = 0
    for (const ex of exercisesOf(s, id)) {
      const sets = weekSetsOf(s, id, ex)
      total += sets.length
      done += sets.filter(x => x.done).length
    }
    const complete = total > 0 && done >= total
    // One begun from Build a Workout shows from then on, ticked or not.
    add('gym', c?.at ?? c?.openedAt, { name, right: `${done}/${total} sets`, status: complete ? 'done' : planEndedOf(s, id) ? 'early' : 'open', workout: complete, edit: { open: id } })
    stretching(id, `${name} · Stretches`)
    const w = warmupOf(s, id)
    if (w.on && c?.warmup) warmup(c.warmedAt ?? c.at, name, w.sets, { open: id })
  }
  // The Full Body Stretch counts as a workout at 30+ minutes; a cool-down never.
  stretching(STRETCH_ROUTINE.id, STRETCH_ROUTINE.name, { workout: longEnough(Math.round(routineSecondsOf(s) / 60)) })
  for (const c of COOL_DOWNS) stretching(c.id, `Cool Down · ${c.label}`)
  // Filed sessions: finished, or ended early.
  for (const [index, x] of sessionsOf(s).entries()) {
    const counts = sessionCounts(x)
    const all = x.stretched === x.stretches
    const edit = { menu: 'session', index }
    if (stretchList(x.id)) {
      add('stretch', x.at, { name: COOL_DOWN_BY_ID[x.id] ? `Cool Down · ${COOL_DOWN_BY_ID[x.id].label}` : STRETCH_ROUTINE.name, right: `${x.stretched}/${x.stretches}`, status: all ? 'done' : 'early', workout: counts, edit })
      continue
    }
    const finished = x.total > 0 && x.done >= x.total
    const name = x.id === TARGETED.id ? planName(s, x.id, x) : FULL
    add('gym', x.at, { name, right: `${x.done}/${x.total} sets`, status: finished ? 'done' : 'early', workout: counts, edit })
    if (x.stretched > 0) add('stretch', x.at, { name: `${name} · Stretches`, right: `${x.stretched}/${x.stretches}`, status: all ? 'done' : finished ? 'open' : 'early', edit })
    warmup(x.at, name, x.warmup ?? [], edit)
  }
  for (const [index, c] of classesOf(s).entries()) {
    const edit = { menu: 'class', index }
    const areas = c.strength ? c.areas ?? [] : []
    const counts = classIsWorkout(c)
    const where = areas.length > 0 ? 'gym' : c.cardio ? 'cardio' : 'stretch'
    if (areas.length > 0) {
      const body = ['upper', 'lower'].filter(a => areas.includes(a))
      const what = areas.length === CLASS_AREAS.length ? 'Full Body'
        : [body.length && `${body.map(a => CLASS_AREAS.find(x => x.id === a).label).join(' & ')} Body`, areas.includes('core') && 'Core'].filter(Boolean).join(' & ')
      add('gym', c.at, { name: `Class · ${what}`, right: '', status: 'done', workout: counts, edit })
    }
    if (c.cardio) cardio(c.at, 'Class · Cardio', [c], counts && where === 'cardio', edit)
    if (c.stretch) add('stretch', c.at, { name: 'Class · Stretch', right: '', status: 'done', workout: counts && where === 'stretch', edit })
  }
  // Each kind counts its own: the index is its place in that kind's list.
  const seen = {}
  for (const x of s.cardio ?? []) {
    const name = x.kind === 'walk' ? 'Walk' : x.kind === 'sport' ? x.type ?? 'Sport' : x.type && x.type !== 'Other' ? x.type : 'Cardio'
    const index = seen[x.kind] = (seen[x.kind] ?? -1) + 1
    cardio(x.at, name, [x], x.kind !== 'walk' && cardioIsWorkout(x), { menu: x.kind, index })
  }
  for (const [index, x] of ownStretchesOf(s).entries()) add('stretch', x.at, { name: 'Stretch', right: '', status: 'done', workout: x.minutes !== null && longEnough(x.minutes), edit: { menu: 'stretch', index } })
  for (const [index, at] of restDaysOf(s).entries()) add('rest', at, { name: 'Rest day', right: '', status: 'done', edit: { menu: 'rest', index } })
  return weekDays(now).map(day => Object.fromEntries(Object.entries(lines).map(([k, list]) => [k, list.filter(x => sameDay(x.at, day)).sort((a, b) => a.at - b.at)])))
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

// A plan's warm-up this week (each new week starts without one, back to a
// single 5-minute set; see clearWeek): whether it's added, and its sets back
// to back (5 min easy then 5 hard, say). Older saves kept one length and
// effort.
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
  return list.length > 0 && openSlotsOf(s, workoutId) === 0 && list.every(ex => weekSetsOf(s, workoutId, ex).every(x => x.done))
}

// A built workout's exercise slots still to fill (see buildTargeted). Each
// counts as this many sets to go, so it isn't done until they're filled.
export const SLOT_SETS = 3
export function openSlotsOf(s, workoutId) {
  return workoutId === TARGETED.id ? s.targeted?.slots?.length ?? 0 : 0
}

// A plan's exercises come in two lists, each picked from the exercise bank:
//   main – what the plan is for; only exercises that fit it (see fitsPlan)
//   core – its Core section at the end, shown while that's switched on
// Saved under `order` and `coreLists`. The four gym plans and the full-body
// days keep core in their main list and have no Core section (older saves
// are moved over: see mergeCore in persist.js).
const LIST_KEY = { main: 'order', core: 'coreLists' }
export const coreInMain = workoutId => GYM_ORDER.includes(workoutId) || !!FULL_BODY_BY_ID[workoutId] || workoutId === TARGETED.id

function defaultIds(workoutId) {
  const own = (workouts[workoutId]?.exercises ?? []).map(e => e.id)
  const extras = PLAN_EXTRAS[workoutId] ?? []
  const core = id => isCore(EXERCISE_BY_ID[id])
  const at = own.findIndex(core)
  const end = at < 0 ? own.length : at
  return [...own.slice(0, end), ...extras.filter(id => !core(id)), ...own.slice(end), ...extras.filter(core)]
}

export function listIds(s, workoutId, section) {
  if (section === 'core' && coreInMain(workoutId)) return []
  const order = planOf(s, 'order')[workoutId]
  const saved = section === 'core'
    ? planOf(s, 'coreLists')[workoutId] ?? (order?.some(id => EXERCISE_BY_ID[id] && isCore(EXERCISE_BY_ID[id])) ? order : DEFAULT_CORE[workoutId] ?? [])
    : order ?? defaultIds(workoutId)
  const keep = id => {
    const ex = EXERCISE_BY_ID[id]
    return ex && (section === 'core' ? isCore(ex) : fitsPlan(ex, workoutId))
  }
  const ids = saved.filter(keep)
  return section === 'main' && ids.length === 0 ? defaultIds(workoutId).filter(keep) : ids
}

export function coreOnOf(s, workoutId) {
  if (coreInMain(workoutId)) return false
  return planOf(s, 'coreOn')[workoutId] ?? CORE_ON_BY_DEFAULT[workoutId] ?? false
}

// The plan's exercises as you do them: the main list, then Core if it's on.
function exerciseIdsOf(s, workoutId) {
  return [...listIds(s, workoutId, 'main'), ...(coreOnOf(s, workoutId) ? listIds(s, workoutId, 'core') : [])]
}

export function exercisesOf(s, workoutId) {
  return exerciseIdsOf(s, workoutId).map(id => EXERCISE_BY_ID[id]).filter(Boolean)
}

// Which list an exercise in a plan sits in.
export function sectionOf(exercise, workoutId) {
  return isCore(exercise) && !coreInMain(workoutId) ? 'core' : 'main'
}

// Drops ticks on exercises that are no longer in either of a plan's lists.
function pruneTicks(s, workoutId) {
  const inPlan = new Set([...listIds(s, workoutId, 'main'), ...listIds(s, workoutId, 'core')])
  const ticks = s.checks?.[workoutId]?.exercises ?? {}
  const kept = Object.fromEntries(Object.entries(ticks).filter(([id]) => inPlan.has(id)))
  const splits = Object.fromEntries(Object.entries(s.checks?.[workoutId]?.splits ?? {}).filter(([id]) => inPlan.has(id)))
  return writeChecks(s, workoutId, cur => ({ ...cur, exercises: kept, splits }))
}

// Changes one of a plan's lists (`change` gets its ids, gives the new ones)
// for `scope` (see writePlan). Writing the main list also pins the Core
// section as it is, so Core isn't read from the new main list (where older
// saves kept it).
export function writeList(s, workoutId, section, change, scope) {
  const pinned = section === 'main' && !coreInMain(workoutId) && !s.coreLists?.[workoutId]
    ? { ...s, coreLists: { ...s.coreLists, [workoutId]: listIds(everyWeek(s), workoutId, 'core') } }
    : s
  return pruneTicks(writePlan(pinned, LIST_KEY[section], workoutId, x => listIds(x, workoutId, section), change, scope), workoutId)
}

export function writeCoreOn(s, workoutId, on, scope) {
  return writePlan(s, 'coreOn', workoutId, x => coreOnOf(x, workoutId), () => on, scope)
}

// ── Just this week, or every week ──────────────────────────────────────────
// A plan's lists and Core can be changed for just this week: the
// change goes under `weekOnly`, which is read over what you've set and
// cleared when the week is filed. For one you can do any number of times
// (a full-body day, the Full Body Stretch, a cool-down) it's just this
// time: cleared when that one is filed or ended.
//   scope 'week'   – just this week (or this time)
//   scope 'always' – this week and after: what you've set changes, and so
//                    does this week's own version if there is one
//   scope 'auto'   – this week's own version if there is one, else what
//                    you've set (for moving things around, which doesn't ask)
//   scope 'past'   – a saved week's own copy, which has nothing after it
// A plan's lists: every week's, with this week's (or, for a full-body day,
// this time's) over them.
export function planOf(s, key) {
  return { ...s[key], ...s.weekOnly?.[key] }
}
const everyWeek = s => ({ ...s, weekOnly: undefined })
export const hasWeekOnly = (s, key, id) => s.weekOnly?.[key]?.[id] !== undefined

function writePlan(s, key, id, read, change, scope) {
  const own = hasWeekOnly(s, key, id)
  const to = scope === 'week' || (scope === 'auto' && own) ? 'week' : 'always'
  let next = s
  if (to === 'always') {
    next = { ...next, [key]: { ...s[key], [id]: change(read(everyWeek(s))) } }
  }
  if (to === 'week' || own) next = { ...next, weekOnly: { ...s.weekOnly, [key]: { ...s.weekOnly?.[key], [id]: change(read(s)) } } }
  // Changed back to how every week has it: it's not this week's own any more.
  if (hasWeekOnly(next, key, id) && JSON.stringify(read(next)) === JSON.stringify(read(everyWeek(next)))) {
    next = withoutWeekOnly(next, id, [key])
  }
  return next
}

// What's kept for a plan, by key.
const PLAN_KEYS = ['order', 'coreLists', 'coreOn', 'stretchLists']

// Drops this week's own version of `id` (for `keys`, or all of them).
function withoutWeekOnly(s, id, keys = PLAN_KEYS) {
  if (!s.weekOnly) return s
  const weekOnly = Object.fromEntries(Object.entries(s.weekOnly).map(([k, v]) => [k, keys.includes(k) ? Object.fromEntries(Object.entries(v).filter(([x]) => x !== id)) : v]))
  return { ...s, weekOnly }
}

const exerciseIds = (s, id) => exerciseIdsOf(s, id)
const stretchIds = (s, id) => stretchesOf(s, id).map(x => x.id)
// What `now` added to `from`, took out, and moved: each one in a different
// spot (not counting what was added or taken out around it).
function listDiff(now, from) {
  const a = now.filter(x => from.includes(x)), b = from.filter(x => now.includes(x))
  return { added: now.filter(x => !from.includes(x)), dropped: from.filter(x => !now.includes(x)), moved: a.filter((x, i) => x !== b[i]) }
}

// How this week's version of a plan differs from every week's: whether it
// has its own, and the exercises and stretches it adds or takes out.
export function weekDiffOf(s, id) {
  const always = everyWeek(s)
  return {
    differs: PLAN_KEYS.some(k => hasWeekOnly(s, k, id)),
    exercises: listDiff(exerciseIds(s, id), exerciseIds(always, id)),
    stretches: listDiff(stretchIds(s, id), stretchIds(always, id)),
  }
}

// Puts back one exercise or stretch (`kind`) taken out just this week, where
// every week's version has it.
export function putBackWeekOf(s, id, kind, item) {
  const always = everyWeek(s)
  if (kind === 'stretches') return writeStretchList(s, id, now => putBack(now, stretchIds(always, id), item), 'week')
  const section = sectionOf(EXERCISE_BY_ID[item], id)
  const next = writeList(s, id, section, now => putBack(now, listIds(always, id, section), item), 'week')
  // Core switched off just this week comes back on with it.
  return section === 'core' && !coreOnOf(next, id) ? writeCoreOn(next, id, true, 'week') : next
}

// Back to every week's version, dropping ticks on what goes.
export function resetWeekOf(s, id) {
  return pruneStretchTicks(pruneTicks(withoutWeekOnly(s, id), id), id)
}

// A plan as the app came, without anything you've set.
function originalOf(s, id) {
  const next = everyWeek(s)
  for (const k of PLAN_KEYS) next[k] = Object.fromEntries(Object.entries(s[k] ?? {}).filter(([x]) => x !== id))
  return next
}

// How every week's version differs from how the app came: what it adds and
// takes out, whether anything's changed at all (moved around, say), and
// its lists as they are now (`lists`).
export function defaultEditsOf(s, id) {
  const now = everyWeek(s), from = originalOf(s, id)
  const ex = [exerciseIds(now, id), exerciseIds(from, id)]
  const st = [stretchIds(now, id), stretchIds(from, id)]
  return {
    edited: JSON.stringify([ex[0], st[0]]) !== JSON.stringify([ex[1], st[1]]),
    exercises: listDiff(...ex),
    stretches: listDiff(...st),
    lists: { exercises: ex[0], stretches: st[0] },
  }
}

// Changes every week's version of a plan (`change` gets the state, gives it
// back changed), from next week: this week keeps what it has now, as its
// own version (one it already has stays as it is). Anything that ends up
// as the app came is kept as the original, and this week's own version
// where it's the same as every week's is dropped.
function changeDefault(s, id, change) {
  const now = Object.fromEntries(PLAN_KEYS.map(k => [k, readPlan(s, k, id)]))
  const pinned = { ...s, weekOnly: { ...s.weekOnly } }
  for (const k of PLAN_KEYS) if (!hasWeekOnly(s, k, id)) pinned.weekOnly[k] = { ...s.weekOnly?.[k], [id]: now[k] }
  let next = change(pinned)
  for (const k of PLAN_KEYS) {
    if (JSON.stringify(readPlan(everyWeek(next), k, id)) === JSON.stringify(readPlan(originalOf(next, id), k, id))) {
      next = { ...next, [k]: Object.fromEntries(Object.entries(next[k] ?? {}).filter(([x]) => x !== id)) }
    }
    if (JSON.stringify(now[k]) === JSON.stringify(readPlan(everyWeek(next), k, id))) next = withoutWeekOnly(next, id, [k])
  }
  return next
}

// Puts every week's version back to how the app came, from next week.
export function restoreDefaultOf(s, id) {
  return changeDefault(s, id, x => ({ ...x, ...Object.fromEntries(PLAN_KEYS.map(k => [k, Object.fromEntries(Object.entries(x[k] ?? {}).filter(([y]) => y !== id))])) }))
}

// Undoes one change to every week's version, from next week: an exercise or
// stretch (`kind`) you added comes out, and one you took out or moved goes
// back to its spot in the original. The main list always keeps one.
export function undoDefaultEditOf(s, id, kind, item) {
  return changeDefault(s, id, x => {
    const always = everyWeek(x), from = originalOf(x, id)
    if (kind === 'stretches') return { ...x, stretchLists: { ...x.stretchLists, [id]: putBack(stretchIds(always, id), stretchIds(from, id), item) } }
    const section = sectionOf(EXERCISE_BY_ID[item], id)
    const list = putBack(listIds(always, id, section), listIds(from, id, section), item)
    if (!list.length && section === 'main') return x
    const key = LIST_KEY[section]
    const next = { ...x, [key]: { ...x[key], [id]: list } }
    // The main list written keeps Core as it is (see writeList); a core
    // exercise back turns Core on.
    if (section === 'main' && !coreInMain(id) && !x.coreLists?.[id]) next.coreLists = { ...x.coreLists, [id]: listIds(always, id, 'core') }
    if (section === 'core' && list.includes(item)) next.coreOn = { ...x.coreOn, [id]: true }
    return next
  })
}

// `now` with `item` where `from` has it, or out if `from` doesn't.
function putBack(now, from, item) {
  const rest = now.filter(x => x !== item)
  if (!from.includes(item)) return rest
  const at = from.indexOf(item)
  return [...rest.slice(0, at), item, ...rest.slice(at)]
}

// One of a plan's kept values (see PLAN_KEYS), as read.
function readPlan(s, key, id) {
  return { order: () => listIds(s, id, 'main'), coreLists: () => listIds(s, id, 'core'), coreOn: () => coreOnOf(s, id), stretchLists: () => stretchIds(s, id) }[key]()
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
// Rest days follow what's logged: a day with something on it has none, and
// each day this week before today with nothing on it is one, so moving
// something off a day makes it a rest day again. Today and later have one
// only if you add it. (Applied after every change: see useStore's update.)
export function settleRest(s) {
  const now = new Date(s.clockAt ?? Date.now())
  const days = weekDays(now)
  const log = dayLogOf(s, now)
  const busy = days.map((_, i) => log[i].some(x => x.kind !== 'rest'))
  const dayOf = at => days.findIndex(d => sameDay(new Date(at), d))
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const from = new Date(s.lastResetAt ?? days[0])
  from.setHours(0, 0, 0, 0)
  const rest = restDaysOf(s)
  const keep = rest.filter(at => !at || !busy[dayOf(at)])
  const add = days
    .filter((d, i) => d >= from && d < today && !busy[i] && !keep.some(at => at && dayOf(at) === i))
    .map(d => d.toISOString())
  if (keep.length === rest.length && !add.length) return s
  const list = [...keep, ...add]
  return { ...s, restLog: list, activities: { ...s.activities, rest: list.length } }
}

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
// If none of a saved list's stretches are left (a deleted one of yours),
// it falls back to the starting stretches.
// A list with its own holds (the Full Body Stretch, a cool-down) times them its way,
// sets and rest too, unless you've set one yourself.
// The Full Body Stretch's length in minutes (see STRETCH_ROUTINE.lengths).
export const routineLengthOf = s => (STRETCH_ROUTINE.lengths[s.routineLength] ? s.routineLength : STRETCH_ROUTINE.length)

export function stretchesOf(s, listId) {
  const holds = listId === STRETCH_ROUTINE.id ? STRETCH_ROUTINE.lengths[routineLengthOf(s)] : COOL_DOWN_BY_ID[listId]?.holds ?? null
  const own = x => (holds ? { ...x, duration: x.perSide ? holds.perSide : holds.single, sets: holds.sets, rest: holds.rest } : x)
  const pick = ids => ids.map(id => STRETCH_BY_ID[id]).filter(Boolean).map(own)
  const saved = pick(planOf(s, 'stretchLists')[listId] ?? [])
  return saved.length ? saved : pick(defaultStretchIds(listId))
}

// Changes a list's stretch ids for `scope` (see writePlan), dropping the
// tick of any stretch that left it.
export function writeStretchList(s, listId, change, scope) {
  return pruneStretchTicks(writePlan(s, 'stretchLists', listId, x => stretchesOf(x, listId).map(st => st.id), change, scope), listId)
}

// Drops ticks on stretches no longer in the list, and checks again whether
// they're all done: taking off the last one still to do finishes them, and
// adding one takes that back.
function pruneStretchTicks(s, listId) {
  if (!s.checks?.[listId]) return s
  const ids = stretchesOf(s, listId).map(st => st.id)
  const ticks = s.checks[listId].stretches ?? {}
  const kept = Object.fromEntries(Object.entries(ticks).filter(([id]) => ids.includes(id)))
  return writeChecks(s, listId, cur => ({ ...cur, stretches: kept }))
}

// How long a stretch list takes with your settings: every hold (both sides
// where it's per side), every set, and the rests between sets.
export function routineSecondsOf(s, listId = STRETCH_ROUTINE.id) {
  return stretchesOf(s, listId).reduce((sum, x) => {
    const sets = s.stretchSets?.[x.id] ?? x.sets ?? 1
    const hold = (s.customDurations?.[x.id] ?? x.duration) * ((s.perSide?.[x.id] ?? x.perSide) ? 2 : 1)
    return sum + hold * sets + (s.stretchRest?.[x.id] ?? x.rest ?? 20) * (sets - 1)
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
  return Object.fromEntries(GOAL_SETTINGS.map(({ id, most }) => {
    const g = { ...GOAL_DEFAULTS[id], ...s.goals?.[id] }
    return [id, { min: Math.min(g.min, most), max: Math.min(g.max, most) }]
  }))
}

// ── Doing it again ─────────────────────────────────────────────────────────
// A full-body day, the Full Body Stretch or a cool-down can be done more than
// once a week.
// The one under way keeps its ticks in `checks`, like a plan. Starting it
// again once it's finished files that one in `sessionLog` as it stood and
// clears its ticks; your weights and lists stay as they are.
export const REPEATABLE = new Set([...FULL_BODY.map(p => p.id), TARGETED.id, STRETCH_ROUTINE.id, ...COOL_DOWNS.map(c => c.id)])

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
  let done = 0, total = SLOT_SETS * openSlotsOf(s, id)
  for (const ex of exercisesOf(s, id)) {
    const sets = weekSetsOf(s, id, ex)
    total += sets.length
    done += sets.filter(x => x.done).length
  }
  const w = warmupOf(s, id)
  return {
    id, at: c.at ?? s.clockAt ?? new Date().toISOString(), done, total, stretched, stretches: list.length, warmup: w.on && c.warmup ? w.sets : null, checks: c,
    ...(id === TARGETED.id && { targeted: targetedOf(s) }),
  }
}

// Files the finished one away and clears its ticks for the next. Anything
// not finished is left as it is.
export function fileSession(s, id) {
  if (!REPEATABLE.has(id) || !finishedOf(s, id)) return s
  const checks = { ...s.checks }
  delete checks[id]
  return withoutWeekOnly({ ...s, sessionLog: [...sessionsOf(s), sessionOf(s, id)], checks }, id)
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
  return withoutWeekOnly({ ...s, sessionLog: [...sessionsOf(s), x], checks }, id)
}

// Whether a filed session can be opened again: 'ok', or 'busy' while
// another of the same is under way and not finished.
// Whether `at` was on a day before today.
function beforeToday(s, at) {
  if (!at) return false
  const today = new Date(s.clockAt ?? Date.now())
  today.setHours(0, 0, 0, 0)
  return new Date(at) < today
}

// A plan begun on a day that's over without every set done ended there (the
// stop sign on its day); finishing its sets later still completes it.
export function planEndedOf(s, id) {
  return !REPEATABLE.has(id) && beforeToday(s, s.checks?.[id]?.at) && !workoutComplete(s, id)
}

// Ones you can do again left unfinished on a day that's over are ended
// there, as far as they got (see endSession); one begun but never ticked
// just goes. (Applied after every change: see useStore's update.)
export function endPastSessions(s) {
  let next = s
  for (const id of REPEATABLE) {
    const c = next.checks?.[id]
    if (!beforeToday(next, c?.at ?? c?.stretchStartAt ?? c?.openedAt) || finishedOf(next, id)) continue
    const ended = endSession(next, id)
    if (ended !== next) next = ended
    else {
      const checks = { ...next.checks }
      delete checks[id]
      next = withoutWeekOnly({ ...next, checks }, id)
    }
  }
  return next
}

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
  const back = x.targeted ? withTargeted(filed, x.targeted) : filed
  return {
    ...back,
    sessionLog: sessionsOf(filed).filter((_, i) => i !== index),
    checks: { ...filed.checks, [x.id]: ticksOfSession(back, x) },
  }
}

// ── Targeted workouts ──────────────────────────────────────────────────────
// A targeted workout is a plan for the areas you pick (all of them for full
// body). It starts empty, with a slot for each exercise and stretch it
// needs (see data/targeted.js), and you fill each from what's suggested or
// pick your own. Filed ones keep what they were, so each can be opened
// again as it was.

// The one picked last: its areas and equipment, its lists, and the slots
// still empty.
export function targetedOf(s) {
  const id = TARGETED.id
  return {
    areas: s.targeted?.areas ?? [],
    eq: s.targeted?.eq ?? 'gym',
    slots: s.targeted?.slots ?? [],
    stretchSlots: s.targeted?.stretchSlots ?? [],
    muscles: s.targeted?.muscles ?? null, // { areaId: [muscle, …] } picked
    main: listIds(s, id, 'main'),
    core: coreOnOf(s, id) ? listIds(s, id, 'core') : [],
    stretches: stretchesOf(s, id).map(x => x.id),
  }
}

// Sets the targeted workout's picks and lists (as everyday lists, not just
// this week's: each one is made fresh anyway).
function withTargeted(s, { areas, eq, main, core, stretches, slots = [], stretchSlots = [], muscles = null }) {
  const id = TARGETED.id
  return {
    ...withoutWeekOnly(s, id),
    targeted: { areas, eq, slots, stretchSlots, muscles },
    // Core goes in its main list, with everything else (see coreInMain).
    order: { ...s.order, [id]: [...main, ...core] },
    coreLists: { ...s.coreLists, [id]: [] },
    coreOn: { ...s.coreOn, [id]: false },
    stretchLists: { ...s.stretchLists, [id]: stretches },
  }
}

// Marks one as begun from its card (`openedAt`), so it shows as under way
// before anything's ticked.
function opened(s, id) {
  return { ...s, checks: { ...s.checks, [id]: { ...s.checks?.[id], openedAt: s.clockAt ?? new Date().toISOString() } } }
}

// A fresh one from Build a Workout starts without its warm-up (its lengths
// are kept for when you add it).
function noWarmup(s, id) {
  return { ...s, warmups: { ...s.warmups, [id]: { ...warmupOf(s, id), on: false } } }
}

// Begins a full-body day from Build a Workout: a finished one is filed
// first, and one under way carries on.
export function beginSession(s, id) {
  const filed = fileSession(s, id)
  return opened(filed.checks?.[id] ? filed : noWarmup(filed, id), id)
}

// Starts a targeted workout for `areas` with `eq`, empty with its slots: one
// before it is filed first, finished or as far as it got (if it got
// anywhere). Exercises you have numbers for are suggested first, and last
// time's last.
export function startTargeted(s, areas, eq, muscles) {
  const id = TARGETED.id
  const filed = endSession(fileSession(s, id), id)
  const last = [...sessionsOf(filed)].reverse().find(x => x.targeted)?.targeted
  const recent = new Set(last ? [...last.main, ...last.core, ...last.stretches] : [])
  const known = new Set(Object.keys(s.exerciseSettings ?? {}))
  const { slots, stretchSlots } = buildTargeted(areas, eq, { known, recent, muscles })
  const checks = { ...filed.checks }
  delete checks[id]
  return opened(noWarmup({ ...withTargeted(filed, { areas, eq, main: [], core: [], stretches: [], slots, stretchSlots, muscles }), checks }, id), id)
}

// Fills an empty slot (`kind` 'exercise' or 'stretch', by its place among
// them) with `id`, at the end of its list.
export function fillSlot(s, kind, index, id) {
  const now = targetedOf(s)
  const key = kind === 'stretch' ? 'stretchSlots' : 'slots'
  if (!now[key][index]) return s
  const next = { ...now, [key]: now[key].filter((_, i) => i !== index) }
  if (kind === 'stretch') next.stretches = [...now.stretches, id]
  else next.main = [...now.main, id]
  return withTargeted(s, next)
}

// Drops one begun from Build a Workout with nothing done yet, as if it was
// never started.
export function discardSession(s, id) {
  const checks = { ...s.checks }
  delete checks[id]
  const next = { ...s, checks }
  return id === TARGETED.id ? withTargeted(next, { areas: [], eq: targetedOf(s).eq, main: [], core: [], stretches: [] }) : next
}

// Takes away an empty slot you don't want.
export function dropSlot(s, kind, index) {
  const now = targetedOf(s)
  const key = kind === 'stretch' ? 'stretchSlots' : 'slots'
  return withTargeted(s, { ...now, [key]: now[key].filter((_, i) => i !== index) })
}
