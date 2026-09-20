import { LandingBenefit } from "../types.ts";

export const LandingBenefitDefinition = {
  tableName: "landing_benefit",
  fields: {
    id: { type: "string", primaryKey: true },
    icon: { type: "string", required: true },
    title: { type: "string", required: true },
    description: { type: "text", required: true },
    active: { type: "boolean", defaultValue: true },
    sort_order: { type: "number", defaultValue: 0 },
  },
  timestamps: true,
};

export type { LandingBenefit };
