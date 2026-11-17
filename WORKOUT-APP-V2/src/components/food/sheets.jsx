import { useState, useEffect } from 'react'
import { loadGeneric, searchGeneric, searchBranded } from '../../utils/foodSearch'
import WeightTrend from './WeightTrend'
import Scanner from './Scanner'
import { sameCode } from '../../utils/barcode'
import { SettingsSheet, ConfirmSheet } from '../ui/Sheet'
import { InfoSheet } from '../ui/InfoMark'
import { InfoIcon } from '../ui/glyphs'
import { RangeMark } from '../ui/RangeMark'

const RANGE_TITLE = { ok: 'in range', low: 'below the recommendation', high: 'above the recommendation' }
import { StepperRow } from '../ui/controls'
import { NUTRIENTS, UNITS, GLASSES, ZERO, mealName, foodsOf, popularFoods, scale, servingText, amount, num, fromIngredients, ingredientFood, weightWeek, newId, dayKey, calorieBurn } from '../../utils/nutrition'
import { recsFor, aimOf, aimText, calFor, keepBand, suggestFor, restFloor, suggestedTargets } from '../../utils/targets'
import { Numbers, Toggle, SectionLabel, Field, BoxStepper, BigButton, MealSwitch } from './parts'

// "620 cal · 40g protein · 6g fiber"
const brief = per => `${num(per.cal)} cal · ${num(per.protein)}g protein · ${num(per.fiber)}g fiber`

function PlusButton({ onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} className="shrink-0 w-9 h-9 rounded-[10px] bg-accent-500 text-white text-xl font-semibold flex items-center justify-center active:bg-accent-600">+</button>
  )
}

function FoodRow({ food, first, onAdd }) {
  return (
    <div className={`flex items-center gap-3 px-3.5 py-2.5 ${first ? '' : 'border-t border-stone-100'}`}>
      <span className="flex-1 min-w-0 flex flex-col gap-px">
        <span className="text-[15px] font-semibold text-stone-900">{food.name}</span>
        <span className="text-xs text-stone-600">{food.brand && <>{food.brand} · </>}{brief(food.per)}</span>
      </span>
      <PlusButton onClick={() => onAdd(food)} label={`Add ${food.name}`} />
    </div>
  )
}

function SearchBox({ value, onChange, placeholder = 'Search foods' }) {
  return (
    <label className="flex items-center gap-2 bg-stone-100 rounded-xl px-3.5 py-2.5 text-stone-500">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="flex-1 min-w-0 bg-transparent outline-none text-base text-stone-900" />
    </label>
  )
}

// A USDA food you've saved before is used again, not saved twice.
const savedAlready = (foods, food) => (food.usda ? foods.find(f => f.usda && f.name === food.name && f.brand === food.brand) ?? food : food)

// Search results (Add food and Add ingredient), in two tabs. Foods (first,
// always): USDA generic foods from the app (loaded once), then brands from
// the web under them. Saved: your saved matches.
function UsdaResults({ q, saved, onPick }) {
  const [tab, setTab] = useState(null)
  const [generic, setGeneric] = useState(null)
  useEffect(() => { loadGeneric().then(setGeneric) }, [])
  const usda = q && generic ? searchGeneric(generic, q) : []
  const [brands, setBrands] = useState({ q: '', list: [], state: 'idle' }) // idle | loading | done | offline | limit
  useEffect(() => {
    if (q.length < 3) return
    const ctl = new AbortController()
    // Waits for a pause in typing before asking.
    const t = setTimeout(() => {
      setBrands(b => ({ ...b, q, state: 'loading' }))
      searchBranded(q, ctl.signal)
        .then(list => setBrands({ q, list, state: 'done' }))
        .catch(e => { if (e.name !== 'AbortError') setBrands({ q, list: [], state: e.message === 'limit' ? 'limit' : 'offline' }) })
    }, 450)
    return () => { clearTimeout(t); ctl.abort() }
  }, [q])
  const shown = brands.q === q ? brands : { list: [], state: q.length >= 3 ? 'loading' : 'idle' }
  const note = text => <p className="px-1 text-sm text-stone-500">{text}</p>
  const on = tab ?? 'foods'
  const list = items => (
    <div className="bg-stone-50 rounded-2xl flex flex-col">
      {items.map((f, i) => <FoodRow key={f.id} food={f} first={i === 0} onAdd={onPick} />)}
    </div>
  )
  return (
    <>
      <Toggle value={on} options={[['foods', 'Foods'], ['saved', 'Saved']]} onChange={setTab} />
      {on === 'saved' && (saved.length ? list(saved) : note('Nothing saved by that name.'))}
      {on === 'foods' && (() => {
        const all = [...usda, ...(shown.state === 'done' ? shown.list : [])]
        // How the brand search is going, under what's found so far.
        const status = q.length < 3 ? null
          : shown.state === 'loading' ? 'Searching brands…'
          : shown.state === 'offline' ? 'Brands need an internet connection.'
          : shown.state === 'limit' ? 'Too many brand searches for now. Try again in a bit.'
          : null
        if (!generic && !all.length) return note('Loading…')
        return (
          <>
            {all.length > 0 ? list(all) : !status && note('No foods by that name.')}
            {status && note(status)}
          </>
        )
      })()}
    </>
  )
}

