import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const items = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/vender', label: 'Vender', icon: 'cart' },
  { to: '/ventas', label: 'Ventas', icon: 'wallet' },
  { to: '/creditos', label: 'Creditos', icon: 'credit' },
  { to: '/productos', label: 'Productos', icon: 'box' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 pb-safe">
      <div className="grid grid-cols-6">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-teal-700' : 'text-slate-400'
              }`
            }
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
