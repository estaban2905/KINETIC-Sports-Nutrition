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
  subtitle: string
  badge: string
  primary_cta_text: string
  secondary_cta_text: string
  active: boolean
}

type Settings = {
  id?: string
  brand_name: string
  whatsapp_number: string
  contact_email: string
  seo_title: string
  seo_description: string
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
  button_text: string
  start_date: string
  end_date: string
  sort_order: number
}

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
const emptyBanner = {
  title: "",
  subtitle: "",
  image_url: "",
  button_text: "Ver Oferta",
  button_url: "#oferta",
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

const LandingContentPage = () => {
  const [hero, setHero] = useState<Hero | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [newBenefit, setNewBenefit] = useState(emptyBenefit)
  const [newFaq, setNewFaq] = useState(emptyFaq)
  const [newBanner, setNewBanner] = useState(emptyBanner)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [heroRes, settingsRes, benefitsRes, faqRes, bannersRes] = await Promise.all([
        api<{ hero: Hero | null }>("/hero"),
        api<{ settings: Settings | null }>("/settings"),
        api<{ benefits: Benefit[] }>("/benefits"),
        api<{ faq: Faq[] }>("/faq"),
        api<{ banners: Banner[] }>("/banners"),
      ])
      setHero(heroRes.hero)
      setSettings(settingsRes.settings)
      setBenefits(benefitsRes.benefits)
      setFaqs(faqRes.faq)
      setBanners(bannersRes.banners)
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

  const deleteBanner = async (id: string) => {
    try {
      await api(`/banners/${id}`, { method: "DELETE" })
      setBanners((prev) => prev.filter((b) => b.id !== id))
    } catch {
      toast.error("No se pudo eliminar el banner.")
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
          <Tabs.Trigger value="faq">FAQ</Tabs.Trigger>
          <Tabs.Trigger value="banners">Banners</Tabs.Trigger>
          <Tabs.Trigger value="settings">Marca & SEO</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="hero" className="pt-4">
          {hero && (
            <div className="flex max-w-2xl flex-col gap-4">
              <div>
                <Label size="small">Título Principal</Label>
                <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} />
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
                  <Label size="small">CTA Principal</Label>
                  <Input
                    value={hero.primary_cta_text}
                    onChange={(e) => setHero({ ...hero, primary_cta_text: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label size="small">CTA Secundario</Label>
                  <Input
                    value={hero.secondary_cta_text}
                    onChange={(e) => setHero({ ...hero, secondary_cta_text: e.target.value })}
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
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="benefits" className="flex flex-col gap-4 pt-4">
          {benefits.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <Text weight="plus">{b.title}</Text>
                  {b.stat && <Badge>{b.stat} {b.stat_label}</Badge>}
                </div>
                <Text size="small" className="text-ui-fg-subtle">{b.description}</Text>
              </div>
              <IconButton onClick={() => deleteBenefit(b.id)}>
                <Trash />
              </IconButton>
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

        <Tabs.Content value="faq" className="flex flex-col gap-4 pt-4">
          {faqs.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <Text weight="plus">{f.question}</Text>
                <Text size="small" className="text-ui-fg-subtle">{f.answer}</Text>
              </div>
              <IconButton onClick={() => deleteFaq(f.id)}>
                <Trash />
              </IconButton>
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
          {banners.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <Text weight="plus">{b.title}</Text>
                <Text size="small" className="text-ui-fg-subtle">{b.subtitle}</Text>
              </div>
              <IconButton onClick={() => deleteBanner(b.id)}>
                <Trash />
              </IconButton>
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
            <div>
              <Button size="small" onClick={addBanner}>Agregar</Button>
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
              <div>
                <Label size="small">WhatsApp de Ventas</Label>
                <Input
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                />
              </div>
              <div>
                <Label size="small">Email de Contacto</Label>
                <Input
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
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
