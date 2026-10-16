import {
  activateAndCharge,
  runSubscriptionCycle,
  type CycleDeps,
  type CycleRow,
  type CycleSubscription,
} from "../subscription-cycle"
import type { ChargeOutcome } from "../charge-outcomes"

const NOW = new Date("2026-10-28T15:00:00Z") // 28 de octubre en Chile

const sub = (over: Partial<CycleSubscription> = {}): CycleSubscription => ({
  id: "sub_01ABCDEFGHJKMN",
  customer_id: "cus_1",
  variant_id: "variant_1",
  quantity: 2,
  status: "active",
  frequency_days: 30,
  discount_percent: 15,
  next_billing_date: "2026-10-28",
  payment_token_ref: "tbk-1",
  welcome_gift_given: false,
  failed_attempts: 0,
  ...over,
})

function make(
  row: CycleSubscription = sub(),
  opts: { outcome?: ChargeOutcome; giftVariantId?: string | null } = {}
) {
  const state = { ...row }
  const subscriptions = {
    retrieveSubscription: jest.fn(async () => ({ ...state })),
    updateSubscriptions: jest.fn(async (data: Record<string, unknown>) => {
      Object.assign(state, data)
    }),
    transitionStatus: jest.fn(async (_id: string, to: CycleSubscription["status"]) => {
      state.status = to
    }),
    reserveCycle: jest.fn(
      async (subscriptionId: string, periodKey: string, attempt: number): Promise<CycleRow | null> => ({
        id: "subcyc_1",
        subscription_id: subscriptionId,
        period_key: periodKey,
        attempt,
      })
    ),
    updateSubscriptionCycles: jest.fn().mockResolvedValue({}),
  }
  const deps = {
    subscriptions,
    hasStock: jest.fn().mockResolvedValue(true),
    placeOrder: jest.fn().mockResolvedValue({ orderId: "order_1", total: 72000 }),
    giftVariantId: "giftVariantId" in opts ? opts.giftVariantId : "variant_shaker",
    notify: jest.fn().mockResolvedValue(undefined),
    report: jest.fn(),
    logger: { warn: jest.fn(), error: jest.fn() },
    takeOutcome: jest.fn(() => opts.outcome),
    now: () => NOW,
  } satisfies CycleDeps
  return { deps, subscriptions, state }
}

const cycleUpdate = (s: ReturnType<typeof make>) =>
  s.subscriptions.updateSubscriptionCycles.mock.calls.map((c) => c[0])

describe("runSubscriptionCycle: omisiones", () => {
  it.each([
    ["no activa", sub({ status: "paused" }), "not_active"],
    ["pendiente de tarjeta", sub({ status: "pending_card" }), "not_active"],
    ["sin fecha de cobro", sub({ next_billing_date: null }), "not_due"],
    ["cobro futuro", sub({ next_billing_date: "2026-10-29" }), "not_due"],
    ["sin tarjeta", sub({ payment_token_ref: null }), "no_card"],
  ])("%s: no reserva ni cobra", async (_name, row, reason) => {
    const s = make(row)
    await expect(runSubscriptionCycle(s.deps, row.id)).resolves.toEqual({ result: "skipped", reason })
    expect(s.subscriptions.reserveCycle).not.toHaveBeenCalled()
    expect(s.deps.placeOrder).not.toHaveBeenCalled()
  })

  it("día ya reservado (otra ejecución): no cobra", async () => {
    const s = make()
    s.subscriptions.reserveCycle.mockResolvedValue(null)
    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toEqual({
      result: "skipped",
      reason: "already_reserved",
    })
    expect(s.deps.placeOrder).not.toHaveBeenCalled()
  })

  it("un cobro atrasado también se procesa", async () => {
    const s = make(sub({ next_billing_date: "2026-10-26" }))
    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toMatchObject({ result: "completed" })
  })
})

