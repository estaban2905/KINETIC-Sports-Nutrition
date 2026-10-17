import {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Oneclick,
  Options,
  TransactionDetail,
} from "transbank-sdk"

/**
 * Webpay Oneclick Mall (Transbank): inscripción de una tarjeta y cargos
 * posteriores sin que el cliente esté presente. De la tarjeta solo se conserva
 * el `tbk_user` que entrega Transbank; nunca el número.
 *
 * Es "Mall": el cobro se hace contra un código de comercio hijo
 * (`childCommerceCode`), el padre solo agrupa. Sin variables configuradas usa las
 * credenciales públicas de integración que publica Transbank.
 */

export type OneclickConfig = {
  commerceCode: string
  childCommerceCode: string
  apiKey: string
  environment: "integration" | "production"
}

export function oneclickConfigFromEnv(env: NodeJS.ProcessEnv = process.env): OneclickConfig {
  const environment = env.ONECLICK_ENVIRONMENT === "production" ? "production" : "integration"
  const commerceCode = env.ONECLICK_COMMERCE_CODE?.trim()
  const childCommerceCode = env.ONECLICK_CHILD_COMMERCE_CODE?.trim()
  const apiKey = env.ONECLICK_API_KEY?.trim()

  if (environment === "production" && (!commerceCode || !childCommerceCode || !apiKey)) {
    throw new Error(
      "Oneclick: ONECLICK_COMMERCE_CODE, ONECLICK_CHILD_COMMERCE_CODE y ONECLICK_API_KEY son obligatorios en producción."
    )
  }

  return {
    environment,
    commerceCode: commerceCode || IntegrationCommerceCodes.ONECLICK_MALL,
    childCommerceCode: childCommerceCode || IntegrationCommerceCodes.ONECLICK_MALL_CHILD1,
    // La API key de Oneclick de integración es la misma que la de Webpay Plus.
    apiKey: apiKey || IntegrationApiKeys.WEBPAY,
  }
}

// --- Resultados -------------------------------------------------------------

export type InscriptionResult =
  | { ok: true; tbkUser: string; cardBrand: string | null; last4: string | null }
  | { ok: false; code: number | null }

/** Interpreta la respuesta de `finish`: solo response_code 0 con tbk_user es éxito. */
export function parseInscriptionResult(raw: any): InscriptionResult {
  const code = typeof raw?.response_code === "number" ? raw.response_code : null
  if (code !== 0 || typeof raw?.tbk_user !== "string" || !raw.tbk_user) {
    return { ok: false, code }
  }
  const digits = typeof raw.card_number === "string" ? raw.card_number.replace(/\D/g, "") : ""
  return {
    ok: true,
    tbkUser: raw.tbk_user,
    cardBrand: typeof raw.card_type === "string" && raw.card_type ? raw.card_type : null,
    last4: digits.length >= 4 ? digits.slice(-4) : null,
  }
}

export type ChargeResult =
  | { ok: true; authorizationCode: string; amount: number; buyOrder: string }
  | { ok: false; code: number | null; status: string | null }

/**
 * Interpreta la respuesta de `authorize` / `status`. Solo cuenta como cobrado un
 * detalle AUTHORIZED con response_code 0; cualquier otra cosa es un rechazo.
 */
export function parseChargeResult(raw: any): ChargeResult {
  const detail = Array.isArray(raw?.details) ? raw.details[0] : null
  const code = typeof detail?.response_code === "number" ? detail.response_code : null
  const status = typeof detail?.status === "string" ? detail.status : null
  if (!detail || code !== 0 || status !== "AUTHORIZED") {
    return { ok: false, code, status }
  }
  return {
    ok: true,
    authorizationCode: String(detail.authorization_code ?? ""),
    amount: Number(detail.amount),
    buyOrder: String(detail.buy_order ?? ""),
  }
}

// --- Identificadores ----------------------------------------------------------

/** Transbank limita el username a 40 caracteres; se usa el id del cliente. */
export function oneclickUsername(customerId: string): string {
  if (!customerId || customerId.length > 40) {
    throw new Error(`Oneclick: id de cliente inválido para username: "${customerId}"`)
  }
  return customerId
}

/**
 * Órdenes de compra del cobro (máx. 26 caracteres, únicas en Transbank). Se
 * derivan de la suscripción, el día de cobro y el nº de intento, así que son
 * deterministas: reintentar el MISMO intento reutiliza el mismo código y
 * Transbank lo rechaza en vez de cobrar dos veces; un reintento nuevo
 * (attempt + 1) sí genera uno distinto.
 */
