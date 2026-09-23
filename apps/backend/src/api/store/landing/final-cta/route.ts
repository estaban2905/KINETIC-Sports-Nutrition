import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [finalCta] = await landingModuleService.listFinalCtas({}, { take: 1 })

  if (!finalCta) {
    return res.status(404).json({
      type: "not_found",
      message: "No Final CTA section configured.",
    })
  }

  res.json({ final_cta: finalCta })
}
