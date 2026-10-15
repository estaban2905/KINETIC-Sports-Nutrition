import { passwordResetEmail } from "../email-templates"

describe("passwordResetEmail", () => {
  it("incluye el enlace de restablecimiento escapado", () => {
    const { subject, html } = passwordResetEmail({
      resetUrl: "https://tienda.cl/restablecer?token=abc&email=a%40b.cl",
    })
    expect(subject).toContain("contraseña")
    expect(html).toContain("https://tienda.cl/restablecer?token=abc&amp;email=a%40b.cl")
  })
})
