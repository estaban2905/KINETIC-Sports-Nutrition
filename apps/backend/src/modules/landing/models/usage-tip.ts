import { model } from "@medusajs/framework/utils"

const UsageTip = model.define("landing_usage_tip", {
  id: model.id().primaryKey(),
  title: model.text(),
  body: model.text(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default UsageTip
