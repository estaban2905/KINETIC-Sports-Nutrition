import {
  HeroContent,
  LandingBenefit,
  LandingTestimonial,
  LandingFAQ,
  LandingBanner,
  LandingSettings,
} from "./types.ts";

/**
 * In-memory / PostgreSQL-backed Landing Module Service
 * Implements core domain logic for marketing entities.
 *
 * // TODO: [DATABASE] Replace in-memory state with queries to PostgreSQL tables defined in '001_initial_landing.ts':
 * //       - landing_hero_content
 * //       - landing_benefit
 * //       - landing_testimonial
 * //       - landing_faq
 * //       - landing_banner
 * //       - landing_settings
 * // TODO: [CACHE] Implement Redis caching with key 'landing:hero:active' and 'landing:settings' to avoid database hits on every visitor landing page load.
 * // TODO: [STORAGE] Connect Google Cloud Storage / AWS S3 presigned URL generator for image_url uploads.
 */
export class LandingModuleService {
  private hero: HeroContent;
  private benefits: LandingBenefit[] = [];
  private testimonials: LandingTestimonial[] = [];
  private faqs: LandingFAQ[] = [];
  private banners: LandingBanner[] = [];
  private settings: LandingSettings;

  constructor() {
    // Initialize with verified demo data for sports nutrition brand
    const now = new Date();
    const isoNow = now.toISOString();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    this.hero = {
      id: "hero_01",
      title: "POTENCIA PURA. RECUPERACIÓN TOTAL.",
      subtitle: "PROTEIN X: La máxima pureza en aislado de suero de leche microfiltrado CFM con 24g de proteína, 5.5g de BCAAs y 0g de azúcar añadido por porción.",
      badge: "NUEVA FÓRMULA CFM 2025",
      primary_cta_text: "COMPRAR AHORA",
      primary_cta_url: "#producto",
      secondary_cta_text: "VER BENEFICIOS",
      secondary_cta_url: "#beneficios",
      image_url: "/assets/images/protein-tub.webp",
      mobile_image_url: "/assets/images/protein-tub-mobile.webp",
      active: true,
      sort_order: 1,
      created_at: isoNow,
      updated_at: isoNow,
    };

    this.benefits = [
      {
        id: "ben_01",
        icon: "ShieldCheck",
        title: "24g Proteína CFM de Máxima Pureza",
        description: "Aislado de suero procesado a bajas temperaturas mediante flujo cruzado para preservar las fracciones bioactivas intactas.",
        active: true,
        sort_order: 1,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "ben_02",
        icon: "Zap",
        title: "5.5g BCAAs Naturales para Recuperación Rápida",
        description: "Ratio óptimo de Leucina, Isoleucina y Valina para estimular la síntesis proteica muscular (mTOR) inmediatamente post-entrenamiento.",
        active: true,
        sort_order: 2,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "ben_03",
        icon: "Flame",
        title: "0g Azúcar Añadido & Ultra Baja en Carbohidratos",
        description: "Ideal para fases de definición, recomposición corporal o atletas con estrictos requerimientos de macronutrientes.",
        active: true,
        sort_order: 3,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "ben_04",
        icon: "CheckCircle",
        title: "Disolución Instantánea sin Grumos",
        description: "Tecnología de instantaneización avanzada que se mezcla perfectamente en 15 segundos con agua o leche.",
        active: true,
        sort_order: 4,
        created_at: isoNow,
        updated_at: isoNow,
      },
    ];

    this.testimonials = [
      {
        id: "test_01",
        customer_name: "Camila Valenzuela",
        customer_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        content: "La digestión es insuperable. Llevo 3 meses usando el sabor Chocolate Suizo en mis preparaciones para maratón y la recuperación muscular se nota al día siguiente.",
        rating: 5,
        active: true,
        sort_order: 1,
        is_demo: true,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "test_02",
        customer_name: "Matías Silva",
        customer_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        content: "El sabor Vainilla Francesa no tiene ese regusto químico de otras marcas. Se disuelve en 10 segundos con agua fría sin shaker con rejilla.",
        rating: 5,
        active: true,
        sort_order: 2,
        is_demo: true,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "test_03",
        customer_name: "Ignacio Carrasco",
        customer_image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        content: "La relación precio-calidad con 66 servicios reales en el envase de 2kg es la mejor del mercado chileno.",
        rating: 5,
        active: true,
        sort_order: 3,
        is_demo: true,
        created_at: isoNow,
        updated_at: isoNow,
      },
    ];

    this.faqs = [
      {
        id: "faq_01",
        question: "¿Cómo y cuándo debo tomar PROTEIN X?",
        answer: "Mezcla 1 scoop (30g) con 250-300 ml de agua fría o leche vegetal. Recomendamos tomarlo dentro de los 30-45 minutos posteriores al entrenamiento, o como refuerzo proteico en el desayuno.",
        active: true,
        sort_order: 1,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "faq_02",
        question: "¿Es apto para personas intolerantes a la lactosa?",
        answer: "Sí, gracias al proceso de microfiltración por flujo cruzado (CFM), los niveles de lactosa y grasa se reducen a menos del 0.5%, haciéndola altamente digestible para personas con sensibilidad leve a moderada.",
        active: true,
        sort_order: 2,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "faq_03",
        question: "¿Cuánto demora el envío y a qué zonas despachan?",
        answer: "Realizamos envíos a todo Chile continental. En la Región Metropolitana entregamos en 24-48 horas hábiles. En regiones el plazo es de 48 a 72 horas vía Starken y Blue Express.",
        active: true,
        sort_order: 3,
        created_at: isoNow,
        updated_at: isoNow,
      },
      {
        id: "faq_04",
        question: "¿Cuenta con certificación antidopaje?",
        answer: "Sí, cada lote es sometido a análisis de terceros independientes certificados bajo el estándar Informed-Choice y libre de sustancias prohibidas por la WADA.",
        active: true,
        sort_order: 4,
        created_at: isoNow,
        updated_at: isoNow,
      },
    ];

    this.banners = [
      {
        id: "ban_01",
        title: "LANZAMIENTO OFICIAL: 15% OFF",
        subtitle: "Usa el código KINETIC10 en el checkout para obtener 10% adicional más shaker de regalo.",
        image_url: "/assets/images/banner-promo.webp",
        button_text: "OBTENER OFERTA",
        button_url: "#oferta",
        start_date: isoNow,
        end_date: nextMonth,
        active: true,
        sort_order: 1,
        created_at: isoNow,
        updated_at: isoNow,
      },
    ];

    this.settings = {
      id: "settings_01",
      brand_name: "KINETIC Sports Nutrition",
      logo_url: "/assets/images/logo-kinetic.svg",
      favicon_url: "/favicon.ico",
      primary_color: "#a3e635",
      secondary_color: "#dc2626",
      whatsapp_number: "+56912345678",
      instagram_url: "https://instagram.com/kinetic.nutrition",
      tiktok_url: "https://tiktok.com/@kinetic.nutrition",
      facebook_url: "https://facebook.com/kinetic.nutrition",
      contact_email: "contacto@kineticnutrition.cl",
      shipping_information: "Envíos gratis en compras sobre $45.000 a todo Chile continental.",
      footer_text: "© 2025 KINETIC Sports Nutrition. Todos los derechos reservados. Suplementos alimentarios de grado farmacéutico.",
      privacy_policy: "https://kineticnutrition.cl/politicas-de-privacidad",
      terms_and_conditions: "https://kineticnutrition.cl/terminos-y-condiciones",
      seo_title: "KINETIC Sports Nutrition | Proteína Aislada CFM Premium",
      seo_description: "Desarrolla masa muscular magra y maximiza tu recuperación con PROTEIN X. 24g de proteína pura por servicio, 5.5g BCAAs, 0g de azúcar añadido. Despacho a todo Chile.",
      og_image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200&auto=format&fit=crop&q=80",
      created_at: isoNow,
      updated_at: isoNow,
    };
  }

