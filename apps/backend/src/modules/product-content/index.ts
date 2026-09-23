import ProductContentModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PRODUCT_CONTENT_MODULE = "product_content"

export default Module(PRODUCT_CONTENT_MODULE, {
  service: ProductContentModuleService,
})
