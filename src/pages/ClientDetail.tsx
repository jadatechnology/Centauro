import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClient } from '../services/clientService'
import { getSales, addPayment } from '../services/saleService'
import { getStoreConfig } from '../services/configService'
import { useAuth } from '../context/AuthContext'
import type { Client, Sale, StoreConfig } from '../types'
import { formatMoney, formatDateTime } from '../utils/format'
import { printStatement } from '../utils/statement'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

export default function ClientDetail() {
  const { id } = useParams()
  const { user, nombre } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })
  const [paySale, setPaySale] = useState<Sale | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    const load = async () => {
      try {
        const [c, s, cfg] = await Promise.all([getClient(id), getSales(), getStoreConfig()])
        if (!active) return
        setClient(c)
        setSales(s.filter((v) => v.clienteId === id))
        setConfig(cfg)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  const saldoTotal = useMemo(() => sales.reduce((acc, v) => acc + (v.saldo ?? 0), 0), [sales])
  const sym = config.currencySymbol || '$'

  if (loading) return <Spinner className="h-40" />
  if (!client) return <p className="text-slate-500">Cliente no encontrado.</p>

  const creditSales = sales.filter((v) => v.tipo === 'credito' && (v.saldo ?? 0) > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/clientes" className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
          <Icon name="chevron" size={18} className="rotate-180" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{client.nombre}</h1>
          <p className="text-sm text-slate-500">
            {client.telefono}
            {client.telefono && client.cedula ? ' · ' : ''}
            {client.cedula && `CI ${client.cedula}`}
          </p>
        </div>
        <Link
          to={`/cliente/${id}/editar`}
          className="px-3 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-700"
        >
          <Icon name="pencil" size={15} />
          Editar
        </Link>
        <button
          onClick={() => printStatement(client, sales, config, nombre || user?.email || '')}
          className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-teal-700"
          title="Imprimir estado de cuenta en formato carta"
        >
          <Icon name="print" size={15} />
          Estado de cuenta
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-xs text-slate-500">Saldo pendiente</div>
          <div className={`text-xl font-bold ${saldoTotal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatMoney(saldoTotal, sym)}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-xs text-slate-500">Limite de credito</div>
          <div className="text-xl font-bold text-slate-800">{formatMoney(client.limiteCredito ?? 0, sym)}</div>
        </div>
      </div>

      {saldoTotal > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-slate-800 mb-3">Creditos pendientes</h2>
          {creditSales.length === 0 ? (
            <p className="text-sm text-slate-400">Sin creditos pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {creditSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      Recibo #{sale.folio} · {formatDateTime(sale.createdAt)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Total {formatMoney(sale.total, sym)} · Pagado {formatMoney(sale.total - sale.saldo, sym)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-600">{formatMoney(sale.saldo, sym)}</span>
                    <button
                      onClick={() => setPaySale(sale)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                    >
                      Abonar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h2 className="font-bold text-slate-800 px-4 py-3 border-b border-slate-100">Historial de compras</h2>
        {sales.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Este cliente no tiene compras registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link to={`/venta/${sale.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">#{sale.folio}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(sale.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">{formatMoney(sale.total, sym)}</div>
                    <div className={`text-xs ${sale.saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {sale.saldo > 0 ? `Debe ${formatMoney(sale.saldo, sym)}` : 'Pagado'}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PaymentModal
        sale={paySale}
        onClose={() => setPaySale(null)}
        onPaid={async (monto, metodo, nota) => {
          if (!paySale || !id) return
          await addPayment(paySale.id!, paySale, monto, metodo, nota, nombre || user?.email || '')
          const [c, s, cfg] = await Promise.all([getClient(id), getSales(), getStoreConfig()])
          setClient(c)
          setSales(s.filter((v) => v.clienteId === id))
          setConfig(cfg)
          setPaySale(null)
        }}
        sym={sym}
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
