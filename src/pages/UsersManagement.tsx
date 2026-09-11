import { useEffect, useState } from 'react'
import { getUsers, saveUser, deleteUser } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import { useSede } from '../context/SedeContext'
import type { AppUser } from '../types'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white'

export default function UsersManagement() {
  const { user } = useAuth()
  const { sedes } = useSede()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState('')
  const [form, setForm] = useState({
    email: '',
    nombre: '',
    role: 'user' as 'admin' | 'user',
    sedeId: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await getUsers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditingEmail('')
    setForm({ email: '', nombre: '', role: 'user', sedeId: '' })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (u: AppUser) => {
    setEditingEmail(u.email)
    setForm({ email: u.email, nombre: u.nombre || '', role: u.role, sedeId: u.sedeId || '' })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.email.trim() || !form.email.includes('@')) return setError('Correo invalido.')
    setSaving(true)
    try {
      await saveUser({
        email: form.email,
        nombre: form.nombre,
        role: form.role,
        sedeId: form.role === 'user' ? form.sedeId || null : null,
      })
      setModalOpen(false)
      openNew()
      await load()
    } catch {
      setError('No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (email: string) => {
    if (email === user?.email?.toLowerCase()) {
      alert('No puede eliminar su propia cuenta.')
      return
    }
    if (!confirm(`Eliminar al usuario ${email}?`)) return
    await deleteUser(email)
    await load()
  }

  if (loading) return <Spinner className="h-40" />

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-slate-500 text-sm">{users.length} cuentas registradas</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center gap-2"
        >
          <Icon name="plus" size={18} />
          Agregar
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
        Para crear la contrasena de un nuevo usuario, agregue la cuenta aqui y luego cree el mismo correo
        en <strong>Firebase Console → Authentication → Agregar usuario</strong>.
      </div>

      <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.email} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-semibold text-slate-800">{u.nombre || u.email}</div>
              <div className="text-xs text-slate-400">{u.email}</div>
              {u.sedeId && (
                <div className="text-xs text-teal-600 font-medium">
                  {sedes.find((s) => s.id === u.sedeId)?.nombre || 'Sede'}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  u.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {u.role}
              </span>
<button
                onClick={() => openEdit(u)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600"
                title="Editar"
              >
                <Icon name="pencil" size={16} />
              </button>
              <button
                onClick={() => handleDelete(u.email)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Eliminar"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingEmail ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo electronico</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls}
              placeholder="usuario@correo.com"
              autoFocus
              readOnly={!!editingEmail}
              disabled={!!editingEmail}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className={inputCls}
              placeholder="Nombre del usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
              className={inputCls}
            >
              <option value="user">Usuario (vender y ver)</option>
              <option value="admin">Administrador (todo + usuarios + config)</option>
            </select>
          </div>
          {form.role === 'user' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sede asignada</label>
              <select
                value={form.sedeId}
                onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Sin sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Un usuario solo opera en su sede asignada. Los administradores ven todas las sedes.
              </p>
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Guardando...' : editingEmail ? 'Guardar cambios' : 'Guardar usuario'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
