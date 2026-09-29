import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { IStockLocationService } from "@medusajs/framework/types"

/**
 * One-off backfill: the stock location was seeded as "Bodega Santiago" /
 * city "Santiago" (see seed-chile.ts), but the address actually sent to
 * Chilexpress as the shipment origin (CHILEXPRESS_ORIGIN_CODE=OVAL,
 * CHILEXPRESS_ORIGIN_STREET/STREET_NUMBER in .env) is Francisco Encina 2212,
 * Ovalle — verified against Chilexpress's "Consultar Calles" API. The
 * storefront's shipping-route label (CartDrawer.tsx) reads the stock
 * location's city, so the mismatch showed "Santiago" as origin for a route
 * Chilexpress was actually quoting from Ovalle. Run once with:
 *   npx medusa exec ./src/scripts/backfill-stock-location-address.ts
 */
export default async function backfillStockLocationAddress({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const stockLocationModuleService: IStockLocationService = container.resolve(
    Modules.STOCK_LOCATION
  )

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.id", "address.city"],
  })

  const target = locations.find((l) => l.name === "Bodega Santiago")
  if (!target) {
    logger.info(
      '[backfill-stock-location-address] No se encontró "Bodega Santiago" — nada que actualizar (ya corregido o nombre distinto).'
    )
    return
  }

  await stockLocationModuleService.updateStockLocations(target.id, {
    name: "Bodega Ovalle",
    address: {
      city: "Ovalle",
      country_code: "CL",
      address_1: "Francisco Encina 2212",
    },
  })

  logger.info(
    `[backfill-stock-location-address] "${target.name}" (${target.id}) → "Bodega Ovalle", Francisco Encina 2212, Ovalle.`
  )
}
