// Backups are a plain JSON file of everything the app stores. On an iPhone
// the share sheet saves it to Files (iCloud Drive); elsewhere it downloads.

const APP = 'workout-tracker-v2'

function stamp(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Phones and tablets get the share sheet (Save to Files → iCloud Drive);
// computers just download the file — the Mac share menu has no Files option.
// (iPadOS reports itself as a Mac, so touch support is the tell.)
export const usesShareSheet = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0

// Returns true once the file was handed off, false if the person cancelled.
export async function shareBackup(data) {
  const payload = { app: APP, version: 1, exportedAt: new Date().toISOString(), data }
  const name = `workout-backup-${stamp()}.json`
  const file = new File([JSON.stringify(payload, null, 2)], name, { type: 'application/json' })

  if (usesShareSheet && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Workout backup' })
      return true
    } catch (err) {
      if (err?.name === 'AbortError') return false
      // Share failed for another reason — fall through to a download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

// Reads a backup file; throws a readable message if it isn't one.
export async function readBackup(file) {
  let payload
  try {
    payload = JSON.parse(await file.text())
  } catch {
    throw new Error('That file isn’t a workout backup.')
  }
  if (payload?.app !== APP || typeof payload.data !== 'object' || payload.data === null) {
    throw new Error('That file isn’t a workout backup.')
  }
  return payload
}

// "today", "yesterday", "3 days ago"
export function backupAge(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
