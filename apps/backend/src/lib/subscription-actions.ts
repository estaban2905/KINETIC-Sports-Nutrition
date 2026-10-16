import { MedusaError } from "@medusajs/framework/utils"
import { chileToday } from "./billing-period"
import { maskedCard, oneclickUsername } from "./oneclick"
import type { SubscriptionStatus } from "./subscription-state"

/**
 * Acciones del cliente sobre sus suscripciones. Toda la lógica vive aquí, con
 * las dependencias inyectadas, para probarla sin base de datos; las rutas solo
 * cablean y toman el cliente del token (nunca de un parámetro).
 */

export type SubscriptionRow = {
  id: string
  customer_id: string
  variant_id: string
  quantity: number
  status: SubscriptionStatus
  frequency_days: number
  discount_percent: number
  next_billing_date: string | null
  payment_token_ref: string | null
  card_brand: string | null
  card_last4: string | null
  shipping_address: ShippingAddress | null
  welcome_gift_given: boolean
  failed_attempts: number
  created_at?: Date | string
}

export type ShippingAddress = {
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code?: string
  country_code: string
}

export type ActionDeps = {
  subscriptions: {
    retrieveSubscription(id: string): Promise<SubscriptionRow>
    listSubscriptions(filter: Record<string, unknown>, config?: Record<string, unknown>): Promise<SubscriptionRow[]>
    createSubscriptions(data: Record<string, unknown>): Promise<SubscriptionRow>
    updateSubscriptions(data: Record<string, unknown>): Promise<SubscriptionRow>
    transitionStatus(id: string, to: SubscriptionStatus): Promise<unknown>
  }
  /** La variante existe y se vende (producto publicado). */
  variantIsPurchasable(variantId: string): Promise<boolean>
  /** Chilexpress cubre la comuna. true si no se puede consultar la cobertura. */
  comunaIsCovered(city: string): Promise<boolean>
  oneclick: { deleteInscription(input: { tbkUser: string; username: string }): Promise<void> }
  /** Correo de confirmación al pausar o cancelar. De mejor esfuerzo. */
  notify?(kind: "paused" | "cancelled", subscriptionId: string): Promise<void>
  logger?: { warn(msg: string): void }
  now?: () => Date
}

async function notifyQuietly(deps: ActionDeps, kind: "paused" | "cancelled", subscriptionId: string) {
  try {
    await deps.notify?.(kind, subscriptionId)
  } catch (err) {
    deps.logger?.warn(`[subscription] no se pudo avisar (${kind}) de ${subscriptionId}: ${err instanceof Error ? err.message : err}`)
  }
}

// --- Salida ---------------------------------------------------------------------

/** Lo que ve el cliente: nunca el token de la tarjeta ni el de inscripción. */
export function serializeSubscription(sub: SubscriptionRow) {
  return {
    id: sub.id,
    variant_id: sub.variant_id,
    quantity: sub.quantity,
    status: sub.status,
    frequency_days: sub.frequency_days,
    discount_percent: sub.discount_percent,
    next_billing_date: sub.next_billing_date,
    card: sub.card_last4
      ? { brand: sub.card_brand, last4: sub.card_last4, masked: maskedCard(sub.card_brand, sub.card_last4) }
      : null,
    has_card: !!sub.payment_token_ref,
    shipping_address: sub.shipping_address,
    welcome_gift_given: sub.welcome_gift_given,
    created_at: sub.created_at ?? null,
  }
}

// --- Validación de entrada ----------------------------------------------------------

const invalid = (message: string) => new MedusaError(MedusaError.Types.INVALID_DATA, message)

const text = (value: unknown, field: string, { required = true, max = 120 } = {}): string => {
  const v = typeof value === "string" ? value.trim() : ""
  if (!v) {
    if (required) throw invalid(`Falta ${field}.`)
    return ""
  }
  if (v.length > max) throw invalid(`${field} es demasiado largo.`)
  return v
}

export function parseShippingAddress(raw: unknown): ShippingAddress {
  if (!raw || typeof raw !== "object") throw invalid("Falta la dirección de despacho.")
  const a = raw as Record<string, unknown>
  const country = text(a.country_code ?? "cl", "el país").toLowerCase()
  if (country !== "cl") throw invalid("Solo despachamos a Chile.")
  const address: ShippingAddress = {
    first_name: text(a.first_name, "el nombre"),
    last_name: text(a.last_name, "el apellido"),
    phone: text(a.phone, "el teléfono", { max: 30 }),
    address_1: text(a.address_1, "la dirección", { max: 200 }),
    city: text(a.city, "la comuna"),
    country_code: "cl",
  }
  const address2 = text(a.address_2, "address_2", { required: false, max: 200 })
  const province = text(a.province, "la región", { required: false })
  const postal = text(a.postal_code, "el código postal", { required: false, max: 20 })
  if (address2) address.address_2 = address2
  if (province) address.province = province
  if (postal) address.postal_code = postal
  return address
}

export function parseQuantity(raw: unknown, fallback = 1): number {
  const q = raw === undefined ? fallback : raw
  if (typeof q !== "number" || !Number.isInteger(q) || q < 1 || q > 10) {
    throw invalid("La cantidad debe ser un número entero entre 1 y 10.")
  }
  return q
}

// --- Acciones ---------------------------------------------------------------------------

/** La suscripción, solo si es del cliente; si no, 404 igual que si no existiera. */
export async function getOwned(deps: ActionDeps, id: string, customerId: string): Promise<SubscriptionRow> {
  let sub: SubscriptionRow | undefined
  try {
    sub = await deps.subscriptions.retrieveSubscription(id)
  } catch {
    sub = undefined
  }
  if (!sub || sub.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Suscripción no encontrada.")
  }
  return sub
}

