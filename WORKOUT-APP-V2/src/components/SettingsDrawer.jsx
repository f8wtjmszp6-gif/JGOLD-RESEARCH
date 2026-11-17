import { useRef, useState } from 'react'
import { useDragToClose } from '../hooks/useDragToClose'
import { GOAL_SETTINGS } from '../data/workout'
import { shareBackup, readBackup, backupAge, usesShareSheet } from '../utils/backup'
import { DefaultsSettings } from './DefaultsSettings'
import { ExerciseBank } from './ExerciseBank'
import { StretchBank } from './StretchBank'
import { SettingsSheet } from './ui/Sheet'
import { InfoSheet } from './ui/InfoMark'
import { InfoIcon } from './ui/glyphs'
import { RangeMark } from './ui/RangeMark'
import { TargetRows, UseAllButton } from './food/sheets'
import { goalsOf, lastWeight, lastWeighDay, ACTIVITY, feetInches, profileMissing } from '../utils/nutrition'
import { fastestPace, paceFor, earliestDate, paceRange } from '../utils/targets'

// App settings, full screen, sliding in from the right (and swiping back out
// to close): your weekly goals (with what the guidelines recommend),
// backups and reset, each a row that opens its own page full screen
// (your plans' defaults among them). Light or dark follows the
// phone.
// `page`: one to open on (Backup, from its notification).
export default function SettingsDrawer({ store, page: start, onClose }) {
  const panel = useRef(null)
  const { offset, dragging, fade } = useDragToClose(panel, onClose, 'x')
  // Every row opens its page full screen over Settings.
  const [page, setPage] = useState(start ?? null)
  return (
    // Dragging on the shade does nothing, and the panel's scroll stops at its
    // ends, so the page behind never moves.
    <div className="fixed inset-0 z-50 touch-none" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-[fade-in_200ms_ease-out]" style={{ opacity: fade }} />
      <aside
        ref={panel}
        role="dialog"
        aria-label="Settings"
        onClick={e => e.stopPropagation()}
        className="absolute inset-0 bg-white overflow-y-auto overscroll-contain touch-pan-y animate-[drawer-in_240ms_ease-out]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <div className="px-5 pb-8 min-h-full flex flex-col gap-6">
          {/* The title stays at the top while the settings scroll under it. */}
          <div
            className="sticky top-0 z-10 bg-white -mx-5 px-5 pb-3 flex items-center justify-between"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
          >
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Settings</h2>
            <button onClick={onClose} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
          </div>

          {/* Grouped by side of the app: Fitness, Nutrition, then the app itself. */}
          <div className="space-y-3">
            <GroupLabel>Profile</GroupLabel>
            <PageRow title="Personal Info" tile="bg-sky-500" icon={ICONS.person} onOpen={() => setPage('personal')} />
          </div>
          <div className="space-y-3">
            <GroupLabel>Fitness</GroupLabel>
            <PageRow title="Weekly Goals" tile="bg-green-600" icon={ICONS.goals} onOpen={() => setPage('goals')} />
            <PageRow title="Plan Defaults" tile="bg-orange-500" icon={ICONS.defaults} onOpen={() => setPage('defaults')} />
            <PageRow title="Exercises" tile="bg-teal-600" icon={ICONS.exercises} onOpen={() => setPage('exercises')} />
            <PageRow title="Stretches" tile="bg-violet-500" icon={ICONS.stretches} onOpen={() => setPage('stretches')} />
          </div>
          <div className="space-y-3">
            <GroupLabel>Nutrition</GroupLabel>
            <PageRow title="Goal & Targets" tile="bg-emerald-500" icon={ICONS.targets} onOpen={() => setPage('targets')} />
          </div>
          <div className="space-y-3">
            <GroupLabel>App</GroupLabel>
            <PageRow title="Backup" summary={backupSummary(store.lastBackupAt).text} warn={backupSummary(store.lastBackupAt).warn} tile="bg-blue-600" icon={ICONS.backup} onOpen={() => setPage('backup')} />
            <PageRow title="Reset the App" red tile="bg-stone-500" icon={ICONS.reset} onOpen={() => setPage('reset')} />
          </div>
        </div>
        {page === 'exercises' && <ExerciseBank store={store} onClose={() => setPage(null)} />}
        {page === 'stretches' && <StretchBank store={store} onClose={() => setPage(null)} />}
        {page === 'goals' && (
          <SettingsSheet title="Weekly Goals" bare split full onClose={() => setPage(null)}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Weekly Goals</h2>
              <button onClick={() => setPage(null)} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
            </div>
            <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2">
              <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
                {GOAL_SETTINGS.map(g => (
                  <GoalSetting key={g.id} setting={g} age={store.profile.age} goal={store.goals[g.id]} onChange={patch => store.setGoal(g.id, patch)} />
                ))}
              </div>
            </div>
          </SettingsSheet>
        )}
        {page === 'personal' && (
          <SettingsSheet title="Personal Info" bare split full onClose={() => setPage(null)}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Personal Info</h2>
              <button onClick={() => setPage(null)} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
            </div>
            <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2">
              <PersonalInfo profile={store.profile} lastLb={lastWeight(store.nutrition)} onChange={store.setProfile} />
            </div>
          </SettingsSheet>
        )}
        {page === 'targets' && (
          <SettingsSheet title="Goal & Targets" bare split full onClose={() => setPage(null)}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Goal & Targets</h2>
              <UseAllButton goals={goalsOf(store.nutrition)} lb={lastWeight(store.nutrition)} profile={store.profile} onSetAll={all => store.setNutrition(x => ({ ...x, goals: { ...goalsOf(x), ...all } }))} />
              <button onClick={() => setPage(null)} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
            </div>
            <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2">
              {/* Your goal first: it sets the calories (and so the rest) below. */}
              <div className="space-y-2">
                <GroupLabel>Goal</GroupLabel>
                <GoalFields profile={store.profile} lb={lastWeight(store.nutrition)} lbDay={lastWeighDay(store.nutrition)} onChange={store.setProfile} />
                <GroupLabel>Daily targets</GroupLabel>
                <TargetRows goals={goalsOf(store.nutrition)} lb={lastWeight(store.nutrition)} profile={store.profile} onSet={(k, v) => store.setNutrition(x => ({ ...x, goals: { ...goalsOf(x), [k]: v } }))} />
              </div>
            </div>
          </SettingsSheet>
        )}
        {page === 'defaults' && (
          <SettingsSheet title="Plan Defaults" bare split full onClose={() => setPage(null)}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Plan Defaults</h2>
              <button onClick={() => setPage(null)} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
            </div>
            <p className="-mt-2 text-sm text-stone-500 leading-snug">The exercises and stretches each plan starts with every week. A plan shows Edited when you add, remove or move an exercise or stretch in it and pick Every week. Picking Just this week changes only that week and leaves it Default.</p>
            <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2 space-y-2">
              <DefaultsSettings store={store} />
            </div>
          </SettingsSheet>
        )}
        {page === 'backup' && (
          <Page title="Backup" onClose={() => setPage(null)}><Backup store={store} /></Page>
        )}
        {page === 'reset' && (
          <Page title="Reset the App" onClose={() => setPage(null)}><FactoryReset store={store} onDone={() => setPage(null)} /></Page>
        )}
      </aside>
    </div>
  )
}

