import { LandingSettings } from "../types.ts";

export const LandingSettingsDefinition = {
  tableName: "landing_settings",
  fields: {
    id: { type: "string", primaryKey: true },
    brand_name: { type: "string", required: true },
    logo_url: { type: "string", required: true },
    favicon_url: { type: "string", required: true },
    primary_color: { type: "string", defaultValue: "#a3e635" },
    secondary_color: { type: "string", defaultValue: "#dc2626" },
    whatsapp_number: { type: "string", required: true },
    instagram_url: { type: "string", required: true },
    tiktok_url: { type: "string", required: true },
    facebook_url: { type: "string", required: true },
    contact_email: { type: "string", required: true },
    shipping_information: { type: "text", required: true },
    footer_text: { type: "text", required: true },
    privacy_policy: { type: "text", required: true },
    terms_and_conditions: { type: "text", required: true },
    seo_title: { type: "string", required: true },
    seo_description: { type: "text", required: true },
    og_image: { type: "string", required: true },
  },
  timestamps: true,
};

export type { LandingSettings };
