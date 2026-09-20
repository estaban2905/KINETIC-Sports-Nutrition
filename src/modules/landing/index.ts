import { LandingModuleService, landingServiceInstance } from "./service.ts";
export * from "./types.ts";
export * from "./models/hero.ts";
export * from "./models/benefit.ts";
export * from "./models/testimonial.ts";
export * from "./models/faq.ts";
export * from "./models/banner.ts";
export * from "./models/settings.ts";

export const LANDING_MODULE = "landingModuleService";

export default {
  service: LandingModuleService,
  instance: landingServiceInstance,
};
