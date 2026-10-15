import { SimpleFacturaError } from "../simplefactura"

// Cliente de SimpleFactura simulado; SimpleFacturaError se mantiene real.
const emitirDte = jest.fn()
const obtenerPdf = jest.fn()
jest.mock("../simplefactura", () => ({
  ...jest.requireActual("../simplefactura"),
  getSimpleFacturaClient: () => ({
    client: { emitirDte, obtenerPdf },
    config: {
      rutEmisor: "78181331-1",
      razonSocial: "EMPRESA",
      giro: "Giro",
      dirOrigen: "Calle 1",
      comunaOrigen: "Santiago",
      ambiente: 0,
    },
  }),
}))

import { issueDocumentForOrder } from "../invoice-order"

const paidCollections = [{ status: "completed", amount: 1000, captured_amount: 1000 }]

/** Contenedor en memoria: base con índice único por pedido, candado en serie y cola de correos. */
function setup(opts: { paid?: boolean } = {}) {
  const state = {
    order: {
      id: "order_1",
      display_id: 15,
      email: "cliente@correo.cl",
      status: "pending",
      total: 1000,
      shipping_total: 0,
      metadata: {} as Record<string, any>,
      items: [{ product_title: "Whey", variant_title: "Choco", quantity: 1, unit_price: 1000, discount_total: 0 }],
      payment_collections: opts.paid === false ? [{ status: "not_paid", amount: 1000, captured_amount: 0 }] : paidCollections,
    },
    rows: [] as any[],
    emails: [] as any[],
  }

  const invoicing = {
    listInvoiceDocuments: async (filter: any) => state.rows.filter((r) => r.order_id === filter.order_id).slice(0, 1),
    createInvoiceDocuments: async (data: any) => {
      if (state.rows.some((r) => r.order_id === data.order_id)) throw new Error(`Invoice document with order_id: ${data.order_id}, already exists.`) // mensaje real de Medusa
      const created = { id: `invdoc_${state.rows.length + 1}`, folio: null, ...data }
      state.rows.push(created)
      return created
    },
    updateInvoiceDocuments: async (data: any) => {
      Object.assign(state.rows.find((r) => r.id === data.id), data)
    },
    deleteInvoiceDocuments: async (id: string) => {
      state.rows = state.rows.filter((r) => r.id !== id)
    },
  }

  // Candado por clave, en serie (mismo contrato que el módulo de locking).
  const tails = new Map<string, Promise<unknown>>()
  const locking = {
    execute: async (key: string, job: () => Promise<unknown>) => {
      const run = (tails.get(key) ?? Promise.resolve()).then(job, job)
      tails.set(key, run.catch(() => undefined))
      return run
    },
  }

  const services: Record<string, any> = {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    query: {
      graph: async () => ({ data: [JSON.parse(JSON.stringify(state.order))] }),
    },
    order: {
      updateOrders: async (_id: string, data: any) => {
        state.order.metadata = data.metadata
      },
    },
    notification: {
      createNotifications: async (n: any) => {
        state.emails.push(n)
      },
    },
    locking,
    invoicing,
  }
  const container = {
    resolve: (key: string) => {
      const found = services[key] ?? services[String(key).split("_")[0]]
      if (!found) throw new Error(`no simulado: ${key}`)
      return found
    },
  } as any
  return { container, state }
}

beforeEach(() => {
  emitirDte.mockReset()
  obtenerPdf.mockReset()
  obtenerPdf.mockResolvedValue(Buffer.from("pdf"))
  delete process.env.STOREFRONT_URL
})

// Medusa resuelve por claves tipo "logger", "query", "order", "notification", "locking", "invoicing".
jest.mock("@medusajs/framework/utils", () => ({
  ...jest.requireActual("@medusajs/framework/utils"),
  ContainerRegistrationKeys: { LOGGER: "logger", QUERY: "query" },
  Modules: { ORDER: "order", NOTIFICATION: "notification", LOCKING: "locking" },
}))

