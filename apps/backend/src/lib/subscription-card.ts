import { MedusaError } from "@medusajs/framework/utils"
import type { InscriptionResult } from "./oneclick"
import { oneclickUsername } from "./oneclick"

/**
 * Inscripción de la tarjeta de una suscripción (Oneclick). La lógica vive aquí,
 * con sus dependencias inyectadas, para probarla sin Transbank ni base de datos;
 * las rutas solo cablean.
 */

type SubscriptionRow = {
  id: string
  customer_id: string
  status: string
  payment_token_ref: string | null
}

export type CardEnrollmentDeps = {
  subscriptions: {
    retrieveSubscription(id: string): Promise<SubscriptionRow>
    listSubscriptions(filter: Record<string, unknown>): Promise<SubscriptionRow[]>
    updateSubscriptions(data: Record<string, unknown>): Promise<unknown>
  }
  oneclick: {
    startInscription(input: {
      username: string
      email: string
      responseUrl: string
    }): Promise<{ token: string; url: string }>
    finishInscription(token: string): Promise<InscriptionResult>
    deleteInscription(input: { tbkUser: string; username: string }): Promise<void>
  }
  logger?: { warn(msg: string): void }
}

/**
 * Inicia la inscripción. Verifica que la suscripción sea del cliente (si no, 404
 * igual que si no existiera, para no revelar ids ajenos) y guarda el token para
 * poder ubicarla cuando Transbank vuelva sin sesión.
 */
export async function startCardEnrollment(
  deps: CardEnrollmentDeps,
  input: { subscriptionId: string; customerId: string; email: string; responseUrl: string }
): Promise<{ token: string; url: string }> {
  let sub: SubscriptionRow
  try {
    sub = await deps.subscriptions.retrieveSubscription(input.subscriptionId)
  } catch {
    sub = undefined as never
  }
  if (!sub || sub.customer_id !== input.customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Suscripción no encontrada.")
  }
  if (sub.status === "cancelled") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "La suscripción está cancelada.")
  }

  const started = await deps.oneclick.startInscription({
    username: oneclickUsername(input.customerId),
    email: input.email,
    responseUrl: input.responseUrl,
  })
  await deps.subscriptions.updateSubscriptions({ id: sub.id, inscription_token: started.token })
  return started
}

export type CardEnrollmentOutcome =
  | { outcome: "ok"; subscriptionId: string }
  | { outcome: "rejected"; subscriptionId: string }
  | { outcome: "unknown" }

/**
 * Termina la inscripción cuando Transbank devuelve al cliente. El token solo
 * sirve una vez: se borra de la suscripción antes de cualquier otra cosa, así
 * recargar el callback no repite nada. Siempre se confirma con Transbank
 * (`finish`); lo que diga el navegador no se usa para decidir.
 */
export async function completeCardEnrollment(
  deps: CardEnrollmentDeps,
  token: string
): Promise<CardEnrollmentOutcome> {
  if (!token) return { outcome: "unknown" }

  const [sub] = await deps.subscriptions.listSubscriptions({ inscription_token: token })
  if (!sub) return { outcome: "unknown" }

  await deps.subscriptions.updateSubscriptions({ id: sub.id, inscription_token: null })

  let result: InscriptionResult
  try {
    result = await deps.oneclick.finishInscription(token)
  } catch (err) {
    // Token vencido o inscripción abortada: Transbank responde con error.
    deps.logger?.warn(
      `[oneclick] finish falló para la suscripción ${sub.id}: ${err instanceof Error ? err.message : err}`
    )
    return { outcome: "rejected", subscriptionId: sub.id }
  }
  if (!result.ok) return { outcome: "rejected", subscriptionId: sub.id }

  const previous = sub.payment_token_ref
  await deps.subscriptions.updateSubscriptions({
    id: sub.id,
    payment_token_ref: result.tbkUser,
    card_brand: result.cardBrand,
    card_last4: result.last4,
  })

  // Cambio de tarjeta: la anterior se da de baja en Transbank. Si falla no importa
  // para el cliente (ya quedó la nueva); solo se avisa.
  if (previous && previous !== result.tbkUser) {
    try {
      await deps.oneclick.deleteInscription({
        tbkUser: previous,
        username: oneclickUsername(sub.customer_id),
      })
    } catch (err) {
      deps.logger?.warn(
        `[oneclick] no se pudo dar de baja la tarjeta anterior de ${sub.id}: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  return { outcome: "ok", subscriptionId: sub.id }
}

/** A dónde vuelve el navegador del cliente tras la inscripción. */
export function cardReturnUrl(
  storefrontUrl: string | undefined,
  outcome: CardEnrollmentOutcome["outcome"]
): string {
  const base = (storefrontUrl?.trim() || "http://localhost:3000").replace(/\/+$/, "")
  return `${base}/cuenta?tab=membership&card=${outcome === "ok" ? "ok" : "error"}`
}
