import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { AppUser } from '../types'

export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ email: d.id, ...d.data() }) as AppUser)
}

export async function saveUser(user: AppUser) {
  const email = user.email.toLowerCase().trim()
  await setDoc(doc(db, 'users', email), {
    role: user.role,
    nombre: user.nombre || email,
    email,
    sedeId: user.sedeId || null,
  })
}

export async function deleteUser(email: string) {
  await deleteDoc(doc(db, 'users', email.toLowerCase().trim()))
}
