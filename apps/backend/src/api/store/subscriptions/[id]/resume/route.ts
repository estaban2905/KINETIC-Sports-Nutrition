import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resumeSubscription, serializeSubscription } from "../../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf } from "../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const sub = await resumeSubscription(buildActionDeps(req), customerIdOf(req), req.params.id)
  res.json({ subscription: serializeSubscription(sub) })
}
