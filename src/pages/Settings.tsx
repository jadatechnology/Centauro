import { useEffect, useState } from 'react'
import { getStoreConfig, saveStoreConfig } from '../services/configService'
import { getProducts, renameCategory, deleteCategory } from '../services/productService'
import { getClients } from '../services/clientService'
import { getSales } from '../services/saleService'
import { getSedes, createSede, updateSede } from '../services/sedeService'
import { applyStoreConfigToUI, cacheStoreConfig } from '../utils/storeConfig'
import { useAuth } from '../context/AuthContext'
import { useSede } from '../context/SedeContext'
import type { StoreConfig, Product, Client, Sale, Sede } from '../types'
import { exportJSON, exportExcel, exportPDF } from '../utils/backup'
import Spinner from '../components/Spinner'
import Icon from '../components/Icon'

const GALLERY_ICONS = [
  { slug: 'store', label: 'Tienda' },
  { slug: 'storefront', label: 'Fachada' },
  { slug: 'shopping', label: 'Compra' },
  { slug: 'cart', label: 'Carrito' },
  { slug: 'cart-outline', label: 'Carrito 2' },
  { slug: 'basket', label: 'Cesta' },
  { slug: 'package', label: 'Paquete' },
  { slug: 'tag', label: 'Etiqueta' },
  { slug: 'sale', label: 'Oferta' },
  { slug: 'cash', label: 'Efectivo' },
  { slug: 'cash-multiple', label: 'Billetes' },
  { slug: 'point-of-sale', label: 'Caja' },
  { slug: 'store-check', label: 'Tienda OK' },
  { slug: 'cart-check', label: 'Carrito OK' },
  { slug: 'briefcase', label: 'Maletin' },
  { slug: 'sack', label: 'Bolsa' },
  { slug: 'diamond', label: 'Diamante' },
  { slug: 'star', label: 'Estrella' },
  { slug: 'heart', label: 'Corazon' },
  { slug: 'crown', label: 'Corona' },
  { slug: 'leaf', label: 'Hoja' },
  { slug: 'paw', label: 'Patita' },
  { slug: 'lightning-bolt', label: 'Rayo' },
  { slug: 'coffee', label: 'Cafe' },
  { slug: 'cookie', label: 'Galleta' },
  { slug: 'hamburger', label: 'Hamburguesa' },
  { slug: 'pizza', label: 'Pizza' },
  { slug: 'apple', label: 'Manzana' },
  { slug: 'food-apple', label: 'Fruta' },
  { slug: 'fish', label: 'Pescado' },
  { slug: 'ice-cream', label: 'Helado' },
  { slug: 'cake-variant', label: 'Pastel' },
  { slug: 'bread-slice', label: 'Pan' },
  { slug: 'water', label: 'Agua' },
  { slug: 'bottle-soda', label: 'Refresco' },
  { slug: 'cup', label: 'Vaso' },
  { slug: 'blender', label: 'Licuadora' },
  { slug: 'fridge', label: 'Refrigerador' },
  { slug: 'silverware', label: 'Cubiertos' },
  { slug: 'sofa', label: 'Sofa' },
  { slug: 'lamp', label: 'Lampara' },
  { slug: 'bed', label: 'Cama' },
  { slug: 'home', label: 'Casa' },
  { slug: 'home-city', label: 'Edificio' },
  { slug: 'office-building', label: 'Oficina' },
  { slug: 'car', label: 'Carro' },
  { slug: 'bike', label: 'Bicicleta' },
  { slug: 'airplane', label: 'Avion' },
  { slug: 'dumbbell', label: 'Pesas' },
  { slug: 'baby-carriage', label: 'Carriola' },
  { slug: 'dog', label: 'Perro' },
  { slug: 'cat', label: 'Gato' },
  { slug: 'shield-check', label: 'Seguro' },
  { slug: 'tshirt-crew', label: 'Camiseta' },
  { slug: 'shoe-sneaker', label: 'Tenis' },
  { slug: 'watch', label: 'Reloj' },
  { slug: 'glasses', label: 'Lentes' },
  { slug: 'wrench', label: 'Llave' },
]