// A full-screen page over Settings: its title, Done, and what's in it.
function Page({ title, onClose, children }) {
  return (
    <SettingsSheet title={title} bare split full onClose={onClose}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">{title}</h2>
        <button onClick={onClose} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
      </div>
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2">{children}</div>
    </SettingsSheet>
  )
}

// Starts the app fresh: plans back to how they came, everything logged
// cleared. Its page says what goes; only a backup file can bring it back.
function FactoryReset({ store, onDone }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-stone-600 leading-relaxed">
        Your plans go back to their original exercises, sets, reps and weights, and goals and timers to their defaults.
        Every week you’ve logged, with all its ticks, classes, walks and stretches, is deleted.
        {store.lastBackupAt ? ' Only a backup file can bring them back.' : ' You’ve never backed up, so this can’t be undone.'}
      </p>
      <button onClick={() => { store.factoryReset(); onDone() }} className="w-full py-3.5 rounded-2xl text-[15px] font-semibold bg-red-600 text-white active:bg-red-700 transition-colors">Reset app</button>
    </div>
  )
}

// Sex and age: they decide which recommendations apply (fiber, added sugar,
// water and calories differ for men and women; fiber drops after 50).
// What each nutrition goal does to your Targets.
const GOAL_TITLE = { lose: 'Lose fat', maintain: 'Maintain', gain: 'Bulk' }
const GOAL_NOTE = {
  lose: 'Lose fat: eat under what it takes to keep your weight, by the pace your target date sets (about 500 calories a day for each pound a week; a healthy pace is 0.5–1% of your body weight a week). Protein goes up to 1.6–2.4g per kg of body weight so the weight you lose is fat, not muscle.',
  maintain: 'Keep your weight: calories are set to what you burn in a day. Protein is 1.6–2.2g per kg of body weight, enough to lose fat and build muscle at the same time if you lift.',
  gain: 'Bulk: eat over what it takes to keep your weight, by the pace your target date sets (about 500 calories a day for each pound a week; a standard bulk is 0.25–0.5% of your body weight a week). Protein is 1.6–2.2g per kg of body weight so the weight you gain is mostly muscle.',
  none: 'Pick whether you want to lose fat, maintain your weight, or bulk.',
}

