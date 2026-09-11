import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { getClients } from '../services/clientService'
import { getStoreConfig } from '../services/configService'
import { createSale, getSale, getSales } from '../services/saleService'
import { useAuth } from '../context/AuthContext'
import { useSede } from '../context/SedeContext'
import type { Product, Client, StoreConfig, SaleItem, Sale } from '../types'
import { formatMoney, round2, titleCase } from '../utils/format'
import { stockDe } from '../utils/stock'
import { printReceipt, getReceiptWidth } from '../utils/print'
import { openReceiptPdf } from '../utils/receiptPdf'
import { playBeep, playError } from '../utils/sound'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import ScannerInput from '../components/ScannerInput'
import Modal from '../components/Modal'
import CameraScanner from '../components/CameraScanner'
import ReceiptModal from '../components/ReceiptModal'

interface CartLine extends SaleItem {}

interface Session {
  id: string
  cart: CartLine[]
  cliente: Client | null
  tipo: 'contado' | 'credito'
  abono: string
  metodoPago: string
}

let sessionSeq = 0
function createSession(): Session {
  sessionSeq += 1
  return {
    id: `venta_${sessionSeq}`,
    cart: [],
    cliente: null,
    tipo: 'contado',
    abono: '',
    metodoPago: 'Efectivo',
  }
}