// What you'd add: Popular for this meal, a search over all your foods, or a
// new one.
// Also Add ingredient (a `title`, and `foods` with ones picked for the food
// being built; no My foods button).
export function AddFoodSheet({ n, meal, title, foods: given, onMeal, onPick, onNew, onScan, onMine, onClose }) {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const foods = given ?? foodsOf(n)
  const q = query.trim().toLowerCase()
  const shown = q ? foods.filter(f => `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(q)) : all ? [...foods].sort((a, b) => a.name.localeCompare(b.name)) : popularFoods({ ...n, foods }, meal)

  const pick = food => onPick(savedAlready(foods, food))
  return (
    <SettingsSheet title={title ?? `Add to ${mealName(meal).toLowerCase()}`} closeLabel="Cancel" tall onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        {/* Which meal it goes in (not when adding an ingredient). */}
        {onMeal && <MealSwitch meal={meal} onMeal={onMeal} />}
        {/* Search, with a barcode scanner, New food and My foods beside it. */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0"><SearchBox value={query} onChange={setQuery} /></div>
          {onScan && (
            <button onClick={onScan} aria-label="Scan a barcode" className="shrink-0 w-11 h-11 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center active:bg-stone-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                <path d="M8 8v8M11 8v8M14 8v8M17 8v8" />
              </svg>
            </button>
          )}
          <button onClick={onNew} aria-label="New food" className="shrink-0 w-11 h-11 rounded-xl bg-stone-100 text-accent-500 flex items-center justify-center active:bg-stone-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          {/* My foods: everything you've saved, to look over, edit or delete. */}
          {onMine && <button onClick={onMine} aria-label="My foods" className="shrink-0 w-11 h-11 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center active:bg-stone-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg>
          </button>}
        </div>
        {foods.length > 0 && !q && <SectionLabel>{all ? 'All saved foods' : 'Popular'}</SectionLabel>}
        {q ? (
          <UsdaResults q={q} saved={shown} onPick={pick} />
        ) : foods.length > 0 ? (
          <div className="bg-stone-50 rounded-2xl flex flex-col">
            {shown.map((f, i) => <FoodRow key={f.id} food={f} first={i === 0} onAdd={pick} />)}
            {!q && foods.length > shown.length && (
              <button onClick={() => setAll(true)} className="flex items-center justify-between px-3.5 py-3 border-t border-stone-100 text-sm font-semibold text-accent-500">
                See all saved foods<span className="text-stone-500 font-medium">{foods.length} ›</span>
              </button>
            )}
          </div>
        ) : (
          <p className="px-1 text-sm text-stone-500">Foods you save show up here.</p>
        )}
      </div>
    </SettingsSheet>
  )
}

// A saved food: how much you had.
export function HowMuchSheet({ food, meal, onAdd, onClose }) {
  const [servings, setServings] = useState(1)
  return (
    <SettingsSheet title={food.name} closeLabel="Cancel" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-stone-200 rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-stone-600">Serving size</span>
            <span className="text-[17px] font-bold text-stone-900 truncate">{servingText(food.serving)}</span>
          </div>
          <BoxStepper label="Servings" text={amount(servings)} onLess={() => setServings(s => Math.max(0.5, s - 0.5))} onMore={() => setServings(s => s + 0.5)} lessDisabled={servings <= 0.5} />
        </div>
        <Numbers n={scale(food.per, servings)} strip />
        <BigButton onClick={() => onAdd(servings)}>Add to {mealName(meal).toLowerCase()}</BigButton>
      </div>
    </SettingsSheet>
  )
}

// A looked-up food USDA (or the label data) has no figure for: fill in what
// you know from the label, or leave it and it counts as 0.
export function MissingSheet({ food, onDone, onClose }) {
  const keys = NUTRIENTS.filter(x => food.missing.includes(x.key))
  const [fields, setFields] = useState(() => Object.fromEntries(keys.map(x => [x.key, ''])))
  const names = keys.map(x => x.label.toLowerCase())
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0]
  function done(fill) {
    const rest = { ...food }
    delete rest.missing
    onDone({ ...rest, per: { ...food.per, ...(fill ? Object.fromEntries(keys.map(x => [x.key, toNum(fields[x.key])])) : {}) } })
  }
  return (
    <SettingsSheet title={food.name} closeLabel="Cancel" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="-mt-1 text-sm text-stone-500">This food doesn’t list {list}. If you know it, add it per {servingText(food.serving).split(' · ')[0]}. If not, it counts as 0.</p>
        <div className="grid grid-cols-2 gap-2">
          {keys.map(x => (
            <Field key={x.key} label={x.unit ? `${x.label} (g)` : x.label} value={fields[x.key]} onChange={v => setFields(f => ({ ...f, [x.key]: v }))} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <BigButton onClick={() => done(true)} disabled={keys.every(x => fields[x.key] === '')}>Save</BigButton>
          <button onClick={() => done(false)} className="h-11 text-[15px] font-semibold text-stone-500 active:opacity-60">I don’t know</button>
        </div>
      </div>
    </SettingsSheet>
  )
}

function SaveSwitch({ on, onChange }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center justify-between gap-3 px-1 py-1 text-base text-stone-600 text-left">
      <span>Save to my foods</span>
      <span className={`w-11 h-6 rounded-full p-0.5 flex transition-colors ${on ? 'bg-accent-500 justify-end' : 'bg-stone-300 justify-start'}`}>
        <span className="w-5 h-5 rounded-full bg-white shadow" />
      </span>
    </button>
  )
}

const toNum = v => {
  const x = parseFloat(String(v).replace(',', '.'))
  return isNaN(x) ? 0 : x
}

// A food you haven't saved: typed from its label, or built from other foods
// (the app adds them up). Each ingredient is kept inside the food, as its
// own copy: it isn't saved to My foods on its own, and changing it means
// editing this food.
// `note`: a line at the top (a scanned barcode nobody had, say).
// `ingredient`: one typed in for a food being built, from the label only.
// `editing`: a saved food, to change (its label or its ingredients); Save
// gives it back with the same id.
export function NewFoodSheet({ n, meal, note, ingredient = false, editing, onAdd, onEditFood, onRemoveFood, onClose }) {
  const [mode, setMode] = useState(editing?.ingredients ? 'ingredients' : 'label')
  const [name, setName] = useState(editing?.name ?? '')
  const [serving, setServing] = useState(editing && !editing.ingredients ? { ...editing.serving } : { amount: 1, unit: 'cup', weight: null, wunit: 'g' })
  const [servings, setServings] = useState(1)
  const [fields, setFields] = useState(() => Object.fromEntries(NUTRIENTS.map(x => [x.key, editing ? String(Math.round((editing.per[x.key] ?? 0) * 10) / 10) : ''])))
  const [save, setSave] = useState(true)
  // Older foods point at saved ones; they get their own copies here.
  const [ingredients, setIngredients] = useState(() => (editing?.ingredients ?? []).map(i => ({ food: ingredientFood(n, i), servings: i.servings })).filter(i => i.food))
  const [makes, setMakes] = useState(editing?.makes ?? 1)
  const [sheet, setSheet] = useState(null) // 'serving' | 'pick' | 'scan' | 'mine' | { typing: note } | { ingredient: index } | { missing: food }
  const foods = foodsOf(n)

  const labelPer = Object.fromEntries(Object.keys(ZERO).map(k => [k, toNum(fields[k])]))
  const builtPer = fromIngredients(n, ingredients, makes)
  const ready = name.trim() && (mode === 'label' ? fields.cal !== '' : ingredients.length > 0)

  // A looked-up food missing a number asks for it first.
  const pickIngredient = f => (f.missing?.length ? setSheet({ missing: f }) : addIngredient(f))
  function addIngredient(f) {
    setIngredients(l => [...l, { food: f, servings: 1 }]); setSheet(null)
  }

  function finish() {
    const base = editing ? { ...editing } : { id: newId() }
    delete base.ingredients; delete base.makes; delete base.missing
    const food = mode === 'label'
      ? { ...base, name: name.trim(), serving: { ...serving }, per: labelPer }
      : { ...base, name: name.trim(), serving: { amount: 1, unit: 'serving' }, per: builtPer, ingredients, makes }
    onAdd({ food, save, servings: mode === 'label' ? servings : 1 })
  }

  return (
    <SettingsSheet title={editing ? 'Edit food' : ingredient ? 'New ingredient' : 'New food'} closeLabel={editing ? 'Cancel' : 'Back'} tall onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        {note && <p className="-mt-1 text-sm text-stone-500">{note}</p>}
        {!ingredient && <Toggle value={mode} options={[['label', 'Single food'], ['ingredients', 'Recipe']]} onChange={setMode} />}
        <Field label="Name" value={name} onChange={setName} placeholder={ingredient ? 'e.g. Peanut butter' : mode === 'label' ? 'e.g. Granola bar' : 'e.g. Chicken rice bowl'} numeric={false} />

        {mode === 'label' ? (
          <>
            {/* Serving size first, as on the label; the numbers are per serving. */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSheet('serving')} className="border border-stone-200 rounded-xl pl-3 pr-2.5 py-2 flex items-center justify-between gap-1 text-left min-w-0 active:bg-stone-50">
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] font-semibold text-stone-600">Serving size</span>
                  <span className="text-[17px] font-bold text-stone-900 truncate">{servingText(serving)}</span>
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              {!ingredient && !editing && <BoxStepper label="Servings" text={amount(servings)} onLess={() => setServings(s => Math.max(0.5, s - 0.5))} onMore={() => setServings(s => s + 0.5)} lessDisabled={servings <= 0.5} />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NUTRIENTS.map(x => (
                <Field key={x.key} label={x.unit ? `${x.label} (g)` : x.label} value={fields[x.key]} onChange={v => setFields(f => ({ ...f, [x.key]: v }))} />
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>Ingredients</SectionLabel>
            <div className="bg-stone-50 rounded-2xl flex flex-col">
              {ingredients.map((ing, i) => {
                const f = ing.food
                return (
                  <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${i ? 'border-t border-stone-100' : ''}`}>
                    <span className="flex-1 min-w-0 text-[15px] font-semibold text-stone-900">{f?.name ?? 'Removed food'}</span>
                    <button onClick={() => setSheet({ ingredient: i })} className="shrink-0 h-8 px-2.5 rounded-[9px] bg-white border border-stone-200 text-sm font-semibold text-stone-900">{servingText(f?.serving, ing.servings).split(' · ')[0]}</button>
                  </div>
                )
              })}
              <button onClick={() => setSheet('pick')} className={`flex items-center gap-2 px-3.5 py-3 text-sm font-semibold text-accent-500 ${ingredients.length ? 'border-t border-stone-100' : ''}`}>
                <span className="text-lg leading-none">+</span>Add ingredient
              </button>
            </div>
            <BoxStepper label="Makes" text={`${makes} serving${makes > 1 ? 's' : ''}`} onLess={() => setMakes(m => Math.max(1, m - 1))} onMore={() => setMakes(m => m + 1)} lessDisabled={makes <= 1} />
            <SectionLabel>Per serving</SectionLabel>
            <Numbers n={builtPer} strip />
          </>
        )}

        {!ingredient && !editing && <SaveSwitch on={save} onChange={setSave} />}
        <BigButton onClick={finish} disabled={!ready}>{editing ? 'Save' : ingredient ? 'Add to food' : mode === 'ingredients' ? `Add 1 serving to ${mealName(meal).toLowerCase()}` : `Add to ${mealName(meal).toLowerCase()}`}</BigButton>
      </div>

      {sheet === 'serving' && <ServingSizeSheet serving={serving} onChange={setServing} onClose={() => setSheet(null)} />}
      {sheet === 'pick' && (
        <AddFoodSheet n={n} title="Add ingredient" foods={foods} onPick={pickIngredient} onNew={() => setSheet({ typing: null })} onScan={() => setSheet('scan')} onMine={() => setSheet('mine')} onClose={() => setSheet(null)} />
      )}
      {sheet === 'mine' && <MyFoodsSheet n={n} addLabel="Add to food" onLog={pickIngredient} onEdit={onEditFood} onRemove={onRemoveFood} onClose={() => setSheet('pick')} />}
      {sheet === 'scan' && (
        <Scanner
          onFound={f => pickIngredient(foods.find(x => sameCode(x.barcode, f.barcode)) ?? f)}
          onNotFound={code => setSheet({ typing: `Barcode ${code} wasn’t found. Enter it from the label.` })}
          onClose={() => setSheet('pick')}
        />
      )}
      {sheet?.typing !== undefined && (
        <NewFoodSheet n={n} note={sheet.typing ?? undefined} ingredient onAdd={({ food }) => addIngredient(food)} onClose={() => setSheet('pick')} />
      )}
      {sheet?.missing && <MissingSheet food={sheet.missing} onDone={addIngredient} onClose={() => setSheet('pick')} />}
      {sheet?.ingredient !== undefined && ingredients[sheet.ingredient] && (
        <IngredientSheet
          food={ingredients[sheet.ingredient].food}
          servings={ingredients[sheet.ingredient].servings}
          onChange={s => setIngredients(l => l.map((x, i) => (i === sheet.ingredient ? { ...x, servings: s } : x)))}
          onRemove={() => { setIngredients(l => l.filter((_, i) => i !== sheet.ingredient)); setSheet(null) }}
          onClose={() => setSheet(null)}
        />
      )}
    </SettingsSheet>
  )
}

