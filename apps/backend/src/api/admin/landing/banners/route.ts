import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const banners = await landingModuleService.listBanners(
    {},
    { order: { sort_order: "ASC" } }
  )

  res.json({ banners, count: banners.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const banner = await landingModuleService.createBanners(data as any)

  res.status(201).json({ success: true, banner })
}