export default function POS() {
  const { user, nombre } = useAuth()
  const { sede } = useSede()
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null)
  const [saving, setSaving] = useState(false)
  const [sueltoOpen, setSueltoOpen] = useState(false)
  const [suelto, setSuelto] = useState({ nombre: '', precio: '', cantidad: '1' })

  const [saleState, setSaleState] = useState(() => {
    const first = createSession()
    return { sessions: [first], activeId: first.id }
  })
  const { sessions, activeId } = saleState
  const active = sessions.find((s) => s.id === activeId) ?? sessions[0]

  const patchSessions = (updater: (prev: Session[]) => Session[]) =>
    setSaleState((prev) => ({ ...prev, sessions: updater(prev.sessions) }))
  const patchActive = (patch: Partial<Session>) =>
    setSaleState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === prev.activeId ? { ...s, ...patch } : s)),
    }))
  const addSession = () => {
    const s = createSession()
    setSaleState((prev) => ({ sessions: [...prev.sessions, s], activeId: s.id }))
  }
  const closeSession = (id: string) => {
    setSaleState((prev) => {
      const next = prev.sessions.filter((s) => s.id !== id)
      if (next.length === 0) {
        const fresh = createSession()
        return { sessions: [fresh], activeId: fresh.id }
      }
      const newActive = prev.activeId === id ? next[next.length - 1].id : prev.activeId
      return { sessions: next, activeId: newActive }
    })
  }

  const load = async () => {
    try {
      const [p, c, cfg, s] = await Promise.all([getProducts(), getClients(), getStoreConfig(), getSales()])
      setProducts(p)
      setClients(c)
      setConfig(cfg)
      setSales(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sym = config.currencySymbol || '$'

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => p.activo && stockDe(p, sede?.id) > 0)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
      .slice(0, 10)
  }, [products, search, sede])

  const clientResults = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase()
    return clients
      .filter((c) => c.activo)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.telefono || '').toLowerCase().includes(q))
      .slice(0, 6)
  }, [clients, clienteSearch])

  const subtotal = useMemo(() => round2(active.cart.reduce((acc, it) => acc + it.subtotal, 0)), [active])
  const desc = round2(
    active.cart.reduce((acc, it) => acc + (it.descuentoPct ?? 0) * it.subtotal / 100, 0)
  )
  const total = round2(Math.max(subtotal - desc, 0))
  const abonoValue = active.tipo === 'credito' ? Number(active.abono) || 0 : 0

  const clienteSaldo = useMemo(() => {
    if (!active.cliente) return 0
    return sales
      .filter((v) => v.clienteId === active.cliente!.id && v.tipo === 'credito' && (!sede || !v.sedeId || v.sedeId === sede.id))
      .reduce((acc, v) => acc + (v.saldo ?? 0), 0)
  }, [sales, active, sede])

  const addToCart = (p: Product) => {
    playBeep()
    setFeedback(null)
    patchSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s
        const existing = s.cart.find((it) => it.productoId === p.id)
        const inCart = existing ? existing.cantidad : 0
        if (inCart + 1 > stockDe(p, sede?.id)) {
          playError()
          setFeedback({ type: 'error', text: `Stock insuficiente de "${p.nombre}" (quedan ${stockDe(p, sede?.id)}).` })
          return s
        }
        if (existing) {
          return {
            ...s,
            cart: s.cart.map((it) =>
              it.productoId === p.id
                ? { ...it, cantidad: it.cantidad + 1, subtotal: round2((it.cantidad + 1) * it.precioUnitario) }
                : it
            ),
          }
        }
        return {
          ...s,
          cart: [
            ...s.cart,
            {
              productoId: p.id!,
              nombre: p.nombre,
              codigo: p.codigo,
              cantidad: 1,
              precioUnitario: p.precio,
              descuentoPct: 0,
              subtotal: p.precio,
            },
          ],
        }
      })
    )
  }

  const handleScan = (code: string) => {
    const p = products.find((x) => x.codigo.toLowerCase() === code.trim().toLowerCase())
    if (p) {
      addToCart(p)
    } else {
      playError()
      setFeedback({ type: 'error', text: `Codigo ${code} no encontrado en el inventario.` })
    }
  }

  const addSuelto = (e: React.FormEvent) => {
    e.preventDefault()
    const nombre = suelto.nombre.trim()
    const precio = Number(suelto.precio)
    const cantidad = Number(suelto.cantidad) || 1
    if (!nombre) return setFeedback({ type: 'error', text: 'Escriba el nombre del articulo.' })
    if (!precio || precio <= 0) return setFeedback({ type: 'error', text: 'Indique un precio valido.' })
    if (!cantidad || cantidad <= 0) return setFeedback({ type: 'error', text: 'Indique una cantidad valida.' })
    playBeep()
    setFeedback(null)
    const line: CartLine = {
      productoId: `suelto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      nombre: titleCase(nombre),
      codigo: '',
      cantidad,
      precioUnitario: precio,
      subtotal: round2(precio * cantidad),
      suelto: true,
    }
    patchSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, cart: [...s.cart, line] } : s)))
    setSuelto({ nombre: '', precio: '', cantidad: '1' })
    setSueltoOpen(false)
  }

  const changeQty = (productoId: string, delta: number) => {
    patchSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s
        return {
          ...s,
          cart: s.cart.map((it) => {
            if (it.productoId !== productoId) return it
            const next = it.cantidad + delta
            const product = products.find((p) => p.id === productoId)
            if (next <= 0) return it
            if (product && next > stockDe(product, sede?.id)) {
              playError()
              setFeedback({ type: 'error', text: `Stock maximo disponible: ${stockDe(product, sede?.id)}.` })
              return it
            }
            return { ...it, cantidad: next, subtotal: round2(next * it.precioUnitario) }
          }),
        }
      })
    )
  }

  const removeLine = (productoId: string) =>
    patchSessions((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, cart: s.cart.filter((it) => it.productoId !== productoId) } : s))
    )

  const setLineDiscount = (productoId: string, pct: number) => {
    const p = Math.max(0, Math.min(100, isNaN(pct) ? 0 : pct))
    patchSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s
        return {
          ...s,
          cart: s.cart.map((it) => (it.productoId === productoId ? { ...it, descuentoPct: p } : it)),
        }
      })
    )
  }

  const confirmSale = async () => {
    setFeedback(null)
    if (!active) return
    if (active.cart.length === 0) return setFeedback({ type: 'error', text: 'Agregue al menos un producto.' })
    if (active.tipo === 'credito' && !active.cliente)
      return setFeedback({ type: 'error', text: 'Para venta a credito debe seleccionar un cliente.' })
    if (active.cart.some((it) => (it.descuentoPct ?? 0) > 100))
      return setFeedback({ type: 'error', text: 'El descuento por producto no puede superar el 100%.' })
    if (active.tipo === 'credito' && abonoValue > total)
      return setFeedback({ type: 'error', text: 'El abono no puede superar el total.' })
    if (active.cliente && active.tipo === 'credito') {
      const nuevoSaldo = round2(total - abonoValue + clienteSaldo)
      if (nuevoSaldo > (active.cliente.limiteCredito ?? 0)) {
        return setFeedback({
          type: 'error',
          text: `El saldo del cliente (${formatMoney(nuevoSaldo, sym)}) excede su limite de credito (${formatMoney(
            active.cliente.limiteCredito ?? 0,
            sym
          )}).`,
        })
      }
    }
    if (active.tipo === 'credito' && clienteSaldo > 0) {
      const confirmMsg = `El cliente ya debe ${formatMoney(clienteSaldo, sym)}. ¿Desea continuar?`
      if (!window.confirm(confirmMsg)) return
    }
    for (const it of active.cart) {
      const product = products.find((p) => p.id === it.productoId)
      if (product && it.cantidad > stockDe(product, sede?.id)) {
        return setFeedback({ type: 'error', text: `Stock insuficiente de "${it.nombre}".` })
      }
    }

    setSaving(true)
    let saleId: string | null = null
    try {
      saleId = await createSale({
        tipo: active.tipo,
        items: active.cart,
        subtotal,
        descuento: desc,
        total,
        abonoInicial: abonoValue,
        metodoPago: active.tipo === 'contado' ? active.metodoPago : 'Credito',
        clienteId: active.cliente ? active.cliente.id! : null,
        clienteNombre: active.cliente ? active.cliente.nombre : '',
        usuario: nombre || user?.email || '',
        sedeId: sede?.id,
        sedeNombre: sede?.nombre,
      })
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo registrar la venta. Verifique la conexion y vuelva a intentarlo.' })
      setSaving(false)
      return
    }

    let saved: Sale | null = null
    try {
      saved = await getSale(saleId)
    } catch {
      saved = null
    }
    if (saved) setLastSale(saved)
    try {
      await load()
    } catch {
      // la venta ya quedo registrada; no bloquear
    }
    if (saved) setReceiptSale(saved)

    setSaving(false)
    setClientModalOpen(false)
    setClienteSearch('')
    closeSession(active.id)
    setFeedback({ type: 'ok', text: saved ? `Venta #${saved.folio} registrada.` : 'Venta registrada.' })
  }

  if (loading) return <Spinner className="h-40" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nueva venta</h1>
          <p className="text-slate-500 text-sm">
            {sede ? `Vendiendo en ${sede.nombre}` : 'Escanea o busca los productos'}
          </p>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2"
        >
          <Icon name="camera" size={18} />
          Escanear con camara
        </button>
      </div>

      {feedback && (
        <div
          className={`text-sm px-3 py-2 rounded-lg border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {lastSale && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Venta #{lastSale.folio} registrada.</span>
          <span className="flex items-center gap-3">
            <button
              onClick={() => openReceiptPdf(lastSale, config, nombre || user?.email || '', getReceiptWidth())}
              className="underline font-semibold flex items-center gap-1 hover:text-emerald-800"
            >
              <Icon name="download" size={14} />
              PDF
            </button>
            <button
              onClick={() => printReceipt(lastSale, config, nombre || user?.email || '', getReceiptWidth())}
              className="underline font-semibold flex items-center gap-1 hover:text-emerald-800"
            >
              <Icon name="print" size={14} />
              Imprimir
            </button>
            {lastSale.id && (
              <Link to={`/venta/${lastSale.id}`} className="underline font-semibold">
                Ver recibo
              </Link>
            )}
            <button onClick={() => setLastSale(null)} aria-label="Cerrar aviso" className="hover:text-emerald-800">
              <Icon name="x" size={15} />
            </button>
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Columna izquierda: busqueda de productos */}
        <div className="space-y-3">
          <ScannerInput onScan={handleScan} />
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre o codigo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={() => setSueltoOpen(true)}
            className="w-full px-3 py-2.5 rounded-xl border border-dashed border-teal-400 text-teal-700 hover:bg-teal-50 text-sm font-semibold flex items-center justify-center gap-2"
            title="Articulo sin codigo de barras (por unidad o a granel)"
          >
            <Icon name="plus" size={16} />
            Articulo suelto (sin codigo)
          </button>

          <div className={`rounded-2xl shadow-sm divide-y divide-slate-100 max-h-80 overflow-y-auto ${search ? 'block bg-teal-50/80 border border-teal-200' : 'hidden lg:block bg-white'}`}>
            {filteredProducts.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">
                {search ? 'Sin resultados. Use la camara o verifique el codigo.' : 'No hay productos con stock disponible.'}
              </p>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                >
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{p.nombre}</div>
                    <div className="text-xs text-slate-400 font-mono">{p.codigo}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 text-sm">{formatMoney(p.precio, sym)}</div>
                    <div className={`text-xs ${stockDe(p, sede?.id) <= p.stockMinimo ? 'text-amber-600' : 'text-slate-400'}`}>
                      {stockDe(p, sede?.id)} uds
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Columna derecha: carrito y cobro */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {sessions.map((s) => {
              const isActive = s.id === activeId
              return (
                <div
                  key={s.id}
                  onClick={() => setSaleState((prev) => ({ ...prev, activeId: s.id }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer border ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>
                    {s.tipo === 'credito' && s.cliente
                      ? s.cliente.nombre
                      : `${sessions.indexOf(s) + 1}ª venta`}
                  </span>
                  {s.cart.length > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive ? 'bg-white/25' : 'bg-slate-200'
                      }`}
                    >
                      {s.cart.length}
                    </span>
                  )}
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        closeSession(s.id)
                      }}
                      className={`ml-0.5 rounded-full p-0.5 ${
                        isActive ? 'hover:bg-white/20' : 'hover:bg-slate-200'
                      }`}
                      aria-label="Cerrar venta"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={addSession}
              className="shrink-0 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 text-sm font-semibold flex items-center gap-1"
              title="Nueva venta"
            >
              <Icon name="plus" size={15} />
              Nueva
            </button>
          </div>

          <h2 className="font-bold text-slate-800">Carrito ({active.cart.length} items)</h2>

          {active.cart.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Icon name="cart" size={36} className="mx-auto mb-2" />
              <p className="text-sm">Escanee un codigo o toque un producto para agregarlo.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {active.cart.map((it) => (
                <li key={it.productoId} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{it.nombre}</div>
                    <div className="text-xs text-slate-400">
                      {formatMoney(it.precioUnitario, sym)} c/u
                      {it.descuentoPct
                        ? ` · -${it.descuentoPct}% (${formatMoney(
                            round2(it.subtotal * (1 - (it.descuentoPct ?? 0) / 100)),
                            sym
                          )})`
                        : ''}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Desc</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={it.descuentoPct ?? 0}
                        onChange={(e) => setLineDiscount(it.productoId, Number(e.target.value))}
                        className="w-12 px-1 py-0.5 rounded-md border border-slate-200 text-right text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(it.productoId, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-slate-800 text-sm">{it.cantidad}</span>
                    <button
                      onClick={() => changeQty(it.productoId, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <div className="w-20 text-right font-bold text-slate-800 text-sm">
                    {formatMoney(round2(it.subtotal * (1 - (it.descuentoPct ?? 0) / 100)), sym)}
                  </div>
                  <button
                    onClick={() => removeLine(it.productoId)}
                    className="text-slate-400 hover:text-red-600"
                    title="Quitar"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatMoney(subtotal, sym)}</span>
            </div>
            {desc > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Descuento</span>
                <span className="font-semibold">-{formatMoney(desc, sym)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-slate-800">
              <span>TOTAL</span>
              <span>{formatMoney(total, sym)}</span>
            </div>
            {active.tipo === 'credito' && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Abono inicial</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={active.abono}
                    onChange={(e) => patchActive({ abono: e.target.value })}
                    className="w-28 px-2 py-1.5 rounded-lg border border-slate-300 text-right text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex justify-between font-bold text-amber-700">
                  <span>SALDO A PAGAR</span>
                  <span>{formatMoney(round2(Math.max(total - abonoValue, 0)), sym)}</span>
                </div>
              </>
            )}
          </div>

          <div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => patchActive({ tipo: 'contado' })}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                  active.tipo === 'contado'
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-300 text-slate-600'
                }`}
              >
                Contado
              </button>
              <button
                onClick={() => patchActive({ tipo: 'credito' })}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                  active.tipo === 'credito'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-slate-300 text-slate-600'
                }`}
              >
                Credito
              </button>
            </div>

            <button
              onClick={() => setClientModalOpen(true)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm flex items-center justify-between ${
                active.cliente ? 'border-teal-500 bg-teal-50 text-slate-800' : 'border-slate-300 text-slate-500'
              }`}
            >
              <span className="truncate">
                {active.tipo === 'credito'
                  ? 'Cliente (obligatorio)'
                  : active.cliente
                  ? active.cliente.nombre
                  : 'Cliente (opcional)'}
              </span>
              {active.cliente ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {active.cliente.telefono}
                    {clienteSaldo > 0 && ` · debe ${formatMoney(clienteSaldo, sym)}`}
                  </span>
                  <Icon name="x" size={15} className="text-slate-400" />
                </span>
              ) : (
                <Icon name="users" size={16} />
              )}
            </button>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <select
                value={active.metodoPago}
                onChange={(e) => patchActive({ metodoPago: e.target.value })}
                disabled={active.tipo === 'credito'}
                className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none disabled:bg-slate-50"
              >
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
              </select>
              <button
                onClick={confirmSale}
                disabled={saving || active.cart.length === 0}
                className="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Icon name="banknote" size={17} />
                {active.tipo === 'credito'
                  ? `Registrar credito (${formatMoney(round2(Math.max(total - abonoValue, 0)), sym)})`
                  : `Cobrar ${formatMoney(total, sym)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de cliente */}
      <Modal open={clientModalOpen} onClose={() => setClientModalOpen(false)} title="Seleccionar cliente">
        <div className="space-y-3">
          <input
            type="text"
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                patchActive({ cliente: null })
                setClientModalOpen(false)
                setClienteSearch('')
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm text-slate-600"
            >
              Sin cliente
            </button>
            {clientResults.map((c) => {
              const debe = sales
                .filter((v) => v.clienteId === c.id && v.tipo === 'credito' && (!sede || !v.sedeId || v.sedeId === sede.id))
                .reduce((acc, v) => acc + (v.saldo ?? 0), 0)
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    patchActive({ cliente: c })
                    setClientModalOpen(false)
                    setClienteSearch('')
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50"
                >
                  <div className="font-semibold text-slate-800 text-sm">{c.nombre}</div>
                  <div className="text-xs text-slate-400">
                    {c.telefono}
                    {c.telefono && c.cedula ? ' · ' : ''}
                    {c.cedula && `CI ${c.cedula}`}
                    {c.limiteCredito ? ` · Limite ${formatMoney(c.limiteCredito, sym)}` : ''}
                    {debe > 0 ? ` · Debe ${formatMoney(debe, sym)}` : ''}
                  </div>
                </button>
              )
            })}
            {clientResults.length === 0 && (
              <p className="text-sm text-slate-400 px-3 py-2">
                Sin resultados.{' '}
                <Link to="/cliente/nuevo" className="text-teal-600 font-medium underline">
                  Crear cliente
                </Link>
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Escaner de camara */}
      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear producto">
        <CameraScanner
          onScan={(code) => {
            setScannerOpen(false)
            handleScan(code)
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>

      {/* Articulo suelto (sin inventario ni codigo de barras) */}
      <Modal open={sueltoOpen} onClose={() => setSueltoOpen(false)} title="Articulo suelto (sin codigo)">
        <form onSubmit={addSuelto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del articulo</label>
            <input
              type="text"
              value={suelto.nombre}
              onChange={(e) => setSuelto({ ...suelto, nombre: e.target.value })}
              placeholder="Ej: chicle, frijol a granel..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio unitario</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={suelto.precio}
                onChange={(e) => setSuelto({ ...suelto, precio: e.target.value })}
                placeholder={sym}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={suelto.cantidad}
                onChange={(e) => setSuelto({ ...suelto, cantidad: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Se agrega directo a la venta: no descuenta inventario y no necesita codigo de barras.
          </p>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Icon name="plus" size={16} />
            Agregar al carrito
          </button>
        </form>
      </Modal>

      {/* Eleccion de recibo tras cobrar */}
      <ReceiptModal
        open={receiptSale !== null}
        sale={receiptSale}
        config={config}
        usuario={nombre || user?.email || ''}
        onClose={() => setReceiptSale(null)}
      />
    </div>
  )
}
