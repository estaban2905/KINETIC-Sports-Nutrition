import { AbstractPaymentProvider, BigNumber } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
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
import { MercadoPagoConfig, Payment, PaymentRefund, Preference } from "mercadopago"

type MercadoPagoOptions = {
  accessToken: string
  successUrl: string
  failureUrl: string
  /**
   * Medusa's built-in generic webhook route. With provider `id: "mercadopago"`
   * on the "mercadopago" identifier, the final provider_id is
   * `pp_mercadopago_mercadopago`, so this must point to
   * `${BACKEND_URL}/hooks/payment/mercadopago_mercadopago`.
   */
  notificationUrl?: string
}

/**
 * Mercado Pago Checkout Pro: the customer is redirected to a hosted
 * checkout (a "preference") and comes back via `back_urls`. Unlike Webpay,
 * Mercado Pago also pushes an async webhook, which `getWebhookActionAndData`
 * handles — but the primary confirmation path is `authorizePayment` looking
 * up the payment by `external_reference` when the storefront calls
 * `cart.complete()` right after the customer returns from checkout.
 */
class MercadoPagoPaymentProviderService extends AbstractPaymentProvider<MercadoPagoOptions> {
  static identifier = "mercadopago"

  protected options_: MercadoPagoOptions
  protected client_: MercadoPagoConfig
  protected logger_: Logger

  constructor(cradle: Record<string, unknown>, options: MercadoPagoOptions) {
    super(cradle, options)
    this.options_ = options
    this.client_ = new MercadoPagoConfig({ accessToken: options.accessToken })
    this.logger_ = cradle.logger as Logger
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.accessToken) {
      throw new Error("MercadoPago: accessToken es obligatorio en las opciones del provider.")
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = (input.data?.session_id as string) ?? `sess_${Date.now()}`
    const amount = Number(input.amount)

    const preference = await new Preference(this.client_).create({
      body: {
        items: [
          {
            id: sessionId,
            title: "Pedido KINETIC Sports Nutrition",
            quantity: 1,
            currency_id: "CLP",
            unit_price: amount,
          },
        ],
        external_reference: sessionId,
        back_urls: {
          success: this.options_.successUrl,
          failure: this.options_.failureUrl,
          pending: this.options_.successUrl,
        },
        auto_return: "approved",
        notification_url: this.options_.notificationUrl,
      },
    })

    return {
      id: preference.id ?? sessionId,
      data: {
        preference_id: preference.id,
        session_id: sessionId,
        // The storefront redirects the browser here to start Checkout Pro.
        url: preference.init_point,
        // Kept so authorizePayment can verify MP's payment actually matches
        // what this session was created for, not just that some payment
        // with the right external_reference exists.
        amount,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const sessionId = input.data?.session_id as string
    if (!sessionId) return { status: "error", data: input.data }

    const { results } = await new Payment(this.client_).search({
      options: { external_reference: sessionId, sort: "date_created", criteria: "desc" },
    })
    const payment = results?.[0]

    // Never trust "approved" alone: verify the payment MP found for this
    // external_reference actually charged the amount this session was
    // created for (input.data.amount, set verbatim by initiatePayment
    // above). Without this, a stale/mismatched payment sharing the same
    // external_reference — or a manipulated amount — would be accepted as
    // full payment for the cart's real total.
    const expectedAmount = Number(input.data?.amount)
    const amountMatches = Number.isFinite(expectedAmount)
      ? Math.round(Number(payment?.transaction_amount)) === Math.round(expectedAmount)
      : true

    if (payment?.status === "approved" && !amountMatches) {
      this.logger_?.error(
        `[mercadopago] Monto no coincide para session ${sessionId} / payment ${payment.id}: ` +
        `esperado=${expectedAmount} recibido=${payment.transaction_amount}. No se autoriza.`
      )
      try {
        await new PaymentRefund(this.client_).create({
          payment_id: String(payment.id),
          body: { amount: Number(payment.transaction_amount) },
        })
      } catch (refundError) {
        this.logger_?.error(
          `[mercadopago] No se pudo reversar el payment ${payment.id} tras detectar un ` +
          `monto inconsistente: ${refundError instanceof Error ? refundError.message : refundError}`
        )
      }
      return {
        status: "error",
        data: { ...input.data, payment_id: payment.id, status: payment.status, amount_mismatch: true },
      }
    }

    if (payment?.status === "approved") {
      return { status: "authorized", data: { ...input.data, payment_id: payment.id, status: payment.status } }
    }
    if (payment?.status === "pending" || payment?.status === "in_process") {
      return { status: "pending_authorization", data: { ...input.data, payment_id: payment.id, status: payment.status } }
    }
    return { status: "error", data: { ...input.data, status: payment?.status ?? "not_found" } }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Checkout Pro captures automatically on approval.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const paymentId = input.data?.payment_id as string
    if (paymentId) {
      await new Payment(this.client_).cancel({ id: paymentId })
    }
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const paymentId = input.data?.payment_id as string
    const refund = await new PaymentRefund(this.client_).create({
      payment_id: paymentId,
      body: { amount: Number(input.amount) },
    })
    return { data: { ...input.data, refund } }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const paymentId = input.data?.payment_id as string
    if (!paymentId) return { status: "pending" }

    const payment = await new Payment(this.client_).get({ id: paymentId })
    switch (payment.status) {
      case "approved":
        return { status: "captured", data: payment as unknown as Record<string, unknown> }
      case "pending":
      case "in_process":
        return { status: "pending", data: payment as unknown as Record<string, unknown> }
      case "cancelled":
        return { status: "canceled", data: payment as unknown as Record<string, unknown> }
      default:
        return { status: "error", data: payment as unknown as Record<string, unknown> }
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const paymentId = input.data?.payment_id as string
    const payment = await new Payment(this.client_).get({ id: paymentId })
    return { data: payment as unknown as Record<string, unknown> }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = payload.data as { type?: string; data?: { id?: string }; action?: string }
    const paymentId = body?.data?.id
    if (body?.type !== "payment" || !paymentId) {
      return { action: "not_supported" }
    }

    const payment = await new Payment(this.client_).get({ id: paymentId })
    const sessionId = payment.external_reference
    if (!sessionId) return { action: "not_supported" }

    const amount = new BigNumber(payment.transaction_amount ?? 0)

    if (payment.status === "approved") {
      return { action: "authorized", data: { session_id: sessionId, amount } }
    }
    if (payment.status === "rejected" || payment.status === "cancelled") {
      return { action: "failed", data: { session_id: sessionId, amount } }
    }
    return { action: "pending", data: { session_id: sessionId, amount } }
  }
}

export default MercadoPagoPaymentProviderService
