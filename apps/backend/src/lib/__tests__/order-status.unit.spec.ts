import { deriveFulfillmentStatus, derivePaymentStatus } from "../order-status"

describe("derivePaymentStatus", () => {
  it("is captured once the captured amount covers the amount", () => {
    expect(derivePaymentStatus([{ status: "completed", amount: 39382, captured_amount: 39382 }])).toBe("captured")
  })

  it("is authorized when authorized but not captured", () => {
    expect(derivePaymentStatus([{ status: "authorized", amount: 39382, captured_amount: 0 }])).toBe("authorized")
  })

  it("is awaiting with no collections or an unresolved one", () => {
    expect(derivePaymentStatus(undefined)).toBe("awaiting")
    expect(derivePaymentStatus([{ status: "awaiting", amount: 100, captured_amount: 0 }])).toBe("awaiting")
  })

  it("is canceled when every collection is canceled", () => {
    expect(derivePaymentStatus([{ status: "canceled", amount: 100, captured_amount: 0 }])).toBe("canceled")
  })
})

describe("deriveFulfillmentStatus", () => {
  it("is not_fulfilled without active fulfillments (canceled ones don't count)", () => {
    expect(deriveFulfillmentStatus(undefined)).toBe("not_fulfilled")
    expect(deriveFulfillmentStatus([{ canceled_at: "2026-10-11" }])).toBe("not_fulfilled")
  })

  it("moves from fulfilled to shipped to delivered", () => {
    expect(deriveFulfillmentStatus([{}])).toBe("fulfilled")
    expect(deriveFulfillmentStatus([{ shipped_at: "2026-10-11" }])).toBe("shipped")
    expect(deriveFulfillmentStatus([{ shipped_at: "2026-10-11", delivered_at: "2026-10-12" }])).toBe("delivered")
  })

  it("stays at the earliest stage while a fulfillment is still behind", () => {
    expect(
      deriveFulfillmentStatus([{ shipped_at: "2026-10-11", delivered_at: "2026-10-12" }, { shipped_at: "2026-10-11" }])
    ).toBe("shipped")
  })
})
