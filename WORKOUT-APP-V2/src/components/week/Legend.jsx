import { TABS } from '../../utils/dayKinds'

// What each day dot's color means.
export default function Legend() {
  return (
    <div className="flex justify-center gap-x-3.5 text-[11px] text-stone-500">
      {TABS.map(([k, label, dot]) => (
        <span key={k} className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