  // ==========================================
  // PUBLIC STORE API ACCESSORS
  // ==========================================

  public async getActiveHero(): Promise<HeroContent | null> {
    if (!this.hero.active) return null;
    return this.hero;
  }

  public async getActiveBenefits(): Promise<LandingBenefit[]> {
    return this.benefits
      .filter((b) => b.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  public async getActiveTestimonials(): Promise<LandingTestimonial[]> {
    return this.testimonials
      .filter((t) => t.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  public async getActiveFAQs(): Promise<LandingFAQ[]> {
    return this.faqs
      .filter((f) => f.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  public async getActiveBanners(): Promise<LandingBanner[]> {
    const now = new Date().getTime();
    return this.banners
      .filter((b) => {
        if (!b.active) return false;
        const start = new Date(b.start_date).getTime();
        const end = new Date(b.end_date).getTime();
        return now >= start && now <= end;
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  public async getPublicSettings(): Promise<LandingSettings> {
    return this.settings;
  }

  // ==========================================
  // ADMIN API MUTATORS
  // ==========================================

  public async updateHero(data: Partial<HeroContent>): Promise<HeroContent> {
    this.hero = {
      ...this.hero,
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.hero;
  }

  public async updateSettings(data: Partial<LandingSettings>): Promise<LandingSettings> {
    this.settings = {
      ...this.settings,
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.settings;
  }

  public async createBenefit(data: Omit<LandingBenefit, "id" | "created_at" | "updated_at">): Promise<LandingBenefit> {
    const newBenefit: LandingBenefit = {
      ...data,
      id: `ben_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.benefits.push(newBenefit);
    return newBenefit;
  }

  public async updateBenefit(id: string, data: Partial<LandingBenefit>): Promise<LandingBenefit | null> {
    const index = this.benefits.findIndex((b) => b.id === id);
    if (index === -1) return null;
    this.benefits[index] = {
      ...this.benefits[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.benefits[index];
  }

  public async deleteBenefit(id: string): Promise<boolean> {
    const lenBefore = this.benefits.length;
    this.benefits = this.benefits.filter((b) => b.id !== id);
    return this.benefits.length < lenBefore;
  }

  public async createFAQ(data: Omit<LandingFAQ, "id" | "created_at" | "updated_at">): Promise<LandingFAQ> {
    const newFAQ: LandingFAQ = {
      ...data,
      id: `faq_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.faqs.push(newFAQ);
    return newFAQ;
  }

  public async updateFAQ(id: string, data: Partial<LandingFAQ>): Promise<LandingFAQ | null> {
    const index = this.faqs.findIndex((f) => f.id === id);
    if (index === -1) return null;
    this.faqs[index] = {
      ...this.faqs[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.faqs[index];
  }

  public async deleteFAQ(id: string): Promise<boolean> {
    const lenBefore = this.faqs.length;
    this.faqs = this.faqs.filter((f) => f.id !== id);
    return this.faqs.length < lenBefore;
  }

  public async createBanner(data: Omit<LandingBanner, "id" | "created_at" | "updated_at">): Promise<LandingBanner> {
    const newBanner: LandingBanner = {
      ...data,
      id: `ban_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.banners.push(newBanner);
    return newBanner;
  }

  public async updateBanner(id: string, data: Partial<LandingBanner>): Promise<LandingBanner | null> {
    const index = this.banners.findIndex((b) => b.id === id);
    if (index === -1) return null;
    this.banners[index] = {
      ...this.banners[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.banners[index];
  }

  public async deleteBanner(id: string): Promise<boolean> {
    const lenBefore = this.banners.length;
    this.banners = this.banners.filter((b) => b.id !== id);
    return this.banners.length < lenBefore;
  }
}

// Export singleton instance for immediate backend execution
export const landingServiceInstance = new LandingModuleService();