// Serving size, as the label says it: an amount, a unit, and (if the label
// gives it) the weight.
function ServingSizeSheet({ serving, onChange, onClose }) {
  const set = patch => onChange({ ...serving, ...patch })
  // Any other unit, typed (fillet, patty, wing).
  const [other, setOther] = useState(UNITS.includes(serving.unit) ? '' : serving.unit)
  const isOther = !UNITS.includes(serving.unit)
  return (
    <SettingsSheet title="Serving size" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <StepperRow label="Amount" value={serving.amount} step={0.25} min={0.25} format={amount} editable onChange={v => set({ amount: v })} />
        <div className="flex flex-col gap-2">
          <span className="text-base text-stone-600">Unit</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Unit">
            {UNITS.map(u => (
              <button key={u} role="radio" aria-checked={serving.unit === u} onClick={() => set({ unit: u })} className={`h-10 rounded-[10px] border-[1.5px] text-sm font-semibold ${serving.unit === u ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-transparent bg-stone-100 text-stone-600'}`}>{u}</button>
            ))}
          </div>
          <label className={`h-10 rounded-[10px] border-[1.5px] px-3 flex items-center gap-2 ${isOther ? 'border-accent-500 bg-accent-50' : 'border-transparent bg-stone-100'}`}>
            <span className={`text-sm font-semibold ${isOther ? 'text-accent-600' : 'text-stone-600'}`}>Other</span>
            <input
              value={other}
              placeholder="e.g. fillet"
              maxLength={24}
              onChange={e => { setOther(e.target.value); if (e.target.value.trim()) set({ unit: e.target.value.trim() }) }}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-stone-900 placeholder:text-stone-400 placeholder:font-medium"
            />
          </label>
        </div>
        <div className="border border-stone-200 rounded-xl pl-3 pr-2 py-2 flex items-center justify-between gap-2">
          <label className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-stone-600">Weight per serving <span className="font-medium text-stone-500">· optional</span></span>
            <input inputMode="decimal" value={serving.weight ?? ''} placeholder="0" onChange={e => set({ weight: e.target.value === '' ? null : toNum(e.target.value) })} className="w-28 bg-transparent outline-none text-[17px] font-bold text-stone-900 placeholder:text-stone-300" />
          </label>
          <Toggle small value={serving.wunit ?? 'g'} options={[['g', 'g'], ['mL', 'mL']]} onChange={w => set({ wunit: w })} />
        </div>
        <p className="text-center text-[15px] text-stone-600">1 serving = <b className="text-stone-900">{servingText(serving)}</b></p>
      </div>
    </SettingsSheet>
  )
}

