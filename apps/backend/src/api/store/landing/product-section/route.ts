import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [productSection] = await landingModuleService.listProductSections({}, { take: 1 })

  if (!productSection) {
    return res.status(404).json({
      type: "not_found",
      message: "No Product Section configured.",
    })
  }

  res.json({ product_section: productSection })
}
