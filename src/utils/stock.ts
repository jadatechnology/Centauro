import type { Product } from '../types'

export function stockDe(p: Product, sedeId?: string | null): number {
  if (sedeId && p.stockPorSede && p.stockPorSede[sedeId] !== undefined) {
    return p.stockPorSede[sedeId]
  }
  return p.stock ?? 0
}