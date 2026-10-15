import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { customerOrdersFilter, parsePagination, requireCustomerId } from "../../../../../lib/customer-auth"
import { buildOrderSummary, ORDER_SUMMARY_FIELDS } from "../../../../../lib/order-summary"

/**
 * Historial de pedidos del cliente que inició sesión. Protegido por
 * authenticate("customer", ...) en middlewares.ts; el cliente sale del token,
 * nunca de un parámetro.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = requireCustomerId(req)
  const { take, skip } = parsePagination(req.query as Record<string, unknown>)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: [
      ...ORDER_SUMMARY_FIELDS,
      "items.id",
      "items.product_title",
      "items.variant_title",
      "items.quantity",
      "items.unit_price",
      "items.thumbnail",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.city",
      "shipping_address.province",
    ],
    filters: customerOrdersFilter(customerId) as any,
    pagination: { take, skip, order: { created_at: "DESC" } },
  })

  res.json({
    orders: (orders as any[]).map((order) => ({
      ...buildOrderSummary(order),
      items: (order.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.product_title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        thumbnail: item.thumbnail,
      })),
      shipping_address: order.shipping_address
        ? {
            address_1: order.shipping_address.address_1,
            address_2: order.shipping_address.address_2,
            city: order.shipping_address.city,
            province: order.shipping_address.province,
          }
        : null,
    })),
    count: metadata?.count ?? 0,
    limit: take,
    offset: skip,
  })
}
