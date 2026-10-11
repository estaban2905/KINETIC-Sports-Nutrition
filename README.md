# KINETIC Sports Nutrition — Monorepo (Medusa 2.x.x + Storefront)

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
8. [CI/CD y Despliegue](#-cicd-y-despliegue)
9. [Problemas Comunes](#-problemas-comunes)
10. [Checklist de Integraciones Futuras](#-checklist-de-integraciones-futuras)

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

## 🚢 CI/CD y Despliegue

El código se valida y se despliega con **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) y corre en **Railway** como contenedores Docker.

### Ambientes

| Ambiente | Rama Git | Ambiente Railway | Para qué sirve |
| :--- | :--- | :--- | :--- |
| **Local** | cualquiera | — | Desarrollo en tu máquina (Docker solo para Postgres y Redis) |
| **develop** | `develop` | `develop` | Integración y pruebas. Cada push despliega solo, sin aprobación |
| **production** | `main` | `production` | Clientes reales. Solo se llega aquí fusionando `develop` en `main` |

Cada ambiente de Railway tiene **su propio** Postgres, Redis, variables, dominios y secretos. No comparten datos ni claves.

### Flujo de despliegue

```
 feature/*  ──PR──►  develop  ──PR──►  main
                       │                │
                  CI + deploy      CI + deploy
                  a "develop"      a "production"
```

1. Trabaja en una rama y abre un **Pull Request** hacia `develop`. El CI corre, pero **no despliega**.
2. Al fusionar en `develop`, el CI corre de nuevo y, si pasa, **despliega al ambiente `develop`**.
3. Cuando `develop` esté probado, abre un PR de `develop` hacia `main`. Al fusionar, el CI corre y **despliega a `production`**.

El pipeline tiene estos jobs:

| Job | Qué hace | Cuándo |
| :--- | :--- | :--- |
| `Backend` | Typecheck (`tsc`) + tests unitarios (Jest) | PR y push |
| `Storefront` | Typecheck (`tsc`) | PR y push |
| `Docker build` (x2) | Construye las imágenes de backend y storefront sin publicarlas | PR y push |
| `Deploy backend` | `railway up` del backend | Solo push a `develop` o `main`, con todo lo anterior en verde |
| `Deploy storefront` | `railway up` del storefront | Después de `Deploy backend` |

El backend se despliega primero: su script `predeploy` (`medusa db:migrate`) migra la base de datos antes de arrancar, y el storefront debe salir contra un backend ya migrado.

### Arquitectura en Railway

Cada ambiente tiene 4 servicios con estos nombres exactos (el workflow depende de ellos):

| Servicio | Qué es | Puerto | Dockerfile |
| :--- | :--- | :--- | :--- |
| `backend` | Medusa 2 (API + Admin en `/app`) | `9000` | [`apps/backend/Dockerfile`](apps/backend/Dockerfile) |
| `storefront` | Express + Vite (SPA) | `3000` | [`apps/storefront/Dockerfile`](apps/storefront/Dockerfile) |
| `Postgres` | Plugin de Railway | — | — |
| `Redis` | Plugin de Railway | — | — |

Los servicios `backend` y `storefront` son **Empty Service** (sin repo conectado): el despliegue lo dispara únicamente GitHub Actions con `railway up`, para no desplegar dos veces. Cada uno tiene su [`railway.json`](apps/backend/railway.json) con el healthcheck (`/health` en el backend, `/api/health` en el storefront).

El navegador del cliente habla **directo** con el backend (`VITE_MEDUSA_BACKEND_URL`, incrustada en el bundle al construir) y el backend solo acepta peticiones de los orígenes listados en `STORE_CORS` / `AUTH_CORS`.

### Configuración inicial (una sola vez por ambiente)

**1. Railway**
1. Crea el ambiente (`develop` o `production`) en tu proyecto.
2. Añade los plugins **PostgreSQL** y **Redis**, y dos **Empty Service** llamados `backend` y `storefront`.
3. En cada servicio genera el dominio público (*Settings → Networking → Generate Domain*): puerto `9000` para el backend y `3000` para el storefront.
4. Carga las variables de cada servicio (ver más abajo).
5. Crea un **Project Token** del ambiente (*Project → Settings → Tokens*).

**2. GitHub** (*Settings → Environments*)
1. Crea los environments `develop` y `production`.
2. En cada uno, agrega el secret `RAILWAY_TOKEN` con el token del ambiente **correspondiente**. Así un deploy de `develop` nunca puede tocar producción.
3. En `production`, activa **Required reviewers** y limita las ramas a `main`.

**3. Ramas**: `main` (producción) y `develop` (integración). Idealmente protege ambas para exigir PR y CI en verde.

### Variables de entorno por ambiente

Se configuran en Railway (*servicio → Variables → Raw Editor*), nunca en el repositorio. Las URLs cambian por ambiente; **los secretos deben ser distintos en cada ambiente**.

**`backend`**

| Variable | Valor / Descripción |
| :--- | :--- |
| `NODE_ENV` | `production` (es el *modo* de Node, no el nombre del ambiente; también en `develop`) |
| `RAILWAY_DOCKERFILE_PATH` | `apps/backend/Dockerfile` |
| `DATABASE_URL` / `REDIS_URL` | Referencias: `${{Postgres.DATABASE_URL}}` y `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` / `COOKIE_SECRET` | Únicos por ambiente, `openssl rand -base64 48`. En producción el backend **no arranca** si faltan, son cortos (<32) o de ejemplo |
| `AUTH_MFA_ENCRYPTION_KEY` | Único por ambiente, `openssl rand -hex 32` |
| `STORE_CORS` | URL pública del storefront |
| `ADMIN_CORS` | URL pública del backend |
| `AUTH_CORS` | URL del storefront y del backend, separadas por coma (sin espacios) |
| `TRANSBANK_*` | Credenciales Webpay. `TRANSBANK_RETURN_URL` = `<storefront>/webpay/return` |
| `MERCADOPAGO_*` | Token y URLs de retorno/notificación (`<backend>/hooks/payment/mercadopago_mercadopago`) |
| `KHIPU_*` | API Key, secreto del webhook y URLs de retorno/cancelación. `KHIPU_NOTIFY_URL` vacío salvo que sea una URL pública alcanzable |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Opcionales: el proveedor solo se activa si hay clave |
| `CHILEXPRESS_*` | Claves de Cotizador, Coberturas y Envíos, y datos de la bodega de origen |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Correos transaccionales |
| `SENTRY_DSN` | Errores en servidor (opcional) |

Todas las variables y su explicación están en [`apps/backend/.env.example`](apps/backend/.env.example).

**`storefront`**

| Variable | Valor / Descripción |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (obligatorio: el servidor lo tiene fijo) |
| `RAILWAY_DOCKERFILE_PATH` | `apps/storefront/Dockerfile` |
| `VITE_MEDUSA_BACKEND_URL` | URL pública del backend, con `https://` y **sin barra final** |
| `VITE_MEDUSA_PUBLISHABLE_KEY` | Publishable key **de ese ambiente** (ver "Primer despliegue") |
| `VITE_STRIPE_PUBLISHABLE_KEY` / `VITE_SENTRY_DSN` | Opcionales |

> Las variables `VITE_*` se **incrustan en el bundle al construir**, no se leen en tiempo de ejecución. Si cambias una, hay que **volver a desplegar el storefront**.

### Primer despliegue de un ambiente (base de datos vacía)

`predeploy` solo crea las tablas. Hay que sembrar los datos una vez por ambiente:

1. Despliega (push a `develop` o `main`) y espera a que el backend esté **Online**. Comprueba `<backend>/health` → `OK`.
2. Enlaza la CLI de Railway al ambiente correcto y abre una terminal en el contenedor:
   ```bash
   npm i -g @railway/cli
   railway login
   railway link          # elige el proyecto y el ambiente (develop o production)
   railway ssh -s backend
   ```
3. Dentro del contenedor, siembra los datos (el código está compilado, rutas `.js`; si dudas, `ls src/scripts`):
   ```bash
   npx medusa exec ./src/scripts/seed-chile.js
   npx medusa exec ./src/scripts/seed-kinetic-products.js
   npx medusa exec ./src/scripts/seed-landing.js
   npx medusa user -e admin@tu-dominio.cl -p "UNA_CLAVE_FUERTE"
   ```
4. Entra a `<backend>/app`, *Settings → API Keys*, y copia la **publishable key** (`pk_...`).
5. Ponla en `VITE_MEDUSA_PUBLISHABLE_KEY` del storefront de ese ambiente y **redespliega el storefront** (por ejemplo, con un commit vacío o *Re-run* del job).

La publishable key es distinta en cada base de datos. Si recreas la base, repite este proceso.

### Cómo desplegar (día a día)

| Quiero... | Haz esto |
| :--- | :--- |
| Probar un cambio en `develop` | PR a `develop` → fusionar → el pipeline despliega solo |
| Llevar a producción | PR de `develop` a `main` → fusionar → (aprobación si está activa) → despliega |
| Re-desplegar sin cambios | Commit vacío: `git commit --allow-empty -m "redeploy" && git push` |
| Cambiar una variable de Railway | Editarla en el panel. Backend: reinicia solo. Storefront (`VITE_*`): requiere re-desplegar |
| Revertir un deploy | En Railway, servicio → *Deployments* → deploy anterior → *Rollback*. La base de datos **no** se revierte |
| Ver logs | Railway → servicio → *Deployments* → *View logs* |

### Gestión de dependencias (`package-lock.json`)

El lockfile **sí se versiona**: los Dockerfiles y el CI usan `npm ci`, que instala exactamente lo que dice. Si agregas o actualizas dependencias en Windows/macOS, npm puede omitir los binarios nativos de Linux (`@swc/core`, `@typescript/typescript-linux-x64`) y el CI fallará con `Failed to load native binding` o `Unable to resolve @typescript/typescript-linux-x64`. En ese caso, regenera el lockfile en un directorio limpio:

```bash
# copia solo los package.json (raíz, apps/backend, apps/storefront) a una carpeta vacía y ahí:
npm install --package-lock-only --ignore-scripts
# copia el package-lock.json resultante de vuelta al repositorio
```

### Problemas comunes de despliegue

| Síntoma | Causa y solución |
| :--- | :--- |
| `Railpack failed to prepare the build` | Railway no usa el Dockerfile. Falta `RAILWAY_DOCKERFILE_PATH` en el servicio |
| `JWT_SECRET is missing or insecure for production` | Faltan `JWT_SECRET`/`COOKIE_SECRET`, son cortos o son el marcador de ejemplo |
| `Failed to load native binding` / `Unable to resolve ...-linux-x64` en CI | Lockfile generado sin binarios de Linux (ver sección anterior) |
| `Connection refused` a `backboard.railway-develop.com` | Una variable `RAILWAY_ENV` en el workflow colisiona con la CLI. Se usa `DEPLOY_ENV` |
| El storefront carga pero no muestra productos | `VITE_MEDUSA_PUBLISHABLE_KEY` vacía o de otra base, o el backend no tiene el dominio del storefront en `STORE_CORS` |
| Error de CORS en el navegador | `STORE_CORS` / `AUTH_CORS` no incluyen exactamente la URL del storefront (con `https://`, sin barra final) |
| El storefront no arranca (healthcheck falla) | Falta `PORT=3000` |

---

## 🩹 Problemas Comunes

- **`password authentication failed for user "postgres"` al migrar**: normalmente indica que hay **otro Postgres corriendo en el puerto 5432** en el host (por ejemplo, un Postgres instalado nativo en Windows) y el cliente se conecta al equivocado en vez del contenedor Docker. Por eso este proyecto mapea Postgres a `5433:5432` en `docker-compose.yml`. Verifica con `docker compose ps` y ajusta `DATABASE_URL` si cambias el puerto.
- **Error `Cannot find module 'ajv/dist/core'` u otros módulos faltantes al instalar**: normalmente un lockfile (`package-lock.json`) desincronizado. Solución: borrar `node_modules` y correr `npm install` de nuevo. **No borres `package-lock.json`**: regenerarlo en Windows/macOS rompe el CI de Linux (ver [Gestión de dependencias](#gestión-de-dependencias-package-lockjson)).
- **La landing no muestra productos reales**: los componentes de la UI (`ProductSection`, `CartDrawer`, `FeaturedProducts`, `QuickViewModal`) todavía usan datos estáticos de `apps/storefront/src/data/products.ts`. Ver el checklist abajo.

---

## 📋 Checklist de Integraciones Futuras

- [ ] **Catálogo real**: crear el producto `PROTEIN X` (sabores, tamaños, SKUs) en el backend Medusa y reemplazar `src/data/products.ts` por llamadas a `src/lib/medusa.ts`.
- [ ] **Carrito y checkout real**: conectar `CartDrawer` al flujo real de Medusa (crear cart, agregar line items, aplicar promociones, seleccionar envío, completar orden) en vez del carrito simulado actual.
- [ ] **Pasarelas de pago**: Webpay Plus / Mercado Pago / Stripe como proveedores de pago de Medusa (`apps/backend/medusa-config.ts`).
- [ ] **Logística**: integración de cotización y tracking con Starken / Blue Express.
- [ ] **Correos transaccionales**: conectar Resend / SendGrid / SES al evento `order.placed`.
- [ ] **Almacenamiento de archivos**: módulo `@medusajs/file-s3` o Google Cloud Storage para imágenes de producto.
