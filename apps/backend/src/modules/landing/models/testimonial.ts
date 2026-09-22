import { model } from "@medusajs/framework/utils"

const Testimonial = model.define("landing_testimonial", {
  id: model.id().primaryKey(),
  customer_name: model.text(),
  customer_image: model.text().nullable(),
  role: model.text().nullable(),
  content: model.text(),
  rating: model.number().default(5),
  product_purchased: model.text().nullable(),
  verified: model.boolean().default(true),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
  is_demo: model.boolean().default(false),
})

export default Testimonial
