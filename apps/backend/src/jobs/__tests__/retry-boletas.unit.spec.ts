const mockIssue = jest.fn()
const mockIsPending = jest.fn()
const mockSendStatusEmail = jest.fn()
const mockIsOrderPaid = jest.fn()
const mockGetConfig = jest.fn()
const mockCaptureException = jest.fn()

jest.mock("../../lib/invoice-order", () => ({
  isDocumentPending: (...a: unknown[]) => mockIsPending(...a),
  issueDocumentForOrder: (...a: unknown[]) => mockIssue(...a),
}))
jest.mock("../../lib/order-notifications", () => ({
  sendOrderStatusEmail: (...a: unknown[]) => mockSendStatusEmail(...a),
}))
jest.mock("../../lib/order-status", () => ({ isOrderPaid: (...a: unknown[]) => mockIsOrderPaid(...a) }))
jest.mock("../../lib/simplefactura", () => ({ getSimpleFacturaConfig: (...a: unknown[]) => mockGetConfig(...a) }))
jest.mock("../../lib/sentry", () => ({ Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a) } }))

import retryBoletas, { config } from "../retry-boletas"

const order = (n: number) => ({ id: `o${n}`, display_id: n, metadata: { n }, payment_collections: [{ n }] })

function makeContainer(orders: unknown[]) {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const graph = jest.fn().mockResolvedValue({ data: orders })
  const container = { resolve: (key: string) => (key === "logger" ? logger : { graph }) }
  return { container: container as any, logger, graph }
}

async function run(container: any) {
  const promise = retryBoletas(container)
  await jest.runAllTimersAsync()
  await promise
}

describe("retryBoletas job", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockGetConfig.mockReturnValue({ apiKey: "x" })
    mockIsPending.mockReturnValue(true)
    mockIsOrderPaid.mockReturnValue(true)
    mockSendStatusEmail.mockResolvedValue(undefined)
    mockIssue.mockResolvedValue("issued")
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("is scheduled every 15 minutes", () => {
    expect(config.schedule).toBe("*/15 * * * *")
  })

  it("does nothing at all when SimpleFactura isn't configured", async () => {
    const { container, graph } = makeContainer([order(1)])
    mockGetConfig.mockReturnValue(null)

    await run(container)

    expect(graph).not.toHaveBeenCalled()
  })

  it("does nothing when no order has a pending document", async () => {
    mockIsPending.mockReturnValue(false)
    const { container, logger } = makeContainer([order(1)])

    await run(container)

    expect(mockIssue).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })

  it("waits for the payment before issuing a document", async () => {
    mockIsOrderPaid.mockReturnValue(false)
    const { container } = makeContainer([order(1)])

    await run(container)

    expect(mockIssue).not.toHaveBeenCalled()
    expect(mockSendStatusEmail).not.toHaveBeenCalled()
  })

  it("re-sends the confirmation email and issues the document for each paid pending order", async () => {
    const { container } = makeContainer([order(1), order(2)])

    await run(container)

    expect(mockSendStatusEmail).toHaveBeenCalledWith(container, "o1")
    expect(mockSendStatusEmail).toHaveBeenCalledWith(container, "o2")
    expect(mockIssue).toHaveBeenCalledTimes(2)
    expect(mockIssue).toHaveBeenCalledWith(container, "o1")
  })

  it("processes at most 20 orders per run", async () => {
    const { container } = makeContainer(Array.from({ length: 25 }, (_, i) => order(i + 1)))

    await run(container)

    expect(mockIssue).toHaveBeenCalledTimes(20)
  })

  it("flags documents that need manual review", async () => {
    mockIssue.mockResolvedValue("needs_review")
    const { container, logger } = makeContainer([order(7)])

    await run(container)

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Orden #7"))
  })

  it("still issues the document when the confirmation email fails", async () => {
    mockSendStatusEmail.mockRejectedValue(new Error("smtp down"))
    const { container, logger } = makeContainer([order(1)])

    await run(container)

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("smtp down"))
    expect(mockIssue).toHaveBeenCalledTimes(1)
  })

  it("reports a failed order to Sentry and keeps going with the next one", async () => {
    mockIssue.mockRejectedValueOnce(new Error("sin folios")).mockResolvedValueOnce("issued")
    const { container, logger } = makeContainer([order(1), order(2)])

    await run(container)

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Orden #1: sin folios"))
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error), { extra: { orderId: "o1" } })
    expect(mockIssue).toHaveBeenCalledTimes(2)
  })

  it("logs non-Error failures too", async () => {
    mockIssue.mockRejectedValueOnce("boom")
    const { container, logger } = makeContainer([order(1)])

    await run(container)

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("boom"))
  })
})
