import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Client } from '../types'
import { titleCase } from '../utils/format'

const col = collection(db, 'clientes')

export async function getClients(): Promise<Client[]> {
  const snap = await getDocs(query(col, orderBy('nombre')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Client)
}

export async function getClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, 'clientes', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) as Client : null
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now()
  const ref = await addDoc(col, {
    ...data,
    nombre: titleCase(data.nombre),
    telefono: titleCase(data.telefono),
    cedula: titleCase(data.cedula),
    direccion: titleCase(data.direccion),
    activo: true,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateClient(id: string, data: Partial<Client>) {
  const clean: Partial<Client> = { ...data }
  if (clean.nombre !== undefined) clean.nombre = titleCase(clean.nombre)
  if (clean.telefono !== undefined) clean.telefono = titleCase(clean.telefono)
  if (clean.cedula !== undefined) clean.cedula = titleCase(clean.cedula)
  if (clean.direccion !== undefined) clean.direccion = titleCase(clean.direccion)
  await updateDoc(doc(db, 'clientes', id), { ...clean, updatedAt: Date.now() })
}

export async function deleteClient(id: string) {
  await updateDoc(doc(db, 'clientes', id), { activo: false, updatedAt: Date.now() })
}
