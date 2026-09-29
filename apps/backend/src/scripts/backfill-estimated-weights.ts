import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { IProductModuleService } from "@medusajs/framework/types"

/**
 * The 6 products below have no measured weight anywhere (unlike Gold
 * Standard Whey, backfilled from its real per-size label in
 * backfill-variant-weights.ts) — these are category-typical estimates, not
 * measurements. Keep this in sync with `estimatedWeightGrams` in
 * seed-kinetic-products.ts. Replace with real measured weight per product
 * as soon as it's available; until then this at least differentiates a
 * shaker from a t-shirt instead of quoting every one of them at 500g.
 */
const ESTIMATED_WEIGHTS_BY_HANDLE: Record<string, number> = {
  "kinetic-creatine-pure": 380,
  "kinetic-preworkout-surge": 320,
  "kinetic-shaker-steel": 400,
  "kinetic-protein-bars": 600,
  "kinetic-lifting-straps": 180,
  "kinetic-performance-tee": 180,
}

/**
 * One-off backfill for the products that never had any weight data (not
 * even a display label) — writes the category estimate to variant.weight
 * and flags metadata.weight_estimated = true so it's never mistaken for a
 * real measured spec. Run once with:
 *   npx medusa exec ./src/scripts/backfill-estimated-weights.ts
 */
export default async function backfillEstimatedWeights({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku", "variants.weight", "variants.metadata"],
    filters: { handle: Object.keys(ESTIMATED_WEIGHTS_BY_HANDLE) },
  })

  let updated = 0
  for (const product of products) {
    const grams = ESTIMATED_WEIGHTS_BY_HANDLE[product.handle!]
    for (const variant of product.variants ?? []) {
      if (variant.weight === grams) continue

      await productModuleService.updateProductVariants(variant.id, {
        weight: grams,
        metadata: { ...(variant.metadata ?? {}), weight_estimated: true },
      })
      logger.info(`[backfill-estimated-weights] SKU ${variant.sku}: weight → ${grams}g (estimado)`)
      updated++
    }
  }

  logger.info(`[backfill-estimated-weights] Listo. ${updated} variante(s) actualizadas.`)
}