function PersonalInfo({ profile, lastLb, onChange, onWeight, withGoal = false }) {
  const [draft, setDraft] = useState(null)
  // Weight: your last weigh-in from Nutrition's Body weight (logged there).
  const shownLb = lastLb ?? null
  const age = profile.age ?? null
  const height = profile.heightIn ?? null
  const startIn = profile.sex === 'woman' ? 64 : 69
  // A ZIP being typed: saved once it's 5 digits (leaving it short puts the
  // saved one back), so a half-typed one never counts as missing.
  const [zipDraft, setZipDraft] = useState(null)
  function save() {
    const n = parseInt(draft, 10)
    if (!isNaN(n)) onChange({ age: Math.min(110, Math.max(13, n)) })
    setDraft(null)
  }
  const btn = 'w-9 h-9 rounded-xl bg-white flex items-center justify-center text-stone-600 text-lg font-medium shadow-sm active:bg-stone-100 shrink-0'
  const seg = on => `px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${on ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`
  // In parts: you, how active you are, (your goal) and the weather.
  return (
    <div className="space-y-2">
      <GroupLabel>About you</GroupLabel>
      <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
        <div className="py-3 flex items-center justify-between gap-3">
          <p className="text-base text-stone-700">Sex</p>
          <div className="bg-stone-200/60 rounded-xl p-1 flex" role="radiogroup" aria-label="Sex">
            <button role="radio" aria-checked={profile.sex === 'man'} onClick={() => onChange({ sex: 'man' })} className={seg(profile.sex === 'man')}>Man</button>
            <button role="radio" aria-checked={profile.sex === 'woman'} onClick={() => onChange({ sex: 'woman' })} className={seg(profile.sex === 'woman')}>Woman</button>
          </div>
        </div>
        <div className="py-3 flex items-center gap-2">
          <p className="flex-1 min-w-0 text-base text-stone-700">Age</p>
          <button onClick={() => onChange({ age: Math.max(13, (age ?? 31) - 1) })} className={btn} aria-label="Age down">−</button>
          {draft !== null ? (
            <input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} autoFocus className="w-[4.5rem] text-center text-lg font-bold bg-white rounded-lg py-0.5 text-stone-900 outline-none" />
          ) : (
            <button onClick={() => setDraft(age != null ? String(age) : '')} className={`min-w-[4.5rem] text-center text-lg font-bold tabular-nums active:opacity-60 ${age != null ? 'text-stone-900' : 'text-stone-400'}`}>{age ?? '—'}</button>
          )}
          <button onClick={() => onChange({ age: Math.min(110, (age ?? 29) + 1) })} className={btn} aria-label="Age up">+</button>
        </div>
        {/* Height, an inch at a time (blank starts at 5′9″ / 5′4″). */}
        <div className="py-3 flex items-center gap-2">
          <p className="flex-1 min-w-0 text-base text-stone-700">Height</p>
          <button onClick={() => onChange({ heightIn: Math.max(48, (height ?? startIn + 1) - 1) })} className={btn} aria-label="Height down">−</button>
          <span className={`min-w-[4.5rem] text-center text-lg font-bold tabular-nums ${height != null ? 'text-stone-900' : 'text-stone-400'}`}>{height != null ? feetInches(height) : '—'}</span>
          <button onClick={() => onChange({ heightIn: Math.min(90, (height ?? startIn - 1) + 1) })} className={btn} aria-label="Height up">+</button>
        </div>
        {/* Weight: typed here when it's asked for (the profile pop-up), else
            your last weigh-in, logged in Nutrition. */}
        {onWeight ? (
          <NumberRow label="Weight" value={shownLb} step={1} min={50} max={600} start={170} unit="lb" onChange={onWeight} />
        ) : (
          <div className="py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base text-stone-700">Weight</p>
              <span className={`shrink-0 text-right text-lg font-bold tabular-nums ${shownLb != null ? 'text-stone-900' : 'text-stone-400'}`}>
                {shownLb != null ? shownLb : '—'}<span className="text-xs font-medium text-stone-400"> lb</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">{lastLb != null ? 'From your last weigh-in. ' : ''}Log it in Nutrition under Body weight.</p>
          </div>
        )}
      </div>
      <GroupLabel>Activity</GroupLabel>
      <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
        <div className="py-3 space-y-2">
          <p className="text-base text-stone-700">Activity</p>
          <div className="bg-stone-200/60 rounded-xl p-1 flex" role="radiogroup" aria-label="Activity">
            {ACTIVITY.map(a => (
              <button key={a.id} role="radio" aria-checked={profile.activity === a.id} onClick={() => onChange({ activity: a.id })} className={`flex-1 ${seg(profile.activity === a.id).replace('px-4', 'px-2')}`}>{a.label}</button>
            ))}
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">{ACTIVITY.find(a => a.id === profile.activity)?.note ?? 'How active you are in a normal week, workouts included.'}</p>
        </div>
      </div>
      {/* The required pop-up asks for your goal too, all in one place. */}
      {withGoal && <>
        <GroupLabel>Goal</GroupLabel>
        <GoalFields profile={profile} lb={shownLb} onChange={onChange} />
      </>}
      <GroupLabel>Weather</GroupLabel>
      <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
        {/* ZIP code, for the weather on Home. */}
        <div className="py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base text-stone-700">ZIP code</p>
            <input type="text" inputMode="numeric" maxLength={5} placeholder="—" value={zipDraft ?? profile.zip ?? ''}
              onChange={e => { const z = e.target.value.replace(/\D/g, '').slice(0, 5); if (z.length === 5) { onChange({ zip: z }); setZipDraft(null) } else setZipDraft(z) }}
              onBlur={() => setZipDraft(null)}
              className="w-[5.5rem] text-center text-lg font-bold bg-white rounded-lg py-1 text-stone-900 placeholder:text-stone-400 outline-none select-text tabular-nums" />
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">For today's weather on Home.</p>
        </div>
      </div>
    </div>
  )
}

