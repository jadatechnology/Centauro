import { ReactNode } from 'react'
import Icon from './Icon'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export default function Modal({ open, title, onClose, children, wide }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-white w-full ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        } rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto`}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Cerrar"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
