import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceContext,
  CalculateShippingOptionPriceDTO,
  CreateShippingOptionDTO,
  FulfillmentOption,
} from "@medusajs/framework/types"
import { resolveCountyCode } from "./coverage"

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
}

const DEFAULT_FALLBACK_RATE = 3990
const DEFAULT_PACKAGE_HEIGHT_CM = 20
const DEFAULT_PACKAGE_WIDTH_CM = 15
const DEFAULT_PACKAGE_LENGTH_CM = 10
const DEFAULT_ITEM_WEIGHT_GRAMS = 500

type CourierServiceOption = {
  serviceTypeCode: number
  serviceDescription: string
  serviceValue: string
}

/**
 * Real Chilexpress rate quoting, with a flat-rate fallback.
 *
 * Verified 2026-09-27 against the real Cotizador + Coverage APIs (both
 * subscriptions active). The rating endpoint needs Chilexpress's own
 * countyCode (e.g. "PROV"), not a comuna name or region — that code is
 * resolved from `shipping_address.city` via the Coverage API in ./coverage.ts.
 * If that subscription/key isn't configured, or the comuna can't be
 * resolved, or either API call fails, this whole thing degrades to
 * `fallbackRate` — checkout must never block on a shipping quote.
 */
class ChilexpressFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "chilexpress"

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

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceContext
  ): Promise<CalculatedShippingOptionPrice> {
    const fallbackRate = this.options_.fallbackRate ?? DEFAULT_FALLBACK_RATE

    if (!this.options_.apiKey) {
      return { calculated_amount: fallbackRate, is_calculated_price_tax_inclusive: true }
    }

    try {
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
        throw new Error(
          `No se pudo resolver el código de cobertura para la comuna "${context.shipping_address?.city}"`
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

      const response = await fetch(
        `${this.options_.baseUrl ?? "https://services.wschilexpress.com"}/rating/api/v1.0/rates/courier`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": this.options_.apiKey,
          },
          body: JSON.stringify({
            originCountyCode: this.options_.originCoverageCode,
            destinationCountyCode,
            package: {
              weight: (Math.max(1, totalWeightGrams) / 1000).toFixed(2),
              height: this.options_.defaultPackageHeightCm ?? DEFAULT_PACKAGE_HEIGHT_CM,
              width: this.options_.defaultPackageWidthCm ?? DEFAULT_PACKAGE_WIDTH_CM,
              length: this.options_.defaultPackageLengthCm ?? DEFAULT_PACKAGE_LENGTH_CM,
            },
            productType: 3, // 3 = Encomienda
            contentType: 5, // 5 = Otros — no hay una categoría de suplementos/nutrición
            declaredWorth: Math.max(1, declaredWorth),
            deliveryTime: 0, // 0 = todos los servicios disponibles
          }),
          // Without a timeout, a slow/hanging Chilexpress response blocks
          // checkout indefinitely instead of degrading to the fallback rate
          // below — the whole point of having one.
          signal: AbortSignal.timeout(3000),
        }
      )

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
        throw new Error("Chilexpress no devolvió ningún servicio de envío disponible")
      }

      return { calculated_amount: Number(cheapest.serviceValue), is_calculated_price_tax_inclusive: true }
    } catch (error) {
      console.warn(
        `[chilexpress] No se pudo cotizar en vivo, usando tarifa fallback ($${fallbackRate}): ${
          error instanceof Error ? error.message : error
        }`
      )
      return { calculated_amount: fallbackRate, is_calculated_price_tax_inclusive: true }
    }
  }
}

export default ChilexpressFulfillmentProviderService
