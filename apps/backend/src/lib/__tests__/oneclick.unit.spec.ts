import {
  OneclickClient,
  buildBuyOrders,
  isDefinitiveChargeFailure,
  maskedCard,
  oneclickConfigFromEnv,
  oneclickUsername,
  parseChargeResult,
  parseInscriptionResult,
} from "../oneclick"

describe("oneclickConfigFromEnv", () => {
  it("sin variables usa las credenciales públicas de integración", () => {
    const cfg = oneclickConfigFromEnv({} as NodeJS.ProcessEnv)
    expect(cfg.environment).toBe("integration")
    expect(cfg.commerceCode).toBe("597055555541")
    expect(cfg.childCommerceCode).toBe("597055555542")
    expect(cfg.apiKey).toHaveLength(64)
  })

  it("en producción exige las tres credenciales", () => {
    expect(() =>
      oneclickConfigFromEnv({ ONECLICK_ENVIRONMENT: "production" } as NodeJS.ProcessEnv)
    ).toThrow(/obligatorios en producción/)
  })

  it("en producción usa lo configurado", () => {
    const cfg = oneclickConfigFromEnv({
      ONECLICK_ENVIRONMENT: "production",
      ONECLICK_COMMERCE_CODE: "111",
      ONECLICK_CHILD_COMMERCE_CODE: "222",
      ONECLICK_API_KEY: "key",
    } as unknown as NodeJS.ProcessEnv)
    expect(cfg).toEqual({
      environment: "production",
      commerceCode: "111",
      childCommerceCode: "222",
      apiKey: "key",
    })
  })
})

describe("parseInscriptionResult", () => {
  it("response_code 0 con tbk_user: éxito y tarjeta enmascarada", () => {
    expect(
      parseInscriptionResult({
        response_code: 0,
        tbk_user: "abc-123",
        card_type: "Visa",
        card_number: "XXXXXXXXXXXX6623",
      })
    ).toEqual({ ok: true, tbkUser: "abc-123", cardBrand: "Visa", last4: "6623" })
  })

  it("código distinto de 0, o sin tbk_user: rechazo", () => {
    expect(parseInscriptionResult({ response_code: -96, tbk_user: "x" })).toEqual({ ok: false, code: -96 })
    expect(parseInscriptionResult({ response_code: 0 })).toEqual({ ok: false, code: 0 })
    expect(parseInscriptionResult(null)).toEqual({ ok: false, code: null })
  })

  it("tolera una tarjeta sin datos de marca o número", () => {
    expect(parseInscriptionResult({ response_code: 0, tbk_user: "u" })).toEqual({
      ok: true,
      tbkUser: "u",
      cardBrand: null,
      last4: null,
    })
  })
})

describe("parseChargeResult", () => {
  const detail = (over: Record<string, unknown> = {}) => ({
    details: [
      { response_code: 0, status: "AUTHORIZED", authorization_code: "1213", amount: 34390, buy_order: "C1", ...over },
    ],
  })

  it("AUTHORIZED con código 0: cobrado", () => {
    expect(parseChargeResult(detail())).toEqual({
      ok: true,
      authorizationCode: "1213",
      amount: 34390,
      buyOrder: "C1",
    })
  })

  it("cualquier otro estado o código: no cobrado", () => {
    expect(parseChargeResult(detail({ status: "REJECTED", response_code: -1 }))).toEqual({
      ok: false,
      code: -1,
      status: "REJECTED",
    })
    // Código 0 pero sin AUTHORIZED: tampoco cuenta como cobro.
    expect(parseChargeResult(detail({ status: "FAILED" })).ok).toBe(false)
    expect(parseChargeResult({}).ok).toBe(false)
    expect(parseChargeResult({ details: [] }).ok).toBe(false)
  })
})

describe("identificadores", () => {
  it("el username es el id del cliente y no pasa de 40 caracteres", () => {
    expect(oneclickUsername("cus_01K9ABC")).toBe("cus_01K9ABC")
    expect(() => oneclickUsername("x".repeat(41))).toThrow(/inválido/)
    expect(() => oneclickUsername("")).toThrow(/inválido/)
  })

  it("las órdenes de compra son deterministas y caben en 26 caracteres", () => {
    const a = buildBuyOrders("sub_01K9ABCDEFGHJKMNPQRSTVWXYZ", "2026-10-28", 1)
    const again = buildBuyOrders("sub_01K9ABCDEFGHJKMNPQRSTVWXYZ", "2026-10-28", 1)
    expect(a).toEqual(again)
    expect(a.parent.length).toBeLessThanOrEqual(26)
    expect(a.child.length).toBeLessThanOrEqual(26)
    expect(a.parent).not.toBe(a.child)
    expect(a.parent).toMatch(/^[A-Za-z0-9]+$/)
  })

  it("un reintento nuevo, otro día o otra suscripción generan códigos distintos", () => {
    const base = buildBuyOrders("sub_01K9AAAAAAAAAAAAAAAAAAAAAA", "2026-10-28", 1)
    expect(buildBuyOrders("sub_01K9AAAAAAAAAAAAAAAAAAAAAA", "2026-10-28", 2).parent).not.toBe(base.parent)
    expect(buildBuyOrders("sub_01K9AAAAAAAAAAAAAAAAAAAAAA", "2026-11-27", 1).parent).not.toBe(base.parent)
    expect(buildBuyOrders("sub_01K9BBBBBBBBBBBBBBBBBBBBBB", "2026-10-28", 1).parent).not.toBe(base.parent)
  })

  it("maskedCard", () => {
    expect(maskedCard("Visa", "6623")).toBe("Visa •••• 6623")
    expect(maskedCard(null, "6623")).toBe("Tarjeta •••• 6623")
    expect(maskedCard("Visa", null)).toBeNull()
  })
})

