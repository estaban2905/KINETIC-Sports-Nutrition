import Medusa from "@medusajs/js-sdk";
import { HttpTypes } from "@medusajs/types";
import { NutritionFact, Product, ProductFlavor, ProductSize } from "../types";

export const medusa = new Medusa({
  baseUrl: import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY,
});

let cachedChileRegion: HttpTypes.StoreRegion | null = null;

/**
 * The storefront only sells in Chile today, so every cart is created
 * against the single "Chile" (clp) region seeded by
 * apps/backend/src/scripts/seed-chile.ts.
 */
export async function getChileRegion(): Promise<HttpTypes.StoreRegion> {
  if (cachedChileRegion) return cachedChileRegion;

  const { regions } = await medusa.store.region.list({ limit: 100 });
  const region = regions.find((r) => r.currency_code === "clp") ?? regions[0];
  if (!region) {
    throw new Error(
      "No hay ninguna región configurada en el backend de Medusa. Corre `npx medusa exec ./src/scripts/seed-chile.ts` en apps/backend."
    );
  }
  cachedChileRegion = region;
  return region;
}

function variantTitleFor(flavor?: ProductFlavor, size?: ProductSize): string {
  return [flavor?.name, size?.name].filter(Boolean).join(" / ") || "Único";
}

/**
 * Resolves the real Medusa variant_id for a product/flavor/size combination
 * from the storefront's static catalog (src/data/products.ts). Requires the
 * product to have been seeded in Medusa with a matching `handle` (=
 * Product.id) and a variant `title` built the same way — see
 * apps/backend/src/scripts/seed-kinetic-products.ts.
 */
export async function resolveVariantId(
  product: Product,
  flavor?: ProductFlavor,
  size?: ProductSize
): Promise<string> {
  const { products } = await medusa.store.product.list({
    handle: product.id,
    fields: "id,handle,*variants",
  });
  const medusaProduct = products[0];
  if (!medusaProduct) {
    throw new Error(
      `El producto "${product.id}" no existe en el backend de Medusa. Corre \`npx medusa exec ./src/scripts/seed-kinetic-products.ts\` en apps/backend.`
    );
  }

  const expectedTitle = variantTitleFor(flavor, size);
  const variant = medusaProduct.variants?.find((v) => v.title === expectedTitle);
  if (!variant) {
    throw new Error(
      `No se encontró la variante "${expectedTitle}" para "${product.id}" en Medusa.`
    );
  }
  return variant.id;
}

export interface OrderLookupResult {
  id: string;
  display_id: number;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  created_at: string;
  total: number;
  currency_code: string;
  fulfillments: {
    id: string;
    shipped_at: string | null;
    delivered_at: string | null;
    labels?: { tracking_number: string; tracking_url: string | null }[];
  }[];
}

/**
 * No customer-account system exists yet, so order tracking works without
 * login: the customer proves ownership with order number + email, and the
 * backend only returns status/tracking, never addresses or line items.
 */
export async function lookupOrder(
  displayId: string,
  email: string
): Promise<OrderLookupResult> {
  const { order } = await medusa.client.fetch<{ order: OrderLookupResult }>(
    "/store/order-lookup",
    {
      method: "POST",
      body: { display_id: displayId, email },
    }
  );
  return order;
}

