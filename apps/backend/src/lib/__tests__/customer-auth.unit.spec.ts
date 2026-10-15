import { customerOrdersFilter, parsePagination, requireCustomerId } from "../customer-auth"

describe("requireCustomerId", () => {
  it("devuelve el actor_id del token de un cliente", () => {
    expect(requireCustomerId({ auth_context: { actor_id: "cus_1", actor_type: "customer" } })).toBe("cus_1")
  })

  it("rechaza requests sin autenticar", () => {
    expect(() => requireCustomerId({})).toThrow("Debes iniciar sesión")
    expect(() => requireCustomerId({ auth_context: null })).toThrow()
    expect(() => requireCustomerId({ auth_context: { actor_id: "", actor_type: "customer" } })).toThrow()
  })

  it("rechaza tokens que no son de cliente (p. ej. admin)", () => {
    expect(() => requireCustomerId({ auth_context: { actor_id: "user_1", actor_type: "user" } })).toThrow()
  })
})

describe("customerOrdersFilter", () => {
  it("filtra solo por el cliente del token", () => {
    expect(customerOrdersFilter("cus_1")).toEqual({ customer_id: "cus_1" })
  })
})

describe("parsePagination", () => {
  it("usa valores por defecto y acota el límite", () => {
    expect(parsePagination({})).toEqual({ take: 20, skip: 0 })
    expect(parsePagination({ limit: "1000", offset: "40" })).toEqual({ take: 50, skip: 40 })
    expect(parsePagination({ limit: "-3", offset: "abc" })).toEqual({ take: 20, skip: 0 })
  })
})
