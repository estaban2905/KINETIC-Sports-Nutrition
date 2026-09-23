import { useEffect, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { Trash, Plus } from "@medusajs/icons"

type NutritionFact = { label: string; value: string; highlight: boolean }

type ProductContent = {
  id?: string
  badge: string
  rating: number
  features: string[]
  nutrition_facts: NutritionFact[]
}

const empty: ProductContent = {
  badge: "",
  rating: 5,
  features: [],
  nutrition_facts: [],
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`)
  }
  return res.json()
}

const ProductContentWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [content, setContent] = useState<ProductContent>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newFeature, setNewFeature] = useState("")

  useEffect(() => {
    api<{ product_content: (ProductContent & { id: string }) | null }>(
      `/admin/products/${data.id}/content`
    )
      .then((res) => {
        if (res.product_content) {
          setContent({
            id: res.product_content.id,
            badge: res.product_content.badge ?? "",
            rating: res.product_content.rating ?? 5,
            features: res.product_content.features ?? [],
            nutrition_facts: res.product_content.nutrition_facts ?? [],
          })
        }
      })
      .catch(() => toast.error("No se pudo cargar el contenido extra del producto."))
      .finally(() => setLoading(false))
  }, [data.id])

  const save = async () => {
    setSaving(true)
    try {
      const res = await api<{ product_content: { id: string } }>(
        `/admin/products/${data.id}/content`,
        {
          method: "POST",
          body: JSON.stringify({
            product_content_id: content.id,
            badge: content.badge || null,
            rating: content.rating,
            features: content.features,
            nutrition_facts: content.nutrition_facts,
          }),
        }
      )
      setContent((prev) => ({ ...prev, id: res.product_content.id }))
      toast.success("Contenido del producto actualizado.")
    } catch {
      toast.error("No se pudo guardar el contenido del producto.")
    } finally {
      setSaving(false)
    }
  }

  const addFeature = () => {
    if (!newFeature.trim()) return
    setContent((prev) => ({ ...prev, features: [...prev.features, newFeature.trim()] }))
    setNewFeature("")
  }

  const removeFeature = (idx: number) => {
    setContent((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))
  }

  const addFact = () => {
    setContent((prev) => ({
      ...prev,
      nutrition_facts: [...prev.nutrition_facts, { label: "", value: "", highlight: false }],
    }))
  }

  const updateFact = (idx: number, patch: Partial<NutritionFact>) => {
    setContent((prev) => ({
      ...prev,
      nutrition_facts: prev.nutrition_facts.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }))
  }

  const removeFact = (idx: number) => {
    setContent((prev) => ({
      ...prev,
      nutrition_facts: prev.nutrition_facts.filter((_, i) => i !== idx),
    }))
  }

  if (loading) {
    return (
      <Container className="p-6">
        <Text size="small" className="text-ui-fg-subtle">
          Cargando contenido de marketing del producto...
        </Text>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Contenido de Marketing</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Badge, rating, features y tabla nutricional que muestra la landing. No forma parte del
            producto nativo de Medusa.
          </Text>
        </div>
        <Button size="small" onClick={save} isLoading={saving}>
          Guardar
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label size="small">Badge (ej: OFERTA ESPECIAL)</Label>
            <Input
              value={content.badge}
              onChange={(e) => setContent({ ...content, badge: e.target.value })}
            />
          </div>
          <div className="w-32">
            <Label size="small">Rating (0-5)</Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={content.rating}
              onChange={(e) => setContent({ ...content, rating: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        <Text weight="plus" size="small">
          Features
        </Text>
        {content.features.map((f, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={f}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  features: prev.features.map((v, i) => (i === idx ? e.target.value : v)),
                }))
              }
            />
            <IconButton size="small" onClick={() => removeFeature(idx)}>
              <Trash />
            </IconButton>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Nueva feature"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFeature()}
          />
          <IconButton size="small" onClick={addFeature}>
            <Plus />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        <Text weight="plus" size="small">
          Tabla nutricional
        </Text>
        {content.nutrition_facts.map((fact, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              placeholder="Label"
              value={fact.label}
              onChange={(e) => updateFact(idx, { label: e.target.value })}
            />
            <Input
              placeholder="Valor"
              value={fact.value}
              onChange={(e) => updateFact(idx, { value: e.target.value })}
            />
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Switch
                checked={fact.highlight}
                onCheckedChange={(v) => updateFact(idx, { highlight: v })}
              />
              <Label size="small">Destacar</Label>
            </div>
            <IconButton size="small" onClick={() => removeFact(idx)}>
              <Trash />
            </IconButton>
          </div>
        ))}
        <div>
          <Button size="small" variant="secondary" onClick={addFact}>
            Agregar fila
          </Button>
        </div>
      </div>

    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductContentWidget
