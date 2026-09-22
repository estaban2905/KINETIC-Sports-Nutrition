const BASE_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY;

export interface LandingHero {
  title: string;
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

async function fetchLanding<T>(resource: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}/store/landing/${resource}`, {
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