describe("OneclickClient", () => {
  const make = () => {
    const inscription = { start: jest.fn(), finish: jest.fn(), delete: jest.fn() }
    const transaction = { authorize: jest.fn(), status: jest.fn(), refund: jest.fn() }
    const client = new OneclickClient(inscription as any, transaction as any, "597055555542")
    return { client, inscription, transaction }
  }

  it("startInscription devuelve token y url", async () => {
    const { client, inscription } = make()
    inscription.start.mockResolvedValue({ token: "t", url_webpay: "https://tbk/inscription" })
    await expect(
      client.startInscription({ username: "cus_1", email: "a@b.cl", responseUrl: "https://x/cb" })
    ).resolves.toEqual({ token: "t", url: "https://tbk/inscription" })
    expect(inscription.start).toHaveBeenCalledWith("cus_1", "a@b.cl", "https://x/cb")
  })

  it("startInscription falla si Transbank no entrega token", async () => {
    const { client, inscription } = make()
    inscription.start.mockResolvedValue({})
    await expect(
      client.startInscription({ username: "cus_1", email: "a@b.cl", responseUrl: "u" })
    ).rejects.toThrow(/no devolvió token/)
  })

  it("charge envía un solo detalle al comercio hijo, en 1 cuota y con monto entero", async () => {
    const { client, transaction } = make()
    transaction.authorize.mockResolvedValue({
      details: [{ response_code: 0, status: "AUTHORIZED", authorization_code: "1", amount: 100, buy_order: "C1" }],
    })

    const result = await client.charge({
      username: "cus_1",
      tbkUser: "tbk",
      parentBuyOrder: "P1",
      childBuyOrder: "C1",
      amount: 100.4,
    })

    expect(result.ok).toBe(true)
    const [username, tbkUser, parent, details] = transaction.authorize.mock.calls[0]
    expect([username, tbkUser, parent]).toEqual(["cus_1", "tbk", "P1"])
    expect(details).toHaveLength(1)
    expect(details[0]).toMatchObject({
      amount: 100,
      commerceCode: "597055555542",
      buyOrder: "C1",
      installmentsNumber: 1,
    })
  })

  it("charge rechaza montos inválidos sin llamar a Transbank", async () => {
    const { client, transaction } = make()
    for (const amount of [0, -5, NaN]) {
      await expect(
        client.charge({ username: "u", tbkUser: "t", parentBuyOrder: "P", childBuyOrder: "C", amount })
      ).rejects.toThrow(/monto inválido/)
    }
    expect(transaction.authorize).not.toHaveBeenCalled()
  })

  it("charge propaga los errores de red (ambiguos) para que quien llama consulte el estado", async () => {
    const { client, transaction } = make()
    transaction.authorize.mockRejectedValue(new Error("ETIMEDOUT"))
    await expect(
      client.charge({ username: "u", tbkUser: "t", parentBuyOrder: "P", childBuyOrder: "C", amount: 100 })
    ).rejects.toThrow("ETIMEDOUT")
  })

  it("un rechazo de Transbank vuelve como resultado, no como excepción", async () => {
    const { client, transaction } = make()
    transaction.authorize.mockResolvedValue({ details: [{ response_code: -1, status: "REJECTED" }] })
    await expect(
      client.charge({ username: "u", tbkUser: "t", parentBuyOrder: "P", childBuyOrder: "C", amount: 100 })
    ).resolves.toEqual({ ok: false, code: -1, status: "REJECTED" })
  })
})

describe("isDefinitiveChargeFailure", () => {
  it("un 4xx de Transbank garantiza que no se cobró", () => {
    expect(isDefinitiveChargeFailure({ response: { status: 422 } })).toBe(true)
    expect(isDefinitiveChargeFailure({ response: { status: 401 } })).toBe(true)
  })

  it("5xx, timeouts y cortes de red son ambiguos", () => {
    expect(isDefinitiveChargeFailure({ response: { status: 500 } })).toBe(false)
    expect(isDefinitiveChargeFailure({ response: { status: 503 } })).toBe(false)
    expect(isDefinitiveChargeFailure(new Error("ETIMEDOUT"))).toBe(false)
    expect(isDefinitiveChargeFailure(null)).toBe(false)
  })
})
