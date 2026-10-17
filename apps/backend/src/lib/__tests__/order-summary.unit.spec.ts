import { buildOrderSummary } from "../order-summary"

const baseOrder = {
  id: "order_1",
  display_id: 1042,
  status: "pending",
  created_at: "2026-10-01T10:00:00Z",
  total: 39382,
  currency_code: "clp",
  payment_collections: [{ status: "completed", amount: 39382, captured_amount: 39382 }],
  fulfillments: [] as any[],
}

describe("buildOrderSummary", () => {
  it("copia los datos básicos y deriva los estados", () => {
    const summary = buildOrderSummary(baseOrder)
    expect(summary).toMatchObject({
      id: "order_1",
      display_id: 1042,
      total: 39382,
      currency_code: "clp",
      payment_status: "captured",
      fulfillment_status: "not_fulfilled",
    })
    expect(summary.fulfillments).toEqual([])
  })

  it("expone tracking pero no el resto de fulfillment.data", () => {
    const summary = buildOrderSummary({
      ...baseOrder,
      fulfillments: [
        {
          id: "ful_1",
          shipped_at: "2026-10-02T10:00:00Z",
          delivered_at: null,
          canceled_at: null,
          labels: [{ tracking_number: "99482910482", tracking_url: "" }],
          data: {
            tracking_status: "En ruta",
            tracking_events: [{ code: "4" }],
            label_pdf: "SECRETO",
            tracking_certificate_url: "https://cert.chilexpress.cl/x.pdf",
          },
        },
      ],
    })
    const [f] = summary.fulfillments
    expect(f.tracking_status).toBe("En ruta")
    expect(f.tracking_events).toEqual([{ code: "4" }])
    expect(f.tracking_certificate_url).toBe("https://cert.chilexpress.cl/x.pdf")
    expect(JSON.stringify(summary)).not.toContain("SECRETO")
  })

  it("descarta certificados que no son https", () => {
    const summary = buildOrderSummary({
      ...baseOrder,
      fulfillments: [{ id: "f", labels: [], data: { tracking_certificate_url: "javascript:alert(1)" } }],
    })
    expect(summary.fulfillments[0].tracking_certificate_url).toBeNull()
  })
})
