import { model } from "@medusajs/framework/utils"

const Faq = model.define("landing_faq", {
  id: model.id().primaryKey(),
  question: model.text(),
  answer: model.text(),
  category: model.text().nullable(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default Faq
