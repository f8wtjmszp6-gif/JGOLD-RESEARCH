// The food side of the app, picked from the pill at the bottom. Nothing to
// track yet.
export default function Food() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-24">
      <div className="pt-5 pb-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Nutrition</h1>
      </div>
      <div className="rounded-2xl bg-white shadow-sm border border-stone-100 px-4 py-8 text-center">
        <p className="text-base font-medium text-stone-700">Coming soon</p>
      </div>
    </div>
  )
}

// Floats at the bottom of the home screen: Fitness or Nutrition.
export function ModePill({ mode, onMode }) {
  const tab = on => `flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold transition-colors ${on ? 'bg-stone-900 text-white' : 'text-stone-500 active:bg-stone-100'}`
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div role="tablist" className="pointer-events-auto flex gap-1 p-1 rounded-full bg-white/95 backdrop-blur shadow-lg border border-stone-200/70">
        <button role="tab" aria-selected={mode === 'workout'} onClick={() => onMode('workout')} className={tab(mode === 'workout')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg>
          Fitness
        </button>
        <button role="tab" aria-selected={mode === 'food'} onClick={() => onMode('food')} className={tab(mode === 'food')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7c-1.5-1-3.5-1.3-5-.5C4.5 7.8 4 11 5 14c1 3 3 6 5 6 .8 0 1.3-.4 2-.4s1.2.4 2 .4c2 0 4-3 5-6 1-3 .5-6.2-2-7.5-1.5-.8-3.5-.5-5 .5z" /><path d="M12 7c0-2 1-3.5 3-4" /></svg>
          Nutrition
        </button>
      </div>
    </div>
  )
}
