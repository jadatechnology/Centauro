import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, ReactNode, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SedeProvider } from './context/SedeContext'
import { getStoreConfig } from './services/configService'
import { applyStoreConfigToUI, getCachedStoreConfig, cacheStoreConfig } from './utils/storeConfig'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const POS = lazy(() => import('./pages/POS'))
const SalesList = lazy(() => import('./pages/SalesList'))
const SaleDetail = lazy(() => import('./pages/SaleDetail'))
const CreditAccounts = lazy(() => import('./pages/CreditAccounts'))
const Products = lazy(() => import('./pages/Products'))
const ProductForm = lazy(() => import('./pages/ProductForm'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientForm = lazy(() => import('./pages/ClientForm'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const UsersManagement = lazy(() => import('./pages/UsersManagement'))
const Settings = lazy(() => import('./pages/Settings'))

function SuspenseWrap({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Cargando...</div>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppContent() {
  const { user, loading } = useAuth()

  useEffect(() => {
    const cached = getCachedStoreConfig()
    if (cached) applyStoreConfigToUI(cached)
  }, [])

  useEffect(() => {
    if (!user) return
    getStoreConfig()
      .then((cfg) => {
        cacheStoreConfig(cfg)
        applyStoreConfigToUI(cfg)
      })
      .catch(() => {})
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 overflow-x-clip">
      {user && <Header />}
      <main className={`${user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6' : ''}`}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<ProtectedRoute><SuspenseWrap><Dashboard /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/vender" element={<ProtectedRoute><SuspenseWrap><POS /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/ventas" element={<ProtectedRoute><SuspenseWrap><SalesList /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/venta/:id" element={<ProtectedRoute><SuspenseWrap><SaleDetail /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/creditos" element={<ProtectedRoute><SuspenseWrap><CreditAccounts /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/productos" element={<AdminRoute><SuspenseWrap><Products /></SuspenseWrap></AdminRoute>} />
          <Route path="/producto/nuevo" element={<AdminRoute><SuspenseWrap><ProductForm /></SuspenseWrap></AdminRoute>} />
          <Route path="/producto/:id" element={<AdminRoute><SuspenseWrap><ProductForm /></SuspenseWrap></AdminRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><SuspenseWrap><Clients /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/cliente/nuevo" element={<ProtectedRoute><SuspenseWrap><ClientForm /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/cliente/:id" element={<ProtectedRoute><SuspenseWrap><ClientDetail /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/cliente/:id/editar" element={<ProtectedRoute><SuspenseWrap><ClientForm /></SuspenseWrap></ProtectedRoute>} />
          <Route path="/usuarios" element={<AdminRoute><SuspenseWrap><UsersManagement /></SuspenseWrap></AdminRoute>} />
          <Route path="/configuracion" element={<AdminRoute><SuspenseWrap><Settings /></SuspenseWrap></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {user && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SedeProvider>
          <AppContent />
        </SedeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
