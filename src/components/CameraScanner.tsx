import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import Icon from './Icon'
import { playBeep } from '../utils/sound'

interface CameraScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const containerId = 'camera-scanner'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannedRef = useRef(false)

  onScanRef.current = onScan

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    let cancelled = false

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (scannedRef.current) return
            scannedRef.current = true
            playBeep()
            onScanRef.current(decodedText)
          },
          () => {}
        )
        if (!cancelled) setScanning(true)
      } catch {
        if (!cancelled) {
          setError(
            'No se pudo acceder a la camara. Acepte el permiso de camara o utilice el escaner USB.'
          )
        }
      }
    }

    start()

    return () => {
      cancelled = true
      const s = scanner
      if (s && s.isScanning) {
        s.stop()
          .then(() => {
            try {
              s.clear()
            } catch {
              // ya detenido
            }
          })
          .catch(() => {})
      } else if (s) {
        try {
          s.clear()
        } catch {
          // ya limpiado
        }
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Escanear con la camara</p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Cerrar"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="rounded-xl overflow-hidden bg-black">
        <div id={containerId} className="w-full" style={{ minHeight: 220 }} />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {scanning && !error && (
        <p className="text-sm text-center text-slate-500">Apunte la camara al codigo de barras o QR...</p>
      )}
    </div>
  )
}
