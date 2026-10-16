import {
  cancelSubscription,
  createSubscription,
  getOwned,
  parseQuantity,
  parseShippingAddress,
  pauseSubscription,
  resumeSubscription,
  serializeSubscription,
  updateSubscription,
  type ActionDeps,
  type SubscriptionRow,
} from "../subscription-actions"
import { assertTransition } from "../subscription-state"

const ADDRESS = {
  first_name: "Ana",
  last_name: "Pérez",
  phone: "+56911112222",
  address_1: "Av. Siempre Viva 123",
  city: "Ovalle",
}

const row = (over: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: "sub_1",
  customer_id: "cus_1",
  variant_id: "variant_1",
  quantity: 1,
  status: "active",
  frequency_days: 30,
  discount_percent: 15,
  next_billing_date: "2026-11-27",
  payment_token_ref: "tbk-secret",
  card_brand: "Visa",
  card_last4: "6623",
  shipping_address: { ...ADDRESS, country_code: "cl" },
  welcome_gift_given: true,
  failed_attempts: 0,
  ...over,
})

function makeDeps(rows: SubscriptionRow[] = [row()], now = new Date("2026-10-28T15:00:00Z")) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]))
  const subscriptions = {
    retrieveSubscription: jest.fn(async (id: string) => {
      const r = store.get(id)
      if (!r) throw new Error("not found")
      return { ...r }
    }),
    listSubscriptions: jest.fn(async (filter: Record<string, unknown>) =>
      [...store.values()].filter((r) => Object.entries(filter).every(([k, v]) => (r as any)[k] === v))
    ),
    createSubscriptions: jest.fn(async (data: Record<string, unknown>) => {
      const r = row({ id: "sub_new", payment_token_ref: null, card_last4: null, card_brand: null, ...data } as any)
      store.set(r.id, r)
      return { ...r }
    }),
    updateSubscriptions: jest.fn(async (data: Record<string, unknown> & { id: string }) => {
      const r = { ...store.get(data.id)!, ...data } as SubscriptionRow
      store.set(r.id, r)
      return { ...r }
    }),
    // Misma validación que el servicio real.
    transitionStatus: jest.fn(async (id: string, to: SubscriptionRow["status"]) => {
      assertTransition(store.get(id)!.status, to)
      store.set(id, { ...store.get(id)!, status: to })
    }),
  }
  const deps: ActionDeps = {
    subscriptions,
    variantIsPurchasable: jest.fn().mockResolvedValue(true),
    comunaIsCovered: jest.fn().mockResolvedValue(true),
    oneclick: { deleteInscription: jest.fn().mockResolvedValue(undefined) },
    logger: { warn: jest.fn() },
    notify: jest.fn().mockResolvedValue(undefined),
    now: () => now,
  }
  return { deps, subscriptions, store }
}

describe("serializeSubscription", () => {
  it("nunca expone el token de la tarjeta ni el de inscripción", () => {
    const out = serializeSubscription(row({ inscription_token: "tbk-ins" } as any))
    const json = JSON.stringify(out)
    expect(json).not.toContain("tbk-secret")
    expect(json).not.toContain("tbk-ins")
    expect(out.card).toEqual({ brand: "Visa", last4: "6623", masked: "Visa •••• 6623" })
    expect(out.has_card).toBe(true)
  })

  it("sin tarjeta: card null y has_card false", () => {
    const out = serializeSubscription(row({ payment_token_ref: null, card_last4: null, card_brand: null }))
    expect(out.card).toBeNull()
    expect(out.has_card).toBe(false)
  })
})

describe("validación", () => {
  it("parseShippingAddress exige los campos y solo acepta Chile", () => {
    expect(parseShippingAddress(ADDRESS)).toMatchObject({ city: "Ovalle", country_code: "cl" })
    expect(() => parseShippingAddress({ ...ADDRESS, phone: "" })).toThrow(/teléfono/)
    expect(() => parseShippingAddress({ ...ADDRESS, city: " " })).toThrow(/comuna/)
    expect(() => parseShippingAddress({ ...ADDRESS, country_code: "ar" })).toThrow(/Chile/)
    expect(() => parseShippingAddress(null)).toThrow(/dirección/)
  })

  it("parseShippingAddress descarta campos desconocidos", () => {
    const parsed = parseShippingAddress({ ...ADDRESS, is_admin: true, id: "x" })
    expect(parsed).not.toHaveProperty("is_admin")
    expect(parsed).not.toHaveProperty("id")
  })

  it("parseQuantity acepta enteros de 1 a 10", () => {
    expect(parseQuantity(undefined)).toBe(1)
    expect(parseQuantity(3)).toBe(3)
    for (const bad of [0, 11, 1.5, "2", null, -1]) {
      expect(() => parseQuantity(bad)).toThrow(/cantidad/)
    }
  })
})

