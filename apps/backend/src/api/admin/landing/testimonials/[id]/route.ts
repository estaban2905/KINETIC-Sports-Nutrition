import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../../modules/landing"
import type LandingModuleService from "../../../../../modules/landing/service"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const testimonial = await landingModuleService.updateTestimonials({
    id: req.params.id,
    ...data,
  })

  res.json({ success: true, testimonial })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  await landingModuleService.deleteTestimonials(req.params.id)

  res.json({ success: true })
}
