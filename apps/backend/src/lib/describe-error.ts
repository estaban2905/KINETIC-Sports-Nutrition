/**
 * Texto legible de cualquier cosa que se haya lanzado. Los workflows de Medusa
 * rechazan con objetos planos ({ action, handlerType, error }) además de Error,
 * y String(obj) daría "[object Object]", que esconde la causa real.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; error?: unknown; action?: unknown }
    if (typeof e.message === "string" && e.message) return e.message
    if (e.error !== undefined && e.error !== err) {
      const inner = describeError(e.error)
      return typeof e.action === "string" ? `${e.action}: ${inner}` : inner
    }
    try {
      return JSON.stringify(err).slice(0, 300)
    } catch {
      return Object.prototype.toString.call(err)
    }
  }
  return String(err)
}