// A number with − / + (tap it to type one), and a note under it. Blank
// shows — and the first tap starts from `start`.
// `disabled`: greyed out, with `hint` saying why; `hint` also shows on its
// own (a warning, in amber) when it's set.
function NumberRow({ label, value, step, min, max, start, unit, note, hint, disabled = false, onChange }) {
  const [draft, setDraft] = useState(null)
  const [info, setInfo] = useState(false) // the note, behind ⓘ
  const clamp = v => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  function save() {
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(clamp(n))
    setDraft(null)
  }
  const btn = 'w-9 h-9 rounded-xl bg-white flex items-center justify-center text-stone-600 text-lg font-medium shadow-sm active:bg-stone-100 shrink-0 disabled:opacity-30'
  return (
    <div className="py-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 flex items-center gap-1.5 text-base text-stone-700">{label}
          {note && <button onClick={() => setInfo(true)} aria-label={`About ${label.toLowerCase()}`} className="-m-1.5 p-1.5 text-stone-400 active:opacity-60"><InfoIcon /></button>}
        </p>
        <button onClick={() => onChange(clamp(value != null ? value - step : start))} disabled={disabled} className={btn} aria-label={`${label} down`}>−</button>
        {draft !== null ? (
          <input type="number" inputMode="decimal" value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} autoFocus className="w-[5.5rem] text-center text-lg font-bold bg-white rounded-lg py-0.5 text-stone-900 outline-none" />
        ) : (
          <button onClick={() => setDraft(value != null ? String(value) : '')} disabled={disabled} className={`min-w-[5.5rem] disabled:opacity-40 text-center text-lg font-bold tabular-nums active:opacity-60 ${value != null ? 'text-stone-900' : 'text-stone-400'}`}>
            {value ?? '—'}<span className="text-xs font-medium text-stone-400"> {unit}</span>
          </button>
        )}
        <button onClick={() => onChange(clamp(value != null ? value + step : start))} disabled={disabled} className={btn} aria-label={`${label} up`}>+</button>
      </div>
      {hint && <p className={`text-xs leading-relaxed ${disabled ? 'text-stone-500' : 'text-amber-700'}`}>{hint}</p>}
      {info && <InfoSheet icon={<InfoIcon />} title={label} text={note} onClose={() => setInfo(false)} />}
    </div>
  )
}

