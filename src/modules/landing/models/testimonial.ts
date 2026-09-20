import { LandingTestimonial } from "../types.ts";

export const LandingTestimonialDefinition = {
  tableName: "landing_testimonial",
  fields: {
    id: { type: "string", primaryKey: true },
    customer_name: { type: "string", required: true },
    customer_image: { type: "string", required: true },
    content: { type: "text", required: true },
    rating: { type: "number", defaultValue: 5 },
    active: { type: "boolean", defaultValue: true },
    sort_order: { type: "number", defaultValue: 0 },
    is_demo: { type: "boolean", defaultValue: true },
  },
  timestamps: true,
};

export type { LandingTestimonial };
