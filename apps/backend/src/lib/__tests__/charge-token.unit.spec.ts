import { openChargeToken, sealChargeToken, type ChargePayload } from "../charge-token"
import { recordChargeOutcome, takeChargeOutcome } from "../charge-outcomes"

const payload: ChargePayload = {
  subscriptionId: "sub_1",
  cycleId: "subcyc_1",
  username: "cus_1",
  tbkUser: "tbk-super-secreto",
  parentBuyOrder: "Pabc20261028 1",
  childBuyOrder: "Cabc202610281",
  amount: 36542,
}

describe("charge-token", () => {
  const original = process.env.SUBSCRIPTION_TOKEN_SECRET
  beforeEach(() => {
    process.env.SUBSCRIPTION_TOKEN_SECRET = "secreto-de-prueba"
  })
  afterAll(() => {
    if (original === undefined) delete process.env.SUBSCRIPTION_TOKEN_SECRET
    else process.env.SUBSCRIPTION_TOKEN_SECRET = original
  })

  it("ida y vuelta", () => {
    expect(openChargeToken(sealChargeToken(payload))).toEqual(payload)
  })

  it("no deja la tarjeta ni el monto a la vista", () => {
    const token = sealChargeToken(payload)
    expect(token).not.toContain("tbk-super-secreto")
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain("tbk-super-secreto")
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("36542")
  })

  it("dos tokens del mismo cobro son distintos (IV aleatorio)", () => {
    expect(sealChargeToken(payload)).not.toBe(sealChargeToken(payload))
  })

  it("rechaza un token alterado", () => {
    const raw = Buffer.from(sealChargeToken(payload), "base64url")
    raw[raw.length - 1] ^= 0xff
    expect(() => openChargeToken(raw.toString("base64url"))).toThrow(/inválido/)
  })

  it("rechaza un token sellado con otra clave", () => {
    const token = sealChargeToken(payload)
    process.env.SUBSCRIPTION_TOKEN_SECRET = "otra-clave"
    expect(() => openChargeToken(token)).toThrow(/inválido/)
  })

  it("rechaza un token vencido", () => {
    const now = Date.now()
    const token = sealChargeToken(payload, now, 1000)
    expect(() => openChargeToken(token, now + 500)).not.toThrow()
    expect(() => openChargeToken(token, now + 2000)).toThrow(/vencido/)
  })

  it("rechaza basura y valores que no son texto", () => {
    for (const bad of [undefined, null, 123, "", "abc", "x".repeat(80)]) {
      expect(() => openChargeToken(bad)).toThrow(/inválido/)
    }
  })

  it("sin clave configurada falla en vez de sellar con una débil", () => {
    delete process.env.SUBSCRIPTION_TOKEN_SECRET
    const jwt = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    try {
      expect(() => sealChargeToken(payload)).toThrow(/Falta SUBSCRIPTION_TOKEN_SECRET/)
    } finally {
      if (jwt !== undefined) process.env.JWT_SECRET = jwt
    }
  })
})

describe("charge-outcomes", () => {
  it("se lee una sola vez", () => {
    recordChargeOutcome("c1", { kind: "rejected", code: -1, detail: "x" })
    expect(takeChargeOutcome("c1")).toEqual({ kind: "rejected", code: -1, detail: "x" })
    expect(takeChargeOutcome("c1")).toBeUndefined()
  })

  it("sin anotación devuelve undefined (el cobro nunca se intentó)", () => {
    expect(takeChargeOutcome("nunca")).toBeUndefined()
  })

  it("las anotaciones viejas se descartan", () => {
    const old = Date.now() - 2 * 60 * 60 * 1000
    recordChargeOutcome("viejo", { kind: "ambiguous", detail: "x" }, old)
    recordChargeOutcome("nuevo", { kind: "ambiguous", detail: "y" })
    expect(takeChargeOutcome("viejo")).toBeUndefined()
    expect(takeChargeOutcome("nuevo")).toBeDefined()
  })
})
