export type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment: string;
  city: string;
};

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +56 9 1234 5678, 56912345678, 9 1234 5678, with/without spaces.
const CHILE_MOBILE_REGEX = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]+$/;

/**
 * Validates the checkout contact/address form. `knownComunas` is the list
 * fetched from /store/comunas (see lib/medusa.ts) — when it's non-empty, the
 * customer must pick an exact match instead of typing free text, since that's
 * what makes the Chilexpress coverage lookup in coverage.ts reliably resolve
 * a countyCode instead of silently falling back to the flat shipping rate.
 * When the list is empty (Chilexpress not configured, or the fetch failed),
 * validation degrades to "just don't leave it blank" so checkout still works.
 */
export function validateContactForm(
  values: ContactFormValues,
  knownComunas: string[]
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Ingresa tu nombre completo.";
  } else if (name.split(/\s+/).length < 2) {
    errors.name = "Ingresa nombre y apellido.";
  } else if (!NAME_REGEX.test(name)) {
    errors.name = "El nombre solo puede tener letras.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Ingresa un correo válido.";
  }

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = "Ingresa tu teléfono.";
  } else if (!CHILE_MOBILE_REGEX.test(phone)) {
    errors.phone = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
  }

  const street = values.street.trim();
  if (!street) {
    errors.street = "Ingresa el nombre de la calle.";
  }

  const streetNumber = values.streetNumber.trim();
  if (!streetNumber) {
    errors.streetNumber = "Ingresa el número.";
  } else if (!/^\d+[a-zA-Z]?$/.test(streetNumber)) {
    errors.streetNumber = "Ingresa un número válido.";
  }

  const city = values.city.trim();
  if (!city) {
    errors.city = "Selecciona tu comuna.";
  } else if (
    knownComunas.length > 0 &&
    !knownComunas.some((c) => c.toLowerCase() === city.toLowerCase())
  ) {
    errors.city = "Selecciona una comuna de la lista.";
  }

  return errors;
}

export function isContactFormValid(values: ContactFormValues, knownComunas: string[]): boolean {
  return Object.keys(validateContactForm(values, knownComunas)).length === 0;
}

type CartAddressLike = {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  phone?: string | null;
};

/**
 * Rebuilds the contact form from what the cart already saved, so closing the
 * drawer (which unmounts it) or coming back from the payment provider doesn't
 * make the customer retype everything. Inverse of handleAddressSubmit.
 */
export function contactFromCart(
  email: string | null | undefined,
  address: CartAddressLike | null | undefined
): ContactFormValues {
  const empty: ContactFormValues = {
    name: "", email: email ?? "", phone: "", street: "", streetNumber: "", apartment: "", city: "",
  };
  if (!address) return empty;

  const first = (address.first_name ?? "").trim();
  const last = (address.last_name ?? "").trim();
  // The form stores a single-word name as first_name === last_name.
  const name = first && last && first !== last ? `${first} ${last}` : first || last;

  const parts = (address.address_1 ?? "").trim().split(/\s+/);
  const lastPart = parts[parts.length - 1] ?? "";
  const hasNumber = parts.length > 1 && /^\d+[a-zA-Z]?$/.test(lastPart);

  return {
    ...empty,
    name,
    phone: address.phone ?? "",
    street: hasNumber ? parts.slice(0, -1).join(" ") : parts.join(" "),
    streetNumber: hasNumber ? lastPart : "",
    apartment: address.address_2 ?? "",
    city: address.city ?? "",
  };
}

type CustomerLike = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  addresses?: (CartAddressLike & { is_default_shipping?: boolean | null })[] | null;
};

/**
 * Precarga el formulario con los datos del cliente con sesión: su dirección
 * de envío predeterminada (o la primera guardada) y, si ésta no trae nombre o
 * teléfono, los de su perfil. El carrito manda sobre esto (ver CartDrawer).
 */
export function contactFromCustomer(customer: CustomerLike | null | undefined): ContactFormValues {
  if (!customer) return contactFromCart(undefined, undefined);

  const addresses = customer.addresses ?? [];
  const address = addresses.find((a) => a.is_default_shipping) ?? addresses[0];
  const fromAddress = contactFromCart(customer.email, address);

  const profileName = [customer.first_name, customer.last_name]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return {
    ...fromAddress,
    name: fromAddress.name || profileName,
    phone: fromAddress.phone || (customer.phone ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Boleta / factura
// ---------------------------------------------------------------------------

export type BillingFormValues = {
  tipo: "boleta" | "factura";
  rut: string;
  razonSocial: string;
  giro: string;
  direccion: string;
  comuna: string;
};

export type BillingFormErrors = Partial<Record<Exclude<keyof BillingFormValues, "tipo">, string>>;

export const EMPTY_BILLING: BillingFormValues = {
  tipo: "boleta", rut: "", razonSocial: "", giro: "", direccion: "", comuna: "",
};

const cleanRut = (value: string): string => value.replace(/[^0-9kK]/g, "").toUpperCase();

function rutCheckDigit(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/** Valid Chilean RUT (check digit included). Same rule as the backend (lib/rut.ts). */
export function isValidRut(value: string): boolean {
  const clean = cleanRut(value);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  if (!/^\d+$/.test(body)) return false;
  const number = Number(body);
  if (number < 100000 || number > 99999999) return false;
  return rutCheckDigit(body) === clean.slice(-1);
}

/** "170960734" -> "17.096.073-4", as the customer types. */
export function formatRut(value: string): string {
  const clean = cleanRut(value).slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}

/** Only validated when the customer asked for a factura; a boleta needs nothing extra. */
export function validateBillingForm(values: BillingFormValues): BillingFormErrors {
  if (values.tipo !== "factura") return {};
  const errors: BillingFormErrors = {};
  if (!isValidRut(values.rut)) errors.rut = "Ingresa un RUT válido (ej: 76.123.456-0).";
  if (!values.razonSocial.trim()) errors.razonSocial = "Ingresa la razón social.";
  if (!values.giro.trim()) errors.giro = "Ingresa el giro de la empresa.";
  if (!values.direccion.trim()) errors.direccion = "Ingresa la dirección de facturación.";
  if (!values.comuna.trim()) errors.comuna = "Ingresa la comuna.";
  return errors;
}

/** Shape stored in cart.metadata.billing (the backend reads it from order.metadata.billing). */
export function billingToMetadata(values: BillingFormValues): Record<string, string> {
  if (values.tipo !== "factura") return { tipo: "boleta" };
  return {
    tipo: "factura",
    rut: cleanRut(values.rut).replace(/^(\d+)(.)$/, "$1-$2"),
    razon_social: values.razonSocial.trim(),
    giro: values.giro.trim(),
    direccion: values.direccion.trim(),
    comuna: values.comuna.trim(),
  };
}

export function billingFromCart(metadata: Record<string, unknown> | null | undefined): BillingFormValues {
  const billing = metadata?.billing as Record<string, string> | undefined;
  if (billing?.tipo !== "factura") return EMPTY_BILLING;
  return {
    tipo: "factura",
    rut: formatRut(billing.rut ?? ""),
    razonSocial: billing.razon_social ?? "",
    giro: billing.giro ?? "",
    direccion: billing.direccion ?? "",
    comuna: billing.comuna ?? "",
  };
}
