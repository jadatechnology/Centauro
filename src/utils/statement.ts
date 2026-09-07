import { jsPDF } from 'jspdf'
import type { Client, Sale, StoreConfig } from '../types'
import { formatMoney, formatDateTime, formatDate } from './format'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface StatementData {
  client: Client | null
  sales: Sale[]
  config: StoreConfig
  usuario: string
}

function sortSales(sales: Sale[]): Sale[] {
  return [...sales].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
}

function clientName(d: StatementData): string {
  return d.client?.nombre || d.sales[0]?.clienteNombre || 'Consumidor final'
}

function totals(d: StatementData) {
  const compras = d.sales.reduce((acc, v) => acc + v.total, 0)
  const pagado = d.sales.reduce((acc, v) => acc + (v.total - (v.saldo ?? 0)), 0)
  const saldo = d.sales.reduce((acc, v) => acc + (v.saldo ?? 0), 0)
  return { compras, pagado, saldo }
}

function salesRowsHtml(d: StatementData, sym: string): string {
  return sortSales(d.sales)
    .map((sale) => {
      const pagado = sale.total - (sale.saldo ?? 0)
      const payments = (sale.pagos ?? [])
        .map(
          (p) => `
          <tr class="pay-row">
            <td></td>
            <td></td>
            <td class="num">Abono</td>
            <td class="num">${formatMoney(p.monto, sym)}</td>
            <td class="num"></td>
            <td>${escapeHtml(formatDateTime(p.fecha))}${p.nota ? ` · ${escapeHtml(p.nota)}` : ''}</td>
          </tr>`
        )
        .join('')
      return `
      <tr>
        <td class="num">${sale.folio}</td>
        <td>${escapeHtml(formatDateTime(sale.createdAt))}</td>
        <td>${sale.tipo === 'credito' ? 'CREDITO' : 'CONTADO'}</td>
        <td class="num">${formatMoney(sale.total, sym)}</td>
        <td class="num">${formatMoney(pagado, sym)}</td>
        <td class="num">${sale.saldo > 0 ? formatMoney(sale.saldo, sym) : ''}</td>
      </tr>
      ${payments}`
    })
    .join('')
}

