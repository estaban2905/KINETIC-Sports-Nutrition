import { model } from "@medusajs/framework/utils"

const Benefit = model.define("landing_benefit", {
  id: model.id().primaryKey(),
  icon: model.text(),
  title: model.text(),
  description: model.text(),
  stat: model.text().nullable(),
  stat_label: model.text().nullable(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default Benefit
