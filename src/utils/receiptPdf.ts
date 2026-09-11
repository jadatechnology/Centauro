import { jsPDF } from 'jspdf'
import type { Sale, StoreConfig } from '../types'
import { formatMoney, formatDateTime, round2 } from './format'
import { type ReceiptWidth } from './print'

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 0 && window.innerWidth < 900
}

interface TicketStyle {
  pageW: number
  pageH: number
  margin: number
  scale: number
  minH: number
}

const TICKET_STYLES: Record<ReceiptWidth, TicketStyle> = {
  '80': { pageW: 80, pageH: 700, margin: 8, scale: 1, minH: 40 },
  '55': { pageW: 55, pageH: 700, margin: 5, scale: 0.78, minH: 40 },
}

// Dibuja el recibo y devuelve la posicion final (alto total en mm).
function renderReceipt(
  doc: jsPDF,
  sale: Sale,
  config: StoreConfig,
  usuario: string,
  st: TicketStyle
): number {
  const { pageW, margin, scale } = st
  const contentW = pageW - margin * 2
  const sym = config.currencySymbol || '$'
  const ink: [number, number, number] = [25, 25, 25]
  const gray: [number, number, number] = [110, 110, 110]
  const fs = (n: number) => n * scale
  const rightCol = contentW * 0.42

  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > st.pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const text = (
    txt: string,
    opts: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; color?: [number, number, number] } = {}
  ) => {
    const size = fs(opts.size ?? 11)
    const align = opts.align ?? 'left'
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts.color ?? ink))
    const lines = doc.splitTextToSize(txt, contentW) as string[]
    if (align === 'center') doc.text(lines, pageW / 2, y, { align: 'center' })
    else if (align === 'right') doc.text(lines, pageW - margin, y, { align: 'right' })
    else doc.text(lines, margin, y, { align: 'left' })
    y += lines.length * (size * 0.46)
  }

  const rule = () => {
    y += 1.5
    doc.setDrawColor(160)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageW - margin, y)
    y += 3
  }

  const row = (
    left: string,
    right: string,
    opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}
  ) => {
    const size = fs(opts.size ?? 10.5)
    const leftLines = doc.splitTextToSize(left, contentW - rightCol) as string[]
    const rightLines = doc.splitTextToSize(right, rightCol) as string[]
    const n = Math.max(leftLines.length, rightLines.length)
    ensureSpace(n * size * 0.46 + 1)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts.color ?? ink))
    for (let i = 0; i < n; i++) {
      if (leftLines[i]) doc.text(leftLines[i], margin, y)
      if (rightLines[i]) doc.text(rightLines[i], pageW - margin, y, { align: 'right' })
      y += size * 0.46
    }
    y += 1
  }

  // Encabezado
  text(config.company || 'MI TIENDA', { size: 17, bold: true, align: 'center' })
  if (config.slogan) text(config.slogan, { size: 10, align: 'center', color: gray })
  if (config.taxRegime) text(config.taxRegime, { size: 10, align: 'center', color: gray })
  if (config.address) text(config.address, { size: 10, align: 'center', color: gray })
  if (config.phone) text(`Tel: ${config.phone}`, { size: 10, align: 'center', color: gray })
  y += 2
  rule()

  // Datos del recibo
  row('RECIBO #' + sale.folio, sale.tipo === 'credito' ? 'CREDITO' : 'CONTADO', { bold: true })
  row('Fecha', formatDateTime(sale.createdAt))
  row('Cajero', usuario)
  if (sale.clienteNombre) row('Cliente', sale.clienteNombre)
  row('Pago', sale.metodoPago || 'Efectivo')
  rule()

  // Items
  const qtyW = 14 * scale
  const descStart = margin + qtyW
  const descW = contentW - qtyW - rightCol - 2
  ensureSpace(16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fs(10))
  doc.setTextColor(...ink)
  doc.text('Cant', margin, y)
  doc.text('Descripcion', descStart, y)
  doc.text('Total', pageW - margin, y, { align: 'right' })
  y += 3
  doc.setDrawColor(25)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fs(10))
  for (const it of sale.items) {
    const pct = it.descuentoPct || 0
    const net = round2(it.subtotal * (1 - pct / 100))
    const descLines = doc.splitTextToSize(it.nombre, descW) as string[]
    const qtyLine = String(it.cantidad)
    const totalLine = formatMoney(net, sym)
    const n = Math.max(descLines.length, 1)
    ensureSpace(n * 4.6 * scale + 1)
    for (let i = 0; i < n; i++) {
      doc.setTextColor(...ink)
      if (i === 0) doc.text(qtyLine, margin, y)
      doc.text(descLines[i] ?? '', descStart, y)
      if (i === 0) doc.text(totalLine, pageW - margin, y, { align: 'right' })
      y += 4.6 * scale
    }
    if (pct > 0) {
      doc.setFontSize(fs(8))
      doc.setTextColor(...gray)
      doc.text(`${it.cantidad} x ${formatMoney(it.precioUnitario, sym)} (${pct}% dcto) -${formatMoney(round2(it.subtotal - net), sym)}`, descStart, y)
      y += 3
      doc.setFontSize(fs(10))
    }
    y += 1
  }
  rule()

  // Totales
  row('Subtotal', formatMoney(sale.subtotal, sym))
  if (sale.descuento > 0) row('Descuento', `-${formatMoney(sale.descuento, sym)}`)
  row('TOTAL', formatMoney(sale.total, sym), { bold: true, size: 13 })
  if (sale.abonoInicial > 0) row('Abono inicial', formatMoney(sale.abonoInicial, sym))
  if (sale.saldo > 0) row('SALDO PENDIENTE', formatMoney(sale.saldo, sym), { bold: true, color: [180, 83, 9] })
  y += 2

  // Pie
  if (config.receiptFooter) {
    y += 2
    text(config.receiptFooter, { size: 10, align: 'center', color: gray })
  }
  text('Generado por Centauro', { size: 8, align: 'center', color: gray })

  return y
}

export function buildReceiptPdf(
  sale: Sale,
  config: StoreConfig,
  usuario: string,
  width: ReceiptWidth = '80'
): jsPDF {
  const st = TICKET_STYLES[width]

  // Primer pase: medir el alto real del contenido.
  const probe = new jsPDF({ unit: 'mm', format: [st.pageW, 700] })
  const endY = renderReceipt(probe, sale, config, usuario, { ...st, pageH: 700 })
  const pageH = Math.max(st.minH, Math.ceil(endY + st.margin))

  // Segundo pase: generar el PDF con la altura exacta.
  const doc = new jsPDF({ unit: 'mm', format: [st.pageW, pageH] })
  renderReceipt(doc, sale, config, usuario, { ...st, pageH })
  return doc
}

export function openReceiptPdf(
  sale: Sale,
  config: StoreConfig,
  usuario: string,
  width: ReceiptWidth = '80'
): void {
  const doc = buildReceiptPdf(sale, config, usuario, width)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (!w) {
    const a = document.createElement('a')
    a.href = url
    a.download = `recibo-${sale.folio}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
