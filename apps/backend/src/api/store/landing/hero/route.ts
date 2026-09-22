import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [hero] = await landingModuleService.listHeroes(
    { active: true },
    { order: { sort_order: "ASC" }, take: 1 }
  )

  if (!hero) {
    return res.status(404).json({
      type: "not_found",
      message: "No active Hero section configured.",
    })
  }

  res.json({ hero })
}
