# CENTAURO ORIENTE - Sistema POS e Inventario

Sistema web de punto de venta, inventario, clientes y ventas a credito.
Mobile-first, hecho con React + TypeScript + Vite + Tailwind + Firebase (Auth, Firestore, Hosting).

## Datos del proyecto

- Carpeta local: `C:\Users\DELL\Documents\centauro-app`
- Firebase project: `centaurooriente`
- URL app: https://centaurooriente.web.app
- Consola: https://console.firebase.google.com/project/centaurooriente/overview
- GitHub: https://github.com/jadatechnology/Centauro
- Cuenta Firebase: `centaurofosca@gmail.com`

## Comandos

- `npm run build` -> compila a `dist/`
- `firebase deploy` -> despliega hosting + rules al proyecto `centaurooriente`
- `npm run dev` -> servidor local de desarrollo

## Configuracion Firebase

Las credenciales se leen de variables de entorno en `.env` (NO se sube a git).
Usa `.env.example` como plantilla si falta el `.env`.
Firestore rules en `firestore.rules` (requiere auth para leer/escribir).

## Estructura importante

- `src/config/firebase.ts` -> inicializacion de Firebase (usa env vars)
- `src/services/` -> acceso a Firestore: productService, saleService, clientService, configService, userService, statsService
- `src/pages/` -> POS, Dashboard, Products, ProductForm, Clients, CreditAccounts, SaleDetail, SalesList, Settings, UsersManagement, Login
- `src/utils/` -> format, backup (JSON/Excel/PDF), receiptPdf, print, statement, sound
- `src/types/index.ts` -> interfaces Product, Client, Sale, SaleItem, PaymentRecord, StoreConfig, AppUser

## Estado actual

- Clon de jada-comercio, totalmente independiente (datos, auth y hosting propios).
- Firestore activado, rules desplegados.
- Falta: activar Authentication (Email/Password) y crear el primer usuario admin si aun no se hizo.
- Los datos estan vacios (proyecto nuevo).

## Origen del codigo

Clon del sistema "jada-comercio" (repo `jadatechnology/mi-tienda`). A partir de aqui evoluciona por separado.