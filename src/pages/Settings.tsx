import { useEffect, useState } from 'react'
import { getStoreConfig, saveStoreConfig } from '../services/configService'
import { getProducts, renameCategory, deleteCategory } from '../services/productService'
import { getClients } from '../services/clientService'
import { getSales } from '../services/saleService'
import { useAuth } from '../context/AuthContext'
import type { StoreConfig, Product, Client, Sale } from '../types'
import { exportJSON, exportExcel, exportPDF } from '../utils/backup'
import Spinner from '../components/Spinner'
import Icon from '../components/Icon'

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'

export default function Settings() {
  const { role, nombre, logout } = useAuth()
  const [form, setForm] = useState<StoreConfig>({
    company: '',
    slogan: '',
    taxRegime: '',
    address: '',
    phone: '',
    receiptFooter: '',
    currencySymbol: '$',
    receiptMode: 'auto',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState<'' | 'json' | 'excel' | 'pdf'>('')
  const [categorias, setCategorias] = useState<{ name: string; count: number }[]>([])
  const [editingCat, setEditingCat] = useState('')
  const [editValue, setEditValue] = useState('')
  const [catAction, setCatAction] = useState(false)

  useEffect(() => {
    getStoreConfig().then((c) => {
      setForm(c)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    getProducts().then((ps) => {
      const map = new Map<string, number>()
      ps.forEach((p) => {
        if (p.categoria) map.set(p.categoria, (map.get(p.categoria) || 0) + 1)
      })
      setCategorias(Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [])

  const set = (key: keyof StoreConfig, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveStoreConfig(form)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner className="h-40" />

  const handleExport = async (type: 'json' | 'excel' | 'pdf') => {
    setExporting(type)
    try {
      const [products, clients, sales] = await Promise.all([getProducts(), getClients(), getSales()])
      if (type === 'json') await exportJSON(products, clients, sales)
      else if (type === 'excel') await exportExcel(products, clients, sales)
      else exportPDF(products, clients, sales, { company: form.company, currencySymbol: form.currencySymbol })
    } finally {
      setExporting('')
    }
  }

  const startRename = (name: string) => {
    setEditingCat(name)
    setEditValue(name)
  }

  const saveRename = async (oldName: string) => {
    const newName = editValue.trim()
    if (!newName || newName === oldName) { setEditingCat(''); return }
    setCatAction(true)
    try {
      const n = await renameCategory(oldName, newName)
      setCategorias((prev) =>
        prev.map((c) => c.name === oldName ? { name: newName, count: n } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    } finally {
      setEditingCat('')
      setCatAction(false)
    }
  }

  const handleDeleteCategory = async (name: string) => {
    if (!window.confirm(`Quitar la categoria "${name}" de ${categorias.find(c => c.name === name)?.count || 0} productos?`)) return
    setCatAction(true)
    try {
      await deleteCategory(name)
      setCategorias((prev) => prev.filter((c) => c.name !== name))
    } finally {
      setCatAction(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Configuracion del negocio</h1>
      <p className="text-sm text-slate-500">
        Estos datos aparecen en los recibos impresos. Solo un administrador puede cambiarlos.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del negocio</label>
          <input className={inputCls} value={form.company} onChange={(e) => set('company', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slogan</label>
          <input className={inputCls} value={form.slogan} onChange={(e) => set('slogan', e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Regimen fiscal</label>
            <input className={inputCls} value={form.taxRegime} onChange={(e) => set('taxRegime', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
            <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Direccion</label>
          <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Simbolo de moneda</label>
            <input className={inputCls} value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pie del recibo</label>
            <input className={inputCls} value={form.receiptFooter} onChange={(e) => set('receiptFooter', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Recibo de venta</label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Al registrar cada venta podras elegir si el recibo se imprime en la impresora (ancho de 80 mm o 55 mm) o si
            se genera en PDF. La preferencia de ancho queda guardada para la siguiente venta.
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar configuracion'}
        </button>
        {saved && (
          <p className="text-sm text-emerald-600 text-center font-medium">Configuracion guardada.</p>
        )}
      </form>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div>
          <h2 className="font-bold text-slate-800">Categorias</h2>
          <p className="text-xs text-slate-500">Edita o elimina las categorias existentes. Los productos afectados se actualizan en lote.</p>
        </div>
        {categorias.length === 0 ? (
          <p className="text-sm text-slate-400">No hay categorias registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categorias.map((cat) => (
              <li key={cat.name} className="flex items-center gap-2 py-2">
                {editingCat === cat.name ? (
                  <>
                    <input
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-xl border border-teal-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(cat.name); if (e.key === 'Escape') setEditingCat('') }}
                      disabled={catAction}
                    />
                    <button
                      onClick={() => saveRename(cat.name)}
                      disabled={catAction || !editValue.trim()}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingCat('')}
                      disabled={catAction}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700 font-medium truncate">{cat.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{cat.count} productos</span>
                    <button
                      onClick={() => startRename(cat.name)}
                      disabled={catAction || !!editingCat}
                      className="shrink-0 px-2 py-1 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                      title="Renombrar"
                    >
                      <Icon name="pencil" size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.name)}
                      disabled={catAction || !!editingCat}
                      className="shrink-0 px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                      title="Eliminar categoria"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 text-sm">
        <div className="font-semibold text-slate-800 mb-1">Cuenta actual</div>
        <div className="text-slate-500">
          {nombre} · <span className="capitalize">{role}</span>
        </div>
        <button
          onClick={logout}
          className="mt-3 px-4 py-2 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50"
        >
          Cerrar sesion
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div>
          <h2 className="font-bold text-slate-800">Copia de seguridad</h2>
          <p className="text-xs text-slate-500">Descarga todos los datos del inventario, clientes y ventas.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleExport('json')}
            disabled={!!exporting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <Icon name="download" size={16} />
            {exporting === 'json' ? 'Generando...' : 'JSON'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={!!exporting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 hover:bg-emerald-50 text-sm font-semibold text-emerald-700 disabled:opacity-50"
          >
            <Icon name="download" size={16} />
            {exporting === 'excel' ? 'Generando...' : 'Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            <Icon name="download" size={16} />
            {exporting === 'pdf' ? 'Generando...' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
