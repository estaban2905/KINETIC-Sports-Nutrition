import { model } from "@medusajs/framework/utils"

/**
 * Marketing/merchandising fields that Medusa's core Product model doesn't
 * have (badge, star rating, bullet features, nutrition table). Linked 1:1 to
 * a core Product via src/links/product-product-content.ts instead of
 * extending Product directly, so core upgrades never conflict with this.
 */
const ProductContent = model.define("product_content", {
  id: model.id().primaryKey(),
  badge: model.text().nullable(),
  rating: model.float().default(5),
  features: model.json().nullable(),
  nutrition_facts: model.json().nullable(),
})

export default ProductContent
