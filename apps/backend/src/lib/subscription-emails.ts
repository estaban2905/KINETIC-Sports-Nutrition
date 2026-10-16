import { button, emailLayout, escapeHtml, formatCLP, heading, paragraph, storefrontUrl, strong } from "./email-templates"

/**
 * Correos de la suscripción. El de "cobro exitoso" de cada renovación NO está
 * aquí: lo cubre la confirmación normal del pedido (subscribers/order-placed),
 * porque cada renovación crea un pedido igual que una compra.
 */

export type SubscriptionEmailKind =
  | "active"
  | "reminder"
  | "payment_failed"
  | "skipped_no_stock"
  | "paused"
  | "cancelled"

export type SubscriptionEmailContext = {
  firstName?: string | null
  /** "GOLD STANDARD 100% WHEY · Double Rich Chocolate / 2 Libras" */
  productLabel: string
  quantity: number
  discountPercent: number
  frequencyDays: number
  /** Monto del cobro (real o estimado), en pesos. */
  amount?: number | null
  /** Día de cobro "YYYY-MM-DD" (próximo cobro o el del aviso). */
  billingDate?: string | null
  cardLabel?: string | null
  /** payment_failed: día del reintento, o null si ya no habrá más. */
  retryOn?: string | null
  /** payment_failed: se agotaron los intentos y la suscripción quedó vencida. */
  pastDue?: boolean
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

/** "2026-10-28" -> "28 de octubre de 2026" (sin pasar por zonas horarias). */
export function formatBillingDate(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return day
  return `${Number(m[3])} de ${MONTHS[Number(m[2]) - 1]} de ${m[1]}`
}

const manageButton = (label = "Administrar mi suscripción"): string => {
  const url = storefrontUrl()
  return url ? button(`${url}/cuenta?tab=membership`, label) : ""
}

const greeting = (name?: string | null) => (name?.trim() ? `Hola, ${escapeHtml(name.trim())}.` : "Hola.")

const every = (days: number) => (days === 30 ? "cada mes" : `cada ${days} días`)

export function subscriptionActiveEmail(c: SubscriptionEmailContext): { subject: string; html: string } {
  const html = emailLayout(
    `
    ${heading("Tu suscripción está activa")}
    ${paragraph(`${greeting(c.firstName)} Ya quedó activa tu suscripción a ${strong(c.productLabel)} (x${c.quantity}).`)}
    ${paragraph(
      `Pagas ${strong(`${c.discountPercent}% menos`)} que en compra única, con envío gratis, y la recibes ${every(c.frequencyDays)}.` +
        (c.billingDate ? ` Tu próximo cobro será el ${strong(formatBillingDate(c.billingDate))}.` : "")
    )}
    ${paragraph("Te avisaremos unos días antes de cada cobro. Puedes pausarla, cambiar el sabor o cancelarla cuando quieras desde tu cuenta, sin costo.")}
    ${manageButton()}`,
    { preheader: "Tu suscripción KINETIC ya está activa" }
  )
  return { subject: "Tu suscripción KINETIC está activa", html }
}

export function subscriptionReminderEmail(c: SubscriptionEmailContext): { subject: string; html: string } {
  const when = c.billingDate ? formatBillingDate(c.billingDate) : "pronto"
  const html = emailLayout(
    `
    ${heading("Tu próximo cobro se acerca")}
    ${paragraph(
      `${greeting(c.firstName)} El ${strong(when)} cobraremos ${c.amount ? strong(formatCLP(c.amount)) : "tu suscripción"}` +
        `${c.cardLabel ? ` a tu tarjeta ${strong(c.cardLabel)}` : ""} por ${strong(c.productLabel)} (x${c.quantity}).`
    )}
    ${paragraph("Si necesitas cambiar el sabor, la dirección o la tarjeta, pausar o cancelar, hazlo antes de esa fecha desde tu cuenta.")}
    ${manageButton()}`,
    { preheader: `Cobraremos tu suscripción el ${when}` }
  )
  return { subject: `Tu suscripción KINETIC se cobra el ${when}`, html }
}

export function subscriptionPaymentFailedEmail(c: SubscriptionEmailContext): { subject: string; html: string } {
  if (c.pastDue) {
    const html = emailLayout(
      `
      ${heading("No pudimos cobrar tu suscripción")}
      ${paragraph(`${greeting(c.firstName)} Intentamos cobrar tu suscripción a ${strong(c.productLabel)} varias veces y tu tarjeta fue rechazada.`)}
      ${paragraph("Dejamos tu suscripción detenida para no insistir. Para reactivarla solo tienes que registrar una tarjeta vigente: se retomará de inmediato.")}
      ${manageButton("Actualizar mi tarjeta")}`,
      { preheader: "Actualiza tu tarjeta para reactivar tu suscripción" }
    )
    return { subject: "Detuvimos tu suscripción KINETIC: actualiza tu tarjeta", html }
  }
  const html = emailLayout(
    `
    ${heading("Tu tarjeta fue rechazada")}
    ${paragraph(`${greeting(c.firstName)} No pudimos cobrar tu suscripción a ${strong(c.productLabel)}${c.cardLabel ? ` con tu tarjeta ${strong(c.cardLabel)}` : ""}.`)}
    ${paragraph(
      c.retryOn
        ? `Volveremos a intentarlo el ${strong(formatBillingDate(c.retryOn))}. Si prefieres, puedes registrar otra tarjeta ahora.`
        : "Puedes registrar otra tarjeta desde tu cuenta."
    )}
    ${manageButton("Actualizar mi tarjeta")}`,
    { preheader: "No pudimos cobrar tu suscripción KINETIC" }
  )
  return { subject: "No pudimos cobrar tu suscripción KINETIC", html }
}

export function subscriptionSkippedEmail(c: SubscriptionEmailContext): { subject: string; html: string } {
  const html = emailLayout(
    `
    ${heading("Saltamos este envío")}
    ${paragraph(`${greeting(c.firstName)} Hoy no tenemos stock de ${strong(c.productLabel)}, así que ${strong("no te cobramos")} este ciclo.`)}
    ${paragraph(c.billingDate ? `Retomaremos tu suscripción el ${strong(formatBillingDate(c.billingDate))}.` : "Retomaremos tu suscripción en el próximo ciclo.")}
    ${manageButton()}`,
    { preheader: "No te cobramos este ciclo: sin stock" }
  )
  return { subject: "Saltamos tu envío de este ciclo — KINETIC", html }
}

export function subscriptionPausedEmail(c: SubscriptionEmailContext): { subject: string; html: string } {
  const html = emailLayout(
    `
    ${heading("Suscripción pausada")}
    ${paragraph(`${greeting(c.firstName)} Pausamos tu suscripción a ${strong(c.productLabel)}. No se hará ningún cobro mientras esté pausada.`)}
    ${paragraph("Puedes reanudarla cuando quieras desde tu cuenta.")}
    ${manageButton("Reanudar mi suscripción")}`,
    { preheader: "Tu suscripción KINETIC está pausada" }
  )
  return { subject: "Pausamos tu suscripción KINETIC", html }
}

export function subscriptionCancelledEmail(c: SubscriptionEmailContext): { subject: string; html: string } {
  const url = storefrontUrl()
  const html = emailLayout(
    `
    ${heading("Suscripción cancelada")}
    ${paragraph(`${greeting(c.firstName)} Cancelamos tu suscripción a ${strong(c.productLabel)} y dimos de baja tu tarjeta. No habrá más cobros.`)}
    ${paragraph("Gracias por haber sido parte. Cuando quieras volver, te esperamos.")}
    ${url ? button(url, "Ir a la tienda") : ""}`,
    { preheader: "Tu suscripción KINETIC fue cancelada" }
  )
  return { subject: "Cancelamos tu suscripción KINETIC", html }
}

export function buildSubscriptionEmail(
  kind: SubscriptionEmailKind,
  context: SubscriptionEmailContext
): { subject: string; html: string } {
  switch (kind) {
    case "active":
      return subscriptionActiveEmail(context)
    case "reminder":
      return subscriptionReminderEmail(context)
    case "payment_failed":
      return subscriptionPaymentFailedEmail(context)
    case "skipped_no_stock":
      return subscriptionSkippedEmail(context)
    case "paused":
      return subscriptionPausedEmail(context)
    case "cancelled":
      return subscriptionCancelledEmail(context)
  }
}
