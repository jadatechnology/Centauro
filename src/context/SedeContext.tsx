import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ensureSedes } from '../services/sedeService'
import { useAuth } from './AuthContext'
import type { Sede } from '../types'

interface SedeContextValue {
  sedes: Sede[]
  sede: Sede | null
  setSedeId: (id: string) => void
  puedeCambiarSede: boolean
  refresh: () => void
  loading: boolean
}

const SedeContext = createContext<SedeContextValue>({
  sedes: [],
  sede: null,
  setSedeId: () => {},
  puedeCambiarSede: false,
  refresh: () => {},
  loading: true,
})

const STORAGE_KEY = 'sede_activa'

export function SedeProvider({ children }: { children: ReactNode }) {
  const { user, role, sedeId: userSedeId } = useAuth()
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sede, setSede] = useState<Sede | null>(null)
  const [loading, setLoading] = useState(true)

  const esAdmin = role === 'admin'

  const loadSedes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const list = await ensureSedes()
      const activas = list.filter((s) => s.activo)
      setSedes(activas)
      if (esAdmin) {
        const saved = localStorage.getItem(STORAGE_KEY)
        setSede(activas.find((s) => s.id === saved) ?? activas[0] ?? null)
      } else {
        setSede(activas.find((s) => s.id === userSedeId) ?? null)
      }
    } catch {
      setSedes([])
      setSede(null)
    } finally {
      setLoading(false)
    }
  }, [user, esAdmin, userSedeId])

  useEffect(() => {
    loadSedes()
  }, [loadSedes])

  const setSedeId = (id: string) => {
    if (!esAdmin) return
    const next = sedes.find((s) => s.id === id) ?? null
    setSede(next)
    if (next) localStorage.setItem(STORAGE_KEY, next.id!)
  }

  return (
    <SedeContext.Provider value={{ sedes, sede, setSedeId, puedeCambiarSede: esAdmin, refresh: loadSedes, loading }}>
      {children}
    </SedeContext.Provider>
  )
}

export const useSede = () => useContext(SedeContext)