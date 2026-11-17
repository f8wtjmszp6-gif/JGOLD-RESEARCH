import { useState } from 'react'
import WeekCard from './week/WeekCard'
import Food, { NutrientBars, WaterBar, BodyWeight } from './food/Food'
import { upNextOf } from '../utils/upNext'
import { weekDay } from '../utils/goal'
import { workouts, GYM_ORDER } from '../data/workout'
import { goalsOf, dayOf, dayKey, dayTotal } from '../utils/nutrition'
import { sameDay } from '../utils/days'
import { useWeather } from '../hooks/useWeather'

// Home: today at a glance, Fitness then Nutrition. The workout to do next
// (Start opens it) and this week's goals; then buttons to log food, water
// or a weigh-in (the weigh-in button shows today's weight once there is
// one) and today's numbers and water. Food, water and weigh-in pop up right here, Nutrition's own
// pop-ups, without leaving Home.
export default function HomeScreen({ store, onStart }) {
  // The pop-up open: { what: 'food' | 'water' | 'weigh' | 'weight' | 'goal' | 'goals', n } (each tap
  // starts it fresh).
  const [log, setLog] = useState(null)
  // How far the cards have scrolled (up to 24px): the top of the list fades
  // out under the header that much, so cards fold away into it.
  const [fade, setFade] = useState(0)
  const onLog = what => setLog(l => ({ what, n: (l?.n ?? 0) + 1 }))
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const left = weekDay(now).daysLeft

  // Up next as Fitness has it; with no saved weeks yet, the first gym plan
  // not started this week. None: every plan's been started.
  const started = new Set((store.current.plans ?? []).filter(p => p.done > 0).map(p => p.id))
  const next = upNextOf(store)?.id ?? (store.history.length ? null : GYM_ORDER.find(id => !started.has(id)))

  // The card follows a plan through today: its lifts, then its stretches.
  // A plan begun today with sets left takes the card's place (Continue opens
  // it); once its sets are all done, its stretches are next (Start opens its
  // Stretches tab), then in progress, until they're all ticked. Only today:
  // tomorrow the card moves on to the next plan.
  const today = at => at && sameDay(new Date(at), now)
  const going = GYM_ORDER.find(id => {
    const { done, total } = store.workoutProgress(id)
    return today(store.stampsOf(id).at) && done > 0 && done < total && !store.planEnded(id)
  })
  const progress = going && store.workoutProgress(going)
  const stretchPlan = !going && GYM_ORDER.find(id => {
    const { done, total } = store.workoutProgress(id)
    const { at, stretchedAt } = store.stampsOf(id)
    const list = store.getStretches(id)
    return (today(at) || today(stretchedAt)) && total > 0 && done >= total && list.length > 0 && !list.every(x => store.getStretchDone(id, x.id))
  })
  const stretchList = stretchPlan ? store.getStretches(stretchPlan) : []
  const stretched = stretchList.filter(x => store.getStretchDone(stretchPlan, x.id)).length

  const weather = useWeather(store.profile.zip)

  const n = store.nutrition
  const goals = goalsOf(n)
  const day = dayOf(n, dayKey())
  const drunk = (day.water ?? []).reduce((t, oz) => t + oz, 0)
  const lb = n.weights?.[dayKey()]

  const heading = 'px-1 -mb-1 mt-1.5 text-xs font-medium uppercase tracking-[0.08em] text-stone-500'
  const action = 'h-11 rounded-xl bg-white shadow-sm text-sm font-semibold text-stone-900 active:bg-stone-100'
  return (
    <div className="flex-1 min-h-0 flex flex-col">
        {/* Today's day of the month, big, beside the greeting and the date.
            Outside the scrolling part, so it never moves. */}
        <div className="shrink-0 px-5 pt-5 pb-2 bg-stone-50 flex items-center gap-3">
          <span className="text-[52px] leading-[0.9] font-extrabold text-accent-500 tracking-[-0.04em]">{now.getDate()}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl leading-tight font-bold text-stone-900 tracking-tight">{greeting}</h1>
            <p className="text-[13px] text-stone-500">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          {/* Today's weather, for the ZIP in Personal info. */}
          {weather && (
            <div role="img" aria-label={`${weather.now} degrees, high ${weather.hi}, low ${weather.lo}`} className="shrink-0 flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <WeatherIcon kind={weather.kind} />
                <span className="text-[22px] font-bold text-stone-900 tracking-tight">{weather.now}°</span>
              </div>
              <span className="text-xs text-stone-500 whitespace-nowrap">H {weather.hi}° · L {weather.lo}°</span>
            </div>
          )}
        </div>

      <div
        onScroll={e => setFade(Math.min(24, Math.max(0, e.currentTarget.scrollTop)))}
        style={{ maskImage: `linear-gradient(to bottom, transparent, black ${fade}px)`, WebkitMaskImage: `linear-gradient(to bottom, transparent, black ${fade}px)` }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-1.5 pb-28"
      >
      <div className="flex flex-col gap-3.5">
        <p className={heading}>Fitness</p>
        {going ? (
          <InProgress label="In progress" name={workouts[going].short} sub={`${progress.done} of ${progress.total} sets`} onClick={() => onStart(going)} />
        ) : stretchPlan && stretched > 0 ? (
          <InProgress label="In progress · Stretches" name={workouts[stretchPlan].short} sub={`${stretched} of ${stretchList.length} stretches`} onClick={() => onStart(stretchPlan, 'stretches')} />
        ) : stretchPlan ? (
          <div className="rounded-[20px] bg-accent-500 text-white p-4 flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-accent-100">Up next · Stretches</p>
              <p className="mt-0.5 text-[22px] font-bold">{workouts[stretchPlan].short}</p>
              <p className="text-sm text-accent-100">0 of {stretchList.length} stretches</p>
            </div>
            <button onClick={() => onStart(stretchPlan, 'stretches')} className="h-11 rounded-xl bg-white text-accent-500 text-base font-bold active:bg-accent-50">Start stretching</button>
          </div>
        ) : next ? (
          <div className="rounded-[20px] bg-accent-500 text-white p-4 flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-accent-100">Up next</p>
              <p className="mt-0.5 text-[22px] font-bold">{workouts[next].short}</p>
            </div>
            <button onClick={() => onStart(next)} className="h-11 rounded-xl bg-white text-accent-500 text-base font-bold active:bg-accent-50">Start workout</button>
          </div>
        ) : (
          <div className="rounded-[20px] bg-white shadow-sm p-4">
            <p className="text-base font-semibold text-stone-900">Every plan started this week ✓</p>
          </div>
        )}
        {/* This week's goals, as on Fitness, under a title. */}
        <WeekCard week={store.week} stretch={store.stretchWeek} cardio={store.cardioWeek} goals={store.goals} live logged={{ class: store.classes.length, cardio: store.otherCardio.length + store.sports.length }} heading={
          <div className="flex items-baseline justify-between mb-2.5">
            <p className="text-[17px] font-bold text-stone-900">This week</p>
            <p className="text-sm text-stone-500">{left === 1 ? 'Last day' : `${left} days left`}</p>
          </div>
        } />

        <p className={heading}>Nutrition</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => onLog('food')} className={action}>+ Food</button>
          <button onClick={() => onLog('water')} className={action}>+ Water</button>
          {/* Once you've weighed in today, it shows the weight (tap to change it). */}
          <button onClick={() => onLog('weigh')} className={action}>{lb != null ? `${lb.toFixed(1)} lb` : 'Weigh in'}</button>
        </div>
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          {/* Today's numbers and water: tap for Targets, as on Nutrition. */}
          <button onClick={() => onLog('goals')} aria-label="Targets" className="w-full text-left active:bg-stone-50">
            <div className="px-4 pt-3 pb-2.5 flex flex-col gap-2">
              <p className="text-[17px] font-bold text-stone-900">Today</p>
              <NutrientBars total={dayTotal(day)} goals={goals} />
            </div>
            <div className="mx-4 border-t border-stone-100" />
            <div className="px-4 py-2.5"><WaterBar drunk={drunk} goal={goals.water} /></div>
          </button>
          {/* Body weight, as on Nutrition; its pop-ups open right here. */}
          <div className="mx-4 border-t border-stone-100" />
          <BodyWeight n={n} profile={store.profile} onWeights={() => onLog('weight')} onWeighIn={() => onLog('weigh')} onGoal={() => onLog('goal')} />
        </div>
      </div>
      </div>
      {log && <Food key={log.n} bare open={log.what} nutrition={store.nutrition} setNutrition={store.setNutrition} profile={store.profile} setProfile={store.setProfile} />}
    </div>
  )
}

// A plan you're partway through today, in yellow: what, how far, Continue.
function InProgress({ label, name, sub, onClick }) {
  return (
    <div className="rounded-[20px] bg-yellow-400 text-stone-900 p-4 flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-yellow-900">{label}</p>
        <p className="mt-0.5 text-[22px] font-bold">{name}</p>
        <p className="text-sm text-yellow-900">{sub}</p>
      </div>
      <button onClick={onClick} className="h-11 rounded-xl bg-white text-yellow-800 text-base font-bold active:bg-yellow-50">Continue</button>
    </div>
  )
}

// Sun, cloud, rain or snow, in the weather's colors.
function WeatherIcon({ kind }) {
  const cloud = <path d="M7 15h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.3 9 3 3 0 0 0 7 15z" />
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'sun' && <g stroke="#d97706"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g>}
      {kind === 'cloud' && <g stroke="#78716c">{cloud}</g>}
      {kind === 'rain' && <><g stroke="#78716c">{cloud}</g><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2" stroke="#155dfc" /></>}
      {kind === 'snow' && <><g stroke="#78716c">{cloud}</g><path d="M9 19h.01M13 19h.01M17 19h.01" stroke="#57534e" strokeWidth="3" /></>}
    </svg>
  )
}
