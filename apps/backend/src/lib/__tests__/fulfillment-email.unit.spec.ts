const mockCaptureException = jest.fn()

jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: { QUERY: "query", LOGGER: "logger" },
  Modules: { NOTIFICATION: "notification" },
}))
jest.mock("../sentry", () => ({ Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a) } }))

import { CHILEXPRESS_TRACKING_PAGE, sendFulfillmentEmail } from "../fulfillment-email"

type Order = Record<string, unknown> | undefined

function makeContainer(opts: { orderId?: string | null; order?: Order; queryError?: Error } = {}) {
  const logger = { warn: jest.fn(), error: jest.fn() }
  const createNotifications = jest.fn().mockResolvedValue(undefined)
  const graph = jest.fn(async ({ entity }: { entity: string }) => {
    if (opts.queryError) throw opts.queryError
    if (entity === "order_fulfillment") {
      return { data: opts.orderId === null ? [] : [{ order_id: opts.orderId ?? "order1" }] }
    }
    return { data: opts.order === undefined ? [] : [opts.order] }
  })
  const services: Record<string, unknown> = {
    logger,
    query: { graph },
    notification: { createNotifications },
  }
  return { container: { resolve: (k: string) => services[k] } as any, logger, graph, createNotifications }
}

const ORDER = {
  id: "order1",
  display_id: 1042,
  email: "ana@test.cl",
  fulfillments: [
    {
      id: "ful1",
      provider_id: "chilexpress_chilexpress",
      data: { tracking_certificate_url: "https://cert.test/abc" },
      labels: [{ tracking_number: "OT-1" }, { tracking_number: null }, { tracking_number: "OT-2" }],
    },
  ],
}

const build = jest.fn((ctx: unknown) => ({ subject: "Tu pedido va en camino", html: `<p>${JSON.stringify(ctx)}</p>` }))

const args = (over: Record<string, unknown> = {}) => ({
  fulfillmentId: "ful1",
  trigger: "shipment.created" as const,
  build,
  ...over,
})

describe("sendFulfillmentEmail", () => {
  beforeEach(() => jest.clearAllMocks())

  it("exposes Chilexpress's tracking page", () => {
    expect(CHILEXPRESS_TRACKING_PAGE).toMatch(/^https:\/\//)
  })

  it("sends nothing when the admin asked for no notification", async () => {
    const { container, graph } = makeContainer({ order: ORDER })

    await sendFulfillmentEmail(container, args({ noNotification: true }))

    expect(graph).not.toHaveBeenCalled()
  })

  it("emails the customer with the tracking context", async () => {
    const { container, createNotifications } = makeContainer({ order: ORDER })

    await sendFulfillmentEmail(container, args())

    expect(build).toHaveBeenCalledWith({
      displayId: 1042,
      trackingNumbers: ["OT-1", "OT-2"],
      isChilexpress: true,
      certificateUrl: "https://cert.test/abc",
    })
    expect(createNotifications).toHaveBeenCalledWith({
      to: "ana@test.cl",
      channel: "email",
      content: { subject: "Tu pedido va en camino", html: expect.any(String) },
      data: { order_id: "order1", fulfillment_id: "ful1" },
      trigger_type: "shipment.created",
      resource_id: "order1",
      resource_type: "order",
    })
  })

  it("only trusts https certificate links", async () => {
    const order = {
      ...ORDER,
      fulfillments: [{ ...ORDER.fulfillments[0], data: { tracking_certificate_url: "http://insecure.test/x" } }],
    }
    const { container } = makeContainer({ order })

    await sendFulfillmentEmail(container, args())

    expect(build).toHaveBeenCalledWith(expect.objectContaining({ certificateUrl: null }))
  })

  it("handles other carriers and fulfillments without labels or data", async () => {
    const order = { ...ORDER, fulfillments: [{ id: "ful1", provider_id: "manual_manual" }] }
    const { container } = makeContainer({ order })

    await sendFulfillmentEmail(container, args())

    expect(build).toHaveBeenCalledWith({
      displayId: 1042,
      trackingNumbers: [],
      isChilexpress: false,
      certificateUrl: null,
    })
  })

  it("still builds the email when the order lists no matching fulfillment", async () => {
    const { container, createNotifications } = makeContainer({ order: { ...ORDER, fulfillments: undefined } })

    await sendFulfillmentEmail(container, args())

    expect(build).toHaveBeenCalledWith(expect.objectContaining({ trackingNumbers: [], isChilexpress: false }))
    expect(createNotifications).toHaveBeenCalled()
  })

  it("does nothing when the fulfillment isn't linked to an order", async () => {
    const { container, createNotifications } = makeContainer({ orderId: null })

    await sendFulfillmentEmail(container, args())

    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("warns and skips orders without an email", async () => {
    const { container, logger, createNotifications } = makeContainer({ order: { ...ORDER, email: null } })

    await sendFulfillmentEmail(container, args())

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("orden order1 no tiene email"))
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("skips when the order can't be found", async () => {
    const { container, createNotifications } = makeContainer({ order: undefined })

    await sendFulfillmentEmail(container, args())

    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("never throws: a failed email is logged and reported", async () => {
    const { container, logger } = makeContainer({ queryError: new Error("db caída") })

    await expect(sendFulfillmentEmail(container, args())).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("db caída"))
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
  })

  it("logs non-Error failures too", async () => {
    const { container, logger, createNotifications } = makeContainer({ order: ORDER })
    createNotifications.mockRejectedValue("boom")

    await sendFulfillmentEmail(container, args({ trigger: "delivery.created" }))

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("delivery.created"))
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("boom"))
  })
})
