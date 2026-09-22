import LandingModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const LANDING_MODULE = "landing"

export default Module(LANDING_MODULE, {
  service: LandingModuleService,
})
