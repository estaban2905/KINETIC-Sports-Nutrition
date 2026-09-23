import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [finalCta] = await landingModuleService.listFinalCtas({}, { take: 1 })

  res.json({ final_cta: finalCta ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const [existing] = await landingModuleService.listFinalCtas({}, { take: 1 })

  const finalCta = existing
    ? await landingModuleService.updateFinalCtas({ id: existing.id, ...data })
    : await landingModuleService.createFinalCtas(data as any)

  res.json({ success: true, final_cta: finalCta })
}
