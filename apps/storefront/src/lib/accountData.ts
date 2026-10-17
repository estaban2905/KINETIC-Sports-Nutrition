import { BillingFormValues, EMPTY_BILLING, formatRut } from './checkoutValidation';

/** Dirección tal como la guarda el carrito (shipping_address) o el cliente. */
export interface AddressLike {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  phone?: string | null;
}

export interface NewCustomerAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country_code: string;
  phone?: string;
  is_default_shipping: boolean;
}

const norm = (v?: string | null) =>
  (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Misma calle y comuna (sin importar tildes, mayúsculas ni espacios). */
export function isSameAddress(a: AddressLike, b: AddressLike): boolean {
  return norm(a.address_1) === norm(b.address_1) && norm(a.city) === norm(b.city);
}

/**
 * Dirección de la compra convertida a dirección guardable del cliente, o null
 * si ya la tiene guardada o la dirección del carrito está incompleta.
 */
export function addressToRemember(
  cartAddress: AddressLike | null | undefined,
  saved: AddressLike[]
): NewCustomerAddress | null {
  if (!cartAddress?.address_1?.trim() || !cartAddress.city?.trim()) return null;
  if (saved.some((s) => isSameAddress(s, cartAddress))) return null;

  const first = (cartAddress.first_name ?? '').trim();
  return {
    first_name: first,
    last_name: (cartAddress.last_name ?? '').trim() || first,
    address_1: cartAddress.address_1.trim(),
    address_2: cartAddress.address_2?.trim() || undefined,
    city: cartAddress.city.trim(),
    province: cartAddress.province?.trim() || undefined,
    postal_code: cartAddress.postal_code?.trim() || undefined,
    country_code: (cartAddress.country_code ?? 'cl').toLowerCase(),
    phone: cartAddress.phone?.trim() || undefined,
    // La primera dirección que se guarda queda como predeterminada.
    is_default_shipping: saved.length === 0,
  };
}

/** Datos de facturación guardados en el cliente, listos para precargar el formulario. */
export function billingFromCustomer(billing: Record<string, string> | null | undefined): BillingFormValues {
  if (!billing?.rut) return EMPTY_BILLING;
  // Se precargan los campos pero el documento sigue siendo boleta por defecto:
  // solo pide factura quien lo elige en cada compra.
  return {
    tipo: 'boleta',
    rut: formatRut(billing.rut),
    razonSocial: billing.razon_social ?? '',
    giro: billing.giro ?? '',
    direccion: billing.direccion ?? '',
    comuna: billing.comuna ?? '',
  };
}

/** Factura de la compra (cart.metadata.billing) si hay que guardarla; null con boleta o si no cambió. */
export function billingToRemember(
  cartBilling: Record<string, string> | null | undefined,
  saved: Record<string, string> | null | undefined
): Record<string, string> | null {
  if (cartBilling?.tipo !== 'factura' || !cartBilling.rut) return null;
  const keys = ['rut', 'razon_social', 'giro', 'direccion', 'comuna'];
  if (keys.every((k) => (saved?.[k] ?? '') === (cartBilling[k] ?? ''))) return null;
  return Object.fromEntries(keys.map((k) => [k, cartBilling[k] ?? '']));
}
