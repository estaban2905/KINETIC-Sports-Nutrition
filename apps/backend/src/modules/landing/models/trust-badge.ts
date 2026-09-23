import { model } from "@medusajs/framework/utils"

const TrustBadge = model.define("landing_trust_badge", {
  id: model.id().primaryKey(),
  icon: model.text().nullable(),
  text: model.text(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default TrustBadge
