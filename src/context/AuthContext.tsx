import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

interface AuthUser {
  user: User | null
  role: 'admin' | 'user' | null
  nombre: string
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthUser>({
  user: null,
  role: null,
  nombre: '',
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [nombre, setNombre] = useState('')
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
          } else {
            await setDoc(ref, { role: 'admin', email, nombre: 'Administrador' })
            setRole('admin')
            setNombre('Administrador')
          }
        } catch {
          setRole('user')
          setNombre(u.email || '')
        }
      } else {
        setRole(null)
        setNombre('')
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, role, nombre, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
