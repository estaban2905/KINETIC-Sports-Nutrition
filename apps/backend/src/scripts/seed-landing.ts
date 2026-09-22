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
  if (existingHero) {
    logger.info("Landing content already seeded, skipping.")
    return
  }

  logger.info("Seeding landing content...")

  await landingModuleService.createHeroes({
    title: "POTENCIA PURA. RECUPERACIÓN TOTAL.",
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
    privacy_policy: "https://kineticnutrition.cl/politicas-de-privacidad",
    terms_and_conditions: "https://kineticnutrition.cl/terminos-y-condiciones",
    seo_title: "KINETIC Sports Nutrition | Proteína Aislada CFM Premium",
    seo_description:
      "Desarrolla masa muscular magra y maximiza tu recuperación con PROTEIN X. 24g de proteína pura por servicio, 5.5g BCAAs, 0g de azúcar añadido. Despacho a todo Chile.",
    og_image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200&auto=format&fit=crop&q=80",
  } as any)

  logger.info("Landing content seeded successfully.")
}
