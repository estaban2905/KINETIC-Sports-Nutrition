import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const usage_tips = await landingModuleService.listUsageTips(
    {},
    { order: { sort_order: "ASC" } }
  )

  res.json({ usage_tips, count: usage_tips.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const usage_tip = await landingModuleService.createUsageTips(data as any)

  res.status(201).json({ success: true, usage_tip })
}
