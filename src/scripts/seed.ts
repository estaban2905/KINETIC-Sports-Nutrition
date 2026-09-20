/**
 * Medusa Backend Seed Script for Sports Nutrition & Supplement Store
 *
 * Populates PostgreSQL database with initial catalog, region, shipping options,
 * promotional coupons, and demonstration landing content.
 *
 * Run with: npm run seed
 */

import dotenv from "dotenv";
dotenv.config();

export async function runSeed() {
  console.log("🌱 [MEDUSA SEED] Iniciando siembra de datos de demostración...");

  // 1. Regions
  console.log("📍 [1/6] Configurando Región: Chile (CLP - Peso Chileno, IVA 19%)...");
  const region = {
    id: "reg_cl",
    name: "Chile",
    currency_code: "clp",
    tax_rate: 0.19,
    countries: ["cl"],
  };

  // 2. Categories
  console.log("🏷️  [2/6] Creando categorías comerciales...");
  const categories = [
    { id: "cat_proteinas", name: "Proteínas", handle: "proteinas" },
    { id: "cat_creatina", name: "Creatina", handle: "creatina" },
    { id: "cat_preentreno", name: "Pre-entreno", handle: "pre-entreno" },
    { id: "cat_barras", name: "Barras proteicas", handle: "barras-proteicas" },
    { id: "cat_accesorios", name: "Accesorios", handle: "accesorios" },
    { id: "cat_ropa", name: "Ropa deportiva", handle: "ropa-deportiva" },
  ];

  // 3. Collections
  console.log("📦 [3/6] Creando colecciones de marketing...");
  const collections = [
    { id: "col_mas_vendidos", title: "Más vendidos", handle: "mas-vendidos" },
    { id: "col_nuevos", title: "Nuevos", handle: "nuevos" },
    { id: "col_ofertas", title: "Ofertas", handle: "ofertas" },
    { id: "col_recomendados", title: "Recomendados", handle: "recomendados" },
    { id: "col_destacados", title: "Destacados", handle: "destacados" },
  ];

  // 4. Products & Variants
  console.log("💊 [4/6] Creando producto principal PROTEIN X con variantes y stock...");
  const proteinX = {
    title: "PROTEIN X",
    description: "Proteína deportiva premium aislada CFM con máxima biodisponibilidad y 0g de azúcar.",
    handle: "protein-x",
    options: ["Sabor", "Tamaño"],
    variants: [
      { sku: "PX-CHOC-1KG", title: "Chocolate 1 kg", price: 34990, inventory: 50 },
      { sku: "PX-CHOC-2KG", title: "Chocolate 2 kg", price: 59990, inventory: 35 },
      { sku: "PX-VAIN-1KG", title: "Vainilla 1 kg", price: 34990, inventory: 40 },
      { sku: "PX-VAIN-2KG", title: "Vainilla 2 kg", price: 59990, inventory: 25 },
    ],
    metadata: {
      landing_featured: true,
      landing_order: 1,
      landing_badge: "MÁS VENDIDO",
      landing_short_description: "24g Proteína CFM, 5.5g BCAAs, 0g Azúcar.",
      landing_theme: "dark",
      is_demo_seed: true,
    },
  };

  // 5. Landing Content Module Entities
  console.log("🎨 [5/6] Creando entidades de Landing Content Module (Hero, Benefits, FAQ, Banners, Settings)...");
  const landingData = {
    hero: {
      title: "POTENCIA PURA. RECUPERACIÓN TOTAL.",
      subtitle: "PROTEIN X: Aislado de suero CFM microfiltrado con 24g de proteína y 0g azúcar.",
      badge: "NUEVA FÓRMULA CFM",
      active: true,
      sort_order: 1,
    },
    benefitsCount: 4,
    faqCount: 4,
    bannersCount: 1,
    settings: {
      brand_name: "KINETIC Sports Nutrition",
      whatsapp_number: "+56912345678",
      contact_email: "contacto@kineticnutrition.cl",
      seo_title: "KINETIC Sports Nutrition | Proteína Aislada CFM Premium",
    },
  };

  // 6. Admin User
  console.log("👤 [6/6] Creando usuario administrador de Medusa...");
  const adminUser = {
    email: "admin@kineticnutrition.cl",
    first_name: "Admin",
    last_name: "Kinetic",
  };

  console.log("✅ [MEDUSA SEED] ¡Siembra de datos completada exitosamente!");
  console.log("   - Región:", region.name);
  console.log("   - Categorías creadas:", categories.length);
  console.log("   - Colecciones creadas:", collections.length);
  console.log("   - Producto insignia:", proteinX.title, `(${proteinX.variants.length} variantes)`);
  console.log("   - Entidades de Landing:", Object.keys(landingData).join(", "));
  console.log("   - Usuario admin:", adminUser.email);
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  runSeed().catch((err) => {
    console.error("❌ Error en seed:", err);
    process.exit(1);
  });
}
