const mockCreateCart = jest.fn()
const mockCreateCollection = jest.fn()
const mockCreateSessions = jest.fn()
const mockCompleteCart = jest.fn()
const mockGetAvailability = jest.fn()
const mockSeal = jest.fn()
const mockEmailForEvent = jest.fn()
const mockSendEmail = jest.fn()
const mockCaptureException = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  createCartWorkflow: () => ({ run: mockCreateCart }),
  createPaymentCollectionForCartWorkflow: () => ({ run: mockCreateCollection }),
  createPaymentSessionsWorkflow: () => ({ run: mockCreateSessions }),
  completeCartWorkflow: () => ({ run: mockCompleteCart }),
}))
jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { QUERY: "query", LOGGER: "logger", LINK: "link" },
  Modules: { CUSTOMER: "customer", CART: "cart", ORDER: "order" },
  QueryContext: (v: unknown) => v,
  getVariantAvailability: (...a: unknown[]) => mockGetAvailability(...a),
}))
jest.mock("../../modules/subscription", () => ({ SUBSCRIPTION_MODULE: "subscription" }))
jest.mock("../charge-token", () => ({ sealChargeToken: (...a: unknown[]) => mockSeal(...a) }))
jest.mock("../oneclick", () => ({ oneclickUsername: (id: string) => `user-${id}` }))
jest.mock("../subscription-notify", () => ({
  emailForCycleEvent: (...a: unknown[]) => mockEmailForEvent(...a),
  sendSubscriptionEmail: (...a: unknown[]) => mockSendEmail(...a),
}))
jest.mock("../sentry", () => ({ Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a) } }))

import {
  ONECLICK_PROVIDER_ID,
  buildCycleDeps,
  estimateCycleAmount,
  placeSubscriptionOrder,
  variantHasStock,
} from "../subscription-order"
import { SUBSCRIPTION_MODULE } from "../../modules/subscription"

const ADDRESS = { first_name: "Ana", address_1: "Calle 1", city: "Santiago" }

type Setup = {
  regions?: unknown[]
  stores?: unknown[]
  options?: unknown[]
  variantAmount?: unknown
  cartTotal?: unknown
  address?: unknown
  linkFails?: boolean
}

function makeContainer(setup: Setup = {}) {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const graph = jest.fn(async ({ entity }: { entity: string }) => {
    switch (entity) {
      case "region":
        return { data: setup.regions ?? [{ id: "reg1", currency_code: "clp" }] }
      case "store":
        return { data: setup.stores ?? [{ default_sales_channel_id: "sc1" }] }
      case "shipping_option":
        return { data: setup.options ?? [{ id: "so1", name: "Chilexpress" }] }
      case "variant":
        return { data: [{ calculated_price: { calculated_amount: setup.variantAmount ?? 20000 } }] }
      case "cart":
        return { data: [{ total: setup.cartTotal ?? 17000 }] }
      default:
        return { data: [] }
    }
  })
  const subscriptions = {
    retrieveSubscription: jest.fn().mockResolvedValue({
      variant_id: "var1",
      quantity: 2,
      discount_percent: 15,
      payment_token_ref: "tbk-user",
      shipping_address: "address" in setup ? setup.address : ADDRESS,
    }),
  }
  const customerModule = { retrieveCustomer: jest.fn().mockResolvedValue({ email: "ana@test.cl" }) }
  const cartModule = { addShippingMethods: jest.fn().mockResolvedValue(undefined) }
  const link = {
    create: setup.linkFails ? jest.fn().mockRejectedValue(new Error("link down")) : jest.fn().mockResolvedValue(undefined),
  }
  const services: Record<string, unknown> = {
    query: { graph },
    logger,
    link,
    customer: customerModule,
    cart: cartModule,
    [SUBSCRIPTION_MODULE]: subscriptions,
  }
  return {
    container: { resolve: (key: string) => services[key] } as any,
    logger,
    graph,
    subscriptions,
    cartModule,
    link,
  }
}

const SUB = { id: "sub1", customer_id: "cus1", variant_id: "var1", quantity: 2, discount_percent: 15 }
const INPUT = {
  subscription: SUB,
  cycleId: "cyc1",
  periodKey: "2026-11",
  parentBuyOrder: "pbo",
  childBuyOrder: "cbo",
  includeGift: false,
} as any

