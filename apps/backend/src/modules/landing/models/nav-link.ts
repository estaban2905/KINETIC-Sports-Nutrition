import { model } from "@medusajs/framework/utils"

const NavLink = model.define("landing_nav_link", {
  id: model.id().primaryKey(),
  label: model.text(),
  url: model.text(),
  group: model.text(),
  active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default NavLink
