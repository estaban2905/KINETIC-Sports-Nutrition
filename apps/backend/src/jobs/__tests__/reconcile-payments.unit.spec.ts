import { isMercadoPagoApproved, isWebpayAuthorized } from "../reconcile-payments"

describe("isWebpayAuthorized", () => {
  it("is true only for an AUTHORIZED status with response_code 0", () => {
    expect(isWebpayAuthorized({ status: "AUTHORIZED", response_code: 0 })).toBe(true)
  })

  it("is false for a non-zero response_code even if status is AUTHORIZED", () => {
    expect(isWebpayAuthorized({ status: "AUTHORIZED", response_code: -1 })).toBe(false)
  })

  it("is false for a non-AUTHORIZED status", () => {
    expect(isWebpayAuthorized({ status: "FAILED", response_code: 0 })).toBe(false)
  })

  it("is false for null/undefined", () => {
    expect(isWebpayAuthorized(null)).toBe(false)
    expect(isWebpayAuthorized(undefined)).toBe(false)
  })
})

describe("isMercadoPagoApproved", () => {
  it("is true only for status approved", () => {
    expect(isMercadoPagoApproved({ status: "approved" })).toBe(true)
  })

  it("is false for pending/in_process/rejected", () => {
    expect(isMercadoPagoApproved({ status: "pending" })).toBe(false)
    expect(isMercadoPagoApproved({ status: "in_process" })).toBe(false)
    expect(isMercadoPagoApproved({ status: "rejected" })).toBe(false)
  })

  it("is false for null/undefined", () => {
    expect(isMercadoPagoApproved(null)).toBe(false)
    expect(isMercadoPagoApproved(undefined)).toBe(false)
  })
})