function IngredientSheet({ food, servings, onChange, onRemove, onClose }) {
  return (
    <SettingsSheet title={food?.name ?? 'Ingredient'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <StepperRow label="Servings" value={servings} step={0.25} min={0.25} format={amount} editable onChange={onChange} />
        {food && <p className="text-center text-[15px] text-stone-600"><b className="text-stone-900">{servingText(food.serving, servings)}</b></p>}
        {food && <Numbers n={scale(food.per, servings)} strip />}
        <RemoveButton onClick={onRemove} />
      </div>
    </SettingsSheet>
  )
}

// Your saved foods, A to Z, with a search; tap one to see it or delete it.
export function MyFoodsSheet({ n, meal, addLabel, onLog, onRemove, onEdit, onClose }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null) // a food's id
  const [asking, setAsking] = useState(false)
  const [editing, setEditing] = useState(false)
  const q = query.trim().toLowerCase()
  const foods = [...foodsOf(n)].filter(f => `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
  const food = foodsOf(n).find(f => f.id === open)
  return (
    <SettingsSheet title="My foods" tall onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        <SearchBox value={query} onChange={setQuery} placeholder="Search my foods" />
        {foods.length > 0 ? (
          <div className="bg-stone-50 rounded-2xl flex flex-col">
            {foods.map((f, i) => (
              <button key={f.id} onClick={() => setOpen(f.id)} className={`flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-stone-100 ${i ? 'border-t border-stone-100' : ''}`}>
                <span className="flex-1 min-w-0 flex flex-col gap-px">
                  <span className="text-[15px] font-semibold text-stone-900">{f.name}</span>
                  <span className="text-xs text-stone-600">{f.brand && <>{f.brand} · </>}{servingText(f.serving)} · {brief(f.per)}</span>
                </span>
                <span className="text-stone-300">›</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1 text-sm text-stone-500">{q ? 'Nothing saved by that name.' : 'Foods you log or save show up here.'}</p>
        )}
      </div>
      {food && !asking && !editing && (
        <SettingsSheet title={food.name} onClose={() => setOpen(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-center text-[15px] text-stone-600">{food.brand && <>{food.brand} · </>}<b className="text-stone-900">{servingText(food.serving)}</b></p>
            <Numbers n={food.per} strip />
            <BigButton onClick={() => onLog(food)}>{addLabel ?? `Add to ${mealName(meal).toLowerCase()}`}</BigButton>
            {onEdit && <div className="flex flex-col gap-2">
              <button onClick={() => setEditing(true)} className="w-full py-3 rounded-2xl bg-stone-100 text-stone-700 text-sm font-semibold active:bg-stone-200 transition-colors">Edit</button>
              <RemoveButton onClick={() => setAsking(true)}>Delete from my foods</RemoveButton>
            </div>}
          </div>
        </SettingsSheet>
      )}
      {food && editing && <NewFoodSheet n={n} editing={food} onAdd={({ food: f }) => { onEdit(f); setEditing(false) }} onEditFood={onEdit} onRemoveFood={onRemove} onClose={() => setEditing(false)} />}
      {food && asking && (
        <ConfirmSheet title={`Delete ${food.name}?`} body="It comes off My foods and Popular. What you've already logged stays." confirmLabel="Delete" onConfirm={() => { onRemove(food.id); setAsking(false); setOpen(null) }} onClose={() => setAsking(false)} />
      )}
    </SettingsSheet>
  )
}

function RemoveButton({ onClick, children = 'Remove' }) {
  return <button onClick={onClick} className="w-full py-3 rounded-2xl bg-orange-50 text-orange-700 text-sm font-semibold active:bg-orange-100 transition-colors">{children}</button>
}

// Something you logged: change how much, or take it out.
export function EntrySheet({ entry, onServings, onRemove, onClose }) {
  return (
    <SettingsSheet title={entry.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <StepperRow label="Servings" value={entry.servings} step={0.5} min={0.5} format={amount} editable onChange={onServings} />
        {entry.serving && <p className="text-center text-[15px] text-stone-600"><b className="text-stone-900">{servingText(entry.serving, entry.servings)}</b></p>}
        <Numbers n={scale(entry.per, entry.servings)} strip />
        <RemoveButton onClick={onRemove} />
      </div>
    </SettingsSheet>
  )
}

// The + by the meals: what to log — food (to the meal showing), a glass
// of water, or a weigh-in.
// Food opens Add food, with the meal switch at its top.
export function LogSheet({ onFood, onWater, onWeight, onClose }) {
  const row = 'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-stone-50 text-left active:bg-stone-100'
  const tile = 'w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0'
  const icon = d => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  return (
    <SettingsSheet title="Log" closeLabel="Cancel" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <button onClick={onFood} className={row}>
          <span className={`${tile} bg-emerald-500`}>{icon(<><path d="M12 7c-1.5-2-5-2-6 1-1 3 1 10 4 11 1 .3 1.5-.3 2-.3s1 .6 2 .3c3-1 5-8 4-11-1-3-4.5-3-6-1z" /><path d="M12 7c0-2 1-3 2.5-3.5" /></>)}</span>
          <span className="flex-1 min-w-0 text-base font-medium text-stone-900">Food</span>
        </button>
        <button onClick={onWater} className={row}>
          <span className={`${tile} bg-sky-500`}>{icon(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />)}</span>
          <span className="flex-1 min-w-0 text-base font-medium text-stone-900">Water</span>
        </button>
        <button onClick={onWeight} className={row}>
          <span className={`${tile} bg-violet-500`}>{icon(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 9.5a4 4 0 0 1 6 0L12 12" /></>)}</span>
          <span className="flex-1 min-w-0 text-base font-medium text-stone-900">Weight</span>
        </button>
      </div>
    </SettingsSheet>
  )
}

export function WaterSheet({ onAdd, onClose }) {
  // Or type how much it was.
  const [typed, setTyped] = useState('')
  const oz = Math.round(toNum(typed))
  return (
    <SettingsSheet title="Add a glass" closeLabel="Cancel" onClose={onClose}>
      <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2">
        {GLASSES.map(oz => (
          <button key={oz} onClick={() => onAdd(oz)} className="h-14 rounded-xl bg-accent-50 text-accent-600 flex flex-col items-center justify-center gap-0.5 active:bg-accent-100">
            <span className="text-lg font-bold leading-none">{oz}</span>
            <span className="text-[11px] font-semibold leading-none">oz</span>
          </button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); if (oz > 0) onAdd(oz) }} className="flex items-center gap-2">
        <label className="flex-1 min-w-0 h-12 rounded-xl bg-stone-100 px-3.5 flex items-center gap-1.5">
          <input inputMode="numeric" value={typed} onChange={e => setTyped(e.target.value)} placeholder="Other amount" aria-label="Ounces" className="flex-1 min-w-0 bg-transparent outline-none text-base font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400" />
          <span className="text-sm font-semibold text-stone-500">oz</span>
        </label>
        <button type="submit" disabled={!(oz > 0)} className="h-12 px-5 rounded-xl bg-accent-500 text-white text-[15px] font-semibold active:bg-accent-600 disabled:opacity-40">Add</button>
      </form>
      </div>
    </SettingsSheet>
  )
}

// What you weighed, for today or a day this week.
export function WeighInSheet({ title, initial, onSave, onRemove, onClose }) {
  const [value, setValue] = useState(initial != null ? String(initial) : '')
  const lb = toNum(value)
  return (
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex items-baseline justify-center gap-2">
          <input autoFocus inputMode="decimal" value={value} placeholder="0" onChange={e => setValue(e.target.value)} aria-label="Pounds" className="w-40 text-center bg-stone-100 rounded-2xl py-3 outline-none text-4xl font-bold text-stone-900 placeholder:text-stone-300" />
          <span className="text-lg font-semibold text-stone-500">lb</span>
        </label>
        <BigButton onClick={() => onSave(Math.round(lb * 10) / 10)} disabled={!(lb > 0)}>Save</BigButton>
        {onRemove && <RemoveButton onClick={onRemove} />}
      </div>
    </SettingsSheet>
  )
}

// Body weight, every day this week, and the week's average so far.
export function WeightSheet({ n, days, onDay, onClose }) {
  const { list, avg } = weightWeek(n, days)
  const lastWeek = weightWeek(n, days.map(d => { const x = new Date(d); x.setDate(x.getDate() - 7); return x }))
  const today = dayKey()
  const change = avg != null && lastWeek.avg != null ? Math.round((avg - lastWeek.avg) * 10) / 10 : null
  return (
    <SettingsSheet title="Body weight" tall onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-stone-50 px-3.5 py-2 flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-xs text-stone-600">This week avg</span>
            <span className="text-xl font-bold text-stone-900">{avg != null ? avg.toFixed(1) : '—'}<span className="text-sm font-semibold text-stone-500"> lb</span></span>
          </span>
          {lastWeek.avg != null && (
            <span className="text-xs text-stone-600 text-right">
              Last week {lastWeek.avg.toFixed(1)}
              {change != null && <><br /><b className="text-stone-900">{change === 0 ? 'No change' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} lb`}</b></>}
            </span>
          )}
        </div>
        <WeightTrend weights={n.weights} />
        <div className="flex flex-col">
          {list.map(({ date, key, lb }, i) => {
            const future = key > today
            return (
              <button key={key} disabled={future} onClick={() => onDay(key, date)} className={`flex items-center justify-between gap-3 py-3 text-left ${i ? 'border-t border-stone-100' : ''} disabled:opacity-40`}>
                <span className="text-[15px] text-stone-900">{date.toLocaleDateString('en-US', { weekday: 'long' })}{key === today && <span className="text-stone-500"> · today</span>}</span>
                {lb != null ? <span className="text-[15px] font-bold text-stone-900">{lb.toFixed(1)} lb</span>
                  : key === today ? <span className="h-8 px-3 rounded-[10px] bg-accent-500 text-white text-sm font-semibold flex items-center">Weigh in</span>
                  : <span className="text-[15px] text-stone-400">—</span>}
              </button>
            )
          })}
        </div>
      </div>
    </SettingsSheet>
  )
}

