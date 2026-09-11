import { getSales } from './saleService'
import { getProducts } from './productService'
import { getClients } from './clientService'
import { stockDe } from '../utils/stock'

export interface DashboardStats {
  ventasHoy: number
  totalHoy: number
  ventasMes: number
  totalMes: number
  porCobrar: number
  productosBajoStock: number
  clientes: number
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  return d.getTime()
}

export async function getDashboardStats(sedeId?: string): Promise<DashboardStats> {
  const [ventas, productos, clientes] = await Promise.all([
    getSales(),
    getProducts(),
    getClients(),
  ])

  const now = Date.now()
  const hoyIni = startOfDay(now)
  const mesIni = startOfMonth(now)

  const ventasSede = sedeId ? ventas.filter((v) => v.sedeId === sedeId) : ventas
  const ventasHoy = ventasSede.filter((v) => v.createdAt >= hoyIni)
  const ventasMes = ventasSede.filter((v) => v.createdAt >= mesIni)

  return {
    ventasHoy: ventasHoy.length,
    totalHoy: ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0),
    ventasMes: ventasMes.length,
    totalMes: ventasMes.reduce((acc, v) => acc + (v.total || 0), 0),
    porCobrar: ventasSede.reduce((acc, v) => acc + (v.saldo || 0), 0),
    productosBajoStock: productos.filter((p) => p.activo && stockDe(p, sedeId) <= p.stockMinimo).length,
    clientes: clientes.filter((c) => c.activo).length,
  }
}
