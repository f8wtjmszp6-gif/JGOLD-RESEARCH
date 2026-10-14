import { useState } from 'react'
import { workouts, GYM_ORDER, activities, STRETCH_ROUTINE } from '../../data/workout'
import WeekStrip from '../week/WeekStrip'
import { dayLabel, inDayOrder } from '../../utils/days'
import { ClassCard, RoutineCard, WorkoutCard, ActivityCard } from './cards'
import { LineButton, CardioLine, StretchLine } from './lines'
import { LogClassSheet, AddCardioSheet, RestSheet, AddStretchSheet } from './logSheets'
import { WhatCountsSheet } from './WhatCountsSheet'
import { CoolDownCard, CoolDownSheet } from './coolDown'
import { FullBodyCard, FullBodySheet } from './fullBody'

// The homepage shows one group at a time, picked by these tabs. The last tab
// you used is remembered on this device.
const TABS = [['gym', 'Gym'], ['cardio', 'Cardio'], ['stretch', 'Stretch'], ['rest', 'Rest']]
const TAB_KEY = 'workout-v2-home-tab'
function savedTab() {
  try {
    const t = localStorage.getItem(TAB_KEY)
    return TABS.some(([id]) => id === t) ? t : 'gym'
  } catch {
    return 'gym'
  }
}

