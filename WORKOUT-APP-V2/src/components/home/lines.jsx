import { TAB_DOT } from '../../utils/dayKinds'

// One part of a line, with its tab's dot: gym, cardio, stretch or rest.
export function Part({ kind, children }) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[kind]}`} />
      {children}
    </span>
  )
}
