import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSales, deleteSale } from '../services/saleService'
import { getStoreConfig } from '../services/configService'
import { startOfDay, startOfMonth } from '../services/statsService'
import { useSede } from '../context/SedeContext'
import type { Sale, StoreConfig } from '../types'
import { formatMoney, formatDateTime } from '../utils/format'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'

type Periodo = 'hoy' | 'mes' | 'todo'

export default function SalesList() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [tipo, setTipo] = useState<'todas' | 'contado' | 'credito'>('todas')
  const [search, setSearch] = useState('')
  const { sede, puedeCambiarSede } = useSede()
  const [soloSede, setSoloSede] = useState(true)
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })

  // Los usuarios que no son administradores solo ven su sede activa
  const verSoloSede = !puedeCambiarSede || soloSede

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [s, cfg] = await Promise.all([getSales(), getStoreConfig()])
        if (!active) return
        setSales(s)
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

  const filtered = useMemo(() => {
    const now = Date.now()
    const q = search.trim().toLowerCase()
    return sales
      .filter((v) => (verSoloSede && sede ? !v.sedeId || v.sedeId === sede.id : true))
      .filter((v) => (periodo === 'hoy' ? v.createdAt >= startOfDay(now) : periodo === 'mes' ? v.createdAt >= startOfMonth(now) : true))
      .filter((v) => (tipo === 'todas' ? true : v.tipo === tipo))
      .filter(
        (v) =>
          !q ||
          String(v.folio).includes(q) ||
          (v.clienteNombre || '').toLowerCase().includes(q) ||
          (v.usuario || '').toLowerCase().includes(q)
      )
  }, [sales, periodo, tipo, search, verSoloSede, sede])

  const sym = config.currencySymbol || '$'
  const totalFiltrado = filtered.reduce((acc, v) => acc + (v.total ?? 0), 0)
  const pendienteFiltrado = filtered.reduce((acc, v) => acc + (v.saldo ?? 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
        <p className="text-slate-500 text-sm">
          {filtered.length} ventas · {formatMoney(totalFiltrado, sym)}
          {pendienteFiltrado > 0 && ` · pendiente ${formatMoney(pendienteFiltrado, sym)}`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2">
          {(['hoy', 'mes', 'todo'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-2 rounded-xl text-sm font-medium capitalize ${
                periodo === p ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
              }`}
            >
              {p === 'todo' ? 'Todas' : p === 'hoy' ? 'Hoy' : 'Este mes'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['todas', 'contado', 'credito'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-3 py-2 rounded-xl text-sm font-medium capitalize ${
                tipo === t ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-600'
              }`}
            >
              {t === 'todas' ? 'Todas' : t}
            </button>
          ))}
        </div>
        {puedeCambiarSede && sede && (
          <button
            onClick={() => setSoloSede((v) => !v)}
            title={soloSede ? `Mostrando solo ${sede.nombre}` : 'Mostrando todas las sedes'}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${
              soloSede ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
            }`}
          >
            {soloSede ? `Solo ${sede.nombre}` : 'Todas las sedes'}
          </button>
        )}
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, cliente o cajero..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <Spinner className="h-40" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Icon name="wallet" size={40} className="mx-auto mb-2" />
          <p>No hay ventas que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-responsive w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3">Recibo</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 hidden md:table-cell">Sede</th>
                  <th className="px-4 py-3 hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  {puedeCambiarSede && <th className="px-4 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3" data-no-label>
                      <Link to={`/venta/${v.id}`} className="font-bold text-teal-700 hover:underline">
                        #{v.folio}
                      </Link>
                      <div className="text-xs text-slate-400 sm:hidden">{formatDateTime(v.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell" data-label="Fecha">{formatDateTime(v.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-700" data-label="Cliente">{v.clienteNombre || <span className="text-slate-400">Consumidor final</span>}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500" data-label="Sede">
                      {v.sedeNombre || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" data-label="Tipo">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          v.tipo === 'credito' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {v.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800" data-label="Total">{formatMoney(v.total, sym)}</td>
                    <td className="px-4 py-3 text-right" data-label="Saldo">
                      {v.saldo > 0 ? (
                        <span className="font-bold text-amber-600">{formatMoney(v.saldo, sym)}</span>
                      ) : (
                        <span className="text-emerald-600">-</span>
                      )}
                    </td>
                    {puedeCambiarSede && (
                      <td className="px-4 py-3 text-right" data-no-label>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Eliminar la venta #${v.folio}? Se restaurara el stock vendido. Esta accion no se puede deshacer.`)) return
                            await deleteSale(v)
                            setSales((prev) => prev.filter((s) => s.id !== v.id))
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar venta (solo administrador)"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
