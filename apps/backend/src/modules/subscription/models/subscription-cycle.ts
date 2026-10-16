import { model } from "@medusajs/framework/utils"

/**
 * Un intento de cobro de una suscripción para un día de cobro (`period_key`).
 * El índice único (subscription_id, period_key) es la garantía de no cobrar dos
 * veces: antes de cobrar se INSERTA la fila "reserved", y solo un proceso puede
 * lograrlo aunque el job corra dos veces o en dos instancias.
 *
 * Estados:
 * - reserved: reservado; se está cobrando.
 * - charged_pending_order: cobrado, pero falló un paso posterior (orden, envío).
 *   Lo recoge la reconciliación; NO se vuelve a cobrar.
 * - completed: cobrado y con orden creada.
 * - failed: el cobro fue rechazado. Se reintenta en un día de cobro nuevo.
 */
const SubscriptionCycle = model
  .define("subscription_cycle", {
    id: model.id({ prefix: "subcyc" }).primaryKey(),
    subscription_id: model.text(),
    period_key: model.text(),
    status: model
      .enum(["reserved", "charged_pending_order", "completed", "failed"])
      .default("reserved"),
    attempt: model.number().default(1),
    amount: model.number().nullable(),
    order_id: model.text().nullable(),
    attempted_at: model.dateTime().nullable(),
    error: model.text().nullable(),
  })
  .indexes([
    { on: ["subscription_id", "period_key"], unique: true },
    { on: ["status"] },
  ])

export default SubscriptionCycle
