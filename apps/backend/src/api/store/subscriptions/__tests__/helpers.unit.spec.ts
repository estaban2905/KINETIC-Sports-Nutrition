const mockResolveCounty = jest.fn()
const mockEstimate = jest.fn()
const mockSendEmail = jest.fn()
const mockFromEnv = jest.fn()
const mockSerialize = jest.fn()

jest.mock("@medusajs/framework/utils", () => {
  class MedusaError extends Error {
    static Types = { UNAUTHORIZED: "unauthorized" }
    type: string
    constructor(type: string, message: string) {
      super(message)
      this.type = type
    }
  }
  return { ContainerRegistrationKeys: { QUERY: "query", LOGGER: "logger" }, MedusaError }
})
jest.mock("../../../../modules/subscription", () => ({ SUBSCRIPTION_MODULE: "subscription" }))
jest.mock("../../../../lib/oneclick", () => ({ OneclickClient: { fromEnv: (...a: unknown[]) => mockFromEnv(...a) } }))
jest.mock("../../../../modules/fulfillment-chilexpress/coverage", () => ({
  resolveCountyCode: (...a: unknown[]) => mockResolveCounty(...a),
}))
jest.mock("../../../../lib/subscription-actions", () => ({
  serializeSubscription: (...a: unknown[]) => mockSerialize(...a),
}))
jest.mock("../../../../lib/subscription-order", () => ({ estimateCycleAmount: (...a: unknown[]) => mockEstimate(...a) }))
jest.mock("../../../../lib/subscription-notify", () => ({ sendSubscriptionEmail: (...a: unknown[]) => mockSendEmail(...a) }))

import { buildActionDeps, customerIdOf, presentSubscriptions } from "../helpers"

function makeReq(graph: jest.Mock = jest.fn().mockResolvedValue({ data: [] }), actorId: string | null = "cus1") {
  const logger = { warn: jest.fn() }
  const subscriptions = { name: "subscriptions-module" }
  const services: Record<string, unknown> = { logger, query: { graph }, subscription: subscriptions }
  return {
    req: { auth_context: actorId ? { actor_id: actorId } : undefined, scope: { resolve: (k: string) => services[k] } } as any,
    logger,
    graph,
    subscriptions,
  }
}

