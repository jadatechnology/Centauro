import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getClients } from '../services/clientService'
import { getSales } from '../services/saleService'
import { getStoreConfig } from '../services/configService'
import { useSede } from '../context/SedeContext'
import type { Client, Sale, StoreConfig } from '../types'
import { formatMoney } from '../utils/format'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })
  const { sede, puedeCambiarSede } = useSede()
  const [soloSede, setSoloSede] = useState(true)
  const verSoloSede = !puedeCambiarSede || soloSede

  // Los clientes son compartidos entre sedes, pero el saldo pendiente se muestra por sede
  const salesSede = useMemo(
    () => (verSoloSede && sede ? sales.filter((v) => !v.sedeId || v.sedeId === sede.id) : sales),
    [sales, verSoloSede, sede]
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [c, s, cfg] = await Promise.all([getClients(), getSales(), getStoreConfig()])
        if (!active) return
        setClients(c)
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

  const saldoByClient = useMemo(() => {
    const map: Record<string, number> = {}
    for (const sale of salesSede) {
      if (sale.tipo === 'credito' && sale.clienteId) {
        map[sale.clienteId] = (map[sale.clienteId] ?? 0) + (sale.saldo ?? 0)
      }
    }
    return map
  }, [salesSede])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients
      .filter((c) => c.activo)
      .filter(
        (c) =>
          !q ||
          c.nombre.toLowerCase().includes(q) ||
          (c.telefono || '').toLowerCase().includes(q) ||
          (c.cedula || '').toLowerCase().includes(q)
      )
  }, [clients, search])

  const sym = config.currencySymbol || '$'
  const totalPendiente = clients.reduce((acc, c) => acc + (saldoByClient[c.id!] ?? 0), 0)

  if (loading) return <Spinner className="h-40" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm">
            {filtered.length} clientes · Pendiente total {formatMoney(totalPendiente, sym)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {puedeCambiarSede && sede && (
            <button
              onClick={() => setSoloSede((v) => !v)}
              title={soloSede ? `Mostrando solo ${sede.nombre}` : 'Mostrando todas las sedes'}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium ${
                soloSede ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
              }`}
            >
              {soloSede ? `Solo ${sede.nombre}` : 'Todas las sedes'}
            </button>
          )}
          <Link
            to="/cliente/nuevo"
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center gap-2"
          >
            <Icon name="plus" size={18} />
            Nuevo cliente
          </Link>
        </div>
      </div>

      <div className="relative">
        <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, telefono o cedula..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Icon name="users" size={40} className="mx-auto mb-2" />
          <p>No hay clientes que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-responsive w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Contacto</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Limite credito</th>
                  <th className="px-4 py-3 text-right">Saldo pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const saldo = saldoByClient[c.id!] ?? 0
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3" data-no-label>
                        <Link to={`/cliente/${c.id}`} className="font-semibold text-slate-800 hover:text-teal-700">
                          {c.nombre}
                        </Link>
                        {c.direccion && (
                          <div className="text-xs text-slate-400 hidden sm:block">{c.direccion}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell" data-label="Contacto">
                        {c.telefono && <div>{c.telefono}</div>}
                        {c.cedula && <div className="text-xs text-slate-400">CI: {c.cedula}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell" data-label="Limite credito">
                        {formatMoney(c.limiteCredito ?? 0, sym)}
                      </td>
                      <td className="px-4 py-3 text-right" data-label="Saldo pendiente">
                        {saldo > 0 ? (
                          <span className="font-bold text-amber-600">{formatMoney(saldo, sym)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Al dia</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
