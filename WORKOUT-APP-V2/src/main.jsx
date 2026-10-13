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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
