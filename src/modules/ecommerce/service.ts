import {
  Product,
  ProductCategory,
  ProductCollection,
  ProductVariant,
  Cart,
  CartItem,
  Order,
  Customer,
  Promotion,
  ShippingOption,
  CustomerAddress,
} from "./types.ts";

/**
 * Core Medusa Commerce Service
 * Central authoritative state manager for commercial operations.
 *
 * // TODO: [DATABASE] Replace in-memory Maps and arrays with PostgreSQL persistent tables using Medusa v2 DML / MikroORM / Knex.
 * // TODO: [DATABASE] Implement database connection pooling via 'pg.Pool' or MikroORM EntityManager.
 * // TODO: [CACHE] Integrate Redis (ioredis) caching layer for 'getProducts()' and 'getProductById()' with automated TTL & invalidation.
 */
export class EcommerceService {
  // TODO: [DATABASE] Replace these collections with direct repository queries (e.g. productRepo.find(), cartRepo.findOne())
  private products: Product[] = [];
  private categories: ProductCategory[] = [];
  private collections: ProductCollection[] = [];
  private carts: Map<string, Cart> = new Map();
  private orders: Order[] = [];
  private customers: Customer[] = [];
  private promotions: Promotion[] = [];
  private shippingOptions: ShippingOption[] = [];

  constructor() {
    this.seedInitialCommerceData();
  }