// What well-known bodies recommend, under each target. Fat, carbs and
// protein are shown in grams too, from your calories and your last weigh-in.
function guidance(goals, lb, profile) {
  const r = recsFor(profile)
  const g = (pct, per) => Math.round((goals.cal * pct) / per)
  const kg = lb ? lb / 2.2046 : null
  const at = `at ${num(goals.cal)} calories`
  const aim = aimOf(profile)
  const range = c => `${num(c[0])}–${num(c[1])}`
  const est = calorieBurn(profile, lb)
  const base = est
    ? `From your height, weight, age and activity, you burn about ${num(est.burn)} calories a day.`
    : r.one
    ? `The Dietary Guidelines for Americans suggest about ${range(r.one.cal)} calories a day for ${r.one.calWho} to keep your weight, depending on how active you are.`
    : 'The Dietary Guidelines for Americans suggest about 2,000–3,000 calories a day for men and 1,600–2,400 for women to keep your weight, depending on how active you are.'
  const [pa, pb] = aim.protein
  return {
    cal: (est
      ? (aimText(profile) ? `${base} ${aimText(profile)}: about ${num(suggestFor(est, profile))}.${suggestFor(est, profile) === restFloor(est) && calFor([est.burn, est.burn], profile)[0] < restFloor(est) ? ` That's held at ${num(restFloor(est))}, what you burn at rest; it never goes lower.` : ''}` : base)
      : aimText(profile)
      ? `${base} ${aimText(profile)}: about ${r.one ? range(calFor(r.one.cal, profile)) : `${range(calFor([2000, 3000], profile))} for men and ${range(calFor([1600, 2400], profile))} for women`}.`
      : base) + (est ? '' : ' Fill in Personal info (with your height and activity) for an estimate of your own.'),
    fat: `The National Academies recommend getting 20–35% of your calories from fat, which is ${g(0.2, 9)}–${g(0.35, 9)}g ${at}.`,
    carbs: `The National Academies recommend getting 45–65% of your calories from carbs, which is ${g(0.45, 4)}–${g(0.65, 4)}g ${at}.`,
    fiber: r.one
      ? `The National Academies recommend ${r.one.fiber}g of fiber a day for ${r.one.who}.`
      : `The National Academies recommend ${r.men.fiber}g of fiber a day for ${r.men.who} and ${r.women.fiber}g for ${r.women.who}.`,
    sugar: r.one
      ? `The American Heart Association recommends no more than ${r.one.sugar}g of added sugar a day for ${r.one.who.split(' ')[0]}.`
      : 'The American Heart Association recommends no more than 36g of added sugar a day for men and 25g for women.',
    protein: aim.why
      ? `${aim.why}${kg ? ` (${Math.round(kg * pa)}–${Math.round(kg * pb)}g at ${lb} lb)` : ''}. The National Academies' minimum is 0.8g per kg.`
      : kg
      ? `The National Academies recommend at least 0.8g of protein per kg of body weight (${Math.round(kg * 0.8)}g at ${lb} lb). The International Society of Sports Nutrition recommends 1.4–2g per kg if you lift (${Math.round(kg * 1.4)}–${Math.round(kg * 2)}g).`
      : 'The National Academies recommend at least 0.8g of protein per kg of body weight. The International Society of Sports Nutrition recommends 1.4–2g per kg if you lift.',
    water: r.one
      ? `The National Academies recommend about ${r.one.water} oz (${r.one.cups} cups) of water a day for ${r.one.who.split(' ')[0]}.`
      : 'The National Academies recommend about 104 oz (13 cups) of water a day for men and 72 oz (9 cups) for women.',
  }
}

// One target, laid out like a Weekly goals row: name, − value +, and what's
// recommended underneath. Tap the value to type it.
function TargetRow({ label, value, step, suffix, check, action, onChange }) {
  const [draft, setDraft] = useState(null)
  const set = v => onChange(Math.max(0, Math.round(v)))
  function save() {
    const x = parseFloat(draft)
    if (!isNaN(x)) set(x)
    setDraft(null)
  }
  const btn = 'w-9 h-9 rounded-xl bg-white flex items-center justify-center text-stone-600 text-lg font-medium shadow-sm active:bg-stone-100 shrink-0 disabled:opacity-30'
  return (
    <div className="py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 flex items-center gap-1.5 text-base text-stone-700 whitespace-nowrap">{label}{check}</p>
        <button onClick={() => set(value - step)} disabled={value - step < 0} className={btn} aria-label={`${label} down`}>−</button>
        {draft !== null ? (
          <input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} autoFocus className="w-[4.5rem] text-center text-lg font-bold bg-white rounded-lg py-0.5 text-stone-900 outline-none" />
        ) : (
          <button onClick={() => setDraft(String(value))} className="min-w-[4.5rem] text-center text-lg font-bold text-stone-900 tabular-nums active:opacity-60">
            {num(value)}{suffix && <span className="text-xs font-medium text-stone-400">{suffix}</span>}
          </button>
        )}
        <button onClick={() => set(value + step)} className={btn} aria-label={`${label} up`}>+</button>
      </div>
      {action}
    </div>
  )
}

