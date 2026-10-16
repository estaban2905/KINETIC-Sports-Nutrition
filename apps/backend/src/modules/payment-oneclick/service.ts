import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { Sentry } from "../../lib/sentry"
import {
  OneclickClient,
  isDefinitiveChargeFailure,
  oneclickConfigFromEnv,
  type ChargeResult,
  type OneclickConfig,
} from "../../lib/oneclick"
import { openChargeToken, type ChargePayload } from "../../lib/charge-token"
import { recordChargeOutcome } from "../../lib/charge-outcomes"

type OneclickOptions = Partial<OneclickConfig>

/**
 * Cobra una suscripción con la tarjeta inscrita en Oneclick. No es un medio de
 * pago para el checkout: la sesión solo se puede crear con un `charge_token`
 * sellado por el servidor (ver lib/charge-token.ts), que lleva la tarjeta, el
 * monto y las órdenes de compra. El cargo ocurre dentro de authorizePayment, así
 * que si falla Medusa no llega a crear el pedido, y si algo falla después,
 * cancelPayment reversa el cargo.
 *
 * Idempotencia: las órdenes de compra son deterministas por ciclo e intento
 * (lib/oneclick.ts, buildBuyOrders). Antes de cobrar se consulta a Transbank por
 * la orden; si ya figura autorizada (un intento anterior que se cortó) se
 * reutiliza ese cobro y NO se cobra de nuevo.
 */
class OneclickPaymentProviderService extends AbstractPaymentProvider<OneclickOptions> {
  static identifier = "oneclick"

  protected client_: OneclickClient
  protected logger_: Logger

  constructor(cradle: Record<string, unknown>, options: OneclickOptions) {
    super(cradle, options)
    this.logger_ = cradle.logger as Logger
    // `__oneclickClient` permite inyectar un doble en pruebas. El cradle de Awilix
    // LANZA al pedir una clave que no existe, de ahí el try.
    let injected: OneclickClient | undefined
    try {
      injected = cradle.__oneclickClient as OneclickClient | undefined
    } catch {
      injected = undefined
    }
    this.client_ =
      injected ??
      OneclickClient.fromConfig(
        oneclickConfigFromEnv({
          ...process.env,
          ...(options.environment ? { ONECLICK_ENVIRONMENT: options.environment } : {}),
          ...(options.commerceCode ? { ONECLICK_COMMERCE_CODE: options.commerceCode } : {}),
          ...(options.childCommerceCode ? { ONECLICK_CHILD_COMMERCE_CODE: options.childCommerceCode } : {}),
          ...(options.apiKey ? { ONECLICK_API_KEY: options.apiKey } : {}),
        } as NodeJS.ProcessEnv)
      )
  }

  static validateOptions(options: Record<string, unknown>) {
    if (
      options.environment === "production" &&
      (!options.commerceCode || !options.childCommerceCode || !options.apiKey)
    ) {
      throw new Error("Oneclick: las tres credenciales son obligatorias en environment=production.")
    }
  }