export function buildBuyOrders(
  subscriptionId: string,
  periodKey: string,
  attempt: number
): { parent: string; child: string } {
  const sub = subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)
  const day = periodKey.replace(/\D/g, "")
  const base = `${sub}${day}${attempt}`
  return { parent: `P${base}`.slice(0, 26), child: `C${base}`.slice(0, 26) }
}

/**
 * ¿El error de `charge` garantiza que NO se cobró? Transbank respondió con un
 * rechazo HTTP 4xx (p. ej. 422 por tarjeta dada de baja o inexistente), así que
 * el cargo nunca se procesó. Un 5xx, un timeout o un corte de red son ambiguos:
 * pudo cobrarse y hay que consultar `chargeStatus` antes de decidir.
 */
export function isDefinitiveChargeFailure(err: unknown): boolean {
  const status = (err as { response?: { status?: unknown } } | null)?.response?.status
  return typeof status === "number" && status >= 400 && status < 500
}

export function maskedCard(brand: string | null, last4: string | null): string | null {
  if (!last4) return null
  return `${brand ?? "Tarjeta"} •••• ${last4}`
}

// --- Cliente ------------------------------------------------------------------

type MallInscription = InstanceType<typeof Oneclick.MallInscription>
type MallTransaction = InstanceType<typeof Oneclick.MallTransaction>

export class OneclickClient {
  constructor(
    private readonly inscription: MallInscription,
    private readonly transaction: MallTransaction,
    private readonly childCommerceCode: string
  ) {}

  static fromConfig(config: OneclickConfig): OneclickClient {
    const options = new Options(
      config.commerceCode,
      config.apiKey,
      config.environment === "production" ? Environment.Production : Environment.Integration
    )
    return new OneclickClient(
      new Oneclick.MallInscription(options),
      new Oneclick.MallTransaction(options),
      config.childCommerceCode
    )
  }

  static fromEnv(): OneclickClient {
    return OneclickClient.fromConfig(oneclickConfigFromEnv())
  }

  /** Paso 1: Transbank entrega un token y la URL a la que hay que enviar el POST del navegador. */
  async startInscription(input: {
    username: string
    email: string
    responseUrl: string
  }): Promise<{ token: string; url: string }> {
    const res = await this.inscription.start(input.username, input.email, input.responseUrl)
    if (!res?.token || !res?.url_webpay) {
      throw new Error("Oneclick: Transbank no devolvió token o URL de inscripción.")
    }
    return { token: res.token, url: res.url_webpay }
  }

  /** Paso 2: confirma la inscripción cuando el cliente vuelve de Transbank. Puede lanzar si el token no sirve. */
  async finishInscription(token: string): Promise<InscriptionResult> {
    return parseInscriptionResult(await this.inscription.finish(token))
  }

  async deleteInscription(input: { tbkUser: string; username: string }): Promise<void> {
    await this.inscription.delete(input.tbkUser, input.username)
  }

  /**
   * Cobra con la tarjeta inscrita. Un rechazo vuelve como `{ ok: false }`; un
   * error de red LANZA y es ambiguo (pudo cobrarse): quien llama debe consultar
   * `chargeStatus` antes de decidir, nunca reintentar a ciegas.
   */
  async charge(input: {
    username: string
    tbkUser: string
    parentBuyOrder: string
    childBuyOrder: string
    amount: number
  }): Promise<ChargeResult> {
    const amount = Math.round(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Oneclick: monto inválido ${input.amount}`)
    }
    const raw = await this.transaction.authorize(input.username, input.tbkUser, input.parentBuyOrder, [
      new TransactionDetail(amount, this.childCommerceCode, input.childBuyOrder, 1),
    ])
    return parseChargeResult(raw)
  }

  /** Estado real de un cobro por la orden de compra del PADRE. */
  async chargeStatus(parentBuyOrder: string): Promise<ChargeResult> {
    return parseChargeResult(await this.transaction.status(parentBuyOrder))
  }

  async refund(input: {
    parentBuyOrder: string
    childBuyOrder: string
    amount: number
  }): Promise<void> {
    await this.transaction.refund(
      input.parentBuyOrder,
      this.childCommerceCode,
      input.childBuyOrder,
      Math.round(input.amount)
    )
  }
}
