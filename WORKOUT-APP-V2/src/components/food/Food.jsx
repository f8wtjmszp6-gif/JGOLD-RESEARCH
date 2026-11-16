import { useState } from 'react'
import { weekDays } from '../../utils/days'

import { NUTRIENTS, goalsOf, dayOf, dayKey, mealNow, dayTotal, mealTotal, entryTotal, num, newId, weightWeek, lastWeight, foodsOf, lookedOf } from '../../utils/nutrition'
import { Numbers, MealSwitch, Card } from './parts'
import Scanner from './Scanner'
import { sameCode } from '../../utils/barcode'
import { AddFoodSheet, HowMuchSheet, MissingSheet, NewFoodSheet, EntrySheet, LogSheet, MyFoodsSheet, WaterSheet, GlassSheet, WeighInSheet, WeightSheet, GoalsSheet } from './sheets'

// The food side of the app, picked from the pill at the bottom: today's
// numbers against your goals, water, body weight, and what you ate by meal.
// `open`: start with one open (from Home or a notification): 'food' (Add
// food), 'water' or 'weigh' (today's weigh-in).
// `bare`: only the pop-ups, over another screen (Home's + Food, + Water and
// Weigh in); nothing shows once they're closed. Food goes to the meal for
// the time of day.
export default function Food({ nutrition: n, setNutrition, profile, header, date, open, bare = false }) {
  const [meal, setMeal] = useState(() => (bare ? mealNow() : 'breakfast'))
  const [adding, setAdding] = useState(open === 'food')
  const [sheet, setSheet] = useState(() => (open === 'weigh' ? { type: 'weigh', key: dayKey(), date: new Date() } : open === 'water' ? { type: 'water' } : null))
  // The day showing: today, or one picked from the calendar.
  const key = dayKey(date ?? new Date())
  const isToday = !date
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
  const { avg } = weightWeek(n, days)
  const yesterday = new Date(shown); yesterday.setDate(yesterday.getDate() - 1)
  const todayLb = n.weights?.[key] ?? null
  const yesterdayLb = n.weights?.[dayKey(yesterday)] ?? null
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
        {sheet?.type === 'glass' && (
          <GlassSheet oz={water[sheet.i]} onRemove={() => { setDay(d => ({ ...d, water: (d.water ?? []).filter((_, i) => i !== sheet.i) })); setSheet(null) }} onClose={() => setSheet(null)} />
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
        <button onClick={() => setSheet({ type: 'goals' })} aria-label="Targets" className="w-full text-left px-4 pt-3.5 pb-3 flex flex-col gap-2.5 active:bg-stone-50">
          <NutrientBars total={total} goals={goals} />
        </button>

        {/* Water: each glass shows how much it was (tap to remove); the + by
            the meals adds one. */}
        <div className="mx-4 border-t border-stone-100" />
        <div className="px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
          {/* A bar like the ones above: drunk, the bar, the goal. */}
          <WaterBar drunk={drunk} goal={goals.water} />
          {water.length > 0 && <div className="grid grid-cols-7 gap-1.5">
            {water.map((oz, i) => (
              <button key={i} onClick={() => setSheet({ type: 'glass', i })} aria-label={`Glass ${i + 1}, ${oz} oz`} className="h-11 rounded-[10px] bg-accent-100 text-accent-600 flex flex-col items-center justify-center gap-0.5 active:bg-accent-200">
                <span className="text-[15px] font-bold leading-none">{oz}</span>
                <span className="text-[10px] font-semibold leading-none">oz</span>
              </button>
            ))}
          </div>}
        </div>

        {/* Body weight: today and yesterday, the week's average; the title
            opens every day this week. */}
        <div className="mx-4 border-t border-stone-100" />
        <div className="px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <button onClick={() => setSheet({ type: 'weight' })} className="flex items-center gap-1 text-base font-semibold text-stone-900 active:opacity-60">
              Body weight
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <span className="text-[13px] text-stone-600">Week avg <b className="text-stone-900">{avg != null ? `${avg.toFixed(1)} lb` : '—'}</b></span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* The day before, then the day showing: Yesterday and Today, or
                dated ("Fri, Nov 13") on a past day. */}
            <WeightTile label={isToday ? 'Yesterday' : yesterday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} lb={yesterdayLb} onClick={() => weighIn(dayKey(yesterday), yesterday)} />
            <WeightTile label={isToday ? 'Today' : shown.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} lb={todayLb} onClick={() => weighIn(key, shown)} />
          </div>
        </div>
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

// Today's numbers as lines, in label order (fiber and added sugar indented
// under carbs): amount, bar, target. Green: a goal to reach. Amber: a
// limit (red once over). Grey: a guide. Also on Home.
export function NutrientBars({ total, goals }) {
  return NUTRIENTS.map(x => {
    const v = total[x.key]
    const g = goals[x.key]
    const over = x.kind === 'limit' && v > g
    const color = over ? 'bg-red-500' : x.kind === 'goal' ? 'bg-emerald-400' : x.kind === 'limit' ? 'bg-amber-400' : 'bg-stone-400'
    return (
      <div key={x.key} className="flex items-center gap-2.5">
        <span className={`w-[84px] shrink-0 whitespace-nowrap ${x.sub ? 'pl-3.5 text-xs text-stone-600' : 'text-[13px] text-stone-700'}`}>{x.label}</span>
        {/* Today's amount left of the bar, the target right of it. */}
        <span className="w-[40px] shrink-0 text-right text-[13px] font-bold text-stone-900 tabular-nums whitespace-nowrap">{num(v)}{x.unit}</span>
        <span className="flex-1 h-2 rounded bg-stone-200 overflow-hidden flex"><span className={color} style={{ width: `${g ? Math.min(100, (v / g) * 100) : 0}%` }} /></span>
        <span className="w-[42px] shrink-0 text-[13px] font-medium text-stone-500 tabular-nums whitespace-nowrap">{num(g)}{x.unit}</span>
      </div>
    )
  })
}

// Water as a line like the ones above: drunk, the bar, the goal.
export function WaterBar({ drunk, goal }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[84px] shrink-0 text-[13px] text-stone-700">Water</span>
      <span className="w-[40px] shrink-0 text-right text-[13px] font-bold text-stone-900 tabular-nums whitespace-nowrap">{num(drunk)}oz</span>
      <span className="flex-1 h-2 rounded bg-stone-200 overflow-hidden flex"><span className="bg-sky-400" style={{ width: `${goal ? Math.min(100, (drunk / goal) * 100) : 0}%` }} /></span>
      <span className="w-[42px] shrink-0 text-[13px] font-medium text-stone-500 tabular-nums whitespace-nowrap">{num(goal)}oz</span>
    </div>
  )
}

function WeightTile({ label, lb, onClick }) {
  return (
    // The day and its weight on one line.
    <button onClick={onClick} className="flex-1 min-w-0 bg-stone-50 rounded-xl px-3 py-2.5 flex items-baseline justify-between gap-2 text-left whitespace-nowrap active:bg-stone-100">
      <span className="min-w-0 truncate text-xs text-stone-600">{label}</span>
      <span className={`shrink-0 text-[15px] font-bold ${lb != null ? 'text-stone-900' : 'text-stone-400'}`}>{lb != null ? `${lb.toFixed(1)} lb` : 'Not yet'}</span>
    </button>
  )
}

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