describe("issueDocumentForOrder", () => {
  it("dos emisiones simultáneas del mismo pedido (el caso de la boleta duplicada) emiten UNA sola", async () => {
    const { container, state } = setup()
    emitirDte.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return { folio: 8726, fechaEmision: "2026-10-15", total: 1000 }
    })

    const results = await Promise.all([
      issueDocumentForOrder(container, "order_1"),
      issueDocumentForOrder(container, "order_1"),
      issueDocumentForOrder(container, "order_1"),
    ])

    expect(emitirDte).toHaveBeenCalledTimes(1)
    expect(results.filter((r) => r === "emitted")).toHaveLength(1)
    expect(results.filter((r) => r === "already_emitted")).toHaveLength(2)
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0]).toMatchObject({ status: "emitted", folio: 8726 })
    expect(state.order.metadata.boleta.folio).toBe(8726)
    // El cliente recibe un solo correo con la boleta.
    expect(state.emails).toHaveLength(1)
  })

  it("aunque el candado no exista, el índice único impide la segunda emisión", async () => {
    const { container, state } = setup()
    // Candado que no serializa (simula instancias sin candado compartido).
    ;(container.resolve("locking") as any).execute = async (_k: string, job: () => Promise<unknown>) => job()
    emitirDte.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return { folio: 9001, fechaEmision: "2026-10-15", total: 1000 }
    })

    const results = await Promise.all([issueDocumentForOrder(container, "order_1"), issueDocumentForOrder(container, "order_1")])

    expect(emitirDte).toHaveBeenCalledTimes(1)
    expect(results).toContain("emitted")
    expect(results).toContain("in_progress")
    expect(state.rows).toHaveLength(1)
  })

  it("pedido sin pagar: no emite ni reserva", async () => {
    const { container, state } = setup({ paid: false })
    await expect(issueDocumentForOrder(container, "order_1")).resolves.toBe("unpaid")
    expect(emitirDte).not.toHaveBeenCalled()
    expect(state.rows).toHaveLength(0)
  })

  it("rechazo de SimpleFactura (definitivo): libera la reserva y el siguiente intento emite", async () => {
    const { container, state } = setup()
    emitirDte.mockRejectedValueOnce(new SimpleFacturaError("monto inválido", 400))
    await expect(issueDocumentForOrder(container, "order_1")).rejects.toThrow("monto inválido")
    expect(state.rows).toHaveLength(0)

    emitirDte.mockResolvedValueOnce({ folio: 8800, fechaEmision: "2026-10-15", total: 1000 })
    await expect(issueDocumentForOrder(container, "order_1")).resolves.toBe("emitted")
    expect(emitirDte).toHaveBeenCalledTimes(2)
  })

  it("fallo ambiguo (corte de red): conserva la reserva y NO reemite; pasa a revisión", async () => {
    const { container, state } = setup()
    emitirDte.mockRejectedValueOnce(new TypeError("fetch failed"))
    await expect(issueDocumentForOrder(container, "order_1")).rejects.toThrow("fetch failed")
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0].status).toBe("emitting")

    // El siguiente intento (p. ej. el job) no debe emitir otra boleta.
    await expect(issueDocumentForOrder(container, "order_1")).resolves.toBe("needs_review")
    expect(emitirDte).toHaveBeenCalledTimes(1)
    expect(state.rows[0].status).toBe("review")

    // Y los siguientes siguen sin emitir.
    await expect(issueDocumentForOrder(container, "order_1")).resolves.toBe("needs_review")
    expect(emitirDte).toHaveBeenCalledTimes(1)
  })

  it("emitida y registrada pero sin metadata en el pedido: se reconstruye sin emitir otra", async () => {
    const { container, state } = setup()
    state.rows.push({
      id: "invdoc_x", order_id: "order_1", tipo: "boleta", status: "emitted",
      folio: 8726, codigo_tipo: 39, fecha: "2026-10-15", ambiente: 0, total: 1000,
    })
    await expect(issueDocumentForOrder(container, "order_1")).resolves.toBe("already_emitted")
    expect(emitirDte).not.toHaveBeenCalled()
    expect(state.order.metadata.boleta.folio).toBe(8726)
  })
})
