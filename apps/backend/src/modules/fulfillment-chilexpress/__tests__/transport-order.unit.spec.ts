import {
  buildTransportOrderRequest,
  createTransportOrder,
  splitStreet,
  type TransportOrderInput,
} from "../transport-order"

const input: TransportOrderInput = {
  options: { apiKey: "k", customerCardNumber: "18578680", rut: "96756430" },
  sender: {
    name: "max poblete",
    phone: "+56926105950",
    email: "tienda@kinetic.cl",
    address: "Diputado Francisco Encina Romadries 2212",
    coverageCode: "PROV",
  },
  recipient: { name: "test test", phone: "+56926262626", email: "c@test.cl" },
  destination: { address: "asfd 1111", supplement: "sadf", coverageCode: "ALHU" },
  package: { weightKg: 0.5, heightCm: 20, widthCm: 15, lengthCm: 10, declaredValue: 32990 },
  serviceCode: 3,
  reference: "5",
}

describe("splitStreet", () => {
  it("splits the trailing number from the street name", () => {
    expect(splitStreet("av goycolea 100")).toEqual({ streetName: "av goycolea", streetNumber: "100" })
    expect(splitStreet("Diputado Francisco Encina Romadries 2212")).toEqual({
      streetName: "Diputado Francisco Encina Romadries",
      streetNumber: "2212",
    })
  })

  it("keeps the whole text as the street when there's no trailing number", () => {
    expect(splitStreet("Camino sin numero")).toEqual({ streetName: "Camino sin numero", streetNumber: "" })
  })
})

describe("buildTransportOrderRequest", () => {
  it("builds the header, DEST/DEV addresses, R/D contacts and package", () => {
    const body = buildTransportOrderRequest(input)

    expect(body.header).toMatchObject({
      customerCardNumber: "18578680",
      countyOfOriginCoverageCode: "PROV",
      labelType: 2,
      sellerRut: "96756430",
    })
    const [dest, dev] = body.details[0].addresses
    expect(dest).toMatchObject({
      addressType: "DEST",
      countyCoverageCode: "ALHU",
      streetName: "asfd",
      streetNumber: "1111",
      supplement: "sadf",
      deliveryOnCommercialOffice: false,
    })
    expect(dev).toMatchObject({ addressType: "DEV", countyCoverageCode: "PROV", streetNumber: "2212" })
    expect(body.details[0].contacts.map((c) => c.contactType)).toEqual(["R", "D"])
    expect(body.details[0].packages[0]).toMatchObject({
      weight: "0.50",
      length: "10",
      serviceDeliveryCode: "3",
      productCode: "3",
      deliveryReference: "5",
      declaredValue: "32990",
    })
  })
})

describe("createTransportOrder", () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("posts to the test host and returns the OT number and label", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          header: { certificateNumber: 712100832940 },
          detail: [
            {
              transportOrderNumber: 712100833404,
              reference: "5",
              serviceDescription: "CHEX",
              barcode: "6100",
              label: { labelData: "BASE64" },
            },
          ],
        },
        statusCode: 0,
        statusDescription: "Extraccion exitosa",
        errors: null,
      }),
    })

    const result = await createTransportOrder({
      ...input,
      options: { ...input.options, baseUrl: "http://testservices.wschilexpress.com" },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://testservices.wschilexpress.com/transport-orders/api/v1.0/transport-orders",
      expect.objectContaining({ method: "POST" })
    )
    expect(result).toMatchObject({
      transportOrderNumber: "712100833404",
      certificateNumber: "712100832940",
      service: "CHEX",
      labelData: "BASE64",
    })
  })

  it("throws with Chilexpress's own error text when the order is rejected", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        statusCode: 90,
        statusDescription: "El JSON de entrada no es válido",
        errors: ["The CustomerCardNumber field is required."],
      }),
    })

    await expect(createTransportOrder(input)).rejects.toThrow(
      /El JSON de entrada no es válido.*CustomerCardNumber/
    )
  })
})
