import { googleEmailFromIdentity } from "../google-link"

describe("googleEmailFromIdentity", () => {
  it("devuelve el correo de la identidad de Google en minúsculas", () => {
    expect(
      googleEmailFromIdentity({
        provider_identities: [{ provider: "google", user_metadata: { email: " Ana@Gmail.com " } }],
      })
    ).toBe("ana@gmail.com")
  })

  it("ignora otros proveedores y datos incompletos", () => {
    expect(googleEmailFromIdentity({})).toBeNull()
    expect(googleEmailFromIdentity({ provider_identities: [{ provider: "emailpass", user_metadata: { email: "a@b.cl" } }] })).toBeNull()
    expect(googleEmailFromIdentity({ provider_identities: [{ provider: "google", user_metadata: {} }] })).toBeNull()
    expect(googleEmailFromIdentity({ provider_identities: [{ provider: "google", user_metadata: { email: 5 } }] })).toBeNull()
  })
})
