import { REMINDER_DAYS_BEFORE, sendBillingReminders, type ReminderCandidate, type ReminderDeps } from "../subscription-reminder"

const NOW = new Date("2026-10-28T15:00:00Z") // 28 de octubre en Chile -> avisa los cobros del 31

function make(rows: ReminderCandidate[]) {
  const deps = {
    listAhead: jest.fn(async () => rows),
    estimateAmount: jest.fn(async () => 56092),
    send: jest.fn().mockResolvedValue(undefined),
    markSent: jest.fn().mockResolvedValue(undefined),
    logger: { info: jest.fn(), error: jest.fn() },
    now: () => NOW,
  }
  return deps as typeof deps & ReminderDeps
}

const row = (over: Partial<ReminderCandidate> = {}): ReminderCandidate => ({
  id: "sub_1",
  next_billing_date: "2026-10-31",
  reminder_sent_for: null,
  ...over,
})

describe("sendBillingReminders", () => {
  it(`avisa ${REMINDER_DAYS_BEFORE} días antes, con el monto estimado, y marca el día avisado`, async () => {
    const deps = make([row()])
    const summary = await sendBillingReminders(deps)

    expect(deps.listAhead).toHaveBeenCalledWith("2026-10-31")
    expect(deps.send).toHaveBeenCalledWith({ subscriptionId: "sub_1", amount: 56092 })
    expect(deps.markSent).toHaveBeenCalledWith("sub_1", "2026-10-31")
    expect(summary).toEqual({ candidates: 1, sent: 1, skipped: 0, failed: 0 })
  })

  it("no vuelve a avisar el mismo día de cobro (job repetido)", async () => {
    const deps = make([row({ reminder_sent_for: "2026-10-31" })])
    const summary = await sendBillingReminders(deps)
    expect(deps.send).not.toHaveBeenCalled()
    expect(summary.skipped).toBe(1)
  })

  it("avisa de nuevo en el ciclo siguiente (otro día de cobro)", async () => {
    const deps = make([row({ reminder_sent_for: "2026-09-30" })])
    await sendBillingReminders(deps)
    expect(deps.send).toHaveBeenCalled()
  })

  it("omite a quien cambió su día de cobro después de listarse", async () => {
    const deps = make([row({ next_billing_date: "2026-11-05" })])
    const summary = await sendBillingReminders(deps)
    expect(deps.send).not.toHaveBeenCalled()
    expect(summary.skipped).toBe(1)
  })

  it("si el correo falla no marca el día (se reintenta) y sigue con los demás", async () => {
    const deps = make([row({ id: "sub_a" }), row({ id: "sub_b" })])
    deps.send.mockRejectedValueOnce(new Error("resend caído"))

    const summary = await sendBillingReminders(deps)

    expect(summary).toMatchObject({ sent: 1, failed: 1 })
    expect(deps.markSent).toHaveBeenCalledTimes(1)
    expect(deps.markSent).toHaveBeenCalledWith("sub_b", "2026-10-31")
    expect(deps.logger.error).toHaveBeenCalled()
  })

  it("el día objetivo se calcula con el calendario de Chile, no el de UTC", async () => {
    const deps = make([])
    deps.now = () => new Date("2026-10-29T02:00:00Z") // 23:00 del 28 en Chile
    await sendBillingReminders(deps)
    expect(deps.listAhead).toHaveBeenCalledWith("2026-10-31")
  })

  it("sin candidatas no hace ruido", async () => {
    const deps = make([])
    await sendBillingReminders(deps)
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})
