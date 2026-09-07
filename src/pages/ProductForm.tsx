import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { getProduct, createProduct, updateProduct } from '../services/productService'
import type { Product } from '../types'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import CameraScanner from '../components/CameraScanner'
import { playBeep } from '../utils/sound'

function randomCode() {
  let code = ''
  for (let i = 0; i < 13; i++) code += Math.floor(Math.random() * 10)
  return code
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    codigo: '',
    costo: '',
    precio: '',
    stock: '',
    stockMinimo: '0',
    vencimiento: '',
    ubicacion: '',
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    getProduct(id)
      .then((p) => {
        if (p) {
          setForm({
            nombre: p.nombre,
            descripcion: p.descripcion,
            categoria: p.categoria,
            codigo: p.codigo,
            costo: String(p.costo ?? 0),
            precio: String(p.precio ?? 0),
            stock: String(p.stock ?? 0),
            stockMinimo: String(p.stockMinimo ?? 0),
            vencimiento: p.vencimiento || '',
            ubicacion: p.ubicacion || '',
          })
        } else {
          setError('Producto no encontrado')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!form.codigo) {
      setQrUrl('')
      return
    }
    QRCode.toDataURL(form.codigo, { width: 160, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''))
  }, [form.codigo])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')
    if (!form.codigo.trim()) return setError('El codigo es obligatorio.')
    if (!form.precio || Number(form.precio) <= 0) return setError('El precio debe ser mayor que 0.')

    setSaving(true)
    try {
      const data = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria.trim(),
        codigo: form.codigo.trim(),
        costo: Number(form.costo) || 0,
        precio: Number(form.precio) || 0,
        stock: Number(form.stock) || 0,
        stockMinimo: Number(form.stockMinimo) || 0,
        vencimiento: form.vencimiento.trim() || '',
        ubicacion: form.ubicacion.trim() || '',
        activo: true,
      }
      if (isEdit) {
        await updateProduct(id!, data)
      } else {
        await createProduct(data)
      }
      navigate('/productos')
    } catch {
      setError('No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner className="h-40" />

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
          <Icon name="chevron" size={18} className="rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'Editar producto' : 'Nuevo producto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Pantalla Samsung S21" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
              <textarea className={inputCls} rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <input className={inputCls} value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ej: Electronica" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Codigo de barras *</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={form.codigo}
                    onChange={(e) => set('codigo', e.target.value)}
                    placeholder="Escanee con USB o escriba"
                  />
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="shrink-0 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                    title="Escanear con la camara"
                  >
                    <Icon name="camera" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => set('codigo', randomCode())}
                    className="shrink-0 px-3 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                    title="Generar codigo aleatorio"
                  >
                    <Icon name="scan" size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-center justify-center w-40 shrink-0 bg-slate-50 rounded-xl p-3">
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="QR del codigo" className="w-32 h-32 bg-white p-1" />
                <p className="text-[10px] text-slate-400 text-center mt-2 break-all">{form.codigo}</p>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center">El QR se genera con el codigo</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ubicacion en almacen (opcional)</label>
          <input
            className={inputCls}
            placeholder="Ej: Estante A-3, Pasillo 2"
            value={form.ubicacion}
            onChange={(e) => set('ubicacion', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.costo} onChange={(e) => set('costo', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Precio *</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.precio} onChange={(e) => set('precio', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
            <input type="number" min="0" className={inputCls} value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock minimo</label>
            <input type="number" min="0" className={inputCls} value={form.stockMinimo} onChange={(e) => set('stockMinimo', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de vencimiento (opcional)</label>
          <div className="flex gap-2">
            <input
              type="date"
              className={`${inputCls} flex-1 min-w-0`}
              value={form.vencimiento}
              onChange={(e) => set('vencimiento', e.target.value)}
            />
            {form.vencimiento && (
              <button
                type="button"
                onClick={() => set('vencimiento', '')}
                className="shrink-0 px-3 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100"
                title="Quitar la fecha de vencimiento"
              >
                Quitar
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Dejar vacio si el producto no vence.</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </form>

      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear codigo de barras">
        <CameraScanner
          onScan={(code) => {
            set('codigo', code)
            playBeep()
            setScannerOpen(false)
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </div>
  )
}
