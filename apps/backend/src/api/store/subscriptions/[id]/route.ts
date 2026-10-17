import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOwned, updateSubscription } from "../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf, presentSubscriptions } from "../helpers"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await getOwned(buildActionDeps(req), req.params.id, customerIdOf(req))
  res.json({ subscription: (await presentSubscriptions(req, [sub]))[0] })
}

/** Cambia producto (sabor), cantidad o dirección. */
export async function PATCH(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await updateSubscription(
    buildActionDeps(req),
    customerIdOf(req),
    req.params.id,
    (req.body ?? {}) as Record<string, unknown>
  )
  res.json({ subscription: (await presentSubscriptions(req, [sub]))[0] })
}
