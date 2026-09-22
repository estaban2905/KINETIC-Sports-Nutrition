import { model } from "@medusajs/framework/utils"

const Settings = model.define("landing_settings", {
  id: model.id().primaryKey(),
  brand_name: model.text(),
  logo_url: model.text(),
  favicon_url: model.text(),
  primary_color: model.text().default("#a3e635"),
  secondary_color: model.text().default("#dc2626"),
  whatsapp_number: model.text(),
  instagram_url: model.text().nullable(),
  tiktok_url: model.text().nullable(),
  facebook_url: model.text().nullable(),
  contact_email: model.text(),
  shipping_information: model.text(),
  footer_text: model.text(),
  privacy_policy: model.text().nullable(),
  terms_and_conditions: model.text().nullable(),
  seo_title: model.text(),
  seo_description: model.text(),
  og_image: model.text().nullable(),
})

export default Settings
