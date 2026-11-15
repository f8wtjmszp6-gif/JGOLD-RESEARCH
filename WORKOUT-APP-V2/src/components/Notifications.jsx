import { SettingsSheet } from './ui/Sheet'

const ICONS = {
  week: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  goals: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.8 2.8L16.5 9.5" /></>,
  pr: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7l-.8-3h-5.4z" /></>,
  next: <><path d="M5 12h12M13 7l5 5-5 5" /></>,
  weight: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 9.5a4 4 0 0 1 6 0L12 12" /></>,
  targets: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  backup: <><path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A4 4 0 0 1 17.5 18" /><path d="M12 12v8M9 15l3-3 3 3" /></>,
}

// Which part of the app each kind is about, in the order they're listed.
const GROUPS = [
  ['Fitness', ['goals', 'pr', 'week', 'next']],
  ['Nutrition', ['weight', 'targets']],
  ['App', ['backup']],
]

// The bell's page (full screen), grouped by Fitness, Nutrition and App: each notification with what to do about it, and ✕ to
// clear it. `fresh` are the ones that were new when you opened it; they keep
// a dot while it's open.
export default function NotificationsSheet({ notes, fresh, onAction, onDismiss, onClose }) {
  return (
    <SettingsSheet title="Notifications" full onClose={onClose} action={notes.length > 0 && (
      // Clears every one at once, as if you'd tapped each ✕.
      <button onClick={() => notes.forEach(n => onDismiss(n.id))} className="ml-auto mr-2 shrink-0 h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Clear all</button>
    )}>
      {notes.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-6">You’re all caught up.</p>
      ) : (
        <div className="space-y-5">
          {GROUPS.map(([label, icons]) => [label, notes.filter(n => icons.includes(n.icon))]).filter(([, list]) => list.length).map(([label, list]) => (
        <div key={label} className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-500">{label}</p>
          {list.map(n => (
            <div key={n.id} className="flex gap-3 rounded-2xl bg-stone-50 px-4 py-3.5">
              <span className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-500 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[n.icon]}</svg>
              </span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="font-semibold text-stone-900 flex items-center gap-2">
                  {fresh.includes(n.id) && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-label="New" />}
                  {n.title}
                </p>
                {n.body && <p className="text-sm text-stone-500 leading-relaxed">{n.body}</p>}
                {n.action && <button onClick={() => onAction(n)} className="text-sm font-semibold text-accent-500 active:opacity-60">{n.action} ›</button>}
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                aria-label={`Dismiss ${n.title}`}
                className="w-8 h-8 -mr-2 -mt-1.5 shrink-0 rounded-lg text-stone-400 flex items-center justify-center active:bg-stone-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
          ))}
        </div>
      )}
    </SettingsSheet>
  )
}
