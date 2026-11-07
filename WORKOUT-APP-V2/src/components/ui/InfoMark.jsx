import { useState } from 'react'
import { WorkoutMark, EarlyMark, DoneMark, OpenMark } from './Icons'
import { SettingsSheet } from './Sheet'

// What each status mark means, said the same way wherever it shows.
const MARK_INFO = {
  workout: { Icon: WorkoutMark, title: 'Counts as a workout', text: 'This counted toward your workouts this week.' },
  early: { Icon: EarlyMark, title: 'Unfinished', text: 'It wasn’t finished, so it doesn’t count.' },
  done: { Icon: DoneMark, title: 'Done', text: 'Finished in full.' },
  open: { Icon: OpenMark, title: 'Not finished', text: 'Started, but not finished yet.' },
}

// The one way the app explains a symbol: a short sheet with the symbol and
// its name on top, a sentence, and anything more (a list) under it.
export function InfoSheet({ icon, title, text, onClose, children }) {
  return (
    <SettingsSheet title={<span className="flex items-center gap-2">{icon}{title}</span>} onClose={onClose}>
      <p className="text-sm text-stone-600 leading-relaxed">{text}</p>
      {children}
    </SettingsSheet>
  )
}

// A status mark you can tap for what it means. Its tap area is bigger than
// the mark; the negative margin keeps it taking only the mark's room.
export function InfoMark({ kind, className = '-m-1.5' }) {
  const [open, setOpen] = useState(false)
  const { Icon, title, text } = MARK_INFO[kind]
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={title}
        className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center active:bg-stone-100 ${className}`}
      >
        <Icon />
      </button>
      {open && <InfoSheet icon={<Icon />} title={title} text={text} onClose={() => setOpen(false)} />}
    </>
  )
}
