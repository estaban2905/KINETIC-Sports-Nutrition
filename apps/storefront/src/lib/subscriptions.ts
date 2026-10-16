import { medusa } from './medusa';
import type { ContactFormValues } from './checkoutValidation';
import { splitName } from './accountValidation';

/** Cuántos % menos que la compra única; lo fija el backend, esto solo es para mostrarlo antes de suscribirse. */
export const SUBSCRIPTION_DISCOUNT_PERCENT = 15;

export type SubscriptionStatus = 'pending_card' | 'active' | 'paused' | 'past_due' | 'cancelled';

export interface Subscription {
  id: string;
  variant_id: string;
  quantity: number;
  status: SubscriptionStatus;
  frequency_days: number;
  discount_percent: number;
  /** Día de cobro "YYYY-MM-DD" (calendario de Chile) o null si no hay cobro agendado. */
  next_billing_date: string | null;
  card: { brand: string | null; last4: string; masked: string | null } | null;
  has_card: boolean;
  shipping_address: {
    first_name: string;
    last_name: string;
    phone: string;
    address_1: string;
    address_2?: string;
    city: string;
  } | null;
  welcome_gift_given: boolean;
  product_title: string | null;
  product_handle: string | null;
  variant_title: string | null;
  /** Monto estimado del próximo cobro, en pesos. */
  next_amount: number | null;
}

export type CycleStatus = 'paid' | 'failed' | 'skipped' | 'processing';

export interface SubscriptionCycle {
  id: string;
  date: string;
  status: CycleStatus;
  amount: number | null;
  order_id: string | null;
}

// --- API ------------------------------------------------------------------------

export async function listSubscriptions(): Promise<Subscription[]> {
  const { subscriptions } = await medusa.client.fetch<{ subscriptions: Subscription[] }>('/store/subscriptions');
  return subscriptions;
}

export interface CreateSubscriptionBody {
  variant_id: string;
  quantity: number;
  accepted_terms: true;
  shipping_address: SubscriptionAddress;
}

export async function createSubscription(body: CreateSubscriptionBody): Promise<Subscription> {
  const { subscription } = await medusa.client.fetch<{ subscription: Subscription }>('/store/subscriptions', {
    method: 'POST',
    body,
  });
  return subscription;
}

export async function listCycles(subscriptionId: string): Promise<SubscriptionCycle[]> {
  const { cycles } = await medusa.client.fetch<{ cycles: SubscriptionCycle[] }>(
    `/store/subscriptions/${subscriptionId}/cycles`
  );
  return cycles;
}

async function act(subscriptionId: string, action: 'pause' | 'resume' | 'cancel'): Promise<Subscription> {
  const { subscription } = await medusa.client.fetch<{ subscription: Subscription }>(
    `/store/subscriptions/${subscriptionId}/${action}`,
    { method: 'POST' }
  );
  return subscription;
}
export const pauseSubscription = (id: string) => act(id, 'pause');
export const resumeSubscription = (id: string) => act(id, 'resume');
export const cancelSubscription = (id: string) => act(id, 'cancel');

export async function updateSubscription(
  subscriptionId: string,
  patch: Partial<Pick<CreateSubscriptionBody, 'variant_id' | 'quantity' | 'shipping_address'>>
): Promise<Subscription> {
  const { subscription } = await medusa.client.fetch<{ subscription: Subscription }>(
    `/store/subscriptions/${subscriptionId}`,
    { method: 'PATCH', body: patch }
  );
  return subscription;
}

/** Inicia la inscripción de la tarjeta: devuelve la URL de Transbank y el token a enviarle. */
export async function startCardEnrollment(subscriptionId: string): Promise<{ url: string; token: string }> {
  return medusa.client.fetch<{ url: string; token: string }>('/store/subscriptions/card/start', {
    method: 'POST',
    body: { subscription_id: subscriptionId },
  });
}

/** Los campos del formulario que Transbank espera recibir por POST. */
export function transbankFormFields(token: string): Record<string, string> {
  return { TBK_TOKEN: token };
}

/**
 * Lleva al cliente al formulario de inscripción de Transbank. Es un POST de
 * navegador (no un fetch), así que se arma y envía un formulario oculto. Solo
 * se aceptan URLs https de Transbank.
 */
