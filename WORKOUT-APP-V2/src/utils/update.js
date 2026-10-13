// Keeps the home-screen app on the newest version. iPhone holds on to its
// saved copy of the page for a while after an update goes live, so on opening
// (and on coming back after a long while) the app asks for the live page,
// skipping any saved copy, and reloads if it runs a newer build.
const AWAY_MS = 10 * 60 * 1000
const BUILD = /assets\/index-[\w-]+\.js/

// The build this page is running ("assets/index-abc123.js"); none in dev.
function running() {
  const src = document.querySelector('script[type=module][src*="assets/index-"]')?.getAttribute('src')
  return src?.match(BUILD)?.[0] ?? null
}

async function check() {
  const mine = running()
  if (!mine) return
  try {
    const res = await fetch(`${location.pathname}?check=${Date.now()}`, { cache: 'no-store' })
    const live = (await res.text()).match(BUILD)?.[0]
    if (!live || live === mine) return
    // Once per new build, so a stubborn cache can never loop. The new address
    // skips the saved copy of the page.
    const key = 'workout-v2-updated-to'
    if (sessionStorage.getItem(key) === live) return
    sessionStorage.setItem(key, live)
    location.replace(`${location.pathname}?v=${encodeURIComponent(live.slice(13, -3))}`)
  } catch {
    // Offline or storage blocked: carry on with this version.
  }
}

export function keepUpdated() {
  check()
  let hiddenAt = null
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    // Not after a short trip away, so a running timer or open workout isn't
    // reloaded out from under you.
    else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) check()
  })
}
