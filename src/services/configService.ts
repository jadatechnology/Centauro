import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { StoreConfig } from '../types'
import { APP_CONFIG } from '../config/app'
import { titleCase } from '../utils/format'

const defaultConfig: StoreConfig = {
  company: APP_CONFIG.company,
  slogan: APP_CONFIG.slogan,
  taxRegime: APP_CONFIG.taxRegime,
  address: APP_CONFIG.address,
  phone: APP_CONFIG.phone,
  receiptFooter: APP_CONFIG.receiptFooter,
  currencySymbol: APP_CONFIG.currencySymbol,
  receiptMode: APP_CONFIG.receiptMode,
  usarVencimiento: true,
}

export async function getStoreConfig(): Promise<StoreConfig> {
  const snap = await getDoc(doc(db, 'config', 'tienda'))
  if (snap.exists()) {
    return { ...defaultConfig, ...snap.data() } as StoreConfig
  }
  await setDoc(doc(db, 'config', 'tienda'), defaultConfig)
  return defaultConfig
}

export async function saveStoreConfig(data: Partial<StoreConfig>) {
  const clean: Partial<StoreConfig> = { ...data }
  if (clean.company !== undefined) clean.company = titleCase(clean.company)
  if (clean.slogan !== undefined) clean.slogan = titleCase(clean.slogan)
  if (clean.taxRegime !== undefined) clean.taxRegime = titleCase(clean.taxRegime)
  if (clean.address !== undefined) clean.address = titleCase(clean.address)
  if (clean.receiptFooter !== undefined) clean.receiptFooter = titleCase(clean.receiptFooter)
  await setDoc(doc(db, 'config', 'tienda'), { ...defaultConfig, ...clean }, { merge: true })
}
