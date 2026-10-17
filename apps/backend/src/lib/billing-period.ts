/**
 * Fechas de cobro como días de calendario de Chile ("YYYY-MM-DD"), no como
 * instantes. Así "cobrar el día 28" significa el 28 en Chile aunque el servidor
 * corra en UTC, y la misma cadena sirve de clave del período (period_key) para
 * garantizar un solo cobro por suscripción y día de cobro.
 *
 * Las cadenas ISO de fecha se comparan bien con < y <=.
 */

const CHILE_TZ = "America/Santiago"

const chileDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHILE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** El día de calendario de Chile en el instante dado (por defecto, ahora). */
export function chileToday(now: Date = new Date()): string {
  return chileDayFormat.format(now)
}

/** Suma días a una fecha "YYYY-MM-DD". Usa UTC para no depender de cambios de hora. */
export function addDays(day: string, days: number): string {
  if (!DATE_RE.test(day)) throw new Error(`Fecha inválida: "${day}"`)
  const [y, m, d] = day.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

/** true si el día de cobro ya llegó (hoy o antes) en horario de Chile. */
export function isDue(nextBillingDate: string, now: Date = new Date()): boolean {
  return nextBillingDate <= chileToday(now)
}

/**
 * Próximo día de cobro tras cobrar el ciclo `current`. Avanza desde la fecha
 * programada, no desde hoy, para no ir corriendo el día de cobro por atrasos
 * de uno o dos días. Si el job estuvo caído tanto tiempo que la fecha resultante
 * ya pasó, parte desde hoy: nunca se cobran ciclos atrasados de golpe.
 */
export function nextBillingDate(
  current: string,
  frequencyDays: number,
  now: Date = new Date()
): string {
  if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
    throw new Error(`Frecuencia inválida: ${frequencyDays}`)
  }
  const today = chileToday(now)
  const next = addDays(current, frequencyDays)
  return next > today ? next : addDays(today, frequencyDays)
}
