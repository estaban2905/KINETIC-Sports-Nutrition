const BASE_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY;

export interface LandingHero {
  title: string;
  headline_highlight: string | null;
  subtitle: string;
  badge: string;
  primary_cta_text: string;
  primary_cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  image_url: string;
  mobile_image_url: string | null;
}

export interface LandingBenefit {
  id: string;
  icon: string;
  title: string;
  description: string;
  stat: string | null;
  stat_label: string | null;
}

export interface LandingTestimonial {
  id: string;
  customer_name: string;
  customer_image: string | null;
  role: string | null;
  content: string;
  rating: number;
  product_purchased: string | null;
  verified: boolean;
}

export interface LandingFAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export interface LandingSettings {
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  whatsapp_number: string;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  contact_email: string;
  shipping_information: string;
  footer_text: string;
  footer_description: string | null;
  privacy_policy: string | null;
  terms_and_conditions: string | null;
  seo_title: string;
  seo_description: string;
  og_image: string | null;
  whatsapp_message_template: string | null;
  whatsapp_tooltip_text: string | null;
  offer_fallback_headline: string | null;
  offer_fallback_subtitle: string | null;
}

export interface LandingBanner {
  id: string;
  title: string;
  subtitle: string;
  tag: string | null;
  image_url: string;
  button_text: string;
  button_url: string;
  start_date: string;
  end_date: string;
}

export interface LandingTrustBadge {
  id: string;
  icon: string | null;
  text: string;
}

export interface LandingFinalCta {
  badge_text: string;
  headline: string;
  headline_highlight: string;
  subtext: string;
  guarantee_text: string;
  cta_text: string;
}

export interface LandingProductSection {
  eyebrow: string;
  headline: string;
  tagline: string;
  micro_label: string;
  formula_heading: string;
  advantages_heading: string;
}

export interface LandingGuarantee {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  context: string;
}

export interface LandingUsageTip {
  id: string;
  title: string;
  body: string;
}

export interface LandingNavLink {
  id: string;
  label: string;
  url: string;
  group: string;
}

async function fetchLanding<T>(resource: string, query?: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}/store/landing/${resource}${query ? `?${query}` : ""}`, {
      headers: PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getLandingHero(): Promise<LandingHero | null> {
  const data = await fetchLanding<{ hero: LandingHero }>("hero");
  return data?.hero ?? null;
}

export async function getLandingBenefits(): Promise<LandingBenefit[] | null> {
  const data = await fetchLanding<{ benefits: LandingBenefit[] }>("benefits");
  return data?.benefits ?? null;
}

export async function getLandingTestimonials(): Promise<LandingTestimonial[] | null> {
  const data = await fetchLanding<{ testimonials: LandingTestimonial[] }>("testimonials");
  return data?.testimonials ?? null;
}

export async function getLandingFAQs(): Promise<LandingFAQ[] | null> {
  const data = await fetchLanding<{ faq: LandingFAQ[] }>("faq");
  return data?.faq ?? null;
}

export async function getLandingSettings(): Promise<LandingSettings | null> {
  const data = await fetchLanding<{ settings: LandingSettings }>("settings");
  return data?.settings ?? null;
}

export async function getLandingBanners(): Promise<LandingBanner[] | null> {
  const data = await fetchLanding<{ banners: LandingBanner[] }>("banners");
  return data?.banners ?? null;
}

export async function getLandingTrustBadges(): Promise<LandingTrustBadge[] | null> {
  const data = await fetchLanding<{ trust_badges: LandingTrustBadge[] }>("trust-badges");
  return data?.trust_badges ?? null;
}

export async function getLandingFinalCta(): Promise<LandingFinalCta | null> {
  const data = await fetchLanding<{ final_cta: LandingFinalCta }>("final-cta");
  return data?.final_cta ?? null;
}

export async function getLandingProductSection(): Promise<LandingProductSection | null> {
  const data = await fetchLanding<{ product_section: LandingProductSection }>("product-section");
  return data?.product_section ?? null;
}

export async function getLandingGuarantees(): Promise<LandingGuarantee[] | null> {
  const data = await fetchLanding<{ guarantees: LandingGuarantee[] }>("guarantees");
  return data?.guarantees ?? null;
}

export async function getLandingUsageTips(): Promise<LandingUsageTip[] | null> {
  const data = await fetchLanding<{ usage_tips: LandingUsageTip[] }>("usage-tips");
  return data?.usage_tips ?? null;
}

export async function getLandingNavLinks(group?: string): Promise<LandingNavLink[] | null> {
  const data = await fetchLanding<{ nav_links: LandingNavLink[] }>(
    "nav-links",
    group ? `group=${encodeURIComponent(group)}` : undefined
  );
  return data?.nav_links ?? null;
}
