import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceContext,
  CalculateShippingOptionPriceDTO,
  CreateShippingOptionDTO,
  FulfillmentOption,
} from "@medusajs/framework/types"

type ChilexpressOptions = {
  apiKey?: string
  baseUrl?: string
  /** Origin comuna/coverage code your warehouse ships from. */
  originCoverageCode?: string
  /** CLP fallback rate used when Chilexpress isn't configured or the API call fails. */
  fallbackRate?: number
}

const DEFAULT_FALLBACK_RATE = 3990

/**
 * Real Chilexpress rate quoting, with a flat-rate fallback.
 *
 * TODO(chilexpress): no developer account/API key exists yet for this
 * project. Once you register at https://developers.chilexpress.cl and get a
 * subscription key, set CHILEXPRESS_API_KEY (and CHILEXPRESS_ORIGIN_CODE)
 * in apps/backend/.env — no code changes needed. Until then, every quote
 * silently uses `fallbackRate` so checkout keeps working.
 *
 * The exact request/response shape of Chilexpress's courier rating
 * endpoint should be re-verified against their current docs/Postman
 * collection once real credentials are available — this call is wrapped in
 * a try/catch specifically so a mismatch never blocks checkout, only
 * degrades to the fallback rate.
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
      const totalWeightGrams = (context.items ?? []).reduce(
        (sum, item) => sum + (item.variant?.weight ?? 0) * Number(item.quantity),
        0
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
            destinationCountyCode: context.shipping_address?.province,
            package: {
              weight: Math.max(1, Math.round(totalWeightGrams / 1000)),
              declaredWeight: Math.max(1, Math.round(totalWeightGrams / 1000)),
            },
            productType: 3,
            deliveryType: 1,
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
        data?: { serviceValue?: { total?: number } }[]
      }
      const amount = data.data?.[0]?.serviceValue?.total
      if (typeof amount !== "number") {
        throw new Error("Respuesta de Chilexpress sin tarifa utilizable")
      }

      return { calculated_amount: amount, is_calculated_price_tax_inclusive: true }
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