// Your daily targets, one −/+ row each, with what's recommended behind
// its mark (here and in Settings). `lb`: your last weigh-in, for protein.
export function TargetRows({ goals, lb, profile, onSet }) {
  const note = guidance(goals, lb, profile)
  const r = recsFor(profile)
  // Your numbers, or (not knowing yet) the easier of the two.
  const lo = k => (r.one ? r.one[k] : Math.min(r.men[k], r.women[k]))
  const hi = k => (r.one ? r.one[k] : Math.max(r.men[k], r.women[k]))
  const est = calorieBurn(profile, lb)
  const calRange = est ? keepBand(est, profile) : calFor(r.one ? r.one.cal : [1600, 3000], profile)
  const suggest = suggestedTargets(goals, lb, profile)
  const aim = aimOf(profile)
  const [showing, setShowing] = useState(null) // the in-range pop-up, by key
  // Fat and carbs: in range inside the recommended share of your calories.
  const SHARE = { fat: [0.2, 0.35, 9], carbs: [0.45, 0.65, 4] }
  const grams = (k, pct) => Math.round((goals.cal * pct) / SHARE[k][2])
  // How each one compares: { state: ok | low | high, text }, or null when
  // there's nothing to compare with. Not knowing your sex, either one's
  // recommendation counts.
  const status = k => {
    const v = goals[k]
    const out = (state, text) => ({ state, text })
    if (SHARE[k]) {
      const [lo, hi, per] = SHARE[k]
      const name = k === 'fat' ? 'fat' : 'carbs'
      const pct = Math.round(((v * per) / goals.cal) * 100)
      const range = `The National Academies recommend ${lo * 100}–${hi * 100}%, which is ${grams(k, lo)}–${grams(k, hi)}g.`
      if (v < grams(k, lo)) return out('low', `${v}g of ${name} is ${pct}% of your ${num(goals.cal)} calories. ${range} Raise it to at least ${grams(k, lo)}g.`)
      if (v > grams(k, hi)) return out('high', `${v}g of ${name} is ${pct}% of your ${num(goals.cal)} calories. ${range} Lower it to ${grams(k, hi)}g or less.`)
      return out('ok', `${v}g of ${name} is ${pct}% of your ${num(goals.cal)} calories. ${range}`)
    }
    if (k === 'cal') {
      const fits = aim.cal ? `fits your goal to ${profile.goal === 'lose' ? 'lose fat' : 'bulk'}` : est ? 'is close to what you burn' : 'is inside what the Dietary Guidelines suggest'
      if (v < calRange[0]) return out('low', `${num(v)} calories is too low${aim.cal ? ' for your goal' : ''}. ${note.cal} Raise it to at least ${num(calRange[0])}.`)
      if (v > calRange[1]) return out('high', `${num(v)} calories is too high${aim.cal ? ' for your goal' : ''}. ${note.cal} Lower it to ${num(calRange[1])} or less.`)
      return out('ok', `${num(v)} calories ${fits}. ${note.cal}`)
    }
    if (k === 'fiber') return v >= lo('fiber') ? out('ok', `${v}g of fiber meets the recommendation. ${note.fiber}`) : out('low', `${v}g of fiber is below the recommendation. ${note.fiber} Raise it to at least ${lo('fiber')}g.`)
    if (k === 'sugar') return v <= hi('sugar') ? out('ok', `A limit of ${v}g of added sugar is within the recommendation. ${note.sugar}`) : out('high', `A limit of ${v}g of added sugar is above the recommendation. ${note.sugar} Lower it to ${hi('sugar')}g or less.`)
    if (k === 'water') return v >= lo('water') ? out('ok', `${v} oz of water a day meets the recommendation. ${note.water}`) : out('low', `${v} oz of water a day is below the recommendation. ${note.water} Raise it to at least ${lo('water')} oz.`)
    if (k === 'protein') {
      if (!lb) return null
      const kg = lb / 2.2046
      const [min, a, b] = [0.8, 1.4, 2].map(x => Math.round(kg * x))
      const per = `${v}g of protein is ${(v / kg).toFixed(1)}g per kg at ${lb} lb.`
      if (aim.why) {
        const [ga, gb] = aim.protein.map(x => Math.round(kg * x))
        if (v < ga) return out('low', `${per} ${aim.why} (${ga}–${gb}g). Raise it to at least ${ga}g.`)
        return out('ok', `${per} ${aim.why} (${ga}–${gb}g)${v > gb ? `. You're above that, which is fine but won't add more muscle.` : `, and you're inside that.`}`)
      }
      const lift = `The International Society of Sports Nutrition recommends 1.4–2g per kg if you lift (${a}–${b}g).`
      if (v < min) return out('low', `${per} The National Academies' minimum is 0.8g per kg (${min}g). Raise it to at least ${min}g. ${lift}`)
      return out('ok', `${per} That's above the National Academies' minimum of 0.8g per kg (${min}g).${v >= a && v <= b ? ` It's also inside the 1.4–2g per kg the International Society of Sports Nutrition recommends if you lift (${a}–${b}g).` : ` ${lift}`}`)
    }
    return null
  }
  const NAMES = { protein: 'Protein is', cal: 'Calories are', fat: 'Fat is', carbs: 'Carbs are', fiber: 'Fiber is', sugar: 'Added sugar is', water: 'Water is' }
  const rows = [
    ['cal', 'Calories', 50, ''], ['fat', 'Fat', 5, 'g'], ['carbs', 'Carbs', 5, 'g'], ['fiber', 'Fiber', 1, 'g'],
    ['sugar', 'Added sugar', 1, 'g'], ['protein', 'Protein', 5, 'g'], ['water', 'Water', 8, 'oz'],
  ]
  return (
    <>
    <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">
      {rows.map(([k, label, step, suffix]) => (
        // The why lives behind the mark (✓ or !): tap it to read. With
        // nothing to compare yet, an ⓘ shows what's recommended instead.
        <TargetRow key={k} label={label} value={goals[k]} step={step} suffix={suffix} check={status(k) ? (
          <button onClick={() => setShowing(k)} aria-label={`${label}: ${RANGE_TITLE[status(k).state]}`} className="-m-1.5 p-1.5 active:opacity-60"><RangeMark state={status(k).state} /></button>
        ) : note[k] && (
          <button onClick={() => setShowing(k)} aria-label={`About ${label.toLowerCase()}`} className="-m-1.5 p-1.5 text-stone-400 active:opacity-60"><InfoIcon /></button>
        )} action={suggest[k] != null && suggest[k] !== goals[k] && (
          <button onClick={() => onSet(k, suggest[k])} className="h-8 px-3 rounded-lg bg-accent-50 text-sm font-semibold text-accent-500 active:bg-accent-100">Use {num(suggest[k])}{suffix && ` ${suffix}`}</button>
        )} onChange={v => onSet(k, v)} />
      ))}
      {showing && (status(showing) ? (
        <InfoSheet icon={<RangeMark state={status(showing).state} size={20} />} title={`${NAMES[showing]} ${RANGE_TITLE[status(showing).state]}`} text={status(showing).text} onClose={() => setShowing(null)} />
      ) : (
        <InfoSheet icon={<InfoIcon />} title={rows.find(([k]) => k === showing)[1]} text={note[showing]} onClose={() => setShowing(null)} />
      ))}
    </div>
    </>
  )
}

// Use all: every suggested number at once (blue, beside Done), while any
// differs from yours.
export function UseAllButton({ goals, lb, profile, onSetAll }) {
  const all = suggestedTargets(goals, lb, profile, true)
  if (!Object.keys(all).some(k => all[k] !== goals[k])) return null
  return <button onClick={() => onSetAll(all)} className="ml-auto mr-2 shrink-0 h-9 px-3 rounded-[10px] bg-accent-500 text-sm font-semibold text-white active:bg-accent-600">Use all suggested</button>
}

export function GoalsSheet({ goals, lb, profile, onSet, onSetAll, onClose }) {
  return (
    <SettingsSheet title="Targets" tall action={<UseAllButton goals={goals} lb={lb} profile={profile} onSetAll={onSetAll} />} onClose={onClose}>
      <TargetRows goals={goals} lb={lb} profile={profile} onSet={onSet} />
    </SettingsSheet>
  )
}
