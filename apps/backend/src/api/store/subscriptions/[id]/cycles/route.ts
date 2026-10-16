import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOwned, serializeCycle, type CycleRow } from "../../../../../lib/subscription-actions"
import { buildActionDeps, customerIdOf } from "../../helpers"

/** Historial de cobros de una suscripción del cliente, el más reciente primero. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const deps = buildActionDeps(req)
  const sub = await getOwned(deps, req.params.id, customerIdOf(req))
  const cycles = (await (deps.subscriptions as any).listSubscriptionCycles(
    { subscription_id: sub.id },
    { order: { period_key: "DESC" }, take: 50 }
  )) as CycleRow[]
  res.json({ cycles: cycles.map(serializeCycle) })
}
