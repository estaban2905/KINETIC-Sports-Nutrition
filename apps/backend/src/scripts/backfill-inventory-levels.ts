import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"

const DEFAULT_STOCK = 1000

/**
 * One-off backfill: "Create Fulfillment" in the admin fails with
 * "Inventory level for item ... and location ... not found" when a product's
 * inventory item has no stock level at the warehouse we ship from
 * ("Bodega Ovalle"). seed-kinetic-products.ts looked the warehouse up by its
 * old name ("Bodega Santiago") and fell back to the first location it found,
 * so the levels ended up somewhere else. This adds the missing levels at
 * Bodega Ovalle and leaves items that already have one untouched, so it is
 * safe to run more than once:
 *   npx medusa exec ./src/scripts/backfill-inventory-levels.ts
 */
export default async function backfillInventoryLevels({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const ovalle = locations.find((l) => l.name === "Bodega Ovalle")
  if (!ovalle) {
    logger.warn('[backfill-inventory-levels] No existe la bodega "Bodega Ovalle" — nada que hacer.')
    return
  }

  const { data: items } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.location_id"],
  })
  const missing = items.filter(
    (item) => !item.location_levels?.some((l) => l?.location_id === ovalle.id)
  )

  if (!missing.length) {
    logger.info("[backfill-inventory-levels] Todos los productos ya tienen inventario en Bodega Ovalle.")
    return
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: missing.map((item) => ({
        location_id: ovalle.id,
        stocked_quantity: DEFAULT_STOCK,
        inventory_item_id: item.id,
      })),
    },
  })

  logger.info(
    `[backfill-inventory-levels] Creado inventario (${DEFAULT_STOCK} u.) en Bodega Ovalle para ${missing.length} producto(s): ` +
      missing.map((i) => i.sku ?? i.id).join(", ")
  )
}
