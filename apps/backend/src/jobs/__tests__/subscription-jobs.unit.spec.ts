const mockSendReminders = jest.fn()
const mockEstimate = jest.fn()
const mockSendEmail = jest.fn()
const mockRenewDue = jest.fn()
const mockWithLock = jest.fn()
const mockBuildDeps = jest.fn()
const mockRunCycle = jest.fn()
const mockCaptureMessage = jest.fn()

jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { LOGGER: "logger" },
}))
jest.mock("../../modules/subscription", () => ({ SUBSCRIPTION_MODULE: "subscription" }))
jest.mock("../../lib/subscription-order", () => ({
  estimateCycleAmount: (...a: unknown[]) => mockEstimate(...a),
  buildCycleDeps: (...a: unknown[]) => mockBuildDeps(...a),
  runSubscriptionCycle: (...a: unknown[]) => mockRunCycle(...a),
}))
jest.mock("../../lib/subscription-notify", () => ({ sendSubscriptionEmail: (...a: unknown[]) => mockSendEmail(...a) }))
jest.mock("../../lib/subscription-reminder", () => ({
  sendBillingReminders: (...a: unknown[]) => mockSendReminders(...a),
}))
jest.mock("../../lib/subscription-renewal", () => ({ renewDueSubscriptions: (...a: unknown[]) => mockRenewDue(...a) }))
jest.mock("../../lib/order-lock", () => ({ withLock: (...a: unknown[]) => mockWithLock(...a) }))
jest.mock("../../lib/sentry", () => ({ Sentry: { captureMessage: (...a: unknown[]) => mockCaptureMessage(...a) } }))

import remindSubscriptions, { config as remindConfig } from "../remind-subscriptions"
import renewSubscriptions, { config as renewConfig } from "../renew-subscriptions"

function makeContainer() {
  const logger = { info: jest.fn() }
  const subscriptions = {
    listSubscriptions: jest.fn().mockResolvedValue([{ id: "sub1" }]),
    updateSubscriptions: jest.fn().mockResolvedValue(undefined),
    listAndCountSubscriptions: jest.fn().mockResolvedValue([[], 3]),
  }
  const services: Record<string, unknown> = { logger, subscription: subscriptions }
  return { container: { resolve: (k: string) => services[k] } as any, logger, subscriptions }
}

describe("remindSubscriptions job", () => {
  it("runs daily at 13:00 UTC", () => {
    expect(remindConfig.schedule).toBe("0 13 * * *")
  })

  it("wires the reminder flow to the subscription module and email sender", async () => {
    jest.clearAllMocks()
    const { container, logger, subscriptions } = makeContainer()
    await remindSubscriptions(container)
    const deps = mockSendReminders.mock.calls[0][0]

    expect(deps.logger).toBe(logger)

    expect(await deps.listAhead("2026-11-20")).toEqual([{ id: "sub1" }])
    expect(subscriptions.listSubscriptions).toHaveBeenCalledWith(
      { status: "active", next_billing_date: "2026-11-20" },
      { select: ["id", "next_billing_date", "reminder_sent_for"] }
    )

    mockEstimate.mockResolvedValue(15990)
    expect(await deps.estimateAmount("sub1")).toBe(15990)
    expect(mockEstimate).toHaveBeenCalledWith(container, "sub1")

    await deps.send({ subscriptionId: "sub1", amount: 15990 })
    expect(mockSendEmail).toHaveBeenCalledWith(container, { kind: "reminder", subscriptionId: "sub1", amount: 15990 })

    await deps.markSent("sub1", "2026-11-20")
    expect(subscriptions.updateSubscriptions).toHaveBeenCalledWith({ id: "sub1", reminder_sent_for: "2026-11-20" })
  })
})

describe("renewSubscriptions job", () => {
  let container: any
  let logger: unknown
  let subscriptions: ReturnType<typeof makeContainer>["subscriptions"]
  let cycleDeps: unknown
  let deps: any

  beforeEach(async () => {
    jest.clearAllMocks()
    const made = makeContainer()
    container = made.container
    logger = made.logger
    subscriptions = made.subscriptions
    cycleDeps = { placeOrder: jest.fn() }
    mockBuildDeps.mockReturnValue(cycleDeps)
    mockWithLock.mockImplementation(async (_c: unknown, _k: string, job: () => unknown) => job())
    mockRenewDue.mockResolvedValue(undefined)

    await renewSubscriptions(container)
    deps = mockRenewDue.mock.calls[0][0]
  })

  it("runs daily at 12:00 UTC, an hour before the reminders", () => {
    expect(renewConfig.schedule).toBe("0 12 * * *")
  })

  it("lists active subscriptions whose billing day has arrived, oldest first", async () => {
    expect(await deps.listDue("2026-11-20", 50)).toEqual([{ id: "sub1" }])
    expect(subscriptions.listSubscriptions).toHaveBeenCalledWith(
      { status: "active", next_billing_date: { $lte: "2026-11-20" } },
      { select: ["id"], take: 50, order: { next_billing_date: "ASC" } }
    )
  })

  it("counts past-due subscriptions", async () => {
    expect(await deps.countPastDue()).toBe(3)
    expect(subscriptions.listAndCountSubscriptions).toHaveBeenCalledWith({ status: "past_due" }, { take: 1 })
  })

  it("runs each cycle with the real cycle dependencies, under the lock", async () => {
    mockRunCycle.mockResolvedValue("charged")

    expect(await deps.runCycle("sub1")).toBe("charged")
    expect(mockRunCycle).toHaveBeenCalledWith(cycleDeps, "sub1")

    const job = jest.fn().mockResolvedValue("done")
    expect(await deps.withLock("key", job)).toBe("done")
    expect(mockWithLock).toHaveBeenCalledWith(container, "key", job)
  })

  it("raises alerts as error-level Sentry messages", () => {
    deps.alert("muchas en mora", { count: 3 })

    expect(mockCaptureMessage).toHaveBeenCalledWith("muchas en mora", { level: "error", extra: { count: 3 } })
    expect(deps.logger).toBe(logger)
  })

  it("pauses half a second between renewals", async () => {
    jest.useFakeTimers()
    try {
      let resolved = false
      const pause = deps.pause().then(() => {
        resolved = true
      })

      await jest.advanceTimersByTimeAsync(499)
      expect(resolved).toBe(false)
      await jest.advanceTimersByTimeAsync(1)
      await pause
      expect(resolved).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })
})
