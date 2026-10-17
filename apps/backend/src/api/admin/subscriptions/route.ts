import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import type SubscriptionModuleService from "../../../modules/subscription/service"
import { SUBSCRIPTION_STATUSES } from "../../../lib/subscription-state"
import { serializeAdminSubscription } from "../../../lib/subscription-actions"

const MAX_LIMIT = 100

/**
 * Listado de suscripciones para soporte. Filtros: ?status=past_due, ?limit y
 * ?offset. Lo más urgente primero: por próximo cobro.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const subscriptions = req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)
  const q = req.query as Record<string, string | undefined>

  const limit = Math.min(Math.max(parseInt(q.limit ?? "50", 10) || 50, 1), MAX_LIMIT)
  const offset = Math.max(parseInt(q.offset ?? "0", 10) || 0, 0)
  const filter: Record<string, unknown> = {}
  if (q.status && (SUBSCRIPTION_STATUSES as readonly string[]).includes(q.status)) filter.status = q.status

  const [rows, count] = await subscriptions.listAndCountSubscriptions(filter, {
    take: limit,
    skip: offset,
    order: { next_billing_date: "ASC", created_at: "DESC" },
  })

  // Los correos se piden en una sola consulta; si falla, el listado igual sale.
  const emails = new Map<string, string>()
  try {
    const ids = [...new Set(rows.map((r: any) => r.customer_id))]
    if (ids.length) {
      const customers = await req.scope.resolve(Modules.CUSTOMER).listCustomers({ id: ids }, { select: ["id", "email"] })
      for (const c of customers) emails.set(c.id, c.email)
    }
  } catch (err) {
    req.scope
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`[admin/subscriptions] no se pudieron leer los correos: ${err instanceof Error ? err.message : err}`)
  }

  res.json({
    subscriptions: rows.map((r: any) => serializeAdminSubscription(r, emails.get(r.customer_id))),
    count,
    limit,
    offset,
  })
}
