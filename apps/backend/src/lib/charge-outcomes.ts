/**
 * Qué pasó con el cobro de un ciclo, anotado por el proveedor de pago `oneclick`
 * y leído por quien corre el ciclo. Medusa solo devuelve "falló" cuando
 * authorizePayment responde error; esto permite distinguir un rechazo del banco
 * (se cuenta como intento fallido) de un resultado ambiguo (hay que conciliar) y
 * de un fallo del sistema ANTES de cobrar (no se castiga al cliente).
 *
 * Vive en memoria porque el proveedor y quien corre el ciclo trabajan en el
 * mismo proceso y dentro de la misma llamada; si no hay anotación, el cobro
 * nunca se intentó.
 */

export type ChargeOutcome =
  | { kind: "authorized"; authorizationCode: string }
  | { kind: "rejected"; code: number | null; detail: string }
  | { kind: "ambiguous"; detail: string }

const TTL_MS = 60 * 60 * 1000
const outcomes = new Map<string, { at: number; outcome: ChargeOutcome }>()

function prune(now: number) {
  for (const [id, entry] of outcomes) {
    if (now - entry.at > TTL_MS) outcomes.delete(id)
  }
}

export function recordChargeOutcome(cycleId: string, outcome: ChargeOutcome, now: number = Date.now()) {
  prune(now)
  outcomes.set(cycleId, { at: now, outcome })
}

/** Lee y borra la anotación del ciclo. */
export function takeChargeOutcome(cycleId: string): ChargeOutcome | undefined {
  const entry = outcomes.get(cycleId)
  outcomes.delete(cycleId)
  return entry?.outcome
}
