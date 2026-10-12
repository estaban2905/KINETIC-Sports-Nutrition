import {
  chilexpressHasPackage,
  deriveCustomerStatus,
  deriveFulfillmentStatus,
  derivePaymentStatus,
} from "../order-status"

describe("chilexpressHasPackage", () => {
  it("is true once any documented Chilexpress event exists", () => {
    for (const code of ["4", "11", "13", "14"]) {
      expect(chilexpressHasPackage([{ code }])).toBe(true)
    }
  })

  it("is false with no events, unknown codes, or events without a code", () => {
    expect(chilexpressHasPackage(undefined)).toBe(false)
    expect(chilexpressHasPackage([])).toBe(false)
    expect(chilexpressHasPackage([{ code: "99" }, { code: null }, {}])).toBe(false)
  })
})

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

describe("deriveCustomerStatus", () => {
  const base = {
    orderStatus: "pending",
    paymentStatus: "captured",
    fulfillmentStatus: "not_fulfilled",
  } as const

  it("follows payment while nothing has been fulfilled", () => {
    expect(deriveCustomerStatus({ ...base, paymentStatus: "awaiting" })).toBe("payment_pending")
    expect(deriveCustomerStatus({ ...base, paymentStatus: "authorized" })).toBe("payment_confirming")
    expect(deriveCustomerStatus(base)).toBe("preparing")
    expect(deriveCustomerStatus({ ...base, paymentStatus: "canceled" })).toBe("canceled")
  })

  it("does not say the package is on its way just because the fulfillment exists", () => {
    // Pendiente + Pago confirmado + Despachado, with Chilexpress still at pre-reception.
    expect(deriveCustomerStatus({ ...base, fulfillmentStatus: "fulfilled" })).toBe("shipment_created")
  })

  it("uses Chilexpress's newest event code over Medusa's flags", () => {
    const events = [
      { at: "2026-09-29T10:00:00Z", code: "4" },
      { at: "2026-09-30T10:00:00Z", code: "11" },
      { at: "2026-10-01T08:00:00Z", code: "13" },
    ]
    const fulfilled = { ...base, fulfillmentStatus: "fulfilled" } as const

    expect(deriveCustomerStatus({ ...fulfilled, trackingEvents: events.slice(0, 1) })).toBe("shipped")
    expect(deriveCustomerStatus({ ...fulfilled, trackingEvents: events.slice(0, 2) })).toBe("in_transit")
    expect(deriveCustomerStatus({ ...fulfilled, trackingEvents: events })).toBe("out_for_delivery")
    expect(
      deriveCustomerStatus({
        ...fulfilled,
        trackingEvents: [...events, { at: "2026-10-01T10:18:00Z", code: "14" }],
      })
    ).toBe("delivered")
  })

  it("ignores event codes it does not know and falls back to the fulfillment state", () => {
    expect(
      deriveCustomerStatus({
        ...base,
        fulfillmentStatus: "shipped",
        trackingEvents: [{ at: "2026-10-01T10:00:00Z", code: "99" }],
      })
    ).toBe("shipped")
  })

  it("is delivered when Medusa says so, and a canceled order wins over everything", () => {
    expect(deriveCustomerStatus({ ...base, fulfillmentStatus: "delivered" })).toBe("delivered")
    expect(
      deriveCustomerStatus({ ...base, orderStatus: "canceled", fulfillmentStatus: "delivered" })
    ).toBe("canceled")
  })
})
