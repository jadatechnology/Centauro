import type { Sale, StoreConfig } from '../types'
import { formatMoney, formatDateTime, round2 } from './format'
import { openReceiptPdf, isMobileDevice } from './receiptPdf'

export type ReceiptWidth = '80' | '55'
export const RECEIPT_WIDTHS: ReceiptWidth[] = ['80', '55']

const WIDTH_STYLES: Record<
  ReceiptWidth,
  { body: string; font: string; company: string; small: string; total: string; saldo: string }
> = {
  '80': { body: '72mm', font: '11px', company: '16px', small: '10px', total: '15px', saldo: '13px' },
  '55': { body: '48mm', font: '9px', company: '12px', small: '8px', total: '12px', saldo: '10px' },
}

const STORAGE_KEY = 'pv_receipt_width'

export function getReceiptWidth(): ReceiptWidth {
  if (typeof window === 'undefined') return '80'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === '55' ? '55' : '80'
}

export function saveReceiptWidth(width: ReceiptWidth): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, width)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildReceiptHtml(
  sale: Sale,
  config: StoreConfig,
  usuario: string,
  width: ReceiptWidth = '80',
  autoPrint: boolean = true
): string {
  const sym = config.currencySymbol || '$'
  const s = WIDTH_STYLES[width]
  const items = sale.items
    .map((it) => {
      const pct = it.descuentoPct || 0
      const net = round2(it.subtotal * (1 - pct / 100))
      const desc = pct > 0 ? `${it.cantidad} x ${formatMoney(it.precioUnitario, sym)} (${pct}% dcto)` : `${it.cantidad} x ${formatMoney(it.precioUnitario, sym)}`
      return `
      <tr>
        <td class="q">${it.cantidad}</td>
        <td class="desc">${escapeHtml(it.nombre)}</td>
        <td class="num">${formatMoney(net, sym)}</td>
      </tr>
      <tr>
        <td></td>
        <td class="lineinfo">${escapeHtml(desc)}</td>
        <td class="num">${pct > 0 ? `-${formatMoney(round2(it.subtotal - net), sym)}` : ''}</td>
      </tr>`
    })
    .join('')

  const tipoLabel = sale.tipo === 'credito' ? 'CREDITO' : 'CONTADO'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${sale.folio}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${s.body};
    margin: 0 auto;
    padding: 4mm 2mm;
    font-family: 'Roboto Mono', 'Courier New', monospace;
    font-size: ${s.font};
    color: #111;
  }
  .center { text-align: center; }
  .company { font-size: ${s.company}; font-weight: 700; text-transform: uppercase; }
  .slogan { font-size: ${s.small}; margin-top: 2px; }
  .info { font-size: ${s.small}; margin-top: 2px; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .header-line { display: flex; justify-content: space-between; font-size: ${s.font}; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th { text-align: left; font-size: ${s.small}; border-bottom: 1px solid #000; padding: 2px 0; }
  th.num { text-align: right; }
  td { padding: 2px 0; vertical-align: top; }
  td.q { width: ${width === '55' ? '16px' : '22px'}; text-align: center; }
  td.desc { width: auto; }
  td.num { text-align: right; white-space: nowrap; }
  td.lineinfo { font-size: ${width === '55' ? '7px' : '9px'}; color: #555; padding-top: 0; }
  .totals { width: 100%; margin: 4px 0; }
  .totals td { font-size: ${s.small}; }
  .totals .total { font-size: ${s.total}; font-weight: 700; }
  .saldo { font-size: ${s.saldo}; font-weight: 700; }
  .tipo { font-weight: 700; letter-spacing: 1px; margin-top: 4px; }
  .footer { margin-top: 8px; text-align: center; font-size: ${s.small}; }
  @media print {
    body { width: ${s.body}; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="company">${escapeHtml(config.company)}</div>
    ${config.slogan ? `<div class="slogan">${escapeHtml(config.slogan)}</div>` : ''}
    ${config.address ? `<div class="info">${escapeHtml(config.address)}</div>` : ''}
    ${config.phone ? `<div class="info">Tel: ${escapeHtml(config.phone)}</div>` : ''}
    ${config.taxRegime ? `<div class="info">${escapeHtml(config.taxRegime)}</div>` : ''}
  </div>
  <div class="hr"></div>
  <div class="header-line"><span>RECIBO #${sale.folio}</span><span class="tipo">${tipoLabel}</span></div>
  <div class="header-line"><span>Fecha</span><span>${formatDateTime(sale.createdAt)}</span></div>
  <div class="header-line"><span>Cajero</span><span>${escapeHtml(usuario)}</span></div>
  ${sale.clienteNombre ? `<div class="header-line"><span>Cliente</span><span>${escapeHtml(sale.clienteNombre)}</span></div>` : ''}
  ${sale.metodoPago ? `<div class="header-line"><span>Pago</span><span>${escapeHtml(sale.metodoPago)}</span></div>` : ''}
  <div class="hr"></div>
  <table>
    <thead>
      <tr><th>Cant</th><th>Descripcion</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${items}</tbody>
  </table>
  <div class="hr"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td class="num">${formatMoney(sale.subtotal, sym)}</td></tr>
    ${sale.descuento > 0 ? `<tr><td>Descuento</td><td class="num">-${formatMoney(sale.descuento, sym)}</td></tr>` : ''}
    <tr><td class="total">TOTAL</td><td class="num total">${formatMoney(sale.total, sym)}</td></tr>
    ${sale.abonoInicial > 0 ? `<tr><td>Abono</td><td class="num">${formatMoney(sale.abonoInicial, sym)}</td></tr>` : ''}
    ${sale.saldo > 0 ? `<tr><td class="saldo">SALDO</td><td class="num saldo">${formatMoney(sale.saldo, sym)}</td></tr>` : ''}
  </table>
  <div class="hr"></div>
  ${config.receiptFooter ? `<div class="footer">${escapeHtml(config.receiptFooter)}</div>` : ''}
  ${autoPrint ? '<script>window.onload = function () { window.print(); }</script>' : ''}
</body>
</html>`
}

export function printReceipt(sale: Sale, config: StoreConfig, usuario: string, width: ReceiptWidth = '80'): void {
  // En iOS la impresion dentro de un iframe no funciona, se usa la ventana emergente.
  if (isIOSDevice()) {
    const w = window.open('', '_blank', 'width=420,height=640')
    if (!w) {
      alert('Permite las ventanas emergentes para imprimir el recibo.')
      return
    }
    w.document.open()
    w.document.write(buildReceiptHtml(sale, config, usuario, width, true))
    w.document.close()
    return
  }

  // Impresion en un iframe oculto: no se abre una ventana nueva, asi no hay que "volver atras".
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  if (!win) {
    iframe.remove()
    return
  }

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    win.focus()
    win.print()
  }
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 500)
  }

  win.onafterprint = cleanup
  win.onload = doPrint
  win.document.open()
  win.document.write(buildReceiptHtml(sale, config, usuario, width, false))
  win.document.close()
  setTimeout(doPrint, 800)
  setTimeout(cleanup, 30000)
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

// Emite el recibo segun la preferencia de la configuracion:
//  - 'pdf'  -> siempre genera PDF
//  - 'print' -> siempre abre el dialogo de impresion (elegir impresora)
//  - 'auto'  -> movil genera PDF, PC abre el dialogo de impresion
export function emitReceipt(sale: Sale, config: StoreConfig, usuario: string): void {
  const mode = config.receiptMode || 'auto'
  if (mode === 'pdf' || (mode === 'auto' && isMobileDevice())) {
    openReceiptPdf(sale, config, usuario)
  } else {
    printReceipt(sale, config, usuario, getReceiptWidth())
  }
}
