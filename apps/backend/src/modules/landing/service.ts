import { MedusaService } from "@medusajs/framework/utils"
import Hero from "./models/hero"
import Benefit from "./models/benefit"
import Testimonial from "./models/testimonial"
import Faq from "./models/faq"
import Banner from "./models/banner"
import Settings from "./models/settings"

class LandingModuleService extends MedusaService({
  Hero,
  Benefit,
  Testimonial,
  Faq,
  Banner,
  Settings,
}) {}

export default LandingModuleService