// Cosmetic swatch assigned by position within a product's flavor list — Medusa
// option values don't carry a color, and it isn't worth a CMS field for it.
const FLAVOR_PALETTE: { color: string; accentHex: string }[] = [
  { color: "bg-red-600", accentHex: "#dc2626" },
  { color: "bg-amber-100", accentHex: "#f59e0b" },
  { color: "bg-neutral-800", accentHex: "#3b82f6" },
  { color: "bg-rose-600", accentHex: "#e11d48" },
  { color: "bg-cyan-900", accentHex: "#06b6d4" },
  { color: "bg-lime-900", accentHex: "#84cc16" },
  { color: "bg-amber-900", accentHex: "#b45309" },
  { color: "bg-neutral-900", accentHex: "#404040" },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type MedusaCatalogOptionValue = {
  value: string;
  option_id?: string | null;
  option?: { title?: string | null } | null;
};

type MedusaCatalogVariant = {
  id: string;
  metadata?: Record<string, unknown> | null;
  options?: MedusaCatalogOptionValue[] | null;
  calculated_price?: { calculated_amount?: number | null } | null;
};

type MedusaCatalogOption = {
  title: string;
  values?: { value: string }[] | null;
};

type MedusaCatalogProduct = {
  id: string;
  handle?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
  categories?: { name: string }[] | null;
  options?: MedusaCatalogOption[] | null;
  variants?: MedusaCatalogVariant[] | null;
  product_content?: {
    badge?: string | null;
    rating?: number | null;
    features?: string[] | null;
    nutrition_facts?: NutritionFact[] | null;
  } | null;
};

/**
 * Translates a Medusa store product (native fields + our `product_content`
 * link, see apps/backend/src/modules/product-content) into the storefront's
 * `Product` shape, so UI components don't need to know the data came from
 * Medusa instead of the old static apps/storefront/src/data/products.ts.
 */
export function mapMedusaProductToProduct(p: MedusaCatalogProduct): Product {
  const variants = p.variants ?? [];

  // A variant per option value, to read price/metadata from — order comes
  // from p.options[].values (creation order), not from variant iteration
  // order, which doesn't correspond to any meaningful size/flavor sequence.
  const variantByOptionValue = new Map<string, MedusaCatalogVariant>();
  for (const variant of variants) {
    for (const opt of variant.options ?? []) {
      if (!variantByOptionValue.has(opt.value)) {
        variantByOptionValue.set(opt.value, variant);
      }
    }
  }

  const flavorOption = p.options?.find((o) => o.title === "Sabor");
  const sizeOption = p.options?.find((o) => o.title === "Tamaño");

  const flavors: ProductFlavor[] = (flavorOption?.values ?? []).map(({ value: name }, idx) => ({
    id: slugify(name),
    name,
    ...FLAVOR_PALETTE[idx % FLAVOR_PALETTE.length],
  }));

  const sizeNames = sizeOption?.values?.map((v) => v.value) ?? [];
  const sizes: ProductSize[] | undefined = sizeNames.length
    ? sizeNames.map((name) => {
        const variant = variantByOptionValue.get(name);
        const meta = (variant?.metadata ?? {}) as Record<string, unknown>;
        const price = variant?.calculated_price?.calculated_amount ?? 0;
        return {
          id: slugify(name),
          name,
          weight: typeof meta.weight === "string" ? meta.weight : name,
          servings: typeof meta.servings === "number" ? meta.servings : 0,
          price,
          originalPrice:
            typeof meta.original_price === "number" ? meta.original_price : price,
        };
      })
    : undefined;

  const fallbackPrice = variants[0]?.calculated_price?.calculated_amount ?? 0;
  const price = sizes?.[0]?.price ?? fallbackPrice;
  const productMeta = (p.metadata ?? {}) as Record<string, unknown>;
  const content = p.product_content ?? null;

  return {
    id: p.handle ?? p.id,
    name: p.title,
    subtitle: p.subtitle ?? "",
    category: p.categories?.[0]?.name ?? "Suplementos",
    description: p.description ?? "",
    longDescription: p.description ?? "",
    price,
    originalPrice:
      typeof productMeta.original_price === "number" ? productMeta.original_price : undefined,
    badge: content?.badge ?? undefined,
    rating: content?.rating ?? 5,
    image: p.thumbnail ?? "",
    flavors: flavors.length ? flavors : undefined,
    sizes,
    features: content?.features ?? [],
    nutritionFacts: content?.nutrition_facts ?? undefined,
  };
}

const CATALOG_FIELDS =
  "id,handle,title,subtitle,description,thumbnail,metadata,*categories,options.id,options.title,options.values.value,*variants,*variants.options,*variants.calculated_price,+product_content.*";

/**
 * Fetches the full published catalog from Medusa (real products + our
 * product_content link) mapped to the storefront's `Product` shape. Falls
 * back to the caller providing a static catalog if this throws (e.g. backend
 * down) — see LandingPage.tsx.
 */
export async function getProductCatalog(): Promise<Product[]> {
  const region = await getChileRegion();
  const { products } = await medusa.store.product.list({
    region_id: region.id,
    limit: 100,
    fields: CATALOG_FIELDS,
  });
  // Excludes the Medusa starter's demo products (Shorts/T-Shirt/...) that ship
  // in a fresh dev database alongside the real catalog seeded by
  // apps/backend/src/scripts/seed-kinetic-products.ts, which always prefixes
  // its handles with "kinetic-".
  return (products as unknown as MedusaCatalogProduct[])
    .filter((p) => p.handle?.startsWith("kinetic-"))
    .map(mapMedusaProductToProduct);
}
