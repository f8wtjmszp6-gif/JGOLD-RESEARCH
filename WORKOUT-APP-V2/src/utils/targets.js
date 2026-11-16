// Your nutrition targets: what's recommended for you, and the numbers to
// suggest for each (Targets' Use buttons and the bell's "review" note).
import { calorieBurn, lastWeight, dayKey } from './nutrition'

// What's recommended for you: by sex (and age, for fiber) once Personal info
// has them; until then both men's and women's, and either counts.
export function recsFor(profile) {
  const sex = profile?.sex
  const age = profile?.age ?? null
  const older = (age ?? 0) > 50
  // Calories by age, as the Dietary Guidelines give them (19–30, 31–50, 51+).
  const band = age == null ? null : age <= 30 ? 0 : age <= 50 ? 1 : 2
  const MEN_CAL = [[2400, 3000], [2200, 3000], [2000, 2800]]
  const WOMEN_CAL = [[1800, 2400], [1800, 2200], [1600, 2200]]
  const ages = ['19–30', '31–50', 'over 50']
  const MEN = { who: older ? 'men over 50' : 'men', calWho: band == null ? 'men' : `men ${ages[band]}`, cal: band == null ? [2000, 3000] : MEN_CAL[band], fiber: older ? 30 : 38, sugar: 36, water: 104, cups: 13 }
  const WOMEN = { who: older ? 'women over 50' : 'women', calWho: band == null ? 'women' : `women ${ages[band]}`, cal: band == null ? [1600, 2400] : WOMEN_CAL[band], fiber: older ? 21 : 25, sugar: 25, water: 72, cups: 9 }
  return sex === 'man' ? { one: MEN } : sex === 'woman' ? { one: WOMEN } : { men: MEN, women: WOMEN }
}

// Your nutrition goal (Personal info) moves calories and protein: losing is
// about 500–1,000 under maintenance, gaining about 250–500 over it, and both
// want more protein per kg than maintaining.
const AIMS = {
  lose: { shift: [-1000, -500], protein: [1.6, 2.4], cal: 'To lose about 1–2 lb a week, eat 500–1,000 calories under that', why: 'Research on dieting lifters suggests 1.6–2.4g per kg to hold on to muscle while losing fat' },
  maintain: { shift: [0, 0], protein: [1.6, 2.2], why: 'If you lift, 1.6–2.2g per kg is enough to lose fat and build muscle at the same time' },
  gain: { shift: [250, 500], protein: [1.6, 2.2], cal: 'To bulk, eat about 250–500 calories over that', why: 'Research on lifters finds muscle gains top out around 1.6g per kg, up to 2.2g' },
}
export const aimOf = profile => AIMS[profile?.goal] ?? AIMS.maintain
// Your pace (lb a week), when losing or gaining, from your target date (see
// syncPace): a pound a week is about 500 calories a day.
export const paceOf = profile => (profile?.goal === 'lose' || profile?.goal === 'gain') && profile.pace > 0 ? profile.pace : null
const shiftOf = profile => {
  const pace = paceOf(profile)
  if (!pace) return aimOf(profile).shift
  const d = Math.round(pace * 500) * (profile.goal === 'lose' ? -1 : 1)
  return [d, d]
}
export const calFor = (band, profile) => band.map((c, i) => c + shiftOf(profile)[i])
const to50 = n => Math.round(n / 50) * 50
// What you burn at rest, up to the next 50: calories never go under it.
export const restFloor = est => Math.ceil(est.rest / 50) * 50
// The fastest you can lose without eating under that, to the 0.1 lb.
export const maxPace = est => Math.max(0, Math.floor(((est.burn - restFloor(est)) / 500) * 10) / 10)
// With your own burn (Personal info filled in): keeping your weight is
// within 10% of it, moved for your goal, never under your resting burn.
export const keepBand = (est, profile) => calFor([est.burn * 0.9, est.burn * 1.1], profile).map(c => Math.max(to50(c), restFloor(est)))
export const suggestFor = (est, profile) => Math.max(restFloor(est), to50(est.burn + (shiftOf(profile)[0] + shiftOf(profile)[1]) / 2))
// What the calorie note says about your goal: "To lose 1 lb a week, eat
// about 500 calories under that", or the goal's usual range without a pace.
export function aimText(profile) {
  const pace = paceOf(profile)
  if (!pace) return aimOf(profile).cal
  const lose = profile.goal === 'lose'
  return `To ${lose ? 'lose' : 'gain'} ${pace} lb a week, eat about ${Math.round(pace * 500).toLocaleString('en-US')} calories ${lose ? 'under' : 'over'} that`
}

