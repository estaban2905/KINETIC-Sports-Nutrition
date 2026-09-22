import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const testimonials = await landingModuleService.listTestimonials(
    { active: true },
    { order: { sort_order: "ASC" } }
  )

  res.json({ testimonials, count: testimonials.length })
}
