import {
  SUBSCRIPTION_STATUSES,
  assertTransition,
  canTransition,
  isBillable,
  type SubscriptionStatus,
} from "../subscription-state"

describe("subscription-state", () => {
  it.each<[SubscriptionStatus, SubscriptionStatus]>([
    ["pending_card", "active"],
    ["pending_card", "cancelled"],
    ["active", "paused"],
    ["active", "past_due"],
    ["active", "cancelled"],
    ["paused", "active"],
    ["paused", "cancelled"],
    ["past_due", "active"],
    ["past_due", "paused"],
    ["past_due", "cancelled"],
  ])("permite %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true)
    expect(() => assertTransition(from, to)).not.toThrow()
  })

  it.each<[SubscriptionStatus, SubscriptionStatus]>([
    ["pending_card", "paused"],
    ["pending_card", "past_due"],
    ["paused", "past_due"],
    ["active", "pending_card"],
    ["active", "active"],
  ])("rechaza %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false)
    expect(() => assertTransition(from, to)).toThrow(/No se puede pasar/)
  })

  it("cancelled es terminal", () => {
    for (const to of SUBSCRIPTION_STATUSES) {
      expect(canTransition("cancelled", to)).toBe(false)
    }
  })

  it("solo las activas se cobran", () => {
    expect(SUBSCRIPTION_STATUSES.filter(isBillable)).toEqual(["active"])
  })
})
