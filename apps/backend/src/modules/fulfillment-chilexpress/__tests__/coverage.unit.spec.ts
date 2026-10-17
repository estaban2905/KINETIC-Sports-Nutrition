type CoverageModule = typeof import("../coverage")

const AREAS = {
  coverageAreas: [
    { countyCode: "PROV", countyName: "PROVIDENCIA" },
    { countyCode: "NUNO", countyName: "ÑUÑOA" },
    { countyCode: "SCEN", countyName: "SANTIAGO CENTRO" },
  ],
}

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe("chilexpress coverage", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock
  let coverage: CoverageModule

  // El caché es estado del módulo: cada test parte con un módulo limpio.
  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()
    fetchMock = jest.fn().mockResolvedValue(okResponse(AREAS))
    global.fetch = fetchMock as unknown as typeof fetch
    coverage = require("../coverage")
  })

  afterEach(() => {
    jest.useRealTimers()
    global.fetch = originalFetch
  })

  const options = { apiKey: "key" }

  describe("resolveCountyCode", () => {
    it("returns null without calling Chilexpress when there's no comuna", async () => {
      expect(await coverage.resolveCountyCode(undefined, options)).toBeNull()
      expect(await coverage.resolveCountyCode(null, options)).toBeNull()
      expect(await coverage.resolveCountyCode("", options)).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("resolves a comuna ignoring case, accents and surrounding spaces", async () => {
      expect(await coverage.resolveCountyCode("providencia", options)).toBe("PROV")
      expect(await coverage.resolveCountyCode("  Ñuñoa ", options)).toBe("NUNO")
      expect(await coverage.resolveCountyCode("nunoa", options)).toBe("NUNO")
    })

    it("returns null for a comuna Chilexpress doesn't cover", async () => {
      expect(await coverage.resolveCountyCode("Atlantis", options)).toBeNull()
    })

    it("calls the coverage API with the key, the national list and a timeout", async () => {
      await coverage.resolveCountyCode("Providencia", { apiKey: "key", baseUrl: "https://cobertura.test" })

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://cobertura.test/georeference/api/v1.0/coverage-areas?RegionCode=99&type=1")
      expect(init.headers).toEqual({ "Ocp-Apim-Subscription-Key": "key" })
      expect(init.signal).toBeDefined()
    })

    it("uses the production host by default", async () => {
      await coverage.resolveCountyCode("Providencia", options)

      expect(fetchMock.mock.calls[0][0]).toContain("https://services.wschilexpress.com/")
    })

    it("fails when Chilexpress answers with an error", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response)

      await expect(coverage.resolveCountyCode("Providencia", options)).rejects.toThrow(/respondió 503/)
    })

    it("tolerates an answer without coverage areas", async () => {
      fetchMock.mockResolvedValue(okResponse({}))

      expect(await coverage.resolveCountyCode("Providencia", options)).toBeNull()
    })
  })

  describe("cache", () => {
    it("fetches the list once and reuses it across calls", async () => {
      await coverage.resolveCountyCode("Providencia", options)
      await coverage.resolveCountyCode("Ñuñoa", options)
      await coverage.listComunaNames(options)

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("shares one request between concurrent callers", async () => {
      await Promise.all([
        coverage.resolveCountyCode("Providencia", options),
        coverage.resolveCountyCode("Ñuñoa", options),
        coverage.listComunaNames(options),
      ])

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("refreshes the list after 24 hours", async () => {
      await coverage.resolveCountyCode("Providencia", options)

      jest.setSystemTime(Date.now() + 23 * 60 * 60 * 1000)
      await coverage.resolveCountyCode("Providencia", options)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      jest.setSystemTime(Date.now() + 2 * 60 * 60 * 1000)
      await coverage.resolveCountyCode("Providencia", options)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("retries on the next call after a failed fetch instead of caching the failure", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response)

      await expect(coverage.resolveCountyCode("Providencia", options)).rejects.toThrow()
      expect(await coverage.resolveCountyCode("Providencia", options)).toBe("PROV")
    })
  })

  describe("listComunaNames", () => {
    it("returns title-cased names sorted with Spanish collation (ñ after n)", async () => {
      expect(await coverage.listComunaNames(options)).toEqual(["Ñuñoa", "Providencia", "Santiago Centro"])
    })
  })
})
