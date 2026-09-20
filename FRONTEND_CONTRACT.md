# Contrato de Integración Frontend (Medusa Store API)

Este documento contiene la especificación técnica completa de la API expuesta por el backend de Medusa para el equipo de desarrollo frontend.

---

## 1. Convenciones Generales

* **Base URL**: `http://localhost:3000` (desarrollo) o el dominio provisto en producción.
* **Content-Type**: `application/json` en todas las peticiones con cuerpo (`POST`, `PUT`).
* **Moneda por defecto**: `CLP` (Pesos Chilenos). Los valores de moneda son enteros redondeados.
* **Formato de Fechas**: ISO 8601 en formato UTC (ej: `2025-04-15T12:00:00.000Z`).

### Formato Estándar de Error:
En caso de fallo (códigos HTTP `4xx` o `5xx`), el servidor responde con:
```json
{
  "type": "bad_request | not_found | promotion_error | checkout_error | server_error",
  "message": "Descripción clara del motivo del error en español."
}
```

---

## 2. Endpoints del Landing Content Module

### 2.1 Hero de la Landing
* **Endpoint**: `GET /store/landing/hero`
* **Status**: `200 OK`
* **Respuesta**:
```json
{
  "hero": {
    "id": "hero_01",
    "title": "POTENCIA PURA. RECUPERACIÓN TOTAL.",
    "subtitle": "PROTEIN X: La máxima pureza en aislado de suero de leche microfiltrado CFM con 24g de proteína, 5.5g de BCAAs y 0g de azúcar añadido por porción.",
    "badge": "NUEVA FÓRMULA CFM 2025",
    "primary_cta_text": "COMPRAR AHORA",
    "primary_cta_url": "#producto",
    "secondary_cta_text": "VER BENEFICIOS",
    "secondary_cta_url": "#beneficios",
    "image_url": "/assets/images/protein-tub.webp",
    "mobile_image_url": "/assets/images/protein-tub-mobile.webp",
    "active": true,
    "sort_order": 1,
    "created_at": "2025-01-10T10:00:00.000Z",
    "updated_at": "2025-01-10T10:00:00.000Z"
  }
}
```

---

### 2.2 Beneficios Destacados
* **Endpoint**: `GET /store/landing/benefits`
* **Status**: `200 OK`
* **Respuesta**:
```json
{
  "benefits": [
    {
      "id": "ben_01",
      "icon": "ShieldCheck",
      "title": "24g Proteína CFM de Máxima Pureza",
      "description": "Aislado de suero procesado a bajas temperaturas mediante flujo cruzado.",
      "active": true,
      "sort_order": 1
    }
  ],
  "count": 4
}
```

---

### 2.3 Testimonios de Clientes (Demostración)
* **Endpoint**: `GET /store/landing/testimonials`
* **Status**: `200 OK`
* **Respuesta**:
```json
{
  "testimonials": [
    {
      "id": "test_01",
      "customer_name": "Camila Valenzuela",
      "customer_image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      "content": "La digestión es insuperable. Llevo 3 meses usando Chocolate Suizo.",
      "rating": 5,
      "active": true,
      "sort_order": 1,
      "is_demo": true
    }
  ],
  "count": 3
}
```

---

### 2.4 Preguntas Frecuentes (FAQ)
* **Endpoint**: `GET /store/landing/faq`
* **Status**: `200 OK`
* **Respuesta**:
```json
{
  "faq": [
    {
      "id": "faq_01",
      "question": "¿Cómo y cuándo debo tomar PROTEIN X?",
      "answer": "Mezcla 1 scoop (30g) con 250-300 ml de agua fría tras entrenar.",
      "active": true,
      "sort_order": 1
    }
  ],
  "count": 4
}
```

---

