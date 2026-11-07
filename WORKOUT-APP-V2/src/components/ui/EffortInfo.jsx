import { useState } from 'react'
import { InfoIcon } from './glyphs'
import { InfoSheet } from './InfoMark'

// What easy and hard are like for each kind of cardio.
const EFFORT_LIKE = {
  walk: { easy: 'a stroll', hard: 'brisk, uphill' },
  other: { easy: 'a light jog or ride', hard: 'a run, hills, spin' },
  sport: { easy: 'a casual game, a flat trail', hard: 'a competitive match, a steep climb' },
  class: { easy: 'low-impact, a steady ride', hard: 'HIIT, spin, bootcamp' },
  warmup: { easy: 'a brisk walk, an easy ride', hard: 'a jog, an incline walk' },
}

// An ⓘ beside an Easy/Hard choice: tap it for what each means for `kind`.
export function EffortInfo({ kind }) {
  const [open, setOpen] = useState(false)
  const like = EFFORT_LIKE[kind]
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="What easy and hard mean" className="w-7 h-7 -my-1 shrink-0 rounded-lg flex items-center justify-center text-stone-400 active:bg-stone-100">
        <InfoIcon size={16} />
      </button>
      {open && (
        <InfoSheet icon={<InfoIcon size={20} />} title="Effort" text="Hard minutes count double toward your cardio goal." onClose={() => setOpen(false)}>
          <div className="space-y-1 text-sm text-stone-600">
            <p><span className="font-semibold text-stone-900">Easy:</span> {like.easy}</p>
            <p><span className="font-semibold text-stone-900">Hard:</span> {like.hard}</p>
          </div>
        </InfoSheet>
      )}
    </>
  )
}
