import type { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
  getVariantAvailability,
} from "@medusajs/framework/utils"
import {
  completeCartWorkflow,
  createCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { sealChargeToken } from "./charge-token"
import { oneclickUsername } from "./oneclick"
import { discountedUnitPrice } from "./subscription-billing"
import { activateAndCharge, runSubscriptionCycle, type CycleDeps, type PlaceOrderInput } from "./subscription-cycle"
import { Sentry } from "./sentry"

/**
 * Lado Medusa de un ciclo de suscripción: arma el pedido de la renovación con el
 * mismo camino que usa el checkout (carrito -> sesión de pago -> completar), de
 * modo que impuestos, inventario, boleta y correos se comportan igual que en una
 * compra normal. Lo que cambia respecto del checkout:
 *  - el precio sale de la variante vigente menos el descuento de la suscripción,
 *  - el envío es gratis (Chilexpress igual despacha; el costo lo asume la tienda),
 *  - el pago es el proveedor `oneclick`, que cobra la tarjeta inscrita al autorizar.
 */

export const ONECLICK_PROVIDER_ID = "pp_oneclick_oneclick"
const CHILEXPRESS_PROVIDER_ID = "chilexpress_chilexpress"

type Address = Record<string, string | undefined>

async function firstOrThrow<T>(rows: T[] | undefined, what: string): Promise<T> {
  if (!rows?.[0]) throw new Error(`Suscripción: no se encontró ${what}.`)
  return rows[0]
}

/** Región, canal de venta y opción de envío con los que se arman las renovaciones. */
async function loadSalesContext(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { currency_code: "clp" },
  })
  const region = await firstOrThrow(regions as any[], "la región de Chile (CLP)")

  const { data: stores } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
  const salesChannelId = (stores[0] as any)?.default_sales_channel_id as string | undefined
  if (!salesChannelId) throw new Error("Suscripción: la tienda no tiene canal de venta por defecto.")

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "provider_id"],
    filters: { provider_id: CHILEXPRESS_PROVIDER_ID },
  })
  const shippingOption = await firstOrThrow(options as any[], "la opción de envío Chilexpress")

  return { regionId: region.id as string, salesChannelId, shippingOption: shippingOption as { id: string; name: string } }
}

/** Precio de lista vigente de la variante en la región, en pesos. */
async function listPriceOf(container: MedusaContainer, variantId: string, regionId: string): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "calculated_price.*"],
    filters: { id: variantId },
    context: { calculated_price: QueryContext({ region_id: regionId, currency_code: "clp" }) },
  })
  const amount = (data[0] as any)?.calculated_price?.calculated_amount
  if (typeof amount !== "number") throw new Error(`Suscripción: la variante ${variantId} no tiene precio en CLP.`)
  return amount
}

export async function variantHasStock(
  container: MedusaContainer,
  input: { variantId: string; quantity: number }
): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { salesChannelId } = await loadSalesContext(container)
  const result = await getVariantAvailability(query, {
    variant_ids: [input.variantId],
    sales_channel_id: salesChannelId,
  })
  const availability = result[input.variantId]?.availability
  // null: la variante no controla inventario, siempre se puede vender.
  if (availability === null) return true
  if (availability === undefined) return false
  return availability >= input.quantity
}

/**
 * Crea el pedido de la renovación y lo cobra. Lanza si no se pudo; quien llama
 * decide qué hacer según lo que haya anotado el proveedor de pago (ver
 * lib/subscription-cycle.ts).
 */
