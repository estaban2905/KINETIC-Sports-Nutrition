import { SimpleFacturaClient } from "../simplefactura"

const config = {
  baseUrl: "https://sf.test",
  email: "a@b.cl",
  password: "x",
  rutEmisor: "78181331-1",
  razonSocial: "X",
  giro: "X",
  dirOrigen: "X",
  comunaOrigen: "X",
  acteco: [],
  telefono: "",
  correoEmisor: "",
  sucursal: "Casa Matriz",
  ambiente: 0 as const,
}

describe("SimpleFacturaClient.obtenerPdf", () => {
  it("asks for carta paper inside dteReferenciadoExterno", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: "jwt", expiresIn: 86400 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode("%PDF-1").buffer })

    const pdf = await new SimpleFacturaClient(config, fetchMock as any).obtenerPdf(8593)

    expect(pdf.toString()).toBe("%PDF-1")
    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body).toEqual({
      credenciales: { rutEmisor: "78181331-1", nombreSucursal: "Casa Matriz" },
      dteReferenciadoExterno: { folio: 8593, codigoTipoDte: 39, ambiente: 0, tipoPapel: 3 },
    })
  })
})
