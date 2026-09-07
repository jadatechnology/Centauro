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
import type { Product } from '../types'
import { titleCase } from '../utils/format'

const col = collection(db, 'productos')

export async function getProducts(): Promise<Product[]> {
  const snap = await getDocs(query(col, orderBy('nombre')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'productos', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) as Product : null
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now()
  const ref = await addDoc(col, {
    ...data,
    nombre: titleCase(data.nombre),
    descripcion: titleCase(data.descripcion),
    categoria: titleCase(data.categoria),
    codigo: titleCase(data.codigo),
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const clean: Partial<Product> = { ...data }
  if (clean.nombre !== undefined) clean.nombre = titleCase(clean.nombre)
  if (clean.descripcion !== undefined) clean.descripcion = titleCase(clean.descripcion)
  if (clean.categoria !== undefined) clean.categoria = titleCase(clean.categoria)
  if (clean.codigo !== undefined) clean.codigo = titleCase(clean.codigo)
  await updateDoc(doc(db, 'productos', id), { ...clean, updatedAt: Date.now() })
}

export async function deleteProduct(id: string) {
  await updateDoc(doc(db, 'productos', id), { activo: false, updatedAt: Date.now() })
}

export async function renameCategory(oldName: string, newName: string): Promise<number> {
  const snap = await getDocs(query(col, orderBy('nombre')))
  const products = snap.docs.filter((d) => d.data().categoria === oldName)
  if (products.length === 0) return 0
  const normalized = titleCase(newName)
  await Promise.all(
    products.map((d) =>
      updateDoc(doc(db, 'productos', d.id), { categoria: normalized, updatedAt: Date.now() })
    )
  )
  return products.length
}

export async function deleteCategory(name: string): Promise<number> {
  const snap = await getDocs(query(col, orderBy('nombre')))
  const products = snap.docs.filter((d) => d.data().categoria === name)
  if (products.length === 0) return 0
  await Promise.all(
    products.map((d) =>
      updateDoc(doc(db, 'productos', d.id), { categoria: '', updatedAt: Date.now() })
    )
  )
  return products.length
}
