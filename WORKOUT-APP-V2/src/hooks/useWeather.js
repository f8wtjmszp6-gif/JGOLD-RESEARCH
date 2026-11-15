import { useEffect, useState } from 'react'

// Today's weather for the ZIP code in Personal info: now, the high and low,
// and what it's like (sun, clouds, rain, snow). The ZIP is turned into a
// place once (Zippopotam.us); the forecast comes from Open-Meteo, at most
// every 30 minutes. The last one is kept on the phone, so it shows offline
// too. Nothing without a ZIP.
const KEY = 'weather'
const FRESH = 30 * 60 * 1000

function cached() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? null
  } catch {
    return null
  }
}
function keep(w) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w))
  } catch {
    // Storage full or blocked: it just fetches again next time.
  }
}

// Open-Meteo's weather codes, as four looks.
export function weatherKind(code) {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain'
  if (code >= 2) return 'cloud'
  return 'sun'
}

async function placeOf(zip) {
  const r = await fetch(`https://api.zippopotam.us/us/${zip}`)
  if (!r.ok) throw new Error('ZIP not found')
  const p = (await r.json()).places?.[0]
  return { lat: Number(p.latitude), lon: Number(p.longitude) }
}

async function forecastAt({ lat, lon }) {
  const q = `latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`)
  if (!r.ok) throw new Error('No forecast')
  const d = await r.json()
  return {
    now: Math.round(d.current.temperature_2m),
    hi: Math.round(d.daily.temperature_2m_max[0]),
    lo: Math.round(d.daily.temperature_2m_min[0]),
    kind: weatherKind(d.current.weather_code),
  }
}

// { now, hi, lo, kind, at } or null.
export function useWeather(zip) {
  const [w, setW] = useState(() => {
    const c = cached()
    return c && c.zip === zip ? c : null
  })
  useEffect(() => {
    if (!/^\d{5}$/.test(zip ?? '')) return
    let live = true
    // Fetch unless the last one's fresh; again each time the app comes back.
    async function run() {
      const c = cached()
      if (c && c.zip === zip && Date.now() - c.at < FRESH) return
      try {
        const place = c?.zip === zip && c.place ? c.place : await placeOf(zip)
        const next = { ...(await forecastAt(place)), zip, place, at: Date.now() }
        keep(next)
        if (live) setW(next)
      } catch {
        // Offline or a bad ZIP: keep showing the last one.
      }
    }
    run()
    const back = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', back)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', back)
    }
  }, [zip])
  return w && w.zip === zip ? w : null
}
