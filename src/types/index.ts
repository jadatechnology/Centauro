export interface Product {
  id?: string
  nombre: string
  descripcion: string
  categoria: string
  codigo: string
  costo: number
  precio: number
  stock: number
  stockMinimo: number
  vencimiento?: string
  ubicacion?: string
  activo: boolean
  createdAt: number
  updatedAt: number
}

export interface Client {
  id?: string
  nombre: string
  telefono: string
  email: string
  cedula: string
  direccion: string
  limiteCredito: number
  activo: boolean
  createdAt: number
  updatedAt: number
}

export interface SaleItem {
  productoId: string
  nombre: string
  codigo: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  suelto?: boolean
}

export interface PaymentRecord {
  id: string
  monto: number
  fecha: number
  metodoPago: string
  nota: string
  usuario: string
}

export interface Sale {
  id?: string
  folio: number
  tipo: 'contado' | 'credito'
  items: SaleItem[]
  subtotal: number
  descuento: number
  total: number
  abonoInicial: number
  saldo: number
  metodoPago: string
  clienteId: string | null
  clienteNombre: string
  pagos: PaymentRecord[]
  usuario: string
  createdAt: number
}

export interface AppUser {
  email: string
  role: 'admin' | 'user'
  nombre: string
}

export interface StoreConfig {
  company: string
  slogan: string
  taxRegime: string
  address: string
  phone: string
  receiptFooter: string
  currencySymbol: string
  receiptMode: string
}
