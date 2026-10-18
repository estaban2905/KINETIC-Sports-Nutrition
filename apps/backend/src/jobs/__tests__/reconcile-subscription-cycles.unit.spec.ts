const mockReconcile = jest.fn()
const mockFromEnv = jest.fn()
const mockWithLock = jest.fn()
const mockBuildDeps = jest.fn()
const mockCaptureMessage = jest.fn()

jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { QUERY: "query", LOGGER: "logger" },
}))
jest.mock("../../modules/subscription", () => ({ SUBSCRIPTION_MODULE: "subscription" }))
jest.mock("../../lib/oneclick", () => ({ OneclickClient: { fromEnv: (...a: unknown[]) => mockFromEnv(...a) } }))
jest.mock("../../lib/order-lock", () => ({ withLock: (...a: unknown[]) => mockWithLock(...a) }))
jest.mock("../../lib/sentry", () => ({ Sentry: { captureMessage: (...a: unknown[]) => mockCaptureMessage(...a) } }))
jest.mock("../../lib/subscription-order", () => ({ buildCycleDeps: (...a: unknown[]) => mockBuildDeps(...a) }))
jest.mock("../../lib/subscription-reconcile", () => ({
  reconcileSubscriptionCycles: (...a: unknown[]) => mockReconcile(...a),
}))

import reconcileSubscriptionCyclesJob, { config } from "../reconcile-subscription-cycles"

describe("reconcileSubscriptionCycles job", () => {
  let subscriptions: Record<string, jest.Mock>
  let graph: jest.Mock
  let oneclick: { chargeStatus: jest.Mock }
  let cycleDeps: { placeOrder: jest.Mock; giftVariantId: string | null }
  let container: any
  let logger: unknown
  let deps: any

  beforeEach(async () => {
    jest.clearAllMocks()
    subscriptions = {
      listSubscriptionCycles: jest.fn().mockResolvedValue([{ id: "c1" }]),
      retrieveSubscriptionCycle: jest.fn().mockResolvedValue({ status: "charged" }),
      retrieveSubscription: jest.fn().mockResolvedValue({ id: "sub1" }),
      updateSubscriptions: jest.fn().mockResolvedValue(undefined),
      updateSubscriptionCycles: jest.fn().mockResolvedValue(undefined),
    }
    graph = jest.fn().mockResolvedValue({ data: [] })
    oneclick = { chargeStatus: jest.fn().mockResolvedValue({ ok: true }) }
    cycleDeps = { placeOrder: jest.fn().mockResolvedValue({ orderId: "o1", total: 100 }), giftVariantId: "gift1" }
    logger = { info: jest.fn() }
    mockFromEnv.mockReturnValue(oneclick)
    mockBuildDeps.mockReturnValue(cycleDeps)
    mockWithLock.mockImplementation(async (_c: unknown, _k: string, job: () => unknown) => job())
    mockReconcile.mockResolvedValue(undefined)
    const services: Record<string, unknown> = { logger, query: { graph }, subscription: subscriptions }
    container = { resolve: (k: string) => services[k] }

    await reconcileSubscriptionCyclesJob(container)
    deps = mockReconcile.mock.calls[0][0]
  })

  it("is scheduled every 15 minutes", () => {
    expect(config.schedule).toBe("*/15 * * * *")
  })

  it("hands the reconciler the logger and gift variant", () => {
    expect(deps.logger).toBe(logger)
    expect(deps.giftVariantId).toBe("gift1")
  })

  it("lists charged-without-order cycles and stale reservations", async () => {
    const staleBefore = new Date("2026-01-01")

    const rows = await deps.listStuck(staleBefore)

    expect(rows).toEqual([{ id: "c1" }])
    expect(subscriptions.listSubscriptionCycles).toHaveBeenCalledWith({
      $or: [{ status: "charged_pending_order" }, { status: "reserved", attempted_at: { $lt: staleBefore } }],
    })
  })

  it("reads a cycle's current status, or null when the cycle can't be found", async () => {
    expect(await deps.cycleStatus("c1")).toBe("charged")

    subscriptions.retrieveSubscriptionCycle.mockRejectedValue(new Error("not found"))
    expect(await deps.cycleStatus("c1")).toBeNull()
  })

  it("delegates subscription reads and updates to the module", async () => {
    expect(await deps.retrieveSubscription("sub1")).toEqual({ id: "sub1" })
    await deps.updateSubscriptions({ id: "sub1" })
    await deps.updateCycle({ id: "c1" })

    expect(subscriptions.updateSubscriptions).toHaveBeenCalledWith({ id: "sub1" })
    expect(subscriptions.updateSubscriptionCycles).toHaveBeenCalledWith({ id: "c1" })
  })

  it("finds the order a cycle already produced, with a numeric total", async () => {
    graph.mockResolvedValue({ data: [{ id: "o1", total: "15990" }] })

    expect(await deps.findOrderForCycle("c1")).toEqual({ id: "o1", total: 15990 })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "order", filters: { metadata: { subscription_cycle_id: "c1" } } })
    )
  })

  it("returns null when the cycle has no order", async () => {
    graph.mockResolvedValue({ data: [] })

    expect(await deps.findOrderForCycle("c1")).toBeNull()
  })

  it("asks Transbank for the truth and never charges on its own", async () => {
    expect(await deps.chargeStatus("parent-order")).toEqual({ ok: true })
    expect(oneclick.chargeStatus).toHaveBeenCalledWith("parent-order")

    await deps.placeOrder({ cycleId: "c1" })
    expect(cycleDeps.placeOrder).toHaveBeenCalledWith({ cycleId: "c1" })
  })

  it("runs jobs under the order lock", async () => {
    const job = jest.fn().mockResolvedValue("done")

    expect(await deps.withLock("key", job)).toBe("done")
    expect(mockWithLock).toHaveBeenCalledWith(container, "key", job)
  })

  it("raises alerts as error-level Sentry messages", () => {
    deps.alert("ciclo atascado", { cycleId: "c1" })

    expect(mockCaptureMessage).toHaveBeenCalledWith("ciclo atascado", { level: "error", extra: { cycleId: "c1" } })
  })
})
