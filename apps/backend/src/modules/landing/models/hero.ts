import { model } from "@medusajs/framework/utils"

const Hero = model.define("landing_hero", {
  id: model.id().primaryKey(),
  title: model.text(),
  subtitle: model.text(),
  badge: model.text().default("NUEVA FÓRMULA CFM"),
  primary_cta_text: model.text().default("Comprar Ahora"),
  primary_cta_url: model.text().default("#producto"),
  secondary_cta_text: model.text().default("Ver Beneficios"),
  secondary_cta_url: model.text().default("#beneficios"),
  image_url: model.text(),
  mobile_image_url: model.text().nullable(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default Hero
