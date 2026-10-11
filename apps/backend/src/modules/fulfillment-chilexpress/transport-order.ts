// Chilexpress "Envíos" API (Transport-Orders): turns an order into a Chilexpress
// transport order (OT) — the tracking number plus the shipping label. Pure
// request building / response parsing lives here so it can be unit-tested
// without Medusa; service.ts wires it into createFulfillment.

export type EnviosOptions = {
  apiKey: string
  /** Test: http://testservices.wschilexpress.com — Production: https://services.wschilexpress.com */
  baseUrl?: string
  /** Número de Tarjeta Cliente Chilexpress (TCC). Pruebas: 18578680. */
  customerCardNumber: string
  /** RUT de la empresa, sin puntos ni dígito verificador. Pruebas: 96756430. */
  rut?: string
}

export type SenderInfo = {
  name: string
  phone: string
  email: string
  /** Full street line as the warehouse address, e.g. "Diputado Francisco Encina Romadries 2212". */
  address: string
  /** Chilexpress countyCode of the warehouse (CHILEXPRESS_ORIGIN_CODE). */
  coverageCode: string
}

export type PackageInfo = {
  weightKg: number
  heightCm: number
  widthCm: number
  lengthCm: number
  declaredValue: number
}

export type TransportOrderInput = {
  options: EnviosOptions
  sender: SenderInfo
  recipient: { name: string; phone: string; email: string }
  destination: { address: string; supplement?: string; coverageCode: string }
  package: PackageInfo
  /** Chilexpress service code (serviceTypeCode) from the rating API. */
  serviceCode: number
  /** Our own reference for the shipment — the order's display id. */
  reference: string
}

export type TransportOrderResult = {
  transportOrderNumber: string
  certificateNumber: string | null
  reference: string
  service: string | null
  barcode: string | null
  /** Base64 label image (labelType 2). Not exposed to customers. */
  labelData: string | null
}

/**
 * The checkout stores the street and number joined in address_1
 * ("av goycolea 100" — see CartDrawer.tsx), but Chilexpress wants them in
 * separate fields. The number is the trailing numeric token; anything else
 * is treated as just a street name.
 */
export function splitStreet(address: string): { streetName: string; streetNumber: string } {
  const trimmed = address.trim()
  const match = trimmed.match(/^(.*\S)\s+(\d+[A-Za-z]?)$/)
  if (!match) return { streetName: trimmed, streetNumber: "" }
  return { streetName: match[1], streetNumber: match[2] }
}

export function buildTransportOrderRequest(input: TransportOrderInput) {
  const { options, sender, recipient, destination, package: pkg } = input
  const dest = splitStreet(destination.address)
  const origin = splitStreet(sender.address)

  return {
    header: {
      customerCardNumber: options.customerCardNumber,
      countyOfOriginCoverageCode: sender.coverageCode,
      // 2 = binary image + data
      labelType: 2,
      ...(options.rut ? { marketplaceRut: options.rut, sellerRut: options.rut } : {}),
    },
    details: [
      {
        addresses: [
          {
            addressId: 0,
            countyCoverageCode: destination.coverageCode,
            streetName: dest.streetName,
            streetNumber: dest.streetNumber,
            supplement: destination.supplement ?? "",
            addressType: "DEST",
            deliveryOnCommercialOffice: false,
          },
          {
            addressId: 0,
            countyCoverageCode: sender.coverageCode,
            streetName: origin.streetName,
            streetNumber: origin.streetNumber,
            supplement: "",
            addressType: "DEV",
            deliveryOnCommercialOffice: false,
          },
        ],
        contacts: [
          { name: sender.name, phoneNumber: sender.phone, mail: sender.email, contactType: "R" },
          {
            name: recipient.name,
            phoneNumber: recipient.phone,
            mail: recipient.email,
            contactType: "D",
          },
        ],
        packages: [
          {
            weight: pkg.weightKg.toFixed(2),
            height: String(pkg.heightCm),
            width: String(pkg.widthCm),
            // The docs' prose says "lenght" but the sample body and DTO say "length".
            length: String(pkg.lengthCm),
            serviceDeliveryCode: String(input.serviceCode),
            productCode: "3", // 3 = Encomienda
            deliveryReference: input.reference,
            groupReference: "",
            declaredValue: String(Math.max(1, Math.round(pkg.declaredValue))),
            declaredContent: "5", // 5 = Otros
          },
        ],
      },
    ],
  }
}

type TransportOrdersResponse = {
  data?: {
    header?: { certificateNumber?: number | string }
    detail?: Array<{
      transportOrderNumber?: number | string
      reference?: string
      serviceDescription?: string
      barcode?: string
      label?: { labelData?: string }
    }>
  }
  statusCode?: number
  statusDescription?: string
  errors?: string[] | string | null
}

export async function createTransportOrder(
  input: TransportOrderInput
): Promise<TransportOrderResult> {
  const baseUrl = input.options.baseUrl ?? "https://services.wschilexpress.com"
  const response = await fetch(`${baseUrl}/transport-orders/api/v1.0/transport-orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": input.options.apiKey,
    },
    body: JSON.stringify(buildTransportOrderRequest(input)),
    signal: AbortSignal.timeout(15000),
  })

  const body = (await response.json().catch(() => null)) as TransportOrdersResponse | null

  const detail = body?.data?.detail?.[0]
  if (!response.ok || body?.statusCode !== 0 || !detail?.transportOrderNumber) {
    const errors = Array.isArray(body?.errors) ? body?.errors.join("; ") : body?.errors
    throw new Error(
      `Chilexpress no generó la orden de transporte (HTTP ${response.status}, ` +
        `código ${body?.statusCode ?? "?"}): ${body?.statusDescription ?? "sin detalle"}` +
        (errors ? ` — ${errors}` : "")
    )
  }

  return {
    transportOrderNumber: String(detail.transportOrderNumber),
    certificateNumber:
      body?.data?.header?.certificateNumber != null
        ? String(body.data.header.certificateNumber)
        : null,
    reference: detail.reference ?? input.reference,
    service: detail.serviceDescription ?? null,
    barcode: detail.barcode ?? null,
    labelData: detail.label?.labelData || null,
  }
}
