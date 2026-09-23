import { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Newspaper } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { Trash } from "@medusajs/icons"

type Hero = {
  id?: string
  title: string
  headline_highlight: string
  subtitle: string
  badge: string
  primary_cta_text: string
  primary_cta_url: string
  secondary_cta_text: string
  secondary_cta_url: string
  image_url: string
  mobile_image_url: string
  active: boolean
}

type Settings = {
  id?: string
  brand_name: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  whatsapp_number: string
  instagram_url: string
  tiktok_url: string
  facebook_url: string
  contact_email: string
  shipping_information: string
  footer_text: string
  footer_description: string
  privacy_policy: string
  terms_and_conditions: string
  seo_title: string
  seo_description: string
  og_image: string
  whatsapp_message_template: string
  whatsapp_tooltip_text: string
  offer_fallback_headline: string
  offer_fallback_subtitle: string
}

type Benefit = {
  id: string
  icon: string
  title: string
  description: string
  stat: string
  stat_label: string
  sort_order: number
}

type Faq = {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
}

type Banner = {
  id: string
  title: string
  subtitle: string
  tag: string
  button_text: string
  start_date: string
  end_date: string
  sort_order: number
}

type Testimonial = {
  id: string
  customer_name: string
  customer_image: string
  role: string
  content: string
  rating: number
  product_purchased: string
  verified: boolean
  sort_order: number
}

type TrustBadge = {
  id: string
  icon: string
  text: string
  sort_order: number
}

type FinalCta = {
  id?: string
  badge_text: string
  headline: string
  headline_highlight: string
  subtext: string
  guarantee_text: string
  cta_text: string
}

type ProductSectionContent = {
  id?: string
  eyebrow: string
  headline: string
  tagline: string
  micro_label: string
  formula_heading: string
  advantages_heading: string
}

type Guarantee = {
  id: string
  icon: string
  title: string
  subtitle: string
  sort_order: number
}

type UsageTip = {
  id: string
  title: string
  body: string
  sort_order: number
}

type NavLink = {
  id: string
  label: string
  url: string
  group: string
  sort_order: number
}