describe("runSubscriptionCycle: éxito", () => {
  it("cobra, cierra el ciclo y agenda el siguiente desde el día programado", async () => {
    const s = make()
    const out = await runSubscriptionCycle(s.deps, "sub_x")

    expect(out).toEqual({ result: "completed", orderId: "order_1", amount: 72000 })
    expect(s.subscriptions.reserveCycle).toHaveBeenCalledWith(s.state.id, "2026-10-28", 1)
    expect(cycleUpdate(s)).toContainEqual({
      id: "subcyc_1",
      status: "completed",
      order_id: "order_1",
      amount: 72000,
      error: null,
    })
    expect(s.state).toMatchObject({
      failed_attempts: 0,
      welcome_gift_given: true,
      next_billing_date: "2026-11-27",
    })
    expect(s.deps.notify).toHaveBeenCalledWith({
      type: "charged",
      subscriptionId: s.state.id,
      orderId: "order_1",
      amount: 72000,
    })
  })

  it("el regalo de bienvenida va solo en el primer ciclo y solo si hay uno configurado", async () => {
    const first = make(sub({ welcome_gift_given: false }))
    await runSubscriptionCycle(first.deps, "sub_x")
    expect(first.deps.placeOrder.mock.calls[0][0].includeGift).toBe(true)

    const later = make(sub({ welcome_gift_given: true }))
    await runSubscriptionCycle(later.deps, "sub_x")
    expect(later.deps.placeOrder.mock.calls[0][0].includeGift).toBe(false)

    const noGift = make(sub({ welcome_gift_given: false }), { giftVariantId: null })
    await runSubscriptionCycle(noGift.deps, "sub_x")
    expect(noGift.deps.placeOrder.mock.calls[0][0].includeGift).toBe(false)
  })

  it("las órdenes de compra son las deterministas del ciclo", async () => {
    const s = make()
    await runSubscriptionCycle(s.deps, "sub_x")
    const input = s.deps.placeOrder.mock.calls[0][0]
    expect(input.parentBuyOrder).toMatch(/^P[A-Za-z0-9]{1,25}$/)
    expect(input.childBuyOrder).toMatch(/^C[A-Za-z0-9]{1,25}$/)
    expect(input.cycleId).toBe("subcyc_1")
  })

  it("si falla el aviso por correo, el ciclo igual queda completo", async () => {
    const s = make()
    s.deps.notify.mockRejectedValue(new Error("resend caído"))
    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toMatchObject({ result: "completed" })
    expect(s.deps.logger.warn).toHaveBeenCalled()
  })
})

describe("runSubscriptionCycle: sin stock", () => {
  it("salta el ciclo sin cobrar ni contar rechazo, y avisa", async () => {
    const s = make(sub({ failed_attempts: 1 }))
    s.deps.hasStock.mockResolvedValue(false)

    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toEqual({ result: "skipped_no_stock" })

    expect(s.deps.placeOrder).not.toHaveBeenCalled()
    expect(cycleUpdate(s)).toContainEqual({ id: "subcyc_1", status: "failed", error: "sin_stock" })
    expect(s.state.next_billing_date).toBe("2026-11-27")
    expect(s.state.failed_attempts).toBe(1)
    expect(s.state.status).toBe("active")
    expect(s.deps.notify).toHaveBeenCalledWith({ type: "skipped_no_stock", subscriptionId: s.state.id })
  })
})

describe("runSubscriptionCycle: rechazo del banco", () => {
  const rejected: ChargeOutcome = { kind: "rejected", code: -1, detail: "REJECTED (-1)" }

  it("primer rechazo: reintenta mañana y cuenta el intento", async () => {
    const s = make(sub(), { outcome: rejected })
    s.deps.placeOrder.mockRejectedValue(new Error("pago falló"))

    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toEqual({ result: "rejected", pastDue: false })

    expect(s.state).toMatchObject({ status: "active", failed_attempts: 1, next_billing_date: "2026-10-29" })
    expect(cycleUpdate(s)[0]).toMatchObject({ status: "failed" })
    expect(s.deps.notify).toHaveBeenCalledWith({
      type: "rejected",
      subscriptionId: s.state.id,
      willRetryOn: "2026-10-29",
      pastDue: false,
    })
    expect(s.state.welcome_gift_given).toBe(false)
  })

  it("el reintento usa otro intento (otras órdenes de compra)", async () => {
    const s = make(sub({ failed_attempts: 1, next_billing_date: "2026-10-28" }), { outcome: rejected })
    s.deps.placeOrder.mockRejectedValue(new Error("x"))
    await runSubscriptionCycle(s.deps, "sub_x")
    expect(s.subscriptions.reserveCycle).toHaveBeenCalledWith(s.state.id, "2026-10-28", 2)
  })

  it("tercer rechazo seguido: pasa a past_due y deja de cobrarse", async () => {
    const s = make(sub({ failed_attempts: 2 }), { outcome: rejected })
    s.deps.placeOrder.mockRejectedValue(new Error("x"))

    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toEqual({ result: "rejected", pastDue: true })

    expect(s.state).toMatchObject({ status: "past_due", failed_attempts: 3, next_billing_date: null })
    expect(s.deps.notify).toHaveBeenCalledWith(expect.objectContaining({ type: "rejected", pastDue: true }))
  })
})

