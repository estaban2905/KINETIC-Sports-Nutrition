import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LANDING_MODULE } from "../modules/landing"
import type LandingModuleService from "../modules/landing/service"

export default async function seedLanding({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const landingModuleService: LandingModuleService = container.resolve(LANDING_MODULE)

  const [existingHero] = await landingModuleService.listHeroes({}, { take: 1 })
  if (!existingHero) {
    logger.info("Seeding landing content...")

    await landingModuleService.createHeroes({
      title: "CONVIERTE TU ENTRENAMIENTO EN",
      headline_highlight: "RESULTADOS",
      subtitle:
        "PROTEIN X: La máxima pureza en aislado de suero de leche microfiltrado CFM con 24g de proteína, 5.5g de BCAAs y 0g de azúcar añadido por porción.",
      badge: "NUEVA FÓRMULA CFM 2025",
      primary_cta_text: "COMPRAR AHORA",
      primary_cta_url: "#producto",
      secondary_cta_text: "VER BENEFICIOS",
      secondary_cta_url: "#beneficios",
      image_url: "/assets/images/protein-tub.webp",
      mobile_image_url: "/assets/images/protein-tub-mobile.webp",
      active: true,
      sort_order: 1,
    } as any)
  } else if (!existingHero.headline_highlight) {
    // Backfills the headline that Hero.tsx used to hardcode, now that it
    // reads title/headline_highlight from this row — keeps the storefront
    // headline unchanged for installs seeded before these columns existed.
    await landingModuleService.updateHeroes({
      id: existingHero.id,
      title: "CONVIERTE TU ENTRENAMIENTO EN",
      headline_highlight: "RESULTADOS",
    } as any)
    logger.info("Backfilled landing_hero headline fields.")
  }

  const [existingTrustBadge] = await landingModuleService.listTrustBadges({}, { take: 1 })
  if (!existingTrustBadge) {
    await landingModuleService.createTrustBadges([
      { text: "24g Proteína Pura", active: true, sort_order: 1 },
      { text: "0g Azúcar Añadida", active: true, sort_order: 2 },
      { text: "5.5g BCAAs Reales", active: true, sort_order: 3 },
      { text: "Sin Grumos / CFM", active: true, sort_order: 4 },
    ] as any)
  }

  const [existingFinalCta] = await landingModuleService.listFinalCtas({}, { take: 1 })
  if (!existingFinalCta) {
    await landingModuleService.createFinalCtas({
      badge_text: "MÁXIMA CALIDAD COMPROBADA",
      headline: "¿LISTO PARA SUBIR DE",
      headline_highlight: "NIVEL?",
      subtext:
        "Equipa tu entrenamiento con productos diseñados para acompañar tus objetivos. Sin rellenos, sin compromisos.",
      guarantee_text: "Garantía de Satisfacción 30 Días",
      cta_text: "COMPRAR AHORA",
    } as any)
  }

  const [existingProductSection] = await landingModuleService.listProductSections({}, { take: 1 })
  if (!existingProductSection) {
    await landingModuleService.createProductSections({
      eyebrow: "PRODUCTO PRINCIPAL",
      headline: "PROTEÍNA PREMIUM",
      tagline: "Construida para quienes entrenan con un objetivo.",
      micro_label: "KINETIC PERFORMANCE // CFM SERIES",
      formula_heading: "Aislamiento por Flujo Cruzado (CFM)",
      advantages_heading: "Ventajas Clave",
    } as any)
  }

  const [existingGuarantee] = await landingModuleService.listGuarantees({}, { take: 1 })
  if (!existingGuarantee) {
    await landingModuleService.createGuarantees([
      { icon: "Truck", title: "Envío Rápido", subtitle: "24-48 hrs hábiles", context: "product_section", active: true, sort_order: 1 },
      { icon: "ShieldCheck", title: "Pago Seguro", subtitle: "Encriptación SSL", context: "product_section", active: true, sort_order: 2 },
      { icon: "RefreshCw", title: "Satisfacción", subtitle: "100% Garantizada", context: "product_section", active: true, sort_order: 3 },
    ] as any)
  }

  const [existingUsageTip] = await landingModuleService.listUsageTips({}, { take: 1 })
  if (!existingUsageTip) {
    await landingModuleService.createUsageTips([
      {
        title: "Post-Entrenamiento",
        body: "Tomar dentro de los 30-45 minutos posteriores a finalizar el entrenamiento para optimizar la síntesis proteica muscular.",
        active: true,
        sort_order: 1,
      },
      {
        title: "En el Desayuno",
        body: "Ideal para romper el ayuno nocturno con una fuente de aminoácidos limpia de absorción inmediata.",
        active: true,
        sort_order: 2,
      },
      {
        title: "Preparación",
        body: "Disolver 1 scoop (30g) en 250ml de agua fría o leche vegetal en tu shaker durante 10 segundos.",
        active: true,
        sort_order: 3,
      },
    ] as any)
  }

  const [existingNavLink] = await landingModuleService.listNavLinks({}, { take: 1 })
  if (!existingNavLink) {
    await landingModuleService.createNavLinks([
      { label: "Productos", url: "#productos", group: "navbar", active: true, sort_order: 1 },
      { label: "Beneficios", url: "#beneficios", group: "navbar", active: true, sort_order: 2 },
      { label: "Nosotros", url: "#experiencia", group: "navbar", active: true, sort_order: 3 },
      { label: "FAQ", url: "#faq", group: "navbar", active: true, sort_order: 4 },

      { label: "KINETIC Iso-Whey Pro", url: "#producto", group: "footer_productos", active: true, sort_order: 1 },
      { label: "Creatina Creapure®", url: "#productos", group: "footer_productos", active: true, sort_order: 2 },
      { label: "Pre-Workout Nitro", url: "#productos", group: "footer_productos", active: true, sort_order: 3 },
      { label: "Shaker Pro Steel", url: "#productos", group: "footer_productos", active: true, sort_order: 4 },
      { label: "Barras Proteicas", url: "#productos", group: "footer_productos", active: true, sort_order: 5 },

      { label: "Preguntas Frecuentes", url: "#faq", group: "footer_soporte", active: true, sort_order: 1 },
      { label: "Modo de Preparación", url: "#beneficios", group: "footer_soporte", active: true, sort_order: 2 },
      { label: "Políticas de Envíos", url: "#faq", group: "footer_soporte", active: true, sort_order: 3 },
      { label: "Medios de Pago", url: "#faq", group: "footer_soporte", active: true, sort_order: 4 },

      { label: "Garantía de Satisfacción", url: "#", group: "footer_legal", active: true, sort_order: 1 },
      { label: "Políticas de Devolución", url: "#", group: "footer_legal", active: true, sort_order: 2 },
    ] as any)
  }

  const [existingBenefit] = await landingModuleService.listBenefits({}, { take: 1 })
  if (existingBenefit) {
    const [existingBannerRow] = await landingModuleService.listBanners({}, { take: 1 })
    if (existingBannerRow && !existingBannerRow.tag) {
      await landingModuleService.updateBanners({
        id: existingBannerRow.id,
        tag: "VENTA RELÁMPAGO // 20% OFF INMEDIATO",
      } as any)
    }

    const [existingSettingsRow] = await landingModuleService.listSettings({}, { take: 1 })
    if (existingSettingsRow && !existingSettingsRow.whatsapp_message_template) {
      await landingModuleService.updateSettings({
        id: existingSettingsRow.id,
        footer_description:
          "Nutrición deportiva diseñada con precisión científica para atletas y personas comprometidas con su máximo rendimiento físico.",
        whatsapp_message_template:
          "¡Hola! Me gustaría hacer una consulta sobre la Proteína Premium KINETIC y los envíos.",
        whatsapp_tooltip_text: "¿Dudas con tu suplementación? Chatea con un asesor",
        offer_fallback_headline: "TU PRÓXIMO ENTRENAMIENTO EMPIEZA AQUÍ",
      } as any)
    }

    logger.info("Landing benefits/testimonials/faq already seeded, skipping those.")
    return
  }

  await landingModuleService.createBenefits([
    {
      icon: "Dumbbell",
      title: "ALTO CONTENIDO DE PROTEÍNA",
      stat: "24g",
      stat_label: "por servicio",
      description:
        "Aislado de suero de leche obtenido mediante ultrafiltración CFM para asegurar la máxima pureza sin desnaturalizar los aminoácidos esenciales.",
      active: true,
      sort_order: 1,
    },
    {
      icon: "Zap",
      title: "APOYO AL RENDIMIENTO",
      stat: "5.5g",
      stat_label: "BCAAs naturales",
      description:
        "Perfil de aminoácidos con alta concentración de Leucina que estimula la ruta mTOR y promueve el anabolismo muscular en cada sesión.",
      active: true,
      sort_order: 2,
    },
    {
      icon: "RotateCcw",
      title: "RECUPERACIÓN POST-ENTRENAMIENTO",
      stat: "< 20min",
      stat_label: "tiempo de asimilación",
      description:
        "La absorción acelerada suministra nutrientes inmediatamente al torrente sanguíneo para reparar micro-roturas musculares tras el esfuerzo.",
      active: true,
      sort_order: 3,
    },
    {
      icon: "Sparkles",
      title: "GRAN SABOR Y FÁCIL PREPARACIÓN",
      stat: "100%",
      stat_label: "disolución instantánea",
      description:
        "Microencapsulada para mezclarse en segundos en agua fría o leche vegetal sin batidora ni grumos, con sabores gourmet equilibrados.",
      active: true,
      sort_order: 4,
    },
  ] as any)

  await landingModuleService.createTestimonials([
    {
      customer_name: "Matías Silva",
      customer_image:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=75",
      role: "Atleta de Fuerza & Crossfit",
      content:
        "Excelente sabor y muy fácil de preparar. Se disuelve en segundos en el shaker sin dejar absolutamente ningún grumo.",
      rating: 5,
      product_purchased: "KINETIC ISO-WHEY PRO (Doble Chocolate)",
      verified: true,
      active: true,
      sort_order: 1,
      is_demo: true,
    },
    {
      customer_name: "Valentina Morales",
      customer_image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=75",
      role: "Corredora & Entrenadora Funcional",
      content:
        "Me gusta mucho para después de entrenar. La digestión es súper ligera, no genera pesadez y la recuperación al día siguiente es notable.",
      rating: 5,
      product_purchased: "KINETIC ISO-WHEY PRO (Vainilla Bourbon)",
      verified: true,
      active: true,
      sort_order: 2,
      is_demo: true,
    },
    {
      customer_name: "Rodrigo Araya",
      customer_image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=75",
      role: "Practicante de Halterofilia",
      content:
        "La calidad de los ingredientes y el porcentaje de proteína real por servicio están en el estándar más alto. El shaker de acero inoxidable también es una joya.",
      rating: 5,
      product_purchased: "KINETIC ISO-WHEY PRO + Shaker Pro Steel",
      verified: true,
      active: true,
      sort_order: 3,
      is_demo: true,
    },
  ] as any)

  await landingModuleService.createFaqs([
    {
      question: "¿Cómo se prepara?",
      answer:
        "Mezcla 1 scoop (aproximadamente 30 gramos) en 250 a 300 ml de agua fría, leche descremada o tu bebida vegetal favorita. Agita vigorosamente en tu shaker durante 10 a 15 segundos. Su formulación microfiltrada se disuelve al instante sin requerir licuadora.",
      category: "Uso",
      active: true,
      sort_order: 1,
    },
    {
      question: "¿Cuántas porciones contiene?",
      answer:
        "El envase Pro de 2.0 kg contiene 66 porciones completas de 30 gramos cada una. La presentación estándar de 900 gramos rinde 30 porciones.",
      category: "Producto",
      active: true,
      sort_order: 2,
    },
    {
      question: "¿Qué sabores están disponibles?",
      answer:
        "Actualmente disponemos de 4 perfiles de sabor premium: Doble Chocolate Suizo, Vainilla Bourbon Cream, Cookies & Cream Crunch y Frutilla Silvestre. Todos desarrollados sin azúcares añadidos.",
      category: "Producto",
      active: true,
      sort_order: 3,
    },
    {
      question: "¿Cómo se realiza el envío?",
      answer:
        "Realizamos envíos asegurados a todo el país mediante couriers de alta velocidad con seguimiento en tiempo real vía código de rastreo que recibes en tu correo electrónico y WhatsApp.",
      category: "Envíos",
      active: true,
      sort_order: 4,
    },
    {
      question: "¿Cuánto demora el despacho?",
      answer:
        "Los pedidos despachados en la Región Metropolitana llegan en 24 a 48 horas hábiles. Para regiones, el plazo habitual es de 48 a 72 horas hábiles.",
      category: "Envíos",
      active: true,
      sort_order: 5,
    },
    {
      question: "¿Qué métodos de pago aceptan?",
      answer:
        "Aceptamos Tarjetas de Crédito y Débito (Visa, Mastercard, American Express), Webpay Plus, Mercado Pago, transferencias bancarias directas y hasta 3 cuotas sin interés.",
      category: "Pagos",
      active: true,
      sort_order: 6,
    },
  ] as any)

  const now = new Date()
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await landingModuleService.createBanners({
    title: "LANZAMIENTO OFICIAL: 15% OFF",
    subtitle: "Usa el código KINETIC10 en el checkout para obtener 10% adicional más shaker de regalo.",
    tag: "VENTA RELÁMPAGO // 20% OFF INMEDIATO",
    image_url: "/assets/images/banner-promo.webp",
    button_text: "OBTENER OFERTA",
    button_url: "#oferta",
    start_date: now,
    end_date: nextMonth,
    active: true,
    sort_order: 1,
  } as any)

  await landingModuleService.createSettings({
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
    footer_text:
      "© 2025 KINETIC Sports Nutrition. Todos los derechos reservados. Suplementos alimentarios de grado farmacéutico.",
    footer_description:
      "Nutrición deportiva diseñada con precisión científica para atletas y personas comprometidas con su máximo rendimiento físico.",
    privacy_policy: "https://kineticnutrition.cl/politicas-de-privacidad",
    terms_and_conditions: "https://kineticnutrition.cl/terminos-y-condiciones",
    seo_title: "KINETIC Sports Nutrition | Proteína Aislada CFM Premium",
    seo_description:
      "Desarrolla masa muscular magra y maximiza tu recuperación con PROTEIN X. 24g de proteína pura por servicio, 5.5g BCAAs, 0g de azúcar añadido. Despacho a todo Chile.",
    og_image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200&auto=format&fit=crop&q=80",
    whatsapp_message_template:
      "¡Hola! Me gustaría hacer una consulta sobre la Proteína Premium KINETIC y los envíos.",
    whatsapp_tooltip_text: "¿Dudas con tu suplementación? Chatea con un asesor",
    offer_fallback_headline: "TU PRÓXIMO ENTRENAMIENTO EMPIEZA AQUÍ",
  } as any)

  logger.info("Landing content seeded successfully.")
}
