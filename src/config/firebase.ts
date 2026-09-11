import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// ============================================
// CONFIGURACION DE FIREBASE por proyecto.
// Se elige el proyecto al compilar con el .env correspondiente:
//   - npm run build        -> usa el proyecto por defecto
//   - npm run build:main   -> proyecto jada-comercio
//   - npm run build:centauro -> proyecto centauro
// ============================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
// ============================================

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Modo emulador local (solo desarrollo): VITE_USE_EMULATOR=true
// Los datos van al emulador de Firestore/Auth, NUNCA a produccion.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
}

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline no disponible: multiples pestanas abiertas')
  } else if (err.code === 'unimplemented') {
    console.warn('Offline no disponible en este navegador')
  }
})

export { db, auth }