// Your nutrition goal, and losing or bulking, where you're headed and by
// when: at the top of Targets, in the required pop-up, and in the Goal
// pop-up from Nutrition's body weight.
export function GoalFields({ profile, lb, lbDay, onChange }) {
  const [goalInfo, setGoalInfo] = useState(false)
  const fastest = fastestPace(profile, lb)
  // A target on the wrong side of your weight (you've passed it, or changed goal).
  const wrongSide = profile.targetLb != null && lb != null && (profile.goal === 'lose' ? profile.targetLb >= lb : profile.goal === 'gain' ? profile.targetLb <= lb : false)
  const seg = on => `flex-1 px-2 py-1.5 rounded-lg text-sm font-semibold transition-colors ${on ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`
  return (
    <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
        <div className="py-3 space-y-2">
        <p className="flex items-center gap-1.5 text-base text-stone-700">Nutrition goal
          <button onClick={() => setGoalInfo(true)} aria-label="About your nutrition goal" className="-m-1.5 p-1.5 text-stone-400 active:opacity-60"><InfoIcon /></button>
        </p>
        <div className="bg-stone-200/60 rounded-xl p-1 flex" role="radiogroup" aria-label="Nutrition goal">
          {[['lose', 'Lose fat'], ['maintain', 'Maintain'], ['gain', 'Bulk']].map(([id, label]) => (
            <button key={id} role="radio" aria-checked={profile.goal === id} onClick={() => onChange({ goal: id })} className={seg(profile.goal === id)}>{label}</button>
          ))}
        </div>
        {goalInfo && <InfoSheet icon={<InfoIcon />} title={GOAL_TITLE[profile.goal] ?? 'Nutrition goal'} text={(GOAL_NOTE[profile.goal] ?? GOAL_NOTE.none).replace(/^[^:]+: /, s => (profile.goal ? '' : s)).replace(/^./, c => c.toUpperCase())} onClose={() => setGoalInfo(false)} />}
        </div>
        {/* Losing or gaining: where you're headed and by when. Losing can't
            go faster than eating what you burn at rest allows. */}
        {(profile.goal === 'lose' || profile.goal === 'gain') && (
          <>
            <NumberRow label="Target weight" value={profile.targetLb ?? null} step={1}
              min={profile.goal === 'gain' && lb != null ? Math.floor(lb) + 1 : 50}
              max={profile.goal === 'lose' && lb != null ? Math.ceil(lb) - 1 : 600}
              start={lb != null ? Math.round(lb) + (profile.goal === 'lose' ? -10 : 10) : 170} unit="lb"
              hint={wrongSide ? `Must be ${profile.goal === 'lose' ? 'under' : 'over'} ${lb} lb to ${profile.goal === 'lose' ? 'lose fat' : 'bulk'}.` : null}
              onChange={v => onChange({ targetLb: v })} />
            <TargetDateRow profile={profile} lb={lb} lbDay={lbDay} fastest={fastest} onChange={onChange} />
          </>
        )}
    </div>
  )
}

// When you want to reach your target weight. Your pace (and so your
// calories) comes from it, and it can't be sooner than your fastest pace
// allows (see fastestPace).
function TargetDateRow({ profile, lb, lbDay, fastest, onChange }) {
  const [info, setInfo] = useState(false)
  const lose = profile.goal === 'lose'
  const earliest = earliestDate(profile, lb, lbDay)
  const pace = paceFor(profile, lb)
  const date = profile.targetDate ?? ''
  const tooSoon = !!(date && earliest && date < earliest)
  const show = key => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const hint = !earliest
    ? (lb && profile.targetLb ? 'Fill in About you and Activity first: your earliest date comes from them.' : 'Set your target weight first.')
    : tooSoon
    ? `Too soon now: the earliest is ${show(earliest)}. Until you change it, you'll go at your fastest, ${fastest} lb a week.`
    : pace != null
    ? `That's ${pace} lb a week. Earliest: ${show(earliest)}.`
    : `Earliest: ${show(earliest)}.`
  const range = paceRange(profile.goal, lb)
  const yours = range ? ` For you, that's ${range[0]}–${range[1]} lb a week.` : ''
  const note = lose
    ? `Your pace comes from this date and updates as you weigh in. A healthy pace is 0.5–1% of your body weight a week.${yours}${fastest != null ? ` Your fastest is ${fastest} lb a week${fastest < range?.[1] ? ', since any faster would mean eating less than you burn at rest' : ''}, so the date can't be any sooner.` : ''}`
    : `Your pace comes from this date and updates as you weigh in. A standard bulk is 0.25–0.5% of your body weight a week; past that the extra is mostly fat.${yours}${fastest != null ? ` The date can't be sooner than ${fastest} lb a week allows.` : ''}`
  return (
    <div className="py-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 flex items-center gap-1.5 text-base text-stone-700">Target date
          <button onClick={() => setInfo(true)} aria-label="About target date" className="-m-1.5 p-1.5 text-stone-400 active:opacity-60"><InfoIcon /></button>
        </p>
        {/* Never sooner than the earliest: an earlier pick snaps to it. */}
        <input type="date" value={date} min={earliest ?? undefined} disabled={!earliest}
          onChange={e => { const v = e.target.value; if (v) onChange({ targetDate: v < earliest ? earliest : v }) }}
          className="min-w-[8.5rem] text-center text-base font-bold bg-white rounded-lg py-1 px-2 text-stone-900 outline-none select-text disabled:opacity-40" />
      </div>
      {hint && <p className={`text-xs leading-relaxed ${tooSoon ? 'text-amber-700' : 'text-stone-500'}`}>{hint}</p>}
      {/* Too soon: one tap moves it to the earliest date. */}
      {tooSoon && <button onClick={() => onChange({ targetDate: earliest })} className="w-full h-10 rounded-xl bg-white shadow-sm text-sm font-semibold text-accent-500 active:bg-stone-100">Update to {show(earliest)}</button>}
      {info && <InfoSheet icon={<InfoIcon />} title="Target date" text={note} onClose={() => setInfo(false)} />}
    </div>
  )
}

