jest.mock("transbank-sdk", () => ({
  Environment: { Production: "production" },
  IntegrationApiKeys: { WEBPAY: "597055555532" },
  IntegrationCommerceCodes: { WEBPAY_PLUS: "597055555532" },
  Options: jest.fn(),
  WebpayPlus: {
    Transaction: {
      buildForIntegration: jest.fn(),
    },
  },
}))

import { WebpayPlus } from "transbank-sdk"
import WebpayPaymentProviderService from "../service"

describe("WebpayPaymentProviderService.authorizePayment", () => {
  let mockTransaction: {
    commit: jest.Mock
    status: jest.Mock
    refund: jest.Mock
  }
  let service: any

  beforeEach(() => {
    mockTransaction = { commit: jest.fn(), status: jest.fn(), refund: jest.fn() }
    ;(WebpayPlus.Transaction.buildForIntegration as jest.Mock).mockReturnValue(mockTransaction)
    service = new WebpayPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      { returnUrl: "https://kinetic.test/checkout/confirmar" } as any
    )
  })

  it("authorizes when the committed amount and buy_order match the session", async () => {
    mockTransaction.commit.mockResolvedValue({
      status: "AUTHORIZED",
      response_code: 0,
      amount: 10000,
      buy_order: "order1",
    })

    const result = await service.authorizePayment({
      data: { token: "tok1", amount: 10000, buy_order: "order1" },
    } as any)

    expect(result.status).toBe("authorized")
    expect(mockTransaction.refund).not.toHaveBeenCalled()
  })

  it("refunds and errors out when the committed amount doesn't match the session", async () => {
    mockTransaction.commit.mockResolvedValue({
      status: "AUTHORIZED",
      response_code: 0,
      amount: 5000, // tampered/mismatched amount
      buy_order: "order1",
    })

    const result = await service.authorizePayment({
      data: { token: "tok1", amount: 10000, buy_order: "order1" },
    } as any)

    expect(result.status).toBe("error")
    expect((result.data as any).amount_mismatch).toBe(true)
    expect(mockTransaction.refund).toHaveBeenCalledWith("tok1", 5000)
  })

  it("refunds and errors out when the committed buy_order doesn't match the session", async () => {
    mockTransaction.commit.mockResolvedValue({
      status: "AUTHORIZED",
      response_code: 0,
      amount: 10000,
      buy_order: "someone-elses-order",
    })

    const result = await service.authorizePayment({
      data: { token: "tok1", amount: 10000, buy_order: "order1" },
    } as any)

    expect(result.status).toBe("error")
    expect((result.data as any).amount_mismatch).toBe(true)
    expect(mockTransaction.refund).toHaveBeenCalled()
  })

  it("falls back to status() when commit() throws, and still authorizes on a real match", async () => {
    mockTransaction.commit.mockRejectedValue(new Error("timeout"))
    mockTransaction.status.mockResolvedValue({
      status: "AUTHORIZED",
      response_code: 0,
      amount: 10000,
      buy_order: "order1",
    })

    const result = await service.authorizePayment({
      data: { token: "tok1", amount: 10000, buy_order: "order1" },
    } as any)

    expect(mockTransaction.status).toHaveBeenCalledWith("tok1")
    expect(result.status).toBe("authorized")
  })

  it("returns an ambiguous error when both commit() and status() fail", async () => {
    mockTransaction.commit.mockRejectedValue(new Error("timeout"))
    mockTransaction.status.mockRejectedValue(new Error("still down"))

    const result = await service.authorizePayment({
      data: { token: "tok1", amount: 10000, buy_order: "order1" },
    } as any)

    expect(result.status).toBe("error")
    expect((result.data as any).ambiguous).toBe(true)
  })
})
