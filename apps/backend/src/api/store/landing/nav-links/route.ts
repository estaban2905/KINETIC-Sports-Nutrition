import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LANDING_MODULE } from "../../../../modules/landing"
import type LandingModuleService from "../../../../modules/landing/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const landingModuleService: LandingModuleService = req.scope.resolve(LANDING_MODULE)

  const group = typeof req.query.group === "string" ? req.query.group : undefined

  const nav_links = await landingModuleService.listNavLinks(
    { active: true, ...(group ? { group } : {}) },
    { order: { sort_order: "ASC" } }
  )

  res.json({ nav_links, count: nav_links.length })
}
