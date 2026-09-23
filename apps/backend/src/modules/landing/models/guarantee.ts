import { model } from "@medusajs/framework/utils"

const Guarantee = model.define("landing_guarantee", {
  id: model.id().primaryKey(),
  icon: model.text(),
  title: model.text(),
  subtitle: model.text(),
  context: model.text().default("product_section"),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default Guarantee