// You reached your target weight (losing: at or under it; gaining: at or
// over): switch to Maintain, or set a new target. Shown once per target.
export function TargetReached({ lb, target, onMaintain, onNewTarget, onLater }) {
  return (
    <SettingsSheet title="You hit your target" closeLabel="Not now" onClose={onLater}>
      <p className="text-sm text-stone-600 leading-relaxed">You weighed in at {lb} lb, reaching your target of {target} lb. Switch to Maintain to keep it, or set a new target.</p>
      <div className="space-y-2">
        <button onClick={onMaintain} className="w-full h-12 rounded-[14px] bg-accent-500 text-base font-bold text-white active:bg-accent-600">Switch to Maintain</button>
        <button onClick={onNewTarget} className="w-full h-12 rounded-[14px] bg-stone-100 text-base font-semibold text-stone-700 active:bg-stone-200">Set a new target</button>
      </div>
    </SettingsSheet>
  )
}

// Personal info, required: shown whenever any of it is missing, every row
// of it (filled ones as they are), and it can't be closed; Save works once
// nothing's left. A weight typed here is today's weigh-in.
export function ProfileRequired({ profile, lastLb, onSave }) {
  const [draft, setDraft] = useState(profile)
  const [lb, setLb] = useState(lastLb)
  const left = profileMissing(draft, lb).length
  return (
    <SettingsSheet title="Finish setting up your profile" bare split locked onClose={() => {}}>
      <div className="space-y-1">
        <h2 className="text-[22px] font-bold text-stone-900 tracking-tight">Finish setting up your profile</h2>
        <p className="text-sm text-stone-500">We use this to set your targets and show your weather.</p>
      </div>
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5">
        <PersonalInfo profile={draft} lastLb={lb} onChange={p => setDraft(d => ({ ...d, ...p }))} onWeight={setLb} withGoal />
      </div>
      <div className="space-y-2">
        <button onClick={() => onSave(draft, lb)} disabled={left > 0} className="w-full h-[52px] rounded-[14px] bg-accent-500 text-base font-bold text-white active:bg-accent-600 disabled:bg-stone-200 disabled:text-stone-500">Save</button>
        {left > 0 && <p className="text-center text-[13px] text-stone-500">{left} left to fill in</p>}
      </div>
    </SettingsSheet>
  )
}

function GroupLabel({ children }) {
  return <p className="px-1 pt-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-500">{children}</p>
}