export function redirectToTransbank(url: string, token: string, doc: Document = document): void {
  if (!/^https:\/\/[a-z0-9.-]*transbank\.cl\//i.test(url)) {
    throw new Error('La dirección de inscripción de la tarjeta no es válida.');
  }
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = url;
  for (const [name, value] of Object.entries(transbankFormFields(token))) {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  doc.body.appendChild(form);
  form.submit();
}

// --- Presentación -----------------------------------------------------------------

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "2026-10-28" -> "28 de octubre de 2026" (sin pasar por zonas horarias). */
export function formatBillingDate(day: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? '');
  if (!m) return '—';
  return `${Number(m[3])} de ${MONTHS[Number(m[2]) - 1]} de ${m[1]}`;
}

export type Tone = 'good' | 'warning' | 'bad' | 'neutral';

export function subscriptionStatusInfo(status: SubscriptionStatus): { label: string; tone: Tone } {
  switch (status) {
    case 'active':
      return { label: 'Activa', tone: 'good' };
    case 'paused':
      return { label: 'Pausada', tone: 'warning' };
    case 'past_due':
      return { label: 'Detenida: falta actualizar tu tarjeta', tone: 'bad' };
    case 'pending_card':
      return { label: 'Falta registrar tu tarjeta', tone: 'warning' };
    case 'cancelled':
      return { label: 'Cancelada', tone: 'neutral' };
  }
}

export function cycleStatusInfo(status: CycleStatus): { label: string; tone: Tone } {
  switch (status) {
    case 'paid':
      return { label: 'Cobrado', tone: 'good' };
    case 'failed':
      return { label: 'Tarjeta rechazada', tone: 'bad' };
    case 'skipped':
      return { label: 'Omitido por falta de stock', tone: 'warning' };
    case 'processing':
      return { label: 'En proceso', tone: 'neutral' };
  }
}

/** La suscripción necesita que el cliente registre o cambie la tarjeta. */
export function needsCard(sub: Pick<Subscription, 'status' | 'has_card'>): boolean {
  return sub.status === 'pending_card' || sub.status === 'past_due' || (sub.status !== 'cancelled' && !sub.has_card);
}

export const isLive = (sub: Pick<Subscription, 'status'>): boolean => sub.status !== 'cancelled';

export const hasActiveSubscription = (subs: Pick<Subscription, 'status'>[]): boolean =>
  subs.some((s) => s.status === 'active');

/** "Double Rich Chocolate / 2 Libras" -> sabor y tamaño. Sin " / " todo es el sabor. */
export function parseVariantTitle(title: string | null | undefined): { flavor: string; size: string } {
  const [flavor = '', ...rest] = (title ?? '').split(' / ');
  return { flavor: flavor.trim(), size: rest.join(' / ').trim() };
}

/** Precio con el descuento de la suscripción, redondeado igual que el backend. */
export function subscriptionPrice(listPrice: number, percent: number = SUBSCRIPTION_DISCOUNT_PERCENT): number {
  return Math.round((listPrice * (100 - percent)) / 100);
}

export interface SubscriptionAddress {
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  address_2?: string;
  city: string;
  country_code: 'cl';
}

/** Dirección del formulario de contacto -> dirección de despacho de la suscripción. */
export function addressFromContact(values: ContactFormValues): SubscriptionAddress {
  const { first_name, last_name } = splitName(values.name);
  const address: SubscriptionAddress = {
    first_name,
    // Un nombre de una sola palabra se guarda repetido, igual que en el checkout.
    last_name: last_name || first_name,
    phone: values.phone.trim(),
    address_1: `${values.street.trim()} ${values.streetNumber.trim()}`.trim(),
    city: values.city.trim(),
    country_code: 'cl',
  };
  if (values.apartment.trim()) address.address_2 = values.apartment.trim();
  return address;
}

/** Resultado de volver de Transbank: /cuenta?tab=membership&card=ok|error. */
export function cardReturnState(params: URLSearchParams): 'ok' | 'error' | null {
  const value = params.get('card');
  return value === 'ok' || value === 'error' ? value : null;
}

/** Mensaje claro para el cliente ante un error de la API de suscripciones. */
export function describeSubscriptionError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (/rate|too many|demasiados/i.test(message)) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (/unauthorized/i.test(message)) {
    return 'Tu sesión venció. Vuelve a iniciar sesión.';
  }
  return message || 'Ocurrió un error. Inténtalo de nuevo.';
}
