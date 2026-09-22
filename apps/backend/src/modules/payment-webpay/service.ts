import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { Sentry } from "../../lib/sentry"
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
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  WebpayPlus,
} from "transbank-sdk"

type WebpayOptions = {
  commerceCode?: string
  apiKey?: string
  environment?: "integration" | "production"
  /** Where Transbank redirects the customer's browser after they pay (POST with token_ws). */
  returnUrl: string
}

/**
 * Webpay Plus (Transbank) is redirect-based, not webhook-based: after the
 * customer pays, Transbank POSTs `token_ws` back to `returnUrl`. That token
 * is the same one issued by `initiatePayment`, so `authorizePayment` can
 * commit the transaction directly from the data already stored on the
 * payment session — no separate webhook plumbing is needed.
 *
 * Defaults to Transbank's published Webpay Plus integration/test credentials
 * (not secret — meant for any developer to test with) when none are
 * configured, so this works out of the box before a real commercial
 * affiliation exists. Replace TRANSBANK_* env vars with real credentials for
 * production.
 */
class WebpayPaymentProviderService extends AbstractPaymentProvider<WebpayOptions> {
  static identifier = "webpay"

  protected options_: WebpayOptions
  protected transaction_: InstanceType<typeof WebpayPlus.Transaction>
  protected logger_: Logger

  constructor(cradle: Record<string, unknown>, options: WebpayOptions) {
    super(cradle, options)
    this.options_ = options
    this.logger_ = cradle.logger as Logger

    this.transaction_ =
      options.environment === "production"
        ? new WebpayPlus.Transaction(
            new Options(options.commerceCode!, options.apiKey!, Environment.Production)
          )
        : WebpayPlus.Transaction.buildForIntegration(
            options.commerceCode || IntegrationCommerceCodes.WEBPAY_PLUS,
            options.apiKey || IntegrationApiKeys.WEBPAY
          )
  }

  static validateOptions(options: Record<string, unknown>) {
    if (options.environment === "production" && (!options.commerceCode || !options.apiKey)) {
      throw new Error(
        "Webpay: commerceCode y apiKey son obligatorios en environment=production."
      )
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = (input.data?.session_id as string) ?? `sess_${Date.now()}`
    // Transbank buy_order must be <= 26 chars.
    const buyOrder = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-26)
    const amount = Math.round(Number(input.amount))

    const { token, url } = await this.transaction_.create(
      buyOrder,
      sessionId,
      amount,
      this.options_.returnUrl
    )

    return {
      id: token,
      data: {
        token,
        buy_order: buyOrder,
        session_id: sessionId,
        amount,
        // The storefront redirects the browser here to start the Webpay flow.
        url: `${url}?token_ws=${token}`,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const token = input.data?.token as string
    if (!token) {
      return { status: "error", data: input.data }
    }

    // commit() can throw on a network-level failure (timeout, connection
    // reset) without telling us whether Transbank actually captured the
    // charge before the response was lost. Falling through as an uncaught
    // exception here would skip our own amount check below AND skip logging
    // that this specific transaction needs reconciliation — so it's
    // resolved with a status() lookup instead of just failing blind. See
    // src/jobs/reconcile-payments.ts, which independently re-verifies any
    // token left in this state.
    let result: Awaited<ReturnType<typeof this.transaction_.commit>>
    try {
      result = await this.transaction_.commit(token)
    } catch (commitError) {
      this.logger_?.error(
        `[webpay] commit() falló para el token ${token} sin confirmar si Transbank capturó el ` +
        `pago: ${commitError instanceof Error ? commitError.message : commitError}. Verificando estado real...`
      )
      try {
        result = await this.transaction_.status(token)
      } catch (statusError) {
        const message = `[webpay] AMBIGUO — no se pudo confirmar ni con status() el token ${token}. ` +
          `Requiere revisión manual directamente en el panel de Transbank: ${
            statusError instanceof Error ? statusError.message : statusError
          }`
        this.logger_?.error(message)
        Sentry.captureMessage(message, { level: "error", extra: { token } })
        return { status: "error", data: { ...input.data, ambiguous: true } }
      }
    }

    const statusOk = result?.status === "AUTHORIZED" && result?.response_code === 0

    // Never trust "AUTHORIZED" alone. Transbank's commit response echoes back
    // the amount and buy_order it actually charged — compare them against
    // what THIS payment session was created for (input.data, set verbatim by
    // initiatePayment above) before treating the payment as good. Without
    // this, a mismatched/tampered amount would be silently accepted as a
    // valid payment for the cart's full total.
    const expectedAmount = Number(input.data?.amount)
    const expectedBuyOrder = input.data?.buy_order as string | undefined
    const amountMatches = Number.isFinite(expectedAmount)
      ? Math.round(Number(result?.amount)) === Math.round(expectedAmount)
      : true
    const buyOrderMatches = expectedBuyOrder ? result?.buy_order === expectedBuyOrder : true

    if (statusOk && (!amountMatches || !buyOrderMatches)) {
      this.logger_?.error(
        `[webpay] Monto/orden no coincide para token ${token}: esperado ` +
        `amount=${expectedAmount} buy_order=${expectedBuyOrder}, recibido ` +
        `amount=${result?.amount} buy_order=${result?.buy_order}. Reversando la transacción.`
      )
      try {
        await this.transaction_.refund(token, Number(result?.amount ?? expectedAmount))
      } catch (refundError) {
        this.logger_?.error(
          `[webpay] No se pudo reversar el token ${token} tras detectar un monto ` +
          `inconsistente: ${refundError instanceof Error ? refundError.message : refundError}`
        )
      }
      return { status: "error", data: { ...input.data, ...result, amount_mismatch: true } }
    }

    return {
      status: statusOk ? "authorized" : "error",
      data: { ...input.data, ...result },
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Webpay Plus captures automatically on commit (authorizePayment); nothing more to do.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const token = input.data?.token as string
    const amount = input.data?.amount as number
    if (token && amount) {
      await this.transaction_.refund(token, amount)
    }
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const token = input.data?.token as string
    const result = await this.transaction_.refund(token, Math.round(Number(input.amount)))
    return { data: { ...input.data, refund: result } }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const token = input.data?.token as string
    if (!token) return { status: "pending" }

    const result = await this.transaction_.status(token)
    switch (result?.status) {
      case "AUTHORIZED":
        return { status: "authorized", data: result }
      case "FAILED":
      case "NULLIFIED":
        return { status: "error", data: result }
      default:
        return { status: "pending", data: result }
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const token = input.data?.token as string
    const result = await this.transaction_.status(token)
    return { data: result }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Webpay transactions are immutable once created.
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    // Transbank doesn't push webhooks for Webpay Plus; confirmation happens
    // synchronously in authorizePayment via the returnUrl round trip.
    return { action: "not_supported" }
  }
}

export default WebpayPaymentProviderService
