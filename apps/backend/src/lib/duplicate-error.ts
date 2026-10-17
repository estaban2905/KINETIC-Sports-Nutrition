/**
 * ¿El error es una violación de índice único? Medusa la convierte en un
 * MedusaError "duplicate_error" ("... already exists"); según la ruta también
 * puede llegar el error crudo de Postgres (código 23505).
 */
export function isDuplicateKeyError(err: unknown): boolean {
  const e = err as { type?: string; code?: string; message?: string } | null
  const message = e?.message ?? String(err)
  return (
    e?.type === "duplicate_error" ||
    e?.code === "23505" ||
    /already exists|unique|duplicate/i.test(message)
  )
}
