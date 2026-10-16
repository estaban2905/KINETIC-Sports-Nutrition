import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cancelSubscription, serializeSubscription } from "../../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf } from "../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await cancelSubscription(buildActionDeps(req), customerIdOf(req), req.params.id)
  res.json({ subscription: serializeSubscription(sub) })
}
