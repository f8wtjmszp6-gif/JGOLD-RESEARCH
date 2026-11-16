import { useEffect, useState } from 'react'
import Home from './components/home/Home'
import { resetHomeView } from './utils/homeView'
import MuscleMap from './components/week/MuscleMap'
import WeekCard from './components/week/WeekCard'
import SettingsDrawer, { ProfileRequired, TargetReached } from './components/SettingsDrawer'
import { lastWeight, profileMissing, dayKey } from './utils/nutrition'
import NotificationsSheet from './components/Notifications'
import { notificationsOf } from './utils/notifications'
import TrendsScreen from './components/trends/Trends'
import Food, { ModePill } from './components/food/Food'
import HomeScreen from './components/HomeScreen'
import CalendarSheet from './components/week/CalendarSheet'
import WorkoutDetail from './components/workout/WorkoutDetail'
import { useWorkoutTimer } from './hooks/useWorkoutTimer'
import { useStore } from './store/useStore'
import { calendarWeekOf } from './store/weeks'
import { weekRange, weeksAgo, sameDay } from './utils/days'
import { setSoundMode, setVolume } from './utils/sound'

export default function App() {
  const [workoutId, setWorkoutId] = useState(null)
  // The card to open in it (from a timer's line on Home): { tab, id }.
  const [focus, setFocus] = useState(null)
  // Opened from Activities: back says so, and goes back there.
  const [fromActivities, setFromActivities] = useState(false)
  const [reopenActivities, setReopenActivities] = useState(false)
  // The week Home showed before a workout from another week opened (from
  // Activities); back returns to it.
  const [returnWeek, setReturnWeek] = useState(undefined)
  const [view, setView] = useState(null) // 'trends' | null
  // A lift Trends opens on (from a New best notification).
  const [trendLift, setTrendLift] = useState(null)
  const [settings, setSettings] = useState(false) // true, or a page to open on ('backup')
  // Home, Workout or Food, from the pill at the bottom. The app opens on Home.
  const [mode, setMode] = useState('home')
  // The Weigh in pop-up from a notification, over whatever tab you're on
  // (counts up so each one opens fresh).
  const [weigh, setWeigh] = useState(0)
  // Nutrition's own place: the week its strip shows (null: this one) and the
  // day it shows (null: today), picked from its calendar.
  const [foodAt, setFoodAt] = useState(null)
  const [foodDate, setFoodDate] = useState(null)
  const [calendar, setCalendar] = useState(false)
  const [dayFocus, setDayFocus] = useState(null) // the day picked in the calendar
  const store = useStore()
  const weightNow = lastWeight(store.nutrition)
  const needsProfile = profileMissing(store.profile, weightNow).length > 0
  // Reached your target weight (and not told yet for this target).
  const { goal, targetLb, reachedAt } = store.profile
  const reached = !needsProfile && targetLb != null && weightNow != null && reachedAt !== targetLb &&
    ((goal === 'lose' && weightNow <= targetLb) || (goal === 'gain' && weightNow >= targetLb))

  // The week showing, by its Sunday; null is this week. A saved week shows
  // in the same screens as this one and can be changed there, unless it was
  // saved before weeks kept their details (`week` is null then).
  const [weekStart, setWeekStart] = useState(null)
  const weeks = store.weeks
  const found = weekStart ? weeks.findIndex(w => w.weekStart === weekStart && !w.live) : -1
  const at = found < 0 ? weeks.length - 1 : found
  const past = found >= 0
  const entry = past ? store.history.find(e => calendarWeekOf(e) === weekStart) : null
  const week = past ? store.weekStore(weekStart) : store

  // The running timer, kept here so it keeps going when you leave its
  // workout; it shows there, and on that workout's card on Home.
  const timer = useWorkoutTimer(ws => (ws ? store.weekStore(ws) : store))
  const shownWeek = past ? weekStart : null

  // The bell's sheet, with the ones that were new when it opened.
  const [bell, setBell] = useState(null)
  const notes = notificationsOf(store).filter(n => !store.dismissedNotes.includes(n.id))
  const unread = notes.filter(n => !store.seenNotes.includes(n.id)).map(n => n.id)
  function openBell() {
    setBell({ fresh: unread })
    store.markNotesSeen(notes.map(n => n.id))
  }
  // Following a notification clears it, as if you'd tapped its ✕.
  function act(n) {
    store.dismissNote(n.id)
    setBell(null)
    // Anything that lands on a Fitness page switches the pill to Fitness.
    if (['week', 'trends', 'plan'].includes(n.run)) setMode('workout')
    if (n.run === 'week') setWeekStart(n.weekStart)
    if (n.run === 'backup') setSettings('backup')
    if (n.run === 'targets') setSettings('targets')
    if (n.run === 'weigh') setWeigh(w => w + 1)
    if (n.run === 'trends') { setTrendLift(n.lift ?? null); setView('trends') }
    if (n.run === 'plan') { setWeekStart(null); setFocus(null); setWorkoutId(n.plan) }
  }

  // Timer beeps follow the Sound setting.
  useEffect(() => setSoundMode(store.timer.sound), [store.timer.sound])
  useEffect(() => setVolume(store.timer.volume / 100), [store.timer.volume])

  // Coming back after a while (an hour+ away) goes back to Home and today,
  // all of it, as Return to today does, unless a workout is open. A quick
  // trip to another app leaves everything where it was.
  useEffect(() => {
    if (workoutId) return
    let hiddenAt = null
    const back = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 60 * 60 * 1000) {
        setMode('home')
        setWeekStart(null)
        setFoodDate(null); setFoodAt(null)
        setReopenActivities(false); setDayFocus(f => ({ day: new Date().getDay(), n: (f?.n ?? 0) + 1 }))
      }
    }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [workoutId])

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-stone-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {view === 'trends' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TrendsScreen store={store} lift={trendLift} onBack={() => { setTrendLift(null); setView(null) }} />
        </div>
      ) : workoutId ? (
        // The workout drill-in owns the full viewport and brings its own header.
        <div className="flex-1 min-h-0 overflow-hidden">
          <WorkoutDetail key={`${weekStart}-${workoutId}`} workoutId={workoutId} weekStart={shownWeek} focus={focus} store={week} timer={timer} onBack={() => { setFocus(null); setReopenActivities(fromActivities); setFromActivities(false); if (returnWeek !== undefined) { setWeekStart(returnWeek); setReturnWeek(undefined) } setWorkoutId(null) }} />
        </div>
      ) : mode === 'home' ? (
        <HomeScreen store={store} onStart={id => { setWeekStart(null); setFocus(null); setWorkoutId(id) }} />
      ) : mode === 'food' ? (
        <Food
          nutrition={store.nutrition}
          profile={store.profile}
          setNutrition={store.setNutrition}
          date={foodDate}
          header={<TopBar onCalendar={() => setCalendar(true)} onToday={foodDate || foodAt != null ? () => { setFoodDate(null); setFoodAt(null) } : undefined} day={foodDate ?? undefined} onStep={n => {
            // A day back or forward; today goes back to plain today, and the
            // week follows the day (for the calendar).
            const d = new Date(foodDate ?? new Date()); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n)
            const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
            const ws = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`
            const i = weeks.findIndex(w => w.weekStart === ws)
            const today = sameDay(d, new Date())
            setFoodDate(today ? null : d)
            setFoodAt(today || i < 0 || weeks[i].live ? null : i)
          }} />}
        />
      ) : (
        <>
          {past ? (
            <PastHeader weekStart={weeks[at].weekStart} entry={entry} week={week} goals={store.goals} onToday={() => {
              setWeekStart(null)
              setReopenActivities(false); setDayFocus(f => ({ day: new Date().getDay(), n: (f?.n ?? 0) + 1 }))
            }} buttons={{ onTrends: () => setView('trends'), onCalendar: () => setCalendar(true) }} />
          ) : (
            <Header
              onTrends={() => { setTrendLift(null); setView('trends') }}
              onCalendar={() => setCalendar(true)}
              week={store.week}
              stretch={store.stretchWeek}
              cardio={store.cardioWeek}
              store={store}
            />
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Home
              key={dayFocus?.n ?? 0}
              store={week}
              entry={entry}
              weeks={weeks}
              at={at}
              onAt={i => setWeekStart(weeks[i].live ? null : weeks[i].weekStart)}
              onOpenWorkout={(id, f, from, ws) => {
                setFocus(f ?? null); setFromActivities(from === 'activities'); setReopenActivities(false)
                if (ws !== undefined) { setReturnWeek(weekStart); setWeekStart(ws) } else setReturnWeek(undefined)
                setWorkoutId(id)
              }}
              storeOf={ws => (ws ? store.weekStore(ws) : store)}
              reopenActivities={reopenActivities}
              dayFocus={dayFocus}
              timer={timer.active?.weekStart === shownWeek ? timer : null}
            />
          </div>
        </>
      )}

      {/* On the home screens only, not inside a workout or Trends. */}
      {!workoutId && view !== 'trends' && <ModePill mode={mode} onBell={openBell} unread={notes.length > 0} onSettings={() => setSettings(true)} onMode={m => { if (m === 'workout' && mode !== 'workout') resetHomeView(); setMode(m) }} />}
      {calendar && (
        <CalendarSheet
          weeks={weeks}
          at={mode === 'food' ? (foodAt ?? weeks.length - 1) : at}
          daily={mode === 'food'}
          picked={mode === 'food' ? (foodDate ?? new Date()).getDay() : undefined}
          onPick={(w, day) => {
            setCalendar(false)
            // On Nutrition it picks the day Nutrition shows (never past today).
            if (mode === 'food') {
              const [y, m, d] = w.weekStart.split('-').map(Number)
              const date = new Date(y, m - 1, d + day, 12)
              const now = new Date()
              setFoodAt(w.live ? null : weeks.indexOf(w))
              setFoodDate(sameDay(date, now) || date > now ? null : date)
              return
            }
            setWeekStart(w.live ? null : w.weekStart)
            setReopenActivities(false); setDayFocus(f => ({ day, n: (f?.n ?? 0) + 1 }))
          }}
          onClose={() => setCalendar(false)}
        />
      )}
      {weigh > 0 && <Food key={weigh} bare open="weigh" nutrition={store.nutrition} setNutrition={store.setNutrition} profile={store.profile} />}
      {settings && <SettingsDrawer store={store} page={settings === true ? null : settings} onClose={() => setSettings(false)} />}
      {bell && <NotificationsSheet notes={notes} fresh={bell.fresh} onAction={act} onDismiss={store.dismissNote} onClose={() => setBell(null)} />}
      {reached && (
        <TargetReached lb={weightNow} target={targetLb}
          onMaintain={() => store.setProfile({ goal: 'maintain', reachedAt: targetLb })}
          onNewTarget={() => { store.setProfile({ reachedAt: targetLb }); setSettings('targets') }}
          onLater={() => store.setProfile({ reachedAt: targetLb })} />
      )}
      {/* Personal info, whenever any of it's missing: over everything. */}
      {needsProfile && (
        <ProfileRequired profile={store.profile} lastLb={weightNow} onSave={(p, lb) => {
          store.setProfile(p)
          if (lb !== weightNow) store.setNutrition(x => ({ ...x, weights: { ...x.weights, [dayKey()]: lb } }))
        }} />
      )}
    </div>
  )
}

function Header({ onTrends, onCalendar, week, stretch, cardio, store }) {
  const logged = { class: store.classes.length, cardio: store.otherCardio.length + store.sports.length }
  return (
    <div className="shrink-0 px-5 pt-5">
      <TopBar onTrends={onTrends} onCalendar={onCalendar} />
      <div className="mt-4">
        {/* This week's body map sits in the card's title line. */}
        <WeekCard week={week} stretch={stretch} cardio={cardio} goals={store.goals} figure={<MuscleMap store={store} />} live logged={logged} joined />
      </div>
    </div>
  )
}

// The date, the lettered week and the round buttons: the same on Fitness
// and Nutrition.
// A past week's title (Fitness and Nutrition): its dates and how long ago.
function DayTitle({ day, arrows }) {
  const ago = Math.round((new Date().setHours(12, 0, 0, 0) - new Date(day).setHours(12, 0, 0, 0)) / 864e5)
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <h1 className="min-w-0 truncate text-[34px] leading-[1.05] font-bold text-stone-900 tracking-tight whitespace-nowrap">{day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h1>
        {arrows}
      </div>
      <p className="text-sm text-stone-500 mt-1 whitespace-nowrap">{ago === 1 ? 'Yesterday' : `${ago} days ago`}</p>
    </div>
  )
}

function PastTitle({ weekStart }) {
  return (
    <div className="min-w-0">
      {/* A week across two months has a longer name: smaller, so it fits beside the buttons. */}
      <h1 className={`${weekRange(weekStart).split(' ').length > 4 ? 'text-[22px]' : 'text-[30px]'} leading-[33px] font-bold text-stone-900 tracking-tight whitespace-nowrap truncate`}>{weekRange(weekStart)}</h1>
      <p className="text-sm text-stone-500 mt-0.5">{weeksAgo(weekStart)}</p>
    </div>
  )
}

// `day` (Nutrition, which is by the day): an earlier day is showing,
// titled with its date and, under it, its weekday and how long ago.
// `onStep(n)` (Nutrition): ‹ › beside the date go back or forward a day,
// never past today.
export function TopBar({ onTrends, onCalendar, onToday, day, onStep }) {
  const arrow = (n, path) => (
    <button onClick={() => onStep(n)} disabled={n > 0 && !day} aria-label={n < 0 ? 'Day before' : 'Day after'} className="shrink-0 w-7 h-9 rounded-lg flex items-center justify-center text-stone-400 active:bg-stone-100 disabled:opacity-30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
    </button>
  )
  const arrows = onStep && <span className="shrink-0 flex items-center">{arrow(-1, 'M15 18l-6-6 6-6')}{arrow(1, 'M9 18l6-6-6-6')}</span>
  return (
    <div className="flex items-center justify-between gap-3">
      {day ? <DayTitle day={day} arrows={arrows} /> : <div className="min-w-0">
        <div className="flex items-center gap-1">
          <h1 className="text-[34px] leading-[1.05] font-bold text-stone-900 tracking-tight whitespace-nowrap">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h1>
          {arrows}
        </div>
      </div>}
      <HeaderButtons onTrends={onTrends} onCalendar={onCalendar} onToday={onToday} />
    </div>
  )
}

// The round buttons at the top right. On a past week, Return to today comes
// first, before the calendar.
function HeaderButtons({ onTrends, onCalendar, onToday }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {onToday && (
        <HeaderBtn onClick={onToday} label="Return to today">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </HeaderBtn>
      )}
      {/* Pick any day to jump to its week. */}
      <HeaderBtn onClick={onCalendar} label={onTrends ? 'Jump to a week' : 'Jump to a day'} text={onTrends ? 'Week' : 'Day'}><CalendarIcon /></HeaderBtn>
      {onTrends && <HeaderBtn onClick={onTrends} label="Trends" text="Trends">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19h16" />
          <polyline points="5 15 10 10 13 13 19 7" />
          <polyline points="15 7 19 7 19 11" />
        </svg>
      </HeaderBtn>}
    </div>
  )
}

// A saved week: its dates, how long ago, and a way back to today. Its card
// shows the week as it ended, with what was left to go. Weeks saved before
// their details were kept show their totals only.
function PastHeader({ weekStart, entry, week, goals, onToday, buttons }) {
  return (
    <div className="shrink-0 px-5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <PastTitle weekStart={weekStart} />
        <HeaderButtons {...buttons} onToday={onToday} />
      </div>
      <div className="mt-3">
        {week ? (
          <WeekCard week={entry.week} stretch={entry.stretch} cardio={entry.cardio} goals={goals} figure={<MuscleMap store={week} />} live ended logged={{ class: week.classes.length, cardio: week.otherCardio.length + week.sports.length }} joined />
        ) : (
          <WeekCard week={entry.week} stretch={entry.stretch} cardio={entry.cardio} goals={goals} logged={entry.classes ? { class: entry.classes.length } : undefined} title="Totals" joined />
        )}
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

// `text`: a word beside the icon (Fitness has room for them).
function HeaderBtn({ onClick, label, text, disabled, dot, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`relative h-10 rounded-xl bg-white shadow-sm flex items-center justify-center gap-1.5 text-stone-500 active:bg-stone-100 transition-colors disabled:opacity-40 ${text ? 'px-3' : 'w-10'}`}
    >
      {children}
      {text && <span className="text-sm font-semibold text-stone-600">{text}</span>}
      {dot && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
    </button>
  )
}
