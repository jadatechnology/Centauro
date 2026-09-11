import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

interface AuthUser {
  user: User | null
  role: 'admin' | 'user' | null
  nombre: string
  sedeId: string | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthUser>({
  user: null,
  role: null,
  nombre: '',
  sedeId: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [nombre, setNombre] = useState('')
  const [sedeId, setSedeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const email = (u.email || '').toLowerCase()
          const ref = doc(db, 'users', email)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            const data = snap.data()
            setRole(data.role === 'admin' ? 'admin' : 'user')
            setNombre(data.nombre || u.displayName || email)
            setSedeId(data.sedeId || null)
          } else {
            // Cuenta sin documento: solo se vuelve administrador si es la primera
            // cuenta del sistema. Si ya existe un admin, se crea como usuario normal.
            const yaExisteAdmin = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')))
            const esAdmin = yaExisteAdmin.empty
            await setDoc(ref, { role: esAdmin ? 'admin' : 'user', email, nombre: esAdmin ? 'Administrador' : email, sedeId: null })
            setRole(esAdmin ? 'admin' : 'user')
            setNombre(esAdmin ? 'Administrador' : email)
            setSedeId(null)
          }
        } catch {
          setRole('user')
          setNombre(u.email || '')
          setSedeId(null)
        }
      } else {
        setRole(null)
        setNombre('')
        setSedeId(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, role, nombre, sedeId, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
