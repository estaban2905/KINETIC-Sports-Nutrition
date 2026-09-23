import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [productSection] = await landingModuleService.listProductSections({}, { take: 1 })

  res.json({ product_section: productSection ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const [existing] = await landingModuleService.listProductSections({}, { take: 1 })

  const productSection = existing
    ? await landingModuleService.updateProductSections({ id: existing.id, ...data })
    : await landingModuleService.createProductSections(data as any)

  res.json({ success: true, product_section: productSection })
}
