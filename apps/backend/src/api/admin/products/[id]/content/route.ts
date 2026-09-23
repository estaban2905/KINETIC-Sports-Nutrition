import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  upsertProductContentWorkflow,
  type NutritionFactInput,
} from "../../../../../workflows/upsert-product-content"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "product_content.*"],
    filters: { id: req.params.id },
  })

  res.json({ product_content: data[0]?.product_content ?? null })
}

type PostBody = {
  product_content_id?: string
  badge?: string | null
  rating?: number
  features?: string[] | null
  nutrition_facts?: NutritionFactInput[] | null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as PostBody

  const { result } = await upsertProductContentWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      product_content_id: body.product_content_id,
      badge: body.badge,
      rating: body.rating,
      features: body.features,
      nutrition_facts: body.nutrition_facts,
    },
  })

  res.json({ product_content: result })
}
