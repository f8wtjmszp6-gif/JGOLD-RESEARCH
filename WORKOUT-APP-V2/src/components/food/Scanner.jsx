import { useEffect, useRef, useState } from 'react'
import { SettingsSheet } from '../ui/Sheet'
import { lookupBarcode } from '../../utils/barcode'

// Scanning a package's barcode with the back camera (or typing its number),
// then looking it up: onFound(food) when USDA or Open Food Facts has it,
// onNotFound(code) when neither does. The phone's own barcode reader is
// used when there is one; otherwise a decoder loads when this opens. The
// camera stops as soon as a code is read, or when this closes.
export default function Scanner({ onFound, onNotFound, onClose }) {
  const video = useRef(null)
  // camera: starting | scanning | blocked (no camera, or not allowed)
  const [camera, setCamera] = useState('starting')
  // lookup: idle | looking | offline
  const [lookup, setLookup] = useState({ state: 'idle', code: null })
  const [typed, setTyped] = useState('')
  const stopRef = useRef(() => {})
  const busy = useRef(false)
  const ctl = useRef(null)

  // Looks a code up, one at a time; reads while one's going are ignored.
  async function find(code) {
    if (busy.current) return
    busy.current = true
    stopRef.current()
    ctl.current?.abort()
    ctl.current = new AbortController()
    setLookup({ state: 'looking', code })
    try {
      const food = await lookupBarcode(code, ctl.current.signal)
      if (food) onFound(food)
      else onNotFound(code)
    } catch (e) {
      if (e.name !== 'AbortError') setLookup({ state: 'offline', code })
      busy.current = false
    }
  }
  // The camera's reads reach the latest `find` through this.
  const findRef = useRef(find)
  useEffect(() => { findRef.current = find })

  useEffect(() => {
    let stopped = false
    let stream = null
    let timer = null
    let controls = null
    stopRef.current = () => {
      stopped = true
      clearInterval(timer)
      controls?.stop()
      stream?.getTracks().forEach(t => t.stop())
    }
    async function start() {
      try {
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
          if (stopped) return stream.getTracks().forEach(t => t.stop())
          video.current.srcObject = stream
          await video.current.play()
          setCamera('scanning')
          timer = setInterval(async () => {
            if (stopped || video.current?.readyState < 2) return
            const [hit] = await detector.detect(video.current).catch(() => [])
            if (hit?.rawValue && !stopped) findRef.current(hit.rawValue)
          }, 250)
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (stopped) return
          const reader = new BrowserMultiFormatReader()
          controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video.current, result => {
            if (result && !stopped) findRef.current(result.getText())
          })
          if (stopped) return controls.stop()
          setCamera('scanning')
        }
      } catch {
        if (!stopped) setCamera('blocked')
      }
    }
    start()
    return () => { stopRef.current(); ctl.current?.abort() }
  }, [])

  const code = typed.replace(/\D/g, '')
  return (
    <SettingsSheet title="Scan a barcode" closeLabel="Cancel" tall onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* The camera, with a guide to line the barcode up in. */}
        <div className="relative rounded-2xl overflow-hidden bg-stone-900 aspect-[4/3] max-w-full">
          <video ref={video} playsInline muted className={`w-full h-full object-cover ${camera === 'scanning' && lookup.state === 'idle' ? '' : 'opacity-40'}`} />
          {camera === 'scanning' && lookup.state === 'idle' && (
            <span className="absolute inset-x-[12%] top-1/2 -translate-y-1/2 h-[38%] rounded-xl border-2 border-white/80" aria-hidden="true" />
          )}
          <p className="absolute inset-x-0 bottom-0 px-4 py-3 text-center text-sm font-medium text-white">
            {lookup.state === 'looking' ? `Looking up ${lookup.code}…`
              : lookup.state === 'offline' ? 'Couldn’t look it up. Check your connection.'
              : camera === 'starting' ? 'Starting the camera…'
              : camera === 'blocked' ? 'The camera isn’t available. Type the number under the barcode instead.'
              : 'Point the camera at the barcode.'}
          </p>
        </div>

        {lookup.state === 'offline' && (
          <button onClick={() => find(lookup.code)} className="h-11 rounded-xl bg-stone-100 text-sm font-semibold text-stone-700 active:bg-stone-200">Try again</button>
        )}

        {/* Or type the number printed under the barcode. */}
        <form onSubmit={e => { e.preventDefault(); if (code.length >= 6) find(code) }} className="flex items-center gap-2">
          <input inputMode="numeric" value={typed} onChange={e => setTyped(e.target.value)} placeholder="Barcode number" aria-label="Barcode number" className="flex-1 min-w-0 h-12 rounded-xl bg-stone-100 px-3.5 outline-none text-base font-semibold text-stone-900 tabular-nums placeholder:font-normal placeholder:text-stone-400" />
          <button type="submit" disabled={code.length < 6 || lookup.state === 'looking'} className="h-12 px-5 rounded-xl bg-accent-500 text-white text-[15px] font-semibold active:bg-accent-600 disabled:opacity-40">Look up</button>
        </form>
      </div>
    </SettingsSheet>
  )
}