  private payloadOf(data: Record<string, unknown> | undefined): ChargePayload {
    try {
      return openChargeToken(data?.charge_token)
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        err instanceof Error ? err.message : "Token de cobro inválido."
      )
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const payload = this.payloadOf(input.data)
    if (payload.amount !== Math.round(Number(input.amount))) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "El monto de la sesión no coincide con el cobro sellado.")
    }
    return {
      id: payload.cycleId,
      data: {
        charge_token: input.data?.charge_token,
        cycle_id: payload.cycleId,
        subscription_id: payload.subscriptionId,
        amount: payload.amount,
      },
    }
  }

  /** Pregunta a Transbank si la orden del padre ya está cobrada. Un 4xx significa que no existe. */
  private async alreadyCharged(p: ChargePayload): Promise<"charged" | "not_charged" | "unknown"> {
    try {
      const status = await this.client_.chargeStatus(p.parentBuyOrder)
      return status.ok ? "charged" : "not_charged"
    } catch (err) {
      return isDefinitiveChargeFailure(err) ? "not_charged" : "unknown"
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const p = this.payloadOf(input.data)
    const fail = (extra: Record<string, unknown>): AuthorizePaymentOutput => ({
      status: "error",
      data: { ...input.data, ...extra },
    })

    const before = await this.alreadyCharged(p)
    if (before === "unknown") {
      // No se intentó cobrar: es seguro dejarlo para el próximo intento.
      return fail({ not_attempted: true })
    }
    if (before === "charged") {
      this.logger_?.warn(`[oneclick] ${p.parentBuyOrder} ya figuraba cobrada: se reutiliza, no se cobra de nuevo.`)
      recordChargeOutcome(p.cycleId, { kind: "authorized", authorizationCode: "" })
      return { status: "authorized", data: { ...input.data, charged: true, reused: true } }
    }

    let result: ChargeResult
    try {
      result = await this.client_.charge({
        username: p.username,
        tbkUser: p.tbkUser,
        parentBuyOrder: p.parentBuyOrder,
        childBuyOrder: p.childBuyOrder,
        amount: p.amount,
      })
    } catch (err) {
      if (isDefinitiveChargeFailure(err)) {
        recordChargeOutcome(p.cycleId, {
          kind: "rejected",
          code: null,
          detail: err instanceof Error ? err.message : String(err),
        })
        return fail({ rejected: true })
      }
      // Corte de red o 5xx: pudo haberse cobrado. Se vuelve a preguntar antes de decidir.
      const after = await this.alreadyCharged(p)
      if (after === "charged") {
        recordChargeOutcome(p.cycleId, { kind: "authorized", authorizationCode: "" })
        return { status: "authorized", data: { ...input.data, charged: true, recovered: true } }
      }
      if (after === "not_charged") {
        recordChargeOutcome(p.cycleId, { kind: "rejected", code: null, detail: "sin cobro tras error de red" })
        return fail({ rejected: true })
      }
      const message =
        `[oneclick] AMBIGUO: no se pudo confirmar el cobro ${p.parentBuyOrder} (ciclo ${p.cycleId}): ` +
        `${err instanceof Error ? err.message : err}`
      this.logger_?.error(message)
      Sentry.captureMessage(message, { level: "error", extra: { cycleId: p.cycleId } })
      recordChargeOutcome(p.cycleId, { kind: "ambiguous", detail: message })
      return fail({ ambiguous: true })
    }

    if (!result.ok) {
      recordChargeOutcome(p.cycleId, {
        kind: "rejected",
        code: result.code,
        detail: `${result.status ?? "sin estado"} (${result.code ?? "sin código"})`,
      })
      return fail({ rejected: true, response_code: result.code })
    }

    // Nunca se confía solo en "AUTHORIZED": el monto devuelto debe ser el sellado.
    if (result.amount !== p.amount) {
      this.logger_?.error(
        `[oneclick] monto distinto en ${p.parentBuyOrder}: esperado ${p.amount}, recibido ${result.amount}. Reversando.`
      )
      try {
        await this.client_.refund({
          parentBuyOrder: p.parentBuyOrder,
          childBuyOrder: p.childBuyOrder,
          amount: result.amount,
        })
      } catch (refundErr) {
        this.logger_?.error(
          `[oneclick] no se pudo reversar ${p.parentBuyOrder}: ${
            refundErr instanceof Error ? refundErr.message : refundErr
          }`
        )
      }
      recordChargeOutcome(p.cycleId, { kind: "rejected", code: null, detail: "monto distinto" })
      return fail({ amount_mismatch: true })
    }

    recordChargeOutcome(p.cycleId, { kind: "authorized", authorizationCode: result.authorizationCode })
    return {
      status: "authorized",
      data: { ...input.data, charged: true, authorization_code: result.authorizationCode },
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Oneclick cobra al autorizar (no es diferido): no hay nada que capturar.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    // Solo si se llegó a cobrar: es el reverso cuando algo falla después del cargo.
    if (input.data?.charged) {
      const p = this.payloadOf(input.data)
      await this.client_.refund({
        parentBuyOrder: p.parentBuyOrder,
        childBuyOrder: p.childBuyOrder,
        amount: p.amount,
      })
    }
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const p = this.payloadOf(input.data)
    await this.client_.refund({
      parentBuyOrder: p.parentBuyOrder,
      childBuyOrder: p.childBuyOrder,
      amount: Math.round(Number(input.amount)),
    })
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    if (!input.data?.charge_token) return { status: "pending" }
    const p = this.payloadOf(input.data)
    return (await this.alreadyCharged(p)) === "charged" ? { status: "authorized" } : { status: "pending" }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(_input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // El monto va sellado en el token: no se puede cambiar una sesión existente.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "La sesión de cobro de una suscripción no se puede modificar."
    )
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(_payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }
}

export default OneclickPaymentProviderService
