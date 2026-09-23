import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const guarantees = await landingModuleService.listGuarantees(
    {},
    { order: { sort_order: "ASC" } }
  )

  res.json({ guarantees, count: guarantees.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const guarantee = await landingModuleService.createGuarantees(data as any)

  res.status(201).json({ success: true, guarantee })
}
