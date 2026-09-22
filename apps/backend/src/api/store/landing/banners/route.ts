import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const activeBanners = await landingModuleService.listBanners(
    { active: true },
    { order: { sort_order: "ASC" } }
  )

  const now = Date.now()
  const banners = activeBanners.filter((banner) => {
    const start = new Date(banner.start_date).getTime()
    const end = new Date(banner.end_date).getTime()
    return now >= start && now <= end
  })

  res.json({ banners, count: banners.length })
}
