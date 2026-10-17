import {
  STALE_RESERVED_MINUTES,
  reconcileSubscriptionCycles,
  type StuckCycle,
} from "../subscription-reconcile"
import type { CycleSubscription } from "../subscription-cycle"

const NOW = new Date("2026-10-28T15:00:00Z")

const sub = (over: Partial<CycleSubscription> = {}): CycleSubscription => ({
  id: "sub_01ABCDEFGHJKMN",
  customer_id: "cus_1",
  variant_id: "variant_1",
  quantity: 1,
  status: "active",
  frequency_days: 30,
  discount_percent: 15,
  next_billing_date: "2026-10-28",
  payment_token_ref: "tbk-1",
  welcome_gift_given: false,
  failed_attempts: 0,
  ...over,
})

const cycle = (over: Partial<StuckCycle> = {}): StuckCycle => ({
  id: "subcyc_1",
  subscription_id: "sub_01ABCDEFGHJKMN",
  period_key: "2026-10-28",
  attempt: 1,
  status: "charged_pending_order",
  ...over,
})

const notFound = () => Object.assign(new Error("422"), { response: { status: 422 } })
const charged = { ok: true as const, authorizationCode: "1", amount: 50000, buyOrder: "C1" }

function make(c: StuckCycle, s: CycleSubscription = sub()) {
  const state = { ...s }
  const deps = {
    listStuck: jest.fn(async () => [c]),
    cycleStatus: jest.fn(async () => c.status),
    retrieveSubscription: jest.fn(async () => ({ ...state })),
    updateSubscriptions: jest.fn(async (d: Record<string, unknown>) => void Object.assign(state, d)),
    updateCycle: jest.fn().mockResolvedValue({}),
    findOrderForCycle: jest.fn().mockResolvedValue(null),
    chargeStatus: jest.fn(),
    placeOrder: jest.fn().mockResolvedValue({ orderId: "order_new", total: 50000 }),
    withLock: jest.fn(async (_k: string, job: () => Promise<unknown>) => job()),
    alert: jest.fn(),
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    giftVariantId: null,
    now: () => NOW,
  }
  // `any`: los métodos son dobles de jest y las pruebas les ajustan el resultado.
  return { deps: deps as any, state }
}

