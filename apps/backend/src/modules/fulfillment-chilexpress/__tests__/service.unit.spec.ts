import { MedusaError } from "@medusajs/framework/utils"
import ChilexpressFulfillmentProviderService from "../service"

describe("ChilexpressFulfillmentProviderService.createFulfillment", () => {
  const baseOptions = {
    apiKey: "k",
    coberturaApiKey: "c",
    originCoverageCode: "OVAL",
    envios: { apiKey: "e", customerCardNumber: "18578680", rut: "96756430" },
  }

  it("creates the fulfillment without a tracking number when Envíos isn't configured", async () => {
    const service = new ChilexpressFulfillmentProviderService({}, { apiKey: "k" })

    await expect(service.createFulfillment({}, [], undefined, {})).resolves.toEqual({
      data: {},
      labels: [],
    })
  })

  it("surfaces the real reason as a MedusaError instead of a generic unknown_error", async () => {
    // Sender data missing: a plain Error here would reach the admin as "unknown_error".
    const service = new ChilexpressFulfillmentProviderService({}, baseOptions as any)
    jest.spyOn(console, "error").mockImplementation(() => undefined)

    const promise = service.createFulfillment({}, [], { id: "order_1" } as any, {})

    await expect(promise).rejects.toBeInstanceOf(MedusaError)
    await expect(promise).rejects.toThrow(/datos del remitente/)
  })
})
