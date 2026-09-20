import { HeroContent } from "../types.ts";

/**
 * Medusa Data Model Definition for HeroContent
 * Represents the main hero section of the landing page.
 */
export const HeroContentDefinition = {
  tableName: "landing_hero_content",
  fields: {
    id: { type: "string", primaryKey: true },
    title: { type: "string", required: true },
    subtitle: { type: "text", required: true },
    badge: { type: "string", defaultValue: "NUEVA FÓRMULA CFM" },
    primary_cta_text: { type: "string", defaultValue: "Comprar Ahora" },
    primary_cta_url: { type: "string", defaultValue: "#producto" },
    secondary_cta_text: { type: "string", defaultValue: "Ver Beneficios" },
    secondary_cta_url: { type: "string", defaultValue: "#beneficios" },
    image_url: { type: "string", required: true },
    mobile_image_url: { type: "string", nullable: true },
    active: { type: "boolean", defaultValue: true },
    sort_order: { type: "number", defaultValue: 0 },
  },
  timestamps: true,
};

export type { HeroContent };
