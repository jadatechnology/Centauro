import { useState, useEffect, FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import { getCachedStoreConfig, applyStoreConfigToUI } from '../utils/storeConfig'
import Icon from '../components/Icon'
import Spinner from '../components/Spinner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState('Centauro')
  const [logo, setLogo] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const cached = getCachedStoreConfig()
    if (cached) {
      if (cached.company) setCompany(cached.company)
      if (cached.logo) {
        setLogo(cached.logo)
        applyStoreConfigToUI(cached)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate('/')
    } catch (err) {
      const e = err as { code?: string }
      if (e.code === 'auth/invalid-credential') setError('Correo o contrasena incorrectos.')
      else if (e.code === 'auth/user-not-found') setError('No existe una cuenta con ese correo.')
      else if (e.code === 'auth/network-request-failed') setError('Sin conexion a internet.')
      else setError('No se pudo iniciar sesion. Verifique sus datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-700 to-teal-900 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white mb-3 overflow-hidden">
              {logo ? (
                <img src={logo} alt={company} className="w-full h-full object-contain" />
              ) : (
                <Icon name="box" size={34} />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800">{company}</h1>
            <p className="text-sm text-slate-500">{company === 'Centauro' ? 'Sistema de inventario y ventas' : ''}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo electronico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="usuario@correo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Spinner className="scale-50" /> : 'Iniciar sesion'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            La primera cuenta que inicia sesion se convierte en administrador.
          </p>
        </div>
      </div>
    </div>
  )
}