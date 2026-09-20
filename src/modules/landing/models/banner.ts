import { LandingBanner } from "../types.ts";

export const LandingBannerDefinition = {
  tableName: "landing_banner",
  fields: {
    id: { type: "string", primaryKey: true },
    title: { type: "string", required: true },
    subtitle: { type: "string", required: true },
    image_url: { type: "string", required: true },
    button_text: { type: "string", defaultValue: "Ver Oferta" },
    button_url: { type: "string", defaultValue: "#oferta" },
    start_date: { type: "timestamp", required: true },
    end_date: { type: "timestamp", required: true },
    active: { type: "boolean", defaultValue: true },
    sort_order: { type: "number", defaultValue: 0 },
  },
  timestamps: true,
};

export type { LandingBanner };
