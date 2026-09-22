import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [settings] = await landingModuleService.listSettings({}, { take: 1 })

  if (!settings) {
    return res.status(404).json({
      type: "not_found",
      message: "No brand settings configured.",
    })
  }

  res.json({ settings })
}
