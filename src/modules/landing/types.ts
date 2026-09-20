/**
 * Landing Content Module Types & Interfaces
 *
 * Exclusively handles marketing, brand identity, and landing visual presentation
 * isolated from core ecommerce modules.
 */

export interface HeroContent {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  primary_cta_text: string;
  primary_cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  image_url: string;
  mobile_image_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LandingBenefit {
  id: string;
  icon: string;
  title: string;
  description: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LandingTestimonial {
  id: string;
  customer_name: string;
  customer_image: string;
  content: string;
  rating: number;
  active: boolean;
  sort_order: number;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LandingFAQ {
  id: string;
  question: string;
  answer: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LandingBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_url: string;
  start_date: string;
  end_date: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LandingSettings {
  id: string;
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  whatsapp_number: string;
  instagram_url: string;
  tiktok_url: string;
  facebook_url: string;
  contact_email: string;
  shipping_information: string;
  footer_text: string;
  privacy_policy: string;
  terms_and_conditions: string;
  seo_title: string;
  seo_description: string;
  og_image: string;
  created_at: string;
  updated_at: string;
}
