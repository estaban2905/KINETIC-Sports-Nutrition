import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ModuleRegistrationName,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * pp_system_default (Medusa's manual/no-op provider) always authorizes — it
 * exists only so checkout can be exercised without real payment credentials
 * in development. Publishing it in a production region lets a customer
 * complete an order without paying, so it's never seeded outside
 * development. See CartDrawer's ALLOWED_PAYMENT_PROVIDER_IDS for the
 * matching client-side guard.
 */
export function getDesiredPaymentProviders(
  nodeEnv: string | undefined,
  registeredIds: Set<string>
): string[] {
  const desired = [
    ...(nodeEnv !== "production" ? ["pp_system_default"] : []),
    "pp_webpay_webpay",
    "pp_mercadopago_mercadopago",
    "pp_stripe_stripe",
  ]
  return desired.filter((id) => registeredIds.has(id))
}

/**
 * Seeds a Chile region (CLP) on top of the stock Medusa demo seed, which only
 * ships a Europe/EUR region. Run once with:
 *   npx medusa exec ./src/scripts/seed-chile.ts
 */
export default async function seedChile({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name"],
  })
  if (existingRegions.some((r) => r.name === "Chile")) {
    logger.info("Chile region already seeded, skipping.")
    return
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  })
  const store = stores[0]

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const defaultSalesChannel = salesChannels[0]

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]

  logger.info("Adding CLP currency to the store...")
  const existingCurrencies = (store.supported_currencies ?? []).filter(
    (c): c is NonNullable<typeof c> => !!c
  )
  const hasClp = existingCurrencies.some((c) => c.currency_code === "clp")
  if (!hasClp) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            ...existingCurrencies.map((c) => ({
              currency_code: c.currency_code,
              is_default: !!c.is_default,
            })),
            { currency_code: "clp", is_default: false },
          ],
        },
      },
    })
  }

  // Only Webpay always registers (fallback integration credentials); Stripe
  // and MercadoPago only register once STRIPE_SECRET_KEY / MERCADOPAGO_ACCESS_TOKEN
  // are set (see medusa-config.ts), so only include the ones actually running.
  const { data: registeredPaymentProviders } = await query.graph({
    entity: "payment_provider",
    fields: ["id"],
  })
  const registeredIds = new Set(registeredPaymentProviders.map((p) => p.id))
  const paymentProviders = getDesiredPaymentProviders(process.env.NODE_ENV, registeredIds)

  logger.info(`Seeding Chile region with payment providers: ${paymentProviders.join(", ")}`)
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Chile",
          currency_code: "clp",
          countries: ["cl"],
          payment_providers: paymentProviders,
        },
      ],
    },
  })
  const region = regionResult[0]

  logger.info("Seeding Chile tax region...")
  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "cl", provider_id: "tp_system" }],
  })

  logger.info("Seeding Chile stock location...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Bodega Santiago",
          address: {
            city: "Santiago",
            country_code: "CL",
            address_1: "",
          },
        },
      ],
    },
  })
  const stockLocation = stockLocationResult[0]

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "chilexpress_chilexpress",
    },
  })

  logger.info("Seeding Chile fulfillment set...")
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Bodega Santiago delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Chile",
        geo_zones: [{ country_code: "cl", type: "country" }],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  logger.info("Seeding Chile shipping options...")
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Envío Estándar",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Estándar",
          description: "Entrega en 2-4 días hábiles.",
          code: "standard",
        },
        prices: [{ currency_code: "clp", amount: 3990 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Chilexpress",
        // "calculated" invokes ChilexpressFulfillmentProviderService.calculatePrice
        // per cart (real quote once CHILEXPRESS_API_KEY is set, flat fallback otherwise).
        price_type: "calculated",
        provider_id: "chilexpress_chilexpress",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Chilexpress",
          description: "Cotizado en tiempo real por Chilexpress.",
          code: "chilexpress",
        },
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  })

  logger.info(`Chile region seeded (region_id: ${region.id}).`)
}
