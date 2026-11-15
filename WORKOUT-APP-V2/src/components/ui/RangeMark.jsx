// How a goal compares with what's recommended: a green check when it's in
// range, yellow ↑ when it's below (raise it), red ↓ when it's above (lower it).
const COLOR = { ok: 'text-emerald-600', low: 'text-amber-500', high: 'text-red-500' }

export function RangeMark({ state, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={COLOR[state]} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      {state === 'ok' && <path d="M8 12.3l2.8 2.8L16.2 9.5" strokeWidth="2.6" />}
      {state === 'low' && <path d="M12 16.5v-9M8.2 11.2L12 7.4l3.8 3.8" strokeWidth="2.4" />}
      {state === 'high' && <path d="M12 7.5v9M8.2 12.8l3.8 3.8 3.8-3.8" strokeWidth="2.4" />}
    </svg>
  )
}
