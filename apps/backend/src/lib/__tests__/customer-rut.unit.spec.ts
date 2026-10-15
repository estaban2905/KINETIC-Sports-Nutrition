import { assertValidCustomerRut } from "../customer-rut"

describe("assertValidCustomerRut", () => {
  it("acepta un RUT válido, con o sin formato", () => {
    expect(() => assertValidCustomerRut({ metadata: { rut: "12.345.678-5" } })).not.toThrow()
    expect(() => assertValidCustomerRut({ metadata: { rut: "123456785" } })).not.toThrow()
  })

  it("acepta body sin RUT (es opcional)", () => {
    expect(() => assertValidCustomerRut(undefined)).not.toThrow()
    expect(() => assertValidCustomerRut({})).not.toThrow()
    expect(() => assertValidCustomerRut({ metadata: {} })).not.toThrow()
    expect(() => assertValidCustomerRut({ metadata: { rut: "" } })).not.toThrow()
    expect(() => assertValidCustomerRut({ metadata: { rut: null } })).not.toThrow()
  })

  it("rechaza dígito verificador incorrecto y valores que no son texto", () => {
    expect(() => assertValidCustomerRut({ metadata: { rut: "12.345.678-9" } })).toThrow("RUT")
    expect(() => assertValidCustomerRut({ metadata: { rut: 12345678 } })).toThrow()
  })
})
