import { MedusaError } from "@medusajs/framework/utils"
import { isDuplicateKeyError } from "../duplicate-error"

describe("isDuplicateKeyError", () => {
  it("reconoce el duplicate_error de Medusa", () => {
    expect(isDuplicateKeyError(new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "x"))).toBe(true)
  })

  it("reconoce el código 23505 de Postgres y mensajes de índice único", () => {
    expect(isDuplicateKeyError({ code: "23505", message: "boom" })).toBe(true)
    expect(isDuplicateKeyError(new Error("Subscription_cycle with id: x, already exists."))).toBe(true)
  })

  it("no confunde otros errores", () => {
    expect(isDuplicateKeyError(new Error("connection refused"))).toBe(false)
    expect(isDuplicateKeyError(null)).toBe(false)
  })
})
