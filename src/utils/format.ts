export function formatMoney(n: number, symbol = '$'): string {
  const value = Number.isFinite(n) ? n : 0
  return `${symbol}${value.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
