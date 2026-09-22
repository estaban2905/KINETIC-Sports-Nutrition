# KINETIC Sports Nutrition — Monorepo (Medusa 2.x + Storefront)

![KINETIC Sports Nutrition — Landing](docs/screenshots/landing-hero.png)

Plataforma de comercio electrónico para suplementos y nutrición deportiva de alto rendimiento. El proyecto es un **monorepo con dos aplicaciones independientes**:

- **`apps/backend`** — Backend **Medusa 2.x real** (no simulado): catálogo, variantes, inventario, carrito, checkout, órdenes, promociones, panel Admin de Medusa.
- **`apps/storefront`** — Landing page en React 19 + Vite + Three.js (render 3D del envase), que consume la Store API del backend real y además expone su propio mini-servidor Express solo para el **Landing Content Module** (hero, beneficios, testimonios, FAQ, banners).

---

## 📑 Tabla de Contenidos
1. [Arquitectura](#-arquitectura)
2. [Estructura del Repositorio](#-estructura-del-repositorio)
3. [Requisitos Previos](#-requisitos-previos)
4. [Puesta en Marcha (paso a paso)](#-puesta-en-marcha-paso-a-paso)
5. [Variables de Entorno](#-variables-de-entorno)
6. [Scripts Disponibles](#-scripts-disponibles)
7. [APIs Expuestas](#-apis-expuestas)
8. [Problemas Comunes](#-problemas-comunes)
9. [Checklist de Integraciones Futuras](#-checklist-de-integraciones-futuras)

---

## 🏛️ Arquitectura

```text
┌───────────────────────────┐        ┌──────────────────────────────────┐
│   apps/storefront (:3000) │        │      apps/backend (:9000)        │
│                           │        │                                  │
│  React 19 + Vite + Three.js│        │  Medusa 2.x (Framework real)     │
│  - Landing page (Hero,    │  HTTP  │  - Store API: products, carts,   │
│    beneficios, FAQ, etc.) │◄──────►│    checkout, orders, promotions  │
│  - src/lib/medusa.ts      │  SDK   │  - Admin Dashboard (/app)        │
│    (@medusajs/js-sdk)     │        │  - Módulos custom (landing        │
│  - Express propio solo    │        │    content, si aplica)           │
│    para /store/landing y  │        └────────────────┬─────────────────┘
│    /admin (contenido)     │                         │
└───────────────────────────┘                         ▼
                                        ┌──────────────────────────────┐
                                        │   docker-compose.yml         │
                                        │   - Postgres 16 (5433→5432)  │
                                        │   - Redis 7 (6379)           │
                                        └──────────────────────────────┘
```

**Importante**: el ecommerce (productos, carrito, checkout, órdenes) vive **solo** en `apps/backend`. El servidor de `apps/storefront` (`server.ts`) ya no expone rutas de comercio — únicamente sirve el Landing Content Module y los assets estáticos/Vite. El storefront habla con el backend real vía `apps/storefront/src/lib/medusa.ts`.

---

## 📁 Estructura del Repositorio

```text
├── docker-compose.yml          # Postgres 16 + Redis 7 para el backend Medusa
├── package.json                # Workspaces raíz (npm), orquesta backend + storefront
├── FRONTEND_CONTRACT.md        # Contrato de API (revisar: parte del contenido es histórico)
│
├── apps/
│   ├── backend/                 # Medusa 2.x real
│   │   ├── medusa-config.ts     # DB, CORS, JWT/cookie secrets
│   │   ├── .env                 # Config local (no versionado)
│   │   ├── .env.example        # Plantilla de variables
│   │   └── src/
│   │       ├── admin/           # Extensiones del Admin Dashboard
│   │       ├── api/             # Rutas custom (si se agregan)
│   │       ├── modules/         # Módulos de dominio Medusa
│   │       ├── jobs/ subscribers/ workflows/ links/
│   │       └── migration-scripts/ # Incluye seed inicial de demo
│   │
│   └── storefront/              # Landing + cliente Medusa
│       ├── server.ts            # Express: solo /store/landing y /admin (contenido)
│       ├── .env                 # Config local (no versionado)
│       ├── .env.example         # Plantilla de variables
│       └── src/
│           ├── lib/medusa.ts    # Cliente @medusajs/js-sdk hacia apps/backend
│           ├── components/      # Hero, ProductSection, CartDrawer, etc.
│           ├── data/products.ts # Datos estáticos de catálogo (⚠ ver Checklist)
│           ├── modules/landing/ # Landing Content Module (hero, FAQ, banners...)
│           └── api/             # Rutas del Landing Content Module
```

---

## ⚙️ Requisitos Previos

- **Node.js** v20.x o v22.x LTS.
- **npm** v10+.
- **Docker Desktop** (o Docker Engine) corriendo, para Postgres y Redis.
- Puerto **5433** libre en el host para Postgres (se mapea así, no 5432 — ver [Problemas Comunes](#-problemas-comunes)) y **6379** libre para Redis.

---

## 🚀 Puesta en Marcha (paso a paso)

### 1. Levantar Postgres y Redis con Docker
```bash
docker compose up -d
docker compose ps   # ambos deben quedar "healthy"
```

### 2. Instalar dependencias del monorepo
Desde la raíz del proyecto (instala backend + storefront a la vez gracias a los workspaces):
```bash
npm install
```

### 3. Configurar variables de entorno

**Backend** (`apps/backend/.env`, basado en `.env.example`):
```env
DATABASE_URL="postgres://postgres:postgres@localhost:5433/medusa_kinetic"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="cambia-esta-clave"
COOKIE_SECRET="cambia-esta-clave"
STORE_CORS="http://localhost:3000,http://localhost:5173"
ADMIN_CORS="http://localhost:9000,http://localhost:7001"
AUTH_CORS="http://localhost:3000,http://localhost:5173,http://localhost:9000"
```

**Storefront** (`apps/storefront/.env`, basado en `.env.example`):
```env
PORT=3000
VITE_MEDUSA_BACKEND_URL="http://localhost:9000"
VITE_MEDUSA_PUBLISHABLE_KEY="pk_..."   # se obtiene en el paso 5
```

### 4. Migrar y sembrar datos del backend
```bash
npm run migrate
```
Esto corre `medusa db:migrate` dentro de `apps/backend`: crea las tablas y siembra datos base (región, canal de ventas, ubicación de stock, un producto demo).

### 5. Crear usuario admin y publishable API key
```bash
cd apps/backend
npx medusa user -e tu-email@ejemplo.com -p "tu-password"
```
Luego entra al Admin Dashboard en **http://localhost:9000/app**, ve a *Settings → API Key Management*, crea una **Publishable API Key**, ábrela y asígnale el **Default Sales Channel**. Copia el token (`pk_...`) y pégalo en `apps/storefront/.env` como `VITE_MEDUSA_PUBLISHABLE_KEY`.

### 6. Levantar todo en desarrollo
Desde la raíz:
```bash
npm run dev
```
- **Backend Medusa**: `http://localhost:9000` — Store API en `/store/*`, Admin Dashboard en `/app`.
- **Storefront**: `http://localhost:3000` — Landing page, Landing Content API en `/store/landing/*`.

También puedes levantar cada app por separado: `npm run dev:backend` o `npm run dev:storefront`.

---

## 🔐 Variables de Entorno

### `apps/backend/.env`
| Variable | Descripción |
| :--- | :--- |
| `DATABASE_URL` | Conexión a Postgres (usa el puerto que mapeaste en `docker-compose.yml`, por defecto `5433`) |
| `REDIS_URL` | Conexión a Redis del contenedor Docker (`6379`) |
| `JWT_SECRET` / `COOKIE_SECRET` | Claves de firma para sesiones admin |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | Orígenes permitidos (incluir `http://localhost:3000` para el storefront) |

### `apps/storefront/.env`
| Variable | Descripción |
| :--- | :--- |
| `PORT` | Puerto del servidor Express propio (default `3000`) |
| `VITE_MEDUSA_BACKEND_URL` | URL del backend Medusa real (`http://localhost:9000` en local) |
| `VITE_MEDUSA_PUBLISHABLE_KEY` | Publishable API Key generada en el Admin Dashboard, vinculada al Sales Channel |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | CORS del servidor de contenido de la landing (no del ecommerce) |

---

## 📜 Scripts Disponibles

Desde la **raíz** del monorepo:
| Script | Qué hace |
| :--- | :--- |
| `npm run dev` | Levanta backend + storefront en paralelo |
| `npm run dev:backend` | Solo el backend Medusa (`apps/backend`) |
| `npm run dev:storefront` | Solo el storefront (`apps/storefront`) |
| `npm run migrate` | Corre migraciones + seed inicial del backend |
| `npm run build` | Compila backend y storefront |
| `npm run lint` | Type-check del storefront |

Dentro de `apps/backend`: `npm run dev` (`medusa develop`), `npm run start` (`medusa start`, producción), `npm run db:migrate`, `npm run user -- -e <email> -p <password>` (crear admin).

Dentro de `apps/storefront`: `npm run dev` (`tsx server.ts` con Vite middleware), `npm run build`, `npm run start` (producción), `npm run lint` (`tsc --noEmit`).

---

## 📡 APIs Expuestas

- **Store API real (backend, `:9000`)**: `/store/products`, `/store/carts`, `/store/regions`, etc. — requieren el header `x-publishable-api-key`. Documentación oficial: [docs.medusajs.com](https://docs.medusajs.com/api/store).
- **Admin API real (backend, `:9000`)**: `/admin/*` — requiere JWT de sesión admin.
- **Landing Content API (storefront, `:3000`)**: `/store/landing/hero`, `/faq`, `/benefits`, `/testimonials`, `/banners`, `/settings` — contenido editorial de marketing, no ecommerce.

> ⚠️ `FRONTEND_CONTRACT.md` describe endpoints de comercio (`/store/carts`, `/store/products`) que en versiones anteriores vivían en el storefront (`commerceRoutes.ts`, ya eliminado). Esas rutas hoy corresponden al backend Medusa real en `:9000`, no al storefront.

---

## 🩹 Problemas Comunes

- **`password authentication failed for user "postgres"` al migrar**: normalmente indica que hay **otro Postgres corriendo en el puerto 5432** en el host (por ejemplo, un Postgres instalado nativo en Windows) y el cliente se conecta al equivocado en vez del contenedor Docker. Por eso este proyecto mapea Postgres a `5433:5432` en `docker-compose.yml`. Verifica con `docker compose ps` y ajusta `DATABASE_URL` si cambias el puerto.
- **Error `Cannot find module 'ajv/dist/core'` u otros módulos faltantes al instalar**: normalmente un lockfile (`package-lock.json`) desincronizado. Solución: borrar `node_modules` y `package-lock.json` en la raíz y correr `npm install` de nuevo.
- **La landing no muestra productos reales**: los componentes de la UI (`ProductSection`, `CartDrawer`, `FeaturedProducts`, `QuickViewModal`) todavía usan datos estáticos de `apps/storefront/src/data/products.ts`. Ver el checklist abajo.

---

## 📋 Checklist de Integraciones Futuras

- [ ] **Catálogo real**: crear el producto `PROTEIN X` (sabores, tamaños, SKUs) en el backend Medusa y reemplazar `src/data/products.ts` por llamadas a `src/lib/medusa.ts`.
- [ ] **Carrito y checkout real**: conectar `CartDrawer` al flujo real de Medusa (crear cart, agregar line items, aplicar promociones, seleccionar envío, completar orden) en vez del carrito simulado actual.
- [ ] **Pasarelas de pago**: Webpay Plus / Mercado Pago / Stripe como proveedores de pago de Medusa (`apps/backend/medusa-config.ts`).
- [ ] **Logística**: integración de cotización y tracking con Starken / Blue Express.
- [ ] **Correos transaccionales**: conectar Resend / SendGrid / SES al evento `order.placed`.
- [ ] **Almacenamiento de archivos**: módulo `@medusajs/file-s3` o Google Cloud Storage para imágenes de producto.
