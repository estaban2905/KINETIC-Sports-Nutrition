import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../../modules/landing"
import type LandingModuleService from "../../../../../modules/landing/service"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const trust_badge = await landingModuleService.updateTrustBadges({
    id: req.params.id,
    ...data,
  })

  res.json({ success: true, trust_badge })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  await landingModuleService.deleteTrustBadges(req.params.id)

  res.json({ success: true })
}
