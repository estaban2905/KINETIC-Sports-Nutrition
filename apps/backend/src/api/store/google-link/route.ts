import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { googleEmailFromIdentity } from "../../../lib/google-link"

/**
 * Si alguien entra con Google y ya existe un cliente con ese correo (creado
 * con contraseña), la identidad de Google se vincula a ese cliente en vez de
 * fallar. Solo vale para un token de Google recién obtenido y todavía sin
 * cliente asociado (actor_id vacío); el correo viene de Google ya verificado.
 *
 * Responde { linked: true } si vinculó, { linked: false } si no hay cliente con
 * ese correo (el storefront lo crea entonces).
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const ctx = req.auth_context
  if (!ctx?.auth_identity_id || ctx.actor_id) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Este token no puede vincular una cuenta.")
  }

  const auth = req.scope.resolve(Modules.AUTH)
  const identity = await auth.retrieveAuthIdentity(ctx.auth_identity_id, {
    relations: ["provider_identities"],
  })

  const email = googleEmailFromIdentity(identity as any)
  if (!email) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "La identidad no pertenece a Google.")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email, has_account: true } as any,
    pagination: { take: 1 },
  })
  const customer = customers[0] as { id: string } | undefined
  if (!customer) {
    res.json({ linked: false })
    return
  }

  await auth.updateAuthIdentities({
    id: identity.id,
    app_metadata: { ...identity.app_metadata, customer_id: customer.id },
  })
  res.json({ linked: true })
}
