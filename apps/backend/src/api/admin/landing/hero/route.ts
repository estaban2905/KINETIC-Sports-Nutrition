import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const [hero] = await landingModuleService.listHeroes({}, { take: 1 })

  res.json({ hero: hero ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)
  const data = req.body as Record<string, unknown>

  const [existing] = await landingModuleService.listHeroes({}, { take: 1 })

  const hero = existing
    ? await landingModuleService.updateHeroes({ id: existing.id, ...data })
    : await landingModuleService.createHeroes(data as any)

  res.json({ success: true, hero })
}
