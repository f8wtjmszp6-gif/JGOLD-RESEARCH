import { useState } from 'react'
import { workouts, GYM_ORDER, activities, STRETCH_ROUTINE, FULL_BODY_BY_ID, COOL_DOWN_BY_ID, TARGETED } from '../../data/workout'
import WeekStrip from '../week/WeekStrip'
import DaySheet from '../week/DaySheet'
import { ClassCard, RoutineCard, RoutineSheet, WorkoutCard, LogCard } from './cards'
import { LogClassSheet, AddCardioSheet, AddStretchSheet } from './logSheets'
import { WhatCountsSheet } from './WhatCountsSheet'
import { CoolDownCard, CoolDownSheet } from './coolDown'
import { BuildCard, BuildSheet } from './buildWorkout'
import { FullBodyCard, FullBodySheet } from './fullBody'
import { LineMenu } from './lineMenu'
import { Timed } from './timerLine'
import { upNextOf } from '../../utils/upNext'

// The homepage shows one group at a time, picked by these tabs. The tab you
// pick holds while the app is open (in the background too); starting the app
// fresh opens on Gym.
const TABS = [['gym', 'Gym'], ['cardio', 'Cardio'], ['stretch', 'Stretch']]
const TAB_KEY = 'workout-v2-home-tab'
function savedTab() {
  try {
    localStorage.removeItem(TAB_KEY) // where older builds kept it for good
    const t = sessionStorage.getItem(TAB_KEY)
    return TABS.some(([id]) => id === t) ? t : 'gym'
  } catch {
    return 'gym'
  }
}

// `store` is the week showing (this one or a saved one), or null for a week
// saved before weeks kept their details: then `entry` has its totals only.
// `dayFocus`: { day } from the calendar, to start with that day open (App
// remounts Home for each pick).
// On Gym, a switch in the header picks the weekly plans or your own
// workouts (Build a Workout, classes); remembered like the tab.
const GYM_KEY = 'workout-v2-gym-view'
function savedGymView() {
  try {
    return sessionStorage.getItem(GYM_KEY) === 'custom' ? 'custom' : 'plans'
  } catch {
    return 'plans'
  }
}

