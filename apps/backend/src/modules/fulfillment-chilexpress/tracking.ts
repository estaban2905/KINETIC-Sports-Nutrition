// Chilexpress "Consulta individual de envío" (Transport-Orders /tracking):
// asks what happened to a transport order, so a job can mark the Medusa
// fulfillment as delivered without anyone doing it by hand.

import type { EnviosOptions } from "./transport-order"

export type TrackingResult = {
  delivered: boolean
  /** Chilexpress's own current status text (e.g. "DESCARGADA"), for logs. */
  status: string | null
  deliveredAt: string | null
}

type TrackingResponse = {
  data?: {
    deliveryData?: { deliveryDateTime?: string } | null
    trackingEvents?: Array<{
      description?: string
      eventDateTime?: string
      code?: { clientEventDescription?: string }
    }>
    transportOrderData?: { status?: string }
  } | null
  statusCode?: number
  statusDescription?: string
}

/**
 * Delivered = Chilexpress registered a delivery event ("PIEZA ENTREGADA A
 * DESTINATARIO", mapped to clientEventDescription "ENTREGADO") or filled in
 * who received the package. The event wording comes from Chilexpress's
 * documented sample response — to be re-checked against a real delivered OT.
 */
export function parseTracking(body: TrackingResponse | null): TrackingResult {
  const data = body?.data
  const deliveryEvent = data?.trackingEvents?.find(
    (e) =>
      e.code?.clientEventDescription?.toUpperCase() === "ENTREGADO" ||
      /ENTREGAD[AO] A DESTINATARIO/i.test(e.description ?? "")
  )
  const deliveredAt = deliveryEvent?.eventDateTime ?? data?.deliveryData?.deliveryDateTime ?? null

  return {
    delivered: Boolean(deliveryEvent || data?.deliveryData?.deliveryDateTime),
    status: data?.transportOrderData?.status ?? null,
    deliveredAt,
  }
}

/**
 * Returns null while Chilexpress can't answer yet — a freshly created OT is
 * answered with "La OT no se encuentra disponible para consultar" (-41), which
 * is expected, not an error. Real failures (network, 5xx) throw.
 */
export async function fetchTracking(
  options: EnviosOptions,
  args: { transportOrderNumber: string; reference: string }
): Promise<TrackingResult | null> {
  const baseUrl = options.baseUrl ?? "https://services.wschilexpress.com"
  const response = await fetch(`${baseUrl}/transport-orders/api/v1.0/tracking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": options.apiKey,
    },
    body: JSON.stringify({
      transportOrderNumber: Number(args.transportOrderNumber),
      reference: args.reference,
      rut: Number(options.rut),
      showTrackingEvents: 1,
    }),
    signal: AbortSignal.timeout(10000),
  })

  const body = (await response.json().catch(() => null)) as TrackingResponse | null

  if (response.status >= 500) {
    throw new Error(`Chilexpress tracking respondió ${response.status}`)
  }
  if (!response.ok || body?.statusCode !== 0) return null

  return parseTracking(body)
}
