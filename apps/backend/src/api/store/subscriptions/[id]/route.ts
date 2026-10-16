import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOwned, serializeSubscription, updateSubscription } from "../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf } from "../helpers"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await getOwned(buildActionDeps(req), req.params.id, customerIdOf(req))
  res.json({ subscription: serializeSubscription(sub) })
}

/** Cambia producto (sabor), cantidad o dirección. */
export async function PATCH(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await updateSubscription(
    buildActionDeps(req),
    customerIdOf(req),
    req.params.id,
    (req.body ?? {}) as Record<string, unknown>
  )
  res.json({ subscription: serializeSubscription(sub) })
}
