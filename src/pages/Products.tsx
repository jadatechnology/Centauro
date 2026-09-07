import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProducts, deleteProduct } from '../services/productService'
import { getStoreConfig } from '../services/configService'
import type { Product, StoreConfig } from '../types'
import { formatMoney } from '../utils/format'
import { playBeep, playError } from '../utils/sound'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import CameraScanner from '../components/CameraScanner'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('')
  const [bajoStock, setBajoStock] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [config, setConfig] = useState<StoreConfig>({
    company: '', slogan: '', taxRegime: '', address: '', phone: '', receiptFooter: '', currencySymbol: '$', receiptMode: 'auto',
  })
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [p, cfg] = await Promise.all([getProducts(), getStoreConfig()])
      setProducts(p)
      setConfig(cfg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const categorias = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.categoria).filter(Boolean))).sort()
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => p.activo)
      .filter((p) => (categoria ? p.categoria === categoria : true))
      .filter((p) => (bajoStock ? p.stock <= p.stockMinimo : true))
      .filter(
        (p) =>
          !q ||
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q)
      )
  }, [products, search, categoria, bajoStock])

  const sym = config.currencySymbol || '$'

  const handleScan = async (code: string) => {
    const found = products.find((p) => p.codigo === code)
    if (found) {
      playBeep()
      setFeedback({ type: 'ok', text: `${found.nombre} encontrado` })
      navigate(`/producto/${found.id}`)
    } else {
      playError()
      setFeedback({ type: 'error', text: `Codigo ${code} no existe en el inventario` })
    }
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Desactivar el producto "${p.nombre}"?`)) return
    await deleteProduct(p.id!)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500 text-sm">{filtered.length} productos activos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2"
          >
            <Icon name="camera" size={18} />
            Escanear
          </button>
          <Link
            to="/producto/nuevo"
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center gap-2"
          >
            <Icon name="plus" size={18} />
            Nuevo
          </Link>
        </div>
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

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) handleScan(search.trim())
            }}
            placeholder="Buscar por nombre, codigo o escanear (Enter)"
            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100"
            title="Escanear con la camara"
          >
            <Icon name="camera" size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => setBajoStock((v) => !v)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium ${
              bajoStock
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            Stock bajo
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner className="h-40" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Icon name="box" size={40} className="mx-auto mb-2" />
          <p>No hay productos que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-responsive w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 hidden md:table-cell">Codigo</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Categoria</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Costo</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const low = p.stock <= p.stockMinimo
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3" data-no-label>
                        <Link to={`/producto/${p.id}`} className="font-semibold text-slate-800 hover:text-teal-700">
                          {p.nombre}
                        </Link>
                        <div className="text-xs text-slate-400 md:hidden">{p.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs" data-label="Codigo">
                        {p.codigo}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" data-label="Categoria">
                        {p.categoria && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600">
                            {p.categoria}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Stock">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            p.stock === 0 ? 'text-red-600' : low ? 'text-amber-600' : 'text-slate-700'
                          }`}
                        >
                          {p.stock === 0 && <Icon name="x" size={12} />}
                          {p.stock}
                        </span>
                        {low && <div className="text-[10px] text-slate-400">min {p.stockMinimo}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell" data-label="Costo">
                        {formatMoney(p.costo, sym)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800" data-label="Precio">
                        {formatMoney(p.precio, sym)}
                      </td>
                      <td className="px-4 py-3" data-no-label>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/producto/${p.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                            title="Editar"
                          >
                            <Icon name="pencil" size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Desactivar"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear producto">
        <CameraScanner
          onScan={(code) => {
            setScannerOpen(false)
            handleScan(code)
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </div>
  )
}
