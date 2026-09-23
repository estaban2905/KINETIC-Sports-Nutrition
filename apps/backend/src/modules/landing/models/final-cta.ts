import { model } from "@medusajs/framework/utils"

const FinalCta = model.define("landing_final_cta", {
  id: model.id().primaryKey(),
  badge_text: model.text(),
  headline: model.text(),
  headline_highlight: model.text(),
  subtext: model.text(),
  guarantee_text: model.text(),
  cta_text: model.text().default("Comprar Ahora"),
})

export default FinalCta
