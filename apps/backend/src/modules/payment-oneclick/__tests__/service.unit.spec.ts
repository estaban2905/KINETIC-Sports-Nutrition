import OneclickPaymentProviderService from "../service"
import { sealChargeToken, type ChargePayload } from "../../../lib/charge-token"
import { takeChargeOutcome } from "../../../lib/charge-outcomes"

const payload: ChargePayload = {
  subscriptionId: "sub_1",
  cycleId: "subcyc_1",
  username: "cus_1",
  tbkUser: "tbk-1",
  parentBuyOrder: "P1",
  childBuyOrder: "C1",
  amount: 36542,
}

const ok = { ok: true as const, authorizationCode: "1213", amount: 36542, buyOrder: "C1" }
const notFound = () => Object.assign(new Error("422"), { response: { status: 422 } })
const down = () => new Error("ETIMEDOUT")

function make() {
  const client = {
    charge: jest.fn(),
    chargeStatus: jest.fn(),
    refund: jest.fn().mockResolvedValue(undefined),
  }
  const logger = { warn: jest.fn(), error: jest.fn() }
  const provider = new OneclickPaymentProviderService({ logger, __oneclickClient: client }, {})
  const token = sealChargeToken(payload)
  const data = { charge_token: token }
  return { provider, client, logger, token, data }
}

describe("OneclickPaymentProviderService", () => {
  beforeAll(() => {
    process.env.SUBSCRIPTION_TOKEN_SECRET = "secreto-de-prueba"
  })

  describe("initiatePayment", () => {
    it("exige un token sellado por el servidor", async () => {
      const { provider } = make()
      await expect(provider.initiatePayment({ amount: 36542, currency_code: "clp", data: {} } as any)).rejects.toThrow(
        /inválido/
      )
      await expect(
        provider.initiatePayment({ amount: 36542, currency_code: "clp", data: { charge_token: "inventado" } } as any)
      ).rejects.toThrow(/inválido/)
    })

    it("el monto de la sesión debe coincidir con el sellado", async () => {
      const { provider, data } = make()
      await expect(
        provider.initiatePayment({ amount: 1, currency_code: "clp", data } as any)
      ).rejects.toThrow(/no coincide/)
    })

    it("con token válido y monto correcto abre la sesión", async () => {
      const { provider, data } = make()
      const out = await provider.initiatePayment({ amount: 36542, currency_code: "clp", data } as any)
      expect(out.id).toBe("subcyc_1")
      expect(out.data).toMatchObject({ cycle_id: "subcyc_1", subscription_id: "sub_1", amount: 36542 })
      expect(JSON.stringify(out.data)).not.toContain("tbk-1")
    })
  })

  describe("authorizePayment", () => {
    it("cobra y autoriza", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValue(notFound())
      client.charge.mockResolvedValue(ok)

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("authorized")
      expect(out.data).toMatchObject({ charged: true, authorization_code: "1213" })
      expect(client.charge).toHaveBeenCalledWith({
        username: "cus_1",
        tbkUser: "tbk-1",
        parentBuyOrder: "P1",
        childBuyOrder: "C1",
        amount: 36542,
      })
      expect(takeChargeOutcome("subcyc_1")).toEqual({ kind: "authorized", authorizationCode: "1213" })
    })

    it("si la orden ya figuraba cobrada NO cobra otra vez", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockResolvedValue(ok)

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("authorized")
      expect(client.charge).not.toHaveBeenCalled()
      takeChargeOutcome("subcyc_1")
    })

    it("si no puede consultar el estado antes de cobrar, no cobra", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValue(down())

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("error")
      expect(out.data).toMatchObject({ not_attempted: true })
      expect(client.charge).not.toHaveBeenCalled()
      expect(takeChargeOutcome("subcyc_1")).toBeUndefined()
    })

    it("rechazo del banco: error y anotado como rechazado", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValue(notFound())
      client.charge.mockResolvedValue({ ok: false, code: -1, status: "REJECTED" })

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("error")
      expect(takeChargeOutcome("subcyc_1")).toMatchObject({ kind: "rejected", code: -1 })
    })

    it("un 4xx de Transbank al cobrar es rechazo definitivo", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValue(notFound())
      client.charge.mockRejectedValue(notFound())

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("error")
      expect(takeChargeOutcome("subcyc_1")).toMatchObject({ kind: "rejected" })
    })

    it("corte de red al cobrar pero Transbank SÍ cobró: se recupera sin cobrar de nuevo", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValueOnce(notFound()).mockResolvedValueOnce(ok)
      client.charge.mockRejectedValue(down())

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("authorized")
      expect(out.data).toMatchObject({ recovered: true })
      expect(client.charge).toHaveBeenCalledTimes(1)
      takeChargeOutcome("subcyc_1")
    })

    it("corte de red al cobrar y Transbank NO lo tiene: rechazo", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValue(notFound())
      client.charge.mockRejectedValue(down())

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("error")
      expect(takeChargeOutcome("subcyc_1")).toMatchObject({ kind: "rejected" })
    })

    it("corte de red y tampoco se puede consultar: ambiguo (se concilia después)", async () => {
      const { provider, client, logger, data } = make()
      client.chargeStatus.mockRejectedValueOnce(notFound()).mockRejectedValueOnce(down())
      client.charge.mockRejectedValue(down())

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("error")
      expect(out.data).toMatchObject({ ambiguous: true })
      expect(takeChargeOutcome("subcyc_1")).toMatchObject({ kind: "ambiguous" })
      expect(logger.error).toHaveBeenCalled()
    })

    it("si Transbank cobró un monto distinto, lo reversa y falla", async () => {
      const { provider, client, data } = make()
      client.chargeStatus.mockRejectedValue(notFound())
      client.charge.mockResolvedValue({ ...ok, amount: 99999 })

      const out = await provider.authorizePayment({ data } as any)

      expect(out.status).toBe("error")
      expect(client.refund).toHaveBeenCalledWith({ parentBuyOrder: "P1", childBuyOrder: "C1", amount: 99999 })
      expect(takeChargeOutcome("subcyc_1")).toMatchObject({ kind: "rejected" })
    })

    it("un token inválido no llega a Transbank", async () => {
      const { provider, client } = make()
      await expect(provider.authorizePayment({ data: { charge_token: "x".repeat(80) } } as any)).rejects.toThrow(
        /inválido/
      )
      expect(client.chargeStatus).not.toHaveBeenCalled()
      expect(client.charge).not.toHaveBeenCalled()
    })
  })

  describe("cancelPayment / refundPayment", () => {
    it("cancelar un pago cobrado lo reversa", async () => {
      const { provider, client, data } = make()
      await provider.cancelPayment({ data: { ...data, charged: true } } as any)
      expect(client.refund).toHaveBeenCalledWith({ parentBuyOrder: "P1", childBuyOrder: "C1", amount: 36542 })
    })

    it("cancelar un pago que nunca se cobró no toca a Transbank", async () => {
      const { provider, client, data } = make()
      await provider.cancelPayment({ data } as any)
      expect(client.refund).not.toHaveBeenCalled()
    })

    it("reembolso parcial usa el monto pedido", async () => {
      const { provider, client, data } = make()
      await provider.refundPayment({ data, amount: 5000.4 } as any)
      expect(client.refund).toHaveBeenCalledWith({ parentBuyOrder: "P1", childBuyOrder: "C1", amount: 5000 })
    })
  })

  it("la sesión no se puede modificar", async () => {
    const { provider, data } = make()
    await expect(provider.updatePayment({ data, amount: 1 } as any)).rejects.toThrow(/no se puede modificar/)
  })
})