  // ==========================================================================
  // SEED INITIAL COMMERCIAL CATALOG
  // ==========================================================================
  private seedInitialCommerceData() {
    const isoNow = new Date().toISOString();

    // 1. Categories
    this.categories = [
      { id: "cat_proteinas", name: "Proteínas", handle: "proteinas", product_count: 1 },
      { id: "cat_creatina", name: "Creatina", handle: "creatina", product_count: 1 },
      { id: "cat_preentreno", name: "Pre-entreno", handle: "pre-entreno", product_count: 1 },
      { id: "cat_barras", name: "Barras proteicas", handle: "barras-proteicas", product_count: 0 },
      { id: "cat_accesorios", name: "Accesorios", handle: "accesorios", product_count: 0 },
      { id: "cat_ropa", name: "Ropa deportiva", handle: "ropa-deportiva", product_count: 0 },
    ];

    // 2. Collections
    this.collections = [
      { id: "col_mas_vendidos", title: "Más vendidos", handle: "mas-vendidos", product_count: 1 },
      { id: "col_nuevos", title: "Nuevos", handle: "nuevos", product_count: 1 },
      { id: "col_ofertas", title: "Ofertas", handle: "ofertas", product_count: 1 },
      { id: "col_recomendados", title: "Recomendados", handle: "recomendados", product_count: 1 },
      { id: "col_destacados", title: "Destacados", handle: "destacados", product_count: 2 },
    ];

    // 3. Flagship Product: PROTEIN X
    const proteinX: Product = {
      id: "prod_protein_x",
      title: "PROTEIN X - 100% Whey Isolate CFM",
      subtitle: "Proteína de suero microfiltrada por flujo cruzado (CFM)",
      description: "Proteína deportiva premium de máxima biodisponibilidad y digestión ultra rápida. Contiene 24g de proteína pura por servicio, 5.5g de BCAAs y 0g de azúcar añadido. Libre de gluten y de colorantes artificiales.",
      handle: "protein-x-whey-isolate",
      is_giftcard: false,
      status: "published",
      thumbnail: "/assets/images/protein-tub.webp",
      images: [
        "/assets/images/protein-tub.webp",
        "/assets/images/protein-tub-chocolate.webp",
        "/assets/images/protein-tub-vainilla.webp",
      ],
      options: [
        {
          id: "opt_sabor",
          title: "Sabor",
          values: [
            { id: "val_choco", value: "Chocolate Suizo" },
            { id: "val_vainilla", value: "Vainilla Francesa" },
            { id: "val_cookies", value: "Cookies & Cream" },
          ],
        },
        {
          id: "opt_tamano",
          title: "Tamaño",
          values: [
            { id: "val_1kg", value: "1 kg" },
            { id: "val_2kg", value: "2 kg" },
          ],
        },
      ],
      variants: [
        {
          id: "var_px_choco_1kg",
          title: "Chocolate Suizo / 1 kg (33 Serv)",
          sku: "PX-CHOC-1KG",
          price: 34990,
          original_price: 42990,
          currency_code: "clp",
          inventory_quantity: 45,
          manage_inventory: true,
          allow_backorder: false,
          weight: 1000,
          options: { Sabor: "Chocolate Suizo", Tamaño: "1 kg" },
          status: "in_stock",
        },
        {
          id: "var_px_choco_2kg",
          title: "Chocolate Suizo / 2 kg (66 Serv)",
          sku: "PX-CHOC-2KG",
          price: 59990,
          original_price: 69990,
          currency_code: "clp",
          inventory_quantity: 28,
          manage_inventory: true,
          allow_backorder: false,
          weight: 2000,
          options: { Sabor: "Chocolate Suizo", Tamaño: "2 kg" },
          status: "in_stock",
        },
        {
          id: "var_px_vain_1kg",
          title: "Vainilla Francesa / 1 kg (33 Serv)",
          sku: "PX-VAIN-1KG",
          price: 34990,
          original_price: 42990,
          currency_code: "clp",
          inventory_quantity: 35,
          manage_inventory: true,
          allow_backorder: false,
          weight: 1000,
          options: { Sabor: "Vainilla Francesa", Tamaño: "1 kg" },
          status: "in_stock",
        },
        {
          id: "var_px_vain_2kg",
          title: "Vainilla Francesa / 2 kg (66 Serv)",
          sku: "PX-VAIN-2KG",
          price: 59990,
          original_price: 69990,
          currency_code: "clp",
          inventory_quantity: 19,
          manage_inventory: true,
          allow_backorder: false,
          weight: 2000,
          options: { Sabor: "Vainilla Francesa", Tamaño: "2 kg" },
          status: "in_stock",
        },
        {
          id: "var_px_cook_2kg",
          title: "Cookies & Cream / 2 kg (66 Serv)",
          sku: "PX-COOK-2KG",
          price: 59990,
          original_price: 69990,
          currency_code: "clp",
          inventory_quantity: 4,
          manage_inventory: true,
          allow_backorder: false,
          weight: 2000,
          options: { Sabor: "Cookies & Cream", Tamaño: "2 kg" },
          status: "low_stock",
        },
      ],
      categories: [this.categories[0]],
      collection_id: "col_destacados",
      collection: this.collections[4],
      metadata: {
        landing_featured: true,
        landing_order: 1,
        landing_badge: "MÁS VENDIDO",
        landing_short_description: "24g Aislado CFM, 5.5g BCAAs, 0g Azúcar añadido por servicio.",
        landing_theme: "dark",
        protein_grams: 24,
        bcaas_grams: 5.5,
        sugar_grams: 0,
      },
      created_at: isoNow,
      updated_at: isoNow,
    };

    // 4. Secondary Products: Creatine & Pre-workout
    const creatine: Product = {
      id: "prod_creatine_creapure",
      title: "CREATINE MONOHYDRATE 100% CREAPURE®",
      subtitle: "Monohidrato de creatina micronizada de origen alemán",
      description: "El suplemento con mayor respaldo científico para aumentar fuerza explosiva, masa muscular libre de grasa y rendimiento anaeróbico de alta intensidad.",
      handle: "creatine-monohydrate-creapure-300g",
      is_giftcard: false,
      status: "published",
      thumbnail: "/assets/images/creatine-tub.webp",
      images: ["/assets/images/creatine-tub.webp"],
      options: [
        {
          id: "opt_crea_tam",
          title: "Tamaño",
          values: [{ id: "val_300g", value: "300 g" }],
        },
      ],
      variants: [
        {
          id: "var_crea_300g",
          title: "Neutro / 300 g (60 Serv)",
          sku: "CREA-CREAPURE-300G",
          price: 24990,
          original_price: 29990,
          currency_code: "clp",
          inventory_quantity: 60,
          manage_inventory: true,
          allow_backorder: false,
          weight: 300,
          options: { Tamaño: "300 g" },
          status: "in_stock",
        },
      ],
      categories: [this.categories[1]],
      collection_id: "col_destacados",
      collection: this.collections[4],
      metadata: {
        landing_featured: true,
        landing_order: 2,
        landing_badge: "POTENCIA PURA",
        landing_short_description: "5g de Creatina Creapure® pura por scoop para fuerza y volumen.",
        landing_theme: "dark",
      },
      created_at: isoNow,
      updated_at: isoNow,
    };

    const preworkout: Product = {
      id: "prod_ignite_preworkout",
      title: "PRE-WORKOUT IGNITE V2",
      subtitle: "Fórmula de enfoque cognitivo, bombeo muscular y energía sostenida",
      description: "Con 300mg de Cafeína Anhidra, 3.2g de Beta-Alanina CarnoSyn® y 6g de L-Citrulina Malato para vascularización y bombeo sin bajón energético.",
      handle: "preworkout-ignite-30-servings",
      is_giftcard: false,
      status: "published",
      thumbnail: "/assets/images/preworkout-tub.webp",
      images: ["/assets/images/preworkout-tub.webp"],
      options: [
        {
          id: "opt_pre_sabor",
          title: "Sabor",
          values: [{ id: "val_blue_ras", value: "Blue Raspberry" }],
        },
      ],
      variants: [
        {
          id: "var_ignite_blue",
          title: "Blue Raspberry / 30 Serv (420g)",
          sku: "IGNITE-BLUE-420G",
          price: 28990,
          original_price: 33990,
          currency_code: "clp",
          inventory_quantity: 30,
          manage_inventory: true,
          allow_backorder: false,
          weight: 420,
          options: { Sabor: "Blue Raspberry" },
          status: "in_stock",
        },
      ],
      categories: [this.categories[2]],
      collection_id: "col_destacados",
      collection: this.collections[4],
      metadata: {
        landing_featured: true,
        landing_order: 3,
        landing_badge: "ENERGÍA EXPLOSIVA",
        landing_short_description: "6g L-Citrulina, 3.2g Beta-Alanina y 300mg Cafeína.",
        landing_theme: "dark",
      },
      created_at: isoNow,
      updated_at: isoNow,
    };

    this.products = [proteinX, creatine, preworkout];

    // 5. Shipping Options
    this.shippingOptions = [
      {
        id: "so_standard",
        name: "Despacho Estándar Región Metropolitana (24-48 hrs)",
        price: 3990,
        currency_code: "clp",
        estimated_days: "1-2 días hábiles",
      },
      {
        id: "so_express",
        name: "Despacho Express Mismo Día (compras antes de las 13:00 hrs)",
        price: 5990,
        currency_code: "clp",
        estimated_days: "Mismo día hábil",
      },
      {
        id: "so_regions",
        name: "Despacho a Regiones (Starken / Blue Express)",
        price: 4990,
        currency_code: "clp",
        estimated_days: "2-3 días hábiles",
      },
      {
        id: "so_pickup",
        name: "Retiro en Bodega Central (Las Condes, Santiago)",
        price: 0,
        currency_code: "clp",
        estimated_days: "Inmediato previa coordinación",
      },
    ];

    // 6. Promotions & Coupons
    this.promotions = [
      {
        id: "promo_kinetic10",
        code: "KINETIC10",
        type: "percentage",
        value: 10,
        min_subtotal: 0,
        active: true,
        start_date: isoNow,
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "promo_bienvenida5",
        code: "BIENVENIDA5",
        type: "fixed",
        value: 5000,
        min_subtotal: 30000,
        active: true,
        start_date: isoNow,
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  // ==========================================================================
  // STORE API: PRODUCTS & CATALOG
  // ==========================================================================

  public async getProducts(): Promise<Product[]> {
    return this.products.filter((p) => p.status === "published");
  }

  public async getProductById(id: string): Promise<Product | null> {
    const product = this.products.find((p) => p.id === id || p.handle === id);
    return product || null;
  }

  public async getFeaturedProducts(): Promise<Product[]> {
    return this.products
      .filter((p) => p.status === "published" && p.metadata?.landing_featured === true)
      .sort((a, b) => {
        const orderA = (a.metadata?.landing_order as number) ?? 999;
        const orderB = (b.metadata?.landing_order as number) ?? 999;
        return orderA - orderB;
      });
  }

  public async getCategories(): Promise<ProductCategory[]> {
    return this.categories;
  }

  public async getCollections(): Promise<ProductCollection[]> {
    return this.collections;
  }

  public async getShippingOptions(): Promise<ShippingOption[]> {
    return this.shippingOptions;
  }

  // ==========================================================================
  // STORE API: CART OPERATIONS
  // ==========================================================================

  public async createCart(): Promise<Cart> {
    const cartId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCart: Cart = {
      id: cartId,
      region_id: "reg_cl",
      currency_code: "clp",
      items: [],
      subtotal: 0,
      discount_total: 0,
      shipping_total: 0,
      tax_total: 0,
      total: 0,
      promotions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.carts.set(cartId, newCart);
    return newCart;
  }

  public async getCart(cartId: string): Promise<Cart | null> {
    return this.carts.get(cartId) || null;
  }

  public async addItemToCart(
    cartId: string,
    variantId: string,
    quantity: number
  ): Promise<Cart> {
    let cart = this.carts.get(cartId);
    if (!cart) {
      cart = await this.createCart();
    }

    // Locate product and variant
    let foundProduct: Product | undefined;
    let foundVariant: ProductVariant | undefined;

    for (const prod of this.products) {
      const v = prod.variants.find((item) => item.id === variantId);
      if (v) {
        foundProduct = prod;
        foundVariant = v;
        break;
      }
    }

    if (!foundProduct || !foundVariant) {
      throw new Error(`Variant ${variantId} not found in catalog.`);
    }

    // Strict Inventory Validation
    const existingItem = cart.items.find((i) => i.variant_id === variantId);
    const newQuantity = (existingItem?.quantity || 0) + quantity;

    if (foundVariant.manage_inventory && !foundVariant.allow_backorder) {
      if (newQuantity > foundVariant.inventory_quantity) {
        throw new Error(
          `Stock insuficiente para ${foundVariant.title}. Disponible: ${foundVariant.inventory_quantity} unidades.`
        );
      }
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
      existingItem.total = existingItem.quantity * existingItem.unit_price;
    } else {
      const lineItem: CartItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        variant_id: foundVariant.id,
        product_id: foundProduct.id,
        title: foundProduct.title,
        variant_title: foundVariant.title,
        thumbnail: foundProduct.thumbnail,
        quantity,
        unit_price: foundVariant.price,
        total: quantity * foundVariant.price,
        options: foundVariant.options,
      };
      cart.items.push(lineItem);
    }

    this.recalculateCartTotals(cart);
    cart.updated_at = new Date().toISOString();
    return cart;
  }

  public async updateCartItemQuantity(
    cartId: string,
    lineItemId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error("Cart not found.");

    const itemIndex = cart.items.findIndex((i) => i.id === lineItemId);
    if (itemIndex === -1) throw new Error("Cart item not found.");

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const item = cart.items[itemIndex];
      // Validate inventory
      let foundVariant: ProductVariant | undefined;
      for (const prod of this.products) {
        const v = prod.variants.find((variant) => variant.id === item.variant_id);
        if (v) {
          foundVariant = v;
          break;
        }
      }
      if (foundVariant && foundVariant.manage_inventory && !foundVariant.allow_backorder) {
        if (quantity > foundVariant.inventory_quantity) {
          throw new Error(
            `Stock insuficiente para ${foundVariant.title}. Disponible: ${foundVariant.inventory_quantity} unidades.`
          );
        }
      }
      item.quantity = quantity;
      item.total = item.quantity * item.unit_price;
    }

    this.recalculateCartTotals(cart);
    cart.updated_at = new Date().toISOString();
    return cart;
  }

  public async removeCartItem(cartId: string, lineItemId: string): Promise<Cart> {
    return this.updateCartItemQuantity(cartId, lineItemId, 0);
  }

  public async applyPromotion(cartId: string, code: string): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error("Cart not found.");

    const promo = this.promotions.find(
      (p) => p.code.toUpperCase() === code.trim().toUpperCase() && p.active
    );

    if (!promo) {
      throw new Error(`El cupón '${code}' no es válido o ha expirado.`);
    }

    if (cart.subtotal < promo.min_subtotal) {
      throw new Error(
        `El cupón '${code}' requiere un subtotal mínimo de $${promo.min_subtotal.toLocaleString("es-CL")}.`
      );
    }

    const alreadyApplied = cart.promotions.some((p) => p.id === promo.id);
    if (!alreadyApplied) {
      cart.promotions.push(promo);
    }

    this.recalculateCartTotals(cart);
    cart.updated_at = new Date().toISOString();
    return cart;
  }

  public async setShippingOption(cartId: string, optionId: string): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error("Cart not found.");

    const option = this.shippingOptions.find((so) => so.id === optionId);
    if (!option) throw new Error("Shipping option not found.");

    cart.shipping_option = option;
    cart.shipping_total = option.price;

    this.recalculateCartTotals(cart);
    cart.updated_at = new Date().toISOString();
    return cart;
  }