describe("reconcileSubscriptionCycles", () => {
  it("busca ciclos reservados hace más del umbral", async () => {
    const { deps } = make(cycle())
    deps.chargeStatus.mockRejectedValue(notFound())
    await reconcileSubscriptionCycles(deps)
    const staleBefore: Date = deps.listStuck.mock.calls[0][0]
    expect(NOW.getTime() - staleBefore.getTime()).toBe(STALE_RESERVED_MINUTES * 60 * 1000)
  })

  describe("Transbank no tiene cobro", () => {
    it("libera el ciclo y reintenta mañana sin castigar al cliente", async () => {
      const { deps, state } = make(cycle({ status: "reserved" }))
      deps.chargeStatus.mockRejectedValue(notFound())

      const summary = await reconcileSubscriptionCycles(deps)

      expect(summary.released).toBe(1)
      expect(deps.updateCycle).toHaveBeenCalledWith(
        expect.objectContaining({ id: "subcyc_1", status: "failed", error: expect.stringContaining("interrumpido") })
      )
      expect(state).toMatchObject({ next_billing_date: "2026-10-29", failed_attempts: 0 })
      expect(deps.placeOrder).not.toHaveBeenCalled()
    })

    it("un status que responde no autorizado también cuenta como sin cobro", async () => {
      const { deps } = make(cycle())
      deps.chargeStatus.mockResolvedValue({ ok: false, code: -1, status: "FAILED" })
      expect((await reconcileSubscriptionCycles(deps)).released).toBe(1)
    })

    it("si la suscripción ya siguió su camino no toca su fecha", async () => {
      const { deps, state } = make(cycle(), sub({ next_billing_date: "2026-11-27" }))
      deps.chargeStatus.mockRejectedValue(notFound())
      await reconcileSubscriptionCycles(deps)
      expect(state.next_billing_date).toBe("2026-11-27")
    })
  })

  describe("Transbank sí cobró", () => {
    it("con pedido existente: cierra el ciclo y avanza la suscripción, sin crear otro pedido", async () => {
      const { deps, state } = make(cycle())
      deps.chargeStatus.mockResolvedValue(charged)
      deps.findOrderForCycle.mockResolvedValue({ id: "order_old", total: 50000 })

      const summary = await reconcileSubscriptionCycles(deps)

      expect(summary.completed).toBe(1)
      expect(deps.placeOrder).not.toHaveBeenCalled()
      expect(deps.updateCycle).toHaveBeenCalledWith({
        id: "subcyc_1",
        status: "completed",
        order_id: "order_old",
        amount: 50000,
        error: null,
      })
      expect(state).toMatchObject({ next_billing_date: "2026-11-27", welcome_gift_given: true, failed_attempts: 0 })
    })

    it("sin pedido: lo crea reutilizando las mismas órdenes de compra, sin cobrar otra vez", async () => {
      const { deps } = make(cycle())
      deps.chargeStatus.mockResolvedValue(charged)

      const summary = await reconcileSubscriptionCycles(deps)

      expect(summary.completed).toBe(1)
      const input = deps.placeOrder.mock.calls[0][0]
      expect(input.parentBuyOrder).toBe(deps.chargeStatus.mock.calls[0][0])
      expect(input.cycleId).toBe("subcyc_1")
      expect(deps.updateCycle).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", order_id: "order_new" }))
    })

    it("si el pedido sigue sin poder crearse: alerta y deja el ciclo a medias", async () => {
      const { deps, state } = make(cycle())
      deps.chargeStatus.mockResolvedValue(charged)
      deps.placeOrder.mockRejectedValue(new Error("sin stock"))

      const summary = await reconcileSubscriptionCycles(deps)

      expect(summary.still_stuck).toBe(1)
      expect(deps.alert).toHaveBeenCalledWith(
        "Cliente cobrado sin pedido de suscripción",
        expect.objectContaining({ cycleId: "subcyc_1", amount: 50000 })
      )
      expect(deps.updateCycle).not.toHaveBeenCalled()
      expect(state.next_billing_date).toBe("2026-10-28")
    })

    it("si la suscripción ya no esperaba este ciclo, no mueve su fecha", async () => {
      const { deps, state } = make(cycle(), sub({ status: "cancelled", next_billing_date: null, welcome_gift_given: true }))
      deps.chargeStatus.mockResolvedValue(charged)
      deps.findOrderForCycle.mockResolvedValue({ id: "order_old", total: 50000 })
      await reconcileSubscriptionCycles(deps)
      expect(state.status).toBe("cancelled")
      expect(state.next_billing_date).toBeNull()
    })
  })

  it("si no se puede consultar a Transbank no cambia nada: se reintenta en la próxima corrida", async () => {
    const { deps } = make(cycle())
    deps.chargeStatus.mockRejectedValue(new Error("ETIMEDOUT"))

    const summary = await reconcileSubscriptionCycles(deps)

    expect(summary.unknown).toBe(1)
    expect(deps.updateCycle).not.toHaveBeenCalled()
    expect(deps.updateSubscriptions).not.toHaveBeenCalled()
    expect(deps.placeOrder).not.toHaveBeenCalled()
  })

  it("si otro proceso ya resolvió el ciclo mientras esperaba el candado, lo omite", async () => {
    const { deps } = make(cycle())
    deps.cycleStatus.mockResolvedValue("completed")

    const summary = await reconcileSubscriptionCycles(deps)

    expect(summary.skipped).toBe(1)
    expect(deps.chargeStatus).not.toHaveBeenCalled()
  })

  it("usa el mismo candado que la renovación", async () => {
    const { deps } = make(cycle())
    deps.chargeStatus.mockRejectedValue(notFound())
    await reconcileSubscriptionCycles(deps)
    expect(deps.withLock).toHaveBeenCalledWith("subscription:sub_01ABCDEFGHJKMN", expect.any(Function))
  })

  it("un error inesperado en un ciclo no detiene la corrida", async () => {
    const { deps } = make(cycle())
    deps.retrieveSubscription.mockRejectedValue(new Error("db caída"))
    const summary = await reconcileSubscriptionCycles(deps)
    expect(summary.unknown).toBe(1)
    expect(deps.logger.error).toHaveBeenCalled()
  })
})
