import { decideOrderEmail, CONFIRMATION_FLAG, PENDING_PAYMENT_FLAG } from "../order-notifications"
import { isOrderPaid } from "../order-status"
import { orderPaymentPendingEmail } from "../email-templates"

const captured = [{ status: "completed", amount: 1000, captured_amount: 1000 }]
const authorized = [{ status: "authorized", amount: 1000, captured_amount: 0 }]
const awaiting = [{ status: "not_paid", amount: 1000, captured_amount: 0 }]
const canceled = [{ status: "canceled", amount: 1000, captured_amount: 0 }]

describe("isOrderPaid", () => {
  it("captured y authorized cuentan como pagado; awaiting y canceled no", () => {
    expect(isOrderPaid(captured)).toBe(true)
    expect(isOrderPaid(authorized)).toBe(true)
    expect(isOrderPaid(awaiting)).toBe(false)
    expect(isOrderPaid(canceled)).toBe(false)
    expect(isOrderPaid([])).toBe(false)
    expect(isOrderPaid(undefined)).toBe(false)
  })
})

describe("decideOrderEmail", () => {
  it("pagado: confirma una sola vez", () => {
    expect(decideOrderEmail({ payment_collections: captured })).toBe("confirmation")
    expect(decideOrderEmail({ payment_collections: authorized })).toBe("confirmation")
    expect(decideOrderEmail({ payment_collections: captured, metadata: { [CONFIRMATION_FLAG]: true } })).toBe("skip")
  })

  it("esperando pago: avisa una sola vez, sin confirmar", () => {
    expect(decideOrderEmail({ payment_collections: awaiting })).toBe("payment_pending")
    expect(decideOrderEmail({ payment_collections: awaiting, metadata: { [PENDING_PAYMENT_FLAG]: true } })).toBe("skip")
  })

  it("después de pagar sí confirma aunque ya se hubiera avisado que esperábamos el pago", () => {
    expect(decideOrderEmail({ payment_collections: captured, metadata: { [PENDING_PAYMENT_FLAG]: true } })).toBe("confirmation")
  })

  it("no vuelve a avisar 'esperando pago' si la confirmación ya salió", () => {
    expect(decideOrderEmail({ payment_collections: awaiting, metadata: { [CONFIRMATION_FLAG]: true } })).toBe("skip")
  })

  it("pago cancelado: no envía nada", () => {
    expect(decideOrderEmail({ payment_collections: canceled })).toBe("skip")
  })
})

describe("orderPaymentPendingEmail", () => {
  it("dice que se espera el pago y no que el pedido fue confirmado", () => {
    const { subject, html } = orderPaymentPendingEmail({ display_id: 3, total: 72382 })
    expect(subject).toContain("esperando tu pago")
    expect(html).toContain("esperando que se confirme tu pago")
    expect(html).not.toContain("fue confirmado")
  })
})
