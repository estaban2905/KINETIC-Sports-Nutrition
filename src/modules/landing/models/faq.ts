import { LandingFAQ } from "../types.ts";

export const LandingFAQDefinition = {
  tableName: "landing_faq",
  fields: {
    id: { type: "string", primaryKey: true },
    question: { type: "string", required: true },
    answer: { type: "text", required: true },
    active: { type: "boolean", defaultValue: true },
    sort_order: { type: "number", defaultValue: 0 },
  },
  timestamps: true,
};

export type { LandingFAQ };