describe("subscription-order", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateCart.mockResolvedValue({ result: { id: "cart1" } })
    mockCreateCollection.mockResolvedValue({ result: { id: "pc1" } })
    mockCreateSessions.mockResolvedValue({})
    mockCompleteCart.mockResolvedValue({ result: { id: "order1" } })
    mockSeal.mockReturnValue("sealed-token")
  })

  describe("estimateCycleAmount", () => {
    it("applies the subscription discount and multiplies by quantity", async () => {
      const { container } = makeContainer({ variantAmount: 20000 })

      // 20000 con 15% de descuento = 17000, por 2 unidades
      expect(await estimateCycleAmount(container, "sub1")).toBe(34000)
    })

    it("fails when the variant has no CLP price", async () => {
      const { container } = makeContainer({ variantAmount: undefined })
      ;(container.resolve("query").graph as jest.Mock).mockImplementation(async ({ entity }: { entity: string }) =>
        entity === "variant"
          ? { data: [{ calculated_price: null }] }
          : entity === "region"
            ? { data: [{ id: "reg1" }] }
            : entity === "store"
              ? { data: [{ default_sales_channel_id: "sc1" }] }
              : { data: [{ id: "so1", name: "Chilexpress" }] }
      )

      await expect(estimateCycleAmount(container, "sub1")).rejects.toThrow(/no tiene precio en CLP/)
    })

    it("fails when there is no Chilean region", async () => {
      const { container } = makeContainer({ regions: [] })

      await expect(estimateCycleAmount(container, "sub1")).rejects.toThrow(/región de Chile/)
    })

    it("fails when the store has no default sales channel", async () => {
      const { container } = makeContainer({ stores: [{}] })

      await expect(estimateCycleAmount(container, "sub1")).rejects.toThrow(/canal de venta/)
    })

    it("fails when there is no Chilexpress shipping option", async () => {
      const { container } = makeContainer({ options: [] })

      await expect(estimateCycleAmount(container, "sub1")).rejects.toThrow(/opción de envío Chilexpress/)
    })
  })

  describe("variantHasStock", () => {
    const check = async (availability: unknown, quantity = 2) => {
      mockGetAvailability.mockResolvedValue({ var1: availability === "missing" ? undefined : { availability } })
      return variantHasStock(makeContainer().container, { variantId: "var1", quantity })
    }

    it("is true when enough units are available", async () => {
      expect(await check(5)).toBe(true)
      expect(await check(2)).toBe(true)
    })

    it("is false when fewer units than needed are available", async () => {
      expect(await check(1)).toBe(false)
    })

    it("is true when the variant doesn't manage inventory", async () => {
      expect(await check(null)).toBe(true)
    })

    it("is false when Medusa knows nothing about the variant", async () => {
      expect(await check("missing")).toBe(false)
    })
  })

  describe("placeSubscriptionOrder", () => {
    it("builds the cart, charges through Oneclick and returns the order", async () => {
      const { container, cartModule, link } = makeContainer()

      const result = await placeSubscriptionOrder(container, INPUT)

      expect(result).toEqual({ orderId: "order1", total: 17000 })
      const cartInput = mockCreateCart.mock.calls[0][0].input
      expect(cartInput).toMatchObject({
        region_id: "reg1",
        currency_code: "clp",
        sales_channel_id: "sc1",
        customer_id: "cus1",
        email: "ana@test.cl",
        shipping_address: { ...ADDRESS, country_code: "cl" },
        metadata: { subscription_id: "sub1", subscription_cycle_id: "cyc1", subscription_period: "2026-11" },
      })
      expect(cartInput.items).toEqual([
        { variant_id: "var1", quantity: 2, unit_price: 17000, is_tax_inclusive: true },
      ])
      expect(cartModule.addShippingMethods).toHaveBeenCalledWith("cart1", [
        expect.objectContaining({ shipping_option_id: "so1", amount: 0 }),
      ])
      expect(mockCreateSessions.mock.calls[0][0].input).toMatchObject({
        payment_collection_id: "pc1",
        provider_id: ONECLICK_PROVIDER_ID,
        data: { charge_token: "sealed-token" },
      })
      expect(mockSeal).toHaveBeenCalledWith({
        subscriptionId: "sub1",
        cycleId: "cyc1",
        username: "user-cus1",
        tbkUser: "tbk-user",
        parentBuyOrder: "pbo",
        childBuyOrder: "cbo",
        amount: 17000,
      })
      expect(mockCompleteCart).toHaveBeenCalledWith({ input: { id: "cart1" }, throwOnError: true })
      expect(link.create).toHaveBeenCalledWith({
        [SUBSCRIPTION_MODULE]: { subscription_cycle_id: "cyc1" },
        order: { order_id: "order1" },
      })
    })

    it("adds the free gift only when the cycle includes it and a gift variant exists", async () => {
      await placeSubscriptionOrder(makeContainer().container, { ...INPUT, includeGift: true, giftVariantId: "gift1" })
      expect(mockCreateCart.mock.calls[0][0].input.items).toHaveLength(2)
      expect(mockCreateCart.mock.calls[0][0].input.items[1]).toMatchObject({ variant_id: "gift1", unit_price: 0 })

      mockCreateCart.mockClear()
      await placeSubscriptionOrder(makeContainer().container, { ...INPUT, includeGift: true, giftVariantId: null })
      await placeSubscriptionOrder(makeContainer().container, { ...INPUT, includeGift: false, giftVariantId: "gift1" })
      expect(mockCreateCart.mock.calls[0][0].input.items).toHaveLength(1)
      expect(mockCreateCart.mock.calls[1][0].input.items).toHaveLength(1)
    })

    it("refuses to charge a subscription without a shipping address", async () => {
      const { container } = makeContainer({ address: undefined })

      await expect(placeSubscriptionOrder(container, INPUT)).rejects.toThrow(/dirección de despacho/)
      expect(mockCreateCart).not.toHaveBeenCalled()
    })

    it.each([[0], [-5], ["abc"]])("refuses to charge an invalid cart total (%p)", async (total) => {
      const { container } = makeContainer({ cartTotal: total })

      await expect(placeSubscriptionOrder(container, INPUT)).rejects.toThrow(/total de carrito inválido/)
      expect(mockCompleteCart).not.toHaveBeenCalled()
    })

    it("propagates a failed charge so the cycle can handle it", async () => {
      mockCompleteCart.mockRejectedValue(new Error("tarjeta rechazada"))

      await expect(placeSubscriptionOrder(makeContainer().container, INPUT)).rejects.toThrow("tarjeta rechazada")
    })

    it("still succeeds when the cycle-to-order link can't be created, and warns", async () => {
      const { container, logger } = makeContainer({ linkFails: true })

      const result = await placeSubscriptionOrder(container, INPUT)

      expect(result.orderId).toBe("order1")
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no se pudo enlazar el ciclo cyc1"))
    })
  })

  describe("buildCycleDeps", () => {
    const originalGift = process.env.SUBSCRIPTION_GIFT_VARIANT_ID
    afterEach(() => {
      if (originalGift === undefined) delete process.env.SUBSCRIPTION_GIFT_VARIANT_ID
      else process.env.SUBSCRIPTION_GIFT_VARIANT_ID = originalGift
    })

    it("reads the gift variant from the environment, trimmed, or null when unset", () => {
      process.env.SUBSCRIPTION_GIFT_VARIANT_ID = "  gift1  "
      expect(buildCycleDeps(makeContainer().container).giftVariantId).toBe("gift1")

      process.env.SUBSCRIPTION_GIFT_VARIANT_ID = "   "
      expect(buildCycleDeps(makeContainer().container).giftVariantId).toBeNull()
    })

    it("sends the email a cycle event maps to, and nothing when it maps to none", async () => {
      const deps = buildCycleDeps(makeContainer().container)

      mockEmailForEvent.mockReturnValueOnce({ to: "a@b.cl" })
      await deps.notify!({ type: "x" } as any)
      expect(mockSendEmail).toHaveBeenCalledTimes(1)

      mockEmailForEvent.mockReturnValueOnce(null)
      await deps.notify!({ type: "y" } as any)
      expect(mockSendEmail).toHaveBeenCalledTimes(1)
    })

    it("reports errors to Sentry with their context", () => {
      const deps = buildCycleDeps(makeContainer().container)
      const err = new Error("x")

      deps.report!(err, { cycleId: "c1" } as any)

      expect(mockCaptureException).toHaveBeenCalledWith(err, { extra: { cycleId: "c1" } })
    })

    it("checks stock through the shared helper", async () => {
      mockGetAvailability.mockResolvedValue({ var1: { availability: 9 } })
      const deps = buildCycleDeps(makeContainer().container)

      expect(await deps.hasStock({ variantId: "var1", quantity: 1 })).toBe(true)
    })

    it("places the order with the configured gift variant", async () => {
      process.env.SUBSCRIPTION_GIFT_VARIANT_ID = "gift1"
      const deps = buildCycleDeps(makeContainer().container)

      await deps.placeOrder({ ...INPUT, includeGift: true })

      expect(mockCreateCart.mock.calls[0][0].input.items[1]).toMatchObject({ variant_id: "gift1" })
    })
  })
})
