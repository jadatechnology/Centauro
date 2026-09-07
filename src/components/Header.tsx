import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

const navItems = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/vender', label: 'Vender', icon: 'cart' },
  { to: '/ventas', label: 'Ventas', icon: 'wallet' },
  { to: '/creditos', label: 'Creditos', icon: 'credit' },
  { to: '/productos', label: 'Productos', icon: 'box' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
]

export default function Header() {
  const { user, role, nombre, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-teal-700 text-white shadow safe-top overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 safe-x">
        <div className="flex items-center justify-between h-14 gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
            <Icon name="cart" size={22} />
            <span className="hidden sm:inline">Mi Tienda</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
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
                to="/usuarios"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icon name="users" size={16} />
                Usuarios
              </NavLink>
            )}
            <NavLink
              to="/configuracion"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-white/20' : 'hover:bg-white/10'
                }`
              }
            >
              <Icon name="cog" size={16} />
              Config
            </NavLink>
          </nav>

          {user && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block text-right text-sm leading-tight">
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
