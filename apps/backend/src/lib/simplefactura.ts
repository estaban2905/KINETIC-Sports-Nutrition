/**
 * Minimal SimpleFactura client (https://api.simplefactura.cl): JWT auth with an
 * in-memory token cache, boleta emission and PDF download.
 *
 * Auth: POST /token {email, password} -> JWT valid 24h, capped at 10 token
 * requests/hour, so the token is cached and only renewed shortly before it
 * expires (or once after a 401). Rate limit: 2 req/s, 100 req/min per IP, so
 * 429s are retried with a short backoff.
 */

export type SimpleFacturaConfig = {
  baseUrl: string
  email: string
  password: string
  /** Emisor RUT, no dots, with dash (e.g. 78181331-1). */
  rutEmisor: string
  razonSocial: string
  giro: string
  dirOrigen: string
  comunaOrigen: string
  /** Branch name as shown in SimpleFactura; spaces become "_" in the URL. */
  sucursal: string
  /** 0 = certificación (no tax validity), 1 = producción. */
  ambiente: 0 | 1
}

export function getSimpleFacturaConfig(env: NodeJS.ProcessEnv = process.env): SimpleFacturaConfig | null {
  const email = env.SIMPLEFACTURA_EMAIL?.trim()
  const password = env.SIMPLEFACTURA_PASSWORD?.trim()
  const rutEmisor = env.SIMPLEFACTURA_RUT_EMISOR?.trim()
  if (!email || !password || !rutEmisor) return null

  return {
    baseUrl: (env.SIMPLEFACTURA_BASE_URL?.trim() || "https://api.simplefactura.cl").replace(/\/+$/, ""),
    email,
    password,
    rutEmisor,
    razonSocial: env.SIMPLEFACTURA_RAZON_SOCIAL?.trim() || "",
    giro: env.SIMPLEFACTURA_GIRO?.trim() || "",
    dirOrigen: env.SIMPLEFACTURA_DIR_ORIGEN?.trim() || "",
    comunaOrigen: env.SIMPLEFACTURA_COMUNA_ORIGEN?.trim() || "",
    sucursal: env.SIMPLEFACTURA_SUCURSAL?.trim() || "Casa Matriz",
    ambiente: env.SIMPLEFACTURA_AMBIENTE?.trim() === "1" ? 1 : 0,
  }
}

type SimpleFacturaResponse<T> = {
  status?: number
  message?: string | null
  data?: T
  errors?: string[] | null
}

export type BoletaEmitida = {
  tipoDTE: number
  rutEmisor: string
  rutReceptor: string
  folio: number
  fechaEmision: string
  total: number
}

export class SimpleFacturaError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = "SimpleFacturaError"
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const REFRESH_MARGIN_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 3

export class SimpleFacturaClient {
  private token: { value: string; expiresAt: number } | null = null

  constructor(
    private readonly config: SimpleFacturaConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.token && this.token.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      return this.token.value
    }
    const response = await this.fetchImpl(`${this.config.baseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.config.email, password: this.config.password }),
    })
    if (!response.ok) {
      throw new SimpleFacturaError(`SimpleFactura: no se pudo obtener el token (HTTP ${response.status}).`, response.status)
    }
    const body = (await response.json()) as { accessToken?: string; expiresIn?: number }
    if (!body.accessToken) throw new SimpleFacturaError("SimpleFactura: la respuesta del token no trae accessToken.")
    this.token = { value: body.accessToken, expiresAt: Date.now() + (body.expiresIn ?? 3600) * 1000 }
    return this.token.value
  }

  /** Authenticated request with one token renewal on 401 and backoff on 429. */
  private async request(path: string, init: { method: string; body?: unknown }): Promise<Response> {
    let refreshed = false
    for (let attempt = 1; ; attempt++) {
      const token = await this.getToken()
      const response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method: init.method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      })
      if (response.status === 401 && !refreshed) {
        refreshed = true
        await this.getToken(true)
        continue
      }
      if (response.status === 429 && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000)
        continue
      }
      return response
    }
  }

  /** `payload` is the invoiceV2 body (see lib/boleta.ts). Throws if SimpleFactura rejects it. */
  async emitirBoleta(payload: unknown): Promise<BoletaEmitida> {
    const branch = encodeURIComponent(this.config.sucursal.trim().replace(/\s+/g, "_"))
    // validaMontos makes SimpleFactura check that the totals add up before emitting.
    const response = await this.request(`/invoiceV2/${branch}/validaMontos`, { method: "POST", body: payload })
    const body = (await response.json().catch(() => ({}))) as SimpleFacturaResponse<BoletaEmitida>
    if (!response.ok || body.status !== 200 || !body.data?.folio) {
      const detail = [body.message, ...(body.errors ?? [])].filter(Boolean).join(" | ")
      throw new SimpleFacturaError(
        `SimpleFactura no emitió la boleta (HTTP ${response.status}): ${detail || "sin detalle"}`,
        response.status
      )
    }
    return body.data
  }

  /** PDF of an issued DTE (39 = boleta electrónica). tipoPapel 3 = carta. */
  async obtenerPdf(folio: number, codigoTipoDte = 39): Promise<Buffer> {
    const response = await this.request("/dte/pdf", {
      method: "POST",
      body: {
        credenciales: { rutEmisor: this.config.rutEmisor, nombreSucursal: this.config.sucursal },
        dteReferenciadoExterno: { folio, codigoTipoDte, ambiente: this.config.ambiente },
        tipoPapel: 3,
      },
    })
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new SimpleFacturaError(
        `SimpleFactura no entregó el PDF del folio ${folio} (HTTP ${response.status}): ${text.slice(0, 200)}`,
        response.status
      )
    }
    return Buffer.from(await response.arrayBuffer())
  }
}

let shared: SimpleFacturaClient | null = null

/** Shared client (so the token cache survives across orders), or null when not configured. */
export function getSimpleFacturaClient(): { client: SimpleFacturaClient; config: SimpleFacturaConfig } | null {
  const config = getSimpleFacturaConfig()
  if (!config) return null
  shared ??= new SimpleFacturaClient(config)
  return { client: shared, config }
}