export function buildStatementHtml(d: StatementData): string {
  const { config, usuario } = d
  const sym = config.currencySymbol || '$'
  const t = totals(d)
  const c = d.client

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Estado de cuenta - ${escapeHtml(clientName(d))}</title>
<style>
  @page { size: letter; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; line-height: 1.45; }
  .center { text-align: center; }
  .company { font-size: 22px; font-weight: 700; text-transform: uppercase; }
  .muted { color: #555; font-size: 11px; }
  .title { font-size: 18px; font-weight: 700; text-align: center; margin: 18px 0 14px; letter-spacing: 1px; }
  .hr { border-top: 1px solid #999; margin: 10px 0; }
  .client-info { width: 100%; border-collapse: collapse; margin: 10px 0; }
  .client-info td { padding: 3px 0; font-size: 12px; }
  table.list { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.list th { border: 1px solid #444; padding: 6px 8px; font-size: 11px; background: #f1f1f1; text-align: left; }
  table.list td { border: 1px solid #bbb; padding: 5px 8px; font-size: 12px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .pay-row td { background: #fafafa; color: #555; font-size: 11px; }
  .summary { width: 100%; border-collapse: collapse; margin-top: 14px; }
  .summary td { padding: 4px 8px; font-size: 13px; }
  .summary .final { font-size: 16px; font-weight: 700; }
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #555; }
  .sign { margin-top: 42px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; text-align: center; }
  .sign .line { border-top: 1px solid #444; margin-top: 34px; font-size: 11px; }
</style>
</head>
<body>
  <div class="center">
    <div class="company">${escapeHtml(config.company)}</div>
    ${config.slogan ? `<div class="muted">${escapeHtml(config.slogan)}</div>` : ''}
    ${config.taxRegime ? `<div class="muted">${escapeHtml(config.taxRegime)}</div>` : ''}
    ${config.address ? `<div class="muted">${escapeHtml(config.address)}</div>` : ''}
    ${config.phone ? `<div class="muted">Tel: ${escapeHtml(config.phone)}</div>` : ''}
  </div>
  <div class="hr"></div>
  <div class="title">ESTADO DE CUENTA / CIERRE DE CREDITO</div>

  <table class="client-info">
    <tr>
      <td><strong>Cliente:</strong> ${escapeHtml(clientName(d))}</td>
      <td align="right"><strong>Fecha:</strong> ${formatDate(Date.now())}</td>
    </tr>
    <tr>
      <td>${c?.telefono ? `<strong>Telefono:</strong> ${escapeHtml(c.telefono)}` : ''}</td>
      <td align="right"><strong>Emitido por:</strong> ${escapeHtml(usuario)}</td>
    </tr>
    ${c?.cedula ? `<tr><td><strong>Cedula:</strong> ${escapeHtml(c.cedula)}</td><td></td></tr>` : ''}
    ${c?.direccion ? `<tr><td><strong>Direccion:</strong> ${escapeHtml(c.direccion)}</td><td></td></tr>` : ''}
  </table>

  <table class="list">
    <thead>
      <tr>
        <th class="num">Recibo</th>
        <th>Fecha</th>
        <th>Tipo</th>
        <th class="num">Total</th>
        <th class="num">Pagado</th>
        <th class="num">Saldo</th>
      </tr>
    </thead>
    <tbody>${salesRowsHtml(d, sym)}</tbody>
  </table>

  <table class="summary">
    <tr>
      <td>Total de compras</td>
      <td align="right">${formatMoney(t.compras, sym)}</td>
    </tr>
    <tr>
      <td>Total pagado</td>
      <td align="right">${formatMoney(t.pagado, sym)}</td>
    </tr>
    <tr>
      <td class="final">SALDO PENDIENTE</td>
      <td align="right" class="final">${formatMoney(t.saldo, sym)}</td>
    </tr>
    ${c && c.limiteCredito > 0 ? `<tr><td>Limite de credito</td><td align="right">${formatMoney(c.limiteCredito, sym)}</td></tr>` : ''}
  </table>

  ${config.receiptFooter ? `<div class="footer">${escapeHtml(config.receiptFooter)}</div>` : ''}

  <div class="sign">
    <div class="line">Firma del cliente</div>
    <div class="line">Firma del negocio</div>
  </div>
</body>
</html>`
}

export function printStatement(client: Client | null, sales: Sale[], config: StoreConfig, usuario: string): void {
  const w = window.open('', '_blank', 'width=800,height=1000')
  if (!w) {
    alert('Permite las ventanas emergentes para imprimir el estado de cuenta.')
    return
  }
  w.document.open()
  w.document.write(buildStatementHtml({ client, sales, config, usuario }))
  w.document.close()
}

export function openStatementPdf(client: Client | null, sales: Sale[], config: StoreConfig, usuario: string): void {
  const d: StatementData = { client, sales, config, usuario }
  const sym = config.currencySymbol || '$'
  const t = totals(d)
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const pageH = 279.4
  const margin = 20
  const contentW = pageW - margin * 2
  const ink: [number, number, number] = [25, 25, 25]
  const gray: [number, number, number] = [100, 100, 100]

  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const text = (txt: string, opts: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; color?: [number, number, number] } = {}) => {
    const size = opts.size ?? 11
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts.color ?? ink))
    const lines = doc.splitTextToSize(txt, contentW) as string[]
    if (opts.align === 'center') doc.text(lines, pageW / 2, y, { align: 'center' })
    else if (opts.align === 'right') doc.text(lines, pageW - margin, y, { align: 'right' })
    else doc.text(lines, margin, y, { align: 'left' })
    y += lines.length * (size * 0.46)
  }

  const line = () => {
    y += 2
    doc.setDrawColor(150)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 5
  }

  text(config.company || 'MI TIENDA', { size: 18, bold: true, align: 'center' })
  if (config.slogan) text(config.slogan, { size: 10, align: 'center', color: gray })
  if (config.taxRegime) text(config.taxRegime, { size: 10, align: 'center', color: gray })
  if (config.address) text(config.address, { size: 10, align: 'center', color: gray })
  if (config.phone) text(`Tel: ${config.phone}`, { size: 10, align: 'center', color: gray })
  line()
  text('ESTADO DE CUENTA / CIERRE DE CREDITO', { size: 15, bold: true, align: 'center' })
  y += 4

  doc.setFontSize(10.5)
  doc.setTextColor(...ink)
  doc.text(`Cliente: ${clientName(d)}`, margin, y)
  doc.text(`Fecha: ${formatDate(Date.now())}`, pageW - margin, y, { align: 'right' })
  y += 5
  if (d.client?.telefono) doc.text(`Telefono: ${d.client.telefono}`, margin, y)
  doc.text(`Emitido por: ${usuario}`, pageW - margin, y, { align: 'right' })
  y += 5
  if (d.client?.cedula) doc.text(`Cedula: ${d.client.cedula}`, margin, y)
  y += 4

  const colX = { folio: margin, fecha: margin + 20, tipo: margin + 78, total: pageW - margin - 62, pagado: pageW - margin - 32, saldo: pageW - margin }
  const head = () => {
    ensureSpace(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...ink)
    doc.text('Recibo', colX.folio, y)
    doc.text('Fecha', colX.fecha, y)
    doc.text('Tipo', colX.tipo, y)
    doc.text('Total', colX.total, y, { align: 'right' })
    doc.text('Pagado', colX.pagado, y, { align: 'right' })
    doc.text('Saldo', colX.saldo, y, { align: 'right' })
    y += 2
    doc.setDrawColor(60)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 4
  }

  doc.setDrawColor(190)
  doc.setLineWidth(0.15)
  const row = (cols: [string, number, 'left' | 'right'][], pay: boolean) => {
    const height = 5.5
    ensureSpace(height + 1)
    if (pay) {
      doc.setFillColor(248, 248, 248)
      doc.rect(margin, y - 3.6, contentW, height, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(pay ? 9.5 : 10.5)
    doc.setTextColor(...(pay ? gray : ink))
    for (const [val, x, align] of cols) doc.text(val, x, y, { align })
    y += height
    doc.line(margin, y - 0.5, pageW - margin, y - 0.5)
  }

  head()
  for (const sale of sortSales(d.sales)) {
    const pagado = sale.total - (sale.saldo ?? 0)
    row(
      [
        [String(sale.folio), colX.folio, 'left'],
        [formatDateTime(sale.createdAt), colX.fecha, 'left'],
        [sale.tipo === 'credito' ? 'CREDITO' : 'CONTADO', colX.tipo, 'left'],
        [formatMoney(sale.total, sym), colX.total, 'right'],
        [formatMoney(pagado, sym), colX.pagado, 'right'],
        [sale.saldo > 0 ? formatMoney(sale.saldo, sym) : '', colX.saldo, 'right'],
      ],
      false
    )
    for (const p of sale.pagos ?? []) {
      row(
        [
          ['', colX.folio, 'left'],
          ['', colX.fecha, 'left'],
          ['Abono', colX.tipo, 'left'],
          [formatMoney(p.monto, sym), colX.total, 'right'],
          ['', colX.pagado, 'right'],
          [`${formatDateTime(p.fecha)}${p.nota ? ` ${p.nota}` : ''}`, colX.saldo, 'left'],
        ],
        true
      )
    }
  }

  y += 4
  const summary = (label: string, value: string, final = false, saldoColor = false) => {
    ensureSpace(7)
    doc.setFont('helvetica', final ? 'bold' : 'normal')
    doc.setFontSize(final ? 14 : 11)
    doc.setTextColor(...(saldoColor ? ([180, 83, 9] as [number, number, number]) : ink))
    doc.text(label, margin, y)
    doc.text(value, pageW - margin, y, { align: 'right' })
    y += 6
  }
  summary('Total de compras', formatMoney(t.compras, sym))
  summary('Total pagado', formatMoney(t.pagado, sym))
  summary('SALDO PENDIENTE', formatMoney(t.saldo, sym), true, true)
  if (d.client && d.client.limiteCredito > 0) summary('Limite de credito', formatMoney(d.client.limiteCredito, sym))

  y += 8
  if (config.receiptFooter) text(config.receiptFooter, { size: 10, align: 'center', color: gray })

  y += 40
  ensureSpace(16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...ink)
  const signW = contentW * 0.4
  doc.line(margin, y, margin + signW, y)
  doc.line(pageW - margin - signW, y, pageW - margin, y)
  y += 4
  doc.text('Firma del cliente', margin + signW / 2, y, { align: 'center' })
  doc.text('Firma del negocio', pageW - margin - signW / 2, y, { align: 'center' })

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (!w) {
    const a = document.createElement('a')
    a.href = url
    a.download = `estado-cuenta-${clientName(d).replace(/\s+/g, '-')}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
