import {
  cardReturnUrl,
  completeCardEnrollment,
  startCardEnrollment,
  type CardEnrollmentDeps,
} from "../subscription-card"

const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub_1",
  customer_id: "cus_1",
  status: "pending_card",
  payment_token_ref: null,
  ...over,
})

function makeDeps(row: ReturnType<typeof sub> | null = sub()) {
  const subscriptions = {
    retrieveSubscription: jest.fn().mockImplementation(async () => {
      if (!row) throw new Error("not found")
      return row
    }),
    listSubscriptions: jest.fn().mockResolvedValue(row ? [row] : []),
    updateSubscriptions: jest.fn().mockResolvedValue({}),
  }
  const oneclick = {
    startInscription: jest.fn().mockResolvedValue({ token: "tok", url: "https://tbk/ins" }),
    finishInscription: jest.fn(),
    deleteInscription: jest.fn().mockResolvedValue(undefined),
  }
  const logger = { warn: jest.fn() }
  return { deps: { subscriptions, oneclick, logger } as CardEnrollmentDeps, subscriptions, oneclick, logger }
}

describe("startCardEnrollment", () => {
  const input = { subscriptionId: "sub_1", customerId: "cus_1", email: "a@b.cl", responseUrl: "https://x/cb" }

  it("inicia la inscripción y guarda el token en la suscripción", async () => {
    const { deps, subscriptions, oneclick } = makeDeps()
    await expect(startCardEnrollment(deps, input)).resolves.toEqual({ token: "tok", url: "https://tbk/ins" })
    expect(oneclick.startInscription).toHaveBeenCalledWith({
      username: "cus_1",
      email: "a@b.cl",
      responseUrl: "https://x/cb",
    })
    expect(subscriptions.updateSubscriptions).toHaveBeenCalledWith({ id: "sub_1", inscription_token: "tok" })
  })

  it("una suscripción de otro cliente responde igual que una inexistente", async () => {
    const other = makeDeps(sub({ customer_id: "cus_OTRO" }))
    await expect(startCardEnrollment(other.deps, input)).rejects.toThrow("Suscripción no encontrada.")
    expect(other.oneclick.startInscription).not.toHaveBeenCalled()

    const missing = makeDeps(null)
    await expect(startCardEnrollment(missing.deps, input)).rejects.toThrow("Suscripción no encontrada.")
  })

  it("no inscribe tarjeta en una suscripción cancelada", async () => {
    const { deps, oneclick } = makeDeps(sub({ status: "cancelled" }))
    await expect(startCardEnrollment(deps, input)).rejects.toThrow(/cancelada/)
    expect(oneclick.startInscription).not.toHaveBeenCalled()
  })

  it.each(["active", "paused", "past_due", "pending_card"])("permite %s (cambio de tarjeta)", async (status) => {
    const { deps } = makeDeps(sub({ status }))
    await expect(startCardEnrollment(deps, input)).resolves.toBeDefined()
  })
})

describe("completeCardEnrollment", () => {
  it("guarda tbk_user y la tarjeta enmascarada, y borra el token antes de confirmar", async () => {
    const { deps, subscriptions, oneclick } = makeDeps()
    oneclick.finishInscription.mockResolvedValue({ ok: true, tbkUser: "tbk-1", cardBrand: "Visa", last4: "6623" })

    await expect(completeCardEnrollment(deps, "tok")).resolves.toEqual({ outcome: "ok", subscriptionId: "sub_1" })

    const calls = subscriptions.updateSubscriptions.mock.calls.map((c) => c[0])
    expect(calls[0]).toEqual({ id: "sub_1", inscription_token: null })
    expect(calls[1]).toEqual({ id: "sub_1", payment_token_ref: "tbk-1", card_brand: "Visa", card_last4: "6623" })
    expect(oneclick.deleteInscription).not.toHaveBeenCalled()
  })

  it("token desconocido (o ya usado): no confirma nada en Transbank", async () => {
    const { deps, oneclick } = makeDeps(null)
    await expect(completeCardEnrollment(deps, "tok")).resolves.toEqual({ outcome: "unknown" })
    await expect(completeCardEnrollment(deps, "")).resolves.toEqual({ outcome: "unknown" })
    expect(oneclick.finishInscription).not.toHaveBeenCalled()
  })

  it("rechazo de Transbank: no guarda tarjeta y deja el token inutilizado", async () => {
    const { deps, subscriptions, oneclick } = makeDeps()
    oneclick.finishInscription.mockResolvedValue({ ok: false, code: -96 })

    await expect(completeCardEnrollment(deps, "tok")).resolves.toEqual({
      outcome: "rejected",
      subscriptionId: "sub_1",
    })
    expect(subscriptions.updateSubscriptions).toHaveBeenCalledTimes(1)
    expect(subscriptions.updateSubscriptions).toHaveBeenCalledWith({ id: "sub_1", inscription_token: null })
  })

  it("si finish lanza (inscripción abortada o vencida) es un rechazo, no un error", async () => {
    const { deps, oneclick, logger } = makeDeps()
    oneclick.finishInscription.mockRejectedValue(new Error("422"))
    await expect(completeCardEnrollment(deps, "tok")).resolves.toMatchObject({ outcome: "rejected" })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("al cambiar de tarjeta da de baja la anterior", async () => {
    const { deps, oneclick } = makeDeps(sub({ payment_token_ref: "tbk-viejo" }))
    oneclick.finishInscription.mockResolvedValue({ ok: true, tbkUser: "tbk-nuevo", cardBrand: null, last4: "1111" })

    await completeCardEnrollment(deps, "tok")

    expect(oneclick.deleteInscription).toHaveBeenCalledWith({ tbkUser: "tbk-viejo", username: "cus_1" })
  })

  it("si no se puede dar de baja la anterior, el cambio igual queda hecho", async () => {
    const { deps, oneclick, logger } = makeDeps(sub({ payment_token_ref: "tbk-viejo" }))
    oneclick.finishInscription.mockResolvedValue({ ok: true, tbkUser: "tbk-nuevo", cardBrand: null, last4: "1111" })
    oneclick.deleteInscription.mockRejectedValue(new Error("tbk caído"))

    await expect(completeCardEnrollment(deps, "tok")).resolves.toMatchObject({ outcome: "ok" })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("si Transbank devuelve la misma tarjeta no la da de baja", async () => {
    const { deps, oneclick } = makeDeps(sub({ payment_token_ref: "tbk-igual" }))
    oneclick.finishInscription.mockResolvedValue({ ok: true, tbkUser: "tbk-igual", cardBrand: null, last4: null })
    await completeCardEnrollment(deps, "tok")
    expect(oneclick.deleteInscription).not.toHaveBeenCalled()
  })
})

describe("cardReturnUrl", () => {
  it("vuelve a la pestaña de membresía con el resultado", () => {
    expect(cardReturnUrl("https://kinetic.cl/", "ok")).toBe("https://kinetic.cl/cuenta?tab=membership&card=ok")
    expect(cardReturnUrl("https://kinetic.cl", "rejected")).toBe(
      "https://kinetic.cl/cuenta?tab=membership&card=error"
    )
    expect(cardReturnUrl(undefined, "unknown")).toBe("http://localhost:3000/cuenta?tab=membership&card=error")
  })
})
