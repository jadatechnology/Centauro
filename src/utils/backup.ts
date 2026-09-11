import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import type { Product, Client, Sale } from '../types'
import { formatMoney, formatDateTime } from './format'

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

function dateStr() {
  return new Date().toISOString().split('T')[0]
}

/* ───────── JSON ───────── */

export async function exportJSON(products: Product[], clients: Client[], sales: Sale[]): Promise<void> {
  const data = {
    exportedAt: new Date().toISOString(),
    app: 'Centauro',
    products,
    clients,
    sales,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadFile(blob, `backup-centauro-${dateStr()}.json`)
}

/* ───────── Excel ───────── */

export async function exportExcel(products: Product[], clients: Client[], sales: Sale[]): Promise<void> {
  const wb = XLSX.utils.book_new()

  const wsProducts = XLSX.utils.json_to_sheet(
    products.map((p) => ({
      Nombre: p.nombre,
      Codigo: p.codigo,
      Categoria: p.categoria,
      Costo: p.costo,
      Precio: p.precio,
      Stock: p.stock,
      'Stock minimo': p.stockMinimo,
      Vencimiento: p.vencimiento || '',
      Activo: p.activo ? 'Si' : 'No',
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Productos')

  const wsClients = XLSX.utils.json_to_sheet(
    clients.map((c) => ({
      Nombre: c.nombre,
      Telefono: c.telefono,
      Email: c.email,
      Cedula: c.cedula,
      Direccion: c.direccion,
      'Limite credito': c.limiteCredito,
      Activo: c.activo ? 'Si' : 'No',
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes')

  const wsSales = XLSX.utils.json_to_sheet(
    sales.map((s) => ({
      Folio: s.folio,
      Fecha: formatDateTime(s.createdAt),
      Tipo: s.tipo === 'credito' ? 'Credito' : 'Contado',
      Cliente: s.clienteNombre || 'Consumidor final',
      Total: s.total,
      Pagado: s.total - (s.saldo || 0),
      Saldo: s.saldo || 0,
      'Metodo pago': s.metodoPago,
      Usuario: s.usuario,
    }))
  )
  XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas')

  const pagos: Record<string, string | number>[] = []
  sales.forEach((s) => {
    s.pagos.forEach((p) => {
      pagos.push({
        'Folio recibo': s.folio,
        Cliente: s.clienteNombre || 'Consumidor final',
        Monto: p.monto,
        Fecha: formatDateTime(p.fecha),
        Metodo: p.metodoPago,
        Nota: p.nota || '',
        Usuario: p.usuario,
      })
    })
  })
  if (pagos.length > 0) {
    const wsPagos = XLSX.utils.json_to_sheet(pagos)
    XLSX.utils.book_append_sheet(wb, wsPagos, 'Abonos')
  }

  XLSX.writeFile(wb, `backup-centauro-${dateStr()}.xlsx`)
}

/* ───────── PDF ───────── */

export function exportPDF(
  products: Product[],
  clients: Client[],
  sales: Sale[],
  config: { company: string; currencySymbol: string }
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const sym = config.currencySymbol || '$'
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentW = pageW - margin * 2
  let y = margin

  const ink: [number, number, number] = [30, 30, 30]
  const gray: [number, number, number] = [110, 110, 110]
  const teal: [number, number, number] = [13, 148, 136]

  const ensurePage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  const title = (txt: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...teal)
    doc.text(txt, margin, y)
    y += 5
    doc.setDrawColor(...teal)
    doc.setLineWidth(0.3)
    doc.line(margin, y, margin + doc.getTextWidth(txt), y)
    y += 5
  }

  const header = (txt: string) => {
    ensurePage(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(txt, margin, y)
    y += 4
  }

  const tableRow = (cells: { text: string; w: number; align?: 'left' | 'center' | 'right'; bold?: boolean }[]) => {
    ensurePage(5)
    let x = margin
    doc.setFontSize(8)
    cells.forEach((c) => {
      doc.setFont('helvetica', c.bold ? 'bold' : 'normal')
      doc.setTextColor(...ink)
      const lines = doc.splitTextToSize(c.text, c.w) as string[]
      doc.text(lines[0] || '', x, y, { align: c.align || 'left' })
      x += c.w
    })
    y += 4.5
  }

  const pageH = doc.internal.pageSize.getHeight()

  /* Encabezado */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...ink)
  doc.text('Copia de Seguridad', margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...gray)
  doc.text(config.company || 'Centauro', margin, y)
  y += 4
  doc.text(`Fecha: ${new Date().toLocaleDateString('es')}  |  Hora: ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`, margin, y)
  y += 4
  doc.text(`Productos: ${products.length}  |  Clientes: ${clients.length}  |  Ventas: ${sales.length}`, margin, y)
  y += 8

  /* Productos */
  title('Productos')
  const pcols = [50, 30, 45, 25, 25, 25] as const
  header(['Nombre', 'Codigo', 'Categoria', 'Precio', 'Stock', 'Vencimiento'].join('   '))
  products.forEach((p) => {
    tableRow([
      { text: p.nombre, w: pcols[0] },
      { text: p.codigo, w: pcols[1] },
      { text: p.categoria, w: pcols[2] },
      { text: formatMoney(p.precio, sym), w: pcols[3], align: 'right' },
      { text: String(p.stock), w: pcols[4], align: 'right' },
      { text: p.vencimiento || '-', w: pcols[5] },
    ])
  })
  y += 6

  /* Clientes */
  ensurePage(20)
  title('Clientes')
  const ccols = [55, 35, 45, 40] as const
  header(['Nombre', 'Telefono', 'Cedula', 'Direccion'].join('   '))
  clients.forEach((c) => {
    tableRow([
      { text: c.nombre, w: ccols[0] },
      { text: c.telefono || '-', w: ccols[1] },
      { text: c.cedula || '-', w: ccols[2] },
      { text: c.direccion || '-', w: ccols[3] },
    ])
  })
  y += 6

  /* Ventas */
  ensurePage(20)
  title('Ventas')
  const vcols = [18, 35, 20, 45, 25, 25] as const
  header(['Folio', 'Fecha', 'Tipo', 'Cliente', 'Total', 'Saldo'].join('   '))
  sales.slice(0, 300).forEach((s) => {
    tableRow([
      { text: `#${s.folio}`, w: vcols[0] },
      { text: formatDateTime(s.createdAt), w: vcols[1] },
      { text: s.tipo === 'credito' ? 'Credito' : 'Contado', w: vcols[2] },
      { text: s.clienteNombre || 'Consumidor final', w: vcols[3] },
      { text: formatMoney(s.total, sym), w: vcols[4], align: 'right' },
      { text: formatMoney(s.saldo ?? 0, sym), w: vcols[5], align: 'right' },
    ])
  })
  if (sales.length > 300) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(`(y ${sales.length - 300} ventas mas)`, margin, y)
  }

  /* Pagina final con pie */
  const lastPageH = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...gray)
  doc.text('Generado por Centauro', margin, lastPageH - 8)

  const blob = doc.output('blob')
  downloadFile(blob, `backup-centauro-${dateStr()}.pdf`)
}
