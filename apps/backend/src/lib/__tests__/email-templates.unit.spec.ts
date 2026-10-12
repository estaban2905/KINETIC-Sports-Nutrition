import { deliveryEmail, orderPlacedEmail, shipmentEmail } from "../email-templates"

const order = {
  display_id: 7,
  item_subtotal: 42990,
  discount_total: 4299,
  shipping_total: 3990,
  total: 42681,
  items: [
    { product_title: "ISO <WHEY>", variant_title: "Chocolate", quantity: 1, total: 42990, thumbnail: "https://x.cl/a.png" },
    { product_title: "Shaker", variant_title: "Único", quantity: 2, total: 0, thumbnail: "http://localhost/a.png" },
  ],
  shipping_address: { address_1: "Av. Siempre Viva 742", address_2: null, city: "Ovalle" },
}

describe("email templates", () => {
  afterEach(() => {
    delete process.env.STOREFRONT_URL
  })

  it("order email shows items, discount, shipping and total, escaping user data", () => {
    const { subject, html } = orderPlacedEmail(order)
    expect(subject).toContain("#7")
    expect(html).toContain("ISO &lt;WHEY&gt;")
    expect(html).not.toContain("ISO <WHEY>")
    expect(html).toContain("-$4.299")
    expect(html).toContain("Ovalle")
    expect(html).toContain("https://x.cl/a.png")
    expect(html).not.toContain("http://localhost/a.png")
  })

  it("omits the discount row when there is no discount", () => {
    expect(orderPlacedEmail({ ...order, discount_total: 0 }).html).not.toContain("Descuento")
  })

  it("adds the tracking button only when STOREFRONT_URL is set", () => {
    expect(orderPlacedEmail(order).html).not.toContain("Seguir mi pedido")
    process.env.STOREFRONT_URL = "https://tienda.cl/"
    expect(orderPlacedEmail(order).html).toContain('href="https://tienda.cl/seguimiento"')
  })

  it("shipment email shows the tracking number and the Chilexpress link", () => {
    const { html } = shipmentEmail({ displayId: 7, trackingNumbers: ["123456"], trackingPageUrl: "https://c.cl/s" })
    expect(html).toContain("123456")
    expect(html).toContain("https://c.cl/s")
  })

  it("delivery email links the certificate only when present", () => {
    expect(deliveryEmail({ displayId: 7, certificateUrl: null }).html).not.toContain("certificado")
    expect(deliveryEmail({ displayId: 7, certificateUrl: "https://c.cl/cert" }).html).toContain("https://c.cl/cert")
  })
})
