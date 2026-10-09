import { HOWTO, demoUrl } from '../data/howto'

// How to do an exercise or stretch: setup, numbered steps, a tip, the common
// mistake, and a link out to a video demo.
export function HowToBody({ item, kind }) {
  const h = HOWTO[item.id]
  if (!h) return null
  return (
    <div className="space-y-2.5 text-sm text-stone-600 leading-relaxed select-text">
      <p>{h.setup}</p>
      <ol className="space-y-1.5">
        {h.steps.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-accent-50 text-accent-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p><span className="font-semibold text-emerald-700">Tip: </span>{h.tip}</p>
      <p><span className="font-semibold text-orange-700">Avoid: </span>{h.mistake}</p>
      <a
        href={demoUrl(item.name, kind)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-500 active:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
        Watch a demo
      </a>
    </div>
  )
}