const NAV_LINK_GROUPS = [
  { value: "navbar", label: "Navbar" },
  { value: "footer_productos", label: "Footer · Productos" },
  { value: "footer_soporte", label: "Footer · Soporte" },
  { value: "footer_legal", label: "Footer · Legal" },
]

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/admin/landing${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`)
  }
  return res.json()
}

const emptyBenefit = { icon: "Zap", title: "", description: "", stat: "", stat_label: "" }
const emptyFaq = { question: "", answer: "", category: "" }
const emptyTestimonial = {
  customer_name: "",
  role: "",
  content: "",
  rating: 5,
  product_purchased: "",
  verified: true,
}
const emptyBanner = {
  title: "",
  subtitle: "",
  tag: "",
  image_url: "",
  button_text: "Ver Oferta",
  button_url: "#oferta",
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}
const emptyTrustBadge = { icon: "", text: "" }
const emptyGuarantee = { icon: "ShieldCheck", title: "", subtitle: "", context: "product_section" }
const emptyUsageTip = { title: "", body: "" }
const emptyNavLink = { label: "", url: "", group: "navbar" }

const LandingContentPage = () => {
  const [hero, setHero] = useState<Hero | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([])
  const [finalCta, setFinalCta] = useState<FinalCta | null>(null)
  const [productSection, setProductSection] = useState<ProductSectionContent | null>(null)
  const [guarantees, setGuarantees] = useState<Guarantee[]>([])
  const [usageTips, setUsageTips] = useState<UsageTip[]>([])
  const [navLinks, setNavLinks] = useState<NavLink[]>([])
  const [loading, setLoading] = useState(true)
  const [newBenefit, setNewBenefit] = useState(emptyBenefit)
  const [newFaq, setNewFaq] = useState(emptyFaq)
  const [newBanner, setNewBanner] = useState(emptyBanner)
  const [newTestimonial, setNewTestimonial] = useState(emptyTestimonial)
  const [newTrustBadge, setNewTrustBadge] = useState(emptyTrustBadge)
  const [newGuarantee, setNewGuarantee] = useState(emptyGuarantee)
  const [newUsageTip, setNewUsageTip] = useState(emptyUsageTip)
  const [newNavLink, setNewNavLink] = useState(emptyNavLink)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [
        heroRes,
        settingsRes,
        benefitsRes,
        faqRes,
        bannersRes,
        testimonialsRes,
        trustBadgesRes,
        finalCtaRes,
        productSectionRes,
        guaranteesRes,
        usageTipsRes,
        navLinksRes,
      ] = await Promise.all([
        api<{ hero: Hero | null }>("/hero"),
        api<{ settings: Settings | null }>("/settings"),
        api<{ benefits: Benefit[] }>("/benefits"),
        api<{ faq: Faq[] }>("/faq"),
        api<{ banners: Banner[] }>("/banners"),
        api<{ testimonials: Testimonial[] }>("/testimonials"),
        api<{ trust_badges: TrustBadge[] }>("/trust-badges"),
        api<{ final_cta: FinalCta | null }>("/final-cta"),
        api<{ product_section: ProductSectionContent | null }>("/product-section"),
        api<{ guarantees: Guarantee[] }>("/guarantees"),
        api<{ usage_tips: UsageTip[] }>("/usage-tips"),
        api<{ nav_links: NavLink[] }>("/nav-links"),
      ])
      setHero(heroRes.hero)
      setSettings(settingsRes.settings)
      setBenefits(benefitsRes.benefits)
      setFaqs(faqRes.faq)
      setBanners(bannersRes.banners)
      setTestimonials(testimonialsRes.testimonials)
      setTrustBadges(trustBadgesRes.trust_badges)
      setFinalCta(finalCtaRes.final_cta)
      setProductSection(productSectionRes.product_section)
      setGuarantees(guaranteesRes.guarantees)
      setUsageTips(usageTipsRes.usage_tips)
      setNavLinks(navLinksRes.nav_links)
    } catch (err) {
      toast.error("No se pudo cargar el contenido de la landing.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const saveHero = async () => {
    if (!hero) return
    try {
      await api("/hero", { method: "POST", body: JSON.stringify(hero) })
      toast.success("Hero actualizado.")
    } catch {
      toast.error("No se pudo guardar el Hero.")
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    try {
      await api("/settings", { method: "POST", body: JSON.stringify(settings) })
      toast.success("Configuración de marca actualizada.")
    } catch {
      toast.error("No se pudo guardar la configuración.")
    }
  }

  const saveFinalCta = async () => {
    if (!finalCta) return
    try {
      await api("/final-cta", { method: "POST", body: JSON.stringify(finalCta) })
      toast.success("CTA Final actualizado.")
    } catch {
      toast.error("No se pudo guardar el CTA Final.")
    }
  }

  const saveProductSection = async () => {
    if (!productSection) return
    try {
      await api("/product-section", { method: "POST", body: JSON.stringify(productSection) })
      toast.success("Sección de Producto actualizada.")
    } catch {
      toast.error("No se pudo guardar la Sección de Producto.")
    }
  }

  const addBenefit = async () => {
    if (!newBenefit.title.trim()) return
    try {
      await api("/benefits", {
        method: "POST",
        body: JSON.stringify({ ...newBenefit, active: true, sort_order: benefits.length + 1 }),
      })
      setNewBenefit(emptyBenefit)
      loadAll()
      toast.success("Beneficio agregado.")
    } catch {
      toast.error("No se pudo crear el beneficio.")
    }
  }

  const updateBenefit = async (b: Benefit) => {
    try {
      await api(`/benefits/${b.id}`, { method: "PUT", body: JSON.stringify(b) })
      toast.success("Beneficio guardado.")
    } catch {
      toast.error("No se pudo guardar el beneficio.")
    }
  }

  const deleteBenefit = async (id: string) => {
    try {
      await api(`/benefits/${id}`, { method: "DELETE" })
      setBenefits((prev) => prev.filter((b) => b.id !== id))
    } catch {
      toast.error("No se pudo eliminar el beneficio.")
    }
  }

  const addFaq = async () => {
    if (!newFaq.question.trim()) return
    try {
      await api("/faq", {
        method: "POST",
        body: JSON.stringify({ ...newFaq, active: true, sort_order: faqs.length + 1 }),
      })
      setNewFaq(emptyFaq)
      loadAll()
      toast.success("Pregunta agregada.")
    } catch {
      toast.error("No se pudo crear la pregunta.")
    }
  }

  const updateFaq = async (f: Faq) => {
    try {
      await api(`/faq/${f.id}`, { method: "PUT", body: JSON.stringify(f) })
      toast.success("Pregunta guardada.")
    } catch {
      toast.error("No se pudo guardar la pregunta.")
    }
  }

  const deleteFaq = async (id: string) => {
    try {
      await api(`/faq/${id}`, { method: "DELETE" })
      setFaqs((prev) => prev.filter((f) => f.id !== id))
    } catch {
      toast.error("No se pudo eliminar la pregunta.")
    }
  }

  const addBanner = async () => {
    if (!newBanner.title.trim()) return
    try {
      await api("/banners", {
        method: "POST",
        body: JSON.stringify({ ...newBanner, active: true, sort_order: banners.length + 1 }),
      })
      setNewBanner(emptyBanner)
      loadAll()
      toast.success("Banner agregado.")
    } catch {
      toast.error("No se pudo crear el banner.")
    }
  }

  const updateBanner = async (b: Banner) => {
    try {
      await api(`/banners/${b.id}`, { method: "PUT", body: JSON.stringify(b) })
      toast.success("Banner guardado.")
    } catch {
      toast.error("No se pudo guardar el banner.")
    }
  }

  const deleteBanner = async (id: string) => {
    try {
      await api(`/banners/${id}`, { method: "DELETE" })
      setBanners((prev) => prev.filter((b) => b.id !== id))
    } catch {
      toast.error("No se pudo eliminar el banner.")
    }
  }

  const addTestimonial = async () => {
    if (!newTestimonial.customer_name.trim() || !newTestimonial.content.trim()) return
    try {
      await api("/testimonials", {
        method: "POST",
        body: JSON.stringify({
          ...newTestimonial,
          active: true,
          sort_order: testimonials.length + 1,
        }),
      })
      setNewTestimonial(emptyTestimonial)
      loadAll()
      toast.success("Testimonio agregado.")
    } catch {
      toast.error("No se pudo crear el testimonio.")
    }
  }

  const updateTestimonial = async (t: Testimonial) => {
    try {
      await api(`/testimonials/${t.id}`, { method: "PUT", body: JSON.stringify(t) })
      toast.success("Testimonio guardado.")
    } catch {
      toast.error("No se pudo guardar el testimonio.")
    }
  }

  const deleteTestimonial = async (id: string) => {
    try {
      await api(`/testimonials/${id}`, { method: "DELETE" })
      setTestimonials((prev) => prev.filter((t) => t.id !== id))
    } catch {
      toast.error("No se pudo eliminar el testimonio.")
    }
  }

  const addTrustBadge = async () => {
    if (!newTrustBadge.text.trim()) return
    try {
      await api("/trust-badges", {
        method: "POST",
        body: JSON.stringify({ ...newTrustBadge, active: true, sort_order: trustBadges.length + 1 }),
      })
      setNewTrustBadge(emptyTrustBadge)
      loadAll()
      toast.success("Chip de confianza agregado.")
    } catch {
      toast.error("No se pudo crear el chip de confianza.")
    }
  }

  const updateTrustBadge = async (tb: TrustBadge) => {
    try {
      await api(`/trust-badges/${tb.id}`, { method: "PUT", body: JSON.stringify(tb) })
      toast.success("Chip de confianza guardado.")
    } catch {
      toast.error("No se pudo guardar el chip de confianza.")
    }
  }

  const deleteTrustBadge = async (id: string) => {
    try {
      await api(`/trust-badges/${id}`, { method: "DELETE" })
      setTrustBadges((prev) => prev.filter((tb) => tb.id !== id))
    } catch {
      toast.error("No se pudo eliminar el chip de confianza.")
    }
  }

  const addGuarantee = async () => {
    if (!newGuarantee.title.trim()) return
    try {
      await api("/guarantees", {
        method: "POST",
        body: JSON.stringify({ ...newGuarantee, active: true, sort_order: guarantees.length + 1 }),
      })
      setNewGuarantee(emptyGuarantee)
      loadAll()
      toast.success("Garantía agregada.")
    } catch {
      toast.error("No se pudo crear la garantía.")
    }
  }

  const updateGuarantee = async (g: Guarantee) => {
    try {
      await api(`/guarantees/${g.id}`, { method: "PUT", body: JSON.stringify(g) })
      toast.success("Garantía guardada.")
    } catch {
      toast.error("No se pudo guardar la garantía.")
    }
  }

  const deleteGuarantee = async (id: string) => {
    try {
      await api(`/guarantees/${id}`, { method: "DELETE" })
      setGuarantees((prev) => prev.filter((g) => g.id !== id))
    } catch {
      toast.error("No se pudo eliminar la garantía.")
    }
  }

  const addUsageTip = async () => {
    if (!newUsageTip.title.trim()) return
    try {
      await api("/usage-tips", {
        method: "POST",
        body: JSON.stringify({ ...newUsageTip, active: true, sort_order: usageTips.length + 1 }),
      })
      setNewUsageTip(emptyUsageTip)
      loadAll()
      toast.success("Tip de uso agregado.")
    } catch {
      toast.error("No se pudo crear el tip de uso.")
    }
  }

  const updateUsageTip = async (ut: UsageTip) => {
    try {
      await api(`/usage-tips/${ut.id}`, { method: "PUT", body: JSON.stringify(ut) })
      toast.success("Tip de uso guardado.")
    } catch {
      toast.error("No se pudo guardar el tip de uso.")
    }
  }

  const deleteUsageTip = async (id: string) => {
    try {
      await api(`/usage-tips/${id}`, { method: "DELETE" })
      setUsageTips((prev) => prev.filter((ut) => ut.id !== id))
    } catch {
      toast.error("No se pudo eliminar el tip de uso.")
    }
  }

  const addNavLink = async () => {
    if (!newNavLink.label.trim()) return
    try {
      await api("/nav-links", {
        method: "POST",
        body: JSON.stringify({ ...newNavLink, active: true, sort_order: navLinks.length + 1 }),
      })
      setNewNavLink(emptyNavLink)
      loadAll()
      toast.success("Link agregado.")
    } catch {
      toast.error("No se pudo crear el link.")
    }
  }

  const updateNavLink = async (nl: NavLink) => {
    try {
      await api(`/nav-links/${nl.id}`, { method: "PUT", body: JSON.stringify(nl) })
      toast.success("Link guardado.")
    } catch {
      toast.error("No se pudo guardar el link.")
    }
  }

  const deleteNavLink = async (id: string) => {
    try {
      await api(`/nav-links/${id}`, { method: "DELETE" })
      setNavLinks((prev) => prev.filter((nl) => nl.id !== id))
    } catch {
      toast.error("No se pudo eliminar el link.")
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <Text>Cargando contenido de la landing...</Text>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Landing Content</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Gestión de contenido de marketing consumido por la landing pública vía{" "}
          <code>/store/landing/*</code>. El comercio (productos, stock, pedidos) vive en el resto del
          Admin.
        </Text>
      </div>

      <Tabs defaultValue="hero" className="px-6 py-4">
        <Tabs.List>
          <Tabs.Trigger value="hero">Hero</Tabs.Trigger>
          <Tabs.Trigger value="benefits">Beneficios</Tabs.Trigger>
          <Tabs.Trigger value="testimonials">Testimonios</Tabs.Trigger>
          <Tabs.Trigger value="faq">FAQ</Tabs.Trigger>
          <Tabs.Trigger value="banners">Banners</Tabs.Trigger>
          <Tabs.Trigger value="product-section">Sección Producto</Tabs.Trigger>
          <Tabs.Trigger value="final-cta">CTA Final</Tabs.Trigger>
          <Tabs.Trigger value="nav-links">Navbar & Footer</Tabs.Trigger>
          <Tabs.Trigger value="settings">Marca & SEO</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="hero" className="pt-4">
          {hero && (
            <div className="flex max-w-2xl flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Título Principal</Label>
                  <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} />
                </div>
                <div className="flex-1">
                  <Label size="small">Título Destacado (gradiente)</Label>
                  <Input
                    value={hero.headline_highlight}
                    onChange={(e) => setHero({ ...hero, headline_highlight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label size="small">Insignia (Badge)</Label>
                <Input value={hero.badge} onChange={(e) => setHero({ ...hero, badge: e.target.value })} />
              </div>
              <div>
                <Label size="small">Subtítulo</Label>
                <Textarea
                  rows={3}
                  value={hero.subtitle}
                  onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">CTA Principal (texto)</Label>
                  <Input
                    value={hero.primary_cta_text}
                    onChange={(e) => setHero({ ...hero, primary_cta_text: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">CTA Principal (url)</Label>
                  <Input
                    value={hero.primary_cta_url}
                    onChange={(e) => setHero({ ...hero, primary_cta_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">CTA Secundario (texto)</Label>
                  <Input
                    value={hero.secondary_cta_text}
                    onChange={(e) => setHero({ ...hero, secondary_cta_text: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">CTA Secundario (url)</Label>
                  <Input
                    value={hero.secondary_cta_url}
                    onChange={(e) => setHero({ ...hero, secondary_cta_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Imagen (desktop)</Label>
                  <Input
                    value={hero.image_url}
                    onChange={(e) => setHero({ ...hero, image_url: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Imagen (mobile)</Label>
                  <Input
                    value={hero.mobile_image_url}
                    onChange={(e) => setHero({ ...hero, mobile_image_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={hero.active} onCheckedChange={(v) => setHero({ ...hero, active: v })} />
                <Label size="small">Sección activa en la landing</Label>
              </div>
              <div>
                <Button onClick={saveHero}>Guardar Hero</Button>
              </div>

              <div className="mt-4 border-t pt-4">
                <Text weight="plus" size="small">Chips de confianza</Text>
                <div className="mt-3 flex flex-col gap-3">
                  {trustBadges.map((tb, idx) => (
                    <div key={tb.id} className="flex items-center gap-2 rounded-lg border p-2">
                      <Input
                        value={tb.text}
                        onChange={(e) => {
                          const next = [...trustBadges]
                          next[idx] = { ...tb, text: e.target.value }
                          setTrustBadges(next)
                        }}
                      />
                      <Button size="small" variant="secondary" onClick={() => updateTrustBadge(trustBadges[idx])}>
                        Guardar
                      </Button>
                      <IconButton onClick={() => deleteTrustBadge(tb.id)}>
                        <Trash />
                      </IconButton>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-2">
                    <Input
                      placeholder="Ej: 24g Proteína Pura"
                      value={newTrustBadge.text}
                      onChange={(e) => setNewTrustBadge({ ...newTrustBadge, text: e.target.value })}
                    />
                    <Button size="small" onClick={addTrustBadge}>Agregar</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="benefits" className="flex flex-col gap-4 pt-4">
          {benefits.map((b, idx) => (
            <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex gap-3">
                <Input
                  placeholder="Título"
                  value={b.title}
                  onChange={(e) => {
                    const next = [...benefits]
                    next[idx] = { ...b, title: e.target.value }
                    setBenefits(next)
                  }}
                />
                <Input
                  placeholder="Stat"
                  value={b.stat}
                  onChange={(e) => {
                    const next = [...benefits]
                    next[idx] = { ...b, stat: e.target.value }
                    setBenefits(next)
                  }}
                />
              </div>
              <Textarea
                rows={2}
                value={b.description}
                onChange={(e) => {
                  const next = [...benefits]
                  next[idx] = { ...b, description: e.target.value }
                  setBenefits(next)
                }}
              />
              <div className="flex justify-end gap-2">
                <Button size="small" variant="secondary" onClick={() => updateBenefit(benefits[idx])}>
                  Guardar
                </Button>
                <IconButton onClick={() => deleteBenefit(b.id)}>
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
            <Text weight="plus" size="small">Nuevo beneficio</Text>
            <Input
              placeholder="Título"
              value={newBenefit.title}
              onChange={(e) => setNewBenefit({ ...newBenefit, title: e.target.value })}
            />
            <Textarea
              placeholder="Descripción"
              rows={2}
              value={newBenefit.description}
              onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
            />
            <div className="flex gap-3">
              <Input
                placeholder="Stat (ej: 24g)"
                value={newBenefit.stat}
                onChange={(e) => setNewBenefit({ ...newBenefit, stat: e.target.value })}
              />
              <Input
                placeholder="Etiqueta (ej: por servicio)"
                value={newBenefit.stat_label}
                onChange={(e) => setNewBenefit({ ...newBenefit, stat_label: e.target.value })}
              />
            </div>
            <div>
              <Button size="small" onClick={addBenefit}>Agregar</Button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="testimonials" className="flex flex-col gap-4 pt-4">
          {testimonials.map((t, idx) => (
            <div key={t.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex gap-3">
                <Input
                  placeholder="Nombre"
                  value={t.customer_name}
                  onChange={(e) => {
                    const next = [...testimonials]
                    next[idx] = { ...t, customer_name: e.target.value }
                    setTestimonials(next)
                  }}
                />
                <Input
                  placeholder="Rol"
                  value={t.role}
                  onChange={(e) => {
                    const next = [...testimonials]
                    next[idx] = { ...t, role: e.target.value }
                    setTestimonials(next)
                  }}
                />
                {t.verified && <Badge color="green">Verificado</Badge>}
              </div>
              <Textarea
                rows={2}
                value={t.content}
                onChange={(e) => {
                  const next = [...testimonials]
                  next[idx] = { ...t, content: e.target.value }
                  setTestimonials(next)
                }}
              />
              <div className="flex justify-end gap-2">
                <Button size="small" variant="secondary" onClick={() => updateTestimonial(testimonials[idx])}>
                  Guardar
                </Button>
                <IconButton onClick={() => deleteTestimonial(t.id)}>
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
            <Text weight="plus" size="small">Nuevo testimonio</Text>
            <div className="flex gap-3">
              <Input
                placeholder="Nombre del cliente"
                value={newTestimonial.customer_name}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, customer_name: e.target.value })}
              />
              <Input
                placeholder="Rol (ej: Atleta de Fuerza)"
                value={newTestimonial.role}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, role: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Comentario"
              rows={2}
              value={newTestimonial.content}
              onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}
            />
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label size="small">Rating (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={newTestimonial.rating}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: Number(e.target.value) })}
                />
              </div>
              <Input
                placeholder="Producto comprado"
                value={newTestimonial.product_purchased}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, product_purchased: e.target.value })}
              />
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={newTestimonial.verified}
                  onCheckedChange={(v) => setNewTestimonial({ ...newTestimonial, verified: v })}
                />
                <Label size="small">Verificado</Label>
              </div>
            </div>
            <div>
              <Button size="small" onClick={addTestimonial}>Agregar</Button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="faq" className="flex flex-col gap-4 pt-4">
          {faqs.map((f, idx) => (
            <div key={f.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <Input
                placeholder="Pregunta"
                value={f.question}
                onChange={(e) => {
                  const next = [...faqs]
                  next[idx] = { ...f, question: e.target.value }
                  setFaqs(next)
                }}
              />
              <Textarea
                rows={2}
                value={f.answer}
                onChange={(e) => {
                  const next = [...faqs]
                  next[idx] = { ...f, answer: e.target.value }
                  setFaqs(next)
                }}
              />
              <div className="flex justify-end gap-2">
                <Button size="small" variant="secondary" onClick={() => updateFaq(faqs[idx])}>
                  Guardar
                </Button>
                <IconButton onClick={() => deleteFaq(f.id)}>
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
            <Text weight="plus" size="small">Nueva pregunta</Text>
            <Input
              placeholder="Pregunta"
              value={newFaq.question}
              onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
            />
            <Textarea
              placeholder="Respuesta"
              rows={2}
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
            />
            <Input
              placeholder="Categoría (ej: Envíos)"
              value={newFaq.category}
              onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
            />
            <div>
              <Button size="small" onClick={addFaq}>Agregar</Button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="banners" className="flex flex-col gap-4 pt-4">
          {banners.map((b, idx) => (
            <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <Input
                placeholder="Título"
                value={b.title}
                onChange={(e) => {
                  const next = [...banners]
                  next[idx] = { ...b, title: e.target.value }
                  setBanners(next)
                }}
              />
              <Input
                placeholder="Subtítulo"
                value={b.subtitle}
                onChange={(e) => {
                  const next = [...banners]
                  next[idx] = { ...b, subtitle: e.target.value }
                  setBanners(next)
                }}
              />
              <Input
                placeholder="Tag (ej: VENTA RELÁMPAGO // 20% OFF)"
                value={b.tag}
                onChange={(e) => {
                  const next = [...banners]
                  next[idx] = { ...b, tag: e.target.value }
                  setBanners(next)
                }}
              />
              <div className="flex justify-end gap-2">
                <Button size="small" variant="secondary" onClick={() => updateBanner(banners[idx])}>
                  Guardar
                </Button>
                <IconButton onClick={() => deleteBanner(b.id)}>
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
            <Text weight="plus" size="small">Nuevo banner</Text>
            <Input
              placeholder="Título"
              value={newBanner.title}
              onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
            />
            <Input
              placeholder="Subtítulo"
              value={newBanner.subtitle}
              onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
            />
            <Input
              placeholder="Tag (ej: VENTA RELÁMPAGO // 20% OFF)"
              value={newBanner.tag}
              onChange={(e) => setNewBanner({ ...newBanner, tag: e.target.value })}
            />
            <div>
              <Button size="small" onClick={addBanner}>Agregar</Button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="product-section" className="pt-4">
          <div className="flex max-w-2xl flex-col gap-4">
            {productSection && (
              <>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label size="small">Eyebrow</Label>
                    <Input
                      value={productSection.eyebrow}
                      onChange={(e) => setProductSection({ ...productSection, eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <Label size="small">Micro-label</Label>
                    <Input
                      value={productSection.micro_label}
                      onChange={(e) => setProductSection({ ...productSection, micro_label: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label size="small">Headline</Label>
                  <Input
                    value={productSection.headline}
                    onChange={(e) => setProductSection({ ...productSection, headline: e.target.value })}
                  />
                </div>
                <div>
                  <Label size="small">Tagline</Label>
                  <Input
                    value={productSection.tagline}
                    onChange={(e) => setProductSection({ ...productSection, tagline: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label size="small">Subtítulo "Fórmula"</Label>
                    <Input
                      value={productSection.formula_heading}
                      onChange={(e) => setProductSection({ ...productSection, formula_heading: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <Label size="small">Subtítulo "Ventajas"</Label>
                    <Input
                      value={productSection.advantages_heading}
                      onChange={(e) => setProductSection({ ...productSection, advantages_heading: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Button onClick={saveProductSection}>Guardar Sección de Producto</Button>
                </div>
              </>
            )}

            <div className="mt-4 border-t pt-4">
              <Text weight="plus" size="small">Bloques de garantía</Text>
              <div className="mt-3 flex flex-col gap-3">
                {guarantees.map((g, idx) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <Input
                      placeholder="Título"
                      value={g.title}
                      onChange={(e) => {
                        const next = [...guarantees]
                        next[idx] = { ...g, title: e.target.value }
                        setGuarantees(next)
                      }}
                    />
                    <Input
                      placeholder="Subtítulo"
                      value={g.subtitle}
                      onChange={(e) => {
                        const next = [...guarantees]
                        next[idx] = { ...g, subtitle: e.target.value }
                        setGuarantees(next)
                      }}
                    />
                    <Button size="small" variant="secondary" onClick={() => updateGuarantee(guarantees[idx])}>
                      Guardar
                    </Button>
                    <IconButton onClick={() => deleteGuarantee(g.id)}>
                      <Trash />
                    </IconButton>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-2">
                  <Input
                    placeholder="Título (ej: Envío Rápido)"
                    value={newGuarantee.title}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, title: e.target.value })}
                  />
                  <Input
                    placeholder="Subtítulo (ej: 24-48 hrs hábiles)"
                    value={newGuarantee.subtitle}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, subtitle: e.target.value })}
                  />
                  <Button size="small" onClick={addGuarantee}>Agregar</Button>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <Text weight="plus" size="small">Tips de uso</Text>
              <div className="mt-3 flex flex-col gap-3">
                {usageTips.map((ut, idx) => (
                  <div key={ut.id} className="flex flex-col gap-2 rounded-lg border p-2">
                    <Input
                      placeholder="Título (ej: Post-Entrenamiento)"
                      value={ut.title}
                      onChange={(e) => {
                        const next = [...usageTips]
                        next[idx] = { ...ut, title: e.target.value }
                        setUsageTips(next)
                      }}
                    />
                    <Textarea
                      rows={2}
                      value={ut.body}
                      onChange={(e) => {
                        const next = [...usageTips]
                        next[idx] = { ...ut, body: e.target.value }
                        setUsageTips(next)
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="small" variant="secondary" onClick={() => updateUsageTip(usageTips[idx])}>
                        Guardar
                      </Button>
                      <IconButton onClick={() => deleteUsageTip(ut.id)}>
                        <Trash />
                      </IconButton>
                    </div>
                  </div>
                ))}
                <div className="flex flex-col gap-2 rounded-lg border border-dashed p-2">
                  <Input
                    placeholder="Título"
                    value={newUsageTip.title}
                    onChange={(e) => setNewUsageTip({ ...newUsageTip, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Descripción"
                    rows={2}
                    value={newUsageTip.body}
                    onChange={(e) => setNewUsageTip({ ...newUsageTip, body: e.target.value })}
                  />
                  <div>
                    <Button size="small" onClick={addUsageTip}>Agregar</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="final-cta" className="pt-4">
          {finalCta && (
            <div className="flex max-w-2xl flex-col gap-4">
              <div>
                <Label size="small">Badge</Label>
                <Input
                  value={finalCta.badge_text}
                  onChange={(e) => setFinalCta({ ...finalCta, badge_text: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Headline</Label>
                  <Input
                    value={finalCta.headline}
                    onChange={(e) => setFinalCta({ ...finalCta, headline: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Headline destacado (gradiente)</Label>
                  <Input
                    value={finalCta.headline_highlight}
                    onChange={(e) => setFinalCta({ ...finalCta, headline_highlight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label size="small">Subtexto</Label>
                <Textarea
                  rows={3}
                  value={finalCta.subtext}
                  onChange={(e) => setFinalCta({ ...finalCta, subtext: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Texto de garantía</Label>
                  <Input
                    value={finalCta.guarantee_text}
                    onChange={(e) => setFinalCta({ ...finalCta, guarantee_text: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Texto del botón</Label>
                  <Input
                    value={finalCta.cta_text}
                    onChange={(e) => setFinalCta({ ...finalCta, cta_text: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Button onClick={saveFinalCta}>Guardar CTA Final</Button>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="nav-links" className="flex flex-col gap-4 pt-4">
          {navLinks.map((nl, idx) => (
            <div key={nl.id} className="flex items-center gap-2 rounded-lg border p-3">
              <Input
                placeholder="Etiqueta"
                value={nl.label}
                onChange={(e) => {
                  const next = [...navLinks]
                  next[idx] = { ...nl, label: e.target.value }
                  setNavLinks(next)
                }}
              />
              <Input
                placeholder="URL"
                value={nl.url}
                onChange={(e) => {
                  const next = [...navLinks]
                  next[idx] = { ...nl, url: e.target.value }
                  setNavLinks(next)
                }}
              />
              <Badge>{NAV_LINK_GROUPS.find((g) => g.value === nl.group)?.label ?? nl.group}</Badge>
              <Button size="small" variant="secondary" onClick={() => updateNavLink(navLinks[idx])}>
                Guardar
              </Button>
              <IconButton onClick={() => deleteNavLink(nl.id)}>
                <Trash />
              </IconButton>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
            <Text weight="plus" size="small">Nuevo link</Text>
            <div className="flex gap-3">
              <Input
                placeholder="Etiqueta"
                value={newNavLink.label}
                onChange={(e) => setNewNavLink({ ...newNavLink, label: e.target.value })}
              />
              <Input
                placeholder="URL (ej: #beneficios)"
                value={newNavLink.url}
                onChange={(e) => setNewNavLink({ ...newNavLink, url: e.target.value })}
              />
            </div>
            <Select
              value={newNavLink.group}
              onValueChange={(v) => setNewNavLink({ ...newNavLink, group: v })}
            >
              <Select.Trigger>
                <Select.Value placeholder="Grupo" />
              </Select.Trigger>
              <Select.Content>
                {NAV_LINK_GROUPS.map((g) => (
                  <Select.Item key={g.value} value={g.value}>
                    {g.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <div>
              <Button size="small" onClick={addNavLink}>Agregar</Button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="settings" className="pt-4">
          {settings && (
            <div className="flex max-w-2xl flex-col gap-4">
              <div>
                <Label size="small">Nombre de la Marca</Label>
                <Input
                  value={settings.brand_name}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Logo (URL)</Label>
                  <Input
                    value={settings.logo_url}
                    onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Favicon (URL)</Label>
                  <Input
                    value={settings.favicon_url}
                    onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Color Primario</Label>
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Color Secundario</Label>
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label size="small">WhatsApp de Ventas</Label>
                <Input
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Mensaje precargado de WhatsApp</Label>
                <Textarea
                  rows={2}
                  value={settings.whatsapp_message_template}
                  onChange={(e) => setSettings({ ...settings, whatsapp_message_template: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Tooltip del botón de WhatsApp</Label>
                <Input
                  value={settings.whatsapp_tooltip_text}
                  onChange={(e) => setSettings({ ...settings, whatsapp_tooltip_text: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Instagram (URL)</Label>
                  <Input
                    value={settings.instagram_url}
                    onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">TikTok (URL)</Label>
                  <Input
                    value={settings.tiktok_url}
                    onChange={(e) => setSettings({ ...settings, tiktok_url: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Facebook (URL)</Label>
                  <Input
                    value={settings.facebook_url}
                    onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label size="small">Email de Contacto</Label>
                <Input
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Información de Envíos</Label>
                <Textarea
                  rows={2}
                  value={settings.shipping_information}
                  onChange={(e) => setSettings({ ...settings, shipping_information: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Descripción de marca (Footer)</Label>
                <Textarea
                  rows={2}
                  value={settings.footer_description}
                  onChange={(e) => setSettings({ ...settings, footer_description: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Texto de Copyright (Footer)</Label>
                <Input
                  value={settings.footer_text}
                  onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label size="small">Política de Privacidad (URL)</Label>
                  <Input
                    value={settings.privacy_policy}
                    onChange={(e) => setSettings({ ...settings, privacy_policy: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">Términos y Condiciones (URL)</Label>
                  <Input
                    value={settings.terms_and_conditions}
                    onChange={(e) => setSettings({ ...settings, terms_and_conditions: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label size="small">Headline de respaldo (Oferta sin banner activo)</Label>
                <Input
                  value={settings.offer_fallback_headline}
                  onChange={(e) => setSettings({ ...settings, offer_fallback_headline: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Subtítulo de respaldo (Oferta sin banner activo)</Label>
                <Textarea
                  rows={2}
                  value={settings.offer_fallback_subtitle}
                  onChange={(e) => setSettings({ ...settings, offer_fallback_subtitle: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Título SEO</Label>
                <Input
                  value={settings.seo_title}
                  onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Descripción SEO</Label>
                <Textarea
                  rows={2}
                  value={settings.seo_description}
                  onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Imagen Open Graph (URL)</Label>
                <Input
                  value={settings.og_image}
                  onChange={(e) => setSettings({ ...settings, og_image: e.target.value })}
                />
              </div>
              <div>
                <Button onClick={saveSettings}>Guardar Configuración</Button>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Landing Content",
  icon: Newspaper,
})

export default LandingContentPage
