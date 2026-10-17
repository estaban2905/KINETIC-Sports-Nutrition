import { describeError } from "../describe-error"

describe("describeError", () => {
  it("Error y texto", () => {
    expect(describeError(new Error("boom"))).toBe("boom")
    expect(describeError("texto")).toBe("texto")
  })

  it("objetos de los workflows de Medusa: muestra la causa, no [object Object]", () => {
    const err = { action: "authorize-payment", handlerType: "invoke", error: new Error("Session was not authorized") }
    expect(describeError(err)).toBe("authorize-payment: Session was not authorized")
    expect(describeError({ message: "directo" })).toBe("directo")
  })

  it("objetos anidados y sin forma conocida", () => {
    expect(describeError({ error: { error: new Error("hondo") } })).toBe("hondo")
    expect(describeError({ foo: "bar" })).toBe('{"foo":"bar"}')
    expect(describeError(undefined)).toBe("undefined")
    expect(describeError(null)).toBe("null")
  })

  it("no revienta con referencias circulares", () => {
    const a: Record<string, unknown> = {}
    a.self = a
    expect(describeError(a)).toBe("[object Object]")
  })
})
