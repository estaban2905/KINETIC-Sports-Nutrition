import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { pauseSubscription, serializeSubscription } from "../../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf } from "../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await pauseSubscription(buildActionDeps(req), customerIdOf(req), req.params.id)
  res.json({ subscription: serializeSubscription(sub) })
}