// A setting with a page of its own: tap to open it full screen.
function PageRow({ title, summary, warn, red, tile, icon, onOpen }) {
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-stone-100 bg-white shadow-sm flex items-center gap-3 px-3.5 py-2 min-h-[66px] text-left active:bg-stone-50">
      <span className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0 ${tile}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-base font-medium ${red ? 'text-red-600' : 'text-stone-900'}`}>{title}</span>
        {summary && <span className={`block text-[13px] leading-snug ${warn ? 'text-amber-700' : 'text-stone-400'}`}>{summary}</span>}
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

const ICONS = {
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
  targets: <><path d="M12 7c-1.5-1-3.5-1.3-5-.5C4.5 7.8 4 11 5 14c1 3 3 6 5 6 .8 0 1.3-.4 2-.4s1.2.4 2 .4c2 0 4-3 5-6 1-3 .5-6.2-2-7.5-1.5-.8-3.5-.5-5 .5z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
  goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  defaults: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  exercises: <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />,
  stretches: <><circle cx="12" cy="4.5" r="2" /><path d="M5 9l7 1.5L19 9M12 10.5V15l-3.5 6M12 15l3.5 6" /></>,
  backup: <><path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" /><path d="M12 11v6M9.5 13.5 12 11l2.5 2.5" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></>,
}

// Every row is the same height (66px fits a title plus a line under it).
// What Backup is set to, for its closed row.
// Amber once it's been a week or more, or never.
function backupSummary(at) {
  if (!at) return { text: 'Never backed up', warn: true }
  const days = (Date.now() - new Date(at).getTime()) / 86400000
  return { text: `Last backup ${backupAge(at)}`, warn: days >= 7 }
}

// One goal on one line: its range with − and +, which move both ends
// together (3–4 becomes 4–5). Tap the range to set the min and max apart.
// What the guidelines recommend is written underneath.
// What's recommended for your age (from Personal info): the advice, the
// least that meets it, and why it's met. Kids (under 18) and 65 and up
// differ; everyone else gets the setting's own advice. The same for men and
// women.
function weeklyRec(id, age) {
  const kid = age != null && age < 18
  const older = age != null && age >= 65
  if (id === 'workouts') return {
    least: kid ? 3 : 2,
    advice: kid ? 'The U.S. Physical Activity Guidelines recommend muscle-strengthening activity at least 3 days a week for kids and teens, as part of their daily activity.'
      : older ? 'The American Heart Association recommends strength training at least 2 days a week for adults 65 and up, working all the major muscle groups, on top of cardio.' : null,
    met: n => `${n} workouts a week meets the recommendation of at least ${kid ? 3 : 2}.`,
  }
  if (id === 'stretch') return {
    least: 2,
    advice: older ? 'The American College of Sports Medicine recommends stretching at least 2 days a week for adults 65 and up, plus balance training like standing on one leg or walking heel to toe.' : null,
    met: n => `${n} days of stretching a week meets the recommendation of at least ${older ? 2 : '2–3'}.`,
  }
  return {
    least: kid ? 420 : 150,
    advice: kid ? 'The U.S. Physical Activity Guidelines recommend at least 60 minutes of activity every day for kids and teens, most of it moderate to vigorous.'
      : older ? 'The American Heart Association recommends 150–300 minutes a week of moderate activity for adults 65 and up, or 75–150 minutes of vigorous activity, as much as health allows. Hard minutes count double here.' : null,
    met: n => `${n} minutes a week meets the recommendation of at least ${kid ? '420 (60 a day)' : 150}.`,
  }
}

function GoalSetting({ setting, age, goal, onChange }) {
  const { label, step, least, most } = setting
  const rec = weeklyRec(setting.id, age)
  const advice = rec.advice ?? setting.advice
  const met = goal.min >= rec.least
  const [why, setWhy] = useState(false)
  const [draft, setDraft] = useState(null)
  const set = v => onChange({ min: Math.min(most, Math.max(least, Math.round(v))) })
  function save() {
    const n = parseFloat(draft)
    if (!isNaN(n)) set(n)
    setDraft(null)
  }
  const shown = `${goal.min}+`
  const btn = 'w-9 h-9 rounded-xl bg-white flex items-center justify-center text-stone-600 text-lg font-medium shadow-sm active:bg-stone-100 shrink-0 disabled:opacity-30'
  return (
    <div className="py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 flex items-center gap-1.5 text-base text-stone-700 whitespace-nowrap">
          {label}{setting.id === 'cardio' && ' min'}
          <button onClick={() => setWhy(true)} aria-label={`${label}: ${met ? 'meets the recommendation' : 'below the recommendation'}`} className="-m-1.5 p-1.5 active:opacity-60"><RangeMark state={met ? 'ok' : 'low'} /></button>
        </p>
        <button onClick={() => set(goal.min - step)} disabled={goal.min - step < least} className={btn} aria-label={`${label} down`}>−</button>
        {draft !== null ? (
          <input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} autoFocus className="w-[4.5rem] text-center text-lg font-bold bg-white rounded-lg py-0.5 text-stone-900 outline-none" />
        ) : (
          <button onClick={() => setDraft(String(goal.min))} aria-label={`${label}: at least ${goal.min}. Type a number`} className="min-w-[4.5rem] text-center text-lg font-bold text-stone-900 tabular-nums active:opacity-60">{shown}</button>
        )}
        <button onClick={() => set(goal.min + step)} disabled={goal.min + step > most} className={btn} aria-label={`${label} up`}>+</button>
      </div>
      <p className="text-xs text-stone-500 leading-relaxed">{advice}</p>
      {why && <InfoSheet icon={<RangeMark state={met ? 'ok' : 'low'} size={20} />} title={`${label} ${setting.id === 'cardio' ? 'is' : 'are'} ${met ? 'in range' : 'below the recommendation'}`} text={met ? `${rec.met(shown)} ${advice}` : `${shown} is below the recommendation. ${advice} Raise it to at least ${rec.least}.`} onClose={() => setWhy(false)} />}
    </div>
  )
}

// A compact − value + with its label above, so Min and Max fit side by side.
// Tap the number to type one.

// When you last backed up, Back up now, and Restore (which asks first).
function Backup({ store }) {
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [pending, setPending] = useState(null) // a backup waiting for confirm
  const fileInput = useRef(null)
  const age = backupAge(store.lastBackupAt)

  async function backUp() {
    if (await shareBackup(store.exportData())) {
      store.markBackedUp()
      setStatus({ kind: 'ok', text: 'Backup saved.' })
    }
  }

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending(await readBackup(file))
      setStatus(null)
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  function restore() {
    store.restoreData(pending.data, pending.exportedAt)
    setPending(null)
    setStatus({ kind: 'ok', text: 'Restored.' })
  }

  const btn = 'w-full py-3 rounded-xl text-sm font-semibold transition-colors'
  if (pending) {
    return (
      <div className="rounded-2xl bg-stone-50 px-4 py-4 space-y-3">
        <p className="font-semibold text-stone-900">Restore this backup?</p>
        <p className="text-sm text-stone-500 leading-relaxed">
          From {new Date(pending.exportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          It replaces everything in the app now — weights, reps, settings and this week&rsquo;s progress.
        </p>
        <button onClick={restore} className={`${btn} bg-stone-900 text-white active:bg-stone-700`}>Restore</button>
        <button onClick={() => setPending(null)} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>Cancel</button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
    <div className="rounded-2xl bg-stone-50 px-4 py-3 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-stone-600">Last backup</span>
        <span className="text-sm text-stone-400">{age ? age : 'Never'}</span>
      </div>
      <button onClick={backUp} className={`${btn} bg-accent-500 text-white active:bg-accent-600`}>Back up now</button>
      <button onClick={() => fileInput.current?.click()} className={`${btn} bg-stone-100 text-stone-600 active:bg-stone-200`}>
        Restore from a backup…
      </button>
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
      {status && <p className={`text-sm ${status.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{status.text}</p>}
    </div>
    <BackupSteps />
    </div>
  )
}

