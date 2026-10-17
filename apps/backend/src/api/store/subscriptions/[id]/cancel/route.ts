import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cancelSubscription } from "../../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf, presentSubscriptions } from "../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await cancelSubscription(buildActionDeps(req), customerIdOf(req), req.params.id)
  res.json({ subscription: (await presentSubscriptions(req, [sub]))[0] })
}
