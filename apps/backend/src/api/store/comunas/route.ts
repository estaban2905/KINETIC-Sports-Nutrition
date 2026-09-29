import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listComunaNames } from "../../../modules/fulfillment-chilexpress/coverage"

/**
 * Backs the storefront's comuna autocomplete at checkout. Returns every
 * comuna Chilexpress covers so the customer picks an exact match instead of
 * typing free text — see coverage.ts for why that matters for shipping
 * quotes. Served from coverage.ts's 24h in-memory cache, so this only calls
 * Chilexpress on the first request after a cold start/cache expiry.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const apiKey = process.env.CHILEXPRESS_COBERTURA_API_KEY
  if (!apiKey) {
    res.json({ comunas: [] })
    return
  }

  try {
    const comunas = await listComunaNames({
      apiKey,
      baseUrl: process.env.CHILEXPRESS_COBERTURA_BASE_URL,
    })
    res.json({ comunas })
  } catch (error) {
    console.warn(
      `[comunas] No se pudo obtener el listado de comunas: ${
        error instanceof Error ? error.message : error
      }`
    )
    // The address form should still work with free text if this fails —
    // never block checkout over an autocomplete list.
    res.json({ comunas: [] })
  }
}