// `store` is the week showing (this one or a saved one), or null for a week
// saved before weeks kept their details: then `entry` has its totals only.
export default function Home({ store, entry, weeks, at, onAt, onOpenWorkout }) {
  const [tab, setTabState] = useState(savedTab)
  const [showCounts, setShowCounts] = useState(false)
  function setTab(t) {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // Private browsing: the tab just isn't remembered.
    }
  }
  // The open sheet: { type: 'class' | 'walk' | 'other' | 'stretch', edit? },
  // where `edit` is { index, entry } when changing something already logged.
  // It belongs to the week it was opened in, so changing weeks closes it.
  const [opened, setSheet] = useState(null)
  const sheet = opened?.at === at ? opened : null
  const open = (type, edit) => setSheet({ type, edit, at })
  const close = () => setSheet(null)
  const byId = id => activities.find(a => a.id === id)
  const strip = (
    <div className="shrink-0 px-5 pb-3">
      <WeekStrip weeks={weeks} at={at} onAt={onAt} />
    </div>
  )
  if (!store) return (
    <div className="h-full flex flex-col">
      {strip}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-6">
        <OldWeek entry={entry} />
      </div>
    </div>
  )
  const walk = byId('walk')
  const walks = store.walks
  const other = store.otherCardio
  const otherMinutes = store.getCardioMinutes('other')
  const sports = store.sports

  return (
    <div className="h-full flex flex-col">
      {/* The tabs stay put; only what's under them scrolls. */}
      {strip}
      <div className="shrink-0 px-5 pb-3 flex items-center gap-2">
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

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-6">
        {tab === 'gym' && <>
          <Section title="Workout plans">
            {GYM_ORDER.map(id => (
              <WorkoutCard
                key={id}
                workout={workouts[id]}
                progress={store.workoutProgress(id)}
                stretches={store.getStretches(id)}
                stretchesDone={store.getStretches(id).filter(x => store.getStretchDone(id, x.id)).length}
                onOpen={() => onOpenWorkout(id)}
              />
            ))}
          </Section>

          {/* For weeks the four won't fit: asks gym or home first. */}
          <Section title="Full body">
            <FullBodyCard store={store} onOpen={id => (id ? onOpenWorkout(id) : open('full'))} />
          </Section>

          <Section title="Gym class">
            <ClassCard store={store} activity={byId('class')} onAdd={() => open('class')} onEdit={edit => open('class', edit)} />
          </Section>
        </>}

        {tab === 'cardio' && (
          <Section title="Cardio">
            {/* Each walk is logged with its own length: + asks how long. */}
            <ActivityCard
              activity={walk}
              icon="walk"
              count={walks.length}
              detail={walks.length ? `${walks.length} ${walks.length === 1 ? walk.one : walk.many} · ${store.getCardioMinutes('walk')} min` : undefined}
              onAdd={() => open('walk')}
              onRemove={() => store.removeActivity('walk')}
            >
              {walks.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(walks).map(e => <CardioLine key={e.index} session={e.entry} showWorkout={false} onEdit={() => open('walk', e)} />)}
                </div>
              )}
            </ActivityCard>
            <ActivityCard
              activity={OTHER_CARDIO}
              icon="cardio"
              count={other.length}
              detail={other.length ? `${other.length} ${other.length === 1 ? 'session' : 'sessions'} · ${otherMinutes} min` : undefined}
              onAdd={() => open('other')}
              onRemove={store.removeOtherCardio}
            >
              {other.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(other).map(e => <CardioLine key={e.index} session={e.entry} onEdit={() => open('other', e)} />)}
                </div>
              )}
            </ActivityCard>
            {/* Games and hikes, each with what it was. */}
            <ActivityCard
              activity={SPORTS_CARD}
              icon="sport"
              count={sports.length}
              detail={sports.length ? `${sports.length} ${sports.length === 1 ? 'session' : 'sessions'} · ${store.getCardioMinutes('sport')} min` : undefined}
              onAdd={() => open('sport')}
              onRemove={store.removeSport}
            >
              {sports.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(sports).map(e => <CardioLine key={e.index} session={e.entry} onEdit={() => open('sport', e)} />)}
                </div>
              )}
            </ActivityCard>
          </Section>
        )}

        {tab === 'stretch' && (
          <Section title="Stretching">
            <RoutineCard store={store} onOpen={() => onOpenWorkout(STRETCH_ROUTINE.id)} />
            <CoolDownCard store={store} onOpen={id => (id ? onOpenWorkout(id) : open('cool'))} />
            <ActivityCard
              activity={OWN_STRETCH}
              icon="stretch"
              count={store.ownStretches.length}
              detail={store.ownStretches.length ? ownDetail(store.ownStretches) : undefined}
              onAdd={() => open('stretch')}
              onRemove={store.removeOwnStretch}
            >
              {store.ownStretches.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(store.ownStretches).map(e => <StretchLine key={e.index} session={e.entry} onEdit={() => open('stretch', e)} />)}
                </div>
              )}
            </ActivityCard>
          </Section>
        )}

        {tab === 'rest' && (
          <Section title="Rest">
            {/* + asks which day; each rest day is listed, tap one to move it. */}
            <ActivityCard
              activity={byId('rest')}
              icon="rest"
              count={store.restDays.length}
              onAdd={() => open('rest')}
              onRemove={() => store.removeActivity('rest')}
            >
              {store.restDays.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(store.restDays.map(at => ({ at }))).map(e => (
                    <LineButton key={e.index} label={`${dayLabel(e.entry.at)} rest day`} onEdit={() => open('rest', e)}>
                      <span className="w-12 font-semibold text-stone-600">{dayLabel(e.entry.at)}</span>
                      <span className="text-stone-500">Rest day</span>
                    </LineButton>
                  ))}
                </div>
              )}
            </ActivityCard>
          </Section>
        )}

      </div>

      {showCounts && <WhatCountsSheet tab={tab} onClose={() => setShowCounts(false)} />}
      {sheet?.type === 'other' && <AddCardioSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'stretch' && <AddStretchSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'class' && <LogClassSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'cool' && <CoolDownSheet store={store} onPick={id => { close(); onOpenWorkout(id) }} onClose={close} />}
      {sheet?.type === 'full' && <FullBodySheet store={store} onPick={id => { close(); onOpenWorkout(id) }} onClose={close} />}
      {sheet?.type === 'rest' && <RestSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'walk' && <AddCardioSheet kind="walk" store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'sport' && <AddCardioSheet kind="sport" store={store} edit={sheet.edit} onClose={close} />}
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

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2 px-1">{title}</p>
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

// "2 sessions · 45 min" (sessions logged before lengths were asked add none).
function ownDetail(list) {
  const total = list.reduce((n, x) => n + (x.minutes ?? 0), 0)
  return `${list.length} ${list.length === 1 ? 'session' : 'sessions'}${total ? ` · ${total} min` : ''}`
}
