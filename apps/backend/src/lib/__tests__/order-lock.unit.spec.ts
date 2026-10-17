import { withLock } from "../order-lock"

/** Candado en memoria con el mismo contrato que el módulo de locking de Medusa. */
function fakeContainer() {
  const tails = new Map<string, Promise<unknown>>()
  const keysSeen: string[] = []
  const locking = {
    execute: async (key: string, job: () => Promise<unknown>) => {
      keysSeen.push(key)
      const previous = tails.get(key) ?? Promise.resolve()
      const run = previous.then(job, job)
      tails.set(key, run.catch(() => undefined))
      return run
    },
  }
  return { container: { resolve: () => locking } as any, keysSeen }
}

describe("withLock", () => {
  it("serializa trabajos con la misma clave: el segundo ve lo que dejó el primero", async () => {
    const { container } = fakeContainer()
    let emitted = false
    const results: string[] = []

    const issue = () =>
      withLock(container, "order-docs:order_1", async () => {
        const already = emitted
        await new Promise((r) => setTimeout(r, 20)) // la emisión tarda
        if (!already) emitted = true
        results.push(already ? "already_emitted" : "emitted")
      })

    await Promise.all([issue(), issue(), issue()])
    expect(results).toEqual(["emitted", "already_emitted", "already_emitted"])
  })

  it("no bloquea pedidos distintos entre sí", async () => {
    const { container, keysSeen } = fakeContainer()
    await Promise.all([
      withLock(container, "order-docs:a", async () => undefined),
      withLock(container, "order-docs:b", async () => undefined),
    ])
    expect(keysSeen).toEqual(["order-docs:a", "order-docs:b"])
  })

  it("devuelve el resultado y propaga los errores", async () => {
    const { container } = fakeContainer()
    await expect(withLock(container, "k", async () => 42)).resolves.toBe(42)
    await expect(withLock(container, "k", async () => { throw new Error("falló") })).rejects.toThrow("falló")
  })
})
