// The food side of the app, picked from the pill at the bottom. Nothing to
// track yet.
export default function Food() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-24">
      <div className="pt-5 pb-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Food</h1>
      </div>
      <div className="rounded-2xl bg-white shadow-sm border border-stone-100 px-4 py-8 text-center">
        <p className="text-base font-medium text-stone-700">Coming soon</p>
      </div>
    </div>
  )
}

// Floats at the bottom of the home screen: Workout or Food.
export function ModePill({ mode, onMode }) {
  const tab = on => `flex items-center justify-center w-12 h-10 rounded-full text-sm font-semibold transition-colors ${on ? 'bg-stone-900 text-white' : 'text-stone-500 active:bg-stone-100'}`
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div role="tablist" className="pointer-events-auto flex gap-1 p-1 rounded-full bg-white/95 backdrop-blur shadow-lg border border-stone-200/70">
        <button role="tab" aria-selected={mode === 'workout'} onClick={() => onMode('workout')} aria-label="Workout" className={tab(mode === 'workout')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>
        </button>
        <button role="tab" aria-selected={mode === 'food'} onClick={() => onMode('food')} aria-label="Food" className={tab(mode === 'food')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 4-3 8h3" /></svg>
        </button>
      </div>
    </div>
  )
}