// The numbers to suggest for each target, where there's enough to go on:
// calories from your burn, protein from the middle of your goal's range,
// fat at up to 30% of calories (less if carbs would drop under 45%), carbs
// the rest, and fiber, added sugar and water as recommended for you. `all`:
// fat and carbs from the suggested calories and protein (Use all), else
// from your current ones (each row's Use).
export function suggestedTargets(goals, lb, profile, all = false) {
  const r = recsFor(profile)
  const est = calorieBurn(profile, lb)
  const to5 = n => Math.round(n / 5) * 5
  // Inside a share of calories, in grams to the 5 (never just outside it).
  const share = (cal, lo, hi, per, g) => Math.min(Math.floor((cal * hi) / per / 5) * 5, Math.max(Math.ceil((cal * lo) / per / 5) * 5, to5(g)))
  const out = {}
  if (est) out.cal = suggestFor(est, profile)
  const cal = all ? (out.cal ?? goals.cal) : goals.cal
  // Protein: the middle of your goal's range, less (down to its bottom) if
  // that leaves carbs under 45% with fat at 20%.
  if (lb) {
    const kg = lb / 2.2046
    const [a, b] = aimOf(profile).protein
    out.protein = to5(Math.max(kg * a, Math.min((kg * (a + b)) / 2, (cal * 0.35) / 4)))
  }
  const protein = all ? (out.protein ?? goals.protein) : goals.protein
  // Fat at 30%, less (to 20%) to leave carbs 45%; carbs the rest, kept
  // inside 45–65%.
  out.fat = share(cal, 0.2, 0.35, 9, Math.min(cal * 0.3, cal - protein * 4 - cal * 0.45) / 9)
  out.carbs = share(cal, 0.45, 0.65, 4, (cal - protein * 4 - out.fat * 9) / 4)
  if (r.one) Object.assign(out, { fiber: r.one.fiber, sugar: r.one.sugar, water: r.one.water })
  return out
}


// Weeks from today to a day ('YYYY-MM-DD').
const weeksTo = date => {
  const [y, m, d] = date.split('-').map(Number)
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d, 12) - now) / 86400000) / 7
}

// The pace (lb a week, to the 0.1) it takes to reach your target weight by
// your target date, from your weight `lb`. null without them all, or once
// the date's passed or the target's reached.
export function paceFor(profile, lb) {
  const { goal, targetLb, targetDate } = profile ?? {}
  if ((goal !== 'lose' && goal !== 'gain') || !targetLb || !targetDate || !lb) return null
  const gap = goal === 'lose' ? lb - targetLb : targetLb - lb
  const weeks = weeksTo(targetDate)
  if (gap <= 0 || weeks <= 0) return null
  return Math.max(0.1, Math.round((gap / weeks) * 10) / 10)
}

// A healthy pace, as a share of your body weight a week: losing 0.5–1%,
// bulking 0.25–0.5% (past that the extra is mostly fat). [low, high] in lb,
// to the 0.05.
export const PACE_SHARE = { lose: [0.005, 0.01], gain: [0.0025, 0.005] }
export function paceRange(goal, lb) {
  const share = PACE_SHARE[goal]
  return share && lb ? share.map(x => Math.floor(lb * x * 20) / 20) : null
}

// The fastest pace for your goal: the top of its healthy range, and losing,
// never eating under your resting burn either. null when it can't be worked
// out yet.
export function fastestPace(profile, lb) {
  const range = paceRange(profile?.goal, lb)
  if (!range) return null
  if (profile.goal === 'gain') return range[1]
  const est = calorieBurn(profile, lb)
  return est ? Math.min(range[1], maxPace(est)) : null
}

// The soonest target date you can pick ('YYYY-MM-DD'): what your fastest
// pace allows, and at least a week out. null until that can be worked out.
export function earliestDate(profile, lb) {
  const { goal, targetLb } = profile ?? {}
  const max = fastestPace(profile, lb)
  if ((goal !== 'lose' && goal !== 'gain') || !targetLb || !lb || !(max > 0)) return null
  const days = Math.max(7, Math.ceil((Math.abs(lb - targetLb) / max) * 7))
  const d = new Date()
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

// After every change: your pace follows your target date and your latest
// weigh-in, never faster than your fastest (see fastestPace). Past the date
// (or at the target), it stays where it was.
export function syncPace(s) {
  const p = s.profile
  if (!p?.targetDate) return s
  const lb = lastWeight(s.nutrition)
  let pace = paceFor(p, lb)
  if (pace == null) return s
  const max = fastestPace(p, lb)
  if (max != null) pace = Math.min(pace, max)
  return pace === p.pace ? s : { ...s, profile: { ...p, pace } }
}
