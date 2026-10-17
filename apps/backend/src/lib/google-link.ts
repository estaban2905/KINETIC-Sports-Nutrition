/**
 * Correo de Google de una identidad de autenticación, o null si no hay.
 * El proveedor de Google solo crea la identidad cuando Google marca el correo
 * como verificado (email_verified), por eso es seguro usarlo para vincular.
 */
export function googleEmailFromIdentity(identity: {
  provider_identities?: { provider?: string; user_metadata?: Record<string, unknown> | null }[] | null
}): string | null {
  const google = (identity.provider_identities ?? []).find((p) => p.provider === "google")
  const email = google?.user_metadata?.email
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null
}
