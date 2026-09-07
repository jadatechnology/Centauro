import { useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import { printReceipt, getReceiptWidth, saveReceiptWidth, type ReceiptWidth } from '../utils/print'
import { openReceiptPdf } from '../utils/receiptPdf'
import { formatMoney } from '../utils/format'
import type { Sale, StoreConfig } from '../types'

interface ReceiptModalProps {
  open: boolean
  sale: Sale | null
  config: StoreConfig
  usuario: string
  onClose: () => void
}

export default function ReceiptModal({ open, sale, config, usuario, onClose }: ReceiptModalProps) {
  const [width, setWidth] = useState<ReceiptWidth>(() => getReceiptWidth())
  if (!sale) return null

  const sym = config.currencySymbol || '$'

  const pickWidth = (w: ReceiptWidth) => {
    setWidth(w)
    saveReceiptWidth(w)
  }

  const handlePrint = () => {
    printReceipt(sale, config, usuario, width)
    onClose()
  }

  const handlePdf = () => {
    openReceiptPdf(sale, config, usuario, width)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Recibo de venta #${sale.folio}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          La venta por <span className="font-bold text-slate-800">{formatMoney(sale.total, sym)}</span> fue registrada.
          Elige como emitir el recibo:
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Ancho del ticket para impresora</label>
          <div className="grid grid-cols-2 gap-2">
            {(['80', '55'] as ReceiptWidth[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => pickWidth(w)}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                  width === w ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-300 text-slate-600'
                }`}
              >
                {w} mm
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">80 mm es el formato mas comun en impresoras de tickets.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePrint}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Icon name="print" size={17} />
            Impresora
          </button>
          <button
            onClick={handlePdf}
            className="py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Icon name="download" size={17} />
            PDF ({width}mm)
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 font-medium"
        >
          Omitir recibo
        </button>
      </div>
    </Modal>
  )
}