describe("store subscription helpers", () => {
  const savedEnv: Record<string, string | undefined> = {}
  const ENV = ["CHILEXPRESS_COBERTURA_API_KEY", "CHILEXPRESS_COBERTURA_BASE_URL"]

  beforeEach(() => {
    jest.clearAllMocks()
    for (const k of ENV) {
      savedEnv[k] = process.env[k]
      delete process.env[k]
    }
    mockSerialize.mockImplementation((row, extra) => ({ id: row.id, ...extra }))
  })

  afterEach(() => {
    for (const k of ENV) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  describe("customerIdOf", () => {
    it("takes the customer from the auth token", () => {
      expect(customerIdOf(makeReq().req)).toBe("cus1")
    })

    it("rejects unauthenticated requests", () => {
      expect(() => customerIdOf(makeReq(undefined, null).req)).toThrow("Debes iniciar sesión.")
    })
  })

  describe("buildActionDeps", () => {
    it("wires the subscription module, Oneclick and the logger", () => {
      const oneclick = { name: "oneclick" }
      mockFromEnv.mockReturnValue(oneclick)
      const { req, logger, subscriptions } = makeReq()

      const deps = buildActionDeps(req)

      expect(deps.subscriptions).toBe(subscriptions)
      expect(deps.oneclick).toBe(oneclick)
      expect(deps.logger).toBe(logger)
    })

    it("sends subscription emails through the request scope", async () => {
      const { req } = makeReq()

      await buildActionDeps(req).notify!("cancelled" as any, "sub1")

      expect(mockSendEmail).toHaveBeenCalledWith(req.scope, { kind: "cancelled", subscriptionId: "sub1" })
    })

    describe("variantIsPurchasable", () => {
      it("is true only for published products", async () => {
        const graph = jest.fn().mockResolvedValue({ data: [{ product: { status: "published" } }] })
        const { req } = makeReq(graph)

        expect(await buildActionDeps(req).variantIsPurchasable("var1")).toBe(true)
        expect(graph).toHaveBeenCalledWith(expect.objectContaining({ entity: "product_variant", filters: { id: "var1" } }))
      })

      it.each([
        ["a draft product", [{ product: { status: "draft" } }]],
        ["a variant without product", [{}]],
        ["an unknown variant", []],
      ])("is false for %s", async (_label, data) => {
        const { req } = makeReq(jest.fn().mockResolvedValue({ data }))

        expect(await buildActionDeps(req).variantIsPurchasable("var1")).toBe(false)
      })
    })

    describe("comunaIsCovered", () => {
      it("accepts any comuna when the coverage API isn't configured", async () => {
        const { req } = makeReq()

        expect(await buildActionDeps(req).comunaIsCovered("Atlantis")).toBe(true)
        expect(mockResolveCounty).not.toHaveBeenCalled()
      })

      it("checks the comuna against Chilexpress when configured", async () => {
        process.env.CHILEXPRESS_COBERTURA_API_KEY = "key"
        process.env.CHILEXPRESS_COBERTURA_BASE_URL = "https://cobertura.test"
        const { req } = makeReq()

        mockResolveCounty.mockResolvedValueOnce("PROV")
        expect(await buildActionDeps(req).comunaIsCovered("Providencia")).toBe(true)
        expect(mockResolveCounty).toHaveBeenCalledWith("Providencia", { apiKey: "key", baseUrl: "https://cobertura.test" })

        mockResolveCounty.mockResolvedValueOnce(null)
        expect(await buildActionDeps(req).comunaIsCovered("Atlantis")).toBe(false)
      })

      it("accepts the comuna and warns when the coverage lookup fails", async () => {
        process.env.CHILEXPRESS_COBERTURA_API_KEY = "key"
        mockResolveCounty.mockRejectedValue(new Error("timeout"))
        const { req, logger } = makeReq()

        expect(await buildActionDeps(req).comunaIsCovered("Providencia")).toBe(true)
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("timeout"))
      })

      it("warns about non-Error failures too", async () => {
        process.env.CHILEXPRESS_COBERTURA_API_KEY = "key"
        mockResolveCounty.mockRejectedValue("boom")
        const { req, logger } = makeReq()

        await buildActionDeps(req).comunaIsCovered("Providencia")

        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("boom"))
      })
    })
  })

  describe("presentSubscriptions", () => {
    const row = (id: string, variant_id: string, status = "active") => ({ id, variant_id, status }) as any

    it("returns an empty list without querying when there are no subscriptions", async () => {
      const { req, graph } = makeReq()

      expect(await presentSubscriptions(req, [])).toEqual([])
      expect(graph).not.toHaveBeenCalled()
    })

    it("adds product names and the estimated next amount", async () => {
      const graph = jest.fn().mockResolvedValue({
        data: [{ id: "var1", title: "Chocolate 2lb", product: { title: "Whey", handle: "whey" } }],
      })
      mockEstimate.mockResolvedValue(34000)
      const { req } = makeReq(graph)

      const result = await presentSubscriptions(req, [row("sub1", "var1")])

      expect(result).toEqual([
        {
          id: "sub1",
          product_title: "Whey",
          product_handle: "whey",
          variant_title: "Chocolate 2lb",
          next_amount: 34000,
        },
      ])
    })

    it("looks each variant up once even when several subscriptions share it", async () => {
      const graph = jest.fn().mockResolvedValue({ data: [] })
      mockEstimate.mockResolvedValue(1)
      const { req } = makeReq(graph)

      await presentSubscriptions(req, [row("s1", "var1"), row("s2", "var1"), row("s3", "var2")])

      expect(graph.mock.calls[0][0].filters).toEqual({ id: ["var1", "var2"] })
    })

    it("fills missing names with null", async () => {
      const graph = jest.fn().mockResolvedValue({ data: [{ id: "var1" }] })
      mockEstimate.mockResolvedValue(1)
      const { req } = makeReq(graph)

      const [result] = await presentSubscriptions(req, [row("sub1", "var1")])

      expect(result).toMatchObject({ product_title: null, product_handle: null, variant_title: null })
    })

    it("doesn't estimate cancelled subscriptions", async () => {
      const { req } = makeReq()

      const [result] = await presentSubscriptions(req, [row("sub1", "var1", "cancelled")])

      expect(mockEstimate).not.toHaveBeenCalled()
      expect(result).toMatchObject({ next_amount: null })
    })

    it("still returns the subscription when the names can't be read, and warns", async () => {
      const graph = jest.fn().mockRejectedValue(new Error("db caída"))
      mockEstimate.mockResolvedValue(500)
      const { req, logger } = makeReq(graph)

      const [result] = await presentSubscriptions(req, [row("sub1", "var1")])

      expect(result).toMatchObject({ id: "sub1", next_amount: 500 })
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("db caída"))
    })

    it("warns about non-Error failures reading names too", async () => {
      const graph = jest.fn().mockRejectedValue("boom")
      mockEstimate.mockResolvedValue(1)
      const { req, logger } = makeReq(graph)

      await presentSubscriptions(req, [row("sub1", "var1")])

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("boom"))
    })

    it("still returns the subscription when the amount can't be estimated", async () => {
      mockEstimate.mockRejectedValue(new Error("sin precio"))
      const { req } = makeReq()

      const [result] = await presentSubscriptions(req, [row("sub1", "var1")])

      expect(result).toMatchObject({ id: "sub1", next_amount: null })
    })
  })
})
