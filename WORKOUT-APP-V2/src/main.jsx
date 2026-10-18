import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { keepUpdated } from './utils/update'

// Ask the browser to keep this app's saved data rather than clear it to free
// space. Quietly does nothing where unsupported.
navigator.storage?.persist?.().catch(() => {})

// Picks up a newer version as soon as it's live.
keepUpdated()

function start() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// On the local dev site only, ?demo fills the app with made-up weeks and
// ?restore puts your own data back (see dev/demo.js).
if (import.meta.env.DEV && /[?&](demo|restore)\b/.test(location.search)) {
  import('./dev/demo').then(m => { m.runDemoSwitch(); start() })
} else {
  start()
}
