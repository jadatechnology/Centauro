import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats, DashboardStats } from '../services/statsService'
import { getSales } from '../services/saleService'
import { getProducts } from '../services/productService'
import { getStoreConfig } from '../services/configService'
import { useAuth } from '../context/AuthContext'
import type { Sale, Product, StoreConfig } from '../types'
import { formatMoney, formatDateTime } from '../utils/format'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'

export default function Dashboard() {
  const { nombre } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [config, setConfig] = useState<StoreConfig>({ company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto' })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [s, sales, products, cfg] = await Promise.all([
          getDashboardStats(),
          getSales(),
          getProducts(),
          getStoreConfig(),
        ])
        if (!active) return
        setStats(s)
        setRecentSales(sales.slice(0, 5))
        setLowStock(products.filter((p) => p.activo && p.stock <= p.stockMinimo).slice(0, 5))
        setConfig(cfg)
      } catch {
        if (active) {
          setStats({
            ventasHoy: 0,
            totalHoy: 0,
            ventasMes: 0,
            totalMes: 0,
            porCobrar: 0,
            productosBajoStock: 0,
            clientes: 0,
          })
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const sym = config.currencySymbol || '$'

  if (!stats) return <Spinner className="h-64" />

  const cards = [
    {
      label: 'Ventas hoy',
      value: `${stats.ventasHoy}`,
      sub: formatMoney(stats.totalHoy, sym),
      icon: 'wallet',
      color: 'bg-teal-600',
    },
    {
      label: 'Ventas del mes',
      value: `${stats.ventasMes}`,
      sub: formatMoney(stats.totalMes, sym),
      icon: 'chart',
      color: 'bg-blue-600',
    },
    {
      label: 'Por cobrar',
      value: formatMoney(stats.porCobrar, sym),
      sub: 'creditos pendientes',
      icon: 'credit',
      color: 'bg-amber-500',
    },
    {
      label: 'Stock bajo',
      value: `${stats.productosBajoStock}`,
      sub: `${stats.clientes} clientes activos`,
      icon: 'box',
      color: stats.productosBajoStock > 0 ? 'bg-red-600' : 'bg-emerald-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hola, {nombre.split(' ')[0]}</h1>
          <p className="text-slate-500 text-sm">{config.company}</p>
        </div>
        <Link
          to="/vender"
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center gap-2"
        >
          <Icon name="cart" size={18} />
          Nueva venta
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm p-4">
            <div className={`w-10 h-10 rounded-xl ${card.color} text-white flex items-center justify-center mb-3`}>
              <Icon name={card.icon} size={20} />
            </div>
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="text-lg font-bold text-slate-800">{card.value}</div>
            <div className="text-xs text-slate-400">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Ultimas ventas</h2>
            <Link to="/ventas" className="text-teal-600 text-sm font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Aun no hay ventas registradas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <li key={sale.id}>
                  <Link
                    to={`/venta/${sale.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        #{sale.folio} {sale.clienteNombre && `- ${sale.clienteNombre}`}
                      </div>
                      <div className="text-xs text-slate-400">{formatDateTime(sale.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">
                        {formatMoney(sale.total, sym)}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          sale.tipo === 'credito' ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {sale.tipo === 'credito' ? `Saldo ${formatMoney(sale.saldo, sym)}` : 'Contado'}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Stock bajo</h2>
            <Link to="/productos" className="text-teal-600 text-sm font-medium hover:underline">
              Inventario
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Ningun producto por debajo del minimo.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/producto/${p.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{p.nombre}</div>
                      <div className="text-xs text-slate-400">
                        {p.codigo} {p.categoria ? `· ${p.categoria}` : ''}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        p.stock === 0 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {p.stock} uds
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
