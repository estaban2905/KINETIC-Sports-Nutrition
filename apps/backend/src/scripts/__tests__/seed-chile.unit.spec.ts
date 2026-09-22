import { getDesiredPaymentProviders } from "../seed-chile"

describe("getDesiredPaymentProviders", () => {
  const registeredIds = new Set([
    "pp_system_default",
    "pp_webpay_webpay",
    "pp_mercadopago_mercadopago",
    "pp_stripe_stripe",
  ])

  it("excludes pp_system_default in production", () => {
    const providers = getDesiredPaymentProviders("production", registeredIds)

    expect(providers).not.toContain("pp_system_default")
    expect(providers).toEqual(["pp_webpay_webpay", "pp_mercadopago_mercadopago", "pp_stripe_stripe"])
  })

  it.each([undefined, "development", "test"])(
    "includes pp_system_default outside production (NODE_ENV=%s)",
    (nodeEnv) => {
      const providers = getDesiredPaymentProviders(nodeEnv, registeredIds)

      expect(providers).toContain("pp_system_default")
    }
  )

  it("never returns a provider that isn't actually registered", () => {
    const providers = getDesiredPaymentProviders("development", new Set(["pp_webpay_webpay"]))

    expect(providers).toEqual(["pp_webpay_webpay"])
  })
})
