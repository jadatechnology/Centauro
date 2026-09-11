import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSede } from '../context/SedeContext'
import { getStoreConfig } from '../services/configService'
import { getCachedStoreConfig } from '../utils/storeConfig'
import Icon from './Icon'

const navItems = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/vender', label: 'Vender', icon: 'cart' },
  { to: '/ventas', label: 'Ventas', icon: 'wallet' },
  { to: '/creditos', label: 'Creditos', icon: 'credit' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
]

export default function Header() {
  const { user, role, nombre, logout } = useAuth()
  const { sedes, sede, setSedeId, puedeCambiarSede } = useSede()
  const navigate = useNavigate()
  const [company, setCompany] = useState('')
  const [logo, setLogo] = useState('')

  useEffect(() => {
    const cached = getCachedStoreConfig()
    if (cached) {
      if (cached.company) setCompany(cached.company)
      if (cached.logo) setLogo(cached.logo)
    }
    getStoreConfig()
      .then((cfg) => {
        if (cfg.company) setCompany(cfg.company)
        if (cfg.logo) setLogo(cfg.logo)
      })
      .catch(() => {})
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d.company) setCompany(d.company)
      setLogo(d.logo ?? '')
    }
    window.addEventListener('storeConfigChanged', handler)
    return () => window.removeEventListener('storeConfigChanged', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-teal-700 text-white shadow safe-top overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 safe-x">
        <div className="flex items-center justify-between h-14 gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink min-w-0 max-w-[30%]">
            {logo ? (
              <img src={logo} alt={company} className="w-6 h-6 object-contain shrink-0" />
            ) : (
              <Icon name="cart" size={22} />
            )}
            <span className="hidden sm:inline truncate">{company}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </NavLink>
            ))}
            {role === 'admin' && (
              <NavLink
                to="/productos"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icon name="box" size={16} />
                Productos
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink
                to="/usuarios"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icon name="users" size={16} />
                Usuarios
              </NavLink>
            )}
          </nav>

          {user && (
            <div className="flex items-center gap-2 shrink-0">
              {sede && (
                <div className="flex items-center">
                  {puedeCambiarSede ? (
                    <select
                      value={sede?.id ?? ''}
                      onChange={(e) => setSedeId(e.target.value)}
                      className="bg-teal-600 border border-white/30 text-white text-[11px] font-semibold rounded-lg px-1.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60 max-w-[110px]"
                      title="Sede activa"
                    >
                      {sedes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] font-semibold bg-teal-600/70 border border-white/20 rounded-lg px-1.5 py-1 max-w-[110px] truncate">
                      {sede.nombre}
                    </span>
                  )}
                </div>
              )}
              <NavLink
                to="/configuracion"
                title="Configuracion"
                className={({ isActive }) =>
                  `p-2 rounded-lg hover:bg-white/10 transition ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icon name="cog" size={18} />
              </NavLink>
              <div className="hidden sm:block text-right text-sm leading-tight shrink-0">
                <div className="font-semibold">{nombre}</div>
                <div className="text-teal-200 text-xs capitalize">{role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/10 transition"
                title="Cerrar sesion"
              >
                <Icon name="logout" size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
