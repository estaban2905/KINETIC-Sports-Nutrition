import type { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Ejecuta `job` con un candado por clave (módulo de locking de Medusa). Si otro
 * proceso ya tiene la misma clave, espera a que termine en vez de correr en
 * paralelo. Sirve para acciones que no se pueden repetir, como emitir una
 * boleta: order.placed, payment.captured y el job de reintento pueden llegar
 * casi al mismo tiempo para el mismo pedido.
 */
export async function withLock<T>(container: MedusaContainer, key: string, job: () => Promise<T>): Promise<T> {
  const locking = container.resolve(Modules.LOCKING)
  return locking.execute(key, job, { timeout: 120 })
}
