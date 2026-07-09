import { useState } from 'react'
import WeeklySchedule from './components/WeeklySchedule'
import DayDetail from './components/DayDetail'
import ProgramView from './components/ProgramView'
import { useStore } from './hooks/useStore'
import { schedule } from './data/workout'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [selectedDay, setSelectedDay] = useState(null)
  const store = useStore()

  function openDay(day) {
    setSelectedDay(day)
    setScreen('day')
  }

  return (
    <div className="flex flex-col bg-stone-50" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 overflow-hidden">
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

      <nav className="shrink-0 bg-white border-t border-stone-100 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavBtn
          label="Schedule"
          active={screen === 'home' || screen === 'day'}
          onClick={() => setScreen('home')}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <NavBtn
          label="Program"
          active={screen === 'program'}
          onClick={() => setScreen('program')}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </nav>
    </div>
  )
}

function NavBtn({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
        active ? 'text-orange-500' : 'text-stone-400'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
