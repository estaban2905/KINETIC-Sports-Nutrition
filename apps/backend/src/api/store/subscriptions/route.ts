import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createSubscription } from "../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf, presentSubscriptions } from "./helpers"

/** Las suscripciones del cliente, la más reciente primero. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = customerIdOf(req)
  const deps = buildActionDeps(req)
  const rows = await deps.subscriptions.listSubscriptions(
    { customer_id: customerId },
    { order: { created_at: "DESC" } }
  )
  res.json({ subscriptions: await presentSubscriptions(req, rows) })
}

/**
 * Crea una suscripción pendiente de tarjeta. Aún no cobra: el cliente debe
 * inscribir la tarjeta con POST /store/subscriptions/card/start.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await createSubscription(
    buildActionDeps(req),
    customerIdOf(req),
    (req.body ?? {}) as Record<string, unknown>
  )
  res.status(201).json({ subscription: (await presentSubscriptions(req, [sub]))[0] })
}