// How backing up works, step by step down a line: backing up, then getting
// it back. A phone saves through its share sheet to Files; a computer
// downloads the file.
function BackupSteps() {
  const tap = usesShareSheet ? 'Tap' : 'Click'
  const save = [
    { icon: ICONS.backup, tile: 'bg-blue-600', title: `${tap} Back up now`, text: 'At the top of this page.' },
    { icon: STEP_ICONS.folder, tile: 'bg-sky-500', title: `${tap} Save to Files`, text: 'Or select your preferred app.' },
    { icon: STEP_ICONS.cloud, tile: 'bg-sky-500', title: 'Find your Backups folder', text: 'Backed up before? Open it and overwrite the old file. First time? Create one.' },
    { icon: STEP_ICONS.check, tile: 'bg-emerald-500', title: `${tap} Save`, text: 'Done.' },
  ]
  const restore = [
    { icon: ICONS.reset, tile: 'bg-violet-500', title: `${tap} Restore from a backup`, text: usesShareSheet ? 'At the top. Files opens.' : 'At the top. A file window opens.' },
    { icon: STEP_ICONS.folder, tile: 'bg-violet-500', title: 'Find the backup', text: usesShareSheet ? 'Tap Browse, then open your Backups folder.' : 'Go to where you kept it.' },
    { icon: STEP_ICONS.file, tile: 'bg-violet-500', title: `${tap} workout-backup`, text: usesShareSheet ? 'The app shows the day it was made.' : 'Then Open. The app shows the day it was made.' },
    { icon: STEP_ICONS.check, tile: 'bg-emerald-500', title: `${tap} Restore`, text: 'Everything in the app now is replaced with the backup.' },
  ]
  return (
    <div className="space-y-3">
      <Steps title="To back up" steps={save} />
      <Steps title="To get it back" steps={restore} note="On a new phone, or after resetting the app." />
    </div>
  )
}

function Steps({ title, note, steps }) {
  return (
    <div className="space-y-1">
      <p className="px-1 text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
      <ol className="rounded-2xl bg-stone-50 px-4 py-4">
        {note && <p className="text-sm text-stone-500 -mt-1 mb-3">{note}</p>}
        {steps.map((x, i) => (
          <li key={i} className="flex gap-3">
            {/* The tile, with a line down to the next step's. */}
            <div className="flex flex-col items-center">
              <span className={`relative w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0 ${x.tile}`}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{x.icon}</svg>
                <span className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full bg-stone-900 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-stone-50">{i + 1}</span>
              </span>
              {i < steps.length - 1 && <span className="flex-1 w-0.5 my-1 rounded bg-stone-200" />}
            </div>
            <div className={`flex-1 min-w-0 pt-1.5 ${i < steps.length - 1 ? 'pb-4' : ''}`}>
              <p className="text-[15px] font-semibold text-stone-900">{x.title}</p>
              <p className="text-sm text-stone-500 leading-snug mt-0.5">{x.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const STEP_ICONS = {
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A4 4 0 0 1 17.5 18z" />,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
}