### 2.5 Banners Promocionales
* **Endpoint**: `GET /store/landing/banners`
* **Comportamiento**: Excluye automáticamente banners cuya fecha `end_date` haya expirado.
* **Status**: `200 OK`
* **Respuesta**:
```json
{
  "banners": [
    {
      "id": "ban_01",
      "title": "LANZAMIENTO OFICIAL: 15% OFF",
      "subtitle": "Usa el código KINETIC10 en el checkout.",
      "image_url": "/assets/images/banner-promo.webp",
      "button_text": "OBTENER OFERTA",
      "button_url": "#oferta",
      "start_date": "2025-01-01T00:00:00.000Z",
      "end_date": "2025-12-31T23:59:59.000Z",
      "active": true,
      "sort_order": 1
    }
  ],
  "count": 1
}
```

---

### 2.6 Ajustes de Marca & SEO
* **Endpoint**: `GET /store/landing/settings`
* **Status**: `200 OK`
* **Respuesta**:
```json
{
  "settings": {
    "brand_name": "KINETIC Sports Nutrition",
    "logo_url": "/assets/images/logo-kinetic.svg",
    "favicon_url": "/favicon.ico",
    "primary_color": "#a3e635",
    "secondary_color": "#dc2626",
    "whatsapp_number": "+56912345678",
    "instagram_url": "https://instagram.com/kinetic.nutrition",
    "tiktok_url": "https://tiktok.com/@kinetic.nutrition",
    "facebook_url": "https://facebook.com/kinetic.nutrition",
    "contact_email": "contacto@kineticnutrition.cl",
    "shipping_information": "Envíos gratis en compras sobre $45.000 a todo Chile.",
    "footer_text": "© 2025 KINETIC Sports Nutrition.",
    "seo_title": "KINETIC Sports Nutrition | Proteína Aislada CFM Premium",
    "seo_description": "Desarrolla masa muscular magra y maximiza tu recuperación con PROTEIN X.",
    "og_image": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200"
  }
}
```

---

## 3. Endpoints del Catálogo Comercial (Core Ecommerce)

### 3.1 Productos Destacados en la Landing
* **Endpoint**: `GET /store/landing/featured-products`
* **Status**: `200 OK`
* **Descripción**: Devuelve productos donde `metadata.landing_featured === true`, ordenados por `metadata.landing_order`.
* **Respuesta**:
```json
{
  "products": [
    {
      "id": "prod_protein_x",
      "title": "PROTEIN X - 100% Whey Isolate CFM",
      "handle": "protein-x-whey-isolate",
      "thumbnail": "/assets/images/protein-tub.webp",
      "metadata": {
        "landing_featured": true,
        "landing_order": 1,
        "landing_badge": "MÁS VENDIDO",
        "landing_short_description": "24g Aislado CFM, 5.5g BCAAs, 0g Azúcar.",
        "landing_theme": "dark"
      },
      "options": [
        { "id": "opt_sabor", "title": "Sabor", "values": [{ "id": "val_choco", "value": "Chocolate Suizo" }] },
        { "id": "opt_tamano", "title": "Tamaño", "values": [{ "id": "val_1kg", "value": "1 kg" }] }
      ],
      "variants": [
        {
          "id": "var_px_choco_1kg",
          "title": "Chocolate Suizo / 1 kg (33 Serv)",
          "sku": "PX-CHOC-1KG",
          "price": 34990,
          "original_price": 42990,
          "currency_code": "clp",
          "inventory_quantity": 45,
          "status": "in_stock",
          "options": { "Sabor": "Chocolate Suizo", "Tamaño": "1 kg" }
        }
      ]
    }
  ],
  "count": 3
}
```

---

### 3.2 Listado Completo de Productos
* **Endpoint**: `GET /store/products`
* **Status**: `200 OK`

---

### 3.3 Detalle de Producto por ID o Handle
* **Endpoint**: `GET /store/products/:id`
* **Ejemplo**: `GET /store/products/protein-x-whey-isolate` o `GET /store/products/prod_protein_x`
* **Status**: `200 OK` / `404 Not Found`

---

## 4. Endpoints del Carrito & Checkout

