import crypto from "node:crypto"
import KhipuPaymentProviderService from "../service"

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

describe("KhipuPaymentProviderService.initiatePayment", () => {
  it("always requests notify_api_version 3.0, regardless of the collector account's default", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({ payment_id: "pay1", payment_url: "https://khipu.test/pay1" })
    )
    global.fetch = fetchMock as unknown as typeof fetch
    const service = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
        notifyUrl: "https://kinetic.test/hooks/payment/khipu_khipu",
      } as any
    )

    await service.initiatePayment({ amount: 10000, data: {} } as any)

    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(requestInit.body as string)
    expect(body.notify_api_version).toBe("3.0")
    expect(body.notify_url).toBe("https://kinetic.test/hooks/payment/khipu_khipu")
  })

  it("omits notify_url/notify_api_version entirely when no notifyUrl is configured (Khipu rejects localhost/invalid URLs with a 400)", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({ payment_id: "pay1", payment_url: "https://khipu.test/pay1" })
    )
    global.fetch = fetchMock as unknown as typeof fetch
    const service = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )

    await service.initiatePayment({ amount: 10000, data: {} } as any)

    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(requestInit.body as string)
    expect(body.notify_url).toBeUndefined()
    expect(body.notify_api_version).toBeUndefined()
  })
})

describe("KhipuPaymentProviderService.authorizePayment", () => {
  let fetchMock: jest.Mock
  let service: any

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    service = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
  })

  it("reports captured when Khipu reports 'done' and the amount matches the session", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_id: "pay1", status: "done", amount: 10000, transaction_id: "s1" })
    )

    const result = await service.authorizePayment({
      data: { payment_id: "pay1", amount: 10000 },
    } as any)

    expect(result.status).toBe("captured")
  })

  it("refunds and errors out when the reconciled amount doesn't match the session", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ payment_id: "pay1", status: "done", amount: 5000, transaction_id: "s1" })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const result = await service.authorizePayment({
      data: { payment_id: "pay1", amount: 10000 },
    } as any)

    expect(result.status).toBe("error")
    expect((result.data as any).amount_mismatch).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/payments/pay1/refunds"),
      expect.objectContaining({ method: "POST" })
    )
  })

  it.each(["pending", "verifying"])(
    "returns pending_authorization while status is %s",
    async (status) => {
      fetchMock.mockResolvedValue(
        jsonResponse({ payment_id: "pay1", status, amount: 10000, transaction_id: "s1" })
      )

      const result = await service.authorizePayment({
        data: { payment_id: "pay1", amount: 10000 },
      } as any)

      expect(result.status).toBe("pending_authorization")
    }
  )

  it("errors out immediately when there's no payment_id, without calling the API", async () => {
    const result = await service.authorizePayment({ data: {} } as any)

    expect(result.status).toBe("error")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("KhipuPaymentProviderService.getWebhookActionAndData", () => {
  let fetchMock: jest.Mock
  let service: any
  const webhookSecret = "shh-secret"

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    service = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        webhookSecret,
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
  })

  function signedHeader(rawBody: string, secret = webhookSecret) {
    const t = "1711965600393"
    const s = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("base64")
    return `t=${t},s=${s}`
  }

  it("ignores the webhook when the signature is missing or invalid", async () => {
    const rawData = JSON.stringify({ payment_id: "pay1" })

    const result = await service.getWebhookActionAndData({
      data: { payment_id: "pay1" },
      rawData,
      headers: { "x-khipu-signature": "t=1,s=bm90LXZhbGlk" },
    } as any)

    expect(result.action).toBe("not_supported")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("re-fetches from Khipu and reports success once the signature verifies and status is done", async () => {
    const rawData = JSON.stringify({ payment_id: "pay1" })
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_id: "pay1", status: "done", amount: 10000, transaction_id: "s1" })
    )

    const result = await service.getWebhookActionAndData({
      data: { payment_id: "pay1" },
      rawData,
      headers: { "x-khipu-signature": signedHeader(rawData) },
    } as any)

    expect(result.action).toBe("captured")
    expect((result.data as any).session_id).toBe("s1")
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/payments/pay1"),
      expect.anything()
    )
  })

  it("skips signature verification (and still confirms via the API) when no webhookSecret is configured", async () => {
    const noSecretService = new KhipuPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        apiKey: "test-api-key",
        returnUrl: "https://kinetic.test/checkout/confirmar",
        cancelUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
    fetchMock.mockResolvedValue(
      jsonResponse({ payment_id: "pay1", status: "done", amount: 10000, transaction_id: "s1" })
    )

    const result = await noSecretService.getWebhookActionAndData({
      data: { payment_id: "pay1" },
      rawData: JSON.stringify({ payment_id: "pay1" }),
      headers: {},
    } as any)

    expect(result.action).toBe("captured")
  })
})
