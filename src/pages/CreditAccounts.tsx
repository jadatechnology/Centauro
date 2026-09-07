import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSales, addPayment } from '../services/saleService'
import { getClients } from '../services/clientService'
import { getStoreConfig } from '../services/configService'
import { useAuth } from '../context/AuthContext'
import type { Sale, StoreConfig, Client } from '../types'
import { formatMoney, formatDateTime } from '../utils/format'
import { printReceipt, getReceiptWidth } from '../utils/print'
import { printStatement } from '../utils/statement'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

export default function CreditAccounts() {
  const { user, nombre } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })
  const [paySale, setPaySale] = useState<Sale | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [s, c, cfg] = await Promise.all([getSales(), getClients(), getStoreConfig()])
        if (!active) return
        setSales(s)
        setClients(c)
        setConfig(cfg)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const pendientes = useMemo(
    () => sales.filter((v) => v.tipo === 'credito' && (v.saldo ?? 0) > 0),
    [sales]
  )
  const totalPendiente = pendientes.reduce((acc, v) => acc + (v.saldo ?? 0), 0)
  const sym = config.currencySymbol || '$'

  const grupos = useMemo(() => {
    const map = new Map<string, { key: string; nombre: string; clienteId: string | null; ventas: Sale[]; totalSaldo: number }>()
    for (const v of pendientes) {
      const cid = v.clienteId || ''
      const nombre = v.clienteNombre || 'Sin cliente'
      const key = cid ? `id:${cid}` : `nom:${nombre}`
      const g = map.get(key) ?? { key, nombre, clienteId: v.clienteId, ventas: [], totalSaldo: 0 }
      g.ventas.push(v)
      g.totalSaldo += v.saldo ?? 0
      map.set(key, g)
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [pendientes])

  if (loading) return <Spinner className="h-40" />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Cuentas por cobrar</h1>
        <p className="text-slate-500 text-sm">
          {pendientes.length} creditos activos · Total pendiente{' '}
          <span className="font-bold text-amber-600">{formatMoney(totalPendiente, sym)}</span>
        </p>
      </div>

      {pendientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Icon name="credit" size={40} className="mx-auto mb-2" />
          <p>No hay creditos pendientes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => {
            const cliente = g.clienteId ? clients.find((cl) => cl.id === g.clienteId) ?? null : null
            const ventasCliente = g.clienteId ? sales.filter((s) => s.clienteId === g.clienteId) : g.ventas
            return (
              <div key={g.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-800">
                    {cliente ? (
                      <Link to={`/cliente/${cliente.id}`} className="hover:text-teal-700">
                        {g.nombre}
                      </Link>
                    ) : (
                      g.nombre
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {g.ventas.length} {g.ventas.length === 1 ? 'recibo' : 'recibos'} · Saldo{' '}
                    <span className="font-bold text-amber-600">{formatMoney(g.totalSaldo, sym)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-responsive w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                        <th className="px-4 py-3">Recibo</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Fecha</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Pagado</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3 text-right">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {g.ventas.map((v) => {
                        const pagado = v.total - (v.saldo ?? 0)
                        return (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3" data-no-label>
                              <Link to={`/venta/${v.id}`} className="font-bold text-teal-700 hover:underline">
                                #{v.folio}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell" data-label="Fecha">{formatDateTime(v.createdAt)}</td>
                            <td className="px-4 py-3 text-right text-slate-700" data-label="Total">{formatMoney(v.total, sym)}</td>
                            <td className="px-4 py-3 text-right text-slate-500" data-label="Pagado">{formatMoney(pagado, sym)}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-600" data-label="Saldo">{formatMoney(v.saldo ?? 0, sym)}</td>
                            <td className="px-4 py-3 text-right" data-no-label>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => printStatement(cliente, ventasCliente, config, nombre || user?.email || '')}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                                  title="Imprimir estado de cuenta (formato carta)"
                                >
                                  Estado
                                </button>
                                <button
                                  onClick={() => setPaySale(v)}
                                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                                >
                                  Abonar
                                </button>
                                <button
                                  onClick={() => printReceipt(v, config, v.usuario || nombre || user?.email || '', getReceiptWidth())}
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                                  title="Imprimir recibo"
                                >
                                  <Icon name="print" size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PaymentModal
        sale={paySale}
        onClose={() => setPaySale(null)}
        sym={sym}
        onPaid={async (monto, metodo, nota) => {
          if (!paySale) return
          await addPayment(paySale.id!, paySale, monto, metodo, nota, nombre || user?.email || '')
          const s = await getSales()
          setSales(s)
          setPaySale(null)
        }}
      />
    </div>
  )
}

function PaymentModal({
  sale,
  onClose,
  onPaid,
  sym,
}: {
  sale: Sale | null
  onClose: () => void
  onPaid: (monto: number, metodo: string, nota: string) => Promise<void>
  sym: string
}) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sale) setMonto(String(sale.saldo ?? 0))
  }, [sale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sale) return
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
    <Modal open={Boolean(sale)} onClose={onClose} title={`Abono al recibo #${sale?.folio}`}>
      {sale && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Cliente</span>
              <span className="font-semibold">{sale.clienteNombre || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total</span>
              <span className="font-bold">{formatMoney(sale.total, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pagado</span>
              <span>{formatMoney(sale.total - (sale.saldo ?? 0), sym)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Saldo</span>
              <span className="text-amber-700">{formatMoney(sale.saldo ?? 0, sym)}</span>
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
      )}
    </Modal>
  )
}
