/** Chilean RUT helpers. SimpleFactura wants RUTs without dots, with a dash and an uppercase K. */

/** Strips dots, spaces and dashes: "12.345.678-5" -> "123456785". */
export function cleanRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase()
}

function checkDigit(body: string): string {
  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const remainder = 11 - (sum % 11)
  if (remainder === 11) return "0"
  if (remainder === 10) return "K"
  return String(remainder)
}

export function isValidRut(value: string | null | undefined): boolean {
  if (!value) return false
  const clean = cleanRut(value)
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  if (!/^\d+$/.test(body)) return false
  const number = Number(body)
  // SimpleFactura accepts RUTs between 100000 and 99999999.
  if (number < 100000 || number > 99999999) return false
  return checkDigit(body) === clean.slice(-1)
}

/** "12.345.678-5" -> "12345678-5" (the format the SII API expects). */
export function formatRutForSii(value: string): string {
  const clean = cleanRut(value)
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`
}
