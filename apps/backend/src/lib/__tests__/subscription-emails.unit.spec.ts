import { buildSubscriptionEmail, formatBillingDate, type SubscriptionEmailContext } from "../subscription-emails"

const ctx = (over: Partial<SubscriptionEmailContext> = {}): SubscriptionEmailContext => ({
  firstName: "Ana",
  productLabel: "GOLD STANDARD 100% WHEY · Chocolate / 2 Libras",
  quantity: 2,
  discountPercent: 15,
  frequencyDays: 30,
  amount: 112184,
  billingDate: "2026-11-27",
  cardLabel: "Visa •••• 6623",
  ...over,
})

describe("formatBillingDate", () => {
  it("escribe la fecha en español sin depender de la zona horaria", () => {
    expect(formatBillingDate("2026-10-28")).toBe("28 de octubre de 2026")
    expect(formatBillingDate("2027-01-05")).toBe("5 de enero de 2027")
  })
  it("deja pasar lo que no es una fecha", () => {
    expect(formatBillingDate("pronto")).toBe("pronto")
  })
})

describe("correos de suscripción", () => {
  beforeEach(() => {
    process.env.STOREFRONT_URL = "https://kinetic.cl/"
  })
  afterEach(() => {
    delete process.env.STOREFRONT_URL
  })

  it("activa: dice el descuento, la fecha del próximo cobro y enlaza a la cuenta", () => {
    const { subject, html } = buildSubscriptionEmail("active", ctx())
    expect(subject).toContain("activa")
    expect(html).toContain("15% menos")
    expect(html).toContain("27 de noviembre de 2026")
    expect(html).toContain("cada mes")
    expect(html).toContain('href="https://kinetic.cl/cuenta?tab=membership"')
  })

  it("una frecuencia distinta de 30 días se expresa en días", () => {
    expect(buildSubscriptionEmail("active", ctx({ frequencyDays: 45 })).html).toContain("cada 45 días")
  })

  it("aviso previo: monto, fecha, tarjeta y cómo cambiarlo", () => {
    const { subject, html } = buildSubscriptionEmail("reminder", ctx())
    expect(subject).toContain("27 de noviembre de 2026")
    expect(html).toContain("$112.184")
    expect(html).toContain("Visa •••• 6623")
    expect(html).toContain("pausar o cancelar")
  })

  it("cobro rechazado con reintento: anuncia el día", () => {
    const { html } = buildSubscriptionEmail("payment_failed", ctx({ retryOn: "2026-10-29" }))
    expect(html).toContain("29 de octubre de 2026")
    expect(html).toContain("Actualizar mi tarjeta")
  })

  it("cobro rechazado definitivo (past_due): explica que quedó detenida y cómo reactivarla", () => {
    const { subject, html } = buildSubscriptionEmail("payment_failed", ctx({ pastDue: true, retryOn: null }))
    expect(subject).toContain("Detuvimos")
    expect(html).toContain("reactivarla")
    expect(html).not.toContain("Volveremos a intentarlo")
  })

  it("sin stock: aclara que no se cobró", () => {
    const { html } = buildSubscriptionEmail("skipped_no_stock", ctx())
    expect(html).toContain("no te cobramos")
    expect(html).toContain("27 de noviembre de 2026")
  })

  it("pausa y cancelación confirman que no habrá cobros", () => {
    expect(buildSubscriptionEmail("paused", ctx()).html).toContain("No se hará ningún cobro")
    const cancelled = buildSubscriptionEmail("cancelled", ctx()).html
    expect(cancelled).toContain("No habrá más cobros")
    expect(cancelled).toContain("dimos de baja tu tarjeta")
  })

  it("escapa el nombre y el producto (vienen del cliente / del catálogo)", () => {
    const { html } = buildSubscriptionEmail("active", ctx({ firstName: "<script>x</script>", productLabel: "A & B" }))
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("A &amp; B")
  })

  it("sin nombre ni STOREFRONT_URL funciona (sin botón)", () => {
    delete process.env.STOREFRONT_URL
    const { html } = buildSubscriptionEmail("active", ctx({ firstName: null }))
    expect(html).toContain("Hola.")
    expect(html).not.toContain("Administrar mi suscripción")
  })
})