export async function placeSubscriptionOrder(
  container: MedusaContainer,
  input: PlaceOrderInput & { giftVariantId?: string | null }
): Promise<{ orderId: string; total: number }> {
  const { subscription: sub } = input
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const cartModule = container.resolve(Modules.CART)
  const subscriptions = container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)

  const customer = await customerModule.retrieveCustomer(sub.customer_id)
  const stored = await subscriptions.retrieveSubscription(sub.id)
  const address = (stored as unknown as { shipping_address?: Address }).shipping_address
  if (!address) throw new Error("Suscripción: no tiene dirección de despacho.")

  const ctx = await loadSalesContext(container)
  const listPrice = await listPriceOf(container, sub.variant_id, ctx.regionId)
  const unitPrice = discountedUnitPrice(listPrice, sub.discount_percent)

  const items: Array<Record<string, unknown>> = [
    { variant_id: sub.variant_id, quantity: sub.quantity, unit_price: unitPrice, is_tax_inclusive: true },
  ]
  if (input.includeGift && input.giftVariantId) {
    items.push({ variant_id: input.giftVariantId, quantity: 1, unit_price: 0, is_tax_inclusive: true })
  }

  const { result: created } = await createCartWorkflow(container).run({
    input: {
      region_id: ctx.regionId,
      currency_code: "clp",
      sales_channel_id: ctx.salesChannelId,
      customer_id: sub.customer_id,
      email: customer.email,
      shipping_address: { ...address, country_code: "cl" } as any,
      items: items as any,
      metadata: { subscription_id: sub.id, subscription_cycle_id: input.cycleId, subscription_period: input.periodKey },
    },
  })
  const cartId = (created as { id: string }).id

  // Envío gratis: se agrega el método con monto 0 directamente (el workflow de
  // checkout cotizaría Chilexpress y cobraría el flete).
  await cartModule.addShippingMethods(cartId, [
    {
      name: ctx.shippingOption.name,
      shipping_option_id: ctx.shippingOption.id,
      amount: 0,
      is_tax_inclusive: true,
      data: {},
    } as any,
  ])

  const { data: carts } = await query.graph({ entity: "cart", fields: ["id", "total"], filters: { id: cartId } })
  const total = Math.round(Number((carts[0] as any)?.total))
  if (!Number.isFinite(total) || total <= 0) throw new Error(`Suscripción: total de carrito inválido (${total}).`)

  const { result: collection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cartId },
  })
  const collectionId = (collection as unknown as { id: string }).id

  await createPaymentSessionsWorkflow(container).run({
    input: {
      payment_collection_id: collectionId,
      provider_id: ONECLICK_PROVIDER_ID,
      data: {
        charge_token: sealChargeToken({
          subscriptionId: sub.id,
          cycleId: input.cycleId,
          username: oneclickUsername(sub.customer_id),
          tbkUser: stored.payment_token_ref as string,
          parentBuyOrder: input.parentBuyOrder,
          childBuyOrder: input.childBuyOrder,
          amount: total,
        }),
      },
    },
  })

  // Aquí ocurre el cargo (authorizePayment del proveedor oneclick).
  const { result } = await completeCartWorkflow(container).run({ input: { id: cartId }, throwOnError: true })
  const orderId = (result as unknown as { id: string }).id

  // Ciclo <-> pedido, para soporte y conciliación. No es crítico: el pedido ya existe.
  try {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    await link.create({
      [SUBSCRIPTION_MODULE]: { subscription_cycle_id: input.cycleId },
      [Modules.ORDER]: { order_id: orderId },
    })
  } catch (err) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`[subscription] no se pudo enlazar el ciclo ${input.cycleId} con el pedido ${orderId}: ${err}`)
  }

  return { orderId, total }
}

/** Dependencias reales del ciclo, sobre el contenedor de Medusa. */
export function buildCycleDeps(container: MedusaContainer): CycleDeps {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const giftVariantId = process.env.SUBSCRIPTION_GIFT_VARIANT_ID?.trim() || null
  return {
    subscriptions: container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE) as any,
    hasStock: (i) => variantHasStock(container, i),
    placeOrder: (i) => placeSubscriptionOrder(container, { ...i, giftVariantId }),
    giftVariantId,
    logger,
    report: (err, extra) => Sentry.captureException(err, { extra }),
  }
}

export { runSubscriptionCycle, activateAndCharge }