async function assertAddressOk(deps: ActionDeps, address: ShippingAddress) {
  if (!(await deps.comunaIsCovered(address.city))) {
    throw invalid(`Chilexpress no tiene cobertura en "${address.city}".`)
  }
}

/**
 * Crea la suscripción en `pending_card`: todavía no se cobra nada; queda a la
 * espera de inscribir la tarjeta. Es idempotente por cliente y variante: un
 * doble clic devuelve la misma pendiente en vez de crear otra.
 */
export async function createSubscription(
  deps: ActionDeps,
  customerId: string,
  body: Record<string, unknown>
): Promise<SubscriptionRow> {
  if (body.accepted_terms !== true) {
    throw invalid("Debes aceptar los términos de la suscripción.")
  }
  const variantId = text(body.variant_id, "la variante", { max: 100 })
  const quantity = parseQuantity(body.quantity)
  const address = parseShippingAddress(body.shipping_address)

  if (!(await deps.variantIsPurchasable(variantId))) {
    throw invalid("El producto no está disponible para suscripción.")
  }
  await assertAddressOk(deps, address)

  const existing = await deps.subscriptions.listSubscriptions({ customer_id: customerId, variant_id: variantId })
  const open = existing.filter((s) => s.status !== "cancelled")
  const pending = open.find((s) => s.status === "pending_card")
  if (pending) {
    // Mismo producto, todavía sin tarjeta: se reutiliza con los datos nuevos.
    return deps.subscriptions.updateSubscriptions({
      id: pending.id,
      quantity,
      shipping_address: address,
      terms_accepted_at: (deps.now?.() ?? new Date()),
    })
  }
  if (open.length > 0) {
    throw new MedusaError(MedusaError.Types.CONFLICT, "Ya tienes una suscripción a este producto.")
  }

  return deps.subscriptions.createSubscriptions({
    customer_id: customerId,
    variant_id: variantId,
    quantity,
    shipping_address: address,
    status: "pending_card",
    terms_accepted_at: deps.now?.() ?? new Date(),
  })
}

export async function pauseSubscription(deps: ActionDeps, customerId: string, id: string) {
  const sub = await getOwned(deps, id, customerId)
  await deps.subscriptions.transitionStatus(sub.id, "paused")
  await notifyQuietly(deps, "paused", sub.id)
  return getOwned(deps, id, customerId)
}

/**
 * Reanuda una suscripción pausada. Si su día de cobro ya pasó, queda para hoy
 * (no se cobran ciclos atrasados, solo uno).
 */
export async function resumeSubscription(deps: ActionDeps, customerId: string, id: string) {
  const sub = await getOwned(deps, id, customerId)
  if (sub.status !== "paused") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Solo se puede reanudar una suscripción pausada.")
  }
  if (!sub.payment_token_ref) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Inscribe una tarjeta para reanudar.")
  }
  await deps.subscriptions.transitionStatus(sub.id, "active")
  const today = chileToday(deps.now?.())
  if (!sub.next_billing_date || sub.next_billing_date < today) {
    await deps.subscriptions.updateSubscriptions({ id: sub.id, next_billing_date: today })
  }
  return getOwned(deps, id, customerId)
}

/**
 * Cancela. Primero queda cancelada en nuestro lado (lo que impide futuros
 * cobros) y luego se da de baja la tarjeta en Transbank; si esa baja falla, se
 * avisa pero la cancelación sigue en pie.
 */
export async function cancelSubscription(deps: ActionDeps, customerId: string, id: string) {
  const sub = await getOwned(deps, id, customerId)
  await deps.subscriptions.transitionStatus(sub.id, "cancelled")

  if (sub.payment_token_ref) {
    await deps.subscriptions.updateSubscriptions({ id: sub.id, payment_token_ref: null, inscription_token: null })
    try {
      await deps.oneclick.deleteInscription({
        tbkUser: sub.payment_token_ref,
        username: oneclickUsername(sub.customer_id),
      })
    } catch (err) {
      deps.logger?.warn(
        `[oneclick] no se pudo dar de baja la tarjeta de ${sub.id} al cancelar: ${err instanceof Error ? err.message : err}`
      )
    }
  }
  await notifyQuietly(deps, "cancelled", sub.id)
  return getOwned(deps, id, customerId)
}

/** Cambia producto (sabor), cantidad o dirección. No toca el estado ni el próximo cobro. */
export async function updateSubscription(
  deps: ActionDeps,
  customerId: string,
  id: string,
  body: Record<string, unknown>
) {
  const sub = await getOwned(deps, id, customerId)
  if (sub.status === "cancelled") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "La suscripción está cancelada.")
  }

  const patch: Record<string, unknown> = {}
  if (body.variant_id !== undefined) {
    const variantId = text(body.variant_id, "la variante", { max: 100 })
    if (!(await deps.variantIsPurchasable(variantId))) {
      throw invalid("El producto no está disponible para suscripción.")
    }
    patch.variant_id = variantId
  }
  if (body.quantity !== undefined) patch.quantity = parseQuantity(body.quantity)
  if (body.shipping_address !== undefined) {
    const address = parseShippingAddress(body.shipping_address)
    await assertAddressOk(deps, address)
    patch.shipping_address = address
  }
  if (Object.keys(patch).length === 0) throw invalid("No hay nada que actualizar.")

  await deps.subscriptions.updateSubscriptions({ id: sub.id, ...patch })
  return getOwned(deps, id, customerId)
}