describe("createSubscription", () => {
  const body = { variant_id: "variant_9", quantity: 2, shipping_address: ADDRESS, accepted_terms: true }

  it("crea en pending_card, sin cobrar, con la aceptación de términos fechada", async () => {
    const { deps, subscriptions } = makeDeps([])
    await createSubscription(deps, "cus_1", body)

    const arg = subscriptions.createSubscriptions.mock.calls[0][0]
    expect(arg).toMatchObject({ customer_id: "cus_1", variant_id: "variant_9", quantity: 2, status: "pending_card" })
    expect(arg.terms_accepted_at).toEqual(new Date("2026-10-28T15:00:00Z"))
  })

  it("exige aceptar los términos", async () => {
    const { deps, subscriptions } = makeDeps([])
    for (const accepted_terms of [undefined, false, "true", 1]) {
      await expect(createSubscription(deps, "cus_1", { ...body, accepted_terms })).rejects.toThrow(/términos/)
    }
    expect(subscriptions.createSubscriptions).not.toHaveBeenCalled()
  })

  it("el cliente y el estado no se toman del cuerpo", async () => {
    const { deps, subscriptions } = makeDeps([])
    await createSubscription(deps, "cus_1", {
      ...body,
      customer_id: "cus_OTRO",
      status: "active",
      discount_percent: 90,
      payment_token_ref: "robado",
    })
    const arg = subscriptions.createSubscriptions.mock.calls[0][0]
    expect(arg.customer_id).toBe("cus_1")
    expect(arg.status).toBe("pending_card")
    expect(arg).not.toHaveProperty("discount_percent")
    expect(arg).not.toHaveProperty("payment_token_ref")
  })

  it("rechaza productos no vendibles y comunas sin cobertura", async () => {
    const a = makeDeps([])
    ;(a.deps.variantIsPurchasable as jest.Mock).mockResolvedValue(false)
    await expect(createSubscription(a.deps, "cus_1", body)).rejects.toThrow(/no está disponible/)

    const b = makeDeps([])
    ;(b.deps.comunaIsCovered as jest.Mock).mockResolvedValue(false)
    await expect(createSubscription(b.deps, "cus_1", body)).rejects.toThrow(/cobertura/)
  })

  it("doble clic: reutiliza la pendiente en vez de crear otra", async () => {
    const { deps, subscriptions } = makeDeps([
      row({ id: "sub_p", variant_id: "variant_9", status: "pending_card", payment_token_ref: null }),
    ])
    await createSubscription(deps, "cus_1", body)
    expect(subscriptions.createSubscriptions).not.toHaveBeenCalled()
    expect(subscriptions.updateSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub_p", quantity: 2 })
    )
  })

  it("ya suscrito al mismo producto: conflicto", async () => {
    const { deps } = makeDeps([row({ variant_id: "variant_9", status: "active" })])
    await expect(createSubscription(deps, "cus_1", body)).rejects.toThrow(/Ya tienes una suscripción/)
  })

  it("una cancelada no impide suscribirse de nuevo", async () => {
    const { deps, subscriptions } = makeDeps([row({ variant_id: "variant_9", status: "cancelled" })])
    await createSubscription(deps, "cus_1", body)
    expect(subscriptions.createSubscriptions).toHaveBeenCalled()
  })
})

describe("propiedad", () => {
  it("la suscripción de otro cliente responde 404 en todas las acciones", async () => {
    const { deps, subscriptions } = makeDeps([row({ customer_id: "cus_OTRO" })])
    const actions = [
      () => getOwned(deps, "sub_1", "cus_1"),
      () => pauseSubscription(deps, "cus_1", "sub_1"),
      () => resumeSubscription(deps, "cus_1", "sub_1"),
      () => cancelSubscription(deps, "cus_1", "sub_1"),
      () => updateSubscription(deps, "cus_1", "sub_1", { quantity: 2 }),
    ]
    for (const act of actions) {
      await expect(act()).rejects.toThrow("Suscripción no encontrada.")
    }
    expect(subscriptions.transitionStatus).not.toHaveBeenCalled()
    expect(subscriptions.updateSubscriptions).not.toHaveBeenCalled()
    expect(deps.oneclick.deleteInscription).not.toHaveBeenCalled()
  })
})

describe("avisos por correo", () => {
  it("pausar y cancelar avisan al cliente", async () => {
    const a = makeDeps()
    await pauseSubscription(a.deps, "cus_1", "sub_1")
    expect(a.deps.notify).toHaveBeenCalledWith("paused", "sub_1")

    const b = makeDeps()
    await cancelSubscription(b.deps, "cus_1", "sub_1")
    expect(b.deps.notify).toHaveBeenCalledWith("cancelled", "sub_1")
  })

  it("si el correo falla, la acción igual se completa", async () => {
    const { deps } = makeDeps()
    ;(deps.notify as jest.Mock).mockRejectedValue(new Error("resend caído"))
    expect((await pauseSubscription(deps, "cus_1", "sub_1")).status).toBe("paused")
    expect(deps.logger!.warn).toHaveBeenCalled()
  })

  it("una acción rechazada no avisa", async () => {
    const { deps } = makeDeps([row({ status: "cancelled" })])
    await expect(pauseSubscription(deps, "cus_1", "sub_1")).rejects.toThrow()
    expect(deps.notify).not.toHaveBeenCalled()
  })
})

