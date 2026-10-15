import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { passwordResetEmail, storefrontUrl } from "../lib/email-templates"
import { Sentry } from "../lib/sentry"

/**
 * Medusa emite auth.password_reset al llamar a
 * POST /auth/customer/emailpass/reset-password. El storefront no recibe el
 * token en la respuesta (evita enumerar cuentas), así que se manda por email.
 */
export default async function passwordResetHandler({
  event,
  container,
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  const { entity_id: email, actor_type, token } = event.data
  // Los usuarios del admin tienen su propio flujo.
  if (actor_type !== "customer") return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const siteUrl = storefrontUrl()
  if (!siteUrl) {
    logger.error("auth.password_reset: STOREFRONT_URL no está configurado, no se puede armar el enlace.")
    return
  }

  try {
    const resetUrl = `${siteUrl}/restablecer?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    const { subject, html } = passwordResetEmail({ resetUrl })
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: email,
      channel: "email",
      content: { subject, html },
      data: { actor_type },
      trigger_type: "auth.password_reset",
      resource_type: "customer",
    })
  } catch (err) {
    logger.error(`No se pudo enviar el email de restablecer contraseña: ${err instanceof Error ? err.message : err}`)
    Sentry.captureException(err)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
