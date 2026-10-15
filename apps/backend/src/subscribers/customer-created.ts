import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { welcomeEmail } from "../lib/email-templates"
import { Sentry } from "../lib/sentry"

/**
 * Correo de bienvenida al crearse una cuenta (con correo y contraseña o con
 * Google). Medusa también emite customer.created para el cliente "invitado"
 * que se crea al comprar sin cuenta (has_account = false): a esos no se les
 * escribe.
 */
export default async function customerCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "has_account"],
      filters: { id: event.data.id },
    })
    const customer = customers[0] as any
    if (!customer?.email || !customer.has_account) return

    const { subject, html } = welcomeEmail({ firstName: customer.first_name })
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: customer.email,
      channel: "email",
      content: { subject, html },
      data: { customer_id: customer.id },
      trigger_type: "customer.created",
      resource_id: customer.id,
      resource_type: "customer",
    })
  } catch (err) {
    logger.error(
      `No se pudo enviar el email de bienvenida del cliente ${event.data.id}: ${
        err instanceof Error ? err.message : err
      }`
    )
    Sentry.captureException(err)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
