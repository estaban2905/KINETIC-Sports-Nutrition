import { MedusaError } from "@medusajs/framework/utils"
import SubscriptionModuleService from "../service"

/**
 * Se prueba la lógica propia del servicio sin base de datos: los métodos
 * generados por MedusaService se reemplazan por dobles.
 */
function makeService(overrides: Record<string, unknown>) {
  const service = Object.create(SubscriptionModuleService.prototype)
  return Object.assign(service, overrides) as SubscriptionModuleService
}

describe("SubscriptionModuleService.transitionStatus", () => {
  it("aplica una transición válida", async () => {
    const updateSubscriptions = jest.fn().mockResolvedValue({ id: "sub_1" })
    const service = makeService({
      retrieveSubscription: jest.fn().mockResolvedValue({ id: "sub_1", status: "active" }),
      updateSubscriptions,
    })

    await service.transitionStatus("sub_1", "paused")

    expect(updateSubscriptions).toHaveBeenCalledWith({ id: "sub_1", status: "paused" })
  })

  it("al cancelar quita el próximo cobro y guarda la fecha", async () => {
    const updateSubscriptions = jest.fn().mockResolvedValue({})
    const service = makeService({
      retrieveSubscription: jest.fn().mockResolvedValue({ id: "sub_1", status: "paused" }),
      updateSubscriptions,
    })

    await service.transitionStatus("sub_1", "cancelled")

    const arg = updateSubscriptions.mock.calls[0][0]
    expect(arg.status).toBe("cancelled")
    expect(arg.next_billing_date).toBeNull()
    expect(arg.cancelled_at).toBeInstanceOf(Date)
  })

  it("rechaza una transición inválida y no escribe", async () => {
    const updateSubscriptions = jest.fn()
    const service = makeService({
      retrieveSubscription: jest.fn().mockResolvedValue({ id: "sub_1", status: "cancelled" }),
      updateSubscriptions,
    })

    await expect(service.transitionStatus("sub_1", "active")).rejects.toThrow(/No se puede pasar/)
    expect(updateSubscriptions).not.toHaveBeenCalled()
  })
})

describe("SubscriptionModuleService.reserveCycle", () => {
  it("devuelve el ciclo cuando logra reservar", async () => {
    const cycle = { id: "subcyc_1" }
    const createSubscriptionCycles = jest.fn().mockResolvedValue(cycle)
    const service = makeService({ createSubscriptionCycles })

    await expect(service.reserveCycle("sub_1", "2026-10-28")).resolves.toBe(cycle)
    expect(createSubscriptionCycles).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: "sub_1", period_key: "2026-10-28", attempt: 1 })
    )
  })

  it("devuelve null si el día ya estaba reservado: no se debe cobrar", async () => {
    const service = makeService({
      createSubscriptionCycles: jest
        .fn()
        .mockRejectedValue(new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "already exists")),
    })

    await expect(service.reserveCycle("sub_1", "2026-10-28")).resolves.toBeNull()
  })

  it("propaga cualquier otro error", async () => {
    const service = makeService({
      createSubscriptionCycles: jest.fn().mockRejectedValue(new Error("connection refused")),
    })

    await expect(service.reserveCycle("sub_1", "2026-10-28")).rejects.toThrow("connection refused")
  })
})
