import { progressionRules, coreProgression } from '../data/workout'

export default function InfoSheet({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-stone-50 rounded-t-3xl w-full max-w-md max-h-[85dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-stone-900 font-bold text-lg">Progression Rules</h3>
          <button onClick={onClose} className="text-orange-500 text-sm font-semibold active:opacity-70">
            Done
          </button>
        </div>

        <div className="overflow-y-auto px-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          <p className="text-stone-500 text-xs leading-relaxed mb-5">
            The app remembers your weight and reps. When you hit the top of an exercise's rep range,
            bump the weight and drop back to the low end — here's how much to add.
          </p>

          <h4 className="text-stone-900 font-bold text-base mb-3">Weight</h4>
          {progressionRules.map(r => (
            <div key={r.category} className="bg-white shadow-sm rounded-xl p-3 mb-2">
              <p className="text-stone-900 text-sm font-semibold">{r.category}</p>
              <p className="text-stone-400 text-xs mt-0.5">{r.exercises}</p>
              <p className="text-orange-500 text-sm mt-1 font-medium">{r.rule}</p>
            </div>
          ))}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mt-1 mb-6">
            <p className="text-orange-600 text-xs">💡 Barbell upper body adds 2.5 lbs per side — fractional plates recommended</p>
          </div>

          <h4 className="text-stone-900 font-bold text-base mb-3">Core</h4>
          {coreProgression.map(c => (
            <div key={c.exercise} className="bg-white shadow-sm rounded-xl p-3 mb-2">
              <p className="text-stone-900 text-sm font-semibold">{c.exercise}</p>
              <p className="text-stone-500 text-xs mt-1">{c.rule}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
