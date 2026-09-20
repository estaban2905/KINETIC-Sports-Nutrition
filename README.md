# KINETIC Sports Nutrition — Medusa 2.x Ecommerce & Landing Engine

Plataforma integral de comercio electrónico para suplementos y nutrición deportiva de alto rendimiento basada en la arquitectura **Medusa 2.x**, con un **Landing Content Module** desacoplado, motor de catálogo transaccional en pesos chilenos (CLP), control estricto de inventario y renderizado 3D interactivo.

---

## 📑 Tabla de Contenidos
1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Arquitectura del Sistema & Patrón de Diseño](#-arquitectura-del-sistema--patrón-de-diseño)
3. [Estructura del Repositorio](#-estructura-del-repositorio)
4. [Módulos & Servicios del Negocio](#-módulos--servicios-del-negocio)
5. [Base de Datos & Persistencia (PostgreSQL & Redis)](#-base-de-datos--persistencia-postgresql--redis)
6. [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
7. [Variables de Entorno](#-variables-de-entorno)
8. [Scripts Disponibles](#-scripts-disponibles)
9. [APIs Expuestas & Contrato Frontend](#-apis-expuestas--contrato-frontend)
10. [Guía de Despliegue en Producción](#-guía-de-despliegue-en-producción)
11. [Checklist de Integraciones Futuras (`// TODO:`)](#-checklist-de-integraciones-futuras--todo)

---

## 🏋️ Descripción del Proyecto

**KINETIC Sports Nutrition** es una solución de comercio electrónico diseñada para productos de suplementación deportiva (proteínas aisladas CFM, creatina, pre-entrenos y accesorios). Su objetivo es combinar:

- **Experiencia de usuario de alta conversión**: Landing page optimizada con visualización 3D interactiva de producto, selector dinámico de sabores y tamaños, carrito deslizante y checkout transparente.
- **Backend Headless robusto y escalable**: Arquitectura basada en **Medusa 2.x** que expone APIs REST para desacoplar completamente la lógica de negocio, inventario, precios, promociones y contenido de marketing.
- **Panel Administrativo (Medusa Admin Extension)**: Interfaz de gestión en tiempo real para modificar titulares del hero, beneficios, preguntas frecuentes, ajustar stock y gestionar pedidos recibidos.

---

## 🏛️ Arquitectura del Sistema & Patrón de Diseño

El proyecto implementa una arquitectura **Full-Stack Monolito Unificado (Backend-For-Frontend Embebido)** con soporte nativo para desacoplarse en cualquier momento:

### 1. Diagrama de Arquitectura
```text
                         ┌────────────────────────────────────────────────────────┐
                         │                 NAVEGADOR / CLIENTE                    │
                         │        (Landing Page / App Móvil / Storefront)         │
                         └─────────────────────────┬──────────────────────────────┘
                                                   │
                             Peticiones HTTP       │  GET /store/landing/...
                             REST & Assets         │  POST /store/carts/...
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SERVIDOR UNIFICADO (server.ts - Puerto 3000)             │
│                                                                                 │
│   ┌───────────────────────────────┐     ┌───────────────────────────────────┐   │
│   │     EXPRESS ROUTING ENGINE    │     │       VITE MIDDLEWARE (Dev)       │   │
│   │                               │     │   o STATIC ASSETS (Producción)    │   │
│   │  /store/*  ──► Store APIs     │     │                                   │   │
│   │  /admin/*  ──► Admin APIs     │     │  /* ──► Sirve dist/index.html     │   │
│   │  /webhooks ──► Webhook Bus    │     │         (Landing Page React + 3D) │   │
│   └──────────────┬────────────────┘     └───────────────────────────────────┘   │
└──────────────────┼──────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE SERVICIOS & NEGOCIO                             │
│                                                                                 │
│   ┌───────────────────────────────────┐ ┌───────────────────────────────────┐   │
│   │     LANDING CONTENT MODULE        │ │       MEDUSA CORE COMMERCE        │   │
│   │                                   │ │                                   │   │
│   │  - Hero Content Entity            │ │  - Catálogo (PROTEIN X, Sabores)  │   │
│   │  - Benefits Entity                │ │  - Variantes con SKU y Stock      │   │
│   │  - Testimonials Entity            │ │  - Prevención de Sobreventas      │   │
│   │  - FAQ Entity                     │ │  - Carrito, Cupones & Impuestos   │   │
│   │  - Banners Promocionales (Fechas) │ │  - Métodos de Envío (Chile/RM)    │   │
│   │  - Configuración de Marca & SEO   │ │  - Checkout Transaccional         │   │
│   └─────────────────┬─────────────────┘ └─────────────────┬─────────────────┘   │
└─────────────────────┼─────────────────────────────────────┼─────────────────────┘
                      │                                     │
                      ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE PERSISTENCIA & DATOS                            │
│                                                                                 │
│   ┌───────────────────────────────────┐ ┌───────────────────────────────────┐   │
│   │       POSTGRESQL 15+ (DML/DDL)    │ │         REDIS 7+ (IN-MEMORY)      │   │
│   │  - Tablas transaccionales Medusa  │ │  - Caché de lectura de catálogo   │   │
│   │  - Tablas Landing (001_initial)   │ │  - Event Bus & Webhook queues     │   │
│   │  - Pedidos, Carts, Clientes       │ │  - Rate-limit de cupones y auth   │   │
│   └───────────────────────────────────┘ └───────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Mapeo con el Patrón MVC (Model - View - Controller)
* **Model (Modelo)**:
  * `src/modules/landing/`: Entidades relacionales (`HeroContent`, `LandingBenefit`, `LandingFAQ`, `LandingBanner`, `LandingSettings`).
  * `src/modules/ecommerce/`: Modelos de negocio (`Product`, `ProductVariant`, `Cart`, `LineItem`, `Order`, `Promotion`).
* **View (Vista)**:
  * `src/components/`: Interfaz de usuario construida en React 19, Tailwind CSS v4, Three.js (render 3D del envase de proteína), y animaciones con Motion.
  * `src/admin/components/LandingAdminApp.tsx`: Panel administrativo visual de Medusa Admin.
* **Controller (Controlador)**:
  * `src/api/store/`: Controladores públicos (`/store/landing/*` y `/store/products`, `/store/carts`).
  * `src/api/admin/`: Controladores protegidos para modificar stock, contenidos y estados de pedidos.
  * `server.ts`: Despachador principal que orquesta peticiones de API y sirve la vista frontend.

---

## 📁 Estructura del Repositorio

```text
├── .env.example                       # Plantilla de variables de entorno requeridas
├── FRONTEND_CONTRACT.md               # Especificación técnica exhaustiva para desarrolladores frontend
├── README.md                          # Este documento
├── index.html                         # Entry point HTML de la aplicación web
├── medusa-config.ts                   # Configuración del motor Medusa 2.x (DB, Redis, CORS, Plugins)
├── metadata.json                      # Metadatos de la plataforma y permisos de ejecución
├── package.json                       # Dependencias del proyecto y scripts de compilación
├── server.ts                          # Servidor Node.js/Express con Vite middleware & API routes
├── tsconfig.json                      # Configuración del compilador TypeScript
├── vite.config.ts                     # Configuración del empaquetador Vite con soporte Tailwind v4
│
├── src/
│   ├── main.tsx                       # Punto de entrada de React
│   ├── App.tsx                        # Componente raíz con orquestación de la landing y admin toggle
│   ├── types.ts                       # Tipos e interfaces globales de TypeScript
│   ├── index.css                      # Estilos globales y directivas de Tailwind CSS
│   │
│   ├── admin/                         # Medusa Admin Extension
│   │   └── components/
│   │       └── LandingAdminApp.tsx    # Dashboard visual para administración de contenidos, pedidos y stock
│   │
│   ├── api/                           # Controladores de la API REST (Rutas Express)
│   │   ├── admin/
│   │   │   └── adminRoutes.ts         # Endpoints privados (/admin/landing/*, /admin/orders, /admin/inventory)
│   │   ├── store/
│   │   │   ├── landingRoutes.ts       # Endpoints públicos (/store/landing/hero, benefits, faq, banners, etc.)
│   │   │   └── commerceRoutes.ts      # Endpoints transaccionales (/store/products, carts, promotions, checkout)
│   │   └── webhooks/
│   │       └── webhookRoutes.ts       # Bus de despacho de eventos (order.placed, product.updated)
│   │
│   ├── components/                    # Componentes de la Vista Frontend (Landing Page)
│   │   ├── Benefits.tsx               # Cuadrícula de beneficios técnicos
│   │   ├── CartDrawer.tsx             # Carrito lateral deslizable con simulador de pedidos
│   │   ├── ExperienceSection.tsx      # Sección interactiva de disolución y calidad CFM
│   │   ├── FAQ.tsx                    # Acordeón de preguntas frecuentes
│   │   ├── FeaturedProducts.tsx       # Catálogo complementario (creatina, pre-entreno)
│   │   ├── FinalCTA.tsx               # Llamado final a la acción con compra rápida
│   │   ├── Footer.tsx                 # Pie de página con información legal y sellos
│   │   ├── Hero.tsx                   # Hero principal con renderizado del envase
│   │   ├── Navbar.tsx                 # Barra de navegación con contador de carrito
│   │   ├── ProductSection.tsx         # Selector de sabores, tamaños y compra directa
│   │   ├── Protein3DViewer.tsx        # Canvas interactivo Three.js con modelo 3D del envase
│   │   ├── QuickViewModal.tsx         # Vista rápida modal de productos secundarios
│   │   ├── SpecialOffer.tsx           # Banner de oferta limitada con cuenta regresiva
│   │   ├── Testimonials.tsx           # Carrusel de testimonios de atletas
│   │   └── WhatsAppButton.tsx         # Botón flotante de asistencia comercial por WhatsApp
│   │
│   ├── data/
│   │   └── products.ts                # Datos base de catálogo para renderizado inicial del frontend
│   │
│   ├── modules/                       # Lógica de Dominio del Backend (Arquitectura Medusa)
│   │   ├── ecommerce/                 # Módulo de Comercio Central
│   │   │   ├── service.ts             # Servicio transaccional (catálogo, inventario, carts, checkout)
│   │   │   └── types.ts               # Tipos de datos comerciales (Product, Variant, Cart, Order, Promotion)
│   │   │
│   │   └── landing/                   # Landing Content Module
│   │       ├── service.ts             # Servicio de gestión de contenidos de marketing
│   │       ├── types.ts               # Modelos de entidades de landing (Hero, Benefit, FAQ, Banner, Settings)
│   │       └── migrations/
│   │           └── 001_initial_landing.ts # Migración DDL para creación de tablas en PostgreSQL
│   │
│   └── scripts/
│       └── seed.ts                    # Script de siembra de datos demo (PROTEIN X, categorías, cupones)
```

---

## ⚙️ Módulos & Servicios del Negocio

### 1. Landing Content Module (`src/modules/landing`)
Módulo independiente diseñado según las directrices de Medusa 2.x para aislar los contenidos editoriales y de marketing de las tablas de transacciones comerciales:
- **`HeroContent`**: Gestiona el título H1, subtítulo descriptivo, insignia de fórmula (`NUEVA FÓRMULA CFM 2025`), CTAs primario y secundario, y URLs de imágenes responsive.
- **`LandingBenefit`**: Lista de atributos de calidad (Pureza CFM, Absorción Instantánea, BCAA Naturales) con iconos asociados y orden de visualización.
- **`LandingTestimonial`**: Reseñas de atletas con calificación (1-5 estrellas), avatar y bandera de demostración.
- **`LandingFAQ`**: Preguntas frecuentes sobre consumo, horarios de ingesta y tiempos de despacho.
- **`LandingBanner`**: Banners promocionales temporales con fechas de inicio y fin (`start_date`, `end_date`), filtrados automáticamente por el backend.
- **`LandingSettings`**: Ajustes de marca, links de redes sociales, WhatsApp comercial y metadatos SEO (`og:title`, `og:image`, `meta-description`).

### 2. Core Medusa Commerce Module (`src/modules/ecommerce`)
Motor de comercio transaccional que gestiona el ciclo de vida completo de compra:
- **Producto Insignia**: `PROTEIN X - 100% Whey Isolate CFM`.
  - Sabores: Chocolate Suizo, Vainilla Francesa, Cookies & Cream.
  - Tamaños: 1 kg (33 servicios) y 2 kg (66 servicios).
  - Variantes con SKU individual (`PX-CHOC-1KG`, `PX-CHOC-2KG`, etc.) y precios en CLP.
- **Control de Inventario**: Validación de existencias antes de agregar ítems al carrito y reserva/descuento de stock en la confirmación de la orden.
- **Motor de Promociones**: Validación de cupones porcentuales (`KINETIC10` para 10% OFF) y de monto fijo (`BIENVENIDA5` para $5.000 CLP de descuento en compras superiores a $30.000 CLP).
- **Envíos Regionales**: Tarifas configuradas para Santiago (Estándar $3.990 CLP / Express $5.990 CLP / Gratis sobre $45.000 CLP), Regiones vía Starken/Blue Express ($4.990 CLP) y Retiro en Bodega ($0 CLP).
- **Gestión de Órdenes**: Generación de número de pedido con formato `KIN-XXXXX`, detalle de dirección de entrega, totales, cálculo de IVA (19%) y estados de pago y fulfillment.

---

## 🗄️ Base de Datos & Persistencia (PostgreSQL & Redis)

### Esquema Relacional de Tablas (PostgreSQL)
El archivo `src/modules/landing/migrations/001_initial_landing.ts` contiene la definición DDL de las tablas:
1. `landing_hero_content`: Contenido editorial principal.
2. `landing_benefit`: Beneficios del producto ordenados por `sort_order`.
3. `landing_testimonial`: Testimonios con puntuación y marcado demo.
4. `landing_faq`: Acordeón de preguntas frecuentes.
5. `landing_banner`: Banners con rango de fechas para campañas.
6. `landing_settings`: Claves de configuración de marca y metadatos SEO.

### Tablas Estándar de Medusa Core
1. `product`, `product_variant`, `product_option`, `product_option_value`.
2. `inventory_item`, `inventory_level`.
3. `cart`, `line_item`, `shipping_method`.
4. `order`, `fulfillment`, `payment`.

### Configurar Conexión con PostgreSQL en la Nube
Para conectar con servicios como **Neon.tech**, **Supabase**, **Cloud SQL** o **Railway**:
1. Copia tu URI de conexión SSL.
2. Configura en tu archivo `.env`:
   ```env
   DATABASE_URL="postgres://usuario:password@host-postgres.com:5432/kinetic_db?sslmode=require"
   ```
3. Medusa creará o actualizará automáticamente las tablas mediante sus migraciones.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js**: v20.x o v22.x LTS instalado.
- **npm** (v10+) o **pnpm**.
- Acceso a una base de datos PostgreSQL (o utilizar el motor en memoria precargado para pruebas locales).

### Paso 1: Clonar e Instalar
```bash
git clone <url-del-repositorio>
cd kinetic-nutrition-medusa
npm install
```

### Paso 2: Configurar Variables de Entorno
```bash
cp .env.example .env
```
*(Revisa los valores dentro de `.env` según tu entorno de ejecución).*

### Paso 3: Sembrar Datos de Prueba (Seed)
```bash
npm run seed
```
Este comando registra la región de Chile, las categorías comerciales, el producto **PROTEIN X** con sus 5 variantes de sabor y tamaño, los cupones de descuento y los textos del Hero.

### Paso 4: Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
El servidor unificado iniciará en `http://localhost:3000`:
- **Landing Page**: `http://localhost:3000/`
- **Store API**: `http://localhost:3000/store`
- **Landing Content API**: `http://localhost:3000/store/landing`
- **Admin Dashboard**: Botón flotante inferior izquierdo o `http://localhost:3000/admin`

---

## 🔐 Variables de Entorno

| Variable | Descripción | Ejemplo / Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución (`development` o `production`) | `development` |
| `DATABASE_URL` | URI de conexión a PostgreSQL | `postgres://usuario:pass@localhost:5432/medusa_db` |
| `REDIS_URL` | URI de conexión a Redis (opcional en desarrollo) | `redis://localhost:6379` |
| `JWT_SECRET` | Clave secreta para firma de tokens JWT de administradores | Clave aleatoria de 32+ caracteres |
| `COOKIE_SECRET` | Clave para cookies de sesión | Clave aleatoria |
| `STORE_CORS` | Orígenes autorizados para consumir la Store API | `http://localhost:3000,http://localhost:5173` |
| `ADMIN_CORS` | Orígenes autorizados para el panel Medusa Admin | `http://localhost:3000,http://localhost:7001` |
| `WEBPAY_COMMERCE_CODE` | Código de comercio de Transbank Webpay Plus | `597055555532` (Integración) |
| `WEBPAY_API_KEY` | Llave privada de Transbank Webpay Plus | Llave de integración o producción |
| `STRIPE_API_KEY` | Llave secreta de Stripe para pagos en USD | `sk_test_...` |
| `STORAGE_BUCKET` | Nombre del bucket para imágenes en la nube | `kinetic-assets` |

---

## 📜 Scripts Disponibles

En el archivo `package.json` dispones de los siguientes comandos:

* **`npm run dev`**: Inicia el backend Express con TypeScript en tiempo real (`tsx server.ts`) y el middleware de Vite para recarga instantánea de la interfaz.
* **`npm run build`**: 
  1. Compila la vista frontend optimizada mediante `vite build` generando los archivos estáticos en `dist/`.
  2. Compila y empaqueta el servidor backend a un archivo único CommonJS (`dist/server.cjs`) mediante `esbuild` para ejecución independiente de alto rendimiento.
* **`npm run start`**: Ejecuta el servidor de producción compilado (`node dist/server.cjs`).
* **`npm run seed`**: Ejecuta el script `src/scripts/seed.ts` para poblar la base de datos con información inicial.
* **`npm run lint`**: Valida los tipos estáticos del proyecto (`tsc --noEmit`).

---

## 📡 APIs Expuestas & Contrato Frontend

La documentación técnica exhaustiva para desarrolladores frontend se encuentra en el archivo **[`FRONTEND_CONTRACT.md`](./FRONTEND_CONTRACT.md)**.

### Resumen de Endpoints Principales:

#### Landing Content Module:
* `GET /store/landing/hero`: Titular, subtítulo, insignias y CTAs activos.
* `GET /store/landing/benefits`: Beneficios técnicos de la proteína.
* `GET /store/landing/testimonials`: Testimonios de atletas verificados.
* `GET /store/landing/faq`: Acordeón de preguntas frecuentes.
* `GET /store/landing/banners`: Banners de ofertas activos por fecha.
* `GET /store/landing/settings`: Configuración general de marca y SEO.

#### Core Ecommerce Store API:
* `GET /store/landing/featured-products`: Productos destacados para la landing page.
* `GET /store/products`: Listado completo de productos y variantes.
* `GET /store/products/:id`: Detalle de producto por ID o por `handle`.
* `POST /store/carts`: Crear un nuevo carrito de compras.
* `GET /store/carts/:id`: Obtener el estado actual del carrito y totales.
* `POST /store/carts/:id/line-items`: Agregar variante al carrito (con validación de stock).
* `POST /store/carts/:id/promotions`: Aplicar cupón de descuento (`KINETIC10`, `BIENVENIDA5`).
* `POST /store/carts/:id/shipping-methods`: Seleccionar método de despacho.
* `POST /store/carts/:id/customer`: Registrar datos y dirección de envío del cliente.
* `POST /store/carts/:id/complete`: Finalizar compra y generar pedido.

#### Medusa Admin API:
* `POST /admin/landing/hero`: Modificar textos e imágenes del Hero.
* `POST /admin/landing/settings`: Modificar configuración de marca y SEO.
* `PUT /admin/inventory/:variant_id`: Modificar stock de una variante específica.
* `GET /admin/orders`: Listar todos los pedidos recibidos.
* `PUT /admin/orders/:id/status`: Actualizar estado de despacho (`not_fulfilled` -> `shipped`).

---

## 🚢 Guía de Despliegue en Producción

### Modalidad 1: Despliegue Unificado (Recomendada)
Despliega todo el proyecto (API + Landing) en un único contenedor o servicio de backend:
1. **Plataformas recomendadas**: **Railway**, **Render**, **Google Cloud Run** o **Fly.io**.
2. **Build Command**: `npm run build`
3. **Start Command**: `npm run start`
4. **Ventajas**:
   - Sin problemas de CORS (mismo origen).
   - Un único servidor y costo de infraestructura.
   - La landing carga en `https://tu-dominio.com/` y la API responde en `https://tu-dominio.com/store/...`.

### Modalidad 2: Despliegue Desacoplado (Headless Puro)
Si decides tener la landing page en una plataforma como **Vercel** o **Cloudflare Pages** y el backend en **Railway**:
1. En el backend (Railway):
   - Configura las variables `STORE_CORS` con la URL de tu frontend en Vercel (ej: `https://kinetic.vercel.app`).
   - Ejecuta `npm run start`.
2. En el frontend (Vercel):
   - Configura la variable de entorno `VITE_MEDUSA_BACKEND_URL=https://api-kinetic.up.railway.app`.
   - Las llamadas `fetch` consumirán los endpoints documentados en `FRONTEND_CONTRACT.md`.

---

## 📋 Checklist de Integraciones Futuras (`// TODO:`)

El código fuente contiene marcadores `// TODO:` detallados en los archivos correspondientes para guiar la conexión con servicios de terceros:

- [ ] **Pasarelas de Pago**:
  - [ ] Transbank Webpay Plus (Chile): Integrar SDK oficial de Transbank en `src/api/store/commerceRoutes.ts`.
  - [ ] Mercado Pago Checkout Pro & Webhook IPN en `src/api/store/commerceRoutes.ts`.
  - [ ] Stripe PaymentIntents para tarjetas internacionales en `medusa-config.ts`.
- [ ] **Logística y Despachos**:
  - [ ] Integración de cotización en tiempo real y emisión de etiquetas de seguimiento con Starken / Blue Express en `src/api/webhooks/webhookRoutes.ts`.
- [ ] **Correos Transaccionales**:
  - [ ] Conectar servicio de correos (Resend / SendGrid / Amazon SES) en el evento `order.placed`.
- [ ] **Almacenamiento de Archivos**:
  - [ ] Conectar módulo `@medusajs/file-s3` o Google Cloud Storage para subida de imágenes de variantes en `medusa-config.ts`.
- [ ] **Seguridad & Rate Limiting**:
  - [ ] Activar middleware `express-rate-limit` en la ruta `/store/carts/:id/promotions` para prevenir ataques de fuerza bruta en cupones.
