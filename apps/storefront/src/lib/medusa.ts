import Medusa from "@medusajs/js-sdk";
import { HttpTypes } from "@medusajs/types";
import { Product, ProductFlavor, ProductSize } from "../types";

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
