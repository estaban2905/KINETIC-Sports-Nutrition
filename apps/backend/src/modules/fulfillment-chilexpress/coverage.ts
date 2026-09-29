// Resolves a comuna name (as typed by the customer in checkout, stored in
// shipping_address.city) to the countyCode Chilexpress's rating API expects
// (e.g. "PROVIDENCIA" -> "PROV"). Verified against the real Coverage API on
// 2026-09-27: GET /georeference/api/v1.0/coverage-areas?RegionCode=99&type=1
// returns the full national list (344 comunas) in one call — RegionCode=99
// means "all regions", type=1 means "comunas" (vs. 2=sectors within a comuna).
// There is no documented single-comuna lookup, so this fetches the whole
// list once and caches it in memory instead of calling per checkout.
//
// Also backs the /store/comunas route (see api/store/comunas/route.ts),
// which powers the storefront's comuna autocomplete — that reuses the same
// cache instead of triggering a second fetch from Chilexpress.
export type CoverageOptions = {
  apiKey: string
  baseUrl?: string
}

type CoverageArea = {
  countyCode: string
  countyName: string
}

type CoverageData = {
  codeByComuna: Map<string, string>
  displayNames: string[]
}

const DEFAULT_BASE_URL = "https://services.wschilexpress.com"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // comuna codes change rarely; refresh daily

let cache: CoverageData | null = null
let cacheExpiresAt = 0
let inFlight: Promise<CoverageData> | null = null

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (Ñuñoa -> Nunoa)
    .trim()
    .toUpperCase()
}

// Chilexpress returns comuna names in ALL CAPS ("SANTIAGO CENTRO") — fine
// for matching, ugly in a dropdown. Title-cased for display only; matching
// always goes through normalize() so the round-trip case doesn't matter.
function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ")
}

async function fetchCoverageData(options: CoverageOptions): Promise<CoverageData> {
  const response = await fetch(
    `${options.baseUrl ?? DEFAULT_BASE_URL}/georeference/api/v1.0/coverage-areas?RegionCode=99&type=1`,
    {
      headers: { "Ocp-Apim-Subscription-Key": options.apiKey },
      signal: AbortSignal.timeout(5000),
    }
  )

  if (!response.ok) {
    throw new Error(`Chilexpress Coverage API respondió ${response.status}`)
  }

  const data = (await response.json()) as { coverageAreas?: CoverageArea[] }
  const codeByComuna = new Map<string, string>()
  const displayNames: string[] = []
  for (const area of data.coverageAreas ?? []) {
    codeByComuna.set(normalize(area.countyName), area.countyCode)
    displayNames.push(toTitleCase(area.countyName))
  }
  displayNames.sort((a, b) => a.localeCompare(b, "es"))

  return { codeByComuna, displayNames }
}

async function getCoverageData(options: CoverageOptions): Promise<CoverageData> {
  const now = Date.now()
  if (!cache || now > cacheExpiresAt) {
    if (!inFlight) {
      inFlight = fetchCoverageData(options).finally(() => {
        inFlight = null
      })
    }
    cache = await inFlight
    cacheExpiresAt = now + CACHE_TTL_MS
  }
  return cache
}

/**
 * Resolves a comuna name to its Chilexpress countyCode, using a 24h in-memory
 * cache shared across requests. Returns null if the comuna isn't found or the
 * lookup fails — callers should treat that as "fall back to the flat rate",
 * never let it block checkout.
 */
export async function resolveCountyCode(
  comunaName: string | undefined | null,
  options: CoverageOptions
): Promise<string | null> {
  if (!comunaName) return null
  const data = await getCoverageData(options)
  return data.codeByComuna.get(normalize(comunaName)) ?? null
}

/**
 * Lists every comuna Chilexpress covers, title-cased and sorted, for the
 * storefront's comuna autocomplete (/store/comunas). Letting the customer
 * pick from this list instead of typing free text means resolveCountyCode
 * above always finds a match — no more silent fallback-to-flat-rate because
 * of a typo or an unexpected comuna spelling.
 */
export async function listComunaNames(options: CoverageOptions): Promise<string[]> {
  const data = await getCoverageData(options)
  return data.displayNames
}
