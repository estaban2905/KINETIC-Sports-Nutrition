import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceContext,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
} from "@medusajs/framework/types"
import { resolveCountyCode } from "./coverage"
import { createTransportOrder, type EnviosOptions, type SenderInfo } from "./transport-order"

type ChilexpressOptions = {
  apiKey?: string
  baseUrl?: string
  /** Origin comuna/coverage code your warehouse ships from (e.g. "PROV" for Providencia). */
  originCoverageCode?: string
  /** CLP fallback rate used when Chilexpress isn't configured or the API call fails. */
  fallbackRate?: number
  /** Subscription key for the separate Coverage/GeoReference API, used to resolve the customer's comuna to a countyCode. */
  coberturaApiKey?: string
  coberturaBaseUrl?: string
  /**
   * Package dimensions in cm, used for every quote regardless of cart
   * contents. Medusa's variant model does support real per-variant
   * height/width/length (see CartPropsForFulfillment in
   * @medusajs/types/dist/fulfillment/common/cart.d.ts), but none of this
   * store's products have that data yet — a fixed box is the honest
   * approximation until they do.
   */
  defaultPackageHeightCm?: number
  defaultPackageWidthCm?: number
  defaultPackageLengthCm?: number
  /**
   * Envíos API (creates the transport order). Separate subscription key from
   * the rating/coverage ones. Optional: without it, "Create fulfillment"
   * still works but no tracking number is generated.
   */
  envios?: EnviosOptions
  /** Who the package is shipped from — warehouse contact and address. */
  sender?: SenderInfo
}

const DEFAULT_FALLBACK_RATE = 3990
const DEFAULT_PACKAGE_HEIGHT_CM = 20
const DEFAULT_PACKAGE_WIDTH_CM = 15
const DEFAULT_PACKAGE_LENGTH_CM = 10
const DEFAULT_ITEM_WEIGHT_GRAMS = 500
const QUOTE_MAX_RETRIES = 2
const QUOTE_RETRY_DELAY_MS = 300

type CourierServiceOption = {
  serviceTypeCode: number
  serviceDescription: string
  serviceValue: string
}

/**
 * Real Chilexpress rate quoting. The flat `fallbackRate` only applies when no
 * CHILEXPRESS_API_KEY is configured at all (local dev); a live quote that
 * fails or has no service is an error, never a made-up price.
 *
 * Verified 2026-09-27 against the real Cotizador + Coverage APIs (both
 * subscriptions active). The rating endpoint needs Chilexpress's own
 * countyCode (e.g. "PROV"), not a comuna name or region — that code is
 * resolved from `shipping_address.city` via the Coverage API in ./coverage.ts.
 */
class ChilexpressFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static readonly identifier = "chilexpress"

  protected options_: ChilexpressOptions

  constructor(_cradle: Record<string, unknown>, options: ChilexpressOptions) {
    super()
    this.options_ = options
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "chilexpress_standard", name: "Chilexpress Estándar" }]
  }

  async validateOption(): Promise<boolean> {
    return true
  }

  // Required by AbstractFulfillmentProviderService — called by Medusa's
  // add-shipping-method-to-cart workflow before the shipping method can be
  // added, not just when displaying the calculated price. Without an
  // override, the base class throws "must be overridden by the child class"
  // and the whole request 500s, even though calculatePrice already
  // succeeded (with the fallback rate or a real quote). We don't need to
  // transform anything here, same as Medusa's own manual-fulfillment provider.
  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return data
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  /**
   * Rating call shared by checkout (calculatePrice) and the transport order
   * (createFulfillment, which needs the service code of the same tier the
   * customer was quoted). Throws on any failure — callers decide whether
   * that degrades to a fallback or blocks.
   */
  protected async quoteCheapestService(args: {
    destinationCountyCode: string
    totalWeightGrams: number
    declaredWorth: number
  }): Promise<CourierServiceOption> {
    const url = `${this.options_.baseUrl ?? "https://services.wschilexpress.com"}/rating/api/v1.0/rates/courier`
    const body = JSON.stringify({
      originCountyCode: this.options_.originCoverageCode,
      destinationCountyCode: args.destinationCountyCode,
      package: {
        weight: (Math.max(1, args.totalWeightGrams) / 1000).toFixed(2),
        height: this.options_.defaultPackageHeightCm ?? DEFAULT_PACKAGE_HEIGHT_CM,
        width: this.options_.defaultPackageWidthCm ?? DEFAULT_PACKAGE_WIDTH_CM,
        length: this.options_.defaultPackageLengthCm ?? DEFAULT_PACKAGE_LENGTH_CM,
      },
      productType: 3, // 3 = Encomienda
      contentType: 5, // 5 = Otros — no hay una categoría de suplementos/nutrición
      declaredWorth: Math.max(1, args.declaredWorth),
      deliveryTime: 0, // 0 = todos los servicios disponibles
    })

    // The rating API intermittently answers 502 under load (seen when quoting
    // many comunas in a row), so a 5xx or a timeout is retried before giving
    // up. A 4xx or a normal 200 is final and not retried.
    let response: Response | undefined
    let lastError: unknown
    for (let attempt = 0; attempt <= QUOTE_MAX_RETRIES; attempt++) {
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": this.options_.apiKey!,
          },
          body,
          // Without a timeout, a slow/hanging Chilexpress response blocks
          // checkout indefinitely.
          signal: AbortSignal.timeout(3000),
        })
        if (response.status < 500) break
        lastError = new Error(`Chilexpress respondió ${response.status}`)
      } catch (error) {
        response = undefined
        lastError = error
      }
      if (attempt < QUOTE_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, QUOTE_RETRY_DELAY_MS))
      }
    }
    if (!response) throw lastError

    if (!response.ok) {
      throw new Error(`Chilexpress respondió ${response.status}`)
    }

    const data = (await response.json()) as {
      data?: { courierServiceOptions?: CourierServiceOption[] }
    }
    const options = data.data?.courierServiceOptions ?? []
    // Multiple service tiers (PRIORITARIO, EXPRESS, etc.) come back for the
    // same origin/destination — we only expose one "Chilexpress" option in
    // the storefront, so quote the cheapest one available.
    const cheapest = options.reduce<CourierServiceOption | null>((best, option) => {
      const value = Number(option.serviceValue)
      if (!Number.isFinite(value)) return best
      if (!best || value < Number(best.serviceValue)) return option
      return best
    }, null)

    if (!cheapest) {
      // 200 with an empty courierServiceOptions list: Chilexpress knows the
      // comuna but has no service for this origin/destination. NOT_ALLOWED
      // maps to a 4xx, so it isn't reported to Sentry as a server failure.
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Chilexpress no tiene un servicio de envío disponible para esta comuna."
      )
    }
    return cheapest
  }

  /**
   * Called by Medusa when the admin presses "Create fulfillment". Creates the
   * Chilexpress transport order and returns its number as the tracking
   * number, which Medusa stores on the fulfillment's labels (what the
   * storefront's order lookup reads). If the Envíos API isn't configured the
   * fulfillment is still created, just without a tracking number — the same
   * manual flow as before. If Chilexpress rejects the order, this throws and
   * Medusa discards the fulfillment, so the admin sees the real error instead
   * of a "fulfilled" order with no shipment.
   */
  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    try {
      return await this.createTransportOrderFulfillment(data, items, order, fulfillment)
    } catch (error) {
      // Medusa's HTTP error handler hides the message of anything that isn't
      // a MedusaError behind a generic "unknown_error" — which left the admin
      // (and us) blind to why Chilexpress rejected the order.
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[chilexpress] createFulfillment falló: ${message}`)
      if (error instanceof MedusaError) throw error
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }
  }

  protected async createTransportOrderFulfillment(
    _data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    _fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const { envios, sender } = this.options_
    if (!envios?.apiKey || !envios.customerCardNumber) {
      return { data: {}, labels: [] }
    }
    if (!sender?.name || !sender.phone || !sender.email || !sender.address) {
      throw new Error("Chilexpress: faltan los datos del remitente (CHILEXPRESS_SENDER_*).")
    }
    if (!this.options_.coberturaApiKey || !this.options_.originCoverageCode) {
      throw new Error("Chilexpress: faltan CHILEXPRESS_COBERTURA_API_KEY o CHILEXPRESS_ORIGIN_CODE.")
    }

    const address = order?.shipping_address
    if (!order || !address?.address_1 || !address.city) {
      throw new Error("Chilexpress: el pedido no tiene dirección de envío.")
    }

    const destinationCountyCode = await resolveCountyCode(address.city, {
      apiKey: this.options_.coberturaApiKey,
      baseUrl: this.options_.coberturaBaseUrl,
    })
    if (!destinationCountyCode) {
      throw new Error(`Chilexpress: no se pudo resolver la comuna "${address.city}".`)
    }

    // Only what's being shipped in THIS fulfillment, not the whole order.
    const orderItems = (order.items ?? []) as any[]
    const shipped = items.map((item) => {
      const line = orderItems.find((o) => o.id === (item as any).line_item_id)
      return { quantity: Number(item.quantity ?? 1), line }
    })
    const totalWeightGrams = shipped.reduce(
      (sum, { quantity, line }) =>
        sum + (Number(line?.variant?.weight) || DEFAULT_ITEM_WEIGHT_GRAMS) * quantity,
      0
    )
    const declaredWorth = shipped.reduce(
      (sum, { quantity, line }) => sum + Number(line?.unit_price ?? 0) * quantity,
      0
    )

    let service: CourierServiceOption
    try {
      service = await this.quoteCheapestService({
        destinationCountyCode,
        totalWeightGrams,
        declaredWorth,
      })
    } catch (error) {
      throw new Error(
        `Chilexpress no tiene un servicio de envío disponible desde ${this.options_.originCoverageCode} ` +
          `hacia ${address.city} (${destinationCountyCode}). Elige otra comuna de destino o ` +
          `coordina este envío por otro medio. Detalle: ${error instanceof Error ? error.message : error}`
      )
    }

    const recipientName =
      [address.first_name, address.last_name].filter(Boolean).join(" ") || order.email || "Cliente"

    const result = await createTransportOrder({
      options: envios,
      sender,
      recipient: {
        name: recipientName,
        phone: address.phone ?? "",
        email: order.email ?? "",
      },
      destination: {
        address: address.address_1,
        supplement: address.address_2 ?? undefined,
        coverageCode: destinationCountyCode,
      },
      package: {
        weightKg: Math.max(1, totalWeightGrams) / 1000,
        heightCm: this.options_.defaultPackageHeightCm ?? DEFAULT_PACKAGE_HEIGHT_CM,
        widthCm: this.options_.defaultPackageWidthCm ?? DEFAULT_PACKAGE_WIDTH_CM,
        lengthCm: this.options_.defaultPackageLengthCm ?? DEFAULT_PACKAGE_LENGTH_CM,
        declaredValue: declaredWorth,
      },
      serviceCode: service.serviceTypeCode,
      reference: String(order.display_id),
    })

    return {
      data: {
        transport_order_number: result.transportOrderNumber,
        certificate_number: result.certificateNumber,
        reference: result.reference,
        service: result.service,
        barcode: result.barcode,
        label_data: result.labelData,
      },
      labels: [
        {
          tracking_number: result.transportOrderNumber,
          // Public tracking URL not documented in the Envíos API; to be
          // confirmed with Chilexpress. The OT number is still shown.
          tracking_url: "",
          label_url: "",
        },
      ],
    }
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceContext
  ): Promise<CalculatedShippingOptionPrice> {
    const fallbackRate = this.options_.fallbackRate ?? DEFAULT_FALLBACK_RATE

    if (!this.options_.apiKey) {
      return { calculated_amount: fallbackRate, is_calculated_price_tax_inclusive: true }
    }

    if (!this.options_.originCoverageCode) {
      throw new Error("CHILEXPRESS_ORIGIN_CODE no está configurado")
    }
    if (!this.options_.coberturaApiKey) {
      throw new Error("CHILEXPRESS_COBERTURA_API_KEY no está configurado")
    }

    // Chilexpress rates by countyCode, not by comuna name/region — resolve
    // the customer's comuna (stored in shipping_address.city, see
    // CartDrawer.tsx's checkout form) through the Coverage API.
    const destinationCountyCode = await resolveCountyCode(context.shipping_address?.city, {
      apiKey: this.options_.coberturaApiKey,
      baseUrl: this.options_.coberturaBaseUrl,
    })
    if (!destinationCountyCode) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Chilexpress no reconoce la comuna "${context.shipping_address?.city}".`
      )
    }

    // None of this store's product variants have `weight` set yet (all
    // null as of 2026-09-27) — Chilexpress rejects a 0kg package, so an
    // unweighted item falls back to DEFAULT_ITEM_WEIGHT_GRAMS instead of
    // silently sending 0. Fix the real weights on the products for
    // accurate quotes; this is just what keeps checkout from breaking
    // until then.
    const totalWeightGrams = (context.items ?? []).reduce(
      (sum, item) => sum + (item.variant?.weight || DEFAULT_ITEM_WEIGHT_GRAMS) * Number(item.quantity),
      0
    )
    const declaredWorth = Math.round(
      (context.items ?? []).reduce(
        (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
        0
      )
    )

    // No fallback rate here on purpose: if Chilexpress has no service for the
    // comuna (or stays down after retries) this throws, so the storefront
    // can tell the customer at the address step instead of charging an
    // invented price and failing later at fulfillment.
    const cheapest = await this.quoteCheapestService({
      destinationCountyCode,
      totalWeightGrams,
      declaredWorth,
    })

    return { calculated_amount: Number(cheapest.serviceValue), is_calculated_price_tax_inclusive: true }
  }
}

export default ChilexpressFulfillmentProviderService
