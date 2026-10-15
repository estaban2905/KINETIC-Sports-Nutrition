import { welcomeEmail } from "../email-templates"

describe("welcomeEmail", () => {
  afterEach(() => {
    delete process.env.STOREFRONT_URL
  })

  it("saluda por el nombre, escapado, y enlaza a la tienda si hay STOREFRONT_URL", () => {
    process.env.STOREFRONT_URL = "https://tienda.cl/"
    const { subject, html } = welcomeEmail({ firstName: "<Ana>" })
    expect(subject).toContain("Bienvenido")
    expect(html).toContain("¡Bienvenido, &lt;Ana&gt;!")
    expect(html).toContain('href="https://tienda.cl"')
  })

  it("funciona sin nombre y sin STOREFRONT_URL (sin botón)", () => {
    const { html } = welcomeEmail({ firstName: null })
    expect(html).toContain("¡Bienvenido a KINETIC!")
    expect(html).not.toContain("Ir a la tienda")
  })
})
