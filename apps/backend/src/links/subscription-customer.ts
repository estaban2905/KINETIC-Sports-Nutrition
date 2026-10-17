import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import SubscriptionModule from "../modules/subscription"

/** Un cliente puede tener varias suscripciones. */
export default defineLink(
  CustomerModule.linkable.customer,
  { linkable: SubscriptionModule.linkable.subscription, isList: true }
)
