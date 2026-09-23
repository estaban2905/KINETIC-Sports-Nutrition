import { model } from "@medusajs/framework/utils"

const Banner = model.define("landing_banner", {
  id: model.id().primaryKey(),
  title: model.text(),
  subtitle: model.text(),
  tag: model.text().nullable(),
  image_url: model.text(),
  button_text: model.text().default("Ver Oferta"),
  button_url: model.text().default("#oferta"),
  start_date: model.dateTime(),
  end_date: model.dateTime(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default Banner