const ICON_COLORS = [
  { value: '#0f766e', label: 'Verde' },
  { value: '#1d4ed8', label: 'Azul' },
  { value: '#b91c1c', label: 'Rojo' },
  { value: '#d97706', label: 'Naranja' },
  { value: '#854d0e', label: 'Cafe' },
  { value: '#a21caf', label: 'Morado' },
  { value: '#0d9488', label: 'Aguamarina' },
  { value: '#e11d48', label: 'Rosa' },
  { value: '#059669', label: 'Esmeralda' },
  { value: '#475569', label: 'Gris' },
  { value: '#000000', label: 'Negro' },
  { value: '#FFFFFF', label: 'Blanco' },
]

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'

export default function Settings() {
  const { role, nombre, logout } = useAuth()
  const { refresh: refreshSedes } = useSede()
  const [sedes, setSedes] = useState<Sede[]>([])
  const [nuevaSede, setNuevaSede] = useState('')
  const [editingSede, setEditingSede] = useState('')
  const [editSedeValue, setEditSedeValue] = useState('')
  const [sedeAction, setSedeAction] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
  const [fetchingIcon, setFetchingIcon] = useState(false)
  const [iconColor, setIconColor] = useState('#0f766e')
  const [form, setForm] = useState<StoreConfig>({
    company: '',
    slogan: '',
    taxRegime: '',
    address: '',
    phone: '',
    receiptFooter: '',
    currencySymbol: '$',
    receiptMode: 'auto',
    logo: '',
    usarVencimiento: true,
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
    getSedes().then(setSedes)
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
      cacheStoreConfig(form)
      applyStoreConfigToUI(form)
      window.dispatchEvent(new CustomEvent('storeConfigChanged', { detail: { company: form.company, logo: form.logo } }))
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

  const handleAddSede = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = nuevaSede.trim()
    if (!name) return
    setSedeAction(true)
    try {
      await createSede(name)
      setNuevaSede('')
      const list = await getSedes()
      setSedes(list)
      refreshSedes()
    } finally {
      setSedeAction(false)
    }
  }

  const saveRenameSede = async (sede: Sede) => {
    const newName = editSedeValue.trim()
    if (!newName || newName === sede.nombre) { setEditingSede(''); return }
    setSedeAction(true)
    try {
      await updateSede(sede.id!, { nombre: newName })
      setEditingSede('')
      const list = await getSedes()
      setSedes(list)
      refreshSedes()
    } finally {
      setSedeAction(false)
    }
  }

  const handleToggleSede = async (sede: Sede) => {
    setSedeAction(true)
    try {
      await updateSede(sede.id!, { activo: !sede.activo })
      const list = await getSedes()
      setSedes(list)
      refreshSedes()
    } finally {
      setSedeAction(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Seleccione un archivo de imagen.')
      return
    }
    try {
      const dataUrl = await resizeImage(file, 256)
      setForm((f) => ({ ...f, logo: dataUrl }))
      setSaved(false)
    } catch {
      alert('No se pudo procesar la imagen.')
    }
  }

  const handleLogoRemove = () => {
    setForm((f) => ({ ...f, logo: '' }))
    setSaved(false)
  }

  const handleSelectGalleryIcon = async (slug: string) => {
    setFetchingIcon(true)
    try {
      const url = `https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/${slug}.svg`
      const res = await fetch(url)
      if (!res.ok) throw new Error('No se pudo descargar el icono')
      const svgText = await res.text()
      const colored = svgText.replace(/<svg /, `<svg fill="${iconColor}" height="256" width="256" `)
      const b64 = btoa(unescape(encodeURIComponent(colored)))
      const dataUrl = `data:image/svg+xml;base64,${b64}`
      setForm((f) => ({ ...f, logo: dataUrl }))
      setSaved(false)
      setShowIconPicker(false)
      setIconSearch('')
    } catch {
      alert('No se pudo cargar el icono. Intenta de nuevo.')
    } finally {
      setFetchingIcon(false)
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

        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">Fecha de vencimiento en productos</div>
            <div className="text-xs text-slate-500">
              Si esta activado, el formulario de producto incluye el campo "Fecha de vencimiento".
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({ ...f, usarVencimiento: !f.usarVencimiento }))
              setSaved(false)
            }}
            className={`relative w-12 h-7 rounded-full transition shrink-0 ${
              form.usarVencimiento ? 'bg-teal-600' : 'bg-slate-300'
            }`}
            title={form.usarVencimiento ? 'Activo' : 'Inactivo'}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                form.usarVencimiento ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Icono de la pagina (favicon)</label>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {form.logo ? (
                <img src={form.logo} alt="Icono" className="w-full h-full object-contain" />
              ) : (
                <Icon name="box" size={22} className="text-slate-300" />
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="px-3 py-2 rounded-xl border border-teal-300 text-teal-700 text-sm font-semibold hover:bg-teal-50"
              >
                Galeria
              </button>
              <label className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer">
                Subir imagen
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              {form.logo && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Se mostrara como icono de la pestana y en la app instalada. Se guarda al pulsar "Guardar configuracion".
          </p>
        </div>

        {showIconPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">Elegir icono</h3>
                <button
                  onClick={() => { setShowIconPicker(false); setIconSearch('') }}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <Icon name="x" size={20} className="text-slate-500" />
                </button>
              </div>
              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Buscar icono..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">Color:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ICON_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setIconColor(c.value)}
                      title={c.label}
                      className={`w-7 h-7 rounded-full border-2 ${
                        iconColor === c.value ? 'border-teal-600 scale-110' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                  title="Color personalizado"
                  className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                />
              </div>
              {fetchingIcon && (
                <div className="p-6 text-center text-sm text-slate-400">Cargando...</div>
              )}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {GALLERY_ICONS.filter(
                    (ic) =>
                      !iconSearch ||
                      ic.slug.toLowerCase().includes(iconSearch.toLowerCase()) ||
                      ic.label.toLowerCase().includes(iconSearch.toLowerCase())
                  ).map((ic) => (
                    <button
                      key={ic.slug}
                      onClick={() => handleSelectGalleryIcon(ic.slug)}
                      disabled={fetchingIcon}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-300 disabled:opacity-50"
                      title={ic.label}
                    >
                      <img
                        src={`https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/${ic.slug}.svg`}
                        alt={ic.label}
                        className="w-8 h-8"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="text-[10px] text-slate-500 leading-tight text-center truncate w-full">
                        {ic.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div>
          <h2 className="font-bold text-slate-800">Sedes</h2>
          <p className="text-xs text-slate-500">
            Cada sede tiene su propio inventario y ventas. Un usuario asignado a una sede solo opera en ella.
          </p>
        </div>

        <form onSubmit={handleAddSede} className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Nombre de la nueva sede (ej: Sucursal Este)"
            value={nuevaSede}
            onChange={(e) => setNuevaSede(e.target.value)}
            disabled={sedeAction}
          />
          <button
            type="submit"
            disabled={sedeAction || !nuevaSede.trim()}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            <Icon name="plus" size={16} />
            Agregar
          </button>
        </form>

        {sedes.length === 0 ? (
          <p className="text-sm text-slate-400">No hay sedes registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sedes.map((sede) => (
              <li key={sede.id} className="flex items-center gap-2 py-2">
                {editingSede === sede.id ? (
                  <>
                    <input
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-xl border border-teal-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={editSedeValue}
                      onChange={(e) => setEditSedeValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRenameSede(sede)
                        if (e.key === 'Escape') setEditingSede('')
                      }}
                      disabled={sedeAction}
                    />
                    <button
                      onClick={() => saveRenameSede(sede)}
                      disabled={sedeAction || !editSedeValue.trim()}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingSede('')}
                      disabled={sedeAction}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        sede.activo ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <span className={`flex-1 text-sm font-medium truncate ${sede.activo ? 'text-slate-700' : 'text-slate-400'}`}>
                      {sede.nombre}
                    </span>
                    {!sede.activo && (
                      <span className="shrink-0 text-[10px] uppercase text-slate-400 font-semibold">Inactiva</span>
                    )}
                    <button
                      onClick={() => { setEditingSede(sede.id!); setEditSedeValue(sede.nombre) }}
                      disabled={sedeAction || !!editingSede}
                      className="shrink-0 px-2 py-1 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                      title="Renombrar"
                    >
                      <Icon name="pencil" size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleSede(sede)}
                      disabled={sedeAction || !!editingSede}
                      className={`shrink-0 px-2 py-1 rounded-lg disabled:opacity-50 ${
                        sede.activo
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={sede.activo ? 'Desactivar sede' : 'Activar sede'}
                    >
                      <Icon name={sede.activo ? 'minus' : 'plus'} size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-400">
          Las sedes inactivas dejan de mostrarse en el selector y no se pueden usar para vender.
        </p>
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

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        reject(e)
      } finally {
        URL.revokeObjectURL(url)
        img.onload = null
        img.onerror = null
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagen invalida'))
    }
    img.src = url
  })
}
