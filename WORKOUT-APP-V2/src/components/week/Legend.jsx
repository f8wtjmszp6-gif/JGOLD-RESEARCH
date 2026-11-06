import { TABS } from '../../utils/dayKinds'

// What each day dot's color means. `className`: where it sits (centered
// unless told otherwise).
export default function Legend({ className = 'justify-center' }) {
  return (
    <div className={`flex gap-x-3.5 text-[11px] text-stone-500 ${className}`}>
      {TABS.map(([k, label, dot]) => (
        <span key={k} className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
