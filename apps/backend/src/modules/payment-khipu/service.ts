import { AbstractPaymentProvider, BigNumber } from "@medusajs/framework/utils"
import crypto from "node:crypto"
import type {
  Logger,
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

const KHIPU_API_BASE = "https://payment-api.khipu.com/v3"

type KhipuOptions = {
  apiKey: string
  /**
   * HMAC secret used to verify the `x-khipu-signature` header Khipu sends on
   * webhook calls. Optional: without it, webhook notifications are ignored
   * (logged) and reconcile-payments.ts remains the only confirmation path —
   * same as if the webhook never arrived at all.
   */
  webhookSecret?: string
  returnUrl: string
  cancelUrl: string
  notifyUrl?: string
}

type KhipuPayment = {
  payment_id: string
  payment_url?: string
  status?: "pending" | "verifying" | "done"
  status_detail?: string
  amount?: string | number
  currency?: string
  transaction_id?: string
}

/**
 * Khipu is a Chilean instant bank-transfer method: redirect-based like
 * Webpay/Mercado Pago (the customer authorizes the transfer on their bank's
 * site and Khipu redirects the browser back to returnUrl), plus an async
 * webhook (notifyUrl). Khipu's v3 webhook ships the payment data directly in
 * the POST body (no separate notification_token to exchange) signed via
 * `x-khipu-signature`, but — exactly like Mercado Pago's webhook here — the
 * body's amount/status is never trusted on its own: getWebhookActionAndData
 * always re-fetches GET /v3/payments/{id} from Khipu directly before acting.
 *
 * Unlike Webpay, Khipu has no shared public sandbox credentials — a real
 * KHIPU_API_KEY from the merchant's own Khipu panel is required even to run
 * the "DemoBank" test scenarios, so this provider is only registered in
 * medusa-config.ts when that env var is set (see Stripe/Mercado Pago).
 */
class KhipuPaymentProviderService extends AbstractPaymentProvider<KhipuOptions> {
  static readonly identifier = "khipu"

  protected options_: KhipuOptions
  protected logger_: Logger

  constructor(cradle: Record<string, unknown>, options: KhipuOptions) {
    super(cradle, options)
    this.options_ = options
    this.logger_ = cradle.logger as Logger
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.apiKey) {
      throw new Error("Khipu: apiKey es obligatorio en las opciones del provider.")
    }
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${KHIPU_API_BASE}${path}`, {
      ...init,
      headers: {
        "x-api-key": this.options_.apiKey,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    })
    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(`Khipu API respondió ${response.status} en ${path}: ${body}`)
    }
    return response.json() as Promise<T>
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = (input.data?.session_id as string) ?? `sess_${Date.now()}`
    const amount = Math.round(Number(input.amount))

    const payment = await this.request<KhipuPayment>("/payments", {
      method: "POST",
      body: JSON.stringify({
        subject: "Pedido KINETIC Sports Nutrition",
        currency: "CLP",
        amount,
        transaction_id: sessionId,
        return_url: this.options_.returnUrl,
        cancel_url: this.options_.cancelUrl,
        // Khipu's API validates notify_url and REJECTS the entire payment
        // creation with a 400 if it isn't a publicly reachable URL (e.g.
        // http://localhost:...) — so in local dev, where there's no public
        // URL, this must be omitted entirely rather than sent empty/invalid.
        // notify_api_version forces the new signed-JSON-body webhook format;
        // without it Khipu falls back to the collector account's configured
        // default, which for accounts created before v3 (like this one) is
        // "1.3", the OLD notification_token-based webhook that
        // getWebhookActionAndData below can't parse.
        ...(this.options_.notifyUrl
          ? { notify_url: this.options_.notifyUrl, notify_api_version: "3.0" }
          : {}),
      }),
    })

    return {
      id: payment.payment_id,
      data: {
        payment_id: payment.payment_id,
        session_id: sessionId,
        amount,
        currency: "CLP",
        // The storefront redirects the browser here to start the Khipu flow.
        url: payment.payment_url,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const paymentId = input.data?.payment_id as string
    if (!paymentId) {
      return { status: "error", data: input.data }
    }

    const result = await this.request<KhipuPayment>(`/payments/${paymentId}`)

    // Never trust "done" alone: compare what Khipu actually reconciled
    // against what THIS payment session was created for (input.data, set
    // verbatim by initiatePayment above) — same defense as Webpay/Mercado
    // Pago above, so a mismatched/tampered amount can't be accepted as full
    // payment for the cart's real total.
    const expectedAmount = Number(input.data?.amount)
    const amountMatches = Number.isFinite(expectedAmount)
      ? Math.round(Number(result?.amount)) === Math.round(expectedAmount)
      : true

    if (result?.status === "done" && !amountMatches) {
      this.logger_?.error(
        `[khipu] Monto no coincide para payment ${paymentId}: esperado ` +
        `amount=${expectedAmount}, recibido amount=${result?.amount}. Reversando.`
      )
      try {
        await this.request(`/payments/${paymentId}/refunds`, { method: "POST" })
      } catch (refundError) {
        this.logger_?.error(
          `[khipu] No se pudo reversar el payment ${paymentId} tras detectar un monto ` +
          `inconsistente: ${refundError instanceof Error ? refundError.message : refundError}`
        )
      }
      return { status: "error", data: { ...input.data, ...result, amount_mismatch: true } }
    }

    // Khipu is a bank transfer: "done" means the money was already collected,
    // so report "captured" (Medusa creates the Payment and marks it captured
    // in one step). Returning "authorized" left the payment "Pending" in the
    // admin until someone pressed "Capture payment" by hand.
    if (result?.status === "done") {
      return { status: "captured", data: { ...input.data, ...result } }
    }
    if (result?.status === "pending" || result?.status === "verifying") {
      return { status: "pending_authorization", data: { ...input.data, ...result } }
    }
    return { status: "error", data: { ...input.data, ...result } }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Khipu captures automatically once the bank transfer reconciles.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const paymentId = input.data?.payment_id as string
    if (paymentId) {
      await this.request(`/payments/${paymentId}/refunds`, { method: "POST" })
    }
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const paymentId = input.data?.payment_id as string
    const refund = await this.request(`/payments/${paymentId}/refunds`, {
      method: "POST",
      body: JSON.stringify({ amount: Math.round(Number(input.amount)) }),
    })
    return { data: { ...input.data, refund } }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const paymentId = input.data?.payment_id as string
    if (!paymentId) return { status: "pending" }

    const result = await this.request<KhipuPayment>(`/payments/${paymentId}`)
    switch (result?.status) {
      case "done":
        return { status: "captured", data: result as unknown as Record<string, unknown> }
      case "pending":
      case "verifying":
        return { status: "pending", data: result as unknown as Record<string, unknown> }
      default:
        return { status: "error", data: result as unknown as Record<string, unknown> }
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const paymentId = input.data?.payment_id as string
    const result = await this.request(`/payments/${paymentId}`)
    return { data: result as Record<string, unknown> }
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
    const { data, rawData, headers } = payload as unknown as {
      data: Record<string, unknown>
      rawData: string | Buffer
      headers: Record<string, string>
    }

    if (this.options_.webhookSecret) {
      if (!this.verifySignature(headers?.["x-khipu-signature"], rawData)) {
        this.logger_?.error("[khipu] Firma de webhook inválida o ausente — ignorando notificación.")
        return { action: "not_supported" }
      }
    }

    const paymentId = data?.payment_id as string | undefined
    if (!paymentId) return { action: "not_supported" }

    // Re-fetch from Khipu directly instead of trusting the webhook body's
    // amount/status — same rule as authorizePayment above.
    const result = await this.request<KhipuPayment>(`/payments/${paymentId}`)
    const sessionId = result?.transaction_id
    if (!sessionId) return { action: "not_supported" }

    const amount = new BigNumber(Number(result?.amount ?? 0))

    // "captured" (PaymentActions.SUCCESSFUL): Medusa authorizes if needed,
    // captures, and completes the cart if no order exists yet.
    if (result?.status === "done") {
      return { action: "captured", data: { session_id: sessionId, amount } }
    }
    if (result?.status === "pending" || result?.status === "verifying") {
      return { action: "pending", data: { session_id: sessionId, amount } }
    }
    return { action: "not_supported" }
  }

  /**
   * Khipu signs webhooks as `x-khipu-signature: t=<timestamp>,s=<base64 HMAC>`
   * over the exact string `${timestamp}.${rawBody}` using the merchant
   * secret. Splitting each `key=value` pair on the FIRST "=" only matters
   * because the base64 signature itself can contain trailing "=" padding.
   */
  protected verifySignature(signatureHeader: string | undefined, rawData: string | Buffer): boolean {
    if (!signatureHeader) return false

    const parts: Record<string, string> = {}
    for (const part of signatureHeader.split(",")) {
      const idx = part.indexOf("=")
      if (idx === -1) continue
      parts[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
    }
    if (!parts.t || !parts.s) return false

    const body = typeof rawData === "string" ? rawData : rawData?.toString("utf8")
    const expected = crypto
      .createHmac("sha256", this.options_.webhookSecret!)
      .update(`${parts.t}.${body}`)
      .digest("base64")

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.s))
    } catch {
      // Different lengths (e.g. a tampered/malformed signature) throw in
      // timingSafeEqual instead of returning false.
      return false
    }
  }
}

export default KhipuPaymentProviderService
