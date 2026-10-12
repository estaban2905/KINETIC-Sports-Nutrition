/**
 * Customer-facing order status. The backend (order-lookup route,
 * deriveCustomerStatus) collapses payment + fulfillment + Chilexpress events
 * into ONE of these codes; this file owns the wording and the progress bar.
 */
export type CustomerStatus =
  | 'payment_pending'
  | 'payment_confirming'
  | 'preparing'
  | 'shipment_created'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'canceled';

export type StatusTone = 'progress' | 'done' | 'warning' | 'canceled';

export const CUSTOMER_STATUS_COPY: Record<
  CustomerStatus,
  { title: string; description: string; tone: StatusTone }
> = {
  payment_pending: {
    title: 'Esperando tu pago',
    description:
      'Aún no recibimos el pago de tu pedido. Si ya pagaste, puede tardar unos minutos en confirmarse.',
    tone: 'warning',
  },
  payment_confirming: {
    title: 'Confirmando tu pago',
    description: 'Estamos verificando tu pago. Vuelve a revisar en unos minutos.',
    tone: 'progress',
  },
  preparing: {
    title: 'Preparando tu pedido',
    description: 'Recibimos tu pago y estamos preparando tu pedido para el despacho.',
    tone: 'progress',
  },
  shipment_created: {
    title: 'Tu envío fue generado',
    description:
      'Ya generamos tu envío. Pasará a "En camino" cuando el courier reciba tu paquete.',
    tone: 'progress',
  },
  shipped: {
    title: 'Tu pedido fue enviado',
    description: 'El courier ya tiene tu paquete y pronto saldrá hacia tu comuna.',
    tone: 'progress',
  },
  in_transit: {
    title: 'En camino',
    description: 'Tu paquete viaja hacia tu comuna.',
    tone: 'progress',
  },
  out_for_delivery: {
    title: 'En reparto',
    description: 'Tu paquete está en ruta para ser entregado.',
    tone: 'progress',
  },
  delivered: {
    title: 'Entregado',
    description: 'Tu pedido fue entregado.',
    tone: 'done',
  },
  canceled: {
    title: 'Pedido cancelado',
    description: 'Este pedido fue cancelado. Si ya pagaste, contáctanos para gestionar el reembolso.',
    tone: 'canceled',
  },
};

export const PROGRESS_STEPS = ['Pago', 'Preparación', 'Enviado', 'En camino', 'Entregado'];

const STEP_INDEX: Partial<Record<CustomerStatus, number>> = {
  payment_pending: 0,
  payment_confirming: 0,
  preparing: 1,
  shipment_created: 1,
  shipped: 2,
  in_transit: 3,
  out_for_delivery: 3,
  delivered: 4,
};

/** Current step in PROGRESS_STEPS, or null when there is no progress to show (canceled). */
export function progressStepIndex(status: CustomerStatus): number | null {
  return STEP_INDEX[status] ?? null;
}

/** A step is complete once the order is past it — or all of them once delivered. */
export function isStepComplete(stepIndex: number, status: CustomerStatus): boolean {
  const current = progressStepIndex(status);
  if (current === null) return false;
  return status === 'delivered' || stepIndex < current;
}

/**
 * Chilexpress's public tracking page. It has no deep link to a given OT (the
 * OT number is typed into the page's form), so the order page offers a
 * "copy number" button next to this link.
 */
export const CHILEXPRESS_TRACKING_URL = 'https://centrodeayuda.chilexpress.cl/seguimiento';

/**
 * Chilexpress sends event times as local Chile time but marks them with a
 * trailing "Z" (in its docs' sample, eventHour "16:06:00" comes with
 * eventDateTime "…T16:06:00Z"). Treating that Z as real UTC shifts the time by
 * 3-4 hours, so it is dropped and the wall-clock time is shown as sent.
 */
export function formatEventDate(iso: string): string {
  const date = new Date(iso.replace(/Z$/, ''));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}
