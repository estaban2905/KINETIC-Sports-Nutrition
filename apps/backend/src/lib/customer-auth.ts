import { MedusaError } from "@medusajs/framework/utils"

/**
 * Id del cliente autenticado, tomado SOLO del token (auth_context). Los
 * endpoints "me" deben filtrar por este valor y nunca por un parámetro que
 * mande el cliente: es lo que impide ver pedidos ajenos.
 */
export function requireCustomerId(req: {
  auth_context?: { actor_id?: string; actor_type?: string } | null
}): string {
  const ctx = req.auth_context
  if (!ctx?.actor_id || ctx.actor_type !== "customer") {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Debes iniciar sesión.")
  }
  return ctx.actor_id
}

export function customerOrdersFilter(customerId: string) {
  return { customer_id: customerId }
}

/** limit/offset del query string, acotados para que no se pueda pedir todo de golpe. */
export function parsePagination(query: Record<string, unknown>): { take: number; skip: number } {
  const limit = Number(query.limit)
  const offset = Number(query.offset)
  return {
    take: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20,
    skip: Number.isInteger(offset) && offset > 0 ? offset : 0,
  }
}
