import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSale, addPayment, registrarDevolucion } from '../services/saleService'
import { getStoreConfig } from '../services/configService'
import { useAuth } from '../context/AuthContext'
import { useSede } from '../context/SedeContext'
import type { Sale, StoreConfig, Devolucion, DevolucionItem } from '../types'
import { formatMoney, formatDateTime, round2 } from '../utils/format'
import { printReceipt, getReceiptWidth } from '../utils/print'
import { openReceiptPdf } from '../utils/receiptPdf'
import { playError } from '../utils/sound'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

export default function SaleDetail() {
  const { id } = useParams()
  const { user, nombre } = useAuth()
  const { sede, puedeCambiarSede } = useSede()
  const [sale, setSale] = useState<Sale | null>(null)
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [devOpen, setDevOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    const load = async () => {
      try {
        const [s, cfg] = await Promise.all([getSale(id), getStoreConfig()])
        if (!active) return
        // Un usuario que no es administrador no puede ver ventas de otra sede
        if (s && s.sedeId && !puedeCambiarSede && sede && s.sedeId !== sede.id) {
          setSale(null)
          return
        }
        setSale(s)
        setConfig(cfg)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id, sede, puedeCambiarSede])

  const sym = config.currencySymbol || '$'

  if (loading) return <Spinner className="h-40" />
  if (!sale) return <p className="text-slate-500">Venta no encontrada.</p>

  const pagado = sale.total - (sale.saldo ?? 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link to="/ventas" className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
            <Icon name="chevron" size={18} className="rotate-180" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">Recibo #{sale.folio}</h1>
            <p className="text-sm text-slate-500">{formatDateTime(sale.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {sale.saldo > 0 && (
            <button
              onClick={() => setPayOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold w-full sm:w-auto justify-center"
            >
              Abonar
            </button>
          )}
          <button
            onClick={() => openReceiptPdf(sale, config, sale.usuario || nombre || user?.email || '', getReceiptWidth())}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center gap-1.5 w-full sm:w-auto justify-center"
            title="Descargar recibo en PDF"
          >
            <Icon name="print" size={15} />
            PDF
          </button>
          <button
            onClick={() => printReceipt(sale, config, sale.usuario || nombre || user?.email || '', getReceiptWidth())}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-1.5 w-full sm:w-auto justify-center"
            title="Imprimir (elegir impresora)"
          >
            <Icon name="print" size={15} />
            Imprimir
          </button>
          <button
            onClick={() => setDevOpen(true)}
            className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-1.5 w-full sm:w-auto justify-center"
            title="Registrar devolucion"
          >
            <Icon name="x" size={15} />
            Devolucion
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-400">Cliente</div>
            <div className="font-semibold text-slate-800">
              {sale.clienteNombre || 'Consumidor final'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Sede</div>
            <div className="font-semibold text-slate-800">
              {sale.sedeNombre || <span className="text-slate-400">-</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Tipo</div>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${
                sale.tipo === 'credito' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {sale.tipo}
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-400">Pago</div>
            <div className="font-semibold text-slate-800">{sale.metodoPago || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Cajero</div>
            <div className="font-semibold text-slate-800 truncate">{sale.usuario}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h2 className="font-bold text-slate-800 px-4 py-3 border-b border-slate-100">Productos</h2>
        <ul className="divide-y divide-slate-100">
          {sale.items.map((it, i) => {
            const pct = it.descuentoPct || 0
            const net = round2(it.subtotal * (1 - pct / 100))
            return (
              <li key={i} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{it.nombre}</div>
                  <div className="font-bold text-slate-800">{formatMoney(net, sym)}</div>
                </div>
                <div className="text-xs text-slate-400">
                  {it.cantidad} x {formatMoney(it.precioUnitario, sym)}
                  {pct > 0 && (
                    <span className="text-emerald-600"> · {pct}% dcto (-{formatMoney(round2(it.subtotal - net), sym)})</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="px-4 py-3 border-t border-slate-100 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatMoney(sale.subtotal, sym)}</span>
          </div>
          {sale.descuento > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Descuento</span>
              <span>-{formatMoney(sale.descuento, sym)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-800 text-lg">
            <span>TOTAL</span>
            <span>{formatMoney(sale.total, sym)}</span>
          </div>
          {sale.abonoInicial > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Abono inicial</span>
              <span>{formatMoney(sale.abonoInicial, sym)}</span>
            </div>
          )}
          {sale.saldo > 0 && (
            <div className="flex justify-between font-bold text-amber-600">
              <span>SALDO</span>
              <span>{formatMoney(sale.saldo, sym)}</span>
            </div>
          )}
        </div>
      </div>

      {sale.pagos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <h2 className="font-bold text-slate-800 px-4 py-3 border-b border-slate-100">
            Historial de pagos ({formatMoney(pagado, sym)})
          </h2>
          <ul className="divide-y divide-slate-100">
            {sale.pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <div className="font-semibold text-slate-800">{formatMoney(p.monto, sym)}</div>
                  <div className="text-xs text-slate-400">
                    {formatDateTime(p.fecha)} · {p.metodoPago}
                    {p.nota ? ` · ${p.nota}` : ''}
                  </div>
                </div>
                <div className="text-xs text-slate-400">{p.usuario}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sale.devoluciones && sale.devoluciones.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <h2 className="font-bold text-slate-800 px-4 py-3 border-b border-slate-100">
            Devoluciones ({formatMoney(sale.devoluciones.reduce((acc, d) => acc + d.monto, 0), sym)})
          </h2>
          <ul className="divide-y divide-slate-100">
            {sale.devoluciones.map((d) => (
              <li key={d.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-red-600">-{formatMoney(d.monto, sym)}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(d.fecha)} · {d.usuario}</div>
                </div>
                {d.motivo && <div className="text-xs text-slate-500 mt-0.5">{d.motivo}</div>}
                <div className="text-xs text-slate-400 mt-1">
                  {d.items.map((it) => `${it.nombre} (${it.cantidad})`).join(', ')}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sale.saldo > 0 && (
        <PaymentModal
          sale={sale}
          open={payOpen}
          onClose={() => setPayOpen(false)}
          sym={sym}
          onPaid={async (monto, metodo, nota) => {
            await addPayment(sale.id!, sale, monto, metodo, nota, nombre || user?.email || '')
            const updated = await getSale(id!)
            setSale(updated)
            setPayOpen(false)
          }}
        />
      )}

      <DevolucionModal
          sale={sale}
          config={config}
          open={devOpen}
          onClose={() => setDevOpen(false)}
          sym={sym}
          onDone={async (devolucion: Devolucion) => {
            await registrarDevolucion(sale, devolucion)
            const updated = await getSale(id!)
            setSale(updated)
            setDevOpen(false)
          }}
        />
      </div>
    )
  }

function DevolucionModal({
  sale,
  config,
  open,
  onClose,
  sym,
  onDone,
}: {
  sale: Sale
  config: StoreConfig
  open: boolean
  onClose: () => void
  sym: string
  onDone: (devolucion: Devolucion) => Promise<void>
}) {
  const { user, nombre } = useAuth()
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setCantidades({})
      setMotivo('')
      setError('')
    }
  }, [open])

  const seleccion = sale.items
    .map((it, i) => {
      const cat = cantidades[i] ?? 0
      return { item: it, idx: i, cantidad: cat }
    })
    .filter((x) => x.cantidad > 0)

  const monto = round2(seleccion.reduce((acc, x) => acc + x.cantidad * x.item.precioUnitario, 0))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (monto <= 0) {
      setError('Seleccione al menos un articulo y una cantidad a devolver.')
      return
    }
    if (monto > sale.total - (sale.devoluciones ?? []).reduce((acc, d) => acc + d.monto, 0)) {
      playError()
      setError('El monto a devolver supera el total restante de la venta.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const devolucion: Devolucion = {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fecha: Date.now(),
        usuario: nombre || user?.email || '',
        motivo: motivo.trim(),
        items: seleccion.map<DevolucionItem>(({ item, cantidad }) => ({
          productoId: item.productoId,
          nombre: item.nombre,
          cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: round2(cantidad * item.precioUnitario),
        })),
        monto,
      }
      await onDone(devolucion)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Devolucion del recibo #${sale.folio}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {sale.items.map((it, i) => {
            const cat = cantidades[i] ?? 0
            return (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{it.nombre}</div>
                  <div className="text-xs text-slate-400">
                    {it.cantidad} x {formatMoney(it.precioUnitario, sym)}
                  </div>
                </div>
                <div className="flex items-center gap-1 w-24 shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => setCantidades((prev) => ({ ...prev, [i]: Math.max((prev[i] ?? 0) - it.cantidad, 0) }))}
                    className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <Icon name="minus" size={13} />
                  </button>
                  <span className="w-9 text-center font-bold text-slate-800 text-sm">{cat || '0'}</span>
                  <button
                    type="button"
                    onClick={() => setCantidades((prev) => ({ ...prev, [i]: Math.min((prev[i] ?? 0) + it.cantidad, it.cantidad) }))}
                    className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <Icon name="plus" size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm">
          <div className="flex justify-between font-bold text-red-700">
            <span>Monto a devolver</span>
            <span>{formatMoney(monto, sym)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-0.5">
            <span>Total restante de la venta</span>
            <span>{formatMoney(sale.total - (sale.devoluciones ?? []).reduce((acc, d) => acc + d.monto, 0), sym)}</span>
          </div>
          {sale.tipo === 'credito' && (
            <p className="text-xs text-slate-500 mt-1">
              Si hay saldo pendiente, la devolucion se descuenta del saldo del cliente.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de la devolucion</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Opcional"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'Registrando...' : `Registrar devolucion (${formatMoney(monto, sym)})`}
        </button>
      </form>
    </Modal>
  )
}

function PaymentModal({
  sale,
  open,
  onClose,
  onPaid,
  sym,
}: {
  sale: Sale
  open: boolean
  onClose: () => void
  onPaid: (monto: number, metodo: string, nota: string) => Promise<void>
  sym: string
}) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setMonto(String(sale.saldo ?? 0))
  }, [open, sale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(monto)
    if (!value || value <= 0) return
    setSaving(true)
    try {
      await onPaid(value, metodo, nota)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Abono al recibo #${sale.folio}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Total</span>
            <span className="font-bold">{formatMoney(sale.total, sym)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Pagado</span>
            <span>{formatMoney(sale.total - sale.saldo, sym)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Saldo</span>
            <span className="text-amber-700">{formatMoney(sale.saldo, sym)}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Monto del abono</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Metodo de pago</label>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
          >
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nota</label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Opcional"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'Registrando...' : 'Registrar abono'}
        </button>
      </form>
    </Modal>
  )
}
