import { PAST_DUE_ALERT_THRESHOLD, renewDueSubscriptions, type RenewalDeps } from "../subscription-renewal"
import type { CycleResult } from "../subscription-cycle"

function make(due: string[], results: Record<string, CycleResult | Error> = {}, pastDue = 0) {
  const locks: string[] = []
  const deps = {
    listDue: jest.fn(async () => due.map((id) => ({ id }))),
    countPastDue: jest.fn(async () => pastDue),
    withLock: jest.fn(async (key: string, job: () => Promise<unknown>) => {
      locks.push(key)
      return job()
    }),
    runCycle: jest.fn(async (id: string) => {
      const r = results[id] ?? { result: "completed", orderId: "o", amount: 1 }
      if (r instanceof Error) throw r
      return r
    }),
    alert: jest.fn(),
    logger: { info: jest.fn(), error: jest.fn() },
    now: () => new Date("2026-10-28T15:00:00Z"),
  } as unknown as RenewalDeps & { listDue: jest.Mock; runCycle: jest.Mock; alert: jest.Mock; withLock: jest.Mock }
  return { deps, locks }
}

describe("renewDueSubscriptions", () => {
  it("pide las vencidas al día de Chile y cobra cada una bajo su propio candado", async () => {
    const { deps, locks } = make(["sub_1", "sub_2"])
    const summary = await renewDueSubscriptions(deps)

    expect(deps.listDue).toHaveBeenCalledWith("2026-10-28", expect.any(Number))
    expect(locks).toEqual(["subscription:sub_1", "subscription:sub_2"])
    expect(summary).toMatchObject({ due: 2, completed: 2, errors: 0 })
    expect(deps.alert).not.toHaveBeenCalled()
  })

  it("sin vencidas no hace nada ni avisa", async () => {
    const { deps } = make([])
    await expect(renewDueSubscriptions(deps)).resolves.toMatchObject({ due: 0 })
    expect(deps.runCycle).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it("clasifica cada resultado", async () => {
    const { deps } = make(["a", "b", "c", "d", "e"], {
      a: { result: "rejected", pastDue: false },
      b: { result: "skipped", reason: "already_reserved" },
      c: { result: "skipped_no_stock" },
      d: { result: "needs_reconciliation", cycleId: "x" },
      e: { result: "error", cycleId: "y" },
    })
    const summary = await renewDueSubscriptions(deps)
    expect(summary).toEqual({
      due: 5,
      completed: 0,
      rejected: 1,
      skipped: 2,
      needsReconciliation: 1,
      errors: 1,
    })
  })

  it("un error en una suscripción no detiene a las demás y se reporta", async () => {
    const { deps } = make(["a", "b", "c"], { b: new Error("boom") })
    const summary = await renewDueSubscriptions(deps)

    expect(deps.runCycle).toHaveBeenCalledTimes(3)
    expect(summary).toMatchObject({ completed: 2, errors: 1 })
    expect(deps.alert).toHaveBeenCalledWith(expect.stringContaining("b"), expect.objectContaining({ subscriptionId: "b" }))
  })

  it("alerta si hay ciclos por conciliar", async () => {
    const { deps } = make(["a"], { a: { result: "needs_reconciliation", cycleId: "x" } })
    await renewDueSubscriptions(deps)
    expect(deps.alert).toHaveBeenCalledWith("Renovaciones de suscripción con problemas", expect.any(Object))
  })

  it("alerta cuando se acumulan suscripciones en past_due", async () => {
    const below = make(["a"], {}, PAST_DUE_ALERT_THRESHOLD - 1)
    await renewDueSubscriptions(below.deps)
    expect(below.deps.alert).not.toHaveBeenCalled()

    const at = make(["a"], {}, PAST_DUE_ALERT_THRESHOLD)
    await renewDueSubscriptions(at.deps)
    expect(at.deps.alert).toHaveBeenCalledWith(expect.stringContaining("past_due"), { pastDue: PAST_DUE_ALERT_THRESHOLD })
  })
})
