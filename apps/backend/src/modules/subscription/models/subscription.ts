import { model } from "@medusajs/framework/utils"
import { SUBSCRIPTION_STATUSES } from "../../../lib/subscription-state"

/**
 * Suscripción de un cliente a una variante, con cobro recurrente.
 *
 * No guarda el precio: se calcula en cada ciclo desde el precio vigente de la
 * variante menos `discount_percent`, así un cambio de precio no la deja desfasada.
 * `next_billing_date` es un día de calendario de Chile ("YYYY-MM-DD"), ver
 * lib/billing-period.ts. De la tarjeta solo se guarda la referencia que entrega
 * Transbank (`payment_token_ref`) y datos para mostrarla enmascarada.
 */
const Subscription = model
  .define("subscription", {
    id: model.id({ prefix: "sub" }).primaryKey(),
    customer_id: model.text(),
    variant_id: model.text(),
    quantity: model.number().default(1),
    status: model.enum([...SUBSCRIPTION_STATUSES]).default("pending_card"),
    frequency_days: model.number().default(30),
    discount_percent: model.number().default(15),
    next_billing_date: model.text().nullable(),
    payment_token_ref: model.text().nullable(),
    // Token de una inscripción de tarjeta en curso (Oneclick). El callback de
    // Transbank llega sin sesión y solo trae este token; con él se ubica la
    // suscripción. Se borra apenas se termina o se rechaza la inscripción.
    inscription_token: model.text().nullable(),
    card_brand: model.text().nullable(),
    card_last4: model.text().nullable(),
    shipping_address: model.json().nullable(),
    welcome_gift_given: model.boolean().default(false),
    terms_accepted_at: model.dateTime().nullable(),
    cancelled_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["customer_id"] },
    { on: ["status", "next_billing_date"] },
    { on: ["inscription_token"] },
  ])

export default Subscription
