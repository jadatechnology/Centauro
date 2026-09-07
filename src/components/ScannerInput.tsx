import { useRef, useState } from 'react'
import Icon from './Icon'
import { playBeep, playError } from '../utils/sound'

interface ScannerInputProps {
  onScan: (code: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export default function ScannerInput({
  onScan,
  placeholder = 'Escanee o escriba el codigo y presione Enter',
  autoFocus = true,
  className = '',
}: ScannerInputProps) {
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const code = value.trim()
    if (!code) return
    if (code.length >= 3) playBeep()
    onScan(code)
    setValue('')
    setFlash(true)
    setTimeout(() => setFlash(false), 400)
  }

  return (
    <div className={`relative ${className}`}>
      <Icon
        name="scan"
        size={18}
        className={`absolute left-3 top-1/2 -translate-y-1/2 ${flash ? 'text-teal-600' : 'text-slate-400'}`}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (document.activeElement === document.body) inputRef.current?.focus()
          }, 150)
        }}
        placeholder={placeholder}
        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white ${
          flash ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-300'
        }`}
      />
      {value && (
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            submit()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold"
        >
          OK
        </button>
      )}
      <p className="text-[11px] text-slate-400 mt-1">
        El escaner USB funciona como teclado: apunte, escanee y presione Enter automaticamente.
      </p>
    </div>
  )
}
