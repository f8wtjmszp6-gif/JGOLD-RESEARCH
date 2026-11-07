// A log sheet's main button. (Logging on a rest day takes the rest day
// away: see settleRest.)
export function LogButton({ disabled, onSave, children }) {
  return (
    <button
      onClick={onSave}
      disabled={disabled}
      className="w-full px-4 truncate py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400"
    >
      {children}
    </button>
  )
}