describe("pausar y reanudar", () => {
  it("pausa una activa", async () => {
    const { deps } = makeDeps()
    expect((await pauseSubscription(deps, "cus_1", "sub_1")).status).toBe("paused")
  })

  it("reanuda: si el día de cobro ya pasó, queda para hoy", async () => {
    const { deps } = makeDeps([row({ status: "paused", next_billing_date: "2026-10-01" })])
    const sub = await resumeSubscription(deps, "cus_1", "sub_1")
    expect(sub.status).toBe("active")
    expect(sub.next_billing_date).toBe("2026-10-28")
  })

  it("reanuda: si el día de cobro es futuro, lo conserva", async () => {
    const { deps } = makeDeps([row({ status: "paused", next_billing_date: "2026-11-27" })])
    expect((await resumeSubscription(deps, "cus_1", "sub_1")).next_billing_date).toBe("2026-11-27")
  })

  it("solo se reanuda una pausada y con tarjeta", async () => {
    await expect(resumeSubscription(makeDeps().deps, "cus_1", "sub_1")).rejects.toThrow(/pausada/)
    const noCard = makeDeps([row({ status: "paused", payment_token_ref: null })])
    await expect(resumeSubscription(noCard.deps, "cus_1", "sub_1")).rejects.toThrow(/tarjeta/)
  })
})

describe("cancelSubscription", () => {
  it("cancela, quita el token de la tarjeta y la da de baja en Transbank", async () => {
    const { deps, subscriptions } = makeDeps()
    const sub = await cancelSubscription(deps, "cus_1", "sub_1")

    expect(sub.status).toBe("cancelled")
    expect(subscriptions.updateSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub_1", payment_token_ref: null })
    )
    expect(deps.oneclick.deleteInscription).toHaveBeenCalledWith({ tbkUser: "tbk-secret", username: "cus_1" })
  })

  it("si la baja en Transbank falla, igual queda cancelada", async () => {
    const { deps } = makeDeps()
    ;(deps.oneclick.deleteInscription as jest.Mock).mockRejectedValue(new Error("tbk caído"))
    const sub = await cancelSubscription(deps, "cus_1", "sub_1")
    expect(sub.status).toBe("cancelled")
    expect(deps.logger!.warn).toHaveBeenCalled()
  })

  it("sin tarjeta no llama a Transbank", async () => {
    const { deps } = makeDeps([row({ status: "pending_card", payment_token_ref: null })])
    await cancelSubscription(deps, "cus_1", "sub_1")
    expect(deps.oneclick.deleteInscription).not.toHaveBeenCalled()
  })

  it("no se puede cancelar dos veces", async () => {
    const { deps } = makeDeps([row({ status: "cancelled", payment_token_ref: null })])
    await expect(cancelSubscription(deps, "cus_1", "sub_1")).rejects.toThrow(/No se puede pasar/)
    expect(deps.oneclick.deleteInscription).not.toHaveBeenCalled()
  })
})

describe("updateSubscription", () => {
  it("cambia sabor y cantidad sin tocar estado ni próximo cobro", async () => {
    const { deps, subscriptions } = makeDeps()
    const sub = await updateSubscription(deps, "cus_1", "sub_1", { variant_id: "variant_2", quantity: 3 })
    expect(sub).toMatchObject({ variant_id: "variant_2", quantity: 3, status: "active", next_billing_date: "2026-11-27" })
    expect(subscriptions.transitionStatus).not.toHaveBeenCalled()
  })

  it("solo toma campos permitidos", async () => {
    const { deps, subscriptions } = makeDeps()
    await updateSubscription(deps, "cus_1", "sub_1", { quantity: 2, status: "cancelled", discount_percent: 99, customer_id: "x" })
    const arg = subscriptions.updateSubscriptions.mock.calls[0][0]
    expect(Object.keys(arg).sort()).toEqual(["id", "quantity"])
  })

  it("valida variante y dirección nuevas", async () => {
    const a = makeDeps()
    ;(a.deps.variantIsPurchasable as jest.Mock).mockResolvedValue(false)
    await expect(updateSubscription(a.deps, "cus_1", "sub_1", { variant_id: "v" })).rejects.toThrow(/no está disponible/)

    const b = makeDeps()
    ;(b.deps.comunaIsCovered as jest.Mock).mockResolvedValue(false)
    await expect(
      updateSubscription(b.deps, "cus_1", "sub_1", { shipping_address: ADDRESS })
    ).rejects.toThrow(/cobertura/)
  })

  it("rechaza un cuerpo vacío y una suscripción cancelada", async () => {
    await expect(updateSubscription(makeDeps().deps, "cus_1", "sub_1", {})).rejects.toThrow(/nada que actualizar/)
    const cancelled = makeDeps([row({ status: "cancelled" })])
    await expect(updateSubscription(cancelled.deps, "cus_1", "sub_1", { quantity: 2 })).rejects.toThrow(/cancelada/)
  })
})
