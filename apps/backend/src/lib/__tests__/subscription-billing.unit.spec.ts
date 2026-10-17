import {
  MAX_CHARGE_ATTEMPTS,
  decideAfterRejection,
  discountedUnitPrice,
  skipUpdate,
  successUpdate,
} from "../subscription-billing"

describe("discountedUnitPrice", () => {
  it("aplica el descuento y redondea a pesos enteros", () => {
    expect(discountedUnitPrice(42990, 15)).toBe(36542) // 36541.5 -> 36542
    expect(discountedUnitPrice(10000, 15)).toBe(8500)
    expect(discountedUnitPrice(9990, 0)).toBe(9990)
    expect(discountedUnitPrice(9990, 100)).toBe(0)
  })

  it("rechaza precios y descuentos inválidos", () => {
    expect(() => discountedUnitPrice(-1, 15)).toThrow(/Precio inválido/)
    expect(() => discountedUnitPrice(NaN, 15)).toThrow(/Precio inválido/)
    expect(() => discountedUnitPrice(1000, -1)).toThrow(/Descuento inválido/)
    expect(() => discountedUnitPrice(1000, 101)).toThrow(/Descuento inválido/)
  })
})

describe("decideAfterRejection", () => {
  const now = new Date("2026-10-28T15:00:00Z")

  it("primer rechazo: reintenta mañana", () => {
    expect(decideAfterRejection(0, now)).toEqual({
      action: "retry",
      failedAttempts: 1,
      nextBillingDate: "2026-10-29",
    })
  })

  it("segundo rechazo: todavía reintenta", () => {
    expect(decideAfterRejection(1, now)).toMatchObject({ action: "retry", failedAttempts: 2 })
  })

  it("agotados los intentos: pasa a past_due", () => {
    expect(decideAfterRejection(MAX_CHARGE_ATTEMPTS - 1, now)).toEqual({
      action: "past_due",
      failedAttempts: MAX_CHARGE_ATTEMPTS,
    })
  })

  it("el reintento se agenda con el día de Chile, no el de UTC", () => {
    // 02:00 UTC del 29 = 23:00 del 28 en Chile.
    expect(decideAfterRejection(0, new Date("2026-10-29T02:00:00Z"))).toMatchObject({
      nextBillingDate: "2026-10-29",
    })
  })
})

describe("successUpdate / skipUpdate", () => {
  const now = new Date("2026-10-28T15:00:00Z")

  it("tras un cobro: limpia rechazos, marca el regalo y avanza desde el día programado", () => {
    expect(successUpdate({ frequency_days: 30 }, "2026-10-28", now)).toEqual({
      failed_attempts: 0,
      welcome_gift_given: true,
      next_billing_date: "2026-11-27",
    })
  })

  it("saltar un ciclo solo avanza la fecha, sin tocar rechazos ni regalo", () => {
    expect(skipUpdate({ frequency_days: 30 }, "2026-10-28", now)).toEqual({ next_billing_date: "2026-11-27" })
  })
})