describe("runSubscriptionCycle: casos que no se reintentan a ciegas", () => {
  it("resultado ambiguo: queda para conciliar, sin tocar fechas ni intentos", async () => {
    const s = make(sub(), { outcome: { kind: "ambiguous", detail: "timeout" } })
    s.deps.placeOrder.mockRejectedValue(new Error("x"))

    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toEqual({
      result: "needs_reconciliation",
      cycleId: "subcyc_1",
    })

    expect(cycleUpdate(s)[0]).toMatchObject({ status: "charged_pending_order" })
    expect(s.state).toMatchObject({ next_billing_date: "2026-10-28", failed_attempts: 0, status: "active" })
    expect(s.deps.report).toHaveBeenCalled()
  })

  it("cobrado pero el pedido falló: a conciliar, nunca vuelve a cobrar", async () => {
    const s = make(sub(), { outcome: { kind: "authorized", authorizationCode: "1213" } })
    s.deps.placeOrder.mockRejectedValue(new Error("no se pudo crear la orden"))

    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toMatchObject({ result: "needs_reconciliation" })

    expect(cycleUpdate(s)[0]).toMatchObject({
      status: "charged_pending_order",
      error: expect.stringContaining("cobrado pero el pedido falló"),
    })
    expect(s.state.next_billing_date).toBe("2026-10-28")
  })
})

describe("runSubscriptionCycle: fallo del sistema antes de cobrar", () => {
  it("reintenta mañana SIN contar como rechazo del cliente", async () => {
    const s = make(sub({ failed_attempts: 1 }))
    s.deps.placeOrder.mockRejectedValue(new Error("Chilexpress no reconoce la comuna"))

    await expect(runSubscriptionCycle(s.deps, "sub_x")).resolves.toEqual({ result: "error", cycleId: "subcyc_1" })

    expect(s.state).toMatchObject({ status: "active", failed_attempts: 1, next_billing_date: "2026-10-29" })
    expect(cycleUpdate(s)[0]).toMatchObject({ status: "failed", error: expect.stringContaining("Chilexpress") })
    expect(s.deps.report).toHaveBeenCalled()
    expect(s.deps.notify).not.toHaveBeenCalled()
  })
})

describe("activateAndCharge", () => {
  it("pendiente de tarjeta: activa, programa para hoy y cobra de inmediato", async () => {
    const s = make(sub({ status: "pending_card", next_billing_date: null }))
    const out = await activateAndCharge(s.deps, "sub_x")

    expect(out).toMatchObject({ result: "completed" })
    expect(s.subscriptions.transitionStatus).toHaveBeenCalledWith(s.state.id, "active")
    expect(s.subscriptions.reserveCycle).toHaveBeenCalledWith(s.state.id, "2026-10-28", 1)
    expect(s.state.next_billing_date).toBe("2026-11-27")
  })

  it("past_due con tarjeta nueva: reinicia los intentos y cobra", async () => {
    const s = make(sub({ status: "past_due", failed_attempts: 3, next_billing_date: null }))
    await activateAndCharge(s.deps, "sub_x")
    expect(s.subscriptions.reserveCycle).toHaveBeenCalledWith(s.state.id, "2026-10-28", 1)
    expect(s.state.failed_attempts).toBe(0)
  })

  it("activa o pausada (solo cambió de tarjeta): no cobra", async () => {
    for (const status of ["active", "paused"] as const) {
      const s = make(sub({ status }))
      await expect(activateAndCharge(s.deps, "sub_x")).resolves.toBeNull()
      expect(s.subscriptions.reserveCycle).not.toHaveBeenCalled()
    }
  })

  it("sin tarjeta no activa nada", async () => {
    const s = make(sub({ status: "pending_card", payment_token_ref: null }))
    await expect(activateAndCharge(s.deps, "sub_x")).resolves.toBeNull()
    expect(s.subscriptions.transitionStatus).not.toHaveBeenCalled()
  })
})
