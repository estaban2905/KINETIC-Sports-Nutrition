import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/product"
import ProductContentModule from "../modules/product-content"

/**
 * 1:1 link between core Product and our custom ProductContent module.
 * Medusa stores this as a separate pivot table (product_id <-> product_content_id)
 * managed entirely outside the core `product` table, so upgrading Medusa never
 * conflicts with this — see apps/backend/src/modules/product-content.
 */
export default defineLink(
  ProductModule.linkable.product,
  ProductContentModule.linkable.productContent
)
