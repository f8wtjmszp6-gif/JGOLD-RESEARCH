import { useState } from 'react'
import WeeklySchedule from './components/WeeklySchedule'
import DayDetail from './components/DayDetail'
import ProgramView from './components/ProgramView'
import { useStore } from './hooks/useStore'
import { schedule } from './data/workout'

const HERO = `${import.meta.env.BASE_URL}workout-hero-image.jpg`

export default function App() {
  const [screen, setScreen] = useState('home')
  const [selectedDay, setSelectedDay] = useState(null)
  const store = useStore()

  function openDay(day) {
    setSelectedDay(day)
    setScreen('day')
  }

  // Setup and the day drill-in each own the full viewport and bring their own header.
  const showChrome = store.startDate && screen !== 'day'

  return (
    <div
      className="flex flex-col flex-1 min-h-0 bg-stone-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {showChrome && (
        <>
          <Hero
            title={screen === 'program' ? '12-Week Program' : 'My Workouts'}
            subtitle={
              screen === 'program'
                ? 'Tap a week to set it as current'
                : `Week ${store.currentWeek} of 12`
            }
          />

          <div className="shrink-0 px-5 pb-3">
            <div className="bg-stone-100 rounded-xl p-1 flex">
              <TabBtn active={screen === 'home'} onClick={() => setScreen('home')}>
                Schedule
              </TabBtn>
              <TabBtn active={screen === 'program'} onClick={() => setScreen('program')}>
                Program
              </TabBtn>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {screen === 'home' && (
          <WeeklySchedule onSelectDay={openDay} store={store} />
        )}
        {screen === 'day' && selectedDay && (
          <DayDetail
            day={selectedDay}
            dayData={schedule[selectedDay]}
            store={store}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'program' && (
          <ProgramView store={store} />
        )}
      </div>
    </div>
  )
}

function Hero({ title, subtitle }) {
  return (
    <div className="relative h-48 shrink-0 overflow-hidden">
      <img src={HERO} className="w-full h-full object-cover" alt="" draggable={false} />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 20%, #fafaf9 100%)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{title}</h1>
        <p className="text-stone-500 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
      }`}
    >
      {children}
    </button>
  )
}
