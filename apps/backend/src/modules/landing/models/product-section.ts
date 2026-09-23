import { model } from "@medusajs/framework/utils"

const ProductSection = model.define("landing_product_section", {
  id: model.id().primaryKey(),
  eyebrow: model.text(),
  headline: model.text(),
  tagline: model.text(),
  micro_label: model.text(),
  formula_heading: model.text(),
  advantages_heading: model.text(),
})

export default ProductSection
