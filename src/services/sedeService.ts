import { collection, getDocs, addDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Sede } from '../types'
import { titleCase } from '../utils/format'

const col = collection(db, 'sedes')

export async function getSedes(): Promise<Sede[]> {
  const snap = await getDocs(query(col, orderBy('nombre')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sede)
}

export async function createSede(nombre: string): Promise<string> {
  const ref = await addDoc(col, {
    nombre: titleCase(nombre),
    activo: true,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function updateSede(id: string, data: Partial<Sede>) {
  const clean: Partial<Sede> = { ...data }
  if (clean.nombre !== undefined) clean.nombre = titleCase(clean.nombre)
  await updateDoc(doc(db, 'sedes', id), clean)
}

const DEFECTO = ['Sede Central', 'Sucursal Norte', 'Sucursal Sur']

export async function ensureSedes(): Promise<Sede[]> {
  const all = await getSedes()
  if (all.filter((s) => s.activo).length === 0) {
    for (const n of DEFECTO) await createSede(n)
    return getSedes()
  }
  return all
}