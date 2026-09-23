import { MedusaService } from "@medusajs/framework/utils"
import Hero from "./models/hero"
import Benefit from "./models/benefit"
import Testimonial from "./models/testimonial"
import Faq from "./models/faq"
import Banner from "./models/banner"
import Settings from "./models/settings"
import TrustBadge from "./models/trust-badge"
import FinalCta from "./models/final-cta"
import ProductSection from "./models/product-section"
import Guarantee from "./models/guarantee"
import UsageTip from "./models/usage-tip"
import NavLink from "./models/nav-link"

class LandingModuleService extends MedusaService({
  Hero,
  Benefit,
  Testimonial,
  Faq,
  Banner,
  Settings,
  TrustBadge,
  FinalCta,
  ProductSection,
  Guarantee,
  UsageTip,
  NavLink,
}) {}

export default LandingModuleService
