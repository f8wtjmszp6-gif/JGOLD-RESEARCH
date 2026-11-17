import { useState } from 'react'
import { weekDays, dayLabel } from '../../utils/days'

import { NUTRIENTS, goalsOf, dayOf, dayKey, mealNow, dayTotal, mealTotal, entryTotal, num, newId, lastWeight, lastWeighDay, foodsOf, lookedOf } from '../../utils/nutrition'
import { Numbers, MealSwitch, Card } from './parts'
import { targetProgress, earliestDate } from '../../utils/targets'
import { SettingsSheet } from '../ui/Sheet'
import { GoalFields } from '../SettingsDrawer'
import Scanner from './Scanner'
import { sameCode } from '../../utils/barcode'
import { AddFoodSheet, HowMuchSheet, MissingSheet, NewFoodSheet, EntrySheet, LogSheet, MyFoodsSheet, WaterSheet, WeighInSheet, WeightSheet, GoalsSheet } from './sheets'

// The food side of the app, picked from the pill at the bottom: today's
// numbers against your goals, water, body weight, and what you ate by meal.
// `open`: start with one open (from Home or a notification): 'food' (Add
// food), 'water' or 'weigh' (today's weigh-in).
// `bare`: only the pop-ups, over another screen (Home's + Food, + Water and
// Weigh in); nothing shows once they're closed. Food goes to the meal for
// the time of day.
export default function Food({ nutrition: n, setNutrition, profile, setProfile, header, date, open, bare = false }) {
  const [meal, setMeal] = useState(() => (bare ? mealNow() : 'breakfast'))
  const [adding, setAdding] = useState(open === 'food')
  const [sheet, setSheet] = useState(() => (open === 'weigh' ? { type: 'weigh', key: dayKey(), date: new Date() } : open === 'water' ? { type: 'water' } : open === 'weight' || open === 'goal' || open === 'goals' ? { type: open } : null))
  // The day showing: today, or one picked from the calendar.
  const key = dayKey(date ?? new Date())
  const day = dayOf(n, key)
  const goals = goalsOf(n)

  // ── Changes ──────────────────────────────────────────────────────────────
  const setDay = fn => setNutrition(x => ({ ...x, days: { ...x.days, [key]: fn(x.days?.[key] ?? {}) } }))
  const setMealList = (m, fn) => setDay(d => ({ ...d, [m]: fn(d[m] ?? []) }))
  function logFood(food, servings) {
    setMealList(meal, l => [...l, { id: newId(), foodId: food.id, name: food.name, serving: food.serving, per: food.per, servings, looked: lookedOf(food) }])
  }
  function saveFood(food) {
    setNutrition(x => ({ ...x, foods: [...(x.foods ?? []), food] }))
  }
  function setWeight(k, lb) {
    setNutrition(x => {
      const weights = { ...x.weights }
      if (lb == null) delete weights[k]
      else weights[k] = lb
      return { ...x, weights }
    })
  }
  const closeAll = () => { setSheet(null); setAdding(false) }
  // A looked-up food missing a number asks for it first.
  // A food used as an ingredient (the older way, by pointer) leaves its copy
  // in the foods it's in.
  const removeFood = id => setNutrition(x => {
    const gone = (x.foods ?? []).find(f => f.id === id)
    const keep = f => (f.ingredients ? { ...f, ingredients: f.ingredients.map(i => (i.foodId === id ? { food: gone, servings: i.servings } : i)) } : f)
    return { ...x, foods: (x.foods ?? []).filter(f => f.id !== id).map(keep) }
  })
  const editFood = food => setNutrition(x => ({ ...x, foods: (x.foods ?? []).map(f => (f.id === food.id ? food : f)) }))
  const pickFood = food => setSheet({ type: food.missing?.length ? 'missing' : 'howMuch', food })

  // ── Body weight ──────────────────────────────────────────────────────────
  const shown = date ?? new Date()
  const days = weekDays(shown)
  const weighIn = (k, date) => setSheet({ type: 'weigh', key: k, date })

  const total = dayTotal(day)
  const water = day.water ?? []
  const drunk = water.reduce((t, oz) => t + oz, 0)
  const list = day[meal] ?? []

  // Everything that pops up over Nutrition. `bare` (on Home): only these.
  const sheets = (
    <>
        {adding && !sheet && (
          <AddFoodSheet n={n} meal={meal} onMeal={setMeal} onPick={pickFood} onNew={() => setSheet({ type: 'new' })} onScan={() => setSheet({ type: 'scan' })} onMine={() => setSheet({ type: 'mine' })} onClose={() => setAdding(false)} />
        )}
        {/* A scanned food goes straight to how much (one you've saved is
            reused); one nobody has opens New food to type its label in. */}
        {sheet?.type === 'mine' && (
          <MyFoodsSheet n={n} meal={meal} onLog={food => setSheet({ type: 'howMuch', food })} onRemove={removeFood} onEdit={editFood} onClose={() => setSheet(null)} />
        )}
        {sheet?.type === 'scan' && (
          <Scanner
            onFound={food => pickFood(foodsOf(n).find(f => sameCode(f.barcode, food.barcode)) ?? food)}
            onNotFound={code => setSheet({ type: 'new', note: `Barcode ${code} wasn’t found. Enter it from the label.` })}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === 'missing' && <MissingSheet food={sheet.food} onDone={food => setSheet({ type: 'howMuch', food })} onClose={() => setSheet(null)} />}
        {sheet?.type === 'howMuch' && (
          <HowMuchSheet food={sheet.food} meal={meal} onAdd={s => {
            logFood(sheet.food, s); closeAll()
          }} onClose={() => setSheet(null)} />
        )}
        {sheet?.type === 'new' && (
          <NewFoodSheet n={n} meal={meal} note={sheet.note} onEditFood={editFood} onRemoveFood={removeFood} onAdd={({ food, save, servings }) => {
            if (save) saveFood(food)
            logFood(save ? food : { ...food, id: undefined }, servings)
            closeAll()
          }} onClose={() => setSheet(null)} />
        )}
        {sheet?.type === 'entry' && (() => {
          const e = list.find(x => x.id === sheet.id)
          if (!e) return null
          return (
            <EntrySheet
              entry={e}
              onServings={s => setMealList(meal, l => l.map(x => (x.id === e.id ? { ...x, servings: s } : x)))}
              onRemove={() => { setMealList(meal, l => l.filter(x => x.id !== e.id)); setSheet(null) }}
              onClose={() => setSheet(null)}
            />
          )
        })()}
        {sheet?.type === 'log' && (
          <LogSheet onFood={() => { setSheet(null); setAdding(true) }} onWater={() => setSheet({ type: 'water' })} onWeight={() => weighIn(key, shown)} onClose={() => setSheet(null)} />
        )}
        {sheet?.type === 'water' && <WaterSheet onAdd={oz => { setDay(d => ({ ...d, water: [...(d.water ?? []), oz] })); setSheet(null) }} onClose={() => setSheet(null)} />}
        {/* Just your goal, target weight and date, from the body weight card. */}
        {sheet?.type === 'goal' && (
          <SettingsSheet title="Goal" onClose={() => setSheet(null)}>
            <GoalFields profile={profile} lb={lastWeight(n)} lbDay={lastWeighDay(n)} onChange={setProfile} />
          </SettingsSheet>
        )}
        {sheet?.type === 'weight' && <WeightSheet n={n} days={days} onDay={(k, date) => weighIn(k, date)} onClose={() => setSheet(null)} />}
        {sheet?.type === 'weigh' && (
          <WeighInSheet
            title={sheet.key === dayKey() ? 'Weigh in' : sheet.date.toLocaleDateString('en-US', { weekday: 'long' })}
            initial={n.weights?.[sheet.key] ?? null}
            onSave={lb => { setWeight(sheet.key, lb); setSheet(null) }}
            onRemove={n.weights?.[sheet.key] != null ? () => { setWeight(sheet.key, null); setSheet(null) } : undefined}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.type === 'goals' && (
          <GoalsSheet goals={goals} lb={lastWeight(n)} profile={profile} onSet={(k, v) => setNutrition(x => ({ ...x, goals: { ...goalsOf(x), [k]: v } }))} onSetAll={all => setNutrition(x => ({ ...x, goals: { ...goalsOf(x), ...all } }))} onClose={() => setSheet(null)} />
        )}
    </>
  )
  if (bare) return sheets

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* The header, today's numbers and the meal switch stay put; only the
          meal under them scrolls. */}
      <div className="shrink-0 px-5 pt-5 pb-3 flex flex-col gap-3">
        {header}
        {/* Today's numbers as lines, in label order; fiber and added sugar are
            part of carbs, so they sit under it. Green: a goal to reach.
            Amber: a limit. Grey: a guide. */}
        {/* Tap it to change your goals. */}
        {/* One card: the numbers (tap them for Targets), then water, then body
            weight, a line between each. */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <button onClick={() => setSheet({ type: 'goals' })} aria-label="Targets" className="w-full text-left px-4 pt-3 pb-2.5 flex flex-col gap-2 active:bg-stone-50">
          <NutrientBars total={total} goals={goals} />
        </button>

        {/* Water: the + by the meals adds a glass. */}
        <div className="mx-4 border-t border-stone-100" />
        <div className="px-4 py-2.5 flex flex-col gap-2">
          {/* A bar like the ones above: drunk, the bar, the goal. */}
          <WaterBar drunk={drunk} goal={goals.water} />
        </div>

        {/* Body weight (see BodyWeight). */}
        <div className="mx-4 border-t border-stone-100" />
        <BodyWeight n={n} profile={profile} date={date} onWeights={() => setSheet({ type: 'weight' })} onWeighIn={() => weighIn(key, shown)} onGoal={() => setSheet({ type: 'goal' })} />
        </div>


        {/* Meals, one at a time; the + adds to the one showing. */}
        <div className="flex items-center gap-2">
          <MealSwitch meal={meal} onMeal={setMeal} />
          <button onClick={() => setSheet({ type: 'log' })} aria-label="Log food, water or weight" className="shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm text-accent-500 text-[22px] font-semibold flex items-center justify-center active:bg-stone-100">+</button>
        </div>
      </div>
      {/* The meal: its totals stay put (as the card's top) while its foods
          scroll under them, down behind the bottom bar, with room at the end
          so the last food scrolls clear of it. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-28">
        <Card className="flex flex-col gap-2">
          <div className="sticky top-0 z-[1] -mx-4 -mt-3 px-4 pt-3 pb-1 rounded-t-2xl bg-white"><Numbers n={mealTotal(list)} strip /></div>
          {list.length > 0 && (
            <div className="flex flex-col">
              {list.map((e, i) => (
                <button key={e.id} onClick={() => setSheet({ type: 'entry', id: e.id })} className={`flex flex-col gap-1 py-2 text-left active:opacity-60 ${i ? 'border-t border-stone-100' : ''}`}>
                  <span className="text-sm text-stone-900">{e.name}{e.servings !== 1 && <span className="text-stone-500"> × {e.servings}</span>}</span>
                  <Numbers n={entryTotal(e)} />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {sheets}
    </div>
  )
}

// Today's numbers against your targets: calories left big, with eaten /
// target and a bar; then each of the rest on two lines, its name,
// "32 of 40g" and what's left (or over) above a full-width bar.
export function NutrientBars({ total, goals }) {
  const [cal, ...rest] = NUTRIENTS
  const c = total[cal.key]
  const cg = goals[cal.key]
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[34px] leading-none font-extrabold tracking-[-0.03em] text-stone-900 tabular-nums">{num(Math.abs(cg - c))}</span>
            <span className={`text-[13px] ${c > cg ? 'font-semibold text-red-600' : 'text-stone-600'}`}>calories {c > cg ? 'over' : 'left'}</span>
          </span>
          <span className="text-xs text-stone-500 tabular-nums whitespace-nowrap">{num(c)} / {num(cg)}</span>
        </div>
        <Bar v={c} g={cg} color={barColor(cal, c, cg)} />
      </div>
      <div className="border-t border-stone-100" />
      {rest.map(x => <NumberLine key={x.key} label={x.label} sub={x.sub} v={total[x.key]} g={goals[x.key]} unit={x.unit} color={barColor(x, total[x.key], goals[x.key])} red={overBad(x)} />)}
    </>
  )
}

// A nutrient's bar color: grey with room to spare, amber once you're close
// (90% of the target), red past it. Protein and fiber, which you want to
// reach, stay grey all the way (more is fine).
const MORE_FINE = new Set(['protein', 'fiber'])
const overBad = x => !MORE_FINE.has(x.key)
const barColor = (x, v, g) => (!overBad(x) || v < g * 0.9 ? 'bg-stone-400' : v > g ? 'bg-red-500' : 'bg-amber-400')

function Bar({ v, g, color }) {
  return <span className="w-full h-1.5 rounded-sm bg-stone-200 overflow-hidden flex"><span className={color} style={{ width: `${g ? Math.min(100, (v / g) * 100) : 0}%` }} /></span>
}

// One number on two lines: name, "32 of 40g", what's left ("8g left"; past
// it "5g over", red for a limit), then its bar.
function NumberLine({ label, sub = false, v, g, unit, color, red = false }) {
  const over = v > g
  return (
    <div className={`flex flex-col gap-1 ${sub ? 'pl-3.5' : ''}`}>
      <div className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
        <span className={sub ? 'text-xs text-stone-600' : 'text-[13px] text-stone-700'}>{label}</span>
        <span className="flex-1 text-xs text-stone-500">{num(v)} of {num(g)}{unit}</span>
        <span className={`text-[13px] font-bold ${over && red ? 'text-red-600' : 'text-stone-900'}`}>{num(Math.abs(g - v))}{unit} {over ? 'over' : 'left'}</span>
      </div>
      <Bar v={v} g={g} color={color} />
    </div>
  )
}

// Water as a line like the ones above.
export function WaterBar({ drunk, goal }) {
  return <NumberLine label="Water" v={drunk} g={goal} unit="oz" color="bg-sky-400" />
}

// Body weight, on Nutrition and Home: the day's weight, big (tap to weigh
// in), and, with a target, a bar of how far
// you've come toward it, whether its date still works (On track / Off
// track), and the target and date (tap for the Goal pop-up). The title
// opens every day this week. `date`: the day showing (today without one).
// Without `onWeights` (Home), the title is plain text.
export function BodyWeight({ n, profile, date, onWeights, onWeighIn, onGoal }) {
  const shown = date ?? new Date()
  const isToday = !date
  // A target to head toward (losing or bulking), how far along you are, and
  // whether its date can still be reached at a healthy pace (null: no date).
  const headed = (profile?.goal === 'lose' || profile?.goal === 'gain') && profile.targetLb != null
  const progress = headed ? targetProgress(profile, n) : null
  const earliest = headed && profile.targetDate ? earliestDate(profile, lastWeight(n), lastWeighDay(n)) : null
  const tooSoon = earliest ? profile.targetDate < earliest : null
  const todayLb = n.weights?.[dayKey(shown)] ?? null
  // The day's weight (tap to weigh in): top right, across from the title.
  const weight = (
    <button onClick={onWeighIn} className="shrink-0 flex items-baseline gap-1.5 text-left active:opacity-60">
      {todayLb != null
        ? <span className="text-[13px] font-bold text-stone-900">{todayLb.toFixed(1)} lb</span>
        : <span className="text-[13px] font-bold text-stone-400">Weigh in</span>}
      <span className="text-xs text-stone-500">{isToday ? 'today' : dayOfLabel(shown)}</span>
    </button>
  )
  return (
    <div className="px-4 pt-2.5 pb-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {onWeights
          ? <button onClick={onWeights} className="flex items-center gap-1 text-[13px] text-stone-700 active:opacity-60">
              Body weight
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          : <p className="text-[13px] text-stone-700">Body weight</p>}
        {weight}
      </div>
      {headed && (
        <button onClick={onGoal} className="flex flex-col gap-1 text-left active:opacity-60">
          <span className="w-full h-2 rounded bg-stone-100 overflow-hidden"><span className="block h-full rounded bg-accent-500" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} /></span>
          <span className="w-full flex items-center justify-between gap-2 text-xs text-stone-600 whitespace-nowrap">
            {tooSoon == null ? <span /> : tooSoon
              ? <span className="flex items-center gap-1 font-semibold text-amber-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 6v8M12 18h.01" /></svg>Off track</span>
              : <span className="flex items-center gap-1 font-semibold text-green-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>On track</span>}
            <span className="min-w-0 truncate">Target <b className="text-stone-900">{profile.targetLb.toFixed(1)}</b>{profile.targetDate && ` by ${dayLabel(profile.targetDate)}`}</span>
          </span>
        </button>
      )}
    </div>
  )
}

// "Fri, Nov 13" — a day that isn't today.
const dayOfLabel = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Floats at the bottom of the main screens: Home (a house), Fitness or
// Nutrition, then the bell and settings, which every side shares.
export function ModePill({ mode, onMode, onBell, unread, onSettings }) {
  // A dark pill of icons; the tab you're on turns white and shows its name.
  const icon = 'relative w-11 h-11 rounded-full flex items-center justify-center text-white active:bg-white/15'
  const tab = on => `flex items-center justify-center gap-1.5 h-11 rounded-full text-sm font-bold transition-colors ${on ? 'px-4 bg-white text-stone-900' : 'w-12 text-white active:bg-white/15'}`
  const line = <span className="w-px h-5 self-center mx-0.5 bg-white/30" />
  const TABS = [
    ['home', 'Home', <path key="h" d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />],
    ['workout', 'Fitness', <path key="f" d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />],
    ['food', 'Nutrition', <g key="n"><path d="M12 7c-1.5-1-3.5-1.3-5-.5C4.5 7.8 4 11 5 14c1 3 3 6 5 6 .8 0 1.3-.4 2-.4s1.2.4 2 .4c2 0 4-3 5-6 1-3 .5-6.2-2-7.5-1.5-.8-3.5-.5-5 .5z" /><path d="M12 7c0-2 1-3.5 3-4" /></g>],
  ]
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div role="tablist" className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-stone-900/45 backdrop-blur-sm shadow-lg">
        {TABS.map(([id, label, path]) => (
          <button key={id} role="tab" aria-selected={mode === id} aria-label={label} onClick={() => onMode(id)} className={tab(mode === id)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>
            {mode === id && label}
          </button>
        ))}
        {line}
        {/* Every reminder lives here; a red dot means something new. */}
        <button onClick={onBell} aria-label={unread ? 'Notifications (new)' : 'Notifications'} className={icon}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9z" />
            <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
          </svg>
          {unread && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-stone-800" />}
        </button>
        <button onClick={onSettings} aria-label="Settings" className={icon}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