### 4.1 Crear un Carrito
* **Endpoint**: `POST /store/carts`
* **Status**: `201 Created`
* **Respuesta**:
```json
{
  "cart": {
    "id": "cart_173000000_abc12",
    "region_id": "reg_cl",
    "currency_code": "clp",
    "items": [],
    "subtotal": 0,
    "discount_total": 0,
    "shipping_total": 0,
    "tax_total": 0,
    "total": 0,
    "promotions": []
  }
}
```

---

### 4.2 Obtener Carrito Actual
* **Endpoint**: `GET /store/carts/:id`
* **Status**: `200 OK` / `404 Not Found`

---

### 4.3 Agregar Variante al Carrito (Con Validación de Stock)
* **Endpoint**: `POST /store/carts/:id/line-items`
* **Cuerpo de la Petición**:
```json
{
  "variant_id": "var_px_choco_1kg",
  "quantity": 2
}
```
* **Status**: `200 OK`
* **Error de Stock (400 Bad Request)**:
```json
{
  "type": "bad_request",
  "message": "Stock insuficiente para Chocolate Suizo / 1 kg (33 Serv). Disponible: 1 unidades."
}
```

---

### 4.4 Aplicar Cupón de Descuento
* **Endpoint**: `POST /store/carts/:id/promotions`
* **Cuerpo de la Petición**:
```json
{
  "code": "KINETIC10"
}
```
* **Status**: `200 OK`
* **Cupones Disponibles**:
  * `KINETIC10`: 10% de descuento sin mínimo.
  * `BIENVENIDA5`: $5.000 CLP de descuento en compras sobre $30.000 CLP.

---

### 4.5 Seleccionar Método de Envío
* **Endpoint**: `POST /store/carts/:id/shipping-methods`
* **Cuerpo de la Petición**:
```json
{
  "option_id": "so_standard"
}
```
* **Opciones disponibles**:
  * `so_standard`: Despacho RM ($3.990 CLP, gratis en compras sobre $45.000 CLP)
  * `so_express`: Despacho Express mismo día ($5.990 CLP)
  * `so_regions`: Despacho Starken/Blue Express ($4.990 CLP)
  * `so_pickup`: Retiro en bodega Las Condes ($0 CLP)

---

### 4.6 Registrar Dirección y Contacto del Cliente
* **Endpoint**: `POST /store/carts/:id/customer`
* **Cuerpo de la Petición**:
```json
{
  "email": "atleta@ejemplo.com",
  "address": {
    "first_name": "Esteban",
    "last_name": "Paredes",
    "address_1": "Av. Apoquindo 4500, Depto 802",
    "city": "Las Condes",
    "province": "Región Metropolitana",
    "phone": "+56987654321"
  }
}
```

---

### 4.7 Completar Pedido (Checkout)
* **Endpoint**: `POST /store/carts/:id/complete`
* **Cuerpo de la Petición**:
```json
{
  "payment_provider": "webpay"
}
```
* **Status**: `201 Created`
* **Respuesta**:
```json
{
  "type": "order",
  "order": {
    "id": "order_173900000",
    "display_id": "KIN-49201",
    "email": "atleta@ejemplo.com",
    "status": "paid",
    "fulfillment_status": "not_fulfilled",
    "payment_status": "captured",
    "total": 69980,
    "currency_code": "clp",
    "created_at": "2025-01-10T12:00:00.000Z"
  }
}
```
* **Comportamiento**: Reduce automáticamente el inventario de las variantes compradas en el catálogo.

---

## 5. Endpoints Administrativos (Medusa Admin)

Los endpoints bajo `/admin/*` permiten al administrador modificar el contenido y consultar transacciones:
* `POST /admin/landing/hero`: Actualiza título, subtítulo o insignias del Hero.
* `PUT /admin/inventory/:variant_id`: Modifica la cantidad de unidades en stock.
* `GET /admin/orders`: Devuelve el listado completo de pedidos recibidos.
* `PUT /admin/orders/:id/status`: Modifica el estado de fulfillment (`not_fulfilled` -> `shipped` -> `delivered`).
