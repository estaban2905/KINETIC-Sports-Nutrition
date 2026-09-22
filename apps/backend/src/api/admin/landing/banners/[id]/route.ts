import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../../modules/landing"
import type LandingModuleService from "../../../../../modules/landing/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  await landingModuleService.deleteBanners(req.params.id)

  res.json({ success: true })
}
