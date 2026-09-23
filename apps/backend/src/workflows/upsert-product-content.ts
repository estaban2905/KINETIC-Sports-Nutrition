import {
  createStep,
  createWorkflow,
  StepResponse,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import ProductContentModuleService from "../modules/product-content/service"

export type NutritionFactInput = {
  label: string
  value: string
  highlight?: boolean
}

export type UpsertProductContentInput = {
  product_id: string
  product_content_id?: string
  badge?: string | null
  rating?: number
  features?: string[] | null
  nutrition_facts?: NutritionFactInput[] | null
}

const upsertProductContentStep = createStep(
  "upsert-product-content-step",
  async (input: UpsertProductContentInput, { container }) => {
    const service = container.resolve<ProductContentModuleService>(PRODUCT_CONTENT_MODULE)
    const { product_id, product_content_id, ...data } = input

    // Medusa's generated types model json() fields as `Record<string, unknown>`,
    // which doesn't fit our array shapes (features/nutrition_facts) — same `as any`
    // escape hatch already used for json-ish fields in the `landing` module's routes.
    const record: { id: string } = product_content_id
      ? await service.updateProductContents({ id: product_content_id, ...data } as any)
      : await service.createProductContents(data as any)

    return new StepResponse(record, { id: record.id, isNew: !product_content_id })
  },
  async (compensateInput, { container }) => {
    if (!compensateInput?.isNew) return
    const service = container.resolve<ProductContentModuleService>(PRODUCT_CONTENT_MODULE)
    await service.deleteProductContents(compensateInput.id)
  }
)

/**
 * Creates (first edit) or updates (every edit after) the ProductContent
 * record for a product, and links it to that product the first time only —
 * see src/links/product-product-content.ts for how the link is declared.
 */
export const upsertProductContentWorkflow = createWorkflow(
  "upsert-product-content",
  (input: UpsertProductContentInput) => {
    const productContent = upsertProductContentStep(input)

    when(input, (data) => !data.product_content_id).then(() => {
      createRemoteLinkStep([
        {
          [Modules.PRODUCT]: { product_id: input.product_id },
          [PRODUCT_CONTENT_MODULE]: { product_content_id: productContent.id },
        },
      ])
    })

    return new WorkflowResponse(productContent)
  }
)
