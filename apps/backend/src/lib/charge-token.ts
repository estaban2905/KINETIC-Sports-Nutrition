import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

/**
 * Token que lleva, cifrado y autenticado (AES-256-GCM), todo lo necesario para
 * cobrar un ciclo de suscripción: la tarjeta (tbk_user), las órdenes de compra
 * y el monto. Va en la sesión de pago de Medusa, que viaja por tablas y APIs de
 * la tienda; cifrarlo evita dejar la tarjeta a la vista, y autenticarlo evita
 * que un cliente arme su propia sesión del proveedor `oneclick` para cobrar o
 * pagar con datos inventados: sin la clave del servidor no se puede fabricar.
 */

export type ChargePayload = {
  subscriptionId: string
  cycleId: string
  username: string
  tbkUser: string
  parentBuyOrder: string
  childBuyOrder: string
  amount: number
}

const VERSION = 1
const DEFAULT_TTL_MS = 15 * 60 * 1000

function key(): Buffer {
  const secret = process.env.SUBSCRIPTION_TOKEN_SECRET?.trim() || process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new Error("Falta SUBSCRIPTION_TOKEN_SECRET (o JWT_SECRET) para firmar los cobros de suscripción.")
  }
  return createHash("sha256").update(`kinetic:charge-token:${secret}`).digest()
}

export function sealChargeToken(payload: ChargePayload, now: number = Date.now(), ttlMs = DEFAULT_TTL_MS): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ v: VERSION, exp: now + ttlMs, p: payload }), "utf8"),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")
}

/** Lanza si el token está alterado, es de otro servidor o venció. */
export function openChargeToken(token: unknown, now: number = Date.now()): ChargePayload {
  if (typeof token !== "string" || token.length < 40) throw new Error("Token de cobro inválido.")
  let parsed: { v?: number; exp?: number; p?: ChargePayload }
  try {
    const raw = Buffer.from(token, "base64url")
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    parsed = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"))
  } catch {
    throw new Error("Token de cobro inválido.")
  }
  if (parsed.v !== VERSION || !parsed.p) throw new Error("Token de cobro inválido.")
  if (typeof parsed.exp !== "number" || parsed.exp < now) throw new Error("Token de cobro vencido.")
  return parsed.p
}