export default function Home({ store, entry, weeks, at, onAt, onOpenWorkout, dayFocus, timer, reopenActivities = false, storeOf }) {
  // A timer running for one of these workouts shows on its card (see Timed).
  const timing = timer?.active?.workoutId
  // Its card in the workout, opened when you tap the line.
  const focusOf = a => (a.stretchId ? { tab: 'stretches', id: a.stretchId } : { tab: 'exercises', id: a.exercise?.id ?? null })
  const cardOf = id => (FULL_BODY_BY_ID[id] ? 'fullBody' : id === TARGETED.id ? 'build' : COOL_DOWN_BY_ID[id] ? 'cool' : id)
  const timed = (card, children) => (
    <Timed key={card} bar={timing && cardOf(timing) === card ? timer.bar : null} onOpen={() => onOpenWorkout(timing, focusOf(timer.active))}>{children}</Timed>
  )
  const [tab, setTabState] = useState(savedTab)
  const [showCounts, setShowCounts] = useState(false)
  const [gymView, setGymViewState] = useState(savedGymView)
  function setGymView(v) {
    setGymViewState(v)
    try {
      sessionStorage.setItem(GYM_KEY, v)
    } catch {
      // Private browsing: it just isn't remembered.
    }
  }
  const gymSwitch = (
    <div className="flex shrink-0 rounded-full bg-stone-200/70 p-[3px]">
      {[['plans', 'Plans'], ['custom', 'Custom']].map(([v, name]) => (
        <button
          key={v}
          onClick={() => setGymView(v)}
          aria-pressed={gymView === v}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${gymView === v ? 'bg-stone-900 text-white' : 'text-stone-500 active:text-stone-700'}`}
        >
          {name}
        </button>
      ))}
    </div>
  )
  // The day tapped on the strip, shown in the bar under it: today to start.
  // Changing weeks keeps the weekday, but not past today.
  const [picked, setPicked] = useState(dayFocus?.day ?? new Date().getDay())
  const toWeek = i => {
    onAt(i)
    if (weeks[i].live) setPicked(p => Math.min(p, new Date().getDay()))
  }
  const upNext = store && upNextOf(store)
  // Plans in order: unfinished (begun on a day that's over), under way (a
  // set or a stretch ticked), up next, not started, then complete (every
  // set done).
  const rank = id => {
    const { done, total } = store.workoutProgress(id)
    if (total > 0 && done >= total) return 4
    if (store.planEnded(id)) return 0
    if (done > 0 || store.getStretches(id).some(x => store.getStretchDone(id, x.id))) return 1
    return id === upNext?.id ? 2 : 3
  }
  function setTab(t) {
    setTabState(t)
    try {
      sessionStorage.setItem(TAB_KEY, t)
    } catch {
      // Private browsing: the tab just isn't remembered.
    }
  }
  // The open sheet: { type: 'class' | 'walk' | 'other' | 'stretch', edit? },
  // where `edit` is { index, entry } when changing something already logged.
  // It belongs to the week it was opened in, so changing weeks closes it.
  // One opened from another week's line in Activities carries that week
  // (`other`: true, `ws`: its Sunday, null for this week) and works on it
  // there, so Home stays on the week it shows.
  const [opened, setSheet] = useState(null)
  const sheetStore = opened?.other ? storeOf(opened.ws) : store
  // Something logged, by its kind and place in that kind's list.
  const entryOf = (st, kind, index) => ({ class: st?.classes, walk: st?.walks, other: st?.otherCardio, sport: st?.sports, stretch: st?.ownStretches, rest: st?.restDays.map(at => ({ at })) }[kind]?.[index])
  const sheet = opened && (opened.other || opened.at === at) && sheetStore ? opened : null
  const open = (type, edit) => setSheet({ type, edit, at })
  // Another sheet in the same week as the one open (Edit from its menu).
  const openSame = (type, edit) => setSheet(o => ({ type, edit, at, other: o?.other, ws: o?.ws }))
  const close = () => setSheet(null)
  const byId = id => activities.find(a => a.id === id)
  // The day pop-up, opened from Activities on the strip (on today). Tapping a
  // line there opens its workout, or asks what to do with it (over the
  // pop-up), as on the cards.
  // (Back from a workout opened there, it's open again.)
  const [dayOpen, setDayOpen] = useState(reopenActivities)
  // Only that reopening picks up where you left off; opened from the strip
  // it starts on Today.
  const [restoring, setRestoring] = useState(reopenActivities)
  // A line from Activities, in this week or another: what to do with it.
  function editLine(edit, week) {
    const other = !!week && week !== weeks[at]
    const ws = other && !week.live ? week.weekStart : null
    const st = other ? storeOf(ws) : store
    if (!st) return
    const { open: id, menu: kind, index } = edit
    // A workout asks too: open it, change its day, or delete it.
    const item = id ? { kind: 'open', id } : kind === 'session' ? { kind, index } : { kind, index, entry: entryOf(st, kind, index) }
    if (!id && kind !== 'session' && !item.entry) return
    setSheet({ type: 'menu', edit: item, at, other, ws })
  }
  const strip = (
    <div className="shrink-0 px-5 pb-2.5">
      <WeekStrip weeks={weeks} at={at} onAt={toWeek} picked={picked} onPick={setPicked} onActivities={() => setDayOpen(true)} />
      {dayOpen && <DaySheet weeks={weeks} at={at} picked={picked} goals={store?.goals} onEdit={store ? editLine : null} restore={restoring} onRest={store ? () => store.addRest(new Date().toISOString()) : null} onClose={() => { setDayOpen(false); setRestoring(false) }} />}
    </div>
  )
  if (!store) return (
    <div className="h-full flex flex-col">
      {strip}
      <div className={`flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-6`}>
        <OldWeek entry={entry} />
      </div>
    </div>
  )
  const walk = byId('walk')

  return (
    <div className="h-full flex flex-col">
      {/* The tabs stay put; only what's under them scrolls. */}
      {strip}
      <div className="shrink-0 px-5 pb-2.5 flex items-center gap-2">
        <div className="flex-1 bg-stone-100 rounded-xl p-1 flex" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCounts(true)}
          aria-label="What counts toward your goals"
          className="w-10 h-10 rounded-xl bg-white shadow-sm text-stone-400 flex items-center justify-center active:bg-stone-100 shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.6v.1" strokeWidth="2.4" /></svg>
        </button>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-6`}>
        {tab === 'gym' && <>
          {gymView === 'plans' ? <Section title="Workout plans" note="Each plan can be completed once a week" aside={gymSwitch}>
            {/* Under way first, then up next; complete ones last. */}
            {[...GYM_ORDER].sort((a, b) => rank(a) - rank(b)).map(id => timed(id,
              <WorkoutCard
                key={id}
                workout={workouts[id]}
                upNext={id === upNext?.id}
                ended={store.planEnded(id)}
                progress={store.workoutProgress(id)}
                stretches={store.getStretches(id)}
                stretchesDone={store.getStretches(id).filter(x => store.getStretchDone(id, x.id)).length}
                onOpen={() => onOpenWorkout(id)}
              />
            ))}
          </Section> : (
            // Any day, as often as you like: a workout built from full body
            // or just the areas you pick, at the gym or at home, and classes.
            <Section title="Custom workouts" note="Any day, as often as you like" aside={gymSwitch}>
              {timed('fullBody', <FullBodyCard store={store} onOpen={id => (id ? onOpenWorkout(id) : open('fullBody'))} />)}
              {timed('build', <BuildCard store={store} onOpen={id => (id ? onOpenWorkout(id) : open('full'))} />)}
              <ClassCard activity={byId('class')} onAdd={() => open('class')} />
            </Section>
          )}
        </>}

        {tab === 'cardio' && (
          <Section title="Cardio">
            <LogCard activity={walk} icon="walk" sub="Every walk adds to your cardio" onAdd={() => open('walk')} />
            <LogCard activity={OTHER_CARDIO} icon="cardio" sub="Running, cycling, rowing and more" onAdd={() => open('other')} />
            <LogCard activity={SPORTS_CARD} icon="sport" sub="Pickleball, tennis, hikes and more" onAdd={() => open('sport')} />
          </Section>
        )}

        {tab === 'stretch' && (
          <Section title="Stretching">
            {timed(STRETCH_ROUTINE.id, <RoutineCard store={store} onOpen={() => onOpenWorkout(STRETCH_ROUTINE.id)} onAsk={() => open('routine')} />)}
            {timed('cool', <CoolDownCard store={store} onOpen={id => (id ? onOpenWorkout(id) : open('cool'))} />)}
            <LogCard activity={OWN_STRETCH} icon="stretch" sub={OWN_STRETCH.note} onAdd={() => open('stretch')} />
          </Section>
        )}


      </div>

      {showCounts && <WhatCountsSheet tab={tab} onClose={() => setShowCounts(false)} />}
      {sheet?.type === 'other' && <AddCardioSheet store={sheetStore} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'stretch' && <AddStretchSheet store={sheetStore} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'class' && <LogClassSheet store={sheetStore} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'routine' && <RoutineSheet store={store} onStart={() => { close(); onOpenWorkout(STRETCH_ROUTINE.id) }} onClose={close} />}
      {sheet?.type === 'fullBody' && <FullBodySheet store={store} onPick={id => { close(); onOpenWorkout(id) }} onClose={close} />}
      {sheet?.type === 'cool' && <CoolDownSheet store={store} onPick={id => { close(); onOpenWorkout(id) }} onClose={close} />}
      {sheet?.type === 'full' && <BuildSheet store={store} onPick={id => { close(); onOpenWorkout(id) }} onClose={close} />}
      {sheet?.type === 'menu' && <LineMenu store={sheetStore} item={sheet.edit} onEdit={item => openSame(item.kind, { index: item.index, entry: item.entry })} onOpenWorkout={id => { const from = dayOpen ? 'activities' : null; setDayOpen(false); onOpenWorkout(id, null, from, sheet.other ? sheet.ws : undefined) }} onClose={close} />}
      {sheet?.type === 'walk' && <AddCardioSheet kind="walk" store={sheetStore} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'sport' && <AddCardioSheet kind="sport" store={sheetStore} edit={sheet.edit} onClose={close} />}
    </div>
  )
}

// A week saved before weeks kept their details: how far each plan got.
function OldWeek({ entry }) {
  return (
    <Section title="Workout plans">
      <div className="bg-white rounded-2xl shadow-sm px-4 py-3.5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {entry.plans.map(p => <PlanBadge key={p.id} plan={p} />)}
        </div>
        <p className="text-sm text-stone-400 leading-relaxed">
          This week was saved before each week kept everything you did, so only its totals are here and it can’t be changed.
        </p>
      </div>
    </Section>
  )
}

// How far a plan got that week: ✓ finished, 12/21 partway, — not started.
function PlanBadge({ plan }) {
  const name = workouts[plan.id]?.short ?? plan.id
  const complete = plan.total > 0 && plan.done === plan.total
  const style = complete
    ? 'bg-red-50 text-red-700 border-red-200'
    : plan.done > 0
      ? 'bg-white text-stone-700 border-stone-200'
      : 'bg-stone-50 text-stone-400 border-transparent'
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${style}`}>
      {name} {complete ? '✓' : plan.done > 0 ? `${plan.done}/${plan.total}` : '—'}
    </span>
  )
}

// Sports and hikes: pickleball, a long hike, a round of golf.
const SPORTS_CARD = {
  id: 'sport',
  name: 'Sports & Hikes',
  note: 'Hike, pickleball, tennis, golf',
  one: 'session',
  many: 'sessions',
  tile: 'from-lime-50 to-lime-100',
}

// Cardio that isn't a class or a walk: a run, a ride, a swim.
const OTHER_CARDIO = {
  id: 'otherCardio',
  name: 'Cardio Session',
  note: 'Run, bike, swim, elliptical',
  one: 'session',
  many: 'sessions',
  tile: 'from-cyan-50 to-cyan-100',
}

// `note`: a short grey line under the title.
// `aside`: goes at the right of the title and note.
function Section({ title, note, aside, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-3 px-1 mb-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs text-stone-400 uppercase tracking-wider font-medium ${note ? 'mb-0.5' : ''}`}>{title}</p>
          {note && <p className="text-xs text-stone-400">{note}</p>}
        </div>
        {aside}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

// Stretching done outside the app's lists — after a class, at home.
const OWN_STRETCH = {
  id: 'ownStretch',
  name: 'Log a Stretch',
  note: 'Stretched after a class or at home',
  one: 'session',
  many: 'sessions',
  tile: 'from-teal-50 to-teal-100',
}
