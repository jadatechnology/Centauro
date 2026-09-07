import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClient, createClient, updateClient } from '../services/clientService'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'

export default function ClientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    cedula: '',
    direccion: '',
    limiteCredito: '0',
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getClient(id)
      .then((c) => {
        if (c) {
          setForm({
            nombre: c.nombre,
            telefono: c.telefono,
            email: c.email,
            cedula: c.cedula,
            direccion: c.direccion,
            limiteCredito: String(c.limiteCredito ?? 0),
          })
        } else {
          setError('Cliente no encontrado')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')

    setSaving(true)
    try {
      const data = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        cedula: form.cedula.trim(),
        direccion: form.direccion.trim(),
        limiteCredito: Number(form.limiteCredito) || 0,
        activo: true,
      }
      if (isEdit) {
        await updateClient(id!, data)
      } else {
        await createClient(data)
      }
      navigate(id ? `/cliente/${id}` : '/clientes')
    } catch {
      setError('No se pudo guardar el cliente.')
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
          {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
          <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre y apellido" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
            <input type="tel" className={inputCls} value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cedula</label>
            <input className={inputCls} value={form.cedula} onChange={(e) => set('cedula', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Direccion</label>
          <input className={inputCls} value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Limite de credito</label>
          <input type="number" step="0.01" min="0" className={inputCls} value={form.limiteCredito} onChange={(e) => set('limiteCredito', e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Monto maximo que puede deber este cliente.</p>
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
            {saving ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
