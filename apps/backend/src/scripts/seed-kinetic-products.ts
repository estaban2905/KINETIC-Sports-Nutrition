import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

type SeedFlavor = { id: string; name: string }
type SeedSize = { id: string; name: string; price: number }

type SeedProduct = {
  handle: string
  title: string
  description: string
  price: number
  image: string
  flavors?: SeedFlavor[]
  sizes?: SeedSize[]
}

/**
 * Creates real Medusa products/variants matching the storefront's static
 * catalog in apps/storefront/src/data/products.ts (same ids used as
 * `handle`), so the storefront can add real variant_ids to a real cart
 * instead of faking checkout client-side. Run once with:
 *   npx medusa exec ./src/scripts/seed-kinetic-products.ts
 *
 * IMPORTANT: keep `handle` in sync with `Product.id` in
 * apps/storefront/src/data/products.ts — the storefront resolves variants
 * by product handle (see apps/storefront/src/lib/medusa.ts).
 */
const PRODUCTS: SeedProduct[] = [
  {
    handle: "kinetic-gold-standard-whey",
    title: "GOLD STANDARD 100% WHEY",
    description:
      "Proteína aislada de suero de leche con 24g de proteína, 5.5g de BCAAs por porción.",
    price: 65990,
    image:
      "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=500&q=75",
    flavors: [
      { id: "choco", name: "Double Rich Chocolate" },
      { id: "vanilla", name: "Vanilla Ice Cream" },
      { id: "cookies", name: "Cookies & Cream" },
      { id: "strawberry", name: "Delicious Strawberry" },
    ],
    sizes: [
      { id: "310g", name: "310 gr", price: 32990 },
      { id: "2lb", name: "2 Libras", price: 65990 },
      { id: "5lb", name: "5 Libras", price: 106990 },
    ],
  },
  {
    handle: "kinetic-creatine-pure",
    title: "CREATINA CREAPURE®",
    description: "100% Monohidrato Micronizado 200 Mesh.",
    price: 26990,
    image:
      "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=500&q=75",
  },
  {
    handle: "kinetic-preworkout-surge",
    title: "PRE-WORKOUT NITRO SURGE",
    description: "Beta-Alanina, Citrulina Malato y Cafeína anhidra.",
    price: 34990,
    image:
      "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=500&q=75",
    flavors: [
      { id: "blue-ice", name: "Blue Raspberry Ice" },
      { id: "sour-apple", name: "Manzana Ácida Eléctrica" },
    ],
  },
  {
    handle: "kinetic-shaker-steel",
    title: "SHAKER PRO BLACK STEEL",
    description: "Acero inoxidable 18/8 con aislamiento térmico.",
    price: 18990,
    image:
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=500&q=75",
  },
  {
    handle: "kinetic-protein-bars",
    title: "CRUNCH PROTEIN BARS (12x)",
    description: "Caja de 12 barritas con 21g de proteína.",
    price: 24990,
    image:
      "https://images.unsplash.com/photo-1622484216805-f932822a967f?auto=format&fit=crop&w=500&q=75",
    flavors: [
      { id: "caramel", name: "Caramelo Salado Crunch" },
      { id: "dark-choco", name: "Chocolate Negro 70%" },
    ],
  },
  {
    handle: "kinetic-lifting-straps",
    title: "HEAVY DUTY LIFTING STRAPS",
    description: "Correas de levantamiento de alta resistencia.",
    price: 14990,
    image:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=75",
  },
  {
    handle: "kinetic-performance-tee",
    title: "KINETIC PERFORMANCE TEE",
    description: "Remera técnica transpirable de corte atlético.",
    price: 22990,
    image:
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=75",
  },
]

export default async function seedKineticProducts({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const existingHandles = new Set(existingProducts.map((p) => p.handle))

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  })
  const defaultSalesChannel = salesChannels[0]

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const chileStockLocation =
    stockLocations.find((l) => l.name === "Bodega Santiago") ??
    stockLocations[0]

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [{ name: "Suplementos KINETIC", is_active: true }],
    },
  })
  const category = categoryResult[0]

  for (const p of PRODUCTS) {
    if (existingHandles.has(p.handle)) {
      logger.info(`Product "${p.handle}" already seeded, skipping.`)
      continue
    }

    const hasFlavors = !!p.flavors?.length
    const hasSizes = !!p.sizes?.length

    const options: { title: string; values: string[] }[] = []
    if (hasFlavors) {
      options.push({ title: "Sabor", values: p.flavors!.map((f) => f.name) })
    }
    if (hasSizes) {
      options.push({ title: "Tamaño", values: p.sizes!.map((s) => s.name) })
    }
    if (!options.length) {
      options.push({ title: "Tipo", values: ["Único"] })
    }

    const flavorList = hasFlavors ? p.flavors! : [{ id: "default", name: "" }]
    const sizeList = hasSizes ? p.sizes! : [{ id: "default", name: "", price: p.price }]

    const variants = flavorList.flatMap((flavor) =>
      sizeList.map((size) => {
        const optionValues: Record<string, string> = {}
        if (hasFlavors) optionValues["Sabor"] = flavor.name
        if (hasSizes) optionValues["Tamaño"] = size.name
        if (!hasFlavors && !hasSizes) optionValues["Tipo"] = "Único"

        const title = [flavor.name, size.name].filter(Boolean).join(" / ") || "Único"

        return {
          title,
          sku: `${p.handle}-${flavor.id}-${size.id}`.toUpperCase(),
          options: optionValues,
          prices: [{ currency_code: "clp", amount: size.price }],
        }
      })
    )

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: p.title,
            handle: p.handle,
            category_ids: [category.id],
            description: p.description,
            status: ProductStatus.PUBLISHED,
            weight: 500,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: p.image }],
            options,
            variants,
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
        ],
      },
    })

    logger.info(`Seeded product "${p.handle}" (${variants.length} variantes).`)
  }

  logger.info("Seeding inventory levels for KINETIC products...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: chileStockLocation.id,
        stocked_quantity: 1000,
        inventory_item_id: item.id,
      })),
    },
  })

  logger.info("Finished seeding KINETIC products.")
}
