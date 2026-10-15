import { MedusaError } from "@medusajs/framework/utils"
import { isValidRut } from "./rut"

/**
 * El RUT del cliente vive en customer.metadata.rut (Medusa no tiene un campo
 * propio). Se valida acá, en el servidor, porque llega a la boleta/factura
 * del SII y el formulario del storefront se puede saltar.
 * Vacío o ausente es válido (el RUT es opcional en el perfil).
 */
export function assertValidCustomerRut(body: unknown): void {
  const metadata = (body as { metadata?: Record<string, unknown> | null } | null)?.metadata
  const rut = metadata?.rut
  if (rut === undefined || rut === null || rut === "") return
  if (typeof rut !== "string" || !isValidRut(rut)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "El RUT ingresado no es válido.")
  }
}
