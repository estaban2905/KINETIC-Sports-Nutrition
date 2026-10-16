import { addDays, chileToday, isDue, nextBillingDate } from "../billing-period"

describe("billing-period", () => {
  describe("chileToday", () => {
    it("usa el día de Chile, no el de UTC (invierno, UTC-4)", () => {
      // 02:00 UTC del 16 de julio = 22:00 del 15 de julio en Chile.
      expect(chileToday(new Date("2026-07-16T02:00:00Z"))).toBe("2026-07-15")
    })

    it("usa el horario de verano (UTC-3)", () => {
      // 02:30 UTC del 16 de enero = 23:30 del 15 de enero en Chile.
      expect(chileToday(new Date("2026-01-16T02:30:00Z"))).toBe("2026-01-15")
      expect(chileToday(new Date("2026-01-16T03:30:00Z"))).toBe("2026-01-16")
    })
  })

  describe("addDays", () => {
    it("cruza fin de mes y de año", () => {
      expect(addDays("2026-10-28", 30)).toBe("2026-11-27")
      expect(addDays("2026-12-20", 30)).toBe("2027-01-19")
    })

    it("respeta años bisiestos", () => {
      expect(addDays("2028-02-28", 1)).toBe("2028-02-29")
      expect(addDays("2027-02-28", 1)).toBe("2027-03-01")
    })

    it("rechaza fechas mal formadas", () => {
      expect(() => addDays("28/10/2026", 1)).toThrow(/Fecha inválida/)
    })
  })

  describe("isDue", () => {
    it("vence hoy o antes, no mañana", () => {
      const now = new Date("2026-10-28T15:00:00Z")
      expect(isDue("2026-10-27", now)).toBe(true)
      expect(isDue("2026-10-28", now)).toBe(true)
      expect(isDue("2026-10-29", now)).toBe(false)
    })

    it("pasada la medianoche en UTC todavía es el día anterior en Chile", () => {
      // 02:00 UTC del 29 = 23:00 del 28 en Chile (UTC-3 en octubre).
      expect(isDue("2026-10-29", new Date("2026-10-29T02:00:00Z"))).toBe(false)
    })
  })

  describe("nextBillingDate", () => {
    it("avanza desde la fecha programada, no desde hoy", () => {
      // Cobrado con 2 días de atraso: el día de cobro no se corre.
      const now = new Date("2026-10-30T15:00:00Z")
      expect(nextBillingDate("2026-10-28", 30, now)).toBe("2026-11-27")
    })

    it("si el job estuvo caído mucho tiempo, parte desde hoy sin cobrar atrasados", () => {
      const now = new Date("2026-12-20T15:00:00Z")
      expect(nextBillingDate("2026-10-28", 30, now)).toBe("2027-01-19")
    })

    it("rechaza frecuencias inválidas", () => {
      expect(() => nextBillingDate("2026-10-28", 0)).toThrow(/Frecuencia inválida/)
      expect(() => nextBillingDate("2026-10-28", 1.5)).toThrow(/Frecuencia inválida/)
    })
  })
})