  public async setCustomerInfo(
    cartId: string,
    email: string,
    address: CustomerAddress
  ): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error("Cart not found.");

    cart.email = email;
    cart.shipping_address = address;
    cart.updated_at = new Date().toISOString();
    return cart;
  }

  private recalculateCartTotals(cart: Cart) {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);

    let discount = 0;
    for (const promo of cart.promotions) {
      if (promo.type === "percentage") {
        discount += Math.round(cart.subtotal * (promo.value / 100));
      } else if (promo.type === "fixed") {
        discount += promo.value;
      }
    }
    cart.discount_total = Math.min(discount, cart.subtotal);

    // Free shipping threshold over $45.000 CLP if standard shipping selected
    if (cart.subtotal >= 45000 && cart.shipping_option?.id === "so_standard") {
      cart.shipping_total = 0;
    } else {
      cart.shipping_total = cart.shipping_option ? cart.shipping_option.price : 0;
    }

    // 19% IVA included or calculated
    const taxableSubtotal = cart.subtotal - cart.discount_total;
    cart.tax_total = Math.round((taxableSubtotal / 1.19) * 0.19);
    cart.total = Math.max(0, taxableSubtotal + cart.shipping_total);
  }

  // ==========================================================================
  // STORE API: CHECKOUT & ORDER COMPLETION
  // ==========================================================================

  public async completeCartOrder(
    cartId: string,
    paymentProvider: string = "webpay"
  ): Promise<Order> {
    // TODO: [DATABASE] Wrap this entire order placement logic in a PostgreSQL atomic transaction (BEGIN ... COMMIT).
    // TODO: [CONCURRENCY] Use 'SELECT ... FOR UPDATE' row-locking on variant stock rows to prevent race-condition overselling.
    // TODO: [PAYMENTS] Verify payment authorization with paymentProvider (Transbank Webpay / Mercado Pago / Stripe) before committing order.
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error("Cart not found.");

    if (cart.items.length === 0) {
      throw new Error("Cannot place an order with an empty cart.");
    }

    if (!cart.shipping_address || !cart.email) {
      throw new Error("Shipping address and email are required to complete order.");
    }

    // 1. Re-validate inventory and decrement stock
    for (const item of cart.items) {
      for (const prod of this.products) {
        const variant = prod.variants.find((v) => v.id === item.variant_id);
        if (variant && variant.manage_inventory) {
          if (variant.inventory_quantity < item.quantity) {
            throw new Error(
              `Stock agotado para ${variant.title} durante el checkout. Por favor actualiza tu carrito.`
            );
          }
          variant.inventory_quantity -= item.quantity;
          if (variant.inventory_quantity === 0) {
            variant.status = "out_of_stock";
          } else if (variant.inventory_quantity < 5) {
            variant.status = "low_stock";
          }
        }
      }
    }

    // 2. Generate placed Order
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `order_${Date.now()}`;
    const displayId = `KIN-${randomNum}`;
    const isoNow = new Date().toISOString();

    const order: Order = {
      id: orderId,
      display_id: displayId,
      cart_id: cart.id,
      email: cart.email,
      status: "paid",
      fulfillment_status: "not_fulfilled",
      payment_status: "captured",
      shipping_address: cart.shipping_address,
      shipping_option: cart.shipping_option || this.shippingOptions[0],
      items: [...cart.items],
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      shipping_total: cart.shipping_total,
      tax_total: cart.tax_total,
      total: cart.total,
      currency_code: cart.currency_code,
      payment_provider: paymentProvider,
      created_at: isoNow,
      updated_at: isoNow,
    };

    this.orders.push(order);

    // Clean cart
    this.carts.delete(cartId);

    return order;
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    return (
      this.orders.find((o) => o.id === orderId || o.display_id === orderId) || null
    );
  }

  public async getAllOrders(): Promise<Order[]> {
    return [...this.orders].reverse();
  }

  // ==========================================================================
  // ADMIN API: INVENTORY & CATALOG MUTATORS
  // ==========================================================================

  public async updateVariantInventory(
    variantId: string,
    newQuantity: number
  ): Promise<ProductVariant | null> {
    for (const prod of this.products) {
      const v = prod.variants.find((variant) => variant.id === variantId);
      if (v) {
        v.inventory_quantity = Math.max(0, newQuantity);
        if (v.inventory_quantity === 0) {
          v.status = "out_of_stock";
        } else if (v.inventory_quantity < 5) {
          v.status = "low_stock";
        } else {
          v.status = "in_stock";
        }
        return v;
      }
    }
    return null;
  }

  public async updateOrderStatus(
    orderId: string,
    status: Order["status"],
    fulfillmentStatus?: Order["fulfillment_status"]
  ): Promise<Order | null> {
    const order = this.orders.find((o) => o.id === orderId || o.display_id === orderId);
    if (!order) return null;

    order.status = status;
    if (fulfillmentStatus) {
      order.fulfillment_status = fulfillmentStatus;
    }
    order.updated_at = new Date().toISOString();
    return order;
  }
}

export const ecommerceServiceInstance = new EcommerceService();
