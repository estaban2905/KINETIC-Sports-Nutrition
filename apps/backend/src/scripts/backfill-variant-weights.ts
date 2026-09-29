import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { IProductModuleService } from "@medusajs/framework/types"

function parseWeightGrams(label: string): number | undefined {
  const match = label.match(/\(([\d.]+)\s*(G|KG)\)/i)
  if (!match) return undefined
  const value = parseFloat(match[1])
  return match[2].toUpperCase() === "KG" ? Math.round(value * 1000) : Math.round(value)
}

/**
 * One-off backfill for variants created before seed-kinetic-products.ts
 * started writing `weight` on the variant itself: their real weight was
 * only ever stored as a display string in metadata.weight (e.g.
 * "5 LB (2.27 KG)"), so fulfillment-chilexpress/service.ts has been quoting
 * every one of them with the 500g fallback. This reads that already-seeded
 * label back out and writes the real grams to Medusa's native
 * variant.weight field. Run once with:
 *   npx medusa exec ./src/scripts/backfill-variant-weights.ts
 */
export default async function backfillVariantWeights({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "weight", "metadata"],
  })

  let updated = 0
  for (const variant of variants) {
    const label = (variant.metadata as Record<string, unknown> | null)?.weight
    if (typeof label !== "string") continue

    const grams = parseWeightGrams(label)
    if (!grams) {
      logger.warn(`[backfill-variant-weights] No se pudo parsear "${label}" (SKU ${variant.sku}).`)
      continue
    }
    if (variant.weight === grams) continue

    await productModuleService.updateProductVariants(variant.id, { weight: grams })
    logger.info(`[backfill-variant-weights] SKU ${variant.sku}: weight → ${grams}g`)
    updated++
  }

  logger.info(`[backfill-variant-weights] Listo. ${updated} variante(s) actualizadas.`)
}
