import {
  collection,
  doc,
  runTransaction,
  getDocs,
  query,
  orderBy,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Sale, SaleItem, PaymentRecord, Devolucion } from '../types'
import { round2, titleCase } from '../utils/format'

const col = collection(db, 'ventas')

export async function getSales(): Promise<Sale[]> {
  const snap = await getDocs(query(col, orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale)
}

export async function getSale(id: string): Promise<Sale | null> {
  const snap = await getDoc(doc(db, 'ventas', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) as Sale : null
}

export interface CreateSaleInput {
  tipo: 'contado' | 'credito'
  items: SaleItem[]
  subtotal: number
  descuento: number
  total: number
  abonoInicial: number
  metodoPago: string
  clienteId: string | null
  clienteNombre: string
  usuario: string
  sedeId?: string | null
  sedeNombre?: string
}

export async function createSale(input: CreateSaleInput): Promise<string> {
  const countersRef = doc(db, 'config', 'contadores')
  const ventasCol = collection(db, 'ventas')

  const abonoInicial = input.tipo === 'credito' ? input.abonoInicial : 0
  const saldo = input.tipo === 'credito' ? round2(Math.max(input.total - abonoInicial, 0)) : 0
  const pagos: PaymentRecord[] =
    abonoInicial > 0
      ? [
          {
            id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            monto: abonoInicial,
            fecha: Date.now(),
            metodoPago: input.metodoPago,
            nota: 'Abono inicial',
            usuario: input.usuario,
          },
        ]
      : []

  // Folio: se intenta con transaccion corta (solo el contador) y si falla
  // se usa incremento atomico, que funciona aunque haya poca conexion.
  let folio: number
  try {
    folio = await runTransaction(db, async (tx) => {
      const countersSnap = await tx.get(countersRef)
      const next = (countersSnap.exists() ? countersSnap.data().folioVentas : 0) + 1
      tx.set(countersRef, { folioVentas: next }, { merge: true })
      return next
    })
  } catch {
    await setDoc(countersRef, { folioVentas: increment(1) }, { merge: true })
    const countersSnap = await getDoc(countersRef)
    folio =
      countersSnap.exists() && typeof countersSnap.data().folioVentas === 'number'
        ? countersSnap.data().folioVentas
        : 1
  }

  const saleRef = doc(ventasCol)
  const items = input.items.map((it) => ({ ...it, nombre: titleCase(it.nombre) }))
  const saleData: Omit<Sale, 'id'> = {
    folio,
    tipo: input.tipo,
    items,
    subtotal: round2(input.subtotal),
    descuento: round2(input.descuento),
    total: round2(input.total),
    abonoInicial,
    saldo,
    metodoPago: input.metodoPago,
    clienteId: input.clienteId,
    clienteNombre: titleCase(input.clienteNombre),
    pagos,
    usuario: input.usuario,
    sedeId: input.sedeId ?? undefined,
    sedeNombre: input.sedeNombre ?? '',
    createdAt: Date.now(),
  }

  await setDoc(saleRef, saleData)

  // Stock: decremento atomico por producto (sin transaccion global).
  // Los articulos sueltos (sin inventario) no descuentan stock.
  // Si el producto tiene stock por sede, se descuenta la sede indicada.
  await Promise.all(
    items
      .filter((item) => item.productoId && !item.suelto)
      .map(async (item) => {
        const ref = doc(db, 'productos', item.productoId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          const tienePorSede = data.stockPorSede && typeof data.stockPorSede === 'object'
          if (tienePorSede && input.sedeId) {
            await updateDoc(ref, {
              [`stockPorSede.${input.sedeId}`]: increment(-item.cantidad),
              updatedAt: Date.now(),
            })
          } else {
            await updateDoc(ref, {
              stock: increment(-item.cantidad),
              updatedAt: Date.now(),
            })
          }
        }
      })
  )

  return saleRef.id
}

export async function addPayment(
  saleId: string,
  venta: Sale,
  monto: number,
  metodoPago: string,
  nota: string,
  usuario: string
) {
  const ref = doc(db, 'ventas', saleId)
  const pago: PaymentRecord = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    monto: round2(monto),
    fecha: Date.now(),
    metodoPago,
    nota: titleCase(nota),
    usuario,
  }
  const nuevoSaldo = round2(Math.max((venta.saldo ?? venta.total) - monto, 0))
  await updateDoc(ref, {
    saldo: nuevoSaldo,
    pagos: [...(venta.pagos ?? []), pago],
  })
}

async function restaurarStock(items: Array<{ productoId: string; cantidad: number; suelto?: boolean }>, sedeId?: string | null) {
  await Promise.all(
    items
      .filter((item) => item.productoId && !item.suelto)
      .map(async (item) => {
        const ref = doc(db, 'productos', item.productoId)
        const snap = await getDoc(ref)
        if (!snap.exists()) return
        const data = snap.data()
        const tienePorSede = data.stockPorSede && typeof data.stockPorSede === 'object'
        if (tienePorSede && sedeId) {
          await updateDoc(ref, {
            [`stockPorSede.${sedeId}`]: increment(item.cantidad),
            updatedAt: Date.now(),
          })
        } else {
          await updateDoc(ref, {
            stock: increment(item.cantidad),
            updatedAt: Date.now(),
          })
        }
      })
  )
}

export async function deleteSale(venta: Sale) {
  await restaurarStock(venta.items, venta.sedeId)
  await deleteDoc(doc(db, 'ventas', venta.id!))
}

export async function registrarDevolucion(
  venta: Sale,
  devolucion: Devolucion
) {
  await restaurarStock(devolucion.items, venta.sedeId)
  const nuevoSubtotal = round2(Math.max(venta.subtotal - devolucion.monto, 0))
  const nuevoTotal = round2(Math.max(venta.total - devolucion.monto, 0))
  let nuevoSaldo = venta.saldo ?? 0
  if (venta.tipo === 'credito') {
    nuevoSaldo = round2(Math.max(nuevoSaldo - devolucion.monto, 0))
  }
  await updateDoc(doc(db, 'ventas', venta.id!), {
    total: nuevoTotal,
    subtotal: nuevoSubtotal,
    saldo: nuevoSaldo,
    devoluciones: [...(venta.devoluciones ?? []), devolucion],
  })
}
