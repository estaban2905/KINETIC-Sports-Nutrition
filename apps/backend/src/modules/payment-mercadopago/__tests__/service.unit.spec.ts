jest.mock("mercadopago", () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn(),
  PaymentRefund: jest.fn(),
  Preference: jest.fn(),
}))

import { Payment, PaymentRefund } from "mercadopago"
import MercadoPagoPaymentProviderService from "../service"

describe("MercadoPagoPaymentProviderService.authorizePayment", () => {
  let searchMock: jest.Mock
  let refundCreateMock: jest.Mock
  let service: any

  beforeEach(() => {
    searchMock = jest.fn()
    refundCreateMock = jest.fn()
    ;(Payment as unknown as jest.Mock).mockImplementation(() => ({ search: searchMock }))
    ;(PaymentRefund as unknown as jest.Mock).mockImplementation(() => ({ create: refundCreateMock }))
    service = new MercadoPagoPaymentProviderService(
      { logger: { error: jest.fn(), info: jest.fn() } } as any,
      {
        accessToken: "TEST-access-token",
        successUrl: "https://kinetic.test/checkout/confirmar",
        failureUrl: "https://kinetic.test/checkout/confirmar",
      } as any
    )
  })

  it("authorizes an approved payment whose amount matches the session", async () => {
    searchMock.mockResolvedValue({
      results: [{ id: "pay1", status: "approved", transaction_amount: 10000 }],
    })

    const result = await service.authorizePayment({
      data: { session_id: "s1", amount: 10000 },
    } as any)

    expect(result.status).toBe("authorized")
    expect(refundCreateMock).not.toHaveBeenCalled()
  })

  it("refunds and errors out when an approved payment's amount doesn't match the session", async () => {
    searchMock.mockResolvedValue({
      results: [{ id: "pay1", status: "approved", transaction_amount: 5000 }],
    })

    const result = await service.authorizePayment({
      data: { session_id: "s1", amount: 10000 },
    } as any)

    expect(result.status).toBe("error")
    expect((result.data as any).amount_mismatch).toBe(true)
    expect(refundCreateMock).toHaveBeenCalledWith({
      payment_id: "pay1",
      body: { amount: 5000 },
    })
  })

  it.each(["pending", "in_process"])(
    "returns pending_authorization for a %s payment",
    async (status) => {
      searchMock.mockResolvedValue({
        results: [{ id: "pay1", status, transaction_amount: 10000 }],
      })

      const result = await service.authorizePayment({
        data: { session_id: "s1", amount: 10000 },
      } as any)

      expect(result.status).toBe("pending_authorization")
    }
  )

  it("errors out for a rejected/other payment status", async () => {
    searchMock.mockResolvedValue({
      results: [{ id: "pay1", status: "rejected", transaction_amount: 10000 }],
    })

    const result = await service.authorizePayment({
      data: { session_id: "s1", amount: 10000 },
    } as any)

    expect(result.status).toBe("error")
  })

  it("errors out immediately when there's no session_id, without calling the provider", async () => {
    const result = await service.authorizePayment({ data: {} } as any)

    expect(result.status).toBe("error")
    expect(searchMock).not.toHaveBeenCalled()
  })
})
