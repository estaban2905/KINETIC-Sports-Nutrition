import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import SubscriptionModule from "../modules/subscription"

/** Cada ciclo cobrado termina en una orden; una orden pertenece a un solo ciclo. */
export default defineLink(
  SubscriptionModule.linkable.subscriptionCycle,
  OrderModule.linkable.order
)
