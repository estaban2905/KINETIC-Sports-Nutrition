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

jest.mock("../coverage", () => ({
  resolveCountyCode: jest.fn(async (name?: string | null) => (name === "Ovalle" ? "OVAL" : null)),
}))

describe("ChilexpressFulfillmentProviderService.calculatePrice", () => {
  const options = {
    apiKey: "k",
    coberturaApiKey: "c",
    originCoverageCode: "OVAL",
    fallbackRate: 3990,
  }
  const context = {
    shipping_address: { city: "Ovalle" },
    items: [{ variant: { weight: 1000 }, quantity: 1, unit_price: 30000 }],
  } as any
  const quote = (services: { serviceTypeCode: number; serviceValue: string }[]) => ({
    status: 200,
    ok: true,
    json: async () => ({ data: { courierServiceOptions: services } }),
  })

  afterEach(() => jest.restoreAllMocks())

  it("returns the cheapest live quote", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      quote([
        { serviceTypeCode: 2, serviceValue: "8491" },
        { serviceTypeCode: 3, serviceValue: "5661" },
      ]) as any
    )
    const service = new ChilexpressFulfillmentProviderService({}, options)

    await expect(service.calculatePrice({}, {}, context)).resolves.toEqual({
      calculated_amount: 5661,
      is_calculated_price_tax_inclusive: true,
    })
  })

  it("retries a 502 and uses the quote from the next attempt", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ status: 502, ok: false } as any)
      .mockResolvedValueOnce(quote([{ serviceTypeCode: 3, serviceValue: "5661" }]) as any)
    const service = new ChilexpressFulfillmentProviderService({}, options)

    await expect(service.calculatePrice({}, {}, context)).resolves.toMatchObject({
      calculated_amount: 5661,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("throws (no fallback rate) when Chilexpress has no service for the comuna", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(quote([]) as any)
    const service = new ChilexpressFulfillmentProviderService({}, options)

    await expect(service.calculatePrice({}, {}, context)).rejects.toBeInstanceOf(MedusaError)
    expect(fetchMock).toHaveBeenCalledTimes(1) // an empty 200 is final, not retried
  })

  it("throws (no fallback rate) when Chilexpress keeps failing after retries", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ status: 502, ok: false } as any)
    const service = new ChilexpressFulfillmentProviderService({}, options)

    await expect(service.calculatePrice({}, {}, context)).rejects.toThrow(/502/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("throws when the comuna isn't one Chilexpress recognizes", async () => {
    const service = new ChilexpressFulfillmentProviderService({}, options)
    const unknown = { ...context, shipping_address: { city: "Narnia" } }

    await expect(service.calculatePrice({}, {}, unknown)).rejects.toBeInstanceOf(MedusaError)
  })

  it("still uses the flat rate when no Chilexpress API key is configured at all", async () => {
    const service = new ChilexpressFulfillmentProviderService({}, { fallbackRate: 3990 })

    await expect(service.calculatePrice({}, {}, context)).resolves.toMatchObject({
      calculated_amount: 3990,
    })
  })
})
